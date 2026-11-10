/**
 * Proyeksi capaian sasaran energi sampai akhir tahun target (ISO 50001 6.2 dan 9.1: memantau kemajuan menuju target).
 *
 * Perbaikan tahunan = Σ(harapan − aktual) / Σ harapan selama 12 bulan tahun target, sama dengan capaian di halaman Sasaran.
 * Bulan yang belum ada datanya diisi perkiraan:
 *   harapan sisa : harapan bulan kalender yang sama tahun sebelumnya (menangkap pola musiman); bila tidak ada,
 *                  rata-rata harapan bulan-bulan tahun target yang sudah ada.
 *   proyeksi     : bulan sisa memakai laju perbaikan 3 bulan terakhir (Σ hemat / Σ harapan).
 *   rentang      : bulan sisa memakai persentil 25 dan 75 perbaikan bulanan 12 bulan terakhir (diperlebar agar
 *                  memuat proyeksi tengah).
 *   dibutuhkan   : perbaikan rata-rata di bulan sisa agar target setahun tepat tercapai.
 * Proyeksi ini perkiraan sederhana, bukan model prakiraan: anggap sebagai peringatan dini, bukan janji capaian.
 */
import type { HasilEnpi, Titik } from './enpi'
import { BULAN } from './format'
import type { Sasaran } from './types'

export type StatusProyeksi = 'tercapai' | 'tidak_tercapai' | 'di_jalur' | 'berisiko' | 'sulit' | 'belum_mulai' | 'kurang_data'

export const LABEL_PROYEKSI: Record<StatusProyeksi, string> = {
  tercapai: 'Tercapai', tidak_tercapai: 'Tidak tercapai', di_jalur: 'Di jalur', berisiko: 'Berisiko',
  sulit: 'Sulit tercapai', belum_mulai: 'Belum mulai', kurang_data: 'Data belum cukup',
}
export const CHIP_PROYEKSI: Record<StatusProyeksi, 'good' | 'warn' | 'crit' | 'info' | 'na'> = {
  tercapai: 'good', tidak_tercapai: 'crit', di_jalur: 'good', berisiko: 'warn', sulit: 'crit', belum_mulai: 'na', kurang_data: 'na',
}

export type ProyeksiSasaran = {
  status: StatusProyeksi
  tahun: number
  target: number
  satuan: string
  bulanData: number
  /** Bulan tahun target tanpa data yang sudah lewat (terhitung ke bulan sisa) */
  bulanTerlewat: number
  bulanSisa: number
  perbaikanYtd: number | null
  /** Perbaikan setahun bila bulan sisa mengikuti laju 3 bulan terakhir */
  proyeksi: number | null
  rentang: [number, number] | null
  laju3: number | null
  /** Perbaikan rata-rata yang dibutuhkan di bulan sisa (%) */
  dibutuhkan: number | null
  /** Energi yang masih harus dihemat sampai akhir tahun agar target tercapai (satuan EnPI) */
  hematKurang: number | null
  /** Bulan terbaik 12 bulan terakhir (%), pembanding kewajaran angka dibutuhkan */
  terbaik: number | null
  ekstrapolasi: boolean
  kalimat: string
  grafik: { kategori: string[]; aktual: (number | null)[]; proyeksi: (number | null)[]; target: number[] }
}

const perbaikan = (hemat: number, harapan: number) => (harapan > 0 ? (hemat / harapan) * 100 : null)
const ada = (t: Titik): t is Titik & { aktual: number; harapan: number } => t.aktual !== null && t.harapan !== null && t.harapan > 0

function persentil(xs: number[], p: number) {
  const s = [...xs].sort((a, b) => a - b)
  const i = (s.length - 1) * p
  const lo = Math.floor(i), hi = Math.ceil(i)
  return s[lo] + (s[hi] - s[lo]) * (i - lo)
}

const f1 = (v: number) => `${v < 0 ? '−' : ''}${Math.abs(v).toLocaleString('id-ID', { maximumFractionDigits: 1 })}%`

