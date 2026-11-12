import 'server-only'
import { bacaFormulir, type HasilBaca, type IsuFormulir, kunciNama, LABEL_FORMULIR, type PeluangFormulir } from './baca-formulir'
import { BUCKET_BUKTI } from './status'
import { db } from './supabase'
import type { Isu, Peluang } from './types'

/**
 * Sinkron register isu & peluang dari berkas formulir yang diupload sebagai evidence (klausul 4.1, 6.1, 6.2).
 * Per formulir dipakai berkas bertanda versi sah; bila tidak ada, berkas yang paling baru diunggah.
 * Pratinjau menghitung selisih; penerapan menghitung ulang di server lalu menulis hanya sumber yang dipilih.
 */

type BerkasCalon = { id: string; path: string; nama_file: string; sah: boolean; diunggah_at: string; dokumen: string }

export type RingkasBaris = { label: string; detail?: string }
export type Ubahan = { label: string; kolom: string[] }

export type SumberSinkron = {
  kunci: string
  judul: string
  berkas: { nama: string; sah: boolean; at: string; dokumen: string }[]
  diabaikan: string[]
  tambah: RingkasBaris[]
  ubah: Ubahan[]
  hapus: RingkasBaris[]
  sama: number
  dilewati: string[]
  catatan: string[]
}

export type Pratinjau = {
  sumber: SumberSinkron[]
  /** Bagian yang punya risiko 6.1 di register tetapi tidak ada berkasnya: tidak disentuh */
  tanpaBerkas: string[]
  tidakDikenali: string[]
  galat: string[]
  diperiksa: number
}

type RencanaIsu = { kunci: string; tambah: IsuFormulir[]; ubah: { id: number; data: IsuFormulir }[]; hapus: number[] }
type RencanaPeluang = { kunci: 'peluang'; tambah: (Partial<Peluang> & { kode: string })[]; ubah: { kode: string; data: Partial<Peluang> }[]; hapus: string[] }
type Rencana = RencanaIsu | RencanaPeluang

const KLAUSUL_SUMBER = ['4.1', '6.1', '6.2']
const PRA_RISIKO = 'Formulir Risiko 6.1'
const PRA_ISU41 = 'Formulir Isu 4.1'

const sama = (a: unknown, b: unknown) => (a ?? null) === (b ?? null) || (typeof a === 'string' && typeof b === 'string' && a.trim() === b.trim())
const potong = (s: string | null | undefined, n = 90) => (s ?? '').length > n ? `${(s ?? '').slice(0, n)}…` : s ?? ''

const KOLOM_ISU: [keyof IsuFormulir, string][] = [
  ['asal', 'asal'], ['jenis', 'jenis'], ['proses', 'proses'], ['uraian', 'uraian'], ['dampak', 'dampak'], ['kemungkinan', 'kemungkinan'],
  ['dampak_residual', 'dampak residual'], ['kemungkinan_residual', 'kemungkinan residual'], ['signifikan', 'signifikan'],
  ['tindakan', 'tindakan'], ['evaluasi', 'evaluasi'], ['pic', 'PIC'], ['target', 'target'], ['sumber', 'sumber'],
]

const KOLOM_PELUANG: [keyof Peluang, string][] = [
  ['uraian', 'nama'], ['deskripsi', 'deskripsi'], ['seu_terkait', 'SEU terkait'], ['sasaran_teks', 'sasaran'], ['pemilik', 'penanggung jawab'],
  ['tanggal_identifikasi', 'tanggal identifikasi'], ['estimasi_kwh', 'estimasi kWh'], ['metode', 'metode'], ['sumber', 'sumber'], ['kunci', 'kunci'],
]

/**
 * Pemetaan awal peluang lama (seed P-01..P-10) ke nama di formulir, dipakai sekali saat baris lama belum punya `kunci`.
 * Sesudah sinkron pertama, pencocokan memakai kolom `kunci`.
 */
const ALIAS_PELUANG: [RegExp, string][] = [
  [/tata udara|hvac/, 'P-01'], [/\bled\b/, 'P-02'], [/pompa/, 'P-03'], [/submeter/, 'P-04'], [/beban puncak|faktor daya/, 'P-05'],
  [/pemeliharaan preventif/, 'P-06'], [/pelatihan|kampanye|perilaku/, 'P-08'], [/penerangan jalan/, 'P-10'],
]

