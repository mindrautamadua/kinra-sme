/**
 * Data untuk buku "Kisah Energi KINRA" (panduan bercerita ISO 50001:2018).
 * Semua angka dihitung ulang dari basis data setiap kali halaman dibuka, sehingga buku dan PDF-nya
 * selalu sama dengan aplikasi. Fungsi murni: tidak membaca database sendiri.
 */
import { hitungDekomposisi, pilihLingkup, tahunTersedia, type Dekomposisi } from './dekomposisi'
import { konsumsiBacaan, pilihEnpiUtama, type HasilEnpi } from './enpi'
import { BULAN_PANJANG } from './format'
import { KWH_PER_LITER, type Konversi } from './konversi'
import { siapAudit, adaBukti, tonggakDari, type Tonggak } from './status'
import type { Aset, Deviasi, Dokumen, EnergiBulanan, Enpi, Isu, Kegiatan, MeterEnergi, PembacaanMeter, Peluang, RencanaAksi, Sasaran, Seu, SumberEnergi, Temuan, TinjauanEnergi, VariabelBulanan } from './types'

export type BatasPr = 's1' | 'tm' | 's2'
export type Pr = { teks: string; prioritas?: boolean; batas: BatasPr }

export type BarisPareto = { kode: string; nama: string; kwh: number; porsi: number; kumulatif: number; seu: string | null }

export type KisahInput = {
  aset: Aset[]; meter: MeterEnergi[]; bacaan: PembacaanMeter[]
  sumber: SumberEnergi[]; energi: EnergiBulanan[]; dataVariabel: VariabelBulanan[]
  enpi: Enpi[]; hasil: HasilEnpi[]
  seu: Seu[]; tinjauan: TinjauanEnergi | null
  sasaran: Sasaran[]; aksi: RencanaAksi[]
  isu: Isu[]; peluang: Peluang[]; temuan: Temuan[]; deviasi: Deviasi[]
  dokumen: Dokumen[]; kegiatan: Kegiatan[]
  kv: Konversi; kini: string
}

const SUMBER_KAWASAN = ['pln', 'pltbg', 'plts']
const BBM = ['dexlite', 'dexlite_genset', 'bensin'] as const

