/**
 * Simulasi audit bersama KIRA: penyusunan soal (bank soal + celah nyata dari data aplikasi)
 * dan prediksi temuan berbasis aturan. Penilaian jawaban dilakukan Gemini di server action.
 */
import type { DeviasiTerdeteksi } from './deviasi'
import type { HasilEnpi } from './enpi'
import { adaBukti } from './status'
import { UNIT_AUDIT } from './tanya-jawab'
import type { Deviasi, Dokumen, Isu, MeterEnergi, PembacaanMeter, Sasaran, Seu, Temuan } from './types'

export type ModeSimulasi = 'stage1' | 'stage2'
export type Keparahan = 'Mayor' | 'Minor' | 'OFI'

export const LABEL_MODE: Record<ModeSimulasi, string> = { stage1: 'Stage 1 · kecukupan dokumen', stage2: 'Stage 2 · implementasi' }

export type Celah = { klausul: string; keparahan: Keparahan; fakta: string; tanya: string; tahap: 'dokumen' | 'implementasi' }

export type Soal = {
  id: string
  sumber: 'bank' | 'celah'
  klausul: string[]
  tanya: string
  /** Acuan untuk penilai: contoh jawaban + bukti (bank) atau fakta celah dari data */
  acuan: string
  bukti: string
  keparahan: Keparahan | null
}

export type HasilSoal = { soal: Soal; jawaban: string; skor: number; alasan: string; bukti: string }
export type Prediksi = { kategori: Keparahan; klausul: string; uraian: string }

/** Klausul utama ("6.3" dari "6.3.1"), untuk mencocokkan celah dengan unit. */
const utama = (k: string) => k.split('.').slice(0, 2).join('.')

