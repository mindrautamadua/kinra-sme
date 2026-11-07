/**
 * Perhitungan EnPI & EnB (ISO 50001 6.4–6.5, ISO 50006).
 *
 * Konsumsi "harapan" = konsumsi yang semestinya terjadi pada kondisi bulan itu bila kinerja masih sama
 * dengan periode baseline. Penghematan = harapan − aktual; CUSUM = Σ(aktual − harapan), turun berarti hemat.
 */
import { BULAN } from './format'
import type { EnergiBulanan, Enpi, MeterEnergi, PembacaanMeter, SumberEnergi, VariabelBulanan, VariabelRelevan } from './types'

export type Titik = {
  tahun: number
  bulan: number
  label: string
  aktual: number | null
  harapan: number | null
  x: (number | null)[]
}

export type Model = {
  /** regresi: [b0, b1, …]; rasio: [k]; absolut: kosong */
  koef: number[]
  n: number
  r2: number | null
  cvrmse: number | null
}

export type HasilEnpi = {
  enpi: Enpi
  satuan: string
  variabel: VariabelRelevan[]
  baseline: Titik[]
  laporan: Titik[]
  model: Model | null
  /** Pesan bila model tidak bisa dibentuk (data kurang, variabel kosong, dsb.) */
  galat: string | null
  peringatan: string[]
  /** Jumlah bulan pelaporan dengan variabel di luar rentang baseline (harapan = ekstrapolasi) */
  ekstrapolasi: number
}

/** Ambang validitas model bulanan (ISO 50006 & ASHRAE Guideline 14). */
export const AMBANG = { r2: 0.75, cvrmse: 15, nMin: 12 }

const kunci = (tahun: number, bulan: number) => tahun * 12 + (bulan - 1)
const dariKunci = (k: number) => ({ tahun: Math.floor(k / 12), bulan: (k % 12) + 1 })
const kunciTanggal = (iso: string) => kunci(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)))
export const labelBulan = (tahun: number, bulan: number) => `${BULAN[bulan - 1]} ${String(tahun).slice(2)}`

/** Selesaikan A·x = b (eliminasi Gauss dengan pivot parsial). null bila singular. */
function selesaikan(A: number[][], b: number[]): number[] | null {
  const n = b.length
  const M = A.map((r, i) => [...r, b[i]])
  for (let c = 0; c < n; c++) {
    let p = c
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r
    if (Math.abs(M[p][c]) < 1e-12) return null
    ;[M[c], M[p]] = [M[p], M[c]]
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c]
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]
    }
  }
  const x = new Array(n).fill(0)
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n]
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k]
    x[r] = s / M[r][r]
  }
  return x
}

/** Regresi linier berganda (OLS) lewat persamaan normal. */
export function regresi(xs: number[][], y: number[]): number[] | null {
  const X = xs.map((r) => [1, ...r])
  const p = X[0]?.length ?? 0
  const XtX = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => X.reduce((s, r) => s + r[i] * r[j], 0)))
  const Xty = Array.from({ length: p }, (_, i) => X.reduce((s, r, k) => s + r[i] * y[k], 0))
  return selesaikan(XtX, Xty)
}

function statistik(aktual: number[], harapan: number[], parameter: number): Pick<Model, 'r2' | 'cvrmse'> {
  const n = aktual.length
  const rata = aktual.reduce((s, v) => s + v, 0) / n
  const ssRes = aktual.reduce((s, v, i) => s + (v - harapan[i]) ** 2, 0)
  const ssTot = aktual.reduce((s, v) => s + (v - rata) ** 2, 0)
  const dof = n - parameter
  return {
    r2: ssTot > 0 ? 1 - ssRes / ssTot : null,
    cvrmse: dof > 0 && rata !== 0 ? (Math.sqrt(ssRes / dof) / rata) * 100 : null,
  }
}

/**
 * Konsumsi satu meter pada satu bacaan: (stand akhir − stand awal) × faktor kali.
 * Bila stand belum lengkap, memakai kWh tagihan (data historis dari rekap, tanpa stand).
 */
export const konsumsiBacaan = (b: PembacaanMeter, m: MeterEnergi) =>
  b.stand_awal !== null && b.stand_akhir !== null ? (b.stand_akhir - b.stand_awal) * m.faktor_kali : (b.kwh_tagihan ?? null)

/** Bacaan dianggap ada bila stand awal & akhir terisi, atau kWh tagihan tersedia. */
export const adaBacaan = (b: PembacaanMeter) => (b.stand_awal !== null && b.stand_akhir !== null) || (b.kwh_tagihan ?? null) !== null

