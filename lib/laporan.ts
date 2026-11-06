/**
 * Model data Laporan Penilaian Kesiapan Audit (lembar cetak).
 * Murni perhitungan: semua masukan dibaca halaman server, fungsi ini hanya menyusun penilaian.
 */
import { AMBANG, type HasilEnpi } from './enpi'
import { keadaan } from './kegiatan'
import { adaBukti, INDUK_KLAUSUL, kesiapan, siapAudit, nilaiKesiapan, terlambat, tonggakDari } from './status'
import type { Dokumen, Isu, Kegiatan, Klausul, RencanaAksi, Sasaran, Temuan } from './types'

export type Rag = 'hijau' | 'kuning' | 'merah'
export const LABEL_RAG: Record<Rag, string> = { hijau: 'Memadai', kuning: 'Sebagian', merah: 'Belum memadai' }

/** Ambang RAG skor kesiapan (%). */
export const AMBANG_RAG = { hijau: 85, kuning: 60 }
export const rag = (p: number): Rag => (p >= AMBANG_RAG.hijau ? 'hijau' : p >= AMBANG_RAG.kuning ? 'kuning' : 'merah')

/**
 * Klausul yang mensyaratkan informasi terdokumentasi wajib dalam ISO 50001:2018
 * dan menjadi fokus auditor pada Stage 1 (tinjauan dokumen).
 */
export const KLAUSUL_KRITIS: Record<string, string> = {
  '4.3': 'Ruang lingkup dan batas SMEn',
  '5.2': 'Kebijakan energi',
  '6.2': 'Tujuan, target energi, dan rencana aksi',
  '6.3': 'Tinjauan energi dan SEU',
  '6.4': 'EnPI dan metodenya',
  '6.5': 'Baseline energi',
  '6.6': 'Rencana pengumpulan data energi',
  '7.2': 'Bukti kompetensi',
  '8.1': 'Rekaman pengendalian operasional',
  '8.2': 'Rekaman desain terkait kinerja energi',
  '9.1': 'Hasil pemantauan dan pengukuran',
  '9.2': 'Program dan hasil audit internal',
  '9.3': 'Hasil tinjauan manajemen',
  '10.1': 'Ketidaksesuaian dan tindakan korektif',
}

export type Putusan = { kode: 'siap' | 'bersyarat' | 'belum'; label: string; ringkas: string }

export type BarisKlausul = {
  kode: string; judul: string; induk: string
  jumlah: number; bukti: number; lewat: number
  skor: number; rag: Rag | null; kritis: boolean
}

export type Gerbang = { kriteria: string; acuan: string; hasil: 'lulus' | 'parsial' | 'gagal'; bukti: string }

export type Gap = { d: Dokumen; tingkat: 'Kritis' | 'Tinggi' | 'Sedang'; alasan: string[] }

export type Rekomendasi = { prioritas: 'P1' | 'P2' | 'P3'; tindakan: string; acuan: string; pemilik: string; batas: string }

export type BebanPic = { pic: string; total: number; belumSiap: number; lewat: number; tanpaBukti: number }

const URUT_TINGKAT = { Kritis: 0, Tinggi: 1, Sedang: 2 }

