/**
 * Alur proses WTP KEK Sei Mangkei (SEU-01): tahap proses dari gambar alir "Flow Process Pengolahan Air Bersih
 * WTP KEK Sei Mangkei" (dipaparkan tim KINRA, 12 Nov 2026), dipetakan ke register pompa IPAB I (migrasi 0044),
 * jam operasi pompa, meter kWh, dan variabel air.
 *
 * Estimasi kWh per tahap = daya pengenal × jam operasi. Ini batas atas (pompa jarang bekerja di daya pengenal,
 * pompa VSD lebih rendah lagi), jadi dipakai untuk porsi antartahap, bukan pengganti meter.
 */
import { konsumsiBacaan } from './enpi'
import type { JamOperasiPompa, MeterEnergi, PembacaanMeter, Pompa, VariabelBulanan } from './types'

export const METER_WTP = 'KINRA-MTR-005'
export const METER_INTAKE = 'KINRA-MTR-008'

export type StatusMeter = 'pasti' | 'belum-jelas' | 'tidak-ada'

export type TahapWtp = {
  no: number
  id: string
  nama: string
  ringkas: string
  /** Nilai lokasi di register pompa yang termasuk tahap ini. */
  lokasiPompa: string[]
  beban: string
  meter: { label: string; status: StatusMeter }
  dataAir: string
  /** Sifat beban terhadap EnPI-05. */
  sifat: 'volume' | 'tetap' | 'siaga' | 'pasif'
}

export const TAHAP_WTP: TahapWtp[] = [
  { no: 1, id: 'intake', nama: 'Intake air baku', ringkas: 'Dua sumber paralel ke settling pit: 2 pompa di Sungai Bah Tongguran langsung ke pit (water meter FM1b), dan 2 pompa dari kolam Water Intake (water meter FM1a). Register mencatat 4 pompa submersible di lokasi ini.',
    lokasiPompa: ['Water Intake'], beban: 'Ikut volume air baku dan muka air sungai', meter: { label: 'MTR-008 (cakupan belum pasti)', status: 'belum-jelas' },
    dataAir: 'Air Baku I (air_baku1); FM1a + FM1b kandidat sumbernya', sifat: 'volume' },
  { no: 2, id: 'settling', nama: 'Water Settling Pit', ringkas: 'Bak pengendap 1.650 m³, 5 kompartemen, titik injeksi kimia. Menerima air backwash dari lamella dan filter melalui pipa back wash. Di bawahnya 2 pompa pengisian mobil damkar.',
    lokasiPompa: [], beban: 'Tanpa beban proses; pompa damkar sesekali', meter: { label: 'Belum jelas', status: 'belum-jelas' }, dataAir: '–', sifat: 'pasif' },
  { no: 3, id: 'lamella', nama: 'Lamella (Water Settler Tube)', ringkas: 'Pompa raw water dari settling pit ke modul tube settler, dengan dosing tawas dan soda ash.',
    lokasiPompa: ['Lamella-01', 'Lamella-02'], beban: 'Pompa ikut volume; dosing kecil dan tetap', meter: { label: 'MTR-005', status: 'pasti' }, dataAir: '–', sifat: 'volume' },
  { no: 4, id: 'clarifier', nama: 'Clarifier', ringkas: 'Clarifier 150 m³ dengan pembuangan lumpur.',
    lokasiPompa: ['Clarifier'], beban: 'Ikut volume', meter: { label: 'MTR-005', status: 'pasti' }, dataAir: '–', sifat: 'volume' },
  { no: 5, id: 'filter', nama: 'Filter tekan', ringkas: '12 unit dalam 2 bank × 6 di bawah lamella, backwash berkala (air backwash kembali ke settling pit), water meter FM2 lalu injeksi kimia sebelum reservoir.',
    lokasiPompa: [], beban: 'Backwash sesekali tetapi besar', meter: { label: 'MTR-005', status: 'pasti' }, dataAir: 'FM2 air terfilter', sifat: 'tetap' },
  { no: 6, id: 'reservoir', nama: 'Reservoir', ringkas: 'Reservoir air bersih 500 m³ sebelum pompa distribusi. Dua pompa di sisi reservoir mengirim air ke jalur Water Basin.',
    lokasiPompa: [], beban: 'Tanpa beban listrik', meter: { label: '–', status: 'tidak-ada' }, dataAir: '–', sifat: 'pasif' },
  { no: 7, id: 'distribusi', nama: 'Distribusi kawasan', ringkas: 'Pompa distribusi di Ruang Distribusi 01 dan 02 (VSD), tangki tekan, water meter FM3 ke tenant.',
    lokasiPompa: ['Ruang Distribusi-01', 'Ruang Distribusi-02'], beban: 'Ikut volume dan tekanan jaringan', meter: { label: 'MTR-005', status: 'pasti' },
    dataAir: 'Distribusi WTP I (air_olahan), pembagi ENPI-05', sifat: 'volume' },
  { no: 8, id: 'hydrant', nama: 'Fire hydrant', ringkas: '3 pompa hydrant mengisap dari settling pit ke jaringan hydrant Industrial Estate.',
    lokasiPompa: [], beban: 'Siaga dan uji berkala; tidak ikut produksi air', meter: { label: 'Belum jelas', status: 'belum-jelas' }, dataAir: 'Tidak relevan untuk EnPI', sifat: 'siaga' },
  { no: 9, id: 'pks', nama: 'Jalur PKS', ringkas: 'Water Basin 300 m³, 2 pompa ke Sand Filter 1–2 (≈68 m³), Clean Water Tank Tower dan Processing Water Tank Tower ke PKS 30 ton TBS/jam (FM4), serta 2 tangki air bersih ke PKS 45 ton TBS/jam (FM5–FM7).',
    lokasiPompa: ['Ruang PKS30'], beban: 'Ikut kebutuhan air dua PKS', meter: { label: 'Belum jelas', status: 'belum-jelas' },
    dataAir: 'Volume ke PKS belum ada di aplikasi', sifat: 'volume' },
]

