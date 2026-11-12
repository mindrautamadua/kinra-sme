/**
 * Usulan sasaran energi dan rencana aksi (ISO 50001 6.2) yang disusun dari data aplikasi:
 * SEU, EnPI lingkup KINRA, peluang, rencana submeter, dan deviasi. Usulan tidak disimpan otomatis;
 * pengguna meninjau dan menyimpannya lewat form. Angka estimasi adalah perkiraan awal.
 */
import type { HasilEnpi } from './enpi'
import type { PenggunaEnergi } from './tinjauan'
import type { Peluang, RencanaAksi, Sasaran } from './types'

export type UsulanSasaran = Pick<Sasaran, 'uraian' | 'enpi_kode' | 'target_persen' | 'tahun_target' | 'pic' | 'catatan'> & { alasan: string; dipakai: string | null }
export type UsulanAksi = Pick<RencanaAksi, 'uraian' | 'peluang_kode' | 'pic' | 'sumber_daya' | 'mulai' | 'tenggat' | 'estimasi_hemat_kwh' | 'metode_verifikasi' | 'catatan'> & {
  /** Kode tetap usulan; disimpan di catatan aksi sebagai [usulan:kode] agar tidak dipakai dua kali */
  kunci: string; alasan: string; enpi?: string; dipakai: string | null
  /** Kunci usulan lama yang digantikan usulan ini; aksi bertag kunci lama dianggap sudah memakai usulan ini */
  alias?: string[]
}

export const POLA_KUNCI = /^[a-z0-9-]+$/
export const tagUsulan = (kunci: string) => `[usulan:${kunci}]`