/** Celah nyata dari data aplikasi, disusun seperti pertanyaan auditor. */
export function susunCelah(d: {
  dokumen: Dokumen[]; seu: Seu[]; hasil: HasilEnpi[]; meter: MeterEnergi[]; bacaan: PembacaanMeter[]
  deviasi: { d: DeviasiTerdeteksi; r: Deviasi | null }[]; temuan: Temuan[]; sasaran: Sasaran[]; isu: Isu[]; kini: string
}): Celah[] {
  const c: Celah[] = []

  // Dokumen tanpa evidence per klausul
  const perKlausul = new Map<string, Dokumen[]>()
  for (const x of d.dokumen) if (x.klausul_kode && x.klausul_kode !== 'P') perKlausul.set(x.klausul_kode, [...(perKlausul.get(x.klausul_kode) ?? []), x])
  for (const [k, ds] of perKlausul) {
    const kosong = ds.filter((x) => !adaBukti(x))
    if (!kosong.length) continue
    c.push({
      klausul: k, keparahan: kosong.length === ds.length ? 'Mayor' : 'Minor', tahap: 'dokumen',
      fakta: `Klausul ${k}: ${kosong.length} dari ${ds.length} dokumen belum ada evidence (${kosong.slice(0, 3).map((x) => x.nama).join('; ')}).`,
      tanya: `Untuk klausul ${k}, tunjukkan ${kosong[0].nama.toLowerCase()} yang berlaku dan bukti penerapannya.`,
    })
  }

  // SEU
  const tetap = d.seu.filter((s) => s.status === 'Ditetapkan')
  if (!tetap.length) {
    c.push({
      klausul: '6.3', keparahan: 'Mayor', tahap: 'implementasi',
      fakta: d.seu.length ? `SEU masih berstatus kandidat (${d.seu.map((s) => s.nama).join(', ')}), belum ditetapkan resmi.` : 'Belum ada SEU di register.',
      tanya: 'Bagaimana organisasi menentukan penggunaan energi signifikan (SEU)? Siapa yang menetapkannya, dengan kriteria apa, dan mana buktinya?',
    })
  } else if (tetap.some((s) => !s.personel || !s.variabel_kode.length)) {
    c.push({
      klausul: '6.3', keparahan: 'Minor', tahap: 'implementasi',
      fakta: 'Sebagian SEU belum mencantumkan personel terkait atau variabel relevan.',
      tanya: 'Untuk setiap SEU, siapa personel yang pekerjaannya memengaruhinya dan apa variabel relevannya?',
    })
  }

  // EnPI lingkup KINRA
  const kinra = d.hasil.filter((h) => h.enpi.aktif && (h.enpi.lingkup ?? 'kinra') === 'kinra')
  const tanpaData = kinra.filter((h) => h.galat || !h.model)
  if (!kinra.length || tanpaData.length === kinra.length) {
    c.push({
      klausul: '6.4', keparahan: 'Minor', tahap: 'implementasi',
      fakta: `EnPI lingkup KINRA belum punya data pembanding (${tanpaData.map((h) => h.enpi.kode).join(', ') || 'tidak ada EnPI'}).`,
      tanya: 'Bagaimana Anda menunjukkan bahwa kinerja energi membaik? Tunjukkan EnPI, baseline energi, dan data terbarunya.',
    })
  }

  // Deviasi signifikan
  const devBuka = d.deviasi.filter((x) => !x.r)
  if (devBuka.length) {
    c.push({
      klausul: '9.1', keparahan: 'Minor', tahap: 'implementasi',
      fakta: `${devBuka.length} deviasi signifikan belum diselidiki (${[...new Set(devBuka.map((x) => x.d.enpi_kode))].join(', ')}), mis. ${devBuka[0].d.label} ${devBuka[0].d.selisih_persen !== null ? `${devBuka[0].d.selisih_persen > 0 ? '+' : ''}${devBuka[0].d.selisih_persen.toFixed(0)}%` : ''}.`,
      tanya: `Data menunjukkan ${devBuka[0].d.enpi_kode} (${devBuka[0].d.enpi_nama}) pada ${devBuka[0].d.label} menyimpang dari harapan. Apakah deviasi ini sudah diselidiki? Apa penyebab dan tanggapannya?`,
    })
  }

  // Meter: kalibrasi dan bacaan
  const tanpaKalibrasi = d.meter.filter((m) => !m.kalibrasi_terakhir)
  if (tanpaKalibrasi.length) {
    c.push({
      klausul: '7.1', keparahan: 'Minor', tahap: 'implementasi',
      fakta: `${tanpaKalibrasi.length} dari ${d.meter.length} meter belum punya data kalibrasi/verifikasi.`,
      tanya: 'Bagaimana Anda memastikan meter energi yang dipakai untuk EnPI akurat? Tunjukkan bukti kalibrasi atau verifikasinya.',
    })
  }
  const [th, bl] = [Number(d.kini.slice(0, 4)), Number(d.kini.slice(5, 7))]
  const lalu = bl === 1 ? { t: th - 1, b: 12 } : { t: th, b: bl - 1 }
  const terbaca = new Set(d.bacaan.filter((x) => x.tahun === lalu.t && x.bulan === lalu.b && x.stand_akhir !== null).map((x) => x.meter_kode))
  if (d.meter.length && terbaca.size < d.meter.length) {
    c.push({
      klausul: '6.6', keparahan: 'Minor', tahap: 'implementasi',
      fakta: `Hanya ${terbaca.size} dari ${d.meter.length} meter terbaca bulan lalu.`,
      tanya: 'Tunjukkan rencana pengumpulan data energi: apa yang diukur, seberapa sering, oleh siapa, dan catatan pembacaan bulan lalu.',
    })
  }

  // Sasaran
  const kodeKinra = new Set(kinra.map((h) => h.enpi.kode))
  const aktif = d.sasaran.filter((s) => s.status === 'Aktif')
  if (!aktif.some((s) => s.enpi_kode && kodeKinra.has(s.enpi_kode))) {
    c.push({
      klausul: '6.2', keparahan: aktif.length ? 'Minor' : 'Mayor', tahap: 'dokumen',
      fakta: aktif.length ? 'Sasaran energi aktif belum terhubung ke EnPI lingkup KINRA.' : 'Belum ada sasaran energi aktif.',
      tanya: 'Apa sasaran dan target energi organisasi, bagaimana mengukurnya, dan bagaimana kaitannya dengan SEU?',
    })
  }

  // Temuan terbuka lewat tenggat
  const lewat = d.temuan.filter((t) => t.status !== 'Tertutup' && t.tenggat && t.tenggat < d.kini)
  if (lewat.length) {
    c.push({
      klausul: '10.1', keparahan: 'Minor', tahap: 'implementasi',
      fakta: `${lewat.length} temuan masih terbuka melewati tenggat.`,
      tanya: 'Bagaimana ketidaksesuaian ditindaklanjuti? Tunjukkan analisis akar masalah, tindakan korektif, dan verifikasi efektivitasnya.',
    })
  }

  // Isu tanpa tindakan
  const tanpaTindakan = d.isu.filter((i) => !i.tindakan)
  if (tanpaTindakan.length) {
    c.push({
      klausul: '6.1', keparahan: 'OFI', tahap: 'dokumen',
      fakta: `${tanpaTindakan.length} isu risiko/peluang belum punya tindakan.`,
      tanya: 'Bagaimana risiko dan peluang SMEn ditangani? Tunjukkan tindakan dan cara mengevaluasi efektivitasnya.',
    })
  }
  return c
}

