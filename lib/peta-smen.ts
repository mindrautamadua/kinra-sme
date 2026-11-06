/**
 * Peta SMEn: 12 tahap siklus PDCA ISO 50001 dengan penjelasan awam dan status yang dihitung dari data aplikasi.
 * Dipakai halaman Peta SMEn dan strip ringkas di Ringkasan.
 */
import { modelLayak, type HasilEnpi } from './enpi'
import { angka, persen } from './format'
import { kemajuan, kesiapan } from './status'
import type { Dokumen, Isu, MeterEnergi, PembacaanMeter, Peluang, RencanaAksi, Sasaran, Seu, Temuan, TinjauanEnergi } from './types'

export type StatusTahap = 'selesai' | 'berjalan' | 'menunggu' | 'belum'
export type Fase = 'Plan' | 'Do' | 'Check' | 'Act'

export type Tahap = {
  no: number
  fase: Fase
  nama: string
  /** Penjelasan dalam bahasa sehari-hari, satu kalimat */
  artinya: string
  klausul: string
  href: string
  status: StatusTahap
  /** Keadaan KINRA saat ini, dari data */
  diKinra: string
  /** Pertanyaan khas auditor */
  auditor: string
  /** Langkah berikutnya bila belum selesai */
  langkah: string | null
  tergantung: number[]
  memengaruhi: number[]
}

export const LABEL_STATUS: Record<StatusTahap, string> = { selesai: 'Sudah', berjalan: 'Berjalan', menunggu: 'Menunggu data', belum: 'Belum' }

type Masukan = {
  dokumen: Dokumen[]; isu: Isu[]; peluang: Peluang[]; seu: Seu[]; tinjauan: TinjauanEnergi | null
  hasil: HasilEnpi[]; sasaran: Sasaran[]; aksi: RencanaAksi[]; temuan: Temuan[]
  meter: MeterEnergi[]; bacaan: PembacaanMeter[]; kini: string
  /** Deviasi signifikan yang belum ditutup (lib/deviasi.ts) */
  deviasiBuka?: number
}

/** Status dari persentase dokumen ber-evidence pada klausul tertentu. */
function dariDokumen(dokumen: Dokumen[], awalan: string[]) {
  const ds = dokumen.filter((d) => d.klausul_kode && awalan.some((a) => d.klausul_kode === a || d.klausul_kode!.startsWith(`${a}.`)))
  const p = kesiapan(ds)
  const b = kemajuan(ds)
  const status: StatusTahap = !ds.length ? 'belum' : p >= 100 ? 'selesai' : p > 0 || b > 0 ? 'berjalan' : 'belum'
  return { status, teks: ds.length ? `${persen(p, 0)} dokumen klausul ${awalan.join(', ')} siap audit (Final + berkas sah), evidence ${persen(b, 0)} (${ds.length} dokumen)` : `Belum ada dokumen klausul ${awalan.join(', ')} di lembar Kesiapan`, p }
}

