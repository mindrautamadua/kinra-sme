/**
 * Dekomposisi perubahan energi (energy waterfall), ISO 50006 / ISO 50015.
 *
 * Menjawab "mengapa konsumsi listrik KINRA berubah antara dua tahun?" dengan memecah selisih total menjadi:
 *   - efek kondisi operasi per SEU (perubahan variabel relevan, mis. volume air), dari model EnPI SEU;
 *   - efek kinerja per SEU (sisa setelah dinormalisasi = efisiensi sebenarnya);
 *   - perubahan SEU yang EnPI-nya belum ternormalisasi (metode absolut);
 *   - meter/aset baru (faktor statis);
 *   - perubahan pengguna lain tanpa variabel relevan.
 *
 * Untuk SEU bermodel: ΔE = (H_B − H_A) + [(A_B − H_B) − (A_A − H_A)], dengan A = aktual, H = harapan model baseline.
 * Suku pertama = efek kondisi, suku kedua = efek kinerja. Jumlah semua komponen sama persis dengan selisih total,
 * karena hanya bulan yang lengkap di kedua tahun yang dibandingkan.
 */
import { BULAN } from './format'
import { konsumsiBacaan, type HasilEnpi, type Titik } from './enpi'
import type { MeterEnergi, PembacaanMeter, Seu, VariabelBulanan } from './types'

export type JenisKomponen = 'kondisi' | 'kinerja' | 'absolut' | 'struktur' | 'lain'

export type Komponen = {
  jenis: JenisKomponen
  label: string
  ket: string
  nilai: number
  seu?: string
}

export type Segmen = {
  seu: Seu
  hasil: HasilEnpi
  meter: string[]
  ternormalisasi: boolean
  aktualA: number
  aktualB: number
  harapanA: number
  harapanB: number
  /** Total variabel pertama (mis. m³ air) di bulan yang dibandingkan; hanya untuk EnPI rasio/regresi */
  variabelA: number | null
  variabelB: number | null
}

export type Dekomposisi = {
  tahunA: number
  tahunB: number
  bulan: number[]
  /** Bulan yang dikeluarkan beserta alasannya */
  keluar: { bulan: number; alasan: string }[]
  totalA: number
  totalB: number
  komponen: Komponen[]
  segmen: Segmen[]
  meterLingkup: string[]
  peringatan: string[]
}

const labelBulanSingkat = (b: number[]) => {
  if (!b.length) return '–'
  const urut = [...b].sort((x, y) => x - y)
  const berurutan = urut.every((v, i) => i === 0 || v === urut[i - 1] + 1)
  return berurutan ? `${BULAN[urut[0] - 1]}–${BULAN[urut.at(-1)! - 1]}` : urut.map((v) => BULAN[v - 1]).join(', ')
}
export const periodeBulan = labelBulanSingkat

/** Tahun yang punya bacaan meter untuk lingkup; dipakai sebagai pilihan pembanding. */
export function tahunTersedia(bacaan: PembacaanMeter[], meterLingkup: string[]) {
  return [...new Set(bacaan.filter((b) => meterLingkup.includes(b.meter_kode)).map((b) => b.tahun))].sort()
}

/** Lingkup total: EnPI lingkup KINRA berbasis meter dengan meter terbanyak (EnPI organisasi). */
export function pilihLingkup(hasil: HasilEnpi[], meter: MeterEnergi[]) {
  const kandidat = hasil.filter((h) => h.enpi.aktif && (h.enpi.lingkup ?? 'kinra') === 'kinra' && (h.enpi.meter_kode?.length ?? 0) > 0)
    .sort((a, b) => (b.enpi.meter_kode!.length) - (a.enpi.meter_kode!.length))
  return kandidat[0]?.enpi.meter_kode ?? meter.map((m) => m.kode)
}