async function unduhSemua(galat: string[]): Promise<{ calon: BerkasCalon; hasil: HasilBaca | null }[]> {
  const s = await db()
  const dok = await s.from('dokumen_audit').select('id, kode, nama, klausul_kode')
  if (dok.error) throw new Error(`Gagal membaca dokumen: ${dok.error.message}`)
  const dokumen = new Map((dok.data as { id: string; kode: string; nama: string; klausul_kode: string }[])
    .filter((d) => KLAUSUL_SUMBER.some((k) => d.klausul_kode === k || d.klausul_kode.startsWith(`${k}.`)))
    .map((d) => [d.id, `${d.kode} · ${d.nama}`]))
  if (!dokumen.size) return []
  const b = await s.from('berkas').select('id, path, nama_file, sah, diunggah_at, dokumen_id').in('dokumen_id', [...dokumen.keys()])
  if (b.error) throw new Error(`Gagal membaca berkas: ${b.error.message}`)
  const calon: BerkasCalon[] = (b.data as { id: string; path: string; nama_file: string; sah: boolean | null; diunggah_at: string; dokumen_id: string }[])
    .filter((x) => /\.(xlsx|xlsm|docx)$/i.test(x.nama_file))
    .map((x) => ({ id: x.id, path: x.path, nama_file: x.nama_file, sah: !!x.sah, diunggah_at: x.diunggah_at, dokumen: dokumen.get(x.dokumen_id) ?? '' }))

  const hasil: { calon: BerkasCalon; hasil: HasilBaca | null }[] = []
  for (let i = 0; i < calon.length; i += 6) {
    hasil.push(...await Promise.all(calon.slice(i, i + 6).map(async (c) => {
      const d = await s.storage.from(BUCKET_BUKTI).download(c.path)
      if (d.error || !d.data) { galat.push(`${c.nama_file}: gagal diunduh (${d.error?.message ?? 'kosong'})`); return { calon: c, hasil: null } }
      try { return { calon: c, hasil: bacaFormulir(c.nama_file, new Uint8Array(await d.data.arrayBuffer())) } }
      catch (e) { galat.push(`${c.nama_file}: ${(e as Error).message}`); return { calon: c, hasil: null } }
    })))
  }
  return hasil
}

/** Pilih satu berkas per formulir: versi sah dulu, lalu yang terbaru diunggah. */
function pilih<T extends { calon: BerkasCalon }>(daftar: T[]): { dipakai: T; lain: T[] } {
  const urut = [...daftar].sort((a, b) => Number(b.calon.sah) - Number(a.calon.sah) || b.calon.diunggah_at.localeCompare(a.calon.diunggah_at))
  return { dipakai: urut[0], lain: urut.slice(1) }
}

const infoBerkas = (c: BerkasCalon) => ({ nama: c.nama_file, sah: c.sah, at: c.diunggah_at, dokumen: c.dokumen })

function bandingIsu(kunci: string, judul: string, baru: IsuFormulir[], lama: Isu[], identitas: (x: { proses: string | null; uraian: string }) => string): { info: Omit<SumberSinkron, 'berkas' | 'diabaikan' | 'dilewati' | 'catatan'>; rencana: RencanaIsu } {
  const sisa = new Map<string, Isu[]>()
  for (const l of lama) { const k = identitas(l); sisa.set(k, [...(sisa.get(k) ?? []), l]) }
  const rencana: RencanaIsu = { kunci, tambah: [], ubah: [], hapus: [] }
  const info = { kunci, judul, tambah: [] as RingkasBaris[], ubah: [] as Ubahan[], hapus: [] as RingkasBaris[], sama: 0 }
  for (const n of baru) {
    const k = identitas(n)
    const cocok = sisa.get(k)?.shift()
    if (!cocok) { rencana.tambah.push(n); info.tambah.push({ label: potong(n.proses ?? n.uraian), detail: `${n.jenis} · skor ${n.dampak}×${n.kemungkinan}` }); continue }
    const beda = KOLOM_ISU.filter(([c]) => !sama(n[c], (cocok as unknown as Record<string, unknown>)[c])).map(([, l]) => l)
    if (beda.length) { rencana.ubah.push({ id: cocok.id, data: n }); info.ubah.push({ label: potong(n.proses ?? n.uraian), kolom: beda }) }
    else info.sama++
  }
  for (const l of [...sisa.values()].flat()) { rencana.hapus.push(l.id); info.hapus.push({ label: potong(l.proses ?? l.uraian), detail: `${l.jenis} · skor ${l.skor}` }) }
  return { info, rencana }
}

