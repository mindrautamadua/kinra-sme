/**
 * Alur pasokan listrik KEK Sei Mangkei: gambar tata letak gardu yang diberikan tim KINRA (13 Nov 2026),
 * Gardu Induk PLN → Gardu Hubung Utama → Gardu Distribusi → Gardu Transaksi (kubikel IM, IM, CM, DM1-W dan kWh meter),
 * lalu beban hilir (meter aset KINRA dan tenant) yang tidak ada di gambar sumber.
 *
 * Gambar sumber hanya menunjukkan rute kabel dan panel. Kepemilikan gardu, tegangan, dan titik ukur mana yang
 * menjadi data "Listrik PLN kawasan" belum dikonfirmasi Bagian M/E, jadi ditandai sebagai pertanyaan terbuka.
 */
import { dariKunci, kunci } from './alur-wtp'
import { konsumsiBacaan } from './enpi'
import type { EnergiBulanan, MeterEnergi, PembacaanMeter } from './types'

export type StatusUkur = 'pasti' | 'belum-jelas' | 'tidak-ada'

export type GarduListrik = {
  no: number
  id: 'gi' | 'gh' | 'gd' | 'gt' | 'beban'
  nama: string
  ringkas: string
  /** Isi panel atau kubikel menurut gambar sumber. */
  panel: string
  penyulang: string
  ukur: { label: string; status: StatusUkur }
  dataAplikasi: string
}

export const GARDU: GarduListrik[] = [
  { no: 1, id: 'gi', nama: 'Gardu Induk PLN', ringkas: 'Sumber pasokan dari jaringan PLN. Di gambar, dua penyulang keluar dari panel gardu induk menuju Gardu Hubung Utama: penyulang merah dan penyulang hitam.',
    panel: 'Satu panel, dua sel keluaran (penyulang merah dan hitam)', penyulang: 'Merah dan hitam keluar ke Gardu Hubung Utama',
    ukur: { label: 'Milik PLN', status: 'tidak-ada' }, dataAplikasi: '–' },
  { no: 2, id: 'gh', nama: 'Gardu Hubung Utama', ringkas: 'Gardu hubung membagi dan memindahkan pasokan antarpenyulang tanpa mengubah tegangan. Kedua penyulang dari gardu induk masuk ke panel ini lalu diteruskan ke Gardu Distribusi, sehingga beban dapat dipindah ke penyulang lain bila satu penyulang padam.',
    panel: 'Satu panel, dua sel masuk dan dua sel keluar', penyulang: 'Merah dan hitam masuk dari gardu induk, keduanya keluar ke Gardu Distribusi',
    ukur: { label: 'Belum diketahui', status: 'belum-jelas' }, dataAplikasi: '–' },
  { no: 3, id: 'gd', nama: 'Gardu Distribusi', ringkas: 'Panel distribusi yang menerima kedua penyulang dari gardu hubung. Menurut gambar, hanya penyulang merah yang diteruskan ke Gardu Transaksi; penyulang hitam berakhir di gardu ini.',
    panel: 'Satu panel, sel masuk dua penyulang dan satu sel keluar', penyulang: 'Merah diteruskan ke Gardu Transaksi; hitam berhenti di sini',
    ukur: { label: 'Belum diketahui', status: 'belum-jelas' }, dataAplikasi: '–' },
  { no: 4, id: 'gt', nama: 'Gardu Transaksi', ringkas: 'Titik transaksi jual-beli listrik, tempat kWh meter tagihan dipasang. Penyulang merah masuk lewat kubikel IM; kubikel CM berisi trafo tegangan untuk pengukuran; DM1-W adalah pemutus tenaga (circuit breaker) yang menyalurkan listrik ke beban di hilir.',
    panel: 'Kubikel IM · IM · CM · DM1-W, kWh meter transaksi', penyulang: 'Merah masuk di kubikel IM; keluar lewat DM1-W ke beban hilir',
    ukur: { label: 'kWh meter transaksi', status: 'belum-jelas' }, dataAplikasi: 'Kandidat sumber data "Listrik PLN kawasan" (sumber_kode pln), perlu konfirmasi' },
  { no: 5, id: 'beban', nama: 'Beban hilir', ringkas: 'Tidak ada di gambar sumber. Setelah DM1-W, listrik mengalir ke trafo dan panel beban: aset KINRA yang diukur meter KINRA-MTR-001 s.d. 009, serta tenant kawasan yang berada di luar lingkup SMEn.',
    panel: 'Trafo dan panel tegangan rendah (belum digambar)', penyulang: 'Dari DM1-W Gardu Transaksi',
    ukur: { label: '9 meter aset KINRA', status: 'pasti' }, dataAplikasi: 'Bacaan meter aset KINRA (dasar EnPI lingkup KINRA)' },
]