/**
 * Pemakaian sendiri KINRA per bulan dari bacaan meter: kunci `tahun*12+bulan-1` → { kwh, terbaca }.
 * `terbaca` = jumlah meter yang punya stand awal & akhir pada bulan itu.
 */
export function pemakaianMeter(meter: MeterEnergi[], bacaan: PembacaanMeter[], kodeMeter?: string[]) {
  const pilih = kodeMeter?.length ? meter.filter((m) => kodeMeter.includes(m.kode)) : meter
  const hasil = new Map<number, { kwh: number; terbaca: number }>()
  for (const b of bacaan) {
    const m = pilih.find((x) => x.kode === b.meter_kode)
    const v = m && konsumsiBacaan(b, m)
    if (v === null || v === undefined) continue
    const k = b.tahun * 12 + (b.bulan - 1)
    const r = hasil.get(k) ?? { kwh: 0, terbaca: 0 }
    hasil.set(k, { kwh: r.kwh + v, terbaca: r.terbaca + 1 })
  }
  return { hasil, jumlahMeter: pilih.length }
}

export function hitungEnpi(enpi: Enpi, sumber: SumberEnergi[], energi: EnergiBulanan[], variabelDef: VariabelRelevan[], variabelData: VariabelBulanan[],
  meterData?: { meter: MeterEnergi[]; bacaan: PembacaanMeter[] }): HasilEnpi {
  const pakaiMeter = (enpi.meter_kode?.length ?? 0) > 0
  const lingkup = pakaiMeter ? [] : sumber.filter((s) => enpi.sumber_kode.includes(s.kode))
  const satuanSama = lingkup.length > 0 && lingkup.every((s) => s.satuan === lingkup[0].satuan)
  const satuan = pakaiMeter ? 'kWh' : satuanSama ? lingkup[0].satuan : 'TJ'
  const faktor = Object.fromEntries(lingkup.map((s) => [s.kode, satuanSama ? 1 : Number(s.faktor_tj)]))
  const variabel = enpi.variabel_kode.map((k) => variabelDef.find((v) => v.kode === k)).filter((v): v is VariabelRelevan => !!v)
  const peringatan: string[] = []
  if (!pakaiMeter && lingkup.length < enpi.sumber_kode.length) peringatan.push('Sebagian sumber energi pada ruang lingkup tidak ditemukan di tabel sumber_energi.')
  if (pakaiMeter && meterData && meterData.meter.filter((m) => enpi.meter_kode!.includes(m.kode)).length < enpi.meter_kode!.length)
    peringatan.push('Sebagian meter pada ruang lingkup EnPI tidak ditemukan di register meter.')

  // Energi per bulan: hanya bulan dengan data lengkap untuk semua sumber dalam lingkup
  const perBulan = new Map<number, Map<string, number>>()
  for (const d of energi) {
    if (!(d.sumber_kode in faktor)) continue
    const k = kunci(d.tahun, d.bulan)
    if (!perBulan.has(k)) perBulan.set(k, new Map())
    perBulan.get(k)!.set(d.sumber_kode, d.nilai)
  }
  // Mode meter: hanya bulan dengan bacaan lengkap untuk semua meter dalam lingkup
  const dariMeter = pakaiMeter ? pemakaianMeter(meterData?.meter ?? [], meterData?.bacaan ?? [], enpi.meter_kode) : null
  const energiBulan = (k: number) => {
    if (dariMeter) {
      const r = dariMeter.hasil.get(k)
      return r && r.terbaca >= enpi.meter_kode!.length ? r.kwh : null
    }
    const m = perBulan.get(k)
    if (!m || lingkup.some((s) => !m.has(s.kode))) return null
    return lingkup.reduce((t, s) => t + m.get(s.kode)! * faktor[s.kode], 0)
  }
  const nilaiVar = new Map(variabelData.map((d) => [`${kunci(d.tahun, d.bulan)}|${d.variabel_kode}`, d.nilai]))
  const xBulan = (k: number) => enpi.variabel_kode.map((v) => nilaiVar.get(`${k}|${v}`) ?? null)

  const kMulai = kunciTanggal(enpi.baseline_mulai)
  const kSelesai = kunciTanggal(enpi.baseline_selesai)
  const semua = dariMeter ? [...dariMeter.hasil.keys()] : [...perBulan.keys()]
  const kAkhir = semua.length ? Math.max(...semua) : kSelesai
  const titik = (k: number): Titik => {
    const { tahun, bulan } = dariKunci(k)
    return { tahun, bulan, label: labelBulan(tahun, bulan), aktual: energiBulan(k), harapan: null, x: xBulan(k) }
  }
  const baseline: Titik[] = []
  for (let k = kMulai; k <= kSelesai; k++) baseline.push(titik(k))
  const laporan: Titik[] = []
  for (let k = kSelesai + 1; k <= kAkhir; k++) laporan.push(titik(k))

  const lengkap = (t: Titik) => t.aktual !== null && t.x.every((v) => v !== null)
  const latih = baseline.filter(lengkap)
  const hasil: HasilEnpi = { enpi, satuan, variabel, baseline, laporan, model: null, galat: null, peringatan, ekstrapolasi: 0 }

  if (enpi.metode !== 'absolut' && variabel.length < enpi.variabel_kode.length) {
    hasil.galat = 'Variabel relevan pada definisi EnPI tidak ditemukan. Periksa daftar variabel.'
    return hasil
  }
  if (baseline.some((t) => t.aktual === null)) peringatan.push(`${baseline.filter((t) => t.aktual === null).length} bulan baseline tanpa data energi lengkap.`)

  if (enpi.metode === 'absolut') {
    // Harapan = bulan kalender yang sama di periode baseline (menangkap pola musiman); bila tidak ada, rata-rata baseline
    const ada = baseline.filter((t) => t.aktual !== null)
    if (!ada.length) { hasil.galat = 'Belum ada data energi pada periode baseline.'; return hasil }
    const rata = ada.reduce((s, t) => s + t.aktual!, 0) / ada.length
    const perKalender = new Map<number, number>()
    for (const t of ada) perKalender.set(t.bulan, t.aktual!)
    for (const t of [...baseline, ...laporan]) t.harapan = perKalender.get(t.bulan) ?? rata
    if (perKalender.size < 12) peringatan.push('Baseline kurang dari 12 bulan kalender; bulan tanpa padanan memakai rata-rata baseline.')
    peringatan.push('Metode absolut tidak menormalisasi perubahan kondisi operasi. Auditor umumnya meminta EnPI ternormalisasi (rasio/regresi) untuk SEU.')
    hasil.model = { koef: [], n: ada.length, r2: null, cvrmse: null }
    return hasil
  }

  if (enpi.metode === 'rasio') {
    if (latih.length < 3) { hasil.galat = `Butuh minimal 3 bulan baseline dengan data energi dan variabel; tersedia ${latih.length}.`; return hasil }
    const sx = latih.reduce((s, t) => s + t.x[0]!, 0)
    if (sx === 0) { hasil.galat = 'Total variabel pada baseline nol; rasio tidak dapat dihitung.'; return hasil }
    const k = latih.reduce((s, t) => s + t.aktual!, 0) / sx
    for (const t of [...baseline, ...laporan]) t.harapan = t.x[0] === null ? null : k * t.x[0]
    hasil.model = { koef: [k], n: latih.length, ...statistik(latih.map((t) => t.aktual!), latih.map((t) => t.harapan!), 1) }
  } else {
    const p = variabel.length + 1
    if (latih.length < p + 2) { hasil.galat = `Regresi ${variabel.length} variabel butuh minimal ${p + 2} bulan baseline lengkap; tersedia ${latih.length}.`; return hasil }
    const koef = regresi(latih.map((t) => t.x as number[]), latih.map((t) => t.aktual!))
    if (!koef) { hasil.galat = 'Model regresi tidak dapat dihitung: nilai variabel pada baseline tidak bervariasi atau saling berkorelasi sempurna.'; return hasil }
    for (const t of [...baseline, ...laporan]) t.harapan = t.x.some((v) => v === null) ? null : koef[0] + t.x.reduce<number>((s, v, i) => s + koef[i + 1] * v!, 0)
    hasil.model = { koef, n: latih.length, ...statistik(latih.map((t) => t.aktual!), latih.map((t) => t.harapan!), p) }
  }

  const m = hasil.model!
  if (m.n < AMBANG.nMin) peringatan.push(`Baseline hanya ${m.n} bulan; ISO 50006 menyarankan minimal ${AMBANG.nMin} titik data.`)
  if (m.r2 !== null && m.r2 < AMBANG.r2) peringatan.push(`R² ${m.r2.toFixed(2)} di bawah ${AMBANG.r2}: variabel belum menjelaskan konsumsi dengan baik. Pertimbangkan variabel lain.`)
  if (m.cvrmse !== null && m.cvrmse > AMBANG.cvrmse) peringatan.push(`CV(RMSE) ${m.cvrmse.toFixed(1)}% di atas ${AMBANG.cvrmse}%: ketidakpastian model tinggi.`)
  // Model hanya sahih di dalam rentang variabel baseline (ISO 50006); di luar itu harapan adalah ekstrapolasi
  if (enpi.metode === 'regresi' || enpi.metode === 'rasio') {
    variabel.forEach((v, i) => {
      const xs = latih.map((t) => t.x[i]!)
      const min = Math.min(...xs), maks = Math.max(...xs), lebar = maks - min
      const luar = laporan.filter((t) => t.x[i] !== null && (t.x[i]! > maks + 0.1 * lebar || t.x[i]! < min - 0.1 * lebar))
      hasil.ekstrapolasi = Math.max(hasil.ekstrapolasi, luar.length)
      if (luar.length) peringatan.push(`${luar.length} bulan pelaporan memiliki ${v.nama} di luar rentang baseline (${min.toLocaleString('id-ID')}–${maks.toLocaleString('id-ID')} ${v.satuan}). Harapan bulan tersebut adalah ekstrapolasi; penghematan belum dapat diklaim. Pertimbangkan baseline baru bila kondisi operasi berubah besar (ISO 50001 6.5).`)
    })
  }
  const kosongVar = laporan.filter((t) => t.aktual !== null && t.harapan === null).length
  if (kosongVar) peringatan.push(`${kosongVar} bulan pelaporan belum punya data variabel, sehingga belum bisa dinormalisasi.`)
  return hasil
}

