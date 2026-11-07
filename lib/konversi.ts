/**
 * Konversi energi ke rupiah dan emisi CO₂ untuk komunikasi ke manajemen.
 * Nilai diambil dari tabel parameter_energi (migrasi 0030); BAWAAN dipakai bila tabel belum ada.
 */
import { angka } from './format'

export type ParameterEnergi = {
  kode: string; nama: string; nilai: number; satuan: string; status: 'Data' | 'Asumsi'; sumber: string | null; urutan: number
}

export type Konversi = { tarifListrik: number; efListrik: number; hargaDexlite: number; efDexlite: number; hargaBensin: number; efBensin: number; asumsi: string[] }

export const BAWAAN: ParameterEnergi[] = [
  { kode: 'tarif_listrik', nama: 'Tarif listrik rata-rata', nilai: 1122.08, satuan: 'Rp/kWh', status: 'Data', sumber: 'Data inventaris aset Bagian M/E', urutan: 1 },
  { kode: 'ef_listrik', nama: 'Faktor emisi listrik grid', nilai: 0.85, satuan: 'kg CO₂/kWh', status: 'Asumsi', sumber: 'Perkiraan; verifikasi dengan KESDM', urutan: 2 },
  { kode: 'harga_dexlite', nama: 'Harga BBM Dexlite', nilai: 24200, satuan: 'Rp/liter', status: 'Data', sumber: 'Sheet Konsumsi Energi, Okt 2026 (migrasi 0037)', urutan: 3 },
  { kode: 'ef_dexlite', nama: 'Faktor emisi BBM solar/Dexlite', nilai: 2.68, satuan: 'kg CO₂/liter', status: 'Asumsi', sumber: 'Default IPCC', urutan: 4 },
  { kode: 'harga_bensin', nama: 'Harga BBM bensin', nilai: 16303, satuan: 'Rp/liter', status: 'Data', sumber: 'Sheet Konsumsi Energi, Okt 2026 (migrasi 0037)', urutan: 5 },
  { kode: 'ef_bensin', nama: 'Faktor emisi BBM bensin', nilai: 2.31, satuan: 'kg CO₂/liter', status: 'Asumsi', sumber: 'Default IPCC', urutan: 6 },
]

/** kWh setara per liter, sama dengan faktor_tj sumber_energi (Dexlite 36 MJ/L, bensin 33 MJ/L). */
export const KWH_PER_LITER: Record<string, number> = { dexlite: 10, bensin: 33 / 3.6 }

export function susunKonversi(param: ParameterEnergi[]): Konversi {
  const p = (k: string) => (param.find((x) => x.kode === k) ?? BAWAAN.find((x) => x.kode === k)!)
  return {
    tarifListrik: Number(p('tarif_listrik').nilai), efListrik: Number(p('ef_listrik').nilai),
    hargaDexlite: Number(p('harga_dexlite').nilai), efDexlite: Number(p('ef_dexlite').nilai),
    hargaBensin: Number(p('harga_bensin').nilai), efBensin: Number(p('ef_bensin').nilai),
    asumsi: ['tarif_listrik', 'ef_listrik', 'harga_dexlite', 'ef_dexlite', 'harga_bensin', 'ef_bensin'].filter((k) => p(k).status === 'Asumsi').map((k) => p(k).nama.toLowerCase()),
  }
}

/**
 * Rupiah dan kg CO₂ dari sejumlah energi pada satuan sumbernya (kWh atau liter).
 * Liter dihitung sebagai Dexlite kecuali `sumber` = 'bensin'.
 */
export function nilaiEnergi(k: Konversi, jumlah: number, satuan: string, sumber?: string) {
  if (!satuan.toLowerCase().startsWith('liter')) return { rupiah: jumlah * k.tarifListrik, kgCo2: jumlah * k.efListrik }
  const bensin = sumber === 'bensin'
  return { rupiah: jumlah * (bensin ? k.hargaBensin : k.hargaDexlite), kgCo2: jumlah * (bensin ? k.efBensin : k.efDexlite) }
}

/** Nilai satu pengguna energi Pareto (id 'sumber:<kode>' untuk BBM, kWh setara dikembalikan ke liter). */
export function nilaiPengguna(k: Konversi, id: string, kwh: number) {
  const kode = id.startsWith('sumber:') ? id.slice(7) : null
  return kode && KWH_PER_LITER[kode] ? nilaiEnergi(k, kwh / KWH_PER_LITER[kode], 'liter', kode) : nilaiEnergi(k, kwh, 'kWh')
}

/** Rp ringkas: Rp 1,2 M · Rp 235 jt · Rp 14.012 rb */
export function rupiahRingkas(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '–'
  const a = Math.abs(v), t = v < 0 ? '−' : ''
  if (a >= 1e12) return `${t}Rp${angka(a / 1e12, 2)} T`
  if (a >= 1e9) return `${t}Rp${angka(a / 1e9, 2)} M`
  if (a >= 1e6) return `${t}Rp${angka(a / 1e6, 1)} jt`
  if (a >= 1e3) return `${t}Rp${angka(a / 1e3, 0)} rb`
  return `${t}Rp${angka(a, 0)}`
}

/** Ton CO₂ ringkas dari kg. */
export const tonCo2 = (kg: number | null | undefined) => (kg === null || kg === undefined ? '–' : `${angka(kg / 1000, kg >= 100_000 ? 0 : 1)} t CO₂`)
