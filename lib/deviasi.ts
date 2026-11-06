/**
 * Deteksi deviasi signifikan kinerja energi (ISO 50001 9.1.1) dari hasil EnPI lingkup KINRA.
 *
 * Bulanan : |aktual − harapan| > maks(2 × RMSE model, 10% harapan). EnPI absolut (tanpa RMSE): > 10%.
 * Tren    : selisih aktual − harapan ke arah boros 3 bulan berturut-turut (kenaikan CUSUM), dicatat di bulan ke-3.
 * Data    : bulan pelaporan tanpa data di antara bulan-bulan yang ada datanya.
 * Deviasi ke arah hemat juga dicatat: penghematan yang tidak dapat dijelaskan bisa berarti meter atau data salah.
 */
import type { HasilEnpi } from './enpi'
import type { Deviasi } from './types'

export type JenisDeviasi = 'bulanan' | 'tren' | 'data'
export type ArahDeviasi = 'boros' | 'hemat' | 'data'

export type DeviasiTerdeteksi = {
  kunci: string
  enpi_kode: string
  enpi_nama: string
  satuan: string
  tahun: number
  bulan: number
  label: string
  jenis: JenisDeviasi
  arah: ArahDeviasi
  aktual: number | null
  harapan: number | null
  selisih_persen: number | null
  ambang: string
}

export const AMBANG_DEVIASI = { persen: 10, kaliRmse: 2, trenBulan: 3 }
export const BATAS_HARI_TANGGAPAN = 14

export const LABEL_JENIS: Record<JenisDeviasi, string> = { bulanan: 'Bulanan', tren: 'Tren CUSUM', data: 'Data hilang' }
export const LABEL_KATEGORI: Record<NonNullable<Deviasi['kategori']>, string> = {
  operasi: 'Perubahan operasi', kerusakan: 'Kerusakan / kebocoran', data: 'Kesalahan data / meter',
  variabel: 'Variabel tidak tercatat', aksi: 'Aksi penghematan', lainnya: 'Lainnya',
}

export const kunciDeviasi = (enpi: string, tahun: number, bulan: number, jenis: string) => `${enpi}|${tahun}|${bulan}|${jenis}`

export function deteksiDeviasi(hasil: HasilEnpi[]): DeviasiTerdeteksi[] {
  const keluar: DeviasiTerdeteksi[] = []
  for (const h of hasil) {
    if (!h.enpi.aktif || (h.enpi.lingkup ?? 'kinra') !== 'kinra' || h.galat || !h.model) continue
    const dasar = { enpi_kode: h.enpi.kode, enpi_nama: h.enpi.nama, satuan: h.satuan }
    const latih = h.baseline.filter((t) => t.aktual !== null)
    const rata = latih.length ? latih.reduce((s, t) => s + t.aktual!, 0) / latih.length : 0
    const rmse = h.model.cvrmse !== null ? (h.model.cvrmse / 100) * rata : null

    // Bulanan
    for (const t of h.laporan) {
      if (t.aktual === null || t.harapan === null || t.harapan === 0) continue
      const selisih = t.aktual - t.harapan
      const batas = Math.max(rmse !== null ? AMBANG_DEVIASI.kaliRmse * rmse : 0, (AMBANG_DEVIASI.persen / 100) * Math.abs(t.harapan))
      if (Math.abs(selisih) <= batas) continue
      keluar.push({
        ...dasar, kunci: kunciDeviasi(h.enpi.kode, t.tahun, t.bulan, 'bulanan'), tahun: t.tahun, bulan: t.bulan, label: t.label,
        jenis: 'bulanan', arah: selisih > 0 ? 'boros' : 'hemat', aktual: t.aktual, harapan: t.harapan,
        selisih_persen: (selisih / t.harapan) * 100,
        ambang: rmse !== null ? `> maks(2 × RMSE, 10%)` : '> 10% dari baseline bulan yang sama',
      })
    }

    // Tren: 3 bulan berturut-turut boros (dicatat sekali per rangkaian, di bulan ke-3)
    let beruntun = 0
    for (const t of h.laporan) {
      const boros = t.aktual !== null && t.harapan !== null && t.aktual > t.harapan
      beruntun = boros ? beruntun + 1 : 0
      if (beruntun === AMBANG_DEVIASI.trenBulan) {
        keluar.push({
          ...dasar, kunci: kunciDeviasi(h.enpi.kode, t.tahun, t.bulan, 'tren'), tahun: t.tahun, bulan: t.bulan, label: t.label,
          jenis: 'tren', arah: 'boros', aktual: t.aktual, harapan: t.harapan,
          selisih_persen: t.harapan ? ((t.aktual! - t.harapan) / t.harapan) * 100 : null,
          ambang: `${AMBANG_DEVIASI.trenBulan} bulan berturut-turut di atas harapan`,
        })
      }
    }

    // Data hilang di tengah periode pelaporan
    const adaData = h.laporan.map((t) => t.aktual !== null)
    const terakhir = adaData.lastIndexOf(true)
    const pertama = adaData.indexOf(true)
    h.laporan.forEach((t, i) => {
      if (i > pertama && i < terakhir && t.aktual === null) {
        keluar.push({
          ...dasar, kunci: kunciDeviasi(h.enpi.kode, t.tahun, t.bulan, 'data'), tahun: t.tahun, bulan: t.bulan, label: t.label,
          jenis: 'data', arah: 'data', aktual: null, harapan: t.harapan, selisih_persen: null,
          ambang: 'Bulan tanpa data lengkap di antara bulan yang ada datanya',
        })
      }
    })
  }
  return keluar.sort((a, b) => b.tahun * 12 + b.bulan - (a.tahun * 12 + a.bulan))
}

/** Gabungkan deteksi dengan baris register: setiap deteksi dipasangkan dengan catatan penyelidikannya bila ada. */
export function gabungDeviasi(terdeteksi: DeviasiTerdeteksi[], register: Deviasi[]) {
  const peta = new Map(register.map((r) => [kunciDeviasi(r.enpi_kode, r.tahun, r.bulan, r.jenis), r]))
  const baris = terdeteksi.map((d) => ({ d, r: peta.get(d.kunci) ?? null }))
  // Catatan register yang tidak lagi terdeteksi (mis. data sudah dikoreksi) tetap ditampilkan
  const sisa = register.filter((r) => !terdeteksi.some((d) => d.kunci === kunciDeviasi(r.enpi_kode, r.tahun, r.bulan, r.jenis)))
  return { baris, sisa }
}

/** Deviasi dianggap terbuka bila belum ditutup atau dinyatakan bukan deviasi. */
export const terbuka = (r: Deviasi | null) => !r || (r.status !== 'Ditutup' && r.status !== 'Bukan deviasi')

/** Umur deviasi tanpa tanggapan, dihitung sejak akhir bulan kejadian. */
export function hariSejak(tahun: number, bulan: number, kini: string) {
  const akhir = Date.UTC(tahun, bulan, 0)
  return Math.floor((Date.parse(`${kini}T00:00:00Z`) - akhir) / 86_400_000)
}