/** Model memenuhi ambang ISO 50006 (hanya EnPI rasio/regresi). */
export const modelLayak = (m: Model | null) => !!m && m.r2 !== null && m.cvrmse !== null && m.r2 >= AMBANG.r2 && m.cvrmse <= AMBANG.cvrmse && m.n >= AMBANG.nMin

/**
 * EnPI utama untuk judul halaman Ringkasan & Kinerja, hanya dari lingkup KINRA (EnPI kawasan mencakup tenant):
 * yang ditandai "utama" di definisi EnPI;
 * bila tidak ada, EnPI ternormalisasi dengan model layak; terakhir EnPI aktif pertama yang punya data pelaporan.
 */
export function pilihEnpiUtama(hasil: HasilEnpi[]): HasilEnpi | undefined {
  const siap = hasil.filter((h) => h.enpi.aktif && (h.enpi.lingkup ?? 'kinra') === 'kinra' && !h.galat && h.model && h.laporan.some((t) => t.aktual !== null && t.harapan !== null))
  return siap.find((h) => h.enpi.utama)
    ?? siap.find((h) => h.enpi.metode !== 'absolut' && modelLayak(h.model))
    ?? siap.find((h) => h.enpi.metode !== 'absolut')
    ?? siap[0]
}

/** Bulan yang punya aktual & harapan. */
export const pasangan = (t: Titik[]) => t.filter((x): x is Titik & { aktual: number; harapan: number } => x.aktual !== null && x.harapan !== null)