const tambahBulan = (iso: string, n: number) => {
  const d = new Date(`${iso.slice(0, 7)}-01T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + n + 1, 0)
  return d.toISOString().slice(0, 10)
}

export function susunUsulan(d: { hasil: HasilEnpi[]; pakai: PenggunaEnergi[]; peluang: Peluang[]; sasaran: Sasaran[]; aksi: RencanaAksi[]; kini: string }) {
  const { hasil, pakai, peluang, sasaran, aksi, kini } = d
  const enpi = (k: string) => hasil.find((h) => h.enpi.kode === k && h.enpi.aktif && (h.enpi.lingkup ?? 'kinra') === 'kinra')
  // Dipakai bila ada sasaran dengan EnPI yang sama, atau uraian yang sama (mis. tersimpan tanpa EnPI)
  const dipakaiS = (enpi: string, uraian: string) =>
    sasaran.find((x) => x.enpi_kode === enpi || x.uraian.trim().toLowerCase() === uraian.toLowerCase())?.kode ?? null
  const ada = (kode: string) => peluang.some((p) => p.kode === kode)
  const kwhTahun = (re: RegExp, seu?: string) => pakai.filter((p) => (seu && p.seu?.kode === seu) || re.test(p.nama)).reduce((t, p) => t + p.kwh, 0) * 12
  // Tahun target: setelah periode baseline, dan tidak pernah tahun berjalan (sudah terlambat untuk dicapai)
  const thTarget = (h: HasilEnpi | undefined) =>
    Math.max(h ? Number(h.enpi.baseline_selesai.slice(0, 4)) + 1 : 0, Number(kini.slice(0, 4)) + 1)

  const s: UsulanSasaran[] = []
  const e04 = enpi('ENPI-04'), e05 = enpi('ENPI-05'), e06 = enpi('ENPI-06'), e01 = enpi('ENPI-01')
  if (e04) s.push({ dipakai: dipakaiS('ENPI-04', 'Menurunkan konsumsi listrik pemakaian sendiri KINRA dibanding baseline'),
    uraian: 'Menurunkan konsumsi listrik pemakaian sendiri KINRA dibanding baseline', enpi_kode: 'ENPI-04', target_persen: 3, tahun_target: thTarget(e04),
    pic: 'Manajer Energi', catatan: 'Selaras dengan kebijakan energi; WTP dan WWTP (SEU-01, SEU-02) menyerap sebagian besar listrik KINRA.',
    alasan: 'EnPI organisasi lingkup KINRA; target 3% per tahun lazim untuk tahun pertama SMEn.',
  })
  if (e05) s.push({ dipakai: dipakaiS('ENPI-05', 'Menurunkan intensitas energi WTP I (kWh per m³ air diolah)'),
    uraian: 'Menurunkan intensitas energi WTP I (kWh per m³ air diolah)', enpi_kode: 'ENPI-05', target_persen: 5, tahun_target: thTarget(e05),
    pic: 'Bagian M/E', catatan: 'SEU-01. VSD pompa distribusi sudah termasuk baseline; dicapai melalui set point tekanan, penjadwalan pompa, pompa intake, dan standardisasi pola operasi efisien Feb–Jun 2026.',
    alasan: 'WTP adalah pengguna energi terbesar; EnPI rasio sudah ditetapkan.',
  })
  if (e06) s.push({ dipakai: dipakaiS('ENPI-06', 'Menurunkan konsumsi listrik WWTP dengan mutu effluent tetap memenuhi baku mutu'),
    uraian: 'Menurunkan konsumsi listrik WWTP dengan mutu effluent tetap memenuhi baku mutu', enpi_kode: 'ENPI-06', target_persen: 5, tahun_target: thTarget(e06),
    pic: 'Bagian M/E', catatan: 'SEU-02. EnPI masih absolut; tinjau ulang target setelah debit influent tersedia dan EnPI diganti ke kWh/m³ air limbah diolah.',
    alasan: 'WWTP menyerap sekitar 45% listrik KINRA dan belum punya sasaran.',
  })
  if (e01) s.push({ dipakai: dipakaiS('ENPI-01', 'Mengendalikan konsumsi BBM kendaraan operasional'),
    uraian: 'Mengendalikan konsumsi BBM kendaraan operasional', enpi_kode: 'ENPI-01', target_persen: 5, tahun_target: thTarget(undefined),
    pic: 'Bagian Umum / Pengelola Kendaraan', catatan: 'Konsumsi 2026 jauh di atas baseline 2025; selidiki penyebab sebelum menetapkan target final.',
    alasan: 'EnPI BBM sudah punya data dan menunjukkan deviasi signifikan.',
  })

  const a: Omit<UsulanAksi, 'dipakai'>[] = []
  const wtp = kwhTahun(/^WTP$/i, 'SEU-01'), wwtp = kwhTahun(/^WWTP$/i, 'SEU-02'), gedung = kwhTahun(/kantor kawasan|pusat inovasi/i)
  a.push({
    kunci: 'submeter-wtp', uraian: 'Pasang submeter tahap 1 WTP: pompa distribusi, pompa intake, flow meter air baku, pengukur tekanan header',
    peluang_kode: ada('P-04') ? 'P-04' : null, pic: 'Bagian M/E', sumber_daya: 'Anggaran pengadaan power meter kelas 0,5S/1 + CT, teknisi listrik',
    mulai: kini, tenggat: tambahBulan(kini, 2), estimasi_hemat_kwh: null,
    metode_verifikasi: 'Bacaan submeter bulanan tercatat dan terekonsiliasi dengan meter utama WTP', catatan: 'Prasyarat EnPI per proses (lihat rencana submeter di Tinjauan Energi).',
    alasan: 'Tanpa submeter, penghematan WTP tidak dapat dibuktikan.', enpi: 'ENPI-05',
  })
  if (e05) a.push({
    kunci: 'deviasi-wtp-2026', uraian: 'Selidiki penurunan intensitas WTP I Feb–Jun 2026 dan bakukan pola operasi efisiennya dalam SOP',
    peluang_kode: ada('P-03') ? 'P-03' : null, pic: 'Manajer Energi', sumber_daya: 'Log operasi pompa (jam operasi, frekuensi VSD, tekanan header), data air baku dan tagihan BTM',
    mulai: kini, tenggat: tambahBulan(kini, 1), estimasi_hemat_kwh: null,
    metode_verifikasi: 'Penyebab tercatat di register deviasi; bila operasional, kWh/m³ WTP I (EnPI-05) setelah SOP berlaku dibanding baseline',
    catatan: 'Intensitas turun sekitar 13% lalu kembali ke level baseline Agu–Okt 2026. Bila penyebabnya pola operasi, ini peluang hemat tanpa investasi.',
    alasan: 'Kinerja lebih baik yang pernah tercapai adalah peluang termurah untuk diulang.', enpi: 'ENPI-05',
  })
  if (wtp) a.push({
    kunci: 'tekanan-pompa-wtp', uraian: 'Optimasi set point tekanan header dan penjadwalan pompa distribusi WTP I (VSD terpasang)',
    peluang_kode: ada('P-03') ? 'P-03' : null, pic: 'Bagian M/E', sumber_daya: 'Data tekanan titik kritis jaringan dan debit per jam, setelan VSD, operator WTP',
    mulai: tambahBulan(kini, 1), tenggat: tambahBulan(kini, 6), estimasi_hemat_kwh: Math.round(wtp * 0.05),
    metode_verifikasi: 'Bandingkan kWh/m³ WTP I (EnPI-05) 3 bulan sebelum dan sesudah, dinormalisasi volume air; tekanan titik kritis tetap memenuhi layanan',
    catatan: 'Tiga VSD pompa distribusi (2022, Jan 2024, Agu 2025) sudah bagian baseline 2025; penghematan hanya dari menurunkan set point tekanan dan pola operasi. Estimasi awal 5% konsumsi WTP; perbarui setelah kajian.',
    alasan: 'VSD hanya menghemat bila set point tekanannya tidak berlebih.', enpi: 'ENPI-05', alias: ['vsd-pompa-wtp'],
  })
  if (wtp) a.push({
    kunci: 'pompa-intake-wtp', uraian: 'Kajian efisiensi pompa intake (air baku) WTP I dan kelayakan kontrol kecepatan',
    peluang_kode: ada('P-03') ? 'P-03' : null, pic: 'Bagian M/E', sumber_daya: 'Bacaan meter intake KINRA-MTR-008, uji debit-tekanan pompa, kalkulator Pompa VSD',
    mulai: tambahBulan(kini, 2), tenggat: tambahBulan(kini, 5), estimasi_hemat_kwh: null,
    metode_verifikasi: 'kWh intake (KINRA-MTR-008) per m³ air baku sebelum dan sesudah tindakan',
    catatan: 'Pompa intake belum ber-VSD dan baru diukur terpisah mulai Nov 2026. Konfirmasi faktor kali meter intake sebelum menghitung baseline.',
    alasan: 'Satu-satunya beban besar WTP yang belum dioptimasi.', enpi: 'ENPI-05',
  })
  if (wwtp) a.push({
    kunci: 'flowmeter-influent-wwtp', uraian: 'Pasang flow meter influent dan submeter blower WWTP',
    peluang_kode: ada('P-04') ? 'P-04' : null, pic: 'Bagian M/E', sumber_daya: 'Flow meter influent, power meter kelas 0,5S/1 + CT untuk panel blower, teknisi listrik',
    mulai: kini, tenggat: tambahBulan(kini, 3), estimasi_hemat_kwh: null,
    metode_verifikasi: 'Debit influent dan kWh blower tercatat bulanan dan terekonsiliasi dengan meter utama WWTP (KINRA-MTR-004)',
    catatan: 'Prasyarat mengganti ENPI-06 dari absolut ke kWh/m³ air limbah diolah dan membuktikan hasil kontrol DO.',
    alasan: 'Tanpa debit influent, penghematan WWTP tidak dapat dipisahkan dari perubahan beban limbah.', enpi: 'ENPI-06',
  })
  if (wwtp) a.push({
    kunci: 'kontrol-do-wwtp', uraian: 'Kontrol aerasi berbasis oksigen terlarut (DO) pada blower WWTP',
    peluang_kode: ada('P-03') ? 'P-03' : null, pic: 'Bagian M/E', sumber_daya: 'Sensor DO, kontrol blower (VSD/on-off bertahap), submeter blower',
    mulai: tambahBulan(kini, 3), tenggat: tambahBulan(kini, 9), estimasi_hemat_kwh: Math.round(wwtp * 0.1),
    metode_verifikasi: 'Bandingkan kWh blower per m³ air limbah diolah sebelum dan sesudah, dengan mutu effluent tetap memenuhi baku mutu', catatan: 'Estimasi awal 10% konsumsi WWTP; perbarui setelah kajian. Mulai setelah flow meter influent dan submeter blower terpasang.',
    alasan: 'Aerasi umumnya beban terbesar WWTP; aerasi berlebih sering terjadi.', enpi: e06 ? 'ENPI-06' : 'ENPI-04',
  })
  if (e01) a.push({
    kunci: 'selidiki-bbm', uraian: 'Selidiki kenaikan konsumsi BBM 2026 dan catat konsumsi per kendaraan',
    peluang_kode: null, pic: 'Bagian Umum / Pengelola Kendaraan', sumber_daya: 'Log BBM per kendaraan, km/jam operasi',
    mulai: kini, tenggat: tambahBulan(kini, 1), estimasi_hemat_kwh: null,
    metode_verifikasi: 'Konsumsi BBM per kendaraan per bulan dibanding baseline 2025; penyebab tercatat di register deviasi', catatan: 'Menutup deviasi signifikan EnPI-01 (klausul 9.1).',
    alasan: 'EnPI BBM naik jauh di atas baseline.', enpi: 'ENPI-01',
  })
  if (gedung) a.push({
    kunci: 'optimasi-ac-gedung', uraian: 'Optimasi jadwal operasi dan set point AC di Bangunan Kantor Kawasan dan Pusat Inovasi',
    peluang_kode: ada('P-01') ? 'P-01' : null, pic: 'Bagian Umum / Pengelola Gedung', sumber_daya: 'Jadwal operasi, termometer ruang, sosialisasi penghuni',
    mulai: tambahBulan(kini, 1), tenggat: tambahBulan(kini, 4), estimasi_hemat_kwh: Math.round(gedung * 0.1),
    metode_verifikasi: 'Bandingkan kWh gedung per bulan sebelum dan sesudah pada jam operasi yang sama', catatan: 'Estimasi awal 10% konsumsi kedua gedung.',
    alasan: 'Pusat Inovasi memiliki intensitas energi per m² tertinggi.', enpi: 'ENPI-04',
  })
  // Dipakai bila ada aksi yang membawa tag usulan, atau (data lama) uraiannya sama persis
  const dipakaiA = (u: Omit<UsulanAksi, 'dipakai'>) =>
    aksi.find((x) => [u.kunci, ...(u.alias ?? [])].some((k) => x.catatan?.includes(tagUsulan(k))) || x.uraian.trim().toLowerCase() === u.uraian.toLowerCase())?.kode ?? null
  return { sasaran: s, aksi: a.map((u) => ({ ...u, dipakai: dipakaiA(u) })) }
}
