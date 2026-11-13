/**
 * Rancangan umum titik submeter SEU (rencana pengumpulan data energi, ISO 50001 6.6 & 9.1).
 * Koordinat untuk diagram SVG viewBox 1000 x 440. Rancangan umum: cocokkan dengan single line diagram lapangan.
 */

export type TahapMeter = 0 | 1 | 2 | 3
export type JenisUkur = 'kWh' | 'm³' | 'bar' | 'DO' | 'COD'

export type Unit = { id: string; label: string[]; x: number; y: number; w: number; h: number; jenis: 'air' | 'listrik' | 'luar' }
export type Jalur = { d: string; jenis: 'air' | 'lumpur' | 'listrik' | 'buang' }
export type TitikUkur = { id: string; label: string; jenis: JenisUkur; tahap: TahapMeter; x: number; y: number; kegunaan: string; kode?: string }

export type Label = { x: number; y: number; teks: string }
export type Skema = { kode: string; nama: string; seu: string; meterUtama: string; unit: Unit[]; jalur: Jalur[]; titik: TitikUkur[]; label?: Label[]; indikator: string[] }

export const LABEL_TAHAP: Record<TahapMeter, string> = { 0: 'Sudah ada', 1: 'Tahap 1', 2: 'Tahap 2', 3: 'Tahap 3' }
export const KET_TAHAP: Record<TahapMeter, string> = {
  0: 'Meter yang sudah terpasang',
  1: 'Prioritas: beban terbesar dan variabel utama, sebelum audit Stage 2 bila memungkinkan',
  2: 'Beban kedua dan data pendukung',
  3: 'Beban penunjang dan otomasi',
}

const PLN: Unit = { id: 'pln', label: ['PLN'], x: 10, y: 22, w: 80, h: 36, jenis: 'luar' }

