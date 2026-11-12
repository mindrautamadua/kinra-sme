/**
 * Alur proses WWTP (IPAL I) KEK Sei Mangkei (SEU-02): tahap proses dari gambar "Flow Process Instalasi Pengolahan
 * Air Limbah" (Lampiran BAPRK-03/01, terbit 25-06-2026), dipetakan ke register pompa dan aerator IPAL I (migrasi 0044),
 * jam operasi, meter kWh KINRA-MTR-004, dan volume inlet/outlet IPAL I.
 *
 * Estimasi kWh per tahap = daya pengenal × jam operasi. Ini batas atas, jadi dipakai untuk porsi antartahap, bukan pengganti meter.
 * IPAL II (beroperasi sejak Jun 2026) tidak dikelola KINRA dan tidak termasuk.
 */
import { bebanTahap, dariKunci, kwhPerMeter, petaVariabel, rataJendela, type HasilTahap, type TahapWtp } from './alur-wtp'
import type { JamOperasiPompa, MeterEnergi, PembacaanMeter, Pompa, VariabelBulanan } from './types'

export const METER_WWTP = 'KINRA-MTR-004'

const MTR004 = { label: 'MTR-004', status: 'pasti' as const }

export const TAHAP_WWTP: TahapWtp[] = [
  { no: 1, id: 'influent', nama: 'Influent Chamber', ringkas: 'Air limbah tenant masuk ke bak penampung, melewati gate screen dan fine screen (penyaring sampah kasar dan halus), lalu bak kontrol (oil trap) untuk memisahkan minyak. Pompa di chamber mengirim air limbah ke kolam ekualisasi.',
    lokasiPompa: ['Chamber'], beban: 'Ikut debit air limbah masuk', meter: MTR004, dataAir: 'Inlet IPAL I (air_ipal_inlet), pembagi ENPI-06', sifat: 'volume' },
  { no: 2, id: 'ekualisasi', nama: 'Ekualisasi', ringkas: 'Kolam penyeragam debit dan beban limbah, dengan aerator pengaduk dan titik injeksi kimia. Pompa ekualisasi mengalirkan air ke Aerasi I secara merata.',
    lokasiPompa: ['Ekualisasi'], beban: 'Pompa ikut debit; aerator pengaduk jalan terus', meter: MTR004, dataAir: '–', sifat: 'volume' },
  { no: 3, id: 'aerasi1', nama: 'Aerasi I', ringkas: 'Kolam lumpur aktif pertama. Menerima air dari ekualisasi dan lumpur balik (RAS) dari clarifier. Aerator memasok oksigen untuk bakteri pengurai; injeksi nutrisi dari jalur bawah.',
    lokasiPompa: ['Aerasi I'], beban: 'Aerator jalan terus; ikut beban organik, bukan volume', meter: MTR004, dataAir: '–', sifat: 'tetap' },
  { no: 4, id: 'aerasi2', nama: 'Aerasi II', ringkas: 'Kolam aerasi kedua, tersambung ke Aerasi I dan III melalui lubang aliran antar sekat.',
    lokasiPompa: ['Aerasi II'], beban: 'Aerator jalan terus', meter: MTR004, dataAir: '–', sifat: 'tetap' },
  { no: 5, id: 'aerasi3', nama: 'Aerasi III', ringkas: 'Kolam aerasi terakhir sebelum clarifier. Dua pompa di bawahnya mensirkulasikan air ke ketiga kolam aerasi.',
    lokasiPompa: ['Aerasi III'], beban: 'Aerator jalan terus; pompa sirkulasi', meter: MTR004, dataAir: '–', sifat: 'tetap' },
  { no: 6, id: 'clarifier', nama: 'Clarifier', ringkas: 'Pengendap akhir dengan jembatan penyapu (vario motor). Lumpur dipompa kembali ke Aerasi I sebagai Return Activated Sludge (RAS); kelebihannya dibuang sebagai Wasted Activated Sludge (WAS) ke sludge drying bed.',
    lokasiPompa: ['Clarifier'], beban: 'Pompa RAS dan penyapu jalan terus; WAS berkala', meter: MTR004, dataAir: '–', sifat: 'tetap' },
  { no: 7, id: 'indikator', nama: 'Kolam Indikator', ringkas: 'Effluent dari clarifier melewati titik koordinat (titik pantau) ke kolam indikator, lalu dibuang ke badan air penerima (sungai).',
    lokasiPompa: [], beban: 'Tanpa beban listrik (aliran gravitasi)', meter: { label: '–', status: 'tidak-ada' }, dataAir: 'Outlet IPAL I (air_ipal_outlet)', sifat: 'pasif' },
  { no: 8, id: 'sdb', nama: 'Sludge Drying Bed', ringkas: 'Bak pengering lumpur buangan (WAS) dari clarifier.',
    lokasiPompa: [], beban: 'Tanpa beban listrik', meter: { label: '–', status: 'tidak-ada' }, dataAir: '–', sifat: 'pasif' },
]

export const PERTANYAAN_WWTP = [
  'Pompa 8 dan 9 di Aerasi III: apakah ini pompa sirkulasi ke ketiga kolam aerasi, dan apakah jalan terus?',
  'Berapa aerator yang benar-benar menyala per kolam, dan apakah ada pengaturan berdasarkan DO (oksigen terlarut)?',
  'Pompa WAS belum punya daya pengenal di register. Berapa kW dan seberapa sering lumpur dibuang?',
  'Angka inlet dan outlet IPAL I berasal dari flow meter atau estimasi? Di mana flow meter terpasang?',
  'Apakah ada panel atau penerangan lain (kantor, laboratorium) yang ikut di meter KINRA-MTR-004?',
]

export type AlurWwtp = {
  periode: { mulai: { tahun: number; bulan: number }; selesai: { tahun: number; bulan: number }; bulan: number } | null
  tahap: HasilTahap[]
  kwhMeter: number | null
  kwhEstimasiTotal: number
  air: { inlet: number | null; outlet: number | null }
  /** Semua unit peralatan IPAL I di register (pompa, aerator, vario motor, WAS). */
  jumlahUnit: number
  jumlahAerator: number
}

/** Rata-rata per bulan selama 12 bulan terakhir yang punya bacaan meter WWTP. */
export function susunAlurWwtp(o: {
  meter: MeterEnergi[]; bacaan: PembacaanMeter[]; pompa: Pompa[]; jam: JamOperasiPompa[]; variabel: VariabelBulanan[]
}): AlurWwtp {
  const kwh = kwhPerMeter(METER_WWTP, o.meter, o.bacaan)
  const jendela = [...kwh.keys()].sort((a, b) => a - b).slice(-12)
  const n = jendela.length
  const ipal = o.pompa.filter((p) => p.unit === 'IPAL I')
  const { tahap, total } = bebanTahap(TAHAP_WWTP, ipal, o.jam, jendela)
  const aerator = ipal.filter((p) => /aerator/i.test(p.nama)).length

  return {
    periode: n ? { mulai: dariKunci(jendela[0]), selesai: dariKunci(jendela[n - 1]), bulan: n } : null,
    tahap,
    kwhMeter: rataJendela(kwh, jendela),
    kwhEstimasiTotal: total,
    air: { inlet: rataJendela(petaVariabel(o.variabel, 'air_ipal_inlet'), jendela), outlet: rataJendela(petaVariabel(o.variabel, 'air_ipal_outlet'), jendela) },
    jumlahUnit: ipal.length,
    jumlahAerator: aerator,
  }
}