export const PERTANYAAN_LISTRIK = [
  'Siapa pemilik dan operator tiap gardu (Gardu Induk, Gardu Hubung Utama, Gardu Distribusi, Gardu Transaksi), dan di mana batas serah terima antara PLN dan KINRA?',
  'Berapa tegangan tiap ruas (mis. 150 kV/20 kV) dan kapasitas trafo di hilir Gardu Transaksi?',
  'Penyulang hitam berhenti di Gardu Distribusi: apakah ini penyulang cadangan, atau melayani beban lain yang tidak digambar?',
  'kWh meter di Gardu Transaksi: berapa ID pelanggan, nomor meter, dan faktor kalinya? Apakah angka "Listrik PLN kawasan" di aplikasi berasal dari meter ini?',
  'Meter aset KINRA (MTR-001 s.d. 009) tersambung dari gardu mana? Apakah meter itu meter pelanggan PLN tersendiri atau submeter di jaringan kawasan?',
  'PLTBG dan PLTS dikelola pihak ketiga: di titik mana listriknya masuk ke jaringan kawasan, dan apakah ikut tercatat di kWh meter transaksi atau diukur terpisah?',
  'Apakah ada catatan faktor daya, beban puncak (kVA), dan susut jaringan dari Gardu Transaksi ke beban?',
]

export type AlurListrik = {
  periode: { mulai: { tahun: number; bulan: number }; selesai: { tahun: number; bulan: number }; bulan: number } | null
  /** Rata-rata kWh/bulan pada jendela yang sama. */
  kwhKawasan: number | null
  kwhKinra: number | null
  meter: { kode: string; nama: string; kwh: number | null }[]
}

/** Rata-rata per bulan, 12 bulan terakhir yang punya data PLN kawasan dan bacaan semua meter listrik KINRA. */
export function susunAlurListrik(o: { energi: EnergiBulanan[]; meter: MeterEnergi[]; bacaan: PembacaanMeter[] }): AlurListrik {
  const listrik = o.meter.filter((m) => m.sumber_kode === 'pln').sort((a, b) => a.no_urut - b.no_urut)
  const pln = new Map(o.energi.filter((d) => d.sumber_kode === 'pln' && d.nilai !== null).map((d) => [kunci(d.tahun, d.bulan), Number(d.nilai)]))
  const perMeter = new Map(listrik.map((m) => [m.kode, new Map<number, number>()]))
  for (const b of o.bacaan) {
    const m = listrik.find((x) => x.kode === b.meter_kode)
    const v = m ? konsumsiBacaan(b, m) : null
    if (m && v !== null) perMeter.get(m.kode)!.set(kunci(b.tahun, b.bulan), v)
  }
  const lengkap = (k: number) => listrik.every((m) => perMeter.get(m.kode)!.has(k))
  const jendela = [...pln.keys()].filter(lengkap).sort((a, b) => a - b).slice(-12)
  const n = jendela.length
  const rata = (peta: Map<number, number>) => (n ? jendela.reduce((s, k) => s + (peta.get(k) ?? 0), 0) / n : null)
  const meter = listrik.map((m) => ({ kode: m.kode, nama: m.area_dilayani ?? m.lokasi ?? m.kode, kwh: rata(perMeter.get(m.kode)!) }))

  return {
    periode: n ? { mulai: dariKunci(jendela[0]), selesai: dariKunci(jendela[n - 1]), bulan: n } : null,
    kwhKawasan: rata(pln),
    kwhKinra: n ? meter.reduce((s, m) => s + (m.kwh ?? 0), 0) : null,
    meter,
  }
}