function gabungPeluang(p002: PeluangFormulir[], p005: PeluangFormulir[]): (PeluangFormulir & { sumber: string })[] {
  const isi = (a: string | null, b: string | null) => (a && a.trim() ? a : b)
  const peta = new Map<string, PeluangFormulir & { asal: Set<string> }>()
  for (const [asal, daftar] of [['005/SOP-008', p005], ['002/SOP-007', p002]] as const) {
    for (const p of daftar) {
      const k = kunciNama(p.nama)
      const ada = peta.get(k)
      if (!ada) { peta.set(k, { ...p, asal: new Set([asal]) }); continue }
      ada.asal.add(asal)
      // 002 (docx) lebih lengkap untuk penanggung jawab, kWh, dan metode; 005 melengkapi yang kosong
      const prefer002 = asal === '002/SOP-007'
      const [a, b] = prefer002 ? [p, ada] : [ada, p]
      Object.assign(ada, {
        deskripsi: isi(a.deskripsi, b.deskripsi), seu_terkait: isi(a.seu_terkait, b.seu_terkait), sasaran_teks: isi(a.sasaran_teks, b.sasaran_teks),
        pemilik: isi(a.pemilik, b.pemilik), tanggal_identifikasi: a.tanggal_identifikasi ?? b.tanggal_identifikasi,
        estimasi_kwh: a.estimasi_kwh ?? b.estimasi_kwh, metode: isi(a.metode, b.metode),
      })
    }
  }
  return [...peta.values()].map(({ asal, ...p }) => ({ ...p, sumber: `Formulir Peluang ${[...asal].sort().join(' + ')}` }))
}

