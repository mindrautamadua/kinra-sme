/**
 * Laboratorium EnPI: eksperimen di atas data nyata WTP 1 memakai mesin perhitungan yang sama dengan halaman Kinerja
 * (hitungEnpi, deteksiDeviasi). Tidak menulis apa pun ke database.
 */
import { deteksiDeviasi } from './deviasi'
import { hitungEnpi } from './enpi'
import type { Enpi, MeterEnergi, MetodeEnpi, PembacaanMeter, VariabelBulanan, VariabelRelevan } from './types'

export const METER_WTP = 'KINRA-MTR-005'
/** Meter WTP 1 (proses + distribusi) dan meter intake terpisah (konfirmasi M/E 10 Nov 2026, migrasi 0043). */
export const METER_WTP_SEMUA = ['KINRA-MTR-005', 'KINRA-MTR-008']

export type PresetBaseline = { kode: string; label: string; mulai: string; selesai: string; ket: string }
export const PRESET_BASELINE: PresetBaseline[] = [
  { kode: '2025', label: 'Jan–Des 2025', mulai: '2025-01-01', selesai: '2025-12-01', ket: 'Baseline ENPI-05; Nov–Des tanpa data air WTP 1, efektif 10 bulan' },
  { kode: '2024', label: 'Jan–Des 2024', mulai: '2024-01-01', selesai: '2024-12-01', ket: 'Tahun penuh pertama dengan data meter' },
  { kode: '2024-2025', label: 'Jan 2024 – Des 2025', mulai: '2024-01-01', selesai: '2025-12-01', ket: 'Dua tahun digabung: lebih banyak titik, tetapi kondisi 2024 dan 2025 berbeda' },
]

export type JenisGangguan = 'tidak' | 'bocor' | 'rusak' | 'bypass'
export const LABEL_GANGGUAN: Record<JenisGangguan, string> = {
  tidak: 'Data asli',
  bocor: 'Kebocoran pipa',
  rusak: 'Pompa rusak satu bulan',
  bypass: 'VSD di-bypass',
}
export const KET_GANGGUAN: Record<JenisGangguan, string> = {
  tidak: 'Data kWh WTP 1 apa adanya.',
  bocor: 'Air yang bocor tetap dipompa dan diolah, sehingga kWh naik bertahap mulai bulan yang dipilih dan terus berlanjut.',
  rusak: 'Bantalan atau impeller rusak membuat pompa boros hanya pada satu bulan, lalu diperbaiki.',
  bypass: 'VSD dimatikan atau di-bypass (mis. saat gangguan), sehingga pompa kembali berputar penuh 50 Hz mulai bulan yang dipilih.',
}

export function enpiLab(o: { metode: MetodeEnpi; variabel: string; baseline: PresetBaseline }): Enpi {
  return {
    kode: 'LAB-WTP', nama: 'Intensitas energi WTP 1 (eksperimen)', sumber_kode: ['pln'], metode: o.metode,
    variabel_kode: o.metode === 'absolut' ? [] : [o.variabel], baseline_mulai: o.baseline.mulai, baseline_selesai: o.baseline.selesai,
    alasan_baseline: null, catatan: null, aktif: true, utama: false, lingkup: 'kinra', meter_kode: METER_WTP_SEMUA, urutan: 0,
  }
}

const k = (t: number, b: number) => t * 12 + b - 1

/** Bacaan meter WTP dengan gangguan buatan: faktor pengali kWh mulai bulan tertentu. */
export function sisipkanGangguan(bacaan: PembacaanMeter[], meter: MeterEnergi[], jenis: JenisGangguan, mulai: { tahun: number; bulan: number }, besar: number) {
  if (jenis === 'tidak') return bacaan
  const m = meter.find((x) => x.kode === METER_WTP)
  const awal = k(mulai.tahun, mulai.bulan)
  return bacaan.map((b) => {
    if (b.meter_kode !== METER_WTP || !m) return b
    const i = k(b.tahun, b.bulan) - awal
    if (i < 0 || (jenis === 'rusak' && i > 0)) return b
    // Kebocoran tumbuh bertahap sampai penuh dalam 3 bulan; bypass dan rusak langsung penuh
    const f = 1 + besar * (jenis === 'bocor' ? Math.min(1, (i + 1) / 3) : 1)
    const kwh = b.stand_awal !== null && b.stand_akhir !== null ? (b.stand_akhir - b.stand_awal) * m.faktor_kali : b.kwh_tagihan
    return kwh === null ? b : { ...b, stand_awal: null, stand_akhir: null, kwh_tagihan: kwh * f }
  })
}

export function jalankan(enpi: Enpi, data: { meter: MeterEnergi[]; bacaan: PembacaanMeter[]; variabel: VariabelRelevan[]; dataVariabel: VariabelBulanan[] }) {
  const hasil = hitungEnpi(enpi, [], [], data.variabel, data.dataVariabel, { meter: data.meter, bacaan: data.bacaan })
  return { hasil, deviasi: deteksiDeviasi([hasil]) }
}
