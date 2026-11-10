/**
 * Pemeriksaan kualitas data bacaan meter (ISO 50001 klausul 7.1.5 dan 9.1: data energi harus akurat dan dapat diulang).
 *
 * Dihitung di aplikasi dari tabel pembacaan_meter, tanpa menulis data. Pemeriksaan per meter per bulan:
 *   kosong          : bulan tanpa bacaan setelah bacaan pertama meter tersebut.
 *   stand_mundur    : stand akhir lebih kecil dari stand awal (salah catat, meter diganti, atau register berputar ulang).
 *   tidak_sambung   : stand awal bulan ini tidak sama dengan stand akhir bulan sebelumnya (ada kWh yang tidak terhitung).
 *   selisih_tagihan : kWh dari stand × faktor kali berbeda > 5% dari kWh tagihan pada bulan yang sama.
 *   lonjakan/anjlok : kWh jauh dari pola 12 bulan sebelumnya. Memakai skor z robust (median dan MAD, Iglewicz & Hoaglin):
 *                     |z| > 3,5 dan selisih > 25% dari median, minimal 6 bulan riwayat. Median tidak terseret oleh satu
 *                     bulan janggal, sehingga lebih tahan daripada rata-rata ± 2σ.
 *   pergeseran      : 3 bulan atau lebih berturut-turut di luar pola ke arah yang sama digabung menjadi satu temuan:
 *                     pola konsumsinya berubah (beban baru, perubahan operasi, atau perubahan cakupan meter), bukan salah
 *                     data satu bulan. Bulan di luar pola tetap masuk riwayat, sehingga median menyesuaikan level baru.
 *   nol             : kWh 0. Bila ada catatan, dianggap isian pengganti data kosong; bila tidak, meter mungkin tidak berputar.
 */
import { labelBulan } from './enpi'
import { angka } from './format'
import type { MeterEnergi, PembacaanMeter } from './types'

export const AMBANG_KUALITAS = { zRobust: 3.5, persenPola: 25, riwayatMin: 6, riwayatMaks: 12, persenTagihan: 5, bulanGeser: 3 }

export type JenisTemuanMeter = 'kosong' | 'stand_mundur' | 'tidak_sambung' | 'selisih_tagihan' | 'lonjakan' | 'anjlok' | 'pergeseran' | 'nol'
export type TingkatTemuan = 'crit' | 'warn' | 'info'
/** Status sel heatmap, urut dari paling berat. `luar` = sebelum bacaan pertama meter. */
export type StatusSel = 'masalah' | 'anomali' | 'bergeser' | 'kosong' | 'isian' | 'baik' | 'luar'

export const LABEL_TEMUAN: Record<JenisTemuanMeter, string> = {
  kosong: 'Belum ada bacaan', stand_mundur: 'Stand mundur', tidak_sambung: 'Stand tidak bersambung',
  selisih_tagihan: 'Selisih dengan tagihan', lonjakan: 'Lonjakan', anjlok: 'Penurunan tajam', pergeseran: 'Pola berubah', nol: 'kWh nol',
}

export const LABEL_STATUS: Record<Exclude<StatusSel, 'luar'>, string> = {
  baik: 'Wajar', isian: 'Diisi 0 (ada catatan)', anomali: 'Di luar pola', bergeser: 'Pola berubah', masalah: 'Bacaan janggal', kosong: 'Belum ada bacaan',
}

export type TemuanMeter = {
  kunci: string
  meter_kode: string
  meter_nama: string
  tahun: number
  bulan: number
  label: string
  jenis: JenisTemuanMeter
  tingkat: TingkatTemuan
  nilai: number | null
  pembanding: number | null
  selisih_persen: number | null
  teks: string
}

export type SelMeter = { tahun: number; bulan: number; label: string; kwh: number | null; asal: 'stand' | 'tagihan' | null; status: StatusSel; ket: string[] }
export type BarisMeter = { meter: MeterEnergi; nama: string; sel: SelMeter[]; skor: number | null }

/** Status yang tidak menandakan kesalahan data: pola berubah adalah perubahan konsumsi, bukan salah catat. */
const WAJAR = new Set<StatusSel>(['baik', 'isian', 'bergeser'])

const indeks = (tahun: number, bulan: number) => tahun * 12 + (bulan - 1)
const dariIndeks = (i: number) => ({ tahun: Math.floor(i / 12), bulan: (i % 12) + 1 })