async function hitung(): Promise<{ pratinjau: Pratinjau; rencana: Rencana[] }> {
  const galat: string[] = []
  const unduh = await unduhSemua(galat)
  const s = await db()
  const [isuR, peluangR, aksiR] = await Promise.all([
    s.from('isu').select('*'), s.from('peluang').select('*').order('kode'), s.from('rencana_aksi').select('peluang_kode'),
  ])
  if (isuR.error) throw new Error(`Gagal membaca isu: ${isuR.error.message}`)
  if (peluangR.error) throw new Error(`Gagal membaca peluang: ${peluangR.error.message}`)
  const isu = isuR.data as Isu[]
  const peluang = peluangR.data as Peluang[]
  const dipakaiAksi = new Set((aksiR.data as { peluang_kode: string | null }[] | null ?? []).map((a) => a.peluang_kode).filter(Boolean))

  const dikenali = unduh.filter((u): u is { calon: BerkasCalon; hasil: HasilBaca } => !!u.hasil)
  const tidakDikenali = unduh.filter((u) => !u.hasil).map((u) => u.calon.nama_file)
  const kelompok = new Map<string, typeof dikenali>()
  for (const u of dikenali) {
    const k = u.hasil.jenis === 'risiko61' ? `risiko61:${kunciNama(u.hasil.bagian ?? '')}` : u.hasil.jenis
    kelompok.set(k, [...(kelompok.get(k) ?? []), u])
  }

  const sumber: SumberSinkron[] = []
  const rencana: Rencana[] = []

  // Risiko 6.1 per bagian
  const bagianTerbaca = new Set<string>()
  for (const [k, daftar] of [...kelompok].filter(([k]) => k.startsWith('risiko61:')).sort()) {
    const { dipakai, lain } = pilih(daftar)
    const h = dipakai.hasil as Extract<HasilBaca, { jenis: 'risiko61' }>
    const kb = kunciNama(h.bagian ?? '')
    bagianTerbaca.add(kb)
    const lama = isu.filter((x) => x.sumber?.startsWith(PRA_RISIKO) && kunciNama(x.bagian ?? '') === kb)
    const { info, rencana: r } = bandingIsu(k, `Risiko 6.1 · ${h.bagian}`, h.isu, lama, (x) => kunciNama(x.proses ?? x.uraian))
    sumber.push({ ...info, berkas: [infoBerkas(dipakai.calon)], diabaikan: lain.map((x) => x.calon.nama_file), dilewati: h.dilewati, catatan: [] })
    rencana.push(r)
  }
  const tanpaBerkas = [...new Set(isu.filter((x) => x.sumber?.startsWith(PRA_RISIKO) && !bagianTerbaca.has(kunciNama(x.bagian ?? ''))).map((x) => x.bagian ?? '(tanpa bagian)'))]

  // Isu 4.1
  const g41 = kelompok.get('isu41')
  if (g41) {
    const { dipakai, lain } = pilih(g41)
    const h = dipakai.hasil as Extract<HasilBaca, { jenis: 'isu41' }>
    const kunciBaru = new Set(h.isu.map((x) => kunciNama(x.uraian)))
    // Baris lama: hasil sinkron sebelumnya, ditambah baris seed 0002 (sumber kosong) yang uraiannya ada di formulir
    const lama = isu.filter((x) => x.sumber?.startsWith(PRA_ISU41) || (!x.sumber && kunciBaru.has(kunciNama(x.uraian))))
    const { info, rencana: r } = bandingIsu('isu41', 'Isu internal & eksternal 4.1', h.isu, lama, (x) => kunciNama(x.uraian))
    const manual = isu.filter((x) => !x.sumber && !kunciBaru.has(kunciNama(x.uraian))).length
    sumber.push({
      ...info, berkas: [infoBerkas(dipakai.calon)], diabaikan: lain.map((x) => x.calon.nama_file), dilewati: h.dilewati,
      catatan: manual ? [`${manual} isu yang diisi manual di aplikasi (tanpa sumber formulir) tidak disentuh.`] : [],
    })
    rencana.push(r)
  }

  // Peluang: gabungan 002 (docx) + 005 (xlsx)
  const g002 = kelompok.get('peluang002'), g005 = kelompok.get('peluang005')
  if (g002 || g005) {
    const p002 = g002 ? pilih(g002) : null, p005 = g005 ? pilih(g005) : null
    const daftar002 = p002 ? (p002.dipakai.hasil as Extract<HasilBaca, { jenis: 'peluang002' }>).peluang : []
    const daftar005 = p005 ? (p005.dipakai.hasil as Extract<HasilBaca, { jenis: 'peluang005' }>).peluang : []
    const gabung = gabungPeluang(daftar002, daftar005)
    const catatan: string[] = []
    const migrasi = peluang.length === 0 || 'kunci' in peluang[0]
    if (!migrasi) galat.push('Kolom peluang hasil formulir belum ada. Jalankan migrasi 0067_peluang_dari_formulir.sql di Supabase, lalu ulangi.')

    const terpakai = new Set<string>()
    const rp: RencanaPeluang = { kunci: 'peluang', tambah: [], ubah: [], hapus: [] }
    const info = { kunci: 'peluang', judul: 'Peluang peningkatan kinerja energi (002 + 005)', tambah: [] as RingkasBaris[], ubah: [] as Ubahan[], hapus: [] as RingkasBaris[], sama: 0 }
    let nomor = Math.max(0, ...peluang.map((p) => Number(/^P-(\d+)$/.exec(p.kode)?.[1] ?? 0)))
    for (const g of gabung) {
      const kunci = kunciNama(g.nama)
      const lama = peluang.find((p) => p.kunci === kunci && !terpakai.has(p.kode))
        ?? ALIAS_PELUANG.filter(([re]) => re.test(kunci)).map(([, kode]) => peluang.find((p) => p.kode === kode && !p.kunci && !terpakai.has(p.kode))).find(Boolean)
      const data: Partial<Peluang> = {
        uraian: g.nama, deskripsi: g.deskripsi, seu_terkait: g.seu_terkait, sasaran_teks: g.sasaran_teks, pemilik: g.pemilik,
        tanggal_identifikasi: g.tanggal_identifikasi, estimasi_kwh: g.estimasi_kwh, sumber: g.sumber, kunci,
        ...(g.metode ? { metode: g.metode } : {}),
      }
      if (!lama) {
        const kode = `P-${String(++nomor).padStart(2, '0')}`
        rp.tambah.push({ kode, ...data, status: 'Belum dinilai' })
        info.tambah.push({ label: `${kode} · ${potong(g.nama)}`, detail: g.estimasi_kwh ? `${g.estimasi_kwh.toLocaleString('id-ID')} kWh/tahun` : undefined })
        continue
      }
      terpakai.add(lama.kode)
      const beda = KOLOM_PELUANG.filter(([c]) => c in data && !sama(c === 'estimasi_kwh' && lama[c] !== null ? Number(lama[c]) : lama[c], data[c])).map(([, l]) => l)
      if (beda.length) { rp.ubah.push({ kode: lama.kode, data }); info.ubah.push({ label: `${lama.kode} · ${potong(g.nama)}`, kolom: beda }) }
      else info.sama++
    }
    for (const p of peluang.filter((x) => !terpakai.has(x.kode))) {
      if (dipakaiAksi.has(p.kode)) { catatan.push(`${p.kode} "${potong(p.uraian, 60)}" tidak ada di formulir tetapi dipakai rencana aksi, jadi dipertahankan.`); continue }
      rp.hapus.push(p.kode); info.hapus.push({ label: `${p.kode} · ${potong(p.uraian)}` })
    }
    const berkas = [p002?.dipakai.calon, p005?.dipakai.calon].filter((c): c is BerkasCalon => !!c).map(infoBerkas)
    if (!p002) catatan.push('Formulir 002 (docx) tidak ditemukan di berkas upload; hanya 005 yang dipakai.')
    if (!p005) catatan.push('Formulir 005 (xlsx) tidak ditemukan di berkas upload; hanya 002 yang dipakai.')
    catatan.push('Skor energi/ROI, status, dan variabel peluang diisi di aplikasi, tidak ditimpa sinkron.')
    sumber.push({ ...info, berkas, diabaikan: [...(p002?.lain ?? []), ...(p005?.lain ?? [])].map((x) => x.calon.nama_file), dilewati: [], catatan })
    if (migrasi) rencana.push(rp)
  }

  return { pratinjau: { sumber, tanpaBerkas, tidakDikenali, galat, diperiksa: unduh.length }, rencana }
}