export function ringkas(titik: Titik[]) {
  const p = pasangan(titik)
  const aktual = p.reduce((s, t) => s + t.aktual, 0)
  const harapan = p.reduce((s, t) => s + t.harapan, 0)
  return {
    bulan: p.length,
    aktual,
    harapan,
    hemat: harapan - aktual,
    /** Perbaikan kinerja (%) vs baseline ternormalisasi. Positif = lebih efisien. */
    perbaikan: harapan > 0 ? ((harapan - aktual) / harapan) * 100 : null,
  }
}

/** CUSUM Σ(aktual − harapan) sepanjang periode pelaporan. */
export function cusum(titik: Titik[]): (number | null)[] {
  let s = 0
  return titik.map((t) => (t.aktual === null || t.harapan === null ? null : (s += t.aktual - t.harapan)))
}

export const LABEL_METODE: Record<Enpi['metode'], string> = {
  absolut: 'Absolut (vs bulan sama baseline)',
  rasio: 'Rasio intensitas',
  regresi: 'Regresi linier',
}

/** Rumus model dalam teks, mis. "E = 1.200 + 35,2 × Tenant". */
export function rumus(h: HasilEnpi, fmt: (v: number) => string): string | null {
  const m = h.model
  if (!m || !m.koef.length) return null
  if (h.enpi.metode === 'rasio') return `E = ${fmt(m.koef[0])} ${h.satuan}/${h.variabel[0]?.satuan} × ${h.variabel[0]?.nama}`
  return `E = ${fmt(m.koef[0])}${h.variabel.map((v, i) => ` ${m.koef[i + 1] < 0 ? '−' : '+'} ${fmt(Math.abs(m.koef[i + 1]))} × ${v.nama}`).join('')}`
}