export const SKEMA: Skema[] = [
  {
    kode: 'wtp', nama: 'WTP · Instalasi pengolahan air bersih', seu: 'SEU-01', meterUtama: 'KINRA-MTR-005',
    unit: [
      PLN,
      { id: 'sumber', label: ['Sumber', 'air baku'], x: 10, y: 250, w: 85, h: 70, jenis: 'luar' },
      { id: 'intake', label: ['Pompa', 'intake'], x: 120, y: 250, w: 90, h: 70, jenis: 'listrik' },
      { id: 'koag', label: ['Koagulasi &', 'flokulasi'], x: 240, y: 250, w: 110, h: 70, jenis: 'listrik' },
      { id: 'clar', label: ['Clarifier'], x: 375, y: 250, w: 90, h: 70, jenis: 'listrik' },
      { id: 'filter', label: ['Filter', '+ backwash'], x: 490, y: 250, w: 100, h: 70, jenis: 'listrik' },
      { id: 'res', label: ['Reservoir'], x: 615, y: 250, w: 90, h: 70, jenis: 'air' },
      { id: 'dist', label: ['Pompa', 'distribusi'], x: 730, y: 250, w: 100, h: 70, jenis: 'listrik' },
      { id: 'jaringan', label: ['Jaringan', 'kawasan'], x: 905, y: 250, w: 90, h: 70, jenis: 'luar' },
      { id: 'penunjang', label: ['Kantor, lab,', 'penerangan, AC'], x: 600, y: 105, w: 120, h: 46, jenis: 'listrik' },
    ],
    jalur: [
      { d: 'M90,40 H780', jenis: 'listrik' },
      { d: 'M165,40 V250', jenis: 'listrik' },
      { d: 'M357,40 V110 M295,110 H420 M295,110 V250 M420,110 V250', jenis: 'listrik' },
      { d: 'M540,40 V250', jenis: 'listrik' },
      { d: 'M660,40 V105', jenis: 'listrik' },
      { d: 'M780,40 V250', jenis: 'listrik' },
      { d: 'M95,285 H120 M210,285 H240 M350,285 H375 M465,285 H490 M590,285 H615 M705,285 H730 M830,285 H905', jenis: 'air' },
      { d: 'M540,320 V395 H600', jenis: 'buang' },
    ],
    titik: [
      { id: 'utama', label: 'Meter WTP (tanpa intake)', jenis: 'kWh', tahap: 0, x: 118, y: 40, kode: 'KINRA-MTR-005', kegunaan: 'Listrik proses WTP I di luar pompa intake. Bersama KINRA-MTR-008 menjadi pembilang EnPI-05 (kWh per m³ air diolah WTP I).' },
      { id: 'intake', label: 'Meter pompa intake', jenis: 'kWh', tahap: 0, x: 165, y: 82, kode: 'KINRA-MTR-008', kegunaan: 'Sudah terpasang dan tercatat sejak Jan 2024. Beban terbesar kedua; pompa 110 kW diganti 37 kW pada Okt 2026. Bergantung pada volume air baku dan muka air sumber.' },
      { id: 'proses', label: 'Submeter beban proses', jenis: 'kWh', tahap: 2, x: 357, y: 82, kegunaan: 'Mixer, flokulator, pompa dosing kimia, dan scraper clarifier. Relatif tetap; mendeteksi alat menyala di luar jadwal.' },
      { id: 'filter', label: 'Submeter backwash & blower filter', jenis: 'kWh', tahap: 2, x: 540, y: 82, kegunaan: 'Beban sesekali tetapi besar. Menunjukkan frekuensi dan efisiensi pencucian filter.' },
      { id: 'penunjang', label: 'Submeter penunjang', jenis: 'kWh', tahap: 3, x: 660, y: 74, kegunaan: 'Kantor, laboratorium, penerangan, AC. Memisahkan beban bangunan agar EnPI proses bersih.' },
      { id: 'dist', label: 'Submeter pompa distribusi', jenis: 'kWh', tahap: 1, x: 780, y: 82, kegunaan: 'Biasanya beban terbesar WTP. Bergantung pada volume air dan tekanan jaringan; kandidat utama VSD.' },
      { id: 'flow-baku', label: 'Flow meter air baku (FM1a + FM1b)', jenis: 'm³', tahap: 0, x: 225, y: 285, kegunaan: 'kWh per m³ pompa intake dan kehilangan air (air baku dikurangi air terdistribusi).' },
      { id: 'tekanan', label: 'Pengukur tekanan header', jenis: 'bar', tahap: 1, x: 852, y: 285, kegunaan: 'Tekanan berlebih adalah sumber pemborosan pompa paling umum. Bersama flow dan kW, dasar efisiensi pompa wire-to-water.' },
      { id: 'flow-keluar', label: 'Flow meter air terdistribusi', jenis: 'm³', tahap: 0, x: 882, y: 285, kegunaan: 'Air diolah WTP I tercatat sebagai variabel air_wtp1, pembagi EnPI-05. Variabel air_olahan termasuk air WTP II (BTM), jadi tidak dipakai untuk EnPI.' },
      { id: 'flow-backwash', label: 'Flow meter air backwash (opsional)', jenis: 'm³', tahap: 2, x: 540, y: 360, kegunaan: 'Porsi air terbuang saat pencucian filter.' },
    ],
    label: [{ x: 610, y: 399, teks: 'air backwash' }],
    indikator: ['kWh per m³ air diolah WTP I (EnPI-05)', 'kWh per m³ per tahap pompa', 'Efisiensi pompa wire-to-water', 'Persentase kehilangan air'],
  },
  {
    kode: 'wwtp', nama: 'WWTP · Instalasi pengolahan air limbah', seu: 'SEU-02', meterUtama: 'KINRA-MTR-004',
    unit: [
      PLN,
      { id: 'tenant', label: ['Air limbah', 'tenant'], x: 10, y: 250, w: 85, h: 70, jenis: 'luar' },
      { id: 'influent', label: ['Pompa', 'influent'], x: 120, y: 250, w: 90, h: 70, jenis: 'listrik' },
      { id: 'eq', label: ['Equalisasi', '+ mixer'], x: 240, y: 250, w: 95, h: 70, jenis: 'listrik' },
      { id: 'aerasi', label: ['Kolam aerasi', '+ blower'], x: 360, y: 250, w: 140, h: 70, jenis: 'listrik' },
      { id: 'clar', label: ['Clarifier'], x: 530, y: 250, w: 90, h: 70, jenis: 'air' },
      { id: 'effluent', label: ['Air olahan', 'ke badan air'], x: 680, y: 250, w: 100, h: 70, jenis: 'luar' },
      { id: 'lumpur', label: ['Pompa', 'RAS/WAS'], x: 530, y: 360, w: 90, h: 56, jenis: 'listrik' },
      { id: 'dewater', label: ['Dewatering', 'lumpur'], x: 790, y: 360, w: 100, h: 56, jenis: 'listrik' },
      { id: 'penunjang', label: ['Kantor WWTP,', 'lab, penerangan'], x: 800, y: 105, w: 120, h: 46, jenis: 'listrik' },
    ],
    jalur: [
      { d: 'M90,40 H930', jenis: 'listrik' },
      { d: 'M165,40 V250', jenis: 'listrik' },
      { d: 'M287,40 V250', jenis: 'listrik' },
      { d: 'M430,40 V250', jenis: 'listrik' },
      { d: 'M515,40 V388 H530', jenis: 'listrik' },
      { d: 'M860,40 V105', jenis: 'listrik' },
      { d: 'M930,40 V388 H890', jenis: 'listrik' },
      { d: 'M95,285 H120 M210,285 H240 M335,285 H360 M500,285 H530 M620,285 H680', jenis: 'air' },
      { d: 'M575,320 V360', jenis: 'lumpur' },
      { d: 'M530,404 H430 V320', jenis: 'lumpur' },
      { d: 'M620,388 H790', jenis: 'lumpur' },
    ],
    titik: [
      { id: 'utama', label: 'Meter utama WWTP', jenis: 'kWh', tahap: 0, x: 118, y: 40, kode: 'KINRA-MTR-004', kegunaan: 'Total listrik WWTP IPAL I. Pembilang EnPI-06 (kWh per m³ inlet IPAL I).' },
      { id: 'influent', label: 'Submeter pompa influent & lift station', jenis: 'kWh', tahap: 2, x: 165, y: 82, kegunaan: 'Beban kedua. Bergantung pada debit air limbah masuk.' },
      { id: 'mixer', label: 'Submeter mixer & dosing', jenis: 'kWh', tahap: 3, x: 287, y: 82, kegunaan: 'Mixer equalisasi dan pompa dosing kimia. Beban relatif tetap.' },
      { id: 'blower', label: 'Submeter blower / aerator', jenis: 'kWh', tahap: 1, x: 430, y: 82, kegunaan: 'Pada pengolahan biologis, aerasi umumnya beban terbesar dan sumber penghematan utama.' },
      { id: 'lumpur', label: 'Submeter pompa RAS/WAS', jenis: 'kWh', tahap: 2, x: 515, y: 82, kegunaan: 'Pompa lumpur balik dan lumpur buang. Beban kontinu yang sering bisa dioptimalkan jadwalnya.' },
      { id: 'penunjang', label: 'Submeter penunjang', jenis: 'kWh', tahap: 3, x: 860, y: 74, kegunaan: 'Kantor WWTP, laboratorium, penerangan. Memisahkan beban bangunan.' },
      { id: 'dewater', label: 'Submeter dewatering lumpur', jenis: 'kWh', tahap: 2, x: 930, y: 82, kegunaan: 'Belt/screw press dan pompa lumpur. Bergantung pada volume lumpur.' },
      { id: 'flow-in', label: 'Flow meter air limbah masuk', jenis: 'm³', tahap: 1, x: 225, y: 285, kegunaan: 'Variabel relevan utama SEU-02: kWh per m³ air limbah diolah.' },
      { id: 'do', label: 'Sensor oksigen terlarut (DO)', jenis: 'DO', tahap: 1, x: 482, y: 305, kegunaan: 'Aerasi berlebih (DO terlalu tinggi) adalah pemborosan paling umum. Dasar kontrol blower otomatis.' },
      { id: 'cod', label: 'Sampel COD/BOD masuk & keluar (lab)', jenis: 'COD', tahap: 2, x: 650, y: 285, kegunaan: 'kWh per kg COD tersisihkan: lebih adil bila kualitas limbah tenant berubah.' },
    ],
    label: [{ x: 440, y: 432, teks: 'lumpur balik (RAS)' }, { x: 650, y: 380, teks: 'lumpur buang (WAS)' }],
    indikator: ['kWh per m³ inlet IPAL I (EnPI-06)', 'kWh per kg COD tersisihkan', 'kWh blower per m³ udara', 'Profil DO terhadap kebutuhan'],
  },
]