export async function pratinjauRegister(): Promise<Pratinjau> {
  return (await hitung()).pratinjau
}

const keIsu = (x: IsuFormulir) => ({ ...x, diubah_at: new Date().toISOString() })

/** Terapkan sumber terpilih. Dihitung ulang di server sehingga yang ditulis selalu isi berkas terkini. */
export async function terapkanRegister(kunci: string[]): Promise<{ ok: true; ringkas: string } | { ok: false; pesan: string }> {
  const { rencana } = await hitung()
  const s = await db()
  let tambah = 0, ubah = 0, hapus = 0
  for (const r of rencana.filter((x) => kunci.includes(x.kunci))) {
    if (r.kunci === 'peluang') {
      const p = r as RencanaPeluang
      for (const u of p.ubah) { const { error } = await s.from('peluang').update({ ...u.data, diubah_at: new Date().toISOString() }).eq('kode', u.kode); if (error) return { ok: false, pesan: `Peluang ${u.kode}: ${error.message}` }; ubah++ }
      if (p.tambah.length) { const { error } = await s.from('peluang').insert(p.tambah); if (error) return { ok: false, pesan: `Tambah peluang: ${error.message}` }; tambah += p.tambah.length }
      if (p.hapus.length) { const { error } = await s.from('peluang').delete().in('kode', p.hapus); if (error) return { ok: false, pesan: `Hapus peluang: ${error.message}` }; hapus += p.hapus.length }
    } else {
      const i = r as RencanaIsu
      for (const u of i.ubah) { const { error } = await s.from('isu').update(keIsu(u.data)).eq('id', u.id); if (error) return { ok: false, pesan: `Isu ${u.id}: ${error.message}` }; ubah++ }
      if (i.tambah.length) { const { error } = await s.from('isu').insert(i.tambah.map(keIsu)); if (error) return { ok: false, pesan: `Tambah isu: ${error.message}` }; tambah += i.tambah.length }
      if (i.hapus.length) { const { error } = await s.from('isu').delete().in('id', i.hapus); if (error) return { ok: false, pesan: `Hapus isu: ${error.message}` }; hapus += i.hapus.length }
    }
  }
  return { ok: true, ringkas: `${tambah} ditambah, ${ubah} diperbarui, ${hapus} dihapus.` }
}

export { LABEL_FORMULIR }