export function susunKisah(o: KisahInput) {
  const meterKwh = o.meter.filter((m) => m.satuan.toLowerCase() === 'kwh')
  const kwh = new Map<string, number>()
  for (const b of o.bacaan) {
    const m = meterKwh.find((x) => x.kode === b.meter_kode)
    const v = m && konsumsiBacaan(b, m)
    if (v === null || v === undefined) continue
    kwh.set(`${b.meter_kode}|${b.tahun}|${b.bulan}`, v)
  }
  const nilai = (k: string, t: number, b: number) => kwh.get(`${k}|${t}|${b}`)
  const aktifDi = (k: string, t: number) => [...Array(12)].some((_, i) => (nilai(k, t, i + 1) ?? 0) > 0)
  const meterTahun = (t: number) => meterKwh.filter((m) => aktifDi(m.kode, t)).map((m) => m.kode)
  const bulanLengkap = (t: number, b: number) => { const ms = meterTahun(t); return ms.length > 0 && ms.every((k) => nilai(k, t, b) !== undefined) }
  const tahunAda = [...new Set(o.bacaan.map((b) => b.tahun))].sort((a, b) => a - b)

  // Tahun penuh terakhir: 12 bulan lengkap untuk semua meter yang aktif di tahun itu
  const tahunPenuh = [...tahunAda].reverse().find((t) => [...Array(12)].every((_, i) => bulanLengkap(t, i + 1))) ?? null
  // Tahun berjalan: tahun terakhir dengan bacaan; bulan pembanding = bulan lengkap sejak Januari
  const tahunKini = tahunAda.at(-1) ?? null
  const bulanKini: number[] = []
  if (tahunKini !== null) for (let b = 1; b <= 12 && bulanLengkap(tahunKini, b); b++) bulanKini.push(b)

  const jumlahListrik = (t: number, bulan: number[]) => bulan.reduce((s, b) => s + meterKwh.reduce((x, m) => x + (nilai(m.kode, t, b) ?? 0), 0), 0)
  const semuaBulan = [...Array(12)].map((_, i) => i + 1)

  // ── Bab 1: tagihan ────────────────────────────────────────────
  const kwhPenuh = tahunPenuh !== null ? jumlahListrik(tahunPenuh, semuaBulan) : null
  const rupiahPenuh = kwhPenuh !== null ? kwhPenuh * o.kv.tarifListrik : null
  const ytd = tahunKini !== null && bulanKini.length
    ? [tahunKini - 2, tahunKini - 1, tahunKini].filter((t) => tahunAda.includes(t)).map((t) => ({ tahun: t, kwh: jumlahListrik(t, bulanKini) }))
    : []
  const bbmYtd = (kode: string, t: number) => o.energi.filter((d) => d.sumber_kode === kode && d.tahun === t && bulanKini.includes(d.bulan)).reduce((s, d) => s + d.nilai, 0)
  const bbm = tahunKini !== null ? BBM.map((kode) => ({
    kode, nama: o.sumber.find((s) => s.kode === kode)?.nama ?? kode,
    kini: bbmYtd(kode, tahunKini), lalu: bbmYtd(kode, tahunKini - 1),
    bulanKini: new Set(o.energi.filter((d) => d.sumber_kode === kode && d.tahun === tahunKini && bulanKini.includes(d.bulan)).map((d) => d.bulan)).size,
  })).filter((x) => x.kini || x.lalu) : []

  // ── Bab 2: batas ──────────────────────────────────────────────
  const kawasanPenuh = tahunPenuh !== null ? o.energi.filter((d) => d.tahun === tahunPenuh && SUMBER_KAWASAN.includes(d.sumber_kode)).reduce((s, d) => s + d.nilai, 0) : 0
  const namaMeter = (m: MeterEnergi) => o.aset.find((a) => a.kode === m.aset_kode)?.nama ?? m.lokasi ?? m.kode
  const seuMeter = (kode: string) => o.seu.find((s) => s.status !== 'Dicabut' && s.meter_kode.includes(kode))?.kode ?? null
  const meterBatas = tahunPenuh !== null ? meterTahun(tahunPenuh) : meterKwh.map((m) => m.kode)

  // ── Bab 4: Pareto ─────────────────────────────────────────────
  let kum = 0
  const pareto: BarisPareto[] = tahunPenuh === null || !kwhPenuh ? [] : meterKwh
    .map((m) => ({ kode: m.kode, nama: namaMeter(m), kwh: semuaBulan.reduce((s, b) => s + (nilai(m.kode, tahunPenuh, b) ?? 0), 0), seu: seuMeter(m.kode) }))
    .filter((r) => r.kwh > 0).sort((a, b) => b.kwh - a.kwh)
    .map((r) => { const porsi = (r.kwh / kwhPenuh) * 100; kum += porsi; return { ...r, porsi, kumulatif: kum } })
  const ambangPersen = o.tinjauan?.ambang_persen ?? 10
  const ambangKumulatif = o.tinjauan?.ambang_kumulatif ?? 80
  const bbmPenuhKwh = tahunPenuh !== null ? BBM.reduce((s, kode) => s + o.energi.filter((d) => d.sumber_kode === kode && d.tahun === tahunPenuh).reduce((x, d) => x + d.nilai, 0) * KWH_PER_LITER[kode], 0) : 0
  const porsiBbm = kwhPenuh ? (bbmPenuhKwh / (kwhPenuh + bbmPenuhKwh)) * 100 : null
  const seuAktif = o.seu.filter((s) => s.status !== 'Dicabut').sort((a, b) => a.urutan - b.urutan).map((s) => ({
    ...s, porsi: pareto.filter((p) => s.meter_kode.includes(p.kode)).reduce((t, p) => t + p.porsi, 0),
    meterLabel: s.meter_kode.map((k) => k.replace('KINRA-', '')).join(', '),
  }))
  const nTeratas = (() => { const i = pareto.findIndex((p) => p.kumulatif >= ambangKumulatif); return i < 0 ? pareto.length : i + 1 })()

  // ── Bab 5: EnPI & dekomposisi ────────────────────────────────
  const utama = pilihEnpiUtama(o.hasil)
  const enpiKinra = o.hasil.filter((h) => h.enpi.aktif && (h.enpi.lingkup ?? 'kinra') === 'kinra')
    .sort((a, b) => Number(b.enpi.kode === utama?.enpi.kode) - Number(a.enpi.kode === utama?.enpi.kode) || a.enpi.urutan - b.enpi.urutan)
  const enpiKawasan = o.hasil.filter((h) => h.enpi.aktif && h.enpi.lingkup === 'kawasan').map((h) => h.enpi.kode)
  const tahunMeter = tahunTersedia(o.bacaan, pilihLingkup(o.hasil, o.meter))
  const pasanganTahun = tahunMeter.slice(1).map((b) => ({ a: b - 1, b })).filter((p) => tahunMeter.includes(p.a))
  const dek = (p?: { a: number; b: number }): Dekomposisi | null => (p ? hitungDekomposisi({ hasil: o.hasil, seu: o.seu, meter: o.meter, bacaan: o.bacaan, variabelData: o.dataVariabel, tahunA: p.a, tahunB: p.b }) : null)
  const dekKini = dek(pasanganTahun.at(-1))
  const dekLalu = dek(pasanganTahun.at(-2))
  const kinerjaPersen = (d: Dekomposisi | null) => {
    if (!d) return []
    return d.komponen.filter((k) => k.jenis === 'kinerja').map((k) => {
      const sg = d.segmen.find((s) => s.seu.kode === k.seu)
      const kondisi = d.komponen.find((x) => x.jenis === 'kondisi' && x.seu === k.seu)
      return {
        seu: k.seu!, nilai: k.nilai, kondisi: kondisi?.nilai ?? 0,
        persen: sg && sg.harapanB > 0 ? (k.nilai / sg.harapanB) * 100 : null,
        ubahVar: sg?.variabelA && sg.variabelB ? ((sg.variabelB - sg.variabelA) / sg.variabelA) * 100 : null,
        variabel: sg?.hasil.variabel[0]?.nama ?? null,
      }
    })
  }

  // ── Bab 6: sasaran & aksi ────────────────────────────────────
  const risiko = o.isu.filter((i) => i.jenis === 'Risiko')
  const isuPeluang = o.isu.filter((i) => i.jenis === 'Peluang')
  const skorRisiko = [...new Set(risiko.map((r) => r.skor))]
  const peluangKosong = o.peluang.filter((p) => p.skor_energi === null || p.skor_roi === null || p.estimasi_kwh === null)
  const aksiUnggulan = [...o.aksi].filter((a) => a.status !== 'Batal' && (a.estimasi_hemat_kwh ?? 0) > 0).sort((a, b) => (b.estimasi_hemat_kwh ?? 0) - (a.estimasi_hemat_kwh ?? 0))[0] ?? null
  const hematTerverifikasi = o.aksi.reduce((s, a) => s + (a.hemat_terverifikasi_kwh ?? 0), 0)

  // ── Bab 7: meter ─────────────────────────────────────────────
  const kosong = (v: string | null) => !v || !v.trim()
  const meterTidakLengkap = meterKwh.filter((m) => kosong(m.kelas_akurasi) || !m.kalibrasi_terakhir || kosong(m.pic_data))
  const bulanTerakhirLengkap = (() => {
    for (const t of [...tahunAda].reverse()) for (let b = 12; b >= 1; b--) if (bulanLengkap(t, b)) return { tahun: t, bulan: b }
    return null
  })()

  // ── Bab 8–10: dokumen, deviasi, temuan ───────────────────────
  const dokKlausul = (awal: string[]) => {
    const ds = o.dokumen.filter((d) => awal.some((a) => d.klausul_kode === a || d.klausul_kode.startsWith(`${a}.`)))
    return { n: ds.length, siap: ds.filter(siapAudit).length, bukti: ds.filter(adaBukti).length, belum: ds.filter((d) => !adaBukti(d)) }
  }
  const wajib = o.dokumen.filter((d) => d.wajib_iso)
  const wajibBelumSiap = wajib.filter((d) => !siapAudit(d))
  const klausulKosong = [...new Set(wajib.map((d) => d.klausul_kode))].filter((k) => wajib.filter((d) => d.klausul_kode === k).every((d) => !adaBukti(d))).sort()
  const devBuka = o.deviasi.filter((d) => d.status !== 'Ditutup' && d.status !== 'Bukan deviasi')
  const devBukaPerEnpi = [...new Set(devBuka.map((d) => d.enpi_kode))].map((k) => ({ enpi: k, n: devBuka.filter((d) => d.enpi_kode === k).length, nama: o.enpi.find((e) => e.kode === k)?.nama ?? k }))
  const temuanBuka = o.temuan.filter((t) => t.status !== 'Tertutup')
  const temuanTanpaAkar = temuanBuka.filter((t) => kosong(t.akar_masalah))
  const temuanKategori = (['Mayor', 'Minor', 'Observasi', 'OFI'] as const).map((k) => ({ k, n: o.temuan.filter((t) => t.kategori === k).length, buka: temuanBuka.filter((t) => t.kategori === k).length }))

  // ── Tonggak ──────────────────────────────────────────────────
  const tonggak = tonggakDari(o.kegiatan)
  const tg = (kode: string): Tonggak | null => tonggak.find((t) => t.kode === kode) ?? null

  // ── Pekerjaan rumah (dihitung dari data) ─────────────────────
  const pr: Record<string, Pr[]> = { b2: [], b3: [], b4: [], b5: [], b6: [], b7: [], b8: [], b9: [], b10: [] }
  const kandidat = seuAktif.filter((s) => s.status === 'Kandidat')
  if (kandidat.length) pr.b4.push({ prioritas: true, batas: 's1', teks: `Tetapkan ${kandidat.map((s) => s.kode).join(' dan ')} dalam rapat Tim Energi, lalu ubah statusnya menjadi Ditetapkan di Tinjauan Energi & SEU. Status "Kandidat" saat audit akan dipertanyakan.` })
  if (!o.tinjauan || o.tinjauan.status !== 'Disetujui') pr.b4.push({ batas: 's1', teks: 'Setujui catatan tinjauan energi periode terbaru di aplikasi dan susun Laporan Tinjauan Energi lengkap (sumber, Pareto, variabel relevan, perkiraan kinerja, peluang terprioritas).' })
  for (const s of seuAktif.filter((x) => !x.variabel_kode.length)) pr.b4.push({ batas: 's2', teks: `Tentukan variabel relevan ${s.kode} (${s.nama.replace(/\s*\(.*\)/, '')}), misalnya debit atau volume yang diolah.` })
  for (const h of enpiKinra.filter((x) => x.enpi.metode === 'absolut')) {
    const seuTerkait = seuAktif.find((s) => s.enpi_kode === h.enpi.kode)
    pr.b5.push({ batas: seuTerkait ? 'tm' : 's2', teks: `${h.enpi.kode} (${h.enpi.nama}) masih absolut. Lengkapi data variabel relevannya lalu ubah menjadi rasio atau regresi agar bisa dinormalisasi.` })
  }
  if (dekKini?.peringatan.some((p) => p.includes('ekstrapolasi'))) pr.b5.push({ batas: 'tm', teks: `Sebagian bulan ${dekKini.tahunB} punya variabel di luar rentang baseline. Putuskan di tinjauan manajemen apakah baseline perlu disesuaikan (prosedur EnB).` })
  for (const k of kinerjaPersen(dekLalu).filter((x) => x.nilai > 0)) pr.b5.push({ batas: 'tm', teks: `Siapkan penjelasan mengapa kinerja ${k.seu} lebih boros${k.persen !== null ? ` sekitar ${Math.abs(k.persen).toFixed(0)}%` : ''} pada ${dekLalu!.tahunB} dibanding ${dekLalu!.tahunA}.` })
  if (risiko.length > 1 && skorRisiko.length === 1) pr.b6.push({ prioritas: true, batas: 's1', teks: `Nilai ulang ${risiko.length} risiko bersama pemiliknya. Saat ini semuanya bernilai sama (skor ${skorRisiko[0]}), dan penilaian seragam mudah dipertanyakan auditor.` })
  if (peluangKosong.length) pr.b6.push({ batas: 's1', teks: `Isi skor energi, skor ROI, dan estimasi kWh untuk ${peluangKosong.length} peluang (${peluangKosong.slice(0, 6).map((p) => p.kode).join(', ')}${peluangKosong.length > 6 ? ', …' : ''}).` })
  if (o.sasaran.length && !o.sasaran.some((s) => s.enpi_kode && s.target_persen !== null && s.status !== 'Tidak tercapai')) pr.b6.push({ prioritas: true, batas: 's1', teks: 'Belum ada sasaran kinerja energi yang terukur dengan EnPI. Sasaran di formulir 6.2 berupa target perilaku dan kepatuhan; tetapkan target energi untuk SEU (mis. kWh/m³ WTP) di Formulir Tujuan dan Target Energi, lalu catat di halaman Sasaran.' })
  for (const s of o.sasaran.filter((x) => x.status === 'Draft')) pr.b6.push({ batas: 'tm', teks: `Finalkan sasaran ${s.kode}${s.enpi_kode ? ` (${s.enpi_kode})` : ''} yang masih Draft.` })
  if (meterTidakLengkap.length) pr.b7.push({ prioritas: true, batas: 's1', teks: `Lengkapi register ${meterTidakLengkap.length} meter (${meterTidakLengkap.map((m) => m.kode.replace('KINRA-', '')).join(', ')}): kelas akurasi, tanggal kalibrasi terakhir dan berikutnya, PIC data, bukti pendukung. Kalibrasi adalah temuan klasik di audit.` })
  if (bulanTerakhirLengkap) {
    const [t, b] = o.kini.split('-').map(Number)
    const kurang = (t * 12 + b - 1) - (bulanTerakhirLengkap.tahun * 12 + bulanTerakhirLengkap.bulan - 1) - 1
    if (kurang > 0) pr.b7.push({ batas: 's2', teks: `Bacaan meter lengkap terakhir adalah ${BULAN_PANJANG[bulanTerakhirLengkap.bulan - 1]} ${bulanTerakhirLengkap.tahun}. Isi bacaan ${kurang} bulan berikutnya untuk semua meter.` })
  }
  const k7 = dokKlausul(['7']), k8 = dokKlausul(['8'])
  if (k7.belum.length + k8.belum.length) pr.b8.push({ batas: 's2', teks: `Unggah evidence ${k7.belum.length + k8.belum.length} dokumen klausul 7–8 yang masih kosong, misalnya ${[...k7.belum, ...k8.belum].slice(0, 3).map((d) => d.nama).join('; ')}.` })
  if (wajibBelumSiap.length) pr.b8.push({ batas: 's1', teks: `Tandai berkas versi sah lalu ubah status menjadi Final untuk ${wajibBelumSiap.length} dari ${wajib.length} dokumen wajib ISO yang belum siap audit.` })
  for (const k of klausulKosong.filter((x) => x.startsWith('9'))) pr.b9.push({ prioritas: true, batas: 's1', teks: `Evidence dokumen wajib klausul ${k} masih kosong semua. Susun dan unggah sebelum audit.` })
  for (const d of devBukaPerEnpi) pr.b9.push({ batas: 'tm', teks: `Selidiki ${d.n} deviasi terbuka ${d.enpi} (${d.nama}) dan catat penyebab serta tindakannya di register deviasi.` })
  for (const k of klausulKosong.filter((x) => x.startsWith('10'))) pr.b10.push({ prioritas: true, batas: 's1', teks: `Evidence dokumen wajib klausul ${k} masih kosong semua (mis. Formulir dan Logbook PTPP).` })
  if (temuanTanpaAkar.length) pr.b10.push({ batas: 'tm', teks: `Lengkapi akar masalah ${temuanTanpaAkar.length} temuan terbuka (${temuanTanpaAkar.slice(0, 5).map((t) => t.nomor).join(', ')}) di halaman Temuan Audit.` })
  if (temuanBuka.length) pr.b10.push({ batas: 's2', teks: `Tutup ${temuanBuka.length} temuan yang masih terbuka sebelum Stage 2, mulai dari kategori Mayor.` })
  if (aksiUnggulan && aksiUnggulan.status !== 'Selesai') pr.b6.push({ batas: 's2', teks: `Selesaikan aksi ${aksiUnggulan.kode} (${aksiUnggulan.uraian}) dan verifikasi penghematannya.` })
  const dk2 = dokKlausul(['4']); if (dk2.belum.length) pr.b2.push({ batas: 's1', teks: `Unggah evidence ${dk2.belum.length} dokumen klausul 4 yang masih kosong: ${dk2.belum.slice(0, 4).map((d) => d.nama).join('; ')}.` })
  const dk3 = dokKlausul(['5']); if (dk3.belum.length) pr.b3.push({ batas: 's1', teks: `Unggah evidence ${dk3.belum.length} dokumen klausul 5 yang masih kosong: ${dk3.belum.slice(0, 4).map((d) => d.nama).join('; ')}.` })

  return {
    tahunPenuh, tahunKini, bulanKini, kwhPenuh, rupiahPenuh, ytd, bbm,
    kawasanPenuh, meterBatas: meterBatas.map((k) => { const m = meterKwh.find((x) => x.kode === k)!; return { kode: k, nama: namaMeter(m) } }),
    pareto, ambangPersen, ambangKumulatif, nTeratas, porsiBbm, seuAktif,
    utama, enpiKinra, enpiKawasan, dekKini, dekLalu, pasanganTahun,
    kinerjaKini: kinerjaPersen(dekKini), kinerjaLalu: kinerjaPersen(dekLalu),
    risiko, isuPeluang, skorRisiko, peluang: o.peluang, sasaran: o.sasaran, aksiUnggulan, hematTerverifikasi,
    meterKwh, meterTidakLengkap, bulanTerakhirLengkap,
    k4: dk2, k5: dk3, k7, k8, wajib, wajibBelumSiap, klausulKosong,
    devBuka, devBukaPerEnpi, temuan: o.temuan, temuanBuka, temuanKategori,
    tonggak, tg, pr, nIsu: o.isu.length,
  }
}

export type Kisah = ReturnType<typeof susunKisah>