/** Klausul yang menjadi tanggung jawab unit (dari pertanyaan materi). */
export function klausulUnit(unitNo: number): Set<string> {
  const u = UNIT_AUDIT.find((x) => x.no === unitNo)
  return new Set((u?.tanya ?? []).flatMap((t) => t.klausul.map(utama)))
}

const acak = <T,>(a: T[]) => a.map((x) => [Math.random(), x] as const).sort((p, q) => p[0] - q[0]).map(([, x]) => x)

/** Susun soal: ±60% bank soal unit, ±40% celah nyata yang relevan dengan klausul unit dan tahap audit. */
export function susunSoal(unitNo: number, mode: ModeSimulasi, jumlah: number, celah: Celah[]): Soal[] {
  const u = UNIT_AUDIT.find((x) => x.no === unitNo)
  if (!u) return []
  const kl = klausulUnit(unitNo)
  const cocok = celah
    .filter((c) => kl.has(utama(c.klausul)) || kl.has(c.klausul))
    .sort((a, b) => Number(b.tahap === (mode === 'stage1' ? 'dokumen' : 'implementasi')) - Number(a.tahap === (mode === 'stage1' ? 'dokumen' : 'implementasi'))
      || ['Mayor', 'Minor', 'OFI'].indexOf(a.keparahan) - ['Mayor', 'Minor', 'OFI'].indexOf(b.keparahan))
  // ±40% celah; bila bank soal unit tidak cukup, sisa kuota diisi celah
  const nCelah = Math.min(cocok.length, Math.max(Math.round(jumlah * 0.4), jumlah - u.tanya.length))
  const bank = acak(u.tanya).slice(0, jumlah - nCelah)
  const soalCelah: Soal[] = cocok.slice(0, nCelah).map((c, i) => ({
    id: `c${i}`, sumber: 'celah', klausul: [c.klausul], tanya: c.tanya, acuan: `Fakta dari data aplikasi: ${c.fakta}`,
    bukti: 'Bukti objektif yang menutup celah tersebut (dokumen terkendali, rekaman, notulen, data).', keparahan: c.keparahan,
  }))
  const soalBank: Soal[] = bank.map((t) => ({
    id: `b${u.no}-${t.no}`, sumber: 'bank', klausul: t.klausul, tanya: t.tanya,
    acuan: t.jawab.join(' '), bukti: `${t.bukti} Indikator: ${t.indikator}`, keparahan: null,
  }))
  // Selingi: celah tidak menumpuk di awal
  const hasil: Soal[] = []
  const b = [...soalBank], c = [...soalCelah]
  while (b.length || c.length) {
    if (b.length) hasil.push(b.shift()!)
    if (c.length && (hasil.length % 2 === 0 || !b.length)) hasil.push(c.shift()!)
  }
  return hasil.slice(0, jumlah)
}

const TINGKAT: (Keparahan | null)[] = [null, 'OFI', 'Minor', 'Mayor']
const geser = (k: Keparahan | null, n: number): Keparahan | null => TINGKAT[Math.max(0, Math.min(3, TINGKAT.indexOf(k) + n))]

/**
 * Prediksi temuan per soal. Celah data menetapkan dasar keparahan; kualitas jawaban menggeser:
 * skor 0 menaikkan OFI menjadi Minor (Minor/Mayor tetap), skor 3 turun satu tingkat.
 * Soal bank tanpa celah: skor 0 = Minor, skor 1 = OFI, skor ≥ 2 = tidak ada temuan.
 */
export function prediksiTemuan(hasil: HasilSoal[]): Prediksi[] {
  const per = new Map<string, Prediksi>()
  for (const h of hasil) {
    const k = h.soal.keparahan
      ? geser(h.soal.keparahan, h.skor === 0 ? (h.soal.keparahan === 'OFI' ? 1 : 0) : h.skor === 3 ? -1 : 0)
      : h.skor === 0 ? 'Minor' : h.skor === 1 ? 'OFI' : null
    if (!k) continue
    const klausul = h.soal.klausul[0]
    const lama = per.get(klausul)
    if (!lama || TINGKAT.indexOf(k) > TINGKAT.indexOf(lama.kategori)) {
      per.set(klausul, { kategori: k, klausul, uraian: h.soal.sumber === 'celah' ? h.soal.acuan.replace('Fakta dari data aplikasi: ', '') : `Jawaban atas "${h.soal.tanya}" belum menunjukkan bukti yang memadai.` })
    }
  }
  return [...per.values()].sort((a, b) => TINGKAT.indexOf(b.kategori) - TINGKAT.indexOf(a.kategori))
}
