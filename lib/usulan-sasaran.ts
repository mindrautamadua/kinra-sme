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
  const dipakaiS = (enpi: string) => sasaran.find((x) => x.enpi_kode === enpi)?.kode ?? null
  const ada = (kode: string) => peluang.some((p) => p.kode === kode)
  const kwhTahun = (re: RegExp) => pakai.filter((p) => re.test(p.nama)).reduce((t, p) => t + p.kwh, 0) * 12
  const thBaseline = (h: HasilEnpi | undefined) => (h ? Number(h.enpi.baseline_selesai.slice(0, 4)) : Number(kini.slice(0, 4)))

  const s: UsulanSasaran[] = []
  const e04 = enpi('ENPI-04'), e05 = enpi('ENPI-05'), e01 = enpi('ENPI-01')
  if (e04) s.push({ dipakai: dipakaiS('ENPI-04'),
    uraian: 'Menurunkan konsumsi listrik pemakaian sendiri KINRA dibanding baseline', enpi_kode: 'ENPI-04', target_persen: 3, tahun_target: thBaseline(e04) + 1,
    pic: 'Manajer Energi', catatan: 'Selaras dengan kebijakan energi; WTP dan WWTP (SEU-01, SEU-02) menyerap sebagian besar listrik KINRA.',
    alasan: 'EnPI organisasi lingkup KINRA; target 3% per tahun lazim untuk tahun pertama SMEn.',
  })
  if (e05) s.push({ dipakai: dipakaiS('ENPI-05'),
    uraian: 'Menurunkan intensitas energi WTP (kWh per m³ air terdistribusi)', enpi_kode: 'ENPI-05', target_persen: 5, tahun_target: thBaseline(e05) + 1,
    pic: 'Bagian M/E', catatan: 'SEU-01. Dicapai melalui pengaturan tekanan, jadwal pompa, dan kajian VSD.',
    alasan: 'WTP adalah pengguna energi terbesar; EnPI rasio sudah ditetapkan.',
  })
  if (e01) s.push({ dipakai: dipakaiS('ENPI-01'),
    uraian: 'Mengendalikan konsumsi BBM kendaraan operasional', enpi_kode: 'ENPI-01', target_persen: 5, tahun_target: Number(kini.slice(0, 4)) + 1,
    pic: 'Bagian Umum / Pengelola Kendaraan', catatan: 'Konsumsi 2026 jauh di atas baseline 2025; selidiki penyebab sebelum menetapkan target final.',
    alasan: 'EnPI BBM sudah punya data dan menunjukkan deviasi signifikan.',
  })

  const a: Omit<UsulanAksi, 'dipakai'>[] = []
  const wtp = kwhTahun(/^WTP$/i), wwtp = kwhTahun(/^WWTP$/i), gedung = kwhTahun(/kantor kawasan|pusat inovasi/i)
  a.push({
    kunci: 'submeter-wtp', uraian: 'Pasang submeter tahap 1 WTP: pompa distribusi, pompa intake, flow meter air baku, pengukur tekanan header',
    peluang_kode: ada('P-04') ? 'P-04' : null, pic: 'Bagian M/E', sumber_daya: 'Anggaran pengadaan power meter kelas 0,5S/1 + CT, teknisi listrik',
    mulai: kini, tenggat: tambahBulan(kini, 2), estimasi_hemat_kwh: null,
    metode_verifikasi: 'Bacaan submeter bulanan tercatat dan terekonsiliasi dengan meter utama WTP', catatan: 'Prasyarat EnPI per proses (lihat rencana submeter di Tinjauan Energi).',
    alasan: 'Tanpa submeter, penghematan WTP tidak dapat dibuktikan.', enpi: 'ENPI-05',
  })
  if (wtp) a.push({
    kunci: 'vsd-pompa-wtp', uraian: 'Kajian dan uji coba pengaturan tekanan serta VSD pompa distribusi WTP',
    peluang_kode: ada('P-03') ? 'P-03' : null, pic: 'Bagian M/E', sumber_daya: 'Kajian teknis, data tekanan dan debit, anggaran VSD bila layak',
    mulai: tambahBulan(kini, 2), tenggat: tambahBulan(kini, 8), estimasi_hemat_kwh: Math.round(wtp * 0.05),
    metode_verifikasi: 'Bandingkan kWh/m³ WTP (EnPI-05) 3 bulan sebelum dan sesudah, dinormalisasi volume air', catatan: 'Estimasi awal 5% konsumsi WTP; perbarui setelah kajian.',
    alasan: 'Tekanan berlebih adalah pemborosan pompa paling umum.', enpi: 'ENPI-05',
  })
  if (wwtp) a.push({
    kunci: 'kontrol-do-wwtp', uraian: 'Kontrol aerasi berbasis oksigen terlarut (DO) pada blower WWTP',
    peluang_kode: ada('P-03') ? 'P-03' : null, pic: 'Bagian M/E', sumber_daya: 'Sensor DO, kontrol blower, submeter blower',
    mulai: tambahBulan(kini, 2), tenggat: tambahBulan(kini, 8), estimasi_hemat_kwh: Math.round(wwtp * 0.1),
    metode_verifikasi: 'Bandingkan kWh blower per m³ air limbah diolah sebelum dan sesudah, dengan mutu effluent tetap memenuhi baku mutu', catatan: 'Estimasi awal 10% konsumsi WWTP; perbarui setelah kajian.',
    alasan: 'Aerasi umumnya beban terbesar WWTP; aerasi berlebih sering terjadi.', enpi: 'ENPI-04',
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
    aksi.find((x) => x.catatan?.includes(tagUsulan(u.kunci)) || x.uraian.trim().toLowerCase() === u.uraian.toLowerCase())?.kode ?? null
  return { sasaran: s, aksi: a.map((u) => ({ ...u, dipakai: dipakaiA(u) })) }
}