export function hitungDekomposisi(p: {
  hasil: HasilEnpi[]
  seu: Seu[]
  meter: MeterEnergi[]
  bacaan: PembacaanMeter[]
  variabelData: VariabelBulanan[]
  tahunA: number
  tahunB: number
}): Dekomposisi {
  const { hasil, seu, meter, bacaan, variabelData, tahunA, tahunB } = p
  const peringatan: string[] = []
  const meterLingkup = pilihLingkup(hasil, meter)

  // kWh per meter per (tahun, bulan)
  const kwh = new Map<string, number>()
  for (const b of bacaan) {
    if (!meterLingkup.includes(b.meter_kode)) continue
    const m = meter.find((x) => x.kode === b.meter_kode)
    const v = m && konsumsiBacaan(b, m)
    if (v === null || v === undefined) continue
    kwh.set(`${b.meter_kode}|${b.tahun}|${b.bulan}`, v)
  }
  const nilai = (kode: string, th: number, bl: number) => kwh.get(`${kode}|${th}|${bl}`)
  // Meter dianggap aktif pada suatu tahun bila punya bacaan tak nol; meter yang belum aktif di tahun A diperlakukan sebagai faktor statis baru
  const aktifDi = (kode: string, th: number) => [...Array(12)].some((_, i) => (nilai(kode, th, i + 1) ?? 0) > 0)
  const meterBaru = meterLingkup.filter((k) => !aktifDi(k, tahunA) && aktifDi(k, tahunB))
  const meterWajib = meterLingkup.filter((k) => aktifDi(k, tahunA) || aktifDi(k, tahunB))
  const lengkapMeter = (th: number, bl: number) => meterWajib.every((k) => nilai(k, th, bl) !== undefined || (meterBaru.includes(k) && th === tahunA))

  // Segmen SEU: SEU aktif yang punya EnPI berbasis meter di dalam lingkup; meter tidak boleh tumpang tindih
  const dipakai = new Set<string>()
  const segmenAwal: { seu: Seu; hasil: HasilEnpi; meter: string[] }[] = []
  for (const s of [...seu].filter((x) => x.status !== 'Dicabut').sort((a, b) => a.urutan - b.urutan)) {
    const h = s.enpi_kode ? hasil.find((x) => x.enpi.kode === s.enpi_kode) : undefined
    const mk = h?.enpi.meter_kode ?? []
    if (!h || h.galat || !mk.length) continue
    if (mk.some((k) => !meterLingkup.includes(k) || dipakai.has(k))) {
      peringatan.push(`${s.kode} dilewati: meter ${h.enpi.kode} di luar lingkup atau sudah dipakai SEU lain.`)
      continue
    }
    mk.forEach((k) => dipakai.add(k))
    segmenAwal.push({ seu: s, hasil: h, meter: mk })
  }
  const titikDi = (h: HasilEnpi, th: number, bl: number): Titik | undefined => [...h.baseline, ...h.laporan].find((t) => t.tahun === th && t.bulan === bl)
  const nilaiVar = new Map(variabelData.map((v) => [`${v.variabel_kode}|${v.tahun}|${v.bulan}`, v.nilai]))
  const xDi = (h: HasilEnpi, th: number, bl: number) => h.enpi.variabel_kode.map((k) => nilaiVar.get(`${k}|${th}|${bl}`) ?? null)
  /**
   * Harapan model baseline pada bulan mana pun, termasuk sebelum periode baseline (mis. membandingkan 2024 → 2025).
   * Rasio/regresi: koefisien × variabel bulan itu. Absolut: rata-rata bulan kalender yang sama pada baseline.
   */
  const harapanDi = (h: HasilEnpi, th: number, bl: number): number | null => {
    const t = titikDi(h, th, bl)
    if (t && t.harapan !== null) return t.harapan
    const m = h.model
    if (!m) return null
    if (h.enpi.metode === 'absolut') {
      const ada = h.baseline.filter((b) => b.aktual !== null)
      const sama = ada.filter((b) => b.bulan === bl)
      const pakai = sama.length ? sama : ada
      return pakai.length ? pakai.reduce((s, b) => s + b.aktual!, 0) / pakai.length : null
    }
    const x = xDi(h, th, bl)
    if (x.some((v) => v === null)) return null
    if (h.enpi.metode === 'rasio') return m.koef[0] * x[0]!
    return m.koef[0] + x.reduce<number>((s, v, i) => s + m.koef[i + 1] * v!, 0)
  }

  // Bulan yang dibandingkan: data meter lengkap dan setiap segmen punya aktual + harapan di kedua tahun
  const bulan: number[] = []
  const keluar: { bulan: number; alasan: string }[] = []
  for (let bl = 1; bl <= 12; bl++) {
    const alasan: string[] = []
    if (!lengkapMeter(tahunA, bl) || !lengkapMeter(tahunB, bl)) {
      const kurang = [tahunA, tahunB].filter((th) => !lengkapMeter(th, bl))
      alasan.push(`bacaan meter ${kurang.join(' & ')} belum lengkap`)
    } else {
      for (const sg of segmenAwal) {
        for (const th of [tahunA, tahunB]) {
          if (sg.meter.some((k) => nilai(k, th, bl) === undefined)) alasan.push(`${sg.seu.kode}: energi ${th} kosong`)
          else if (harapanDi(sg.hasil, th, bl) === null) alasan.push(`${sg.seu.kode}: variabel relevan ${th} kosong`)
        }
      }
    }
    if (alasan.length) {
      // Bulan yang kosong di kedua tahun (mis. belum berjalan) tidak perlu dilaporkan
      const adaData = meterWajib.some((k) => nilai(k, tahunB, bl) !== undefined)
      if (adaData) keluar.push({ bulan: bl, alasan: [...new Set(alasan)].join('; ') })
    } else bulan.push(bl)
  }

  const jumlahMeter = (kode: string[], th: number) => bulan.reduce((s, bl) => s + kode.reduce((t, k) => t + (nilai(k, th, bl) ?? 0), 0), 0)
  const totalA = jumlahMeter(meterLingkup, tahunA)
  const totalB = jumlahMeter(meterLingkup, tahunB)

  const segmen: Segmen[] = segmenAwal.map(({ seu: s, hasil: h, meter: mk }) => {
    const harapan = (th: number) => bulan.reduce((acc, bl) => acc + (harapanDi(h, th, bl) ?? 0), 0)
    const variabelTotal = (th: number) => bulan.reduce((acc, bl) => acc + (xDi(h, th, bl)[0] ?? 0), 0)
    const pakaiVar = h.enpi.metode !== 'absolut' && h.variabel.length > 0
    return {
      seu: s, hasil: h, meter: mk,
      ternormalisasi: h.enpi.metode !== 'absolut',
      // Aktual segmen dihitung dari meter langsung agar konsisten dengan total lingkup
      aktualA: jumlahMeter(mk, tahunA),
      aktualB: jumlahMeter(mk, tahunB),
      harapanA: harapan(tahunA),
      harapanB: harapan(tahunB),
      variabelA: pakaiVar ? variabelTotal(tahunA) : null,
      variabelB: pakaiVar ? variabelTotal(tahunB) : null,
    }
  })

  const komponen: Komponen[] = []
  for (const sg of segmen) {
    const nama = sg.seu.nama.replace(/\s*\(.*\)\s*/, ' ').trim()
    if (sg.ternormalisasi) {
      const v = sg.hasil.variabel[0]
      const ubahVar = sg.variabelA && sg.variabelB ? ((sg.variabelB - sg.variabelA) / sg.variabelA) * 100 : null
      komponen.push({
        jenis: 'kondisi', seu: sg.seu.kode, nilai: sg.harapanB - sg.harapanA,
        label: `${sg.seu.kode} · kondisi operasi`,
        ket: `${nama}: perubahan ${v?.nama ?? 'variabel relevan'}${ubahVar !== null ? ` ${ubahVar >= 0 ? '+' : '−'}${Math.abs(ubahVar).toFixed(1).replace('.', ',')}%` : ''}. Wajar, bukan pemborosan.`,
      })
      komponen.push({
        jenis: 'kinerja', seu: sg.seu.kode, nilai: (sg.aktualB - sg.harapanB) - (sg.aktualA - sg.harapanA),
        label: `${sg.seu.kode} · kinerja`,
        ket: `${nama}: selisih setelah dinormalisasi (${sg.hasil.enpi.kode}). Negatif = lebih efisien.`,
      })
      // Model hanya sahih di dalam rentang variabel baseline (±10% lebar rentang), sama dengan aturan di hitungEnpi
      const latih = sg.hasil.baseline.filter((t) => t.aktual !== null && t.x.every((x) => x !== null))
      sg.hasil.variabel.forEach((vv, i) => {
        const xs = latih.map((t) => t.x[i]!)
        if (!xs.length) return
        const lo = Math.min(...xs), hi = Math.max(...xs), tepi = 0.1 * (hi - lo)
        const luar = [tahunA, tahunB].map((th) => ({ th, n: bulan.filter((bl) => { const x = xDi(sg.hasil, th, bl)[i]; return x !== null && (x > hi + tepi || x < lo - tepi) }).length })).filter((r) => r.n > 0)
        if (luar.length) peringatan.push(`${sg.hasil.enpi.kode}: ${luar.map((r) => `${r.n} bulan ${r.th}`).join(' dan ')} punya ${vv.nama} di luar rentang baseline, sehingga pemisahan kondisi dan kinerja ${sg.seu.kode} adalah perkiraan (ekstrapolasi).`)
      })
    } else {
      komponen.push({
        jenis: 'absolut', seu: sg.seu.kode, nilai: sg.aktualB - sg.aktualA,
        label: `${sg.seu.kode} · belum ternormalisasi`,
        ket: `${nama}: ${sg.hasil.enpi.kode} masih absolut, sehingga kondisi operasi dan kinerja belum bisa dipisah. Tambahkan variabel relevan.`,
      })
    }
  }
  const sisa = meterLingkup.filter((k) => !dipakai.has(k))
  const baru = sisa.filter((k) => meterBaru.includes(k))
  const lain = sisa.filter((k) => !meterBaru.includes(k))
  const namaMeter = (k: string) => meter.find((m) => m.kode === k)?.lokasi ?? k
  if (baru.length) komponen.push({
    jenis: 'struktur', nilai: jumlahMeter(baru, tahunB) - jumlahMeter(baru, tahunA),
    label: 'Meter/aset baru', ket: `Faktor statis: ${baru.map(namaMeter).join(', ')} mulai beroperasi setelah ${tahunA}.`,
  })
  if (lain.length) komponen.push({
    jenis: 'lain', nilai: jumlahMeter(lain, tahunB) - jumlahMeter(lain, tahunA),
    label: 'Pengguna lain', ket: `${lain.map(namaMeter).join(', ')}: tanpa variabel relevan, perubahan belum dapat dijelaskan.`,
  })
  if (meterBaru.some((k) => dipakai.has(k))) peringatan.push('Ada meter baru di dalam SEU; perubahannya tercampur di komponen SEU tersebut.')
  if (!segmen.length) peringatan.push('Belum ada SEU dengan EnPI berbasis meter, sehingga perubahan belum dapat dipecah per penyebab.')
  if (bulan.length && bulan.length < 6) peringatan.push(`Hanya ${bulan.length} bulan yang dapat dibandingkan; kesimpulan masih lemah.`)

  return { tahunA, tahunB, bulan, keluar, totalA, totalB, komponen, segmen, meterLingkup, peringatan }
}