/** Kurangi n hari dari tanggal ISO (YYYY-MM-DD). */
function mundur(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

export function susunLaporan(m: {
  dokumen: Dokumen[]; klausul: Klausul[]; temuan: Temuan[]; isu: Isu[]
  kegiatan: Kegiatan[]; hasil: HasilEnpi[]; sasaran: Sasaran[]; aksi: RencanaAksi[]; kini: string
}) {
  const { dokumen, klausul, temuan, isu, kegiatan, hasil, sasaran, aksi, kini } = m
  const skor = kesiapan(dokumen)
  const nBukti = dokumen.filter(adaBukti).length
  const cakupanBukti = dokumen.length ? (nBukti / dokumen.length) * 100 : 0
  const nLewat = dokumen.filter((d) => terlambat(d, kini)).length
  const nSiap = dokumen.filter(siapAudit).length
  const sebaranBukti = [
    { s: 'final', label: 'Siap audit (Final + berkas sah)', n: nSiap },
    { s: 'review', label: 'Ada evidence, belum final/sah', n: nBukti - nSiap },
    { s: 'belum', label: 'Belum ada evidence', n: dokumen.length - nBukti },
  ]

  // Per klausul
  const perKlausul: BarisKlausul[] = klausul.filter((k) => k.kode !== 'P').map((k) => {
    const ds = dokumen.filter((d) => d.klausul_kode === k.kode)
    const s = kesiapan(ds)
    return {
      kode: k.kode, judul: k.judul, induk: INDUK_KLAUSUL[k.induk] ?? k.induk,
      jumlah: ds.length, bukti: ds.filter(adaBukti).length,
      lewat: ds.filter((d) => terlambat(d, kini)).length,
      skor: s, rag: ds.length ? rag(s) : null, kritis: k.kode in KLAUSUL_KRITIS,
    }
  })
  const perInduk = Object.entries(INDUK_KLAUSUL).filter(([k]) => k !== 'P').map(([kode, nama]) => {
    const ds = dokumen.filter((d) => klausul.find((k) => k.kode === d.klausul_kode)?.induk === kode)
    return { kode, nama, jumlah: ds.length, skor: kesiapan(ds) }
  })
  const terlemah = perKlausul.filter((k) => k.jumlah).sort((a, b) => a.skor - b.skor).slice(0, 3)
  const tanpaDokumen = perKlausul.filter((k) => !k.jumlah)

  // Temuan
  const terbuka = temuan.filter((t) => t.status !== 'Tertutup')
  const mayorTerbuka = terbuka.filter((t) => t.kategori === 'Mayor')
  const minorTerbuka = terbuka.filter((t) => t.kategori === 'Minor')
  const temuanLewat = terbuka.filter((t) => t.tenggat && t.tenggat < kini)
  const matriksTemuan = (['Mayor', 'Minor', 'Observasi', 'OFI'] as const).map((kat) => ({
    kat, ...Object.fromEntries((['Terbuka', 'Proses', 'Verifikasi', 'Tertutup'] as const).map((st) => [st, temuan.filter((t) => t.kategori === kat && t.status === st).length])) as Record<Temuan['status'], number>,
  }))

  // EnPI
  const enpiAktif = hasil.filter((h) => h.enpi.aktif)
  const enpiValid = enpiAktif.filter((h) => !h.galat && (h.enpi.metode !== 'regresi' || ((h.model?.r2 ?? 0) >= AMBANG.r2 && (h.model?.cvrmse ?? Infinity) <= AMBANG.cvrmse)))

  // Gerbang kesiapan
  const gerbang: Gerbang[] = Object.entries(KLAUSUL_KRITIS).map(([kode, nama]) => {
    const b = perKlausul.find((k) => k.kode === kode)
    if (!b || !b.jumlah) return { kriteria: nama, acuan: `Kl. ${kode}`, hasil: 'gagal', bukti: 'Belum ada dokumen terdaftar' }
    return {
      kriteria: nama, acuan: `Kl. ${kode}`,
      hasil: b.skor >= AMBANG_RAG.hijau ? 'lulus' : b.skor >= 50 ? 'parsial' : 'gagal',
      bukti: `${b.bukti}/${b.jumlah} ber-evidence · skor ${Math.round(b.skor)}%`,
    }
  })
  gerbang.push(
    { kriteria: 'Tidak ada ketidaksesuaian mayor terbuka', acuan: 'Kl. 10.1', hasil: mayorTerbuka.length ? 'gagal' : 'lulus', bukti: `${mayorTerbuka.length} mayor, ${minorTerbuka.length} minor terbuka` },
    { kriteria: 'Cakupan evidence ≥ 90% dokumen', acuan: 'Kl. 7.5', hasil: cakupanBukti >= 90 ? 'lulus' : cakupanBukti >= 60 ? 'parsial' : 'gagal', bukti: `${nBukti}/${dokumen.length} dokumen (${Math.round(cakupanBukti)}%)` },
    { kriteria: 'Dokumen terkendali: Final dengan berkas versi sah ≥ 90%', acuan: 'Kl. 7.5.2–7.5.3', hasil: skor >= 90 ? 'lulus' : skor >= 60 ? 'parsial' : 'gagal', bukti: `${nSiap}/${dokumen.length} dokumen siap audit (${Math.round(skor)}%)` },
    {
      kriteria: 'Model EnPI valid secara statistik', acuan: 'Kl. 6.4–6.5 · ISO 50006',
      hasil: !enpiAktif.length ? 'gagal' : enpiValid.length === enpiAktif.length ? 'lulus' : enpiValid.length ? 'parsial' : 'gagal',
      bukti: enpiAktif.length ? `${enpiValid.length}/${enpiAktif.length} EnPI memenuhi R² ≥ ${AMBANG.r2}, CV(RMSE) ≤ ${AMBANG.cvrmse}%` : 'Belum ada EnPI aktif',
    },
    {
      kriteria: 'Sasaran energi ditetapkan dengan rencana aksi', acuan: 'Kl. 6.2',
      hasil: !sasaran.length ? 'gagal' : sasaran.every((s) => aksi.some((a) => a.sasaran_id === s.id)) ? 'lulus' : 'parsial',
      bukti: `${sasaran.length} sasaran · ${aksi.length} rencana aksi`,
    },
  )
  const gagalKritis = gerbang.filter((g) => g.hasil === 'gagal')

  // Putusan
  const putusan: Putusan =
    skor >= AMBANG_RAG.hijau && !mayorTerbuka.length && !gagalKritis.length
      ? { kode: 'siap', label: 'Siap untuk audit sertifikasi', ringkas: 'Sistem dinilai siap menghadapi audit sertifikasi. Pertahankan disiplin evidence dan tutup temuan minor sebelum Stage 2.' }
      : skor >= AMBANG_RAG.kuning && !mayorTerbuka.length
        ? { kode: 'bersyarat', label: 'Siap bersyarat', ringkas: `Audit dapat dilanjutkan dengan syarat ${gagalKritis.length} gerbang yang belum lulus ditutup sebelum Stage 1. Risiko temuan mayor masih ada bila kesenjangan kritis tidak diselesaikan.` }
        : { kode: 'belum', label: 'Belum siap', ringkas: `Kesenjangan material masih ada${mayorTerbuka.length ? `, termasuk ${mayorTerbuka.length} ketidaksesuaian mayor terbuka` : ''}. Pertimbangkan percepatan tindakan atau penjadwalan ulang Stage 1 bila kesenjangan kritis tidak dapat ditutup tepat waktu.` }

  // Register kesenjangan
  const gap: Gap[] = dokumen.filter((d) => !adaBukti(d)).map((d) => {
    const alasan: string[] = ['Tanpa evidence']
    if (terlambat(d, kini)) alasan.push('Lewat tenggat')
    // Pakai penanda dokumen (migrasi 0015) bila ada; bila belum, pakai daftar klausul wajib
    const kritis = d.wajib_iso ?? d.klausul_kode in KLAUSUL_KRITIS
    if (kritis) alasan.push('Informasi terdokumentasi wajib')
    const tingkat: Gap['tingkat'] = kritis ? 'Kritis' : terlambat(d, kini) ? 'Tinggi' : 'Sedang'
    return { d, tingkat, alasan }
  }).sort((a, b) => URUT_TINGKAT[a.tingkat] - URUT_TINGKAT[b.tingkat] || (a.d.tenggat ?? '9999').localeCompare(b.d.tenggat ?? '9999') || a.d.kode.localeCompare(b.d.kode))

  // Beban PIC
  const peta = new Map<string, BebanPic>()
  for (const d of dokumen) {
    const p = d.pic?.trim() || 'Belum ditetapkan'
    const b = peta.get(p) ?? { pic: p, total: 0, belumSiap: 0, lewat: 0, tanpaBukti: 0 }
    b.total++
    if (nilaiKesiapan(d) < 1) b.belumSiap++
    if (terlambat(d, kini)) b.lewat++
    if (!adaBukti(d)) b.tanpaBukti++
    peta.set(p, b)
  }
  const bebanPic = [...peta.values()].filter((b) => b.belumSiap).sort((a, b) => b.lewat - a.lewat || b.belumSiap - a.belumSiap)

  // Tonggak
  const tonggak = tonggakDari(kegiatan)
  const stage1 = tonggak.find((t) => t.kode === 's1') ?? { kode: 's1', nama: 'TÜV Stage 1', tanggal: kini }
  const stage2 = tonggak.find((t) => t.kode === 's2') ?? { kode: 's2', nama: 'TÜV Stage 2', tanggal: kini }
  const batasP1 = [mundur(stage1.tanggal, 5), kini].sort().at(-1)!
  const batasP2 = stage1.tanggal > kini ? stage1.tanggal : stage2.tanggal

  // Program pendampingan
  const kg = kegiatan.map((k) => keadaan(k, kini))
  const programSelesai = kg.filter((k) => k === 'selesai').length
  const programKonfirmasi = kg.filter((k) => k === 'konfirmasi').length

  // Risiko tertinggi
  const risikoUtama = isu.filter((i) => i.jenis === 'Risiko').sort((a, b) => b.skor - a.skor).slice(0, 5)

  // Rekomendasi
  const rek: Rekomendasi[] = []
  if (mayorTerbuka.length) rek.push({ prioritas: 'P1', tindakan: `Tutup ${mayorTerbuka.length} ketidaksesuaian mayor (${mayorTerbuka.map((t) => t.nomor).join(', ')}) dengan analisis akar masalah dan bukti efektivitas tindakan.`, acuan: 'Kl. 10.1', pemilik: [...new Set(mayorTerbuka.map((t) => t.pic).filter(Boolean))].join(', ') || 'Wakil manajemen', batas: batasP1 })
  for (const g of gerbang.filter((x) => x.hasil === 'gagal' && x.acuan.startsWith('Kl. ') && x.acuan.split(' ')[1] in KLAUSUL_KRITIS)) {
    const kode = g.acuan.split(' ')[1]
    const pics = [...new Set(dokumen.filter((d) => d.klausul_kode === kode && nilaiKesiapan(d) < 1).map((d) => d.pic).filter(Boolean))]
    rek.push({ prioritas: 'P1', tindakan: `Lengkapi informasi terdokumentasi wajib: ${g.kriteria.toLowerCase()} (${g.bukti.toLowerCase()}).`, acuan: g.acuan, pemilik: pics.join(', ') || 'Tim KINRA', batas: batasP1 })
  }
  const nTanpaBukti = dokumen.length - nBukti
  if (nBukti - nSiap > 0) rek.push({ prioritas: 'P1', tindakan: `Sahkan ${nBukti - nSiap} dokumen yang evidence-nya masih draf: tetapkan status Final dan tandai berkas versi sah (bernomor, berrevisi, bertanggal berlaku, ditandatangani).`, acuan: 'Kl. 7.5.2', pemilik: 'Dokumen Kontrol & PIC dokumen', batas: batasP1 })
  if (nTanpaBukti) rek.push({ prioritas: cakupanBukti < 60 ? 'P1' : 'P2', tindakan: `Unggah evidence untuk ${nTanpaBukti} dokumen yang belum memiliki berkas; auditor hanya menilai bukti yang dapat diperiksa.`, acuan: 'Kl. 7.5', pemilik: 'Seluruh PIC dokumen', batas: batasP1 })
  if (nLewat) rek.push({ prioritas: 'P2', tindakan: `Eskalasi ${nLewat} dokumen lewat tenggat ke PIC: ${bebanPic.filter((b) => b.lewat).slice(0, 4).map((b) => `${b.pic} (${b.lewat})`).join(', ')}.`, acuan: 'Kl. 5.3', pemilik: 'Wakil manajemen', batas: batasP1 })
  if (enpiAktif.length > enpiValid.length) rek.push({ prioritas: 'P2', tindakan: `Perbaiki ${enpiAktif.length - enpiValid.length} model EnPI yang belum memenuhi ambang validitas (tambah variabel relevan, perpanjang periode baseline, atau ganti metode).`, acuan: 'Kl. 6.4–6.5', pemilik: 'Tim energi', batas: batasP2 })
  for (const k of terlemah.filter((x) => x.skor < AMBANG_RAG.hijau && !(x.kritis && gerbang.find((g) => g.acuan === `Kl. ${x.kode}`)?.hasil === 'gagal'))) {
    rek.push({ prioritas: 'P2', tindakan: `Naikkan kesiapan klausul ${k.kode} ${k.judul.toLowerCase()} dari ${Math.round(k.skor)}%: ${k.jumlah - k.bukti} dokumen belum ada evidence.`, acuan: `Kl. ${k.kode}`, pemilik: 'PIC klausul', batas: batasP2 })
  }
  if (temuanLewat.length) rek.push({ prioritas: 'P2', tindakan: `Tindak lanjuti ${temuanLewat.length} temuan yang melewati tenggat koreksi.`, acuan: 'Kl. 10.1', pemilik: 'PIC temuan', batas: batasP1 })
  if (minorTerbuka.length) rek.push({ prioritas: 'P3', tindakan: `Selesaikan ${minorTerbuka.length} ketidaksesuaian minor dan siapkan bukti verifikasi untuk auditor.`, acuan: 'Kl. 10.1', pemilik: 'PIC temuan', batas: stage2.tanggal })
  if (programKonfirmasi) rek.push({ prioritas: 'P3', tindakan: `Konfirmasi ${programKonfirmasi} kegiatan pendampingan yang jadwalnya sudah lewat dan arsipkan daftar hadir sebagai bukti kompetensi.`, acuan: 'Kl. 7.2–7.3', pemilik: 'Tim KINRA', batas: batasP1 })
  rek.push({ prioritas: 'P3', tindakan: 'Lakukan simulasi wawancara auditor untuk pemilik SEU dan pengendali operasional; pastikan kebijakan energi dipahami di semua tingkat.', acuan: 'Kl. 7.3', pemilik: 'Wakil manajemen', batas: batasP2 })

  return {
    skor, ragSkor: rag(skor), putusan,
    jumlah: dokumen.length, nBukti, cakupanBukti, nLewat, sebaranBukti,
    perKlausul, perInduk, terlemah, tanpaDokumen,
    temuan: { total: temuan.length, terbuka, mayorTerbuka, minorTerbuka, temuanLewat, matriks: matriksTemuan },
    enpi: { aktif: enpiAktif, valid: enpiValid },
    gerbang, gap, bebanPic, tonggak, stage1, stage2,
    program: { total: kegiatan.length, selesai: programSelesai, konfirmasi: programKonfirmasi },
    risikoUtama, rekomendasi: rek, sasaran, aksi,
  }
}

export type Laporan = ReturnType<typeof susunLaporan>
