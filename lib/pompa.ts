/**
 * Model ilustrasi pompa distribusi WTP I untuk halaman Simulasi Pompa & VSD.
 *
 * Kurva sistem: H = hs + (1 − hs)·q²  (hs = porsi head statis, q = debit relatif).
 * VSD   : putaran n = √H (titik kerja mengikuti kurva sistem), daya ∝ q·H (hukum afinitas, efisiensi tetap).
 * Katup : putaran tetap 50 Hz, daya ≈ 0,4 + 0,6·q (pendekatan umum kurva daya pompa sentrifugal).
 * Ini ilustrasi untuk sosialisasi, bukan kurva pabrikan pompa WTP I.
 */

export const POMPA_WTP1 = {
  /** Daya motor pompa distribusi per unit (konfirmasi Bagian M/E, 7 Nov 2026). */
  dayaKw: 75,
  /** Debit nominal per pompa: kapasitas WTP I 500 m³/jam dibagi 2 pompa beroperasi. */
  debitM3Jam: 250,
  rpm: 1485,
  vsdTerpasang: 3,
  vsdBeroperasi: 2,
  /** Tanggal pasang VSD (konfirmasi Bagian M/E, 7 Nov 2026). */
  vsdDipasang: ['10 Okt 2022', '29 Jan 2024', 'Agu 2025'],
  kapasitasWtp: 500,
}

export type ModePompa = 'vsd' | 'katup'

export const dayaVsd = (q: number, hs: number) => POMPA_WTP1.dayaKw * q * (hs + (1 - hs) * q * q)
export const dayaKatup = (q: number) => POMPA_WTP1.dayaKw * (0.4 + 0.6 * q)
export const putaranVsd = (q: number, hs: number) => Math.sqrt(hs + (1 - hs) * q * q)

/** Kondisi pompa untuk satu mode: putaran relatif, daya (kW), bukaan katup ilustratif, frekuensi, rpm. */
export function kondisiPompa(mode: ModePompa, q: number, hs: number) {
  const n = mode === 'vsd' ? putaranVsd(q, hs) : 1
  const kw = mode === 'vsd' ? dayaVsd(q, hs) : dayaKatup(q)
  const katup = mode === 'vsd' ? 1 : Math.max(0.15, Math.pow(q, 1.6))
  return { n, kw, katup, hz: 50 * n, rpm: POMPA_WTP1.rpm * n }
}