function median(xs: number[]) {
  const s = [...xs].sort((a, b) => a - b)
  const t = Math.floor(s.length / 2)
  return s.length % 2 ? s[t] : (s[t - 1] + s[t]) / 2
}

const namaMeter = (m: MeterEnergi) => m.area_dilayani && m.area_dilayani !== m.lokasi ? m.area_dilayani : m.lokasi ?? m.kode

/**
 * Periksa semua meter sampai bulan `akhir` (biasanya bulan lalu). Heatmap menampilkan `jumlahBulan` terakhir,
 * tetapi riwayat pola dihitung dari seluruh data. Temuan hanya yang jatuh di jendela tampilan.
 */
export function periksaKualitasMeter(meter: MeterEnergi[], bacaan: PembacaanMeter[], akhir: { tahun: number; bulan: number }, jumlahBulan = 24) {
  const iAkhir = indeks(akhir.tahun, akhir.bulan)
  const iAwalJendela = iAkhir - jumlahBulan + 1
  const bulanJendela = Array.from({ length: jumlahBulan }, (_, k) => {
    const { tahun, bulan } = dariIndeks(iAwalJendela + k)
    return { tahun, bulan, label: labelBulan(tahun, bulan) }
  })
  const temuan: TemuanMeter[] = []
  const baris: BarisMeter[] = []

  for (const m of [...meter].sort((a, b) => a.no_urut - b.no_urut)) {
    const nama = namaMeter(m)
    const peta = new Map<number, PembacaanMeter>()
    for (const b of bacaan) if (b.meter_kode === m.kode && indeks(b.tahun, b.bulan) <= iAkhir) peta.set(indeks(b.tahun, b.bulan), b)
    const iPertama = Math.min(...peta.keys())
    const sel = new Map<number, SelMeter>()
    // kWh yang layak menjadi riwayat pola (bukan nol, bukan bacaan janggal)
    const riwayat = new Map<number, number>()
    const luarPola: { i: number; arah: 1 | -1; kwh: number; med: number }[] = []

    const catat = (i: number, jenis: JenisTemuanMeter, tingkat: TingkatTemuan, teks: string, nilai: number | null = null, pembanding: number | null = null) => {
      if (i < iAwalJendela) return
      const { tahun, bulan } = dariIndeks(i)
      temuan.push({
        kunci: `${m.kode}|${i}|${jenis}`, meter_kode: m.kode, meter_nama: nama, tahun, bulan, label: labelBulan(tahun, bulan),
        jenis, tingkat, nilai, pembanding, selisih_persen: nilai !== null && pembanding ? ((nilai - pembanding) / pembanding) * 100 : null, teks,
      })
    }

    if (Number.isFinite(iPertama)) for (let i = iPertama; i <= iAkhir; i++) {
      const { tahun, bulan } = dariIndeks(i)
      const b = peta.get(i)
      const s: SelMeter = { tahun, bulan, label: labelBulan(tahun, bulan), kwh: null, asal: null, status: 'baik', ket: [] }
      sel.set(i, s)
      const adaStand = !!b && b.stand_awal !== null && b.stand_akhir !== null
      const kwhTagihan = b?.kwh_tagihan ?? null
      if (!b || (!adaStand && kwhTagihan === null)) {
        s.status = 'kosong'
        s.ket.push('Belum ada bacaan stand maupun kWh tagihan')
        catat(i, 'kosong', i === iAkhir ? 'warn' : 'crit', i === iAkhir
          ? 'Bulan terakhir belum dibaca. EnPI yang memakai meter ini belum bisa dihitung untuk bulan ini.'
          : 'Bulan kosong di tengah riwayat. EnPI dan deteksi deviasi melewatkan bulan ini.')
        continue
      }
      const kwh = adaStand ? (b.stand_akhir! - b.stand_awal!) * m.faktor_kali : kwhTagihan!
      s.kwh = kwh
      s.asal = adaStand ? 'stand' : 'tagihan'
      let janggal = false

      if (adaStand && b.stand_akhir! < b.stand_awal!) {
        janggal = true
        s.ket.push('Stand akhir lebih kecil dari stand awal')
        catat(i, 'stand_mundur', 'crit', `Stand akhir ${angka(b.stand_akhir!, 2)} lebih kecil dari stand awal ${angka(b.stand_awal!, 2)}. Periksa salah catat, penggantian meter, atau register yang berputar ulang.`, kwh)
      }
      const sebelum = peta.get(i - 1)
      if (adaStand && sebelum?.stand_akhir != null) {
        const beda = b.stand_awal! - sebelum.stand_akhir
        if (Math.abs(beda) > Math.max(0.01, Math.abs(sebelum.stand_akhir) * 1e-6)) {
          janggal = true
          s.ket.push('Stand awal ≠ stand akhir bulan lalu')
          catat(i, 'tidak_sambung', 'warn', `Stand awal ${angka(b.stand_awal!, 2)} berbeda dari stand akhir bulan lalu ${angka(sebelum.stand_akhir, 2)}. ${beda > 0 ? `Sekitar ${angka(beda * m.faktor_kali, 0)} kWh tidak terhitung di bulan mana pun.` : `Sekitar ${angka(-beda * m.faktor_kali, 0)} kWh terhitung dua kali.`}`, b.stand_awal, sebelum.stand_akhir)
        }
      }
      if (adaStand && kwhTagihan !== null && kwhTagihan > 0) {
        const p = ((kwh - kwhTagihan) / kwhTagihan) * 100
        if (Math.abs(p) > AMBANG_KUALITAS.persenTagihan) {
          janggal = true
          const rasio = kwh / kwhTagihan
          const faktor = m.faktor_kali > 1 && (Math.abs(rasio - m.faktor_kali) / m.faktor_kali < 0.05 || Math.abs(rasio * m.faktor_kali - 1) < 0.05)
          s.ket.push(`Selisih ${angka(p, 1)}% dengan tagihan`)
          catat(i, 'selisih_tagihan', Math.abs(p) > 20 ? 'crit' : 'warn', `kWh dari stand (${angka(kwh, 0)}) berbeda ${angka(p, 1)}% dari kWh tagihan (${angka(kwhTagihan, 0)}).${faktor ? ` Rasionya mendekati faktor kali ×${angka(m.faktor_kali, 0)}: periksa apakah faktor kali sudah/belum dikalikan.` : ' Periksa salah baca stand, faktor kali, atau periode tagihan.'}`, kwh, kwhTagihan)
        }
      }

      if (kwh === 0) {
        if (b.catatan?.trim()) {
          s.status = 'isian'
          s.ket.push(`Dicatat 0: ${b.catatan.trim()}`)
          continue
        }
        // Nol tanpa catatan pada meter yang biasanya berputar
        const lalu = [...riwayat.entries()].filter(([k]) => k < i).slice(-AMBANG_KUALITAS.riwayatMaks).map(([, v]) => v)
        if (lalu.length && median(lalu) > 0) {
          s.status = janggal ? 'masalah' : 'anomali'
          s.ket.push('kWh nol tanpa catatan')
          catat(i, 'nol', 'warn', `kWh nol padahal median ${lalu.length} bulan sebelumnya ${angka(median(lalu), 0)} kWh. Pastikan meter tidak mati atau beban tidak dipindah; tambahkan catatan bila memang tidak ada pemakaian.`, 0, median(lalu))
          continue
        }
      }

      if (janggal) { s.status = 'masalah'; continue }

      const lalu = [...riwayat.entries()].filter(([k]) => k < i).slice(-AMBANG_KUALITAS.riwayatMaks).map(([, v]) => v)
      if (kwh > 0 && lalu.length >= AMBANG_KUALITAS.riwayatMin) {
        const med = median(lalu)
        // Batas bawah sebaran: 2% median, agar riwayat yang sangat rata tidak membuat setiap bulan tampak janggal
        const mad = Math.max(median(lalu.map((v) => Math.abs(v - med))), med * 0.02)
        const z = (kwh - med) / (1.4826 * mad)
        const p = med ? ((kwh - med) / med) * 100 : 0
        if (Math.abs(z) > AMBANG_KUALITAS.zRobust && Math.abs(p) > AMBANG_KUALITAS.persenPola) {
          s.status = 'anomali'
          s.ket.push(`${p > 0 ? '+' : ''}${angka(p, 0)}% dari median ${lalu.length} bulan`)
          catat(i, p > 0 ? 'lonjakan' : 'anjlok', 'warn', `${angka(kwh, 0)} kWh, ${p > 0 ? 'naik' : 'turun'} ${angka(Math.abs(p), 0)}% dari median ${lalu.length} bulan sebelumnya (${angka(med, 0)} kWh), skor z robust ${angka(z, 1)}. ${p > 0 ? 'Periksa beban tambahan, kebocoran, salah ketik, atau tagihan susulan.' : 'Periksa beban yang berhenti, meter rusak, salah ketik, atau tagihan yang belum lengkap.'}`, kwh, med)
          luarPola.push({ i, arah: p > 0 ? 1 : -1, kwh: kwh, med })
        }
      }
      // Bulan di luar pola tetap masuk riwayat: median tahan terhadap satu bulan janggal, dan bila level konsumsi
      // memang berubah, median ikut menyesuaikan sehingga bulan-bulan berikutnya tidak terus ditandai.
      if (kwh > 0) riwayat.set(i, kwh)
    }

    // Rangkaian ≥ 3 bulan berturut-turut di luar pola ke arah yang sama: satu temuan "pola berubah"
    for (let a = 0; a < luarPola.length;) {
      let z = a
      while (z + 1 < luarPola.length && luarPola[z + 1].i === luarPola[z].i + 1 && luarPola[z + 1].arah === luarPola[a].arah) z++
      const run = luarPola.slice(a, z + 1)
      if (run.length >= AMBANG_KUALITAS.bulanGeser) {
        const kunciRun = new Set(run.map((r) => `${m.kode}|${r.i}|${r.arah > 0 ? 'lonjakan' : 'anjlok'}`))
        for (let k = temuan.length - 1; k >= 0; k--) if (kunciRun.has(temuan[k].kunci)) temuan.splice(k, 1)
        for (const r of run) { const x = sel.get(r.i); if (x) x.status = 'bergeser' }
        const rata = run.reduce((t, r) => t + r.kwh, 0) / run.length
        const dasar = run[0].med
        const akhirRun = dariIndeks(run.at(-1)!.i)
        const masih = run.at(-1)!.i === iAkhir
        // Dicatat di bulan pertama rangkaian; bila awal rangkaian sebelum jendela, di bulan pertama jendela
        const iCatat = Math.max(run[0].i, iAwalJendela)
        if (run.at(-1)!.i >= iAwalJendela) catat(iCatat, 'pergeseran', 'info',
          `Sejak ${labelBulan(dariIndeks(run[0].i).tahun, dariIndeks(run[0].i).bulan)} konsumsi ${run[0].arah > 0 ? 'naik' : 'turun'} ke rata-rata ${angka(rata, 0)} kWh/bulan (${run[0].arah > 0 ? '+' : ''}${angka(((rata - dasar) / dasar) * 100, 0)}% dari median sebelumnya ${angka(dasar, 0)} kWh) selama ${run.length} bulan${masih ? ' dan masih berlangsung' : ` sampai ${labelBulan(akhirRun.tahun, akhirRun.bulan)}`}. Catat penyebabnya (beban baru, perubahan operasi, cakupan meter) di tinjauan energi; bila memengaruhi EnPI, pertimbangkan penyesuaian baseline (klausul 6.5).`,
          rata, dasar)
      }
      a = z + 1
    }

    const selJendela = bulanJendela.map(({ tahun, bulan, label }) => sel.get(indeks(tahun, bulan)) ?? { tahun, bulan, label, kwh: null, asal: null, status: 'luar' as const, ket: [] })
    const dinilai = selJendela.filter((x) => x.status !== 'luar')
    baris.push({ meter: m, nama, sel: selJendela, skor: dinilai.length ? (dinilai.filter((x) => WAJAR.has(x.status)).length / dinilai.length) * 100 : null })
  }

  const urutTingkat: Record<TingkatTemuan, number> = { crit: 0, warn: 1, info: 2 }
  temuan.sort((a, b) => indeks(b.tahun, b.bulan) - indeks(a.tahun, a.bulan) || urutTingkat[a.tingkat] - urutTingkat[b.tingkat] || a.meter_kode.localeCompare(b.meter_kode))
  const semuaSel = baris.flatMap((r) => r.sel).filter((x) => x.status !== 'luar')
  const hitung = (st: StatusSel) => semuaSel.filter((x) => x.status === st).length
  return {
    bulan: bulanJendela,
    baris,
    temuan,
    ringkas: {
      sel: semuaSel.length,
      baik: hitung('baik') + hitung('isian') + hitung('bergeser'),
      isian: hitung('isian'),
      bergeser: hitung('bergeser'),
      kosong: hitung('kosong'),
      anomali: hitung('anomali'),
      masalah: hitung('masalah'),
      skor: semuaSel.length ? (semuaSel.filter((x) => WAJAR.has(x.status)).length / semuaSel.length) * 100 : null,
      dariStand: semuaSel.filter((x) => x.asal === 'stand').length,
    },
  }
}