export const PERTANYAAN_ME = [
  'MTR-008 mengukur pompa di sungai, pompa di kolam Water Intake, atau keduanya?',
  'Angka Air Baku I di sheet berasal dari FM1a (kolam intake), FM1b (sungai), atau jumlah keduanya?',
  'Pompa jalur PKS (Ruang PKS30) di meter mana, dan volumenya masuk distribusi WTP I, IPAB II, atau tidak tercatat?',
  'WTP II / Air Baku II tidak tampak di gambar. Apakah gambar ini hanya WTP I?',
  'Pompa hydrant digerakkan listrik atau diesel, di meter mana, dan seberapa sering diuji?',
  'Water meter FM1a–FM7: mana yang terpasang dan dicatat bulanan?',
  'Volume menara tangki dan tangki air bersih PKS 45 belum terbaca jelas di gambar.',
]

export type PompaTahap = Pompa & { jamBulan: number; kwhBulan: number }
export type HasilTahap = TahapWtp & { pompa: PompaTahap[]; kwTerpasang: number; kwhEstimasi: number; porsi: number }

export type AlurWtp = {
  periode: { mulai: { tahun: number; bulan: number }; selesai: { tahun: number; bulan: number }; bulan: number } | null
  tahap: HasilTahap[]
  kwhMeter: { wtp: number | null; intake: number | null }
  kwhEstimasiTotal: number
  air: { distribusi: number | null; baku: number | null }
  jumlahPompa: number
}

const kunci = (t: number, b: number) => t * 12 + b - 1
const dariKunci = (k: number) => ({ tahun: Math.floor(k / 12), bulan: (k % 12) + 1 })

/** Rata-rata per bulan selama 12 bulan terakhir yang punya bacaan meter WTP. */
export function susunAlurWtp(o: {
  meter: MeterEnergi[]; bacaan: PembacaanMeter[]; pompa: Pompa[]; jam: JamOperasiPompa[]; variabel: VariabelBulanan[]
}): AlurWtp {
  const perMeter = (kode: string) => {
    const m = o.meter.find((x) => x.kode === kode)
    const peta = new Map<number, number>()
    if (!m) return peta
    for (const b of o.bacaan) {
      if (b.meter_kode !== kode) continue
      const v = konsumsiBacaan(b, m)
      if (v !== null) peta.set(kunci(b.tahun, b.bulan), v)
    }
    return peta
  }
  const wtp = perMeter(METER_WTP), intake = perMeter(METER_INTAKE)
  const jendela = [...wtp.keys()].sort((a, b) => a - b).slice(-12)
  const n = jendela.length
  const rata = (peta: Map<number, number>) => {
    const v = jendela.filter((k) => peta.has(k))
    return v.length ? v.reduce((s, k) => s + peta.get(k)!, 0) / v.length : null
  }
  const varPeta = (kode: string) => new Map(o.variabel.filter((d) => d.variabel_kode === kode).map((d) => [kunci(d.tahun, d.bulan), Number(d.nilai)]))

  const setJendela = new Set(jendela)
  const jamPompa = new Map<string, number>()
  for (const j of o.jam) {
    if (!setJendela.has(kunci(j.tahun, j.bulan)) || j.jam === null) continue
    jamPompa.set(j.pompa_kode, (jamPompa.get(j.pompa_kode) ?? 0) + Number(j.jam))
  }
  const ipab = o.pompa.filter((p) => p.unit === 'IPAB I')
  const tahap = TAHAP_WTP.map((t) => {
    const pompa = ipab.filter((p) => p.lokasi && t.lokasiPompa.includes(p.lokasi)).map((p) => {
      const jamBulan = n ? (jamPompa.get(p.kode) ?? 0) / n : 0
      return { ...p, jamBulan, kwhBulan: (p.daya_kw ?? 0) * jamBulan }
    })
    return { ...t, pompa, kwTerpasang: pompa.reduce((s, p) => s + (p.daya_kw ?? 0), 0), kwhEstimasi: pompa.reduce((s, p) => s + p.kwhBulan, 0), porsi: 0 }
  })
  const kwhEstimasiTotal = tahap.reduce((s, t) => s + t.kwhEstimasi, 0)
  for (const t of tahap) t.porsi = kwhEstimasiTotal ? (t.kwhEstimasi / kwhEstimasiTotal) * 100 : 0

  return {
    periode: n ? { mulai: dariKunci(jendela[0]), selesai: dariKunci(jendela[n - 1]), bulan: n } : null,
    tahap,
    kwhMeter: { wtp: rata(wtp), intake: rata(intake) },
    kwhEstimasiTotal,
    air: { distribusi: rata(varPeta('air_olahan')), baku: rata(varPeta('air_baku1')) },
    jumlahPompa: ipab.length,
  }
}
