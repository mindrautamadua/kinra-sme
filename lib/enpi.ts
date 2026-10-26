/**
 * Perhitungan EnPI & EnB (ISO 50001 6.4–6.5, ISO 50006).
 *
 * Konsumsi "harapan" = konsumsi yang semestinya terjadi pada kondisi bulan itu bila kinerja masih sama
 * dengan periode baseline. Penghematan = harapan − aktual; CUSUM = Σ(aktual − harapan), turun berarti hemat.
 */
import { BULAN } from './format'
import type { EnergiBulanan, Enpi, SumberEnergi, VariabelBulanan, VariabelRelevan } from './types'

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

export function hitungEnpi(enpi: Enpi, sumber: SumberEnergi[], energi: EnergiBulanan[], variabelDef: VariabelRelevan[], variabelData: VariabelBulanan[]): HasilEnpi {
  const lingkup = sumber.filter((s) => enpi.sumber_kode.includes(s.kode))
  const satuanSama = lingkup.length > 0 && lingkup.every((s) => s.satuan === lingkup[0].satuan)
  const satuan = satuanSama ? lingkup[0].satuan : 'TJ'
  const faktor = Object.fromEntries(lingkup.map((s) => [s.kode, satuanSama ? 1 : Number(s.faktor_tj)]))
  const variabel = enpi.variabel_kode.map((k) => variabelDef.find((v) => v.kode === k)).filter((v): v is VariabelRelevan => !!v)
  const peringatan: string[] = []
  if (lingkup.length < enpi.sumber_kode.length) peringatan.push('Sebagian sumber energi pada ruang lingkup tidak ditemukan di tabel sumber_energi.')

  // Energi per bulan: hanya bulan dengan data lengkap untuk semua sumber dalam lingkup
  const perBulan = new Map<number, Map<string, number>>()
  for (const d of energi) {
    if (!(d.sumber_kode in faktor)) continue
    const k = kunci(d.tahun, d.bulan)
    if (!perBulan.has(k)) perBulan.set(k, new Map())
    perBulan.get(k)!.set(d.sumber_kode, d.nilai)
  }
  const energiBulan = (k: number) => {
    const m = perBulan.get(k)
    if (!m || lingkup.some((s) => !m.has(s.kode))) return null
    return lingkup.reduce((t, s) => t + m.get(s.kode)! * faktor[s.kode], 0)
  }
  const nilaiVar = new Map(variabelData.map((d) => [`${kunci(d.tahun, d.bulan)}|${d.variabel_kode}`, d.nilai]))
  const xBulan = (k: number) => enpi.variabel_kode.map((v) => nilaiVar.get(`${k}|${v}`) ?? null)

  const kMulai = kunciTanggal(enpi.baseline_mulai)
  const kSelesai = kunciTanggal(enpi.baseline_selesai)
  const semua = [...perBulan.keys()]
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
  const hasil: HasilEnpi = { enpi, satuan, variabel, baseline, laporan, model: null, galat: null, peringatan }

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
  const kosongVar = laporan.filter((t) => t.aktual !== null && t.harapan === null).length
  if (kosongVar) peringatan.push(`${kosongVar} bulan pelaporan belum punya data variabel, sehingga belum bisa dinormalisasi.`)
  return hasil
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
