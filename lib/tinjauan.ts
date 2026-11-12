/**
 * Tinjauan energi (ISO 50001 6.3): siapa memakai energi dalam lingkup KINRA, diurutkan Pareto,
 * dan kandidat SEU berdasarkan ambang porsi & kumulatif.
 */
import { konsumsiBacaan } from './enpi'
import type { Aset, EnergiBulanan, MeterEnergi, PembacaanMeter, Seu, SumberEnergi } from './types'

export type PenggunaEnergi = {
  /** 'aset:<kode>' atau 'sumber:<kode>' */
  id: string
  nama: string
  kwh: number
  /** 'meter' = rata-rata bacaan meter; 'inventaris' = data inventaris aset; 'data' = data energi bulanan */
  dasar: 'meter' | 'inventaris' | 'data'
  bulanData: number
  porsi: number
  kumulatif: number
  kandidat: boolean
  seu: Seu | null
}

const TJ_PER_KWH = 3.6e-6
// Meter Tank Farm (KINRA-MTR-009) mengukur seluruh kawasan, bukan hanya kantor (aset induk KINRA-AST-035)
const NAMA_PENGGUNA: Record<string, string> = { 'KINRA-AST-035': 'Tank Farm (kawasan)' }

/** Sumber energi di luar listrik kawasan yang langsung dipakai KINRA (mis. BBM kendaraan operasional). */
const SUMBER_KINRA = ['dexlite', 'dexlite_genset', 'bensin']

export function penggunaEnergi(opsi: {
  aset: Aset[]; meter: MeterEnergi[]; bacaan: PembacaanMeter[]
  sumber: SumberEnergi[]; energi: EnergiBulanan[]; seu: Seu[]
  ambangPersen: number; ambangKumulatif: number
}): { daftar: PenggunaEnergi[]; total: number; tanpaData: Aset[]; porsiMeter: number } {
  const { aset, meter, bacaan, sumber, energi, seu, ambangPersen, ambangKumulatif } = opsi
  const mentah: Omit<PenggunaEnergi, 'porsi' | 'kumulatif' | 'kandidat' | 'seu'>[] = []
  const tanpaData: Aset[] = []

  for (const a of aset) {
    // Rata-rata bulanan dari bulan yang semua meter aset ini terbaca
    const ms = meter.filter((m) => m.aset_kode === a.kode)
    const perBulan = new Map<number, { kwh: number; n: number }>()
    for (const b of bacaan) {
      const m = ms.find((x) => x.kode === b.meter_kode)
      const v = m && konsumsiBacaan(b, m)
      if (v === null || v === undefined) continue
      const k = b.tahun * 12 + b.bulan - 1
      const r = perBulan.get(k) ?? { kwh: 0, n: 0 }
      perBulan.set(k, { kwh: r.kwh + v, n: r.n + 1 })
    }
    // 12 bulan lengkap terakhir, sama dengan jendela BBM di bawah dan halaman Cerita Energi (bukan rata-rata seluruh riwayat)
    const lengkap = [...perBulan.entries()].filter(([, r]) => ms.length > 0 && r.n >= ms.length)
      .sort(([x], [y]) => x - y).slice(-12).map(([, r]) => r)
    if (lengkap.length) {
      mentah.push({ id: `aset:${a.kode}`, nama: NAMA_PENGGUNA[a.kode] ?? a.nama, kwh: lengkap.reduce((t, r) => t + r.kwh, 0) / lengkap.length, dasar: 'meter', bulanData: lengkap.length })
    } else if (a.kwh_bulan) {
      mentah.push({ id: `aset:${a.kode}`, nama: a.nama, kwh: a.kwh_bulan, dasar: 'inventaris', bulanData: 0 })
    } else {
      tanpaData.push(a)
    }
  }

  // BBM dan sumber non-listrik lain yang dipakai KINRA: rata-rata 12 bulan terakhir, dikonversi ke kWh setara
  for (const s of sumber.filter((x) => SUMBER_KINRA.includes(x.kode))) {
    const data = energi.filter((d) => d.sumber_kode === s.kode).sort((a, b) => a.tahun * 12 + a.bulan - (b.tahun * 12 + b.bulan)).slice(-12)
    if (!data.length) continue
    const rata = data.reduce((t, d) => t + d.nilai, 0) / data.length
    mentah.push({ id: `sumber:${s.kode}`, nama: s.nama, kwh: (rata * Number(s.faktor_tj)) / TJ_PER_KWH, dasar: 'data', bulanData: data.length })
  }

  mentah.sort((a, b) => b.kwh - a.kwh)
  const total = mentah.reduce((t, p) => t + p.kwh, 0)
  let kum = 0
  const daftar = mentah.map((p) => {
    const porsi = total ? (p.kwh / total) * 100 : 0
    const sebelum = kum
    kum += porsi
    // Kandidat bila porsinya melewati ambang, atau termasuk kelompok teratas yang membentuk ambang kumulatif
    const kandidat = porsi >= ambangPersen || sebelum < ambangKumulatif
    const [jenis, kode] = p.id.split(':')
    const s = seu.find((x) => (jenis === 'aset' ? x.aset_kode.includes(kode) : x.sumber_kode.includes(kode))) ?? null
    return { ...p, porsi, kumulatif: kum, kandidat, seu: s }
  })
  const terukurMeter = daftar.filter((p) => p.dasar === 'meter').reduce((t, p) => t + p.kwh, 0)
  return { daftar, total, tanpaData, porsiMeter: total ? (terukurMeter / total) * 100 : 0 }
}