/** Kalimat ringkas untuk pimpinan dan auditor. */
export function ceritakan(d: Dekomposisi, fmtKwh: (v: number) => string): string {
  const delta = d.totalB - d.totalA
  if (!d.bulan.length || d.totalA <= 0) return 'Belum ada bulan yang dapat dibandingkan.'
  const pct = (delta / d.totalA) * 100
  const bagian = [`Listrik KINRA ${periodeBulan(d.bulan)} ${d.tahunB} ${delta >= 0 ? 'naik' : 'turun'} ${fmtKwh(Math.abs(delta))} (${pct >= 0 ? '+' : '−'}${Math.abs(pct).toFixed(1).replace('.', ',')}%) dibanding ${d.tahunA}.`]
  const kondisi = d.komponen.filter((k) => k.jenis === 'kondisi').reduce((s, k) => s + k.nilai, 0)
  const kinerja = d.komponen.filter((k) => k.jenis === 'kinerja')
  if (d.komponen.some((k) => k.jenis === 'kondisi')) {
    bagian.push(`${fmtKwh(Math.abs(kondisi))} ${kondisi >= 0 ? 'berasal dari bertambahnya beban operasi SEU' : 'berkurang karena beban operasi SEU turun'}, bukan dari perubahan efisiensi.`)
  }
  for (const k of kinerja) {
    const sg = d.segmen.find((s) => s.seu.kode === k.seu)
    const p = sg && sg.harapanB > 0 ? (Math.abs(k.nilai) / sg.harapanB) * 100 : null
    bagian.push(`Kinerja ${k.seu} ${k.nilai <= 0 ? 'lebih efisien' : 'lebih boros'} ${fmtKwh(Math.abs(k.nilai))}${p !== null ? ` (±${p.toFixed(1).replace('.', ',')}%)` : ''} setelah dinormalisasi.`)
  }
  const abs = d.komponen.filter((k) => k.jenis === 'absolut')
  if (abs.length) bagian.push(`${abs.map((k) => `${k.seu} ${k.nilai >= 0 ? '+' : '−'}${fmtKwh(Math.abs(k.nilai))}`).join(', ')} belum dapat dinilai karena belum punya variabel relevan.`)
  return bagian.join(' ')
}