export function proyeksiSasaran(s: Sasaran, h: HasilEnpi, kini: string): ProyeksiSasaran | null {
  if (!s.tahun_target || s.target_persen === null || h.galat || !h.model) return null
  const T = s.tahun_target
  const target = Number(s.target_persen)
  const thKini = Number(kini.slice(0, 4)), blKini = Number(kini.slice(5, 7))
  const semua = [...h.baseline, ...h.laporan]
  const cari = (tahun: number, bulan: number) => semua.find((t) => t.tahun === tahun && t.bulan === bulan)
  // Hanya bulan pelaporan yang dihitung sebagai capaian (sama dengan halaman Sasaran)
  const dataT = h.laporan.filter((t) => t.tahun === T && ada(t)) as (Titik & { aktual: number; harapan: number })[]
  const riwayat = h.laporan.filter(ada).slice(-12) as (Titik & { aktual: number; harapan: number })[]
  const bulanan = riwayat.map((t) => ((t.harapan - t.aktual) / t.harapan) * 100)
  const tiga = riwayat.slice(-3)
  const laju3 = tiga.length ? perbaikan(tiga.reduce((x, t) => x + t.harapan - t.aktual, 0), tiga.reduce((x, t) => x + t.harapan, 0)) : null
  const terbaik = bulanan.length ? Math.max(...bulanan) : null
  const rataHarapanT = dataT.length ? dataT.reduce((x, t) => x + t.harapan, 0) / dataT.length : null

  const kategori = BULAN.map((b) => `${b} ${String(T).slice(2)}`)
  const sudah = new Set(dataT.map((t) => t.bulan))
  const sisa = Array.from({ length: 12 }, (_, i) => i + 1).filter((b) => !sudah.has(b))
  const harapanSisa = (b: number) => {
    const lalu = cari(T - 1, b)
    return lalu?.harapan != null && lalu.harapan > 0 ? lalu.harapan : rataHarapanT
  }
  const Hytd = dataT.reduce((x, t) => x + t.harapan, 0)
  const Aytd = dataT.reduce((x, t) => x + t.aktual, 0)
  const perbaikanYtd = perbaikan(Hytd - Aytd, Hytd)
  const Hsisa = sisa.reduce<number | null>((x, b) => (x === null || harapanSisa(b) === null ? null : x + harapanSisa(b)!), 0)
  const bulanTerlewat = sisa.filter((b) => T < thKini || (T === thKini && b < blKini)).length

  const proyeksiDengan = (laju: number | null) =>
    laju === null || Hsisa === null ? null : perbaikan(Hytd - Aytd + Hsisa * (laju / 100), Hytd + Hsisa)

  // Garis perbaikan kumulatif per bulan: aktual sampai bulan data terakhir, lalu proyeksi
  const aktualSeri: (number | null)[] = Array(12).fill(null)
  const proyeksiSeri: (number | null)[] = Array(12).fill(null)
  let kh = 0, ks = 0
  const bulanAkhirData = dataT.length ? Math.max(...dataT.map((t) => t.bulan)) : 0
  for (let b = 1; b <= 12; b++) {
    const t = dataT.find((x) => x.bulan === b)
    if (t) { kh += t.harapan; ks += t.harapan - t.aktual }
    else if (b > bulanAkhirData && laju3 !== null && harapanSisa(b) !== null) { kh += harapanSisa(b)!; ks += harapanSisa(b)! * (laju3 / 100) }
    if (t && b <= bulanAkhirData) aktualSeri[b - 1] = perbaikan(ks, kh)
    if (b >= bulanAkhirData && bulanAkhirData > 0 && laju3 !== null) proyeksiSeri[b - 1] = perbaikan(ks, kh)
  }

  const dasar = {
    tahun: T, target, satuan: h.satuan, bulanData: dataT.length, bulanTerlewat, bulanSisa: sisa.length, perbaikanYtd, laju3, terbaik,
    ekstrapolasi: h.ekstrapolasi > 0,
    grafik: { kategori, aktual: aktualSeri, proyeksi: proyeksiSeri, target: Array(12).fill(target) },
  }

  // Tahun target sudah lewat: hasil akhir dari data yang ada
  if (T < thKini && dataT.length) {
    const capai = perbaikanYtd !== null && perbaikanYtd >= target
    return {
      ...dasar, status: capai ? 'tercapai' : 'tidak_tercapai', proyeksi: perbaikanYtd, rentang: null, dibutuhkan: null, hematKurang: null,
      kalimat: `Tahun ${T} selesai dengan perbaikan ${f1(perbaikanYtd ?? 0)} dari target ${f1(target)}${dataT.length < 12 ? ` (hanya ${dataT.length} bulan berdata)` : ''}.`,
    }
  }

  // Tahun target belum berjalan atau belum ada data tahun target: pakai laju 12 bulan terakhir sebagai indikasi
  if (!dataT.length) {
    const laju12 = riwayat.length ? perbaikan(riwayat.reduce((x, t) => x + t.harapan - t.aktual, 0), riwayat.reduce((x, t) => x + t.harapan, 0)) : null
    return {
      ...dasar, status: T > thKini ? 'belum_mulai' : 'kurang_data', proyeksi: null, rentang: null, dibutuhkan: T < thKini ? null : target, hematKurang: null,
      kalimat: laju12 === null
        ? `Belum ada data pelaporan ${h.enpi.kode} untuk diproyeksikan.`
        : `Belum ada data ${T}. Perbaikan ${riwayat.length} bulan terakhir ${f1(laju12)}${laju3 !== null && riwayat.length > 3 ? `, 3 bulan terakhir ${f1(laju3)}` : ''}. ${(laju3 ?? laju12) >= target
          ? `Bila laju terakhir bertahan, target ${f1(target)} tercapai.`
          : `Dengan laju terakhir, masih kurang sekitar ${f1(target - (laju3 ?? laju12))} dari target ${f1(target)}.`}`,
    }
  }

  const Htotal = Hsisa === null ? null : Hytd + Hsisa
  const proyeksi = sisa.length ? proyeksiDengan(laju3) : perbaikanYtd
  const r25 = sisa.length && bulanan.length >= 4 ? proyeksiDengan(persentil(bulanan, 0.25)) : null
  const r75 = sisa.length && bulanan.length >= 4 ? proyeksiDengan(persentil(bulanan, 0.75)) : null
  // Rentang selalu memuat proyeksi tengah (laju 3 bulan terakhir bisa di luar persentil 12 bulan)
  const rentang: [number, number] | null = r25 !== null && r75 !== null && proyeksi !== null
    ? [Math.min(r25, r75, proyeksi), Math.max(r25, r75, proyeksi)] : null
  const hematKurang = Htotal === null ? null : Math.max(0, (target / 100) * Htotal - (Hytd - Aytd))
  const dibutuhkan = !sisa.length || Hsisa === null || Hsisa <= 0 ? null : (((target / 100) * Htotal! - (Hytd - Aytd)) / Hsisa) * 100

  let status: StatusProyeksi
  if (dataT.length < 2) status = 'kurang_data'
  else if (!sisa.length) status = perbaikanYtd !== null && perbaikanYtd >= target ? 'tercapai' : 'tidak_tercapai'
  else if (proyeksi !== null && proyeksi >= target) status = 'di_jalur'
  else if (dibutuhkan !== null && bulanan.length && dibutuhkan <= persentil(bulanan, 0.75)) status = 'berisiko'
  else status = 'sulit'

  const bagian: string[] = [`Perbaikan ${T} sejauh ini ${f1(perbaikanYtd ?? 0)} dari ${dataT.length} bulan.`]
  if (proyeksi !== null && sisa.length) bagian.push(`Bila laju 3 bulan terakhir (${f1(laju3!)}) bertahan, akhir tahun ${f1(proyeksi)}${rentang ? ` (rentang ${f1(rentang[0])} s.d. ${f1(rentang[1])})` : ''} terhadap target ${f1(target)}.`)
  if (dibutuhkan !== null && status !== 'di_jalur') bagian.push(dibutuhkan > 100
    ? 'Target tidak dapat dicapai lagi dalam sisa tahun ini.'
    : `Agar tercapai, ${sisa.length} bulan sisa perlu rata-rata ${f1(dibutuhkan)} per bulan${terbaik !== null ? `; bulan terbaik 12 bulan terakhir ${f1(terbaik)}` : ''}.`)
  if (bulanTerlewat) bagian.push(`${bulanTerlewat} bulan yang sudah lewat belum punya data dan dihitung sebagai bulan sisa.`)
  if (h.ekstrapolasi) bagian.push('Sebagian harapan adalah ekstrapolasi di luar rentang baseline; perlakukan proyeksi dengan hati-hati.')

  return { ...dasar, status, proyeksi, rentang, dibutuhkan, hematKurang, kalimat: bagian.join(' ') }
}