export function susunPeta(m: Masukan): Tahap[] {
  const { dokumen, isu, peluang, seu, tinjauan, hasil, sasaran, aksi, temuan, meter, bacaan, kini, deviasiBuka = 0 } = m

  const d4 = dariDokumen(dokumen, ['4'])
  const d5 = dariDokumen(dokumen, ['5'])
  const d61 = dariDokumen(dokumen, ['6.1'])
  const d7 = dariDokumen(dokumen, ['7'])
  const d8 = dariDokumen(dokumen, ['8'])
  const d92 = dariDokumen(dokumen, ['9.2'])
  const d93 = dariDokumen(dokumen, ['9.3'])

  // ④ SEU
  const seuTetap = seu.filter((s) => s.status === 'Ditetapkan')
  const seuKandidat = seu.filter((s) => s.status === 'Kandidat')
  const s4: StatusTahap = seuTetap.length && tinjauan?.status === 'Disetujui' ? 'selesai' : seu.length ? 'berjalan' : 'belum'

  // ⑤ EnPI lingkup KINRA
  const kinra = hasil.filter((h) => h.enpi.aktif && (h.enpi.lingkup ?? 'kinra') === 'kinra')
  const layak = kinra.filter((h) => h.enpi.metode !== 'absolut' && modelLayak(h.model) && !h.ekstrapolasi)
  const tungguMeter = kinra.filter((h) => h.enpi.meter_kode?.length && (h.galat || !h.model))
  const s5: StatusTahap = layak.length ? 'selesai' : tungguMeter.length ? 'menunggu' : kinra.length ? 'berjalan' : 'belum'

  // ⑥ Sasaran yang terhubung ke EnPI lingkup KINRA
  const kodeKinra = new Set(kinra.map((h) => h.enpi.kode))
  const sasAktif = sasaran.filter((s) => s.status === 'Aktif')
  const sasKinra = sasAktif.filter((s) => s.enpi_kode && kodeKinra.has(s.enpi_kode))
  const aksiJalan = aksi.filter((a) => a.status === 'Berjalan' || a.status === 'Selesai')
  const s6: StatusTahap = sasKinra.length && aksiJalan.length ? 'selesai' : sasAktif.length || aksi.length ? 'berjalan' : 'belum'

  // ⑨ Pemantauan: bacaan meter bulan lalu
  const [th, bl] = [Number(kini.slice(0, 4)), Number(kini.slice(5, 7))]
  const lalu = bl === 1 ? { t: th - 1, b: 12 } : { t: th, b: bl - 1 }
  const terbaca = new Set(bacaan.filter((x) => x.tahun === lalu.t && x.bulan === lalu.b && x.stand_awal !== null && x.stand_akhir !== null).map((x) => x.meter_kode))
  const adaBacaan = bacaan.length > 0
  const s9Dasar: StatusTahap = !meter.length ? 'belum' : terbaca.size >= meter.length ? 'selesai' : adaBacaan ? 'berjalan' : 'menunggu'
  const s9: StatusTahap = s9Dasar === 'selesai' && deviasiBuka > 0 ? 'berjalan' : s9Dasar
  const kalibrasiKosong = meter.filter((x) => !x.kalibrasi_terakhir).length

  // ⑩ ⑫ Audit & perbaikan
  const temuanInternal = temuan.filter((t) => t.jenis_audit === 'Internal')
  const terbuka = temuan.filter((t) => t.status !== 'Tertutup')
  const s10: StatusTahap = temuanInternal.length && d92.status === 'selesai' ? 'selesai' : temuanInternal.length || d92.status !== 'belum' ? 'berjalan' : 'belum'
  const s12: StatusTahap = !temuan.length ? 'belum' : terbuka.length ? 'berjalan' : 'selesai'

  const isuBertindak = isu.filter((i) => i.tindakan).length

  return [
    {
      no: 1, fase: 'Plan', nama: 'Konteks & ruang lingkup', klausul: '4.1–4.4', href: '/kesiapan',
      artinya: 'Tentukan batas: energi mana yang dikelola KINRA dan mana yang bukan (mis. listrik tenant).',
      status: d4.status, diKinra: `${d4.teks}. Listrik tenant sudah dipisahkan dari lingkup KINRA.`,
      auditor: 'Apa batas SMEn Anda dan mengapa tenant dikecualikan?',
      langkah: d4.status === 'selesai' ? null : 'Lengkapi evidence dokumen klausul 4 dan lampirkan daftar aset serta diagram meter ke dokumen Ruang Lingkup.',
      tergantung: [], memengaruhi: [3, 4],
    },
    {
      no: 2, fase: 'Plan', nama: 'Kepemimpinan & kebijakan energi', klausul: '5.1–5.3', href: '/kesiapan',
      artinya: 'Direksi berkomitmen, menetapkan kebijakan energi, dan menunjuk tim energi beserta wewenangnya.',
      status: d5.status, diKinra: d5.teks,
      auditor: 'Bagaimana direksi menunjukkan komitmen, dan siapa tim energi Anda?',
      langkah: d5.status === 'selesai' ? null : 'Pastikan kebijakan energi ditandatangani dan SK Tim Energi diunggah sebagai evidence.',
      tergantung: [], memengaruhi: [6, 11],
    },
    {
      no: 3, fase: 'Plan', nama: 'Risiko & peluang', klausul: '6.1', href: '/register',
      artinya: 'Daftar hal yang bisa menggagalkan atau memperkuat SMEn, beserta tindakannya.',
      status: isu.length && isuBertindak === isu.length ? (d61.status === 'belum' ? 'berjalan' : d61.status) : isu.length ? 'berjalan' : 'belum',
      diKinra: `${isu.length} isu (${isuBertindak} sudah ada tindakan) dan ${peluang.length} peluang peningkatan tercatat.`,
      auditor: 'Risiko apa yang Anda identifikasi dan bagaimana mengendalikannya?',
      langkah: isuBertindak < isu.length ? `Isi tindakan untuk ${isu.length - isuBertindak} isu yang belum punya tindakan.` : null,
      tergantung: [1], memengaruhi: [6],
    },
    {
      no: 4, fase: 'Plan', nama: 'Tinjauan energi & SEU', klausul: '6.3', href: '/tinjauan',
      artinya: 'Cari tahu di mana energi paling banyak dipakai, lalu tetapkan fokus pengelolaan (SEU).',
      status: s4,
      diKinra: seu.length ? `${seuTetap.length} SEU ditetapkan, ${seuKandidat.length} kandidat. Tinjauan energi ${tinjauan?.status === 'Disetujui' ? 'sudah disetujui' : 'masih draft'}.` : 'Belum ada SEU di register.',
      auditor: 'Tunjukkan bagaimana Anda menentukan SEU dan siapa yang memengaruhinya.',
      langkah: s4 === 'selesai' ? null : seuKandidat.length ? 'Admin/konsultan menetapkan kandidat SEU dan menyetujui catatan tinjauan energi.' : 'Usulkan SEU dari Pareto pengguna energi.',
      tergantung: [1, 9], memengaruhi: [5, 6, 7, 8],
    },
    {
      no: 5, fase: 'Plan', nama: 'EnPI & baseline energi', klausul: '6.4–6.5', href: '/kinerja',
      artinya: 'Pilih alat ukur kinerja energi dan titik awal pembanding yang adil.',
      status: s5,
      diKinra: kinra.length
        ? `${kinra.length} EnPI lingkup KINRA; ${layak.length} dengan model layak. ${tungguMeter.length ? `${tungguMeter.map((h) => h.enpi.kode).join(', ')} menunggu bacaan meter.` : ''}`
        : 'Belum ada EnPI lingkup KINRA.',
      auditor: 'Bagaimana Anda tahu kinerja energi membaik, bukan hanya karena beban turun?',
      langkah: s5 === 'selesai' ? null : 'Isi bacaan meter bulanan; bila audit lebih dulu, siapkan baseline sementara dari tagihan per sambungan aset KINRA.',
      tergantung: [4, 9], memengaruhi: [6, 11],
    },
    {
      no: 6, fase: 'Plan', nama: 'Sasaran & rencana aksi', klausul: '6.2', href: '/sasaran',
      artinya: 'Tetapkan target penghematan yang terukur dan langkah konkret untuk mencapainya.',
      status: s6,
      diKinra: `${sasAktif.length} sasaran aktif (${sasKinra.length} terhubung EnPI lingkup KINRA); ${aksi.length} rencana aksi, ${aksiJalan.length} berjalan/selesai.`,
      auditor: 'Apa target energi Anda dan siapa melakukan apa untuk mencapainya?',
      langkah: sasKinra.length ? null : 'Hubungkan sasaran ke EnPI lingkup KINRA (EnPI-04/05), bukan EnPI kawasan.',
      tergantung: [3, 4, 5], memengaruhi: [8],
    },
    {
      no: 7, fase: 'Do', nama: 'Dukungan: kompetensi, komunikasi, dokumen', klausul: '7.1–7.5', href: '/kesiapan',
      artinya: 'Pastikan orang yang memengaruhi SEU kompeten dan sadar, serta dokumen terkendali.',
      status: d7.status, diKinra: `${d7.teks}. Personel SEU tercatat di register SEU.`,
      auditor: 'Siapa yang bekerja di SEU dan apa bukti kompetensinya?',
      langkah: d7.status === 'selesai' ? null : 'Unggah bukti pelatihan/sosialisasi untuk personel SEU.',
      tergantung: [4], memengaruhi: [8],
    },
    {
      no: 8, fase: 'Do', nama: 'Operasi: pengendalian SEU, desain, pengadaan', klausul: '8.1–8.3', href: '/kesiapan',
      artinya: 'Jalankan SEU dengan kriteria operasi yang jelas, dan pertimbangkan efisiensi saat membeli atau merancang.',
      status: d8.status, diKinra: d8.teks,
      auditor: 'Apa kriteria operasi pompa WTP dan bagaimana Anda memastikannya dipatuhi?',
      langkah: d8.status === 'selesai' ? null : 'Tetapkan kriteria operasi dan pemeliharaan untuk setiap SEU.',
      tergantung: [4, 6, 7], memengaruhi: [9],
    },
    {
      no: 9, fase: 'Check', nama: 'Pemantauan & pengukuran', klausul: '9.1', href: '/aset',
      artinya: 'Ukur energi secara rutin dengan meter yang andal, lalu bandingkan dengan target.',
      status: s9,
      diKinra: meter.length
        ? `${terbaca.size} dari ${meter.length} meter terbaca bulan lalu. ${kalibrasiKosong} meter belum punya data kalibrasi. ${deviasiBuka ? `${deviasiBuka} deviasi signifikan belum ditutup.` : 'Tidak ada deviasi signifikan terbuka.'}`
        : 'Belum ada meter terdaftar.',
      auditor: 'Tunjukkan rencana pengukuran, bukti kalibrasi meter, dan bagaimana deviasi signifikan diselidiki.',
      langkah: deviasiBuka ? `Selidiki dan tanggapi ${deviasiBuka} deviasi signifikan di halaman Kinerja Energi.` : s9 === 'selesai' && !kalibrasiKosong ? null : 'Isi bacaan stand setiap bulan dan lengkapi data kalibrasi meter.',
      tergantung: [], memengaruhi: [4, 5, 11],
    },
    {
      no: 10, fase: 'Check', nama: 'Audit internal', klausul: '9.2', href: '/temuan',
      artinya: 'Periksa sendiri apakah SMEn berjalan sesuai aturan sebelum auditor eksternal datang.',
      status: s10, diKinra: `${temuanInternal.length} temuan audit internal tercatat. ${d92.teks}.`,
      auditor: 'Kapan audit internal dilakukan, oleh siapa, dan apa hasilnya?',
      langkah: s10 === 'selesai' ? null : 'Laksanakan audit internal sesuai jadwal dan catat temuannya.',
      tergantung: [], memengaruhi: [11, 12],
    },
    {
      no: 11, fase: 'Act', nama: 'Tinjauan manajemen', klausul: '9.3', href: '/kesiapan',
      artinya: 'Direksi menilai hasil SMEn dan memutuskan perbaikan serta sumber daya.',
      status: d93.status, diKinra: d93.teks,
      auditor: 'Apa keputusan direksi dari tinjauan manajemen terakhir?',
      langkah: d93.status === 'selesai' ? null : 'Jadwalkan tinjauan manajemen setelah audit internal; gunakan data EnPI, SEU, dan temuan sebagai masukan.',
      tergantung: [5, 9, 10], memengaruhi: [12],
    },
    {
      no: 12, fase: 'Act', nama: 'Perbaikan berkelanjutan', klausul: '10.1–10.2', href: '/temuan',
      artinya: 'Tutup temuan dengan memperbaiki akar masalah, lalu ulangi siklus dengan target yang lebih baik.',
      status: s12, diKinra: temuan.length ? `${terbuka.length} dari ${temuan.length} temuan masih terbuka.` : 'Belum ada temuan tercatat.',
      auditor: 'Bagaimana Anda memastikan ketidaksesuaian tidak terulang?',
      langkah: terbuka.length ? `Tindak lanjuti ${angka(terbuka.length)} temuan terbuka sampai terverifikasi.` : null,
      tergantung: [10, 11], memengaruhi: [1],
    },
  ]
}
