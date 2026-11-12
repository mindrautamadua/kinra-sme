/**
 * Pembaca formulir SMEn (xlsx & docx) untuk sinkron register isu & peluang dari berkas yang diupload.
 * Murni (tanpa database), sehingga bisa diuji langsung terhadap berkas di sumber-data/.
 *
 * Formulir yang dikenali dari nomor dokumennya:
 *  - 001/SOP-003 Formulir Isu Internal Eksternal (4.1, docx)
 *  - 001/SOP-007 Formulir Risiko Keberhasilan SMEn (6.1, xlsx per bagian)
 *  - 002/SOP-007 Formulir Peluang Peningkatan Kinerja Energi (6.1, docx)
 *  - 005/SOP-008 Formulir Peluang Peningkatan Kinerja (6.2, xlsx)
 */
import { strFromU8, unzipSync } from 'fflate'

// ---------- OOXML dasar ----------

const entitas = (s: string) => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&amp;/g, '&')

const rapi = (s: string) => s.replace(/ /g, ' ').replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').trim()

function buka(buf: Uint8Array): Record<string, Uint8Array> {
  return unzipSync(buf)
}

/** Teks dari semua <t> (xlsx) atau <w:t> (docx) dalam potongan XML. */
function teksT(xml: string, tag: 't' | 'w:t'): string {
  const re = tag === 't' ? /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g : /<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g
  let s = ''
  for (const m of xml.matchAll(re)) s += entitas(m[1])
  return s
}

export type Lembar = { nama: string; sel: Map<string, string> }

const kolomKeIndeks = (k: string) => [...k].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0)
export const indeksKeKolom = (n: number) => { let s = ''; while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26) } return s }

/** Semua lembar xlsx sebagai peta alamat sel → teks. */
export function bacaXlsx(buf: Uint8Array): Lembar[] {
  const z = buka(buf)
  const baca = (p: string) => (z[p] ? strFromU8(z[p]) : '')
  const shared = [...baca('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => teksT(m[1], 't'))
  const rels = new Map([...baca('xl/_rels/workbook.xml.rels').matchAll(/<Relationship\b[^>]*>/g)].map((m) => {
    const id = /Id="([^"]+)"/.exec(m[0])?.[1] ?? ''
    const target = /Target="([^"]+)"/.exec(m[0])?.[1] ?? ''
    return [id, target.startsWith('/') ? target.slice(1) : `xl/${target}`] as const
  }))
  return [...baca('xl/workbook.xml').matchAll(/<sheet\b[^>]*>/g)].map((m) => {
    const nama = entitas(/name="([^"]*)"/.exec(m[0])?.[1] ?? '')
    const rid = /r:id="([^"]+)"/.exec(m[0])?.[1] ?? ''
    const xml = baca(rels.get(rid) ?? '')
    const sel = new Map<string, string>()
    for (const c of xml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const atr = c[1], isi = c[2] ?? ''
      const r = /\br="([A-Z]+\d+)"/.exec(atr)?.[1]
      if (!r) continue
      const t = /\bt="([^"]+)"/.exec(atr)?.[1]
      let v: string
      if (t === 'inlineStr') v = teksT(isi, 't')
      else {
        const raw = /<v>([\s\S]*?)<\/v>/.exec(isi)?.[1]
        if (raw === undefined) continue
        v = t === 's' ? shared[Number(raw)] ?? '' : entitas(raw)
      }
      v = rapi(v)
      if (v) sel.set(r, v)
    }
    return { nama, sel }
  })
}

/** Semua tabel docx (termasuk tabel bersarang, diratakan) sebagai baris → sel teks. */
export function bacaDocxTabel(buf: Uint8Array): string[][][] {
  const z = buka(buf)
  const xml = z['word/document.xml'] ? strFromU8(z['word/document.xml']) : ''
  const tabel: string[][][] = []
  // Pindai token tabel/baris/sel dengan kedalaman agar tabel bersarang tidak merusak baris induk
  const re = /<w:tbl>|<\/w:tbl>|<w:tr[\s>]|<\/w:tr>|<w:tc[\s>]|<\/w:tc>/g
  const tumpuk: { baris: string[][]; sel: string[] | null; mulaiSel: number }[] = []
  let m: RegExpExecArray | null
  while ((m = re.exec(xml))) {
    const tok = m[0]
    const atas = tumpuk.at(-1)
    if (tok === '<w:tbl>') tumpuk.push({ baris: [], sel: null, mulaiSel: -1 })
    else if (tok === '</w:tbl>') { const t = tumpuk.pop(); if (t) tabel.push(t.baris) }
    else if (tok.startsWith('<w:tr') && atas) { atas.sel = [] }
    else if (tok === '</w:tr>' && atas?.sel) { atas.baris.push(atas.sel); atas.sel = null }
    else if (tok.startsWith('<w:tc') && atas) atas.mulaiSel = m.index
    else if (tok === '</w:tc>' && atas?.sel && atas.mulaiSel >= 0) {
      const isi = xml.slice(atas.mulaiSel, m.index)
      const teks = isi.split(/<\/w:p>/).map((p) => teksT(p, 'w:t')).filter(Boolean).join('\n')
      atas.sel.push(rapi(teks)); atas.mulaiSel = -1
    }
  }
  return tabel
}

// ---------- Bantu ----------

const tanpaTitikDua = (s: string | undefined) => (s ?? '').replace(/^\s*:\s*/, '').trim()
const kecil = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
/** Kunci pembanding nama: huruf kecil, tanpa tanda baca. */
export const kunciNama = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim()

function bilangan(s: string | undefined): number | null {
  if (!s) return null
  const t = s.trim()
  if (!/^-?[\d.,]+$/.test(t)) return null
  // Format Indonesia "164.790" atau "1.234,5"; format xlsx "164790" atau "0.5"
  const n = /^\d{1,3}(\.\d{3})+(,\d+)?$/.test(t) ? Number(t.replace(/\./g, '').replace(',', '.')) : Number(t.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
const skala = (s: string | undefined) => { const n = bilangan(s?.split(/\s|–|-/)[0]); return n !== null && n >= 1 && n <= 5 && Number.isInteger(n) ? n : null }

const BULAN_ID: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, mei: 5, may: 5, jun: 6, jul: 7, agu: 8, aug: 8, ags: 8, sep: 9, okt: 10, oct: 10, '0kt': 10, nov: 11, des: 12, dec: 12 }
/** Tanggal ISO dari serial Excel, "29-Oct-26", atau "29 Oktober 2026". */
export function tanggalIso(s: string | undefined): string | null {
  if (!s) return null
  const t = s.trim()
  if (/^\d{5}(\.\d+)?$/.test(t)) {
    const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(Number(t)) * 86_400_000)
    return d.toISOString().slice(0, 10)
  }
  const m = /^(\d{1,2})[\s\-/]+([A-Za-z0-9]{3})[A-Za-z]*[\s\-/]+(\d{2,4})$/.exec(t)
  if (m) {
    const b = BULAN_ID[m[2].toLowerCase()]
    if (!b) return null
    const th = m[3].length === 2 ? 2000 + Number(m[3]) : Number(m[3])
    return `${th}-${String(b).padStart(2, '0')}-${m[1].padStart(2, '0')}`
  }
  return /^\d{4}-\d{2}-\d{2}/.test(t) ? t.slice(0, 10) : null
}

/** Seragamkan nomor dokumen: bulan Romawi kapital (formulir Akuntansi menulis "/x/2026"). */
const bakuNomor = (n: string) => n.replace(/\/([a-z]+)\/(\d{4})$/i, (_, b: string, t: string) => `/${b.toUpperCase()}/${t}`)

/** Nomor dokumen dari kepala formulir, mis. "001/SOP-007/KINRA/SMEn/X/2026". */
const NOMOR = /\b(\d{3})\/SOP-(\d{3})\/KINRA\/SMEn\/[A-Z]+\/\d{4}/i

// ---------- Jenis formulir ----------

export type JenisFormulir = 'isu41' | 'risiko61' | 'peluang002' | 'peluang005'

export const LABEL_FORMULIR: Record<JenisFormulir, string> = {
  isu41: 'Formulir Isu Internal Eksternal (4.1)',
  risiko61: 'Formulir Risiko Keberhasilan SMEn (6.1)',
  peluang002: 'Formulir Peluang Peningkatan Kinerja Energi (002, docx)',
  peluang005: 'Formulir Peluang Peningkatan Kinerja (005, xlsx)',
}

const JENIS_DARI_NOMOR: Record<string, JenisFormulir> = { '001/003': 'isu41', '001/007': 'risiko61', '002/007': 'peluang002', '005/008': 'peluang005' }

export type IsuFormulir = {
  asal: 'Internal' | 'Eksternal'
  jenis: 'Risiko' | 'Peluang'
  bagian: string | null
  proses: string | null
  uraian: string
  dampak: number
  kemungkinan: number
  dampak_residual: number | null
  kemungkinan_residual: number | null
  signifikan: boolean | null
  tindakan: string | null
  evaluasi: string | null
  pic: string | null
  target: string | null
  sumber: string
}

export type PeluangFormulir = {
  nama: string
  deskripsi: string | null
  seu_terkait: string | null
  sasaran_teks: string | null
  pemilik: string | null
  tanggal_identifikasi: string | null
  estimasi_kwh: number | null
  metode: string | null
}

export type HasilBaca =
  | { jenis: 'isu41' | 'risiko61'; nomor: string; bagian: string | null; isu: IsuFormulir[]; dilewati: string[] }
  | { jenis: 'peluang002' | 'peluang005'; nomor: string; bagian: string | null; peluang: PeluangFormulir[]; dilewati: string[] }

/** Kata kunci proses yang menandakan isu eksternal (sama dengan aturan migrasi 0047). */
const POLA_EKSTERNAL = /tenant|pihak ketiga|pasokan|tarif|hukum|regulasi|kepatuhan|pemasok/i

export const sumberRisiko61 = (nomor: string, bagian: string) => `Formulir Risiko 6.1 ${nomor} · ${bagian}`
export const sumberIsu41 = (nomor: string) => `Formulir Isu 4.1 ${nomor}`

function bacaRisiko61(l: Lembar, nomor: string): HasilBaca {
  const s = l.sel
  const nilai = (a: string) => s.get(a)
  let bagian: string | null = null
  let barisKepala = 0
  for (let r = 1; r <= 40; r++) {
    if (kecil(nilai(`A${r}`) ?? '') === 'bagian') bagian = tanpaTitikDua(nilai(`B${r}`))
    if (kecil(nilai(`A${r}`) ?? '') === 'proses') { barisKepala = r; break }
  }
  if (!barisKepala) throw new Error('Kepala tabel "PROSES" tidak ditemukan.')
  // Kolom dicari dari teks kepala agar tahan terhadap sisipan kolom
  const kepala = new Map<number, string>()
  for (let c = 1; c <= 40; c++) { const v = nilai(`${indeksKeKolom(c)}${barisKepala}`); if (v) kepala.set(c, kecil(v)) }
  const cari = (uji: (h: string) => boolean, setelah = 0) => { for (const [c, h] of kepala) if (c > setelah && uji(h)) return indeksKeKolom(c); return null }
  const kol = {
    proses: 'A',
    uraian: cari((h) => h.startsWith('penjelasan proses')),
    dampak: cari((h) => h.includes('risiko awal') && h.includes('dampak')),
    kemungkinan: cari((h) => h.includes('risiko awal') && h.includes('kemungkinan')),
    signifikan: cari((h) => h.startsWith('justifikasi')),
    pengendalian: cari((h) => h.startsWith('pengendalian')),
    dampakRes: cari((h) => h.includes('residual') && h.includes('dampak')),
    kemungkinanRes: cari((h) => h.includes('residual') && h.includes('kemungkinan')),
    tindakLanjut: cari((h) => h === 'tindak lanjut perbaikan'),
    pic: cari((h) => h.startsWith('penanggung jawab')),
    target: cari((h) => h.startsWith('target')),
    indikator: cari((h) => h.startsWith('indikator')),
  }
  const isu: IsuFormulir[] = [], dilewati: string[] = []
  for (let r = barisKepala + 1; r <= barisKepala + 200; r++) {
    const proses = nilai(`A${r}`)
    if (!proses) { if (!nilai(`B${r}`)) continue; }
    const v = (k: string | null) => (k ? nilai(`${k}${r}`) ?? null : null)
    const dampak = skala(v(kol.dampak) ?? undefined), kemungkinan = skala(v(kol.kemungkinan) ?? undefined)
    const uraian = v(kol.uraian)
    // Baris contoh templat memakai teks penjelasan ("3 – Sedang/tinggi …", "hanya contoh ilustratif") di kolom skor
    const contoh = [v(kol.dampak), v('H'), v(kol.dampakRes)].some((x) => x && /ilustrasi|ilustratif|contoh/i.test(x))
    if (!proses || !uraian || dampak === null || kemungkinan === null || contoh) {
      if (proses || uraian) dilewati.push(`Baris ${r}: ${(proses ?? uraian ?? '').slice(0, 60)}${contoh ? ' (contoh templat)' : ' (skor tidak lengkap)'}`)
      continue
    }
    const pengendalian = v(kol.pengendalian), tindak = v(kol.tindakLanjut)
    const sig = v(kol.signifikan)
    isu.push({
      asal: POLA_EKSTERNAL.test(proses) ? 'Eksternal' : 'Internal',
      jenis: /^peluang\b/i.test(proses) ? 'Peluang' : 'Risiko',
      bagian, proses, uraian, dampak, kemungkinan,
      dampak_residual: skala(v(kol.dampakRes) ?? undefined), kemungkinan_residual: skala(v(kol.kemungkinanRes) ?? undefined),
      signifikan: sig ? !/tidak/i.test(sig) && /signifikan/i.test(sig) : null,
      tindakan: [pengendalian, tindak && `Tindak lanjut: ${tindak}`].filter(Boolean).join('\n') || null,
      evaluasi: v(kol.indikator), pic: v(kol.pic), target: v(kol.target),
      sumber: sumberRisiko61(nomor, bagian ?? '(bagian tidak terbaca)'),
    })
  }
  return { jenis: 'risiko61', nomor, bagian, isu, dilewati }
}

function bacaIsu41(tabel: string[][][], nomor: string, bagian: string | null): HasilBaca {
  const t = tabel.find((x) => kecil(x[0]?.[0] ?? '').startsWith('internal/eksternal'))
  if (!t) throw new Error('Tabel isu (kolom "Internal/Eksternal") tidak ditemukan.')
  const isu: IsuFormulir[] = [], dilewati: string[] = []
  t.slice(1).forEach((b, i) => {
    const [asal, jenis, uraian, d, k, , tindakan, evaluasi] = b
    const dampak = skala(d), kemungkinan = skala(k)
    if (!uraian || dampak === null || kemungkinan === null) { if (uraian) dilewati.push(`Baris ${i + 2}: ${uraian.slice(0, 60)} (skor tidak lengkap)`); return }
    isu.push({
      asal: /^e/i.test(asal ?? '') ? 'Eksternal' : 'Internal',
      jenis: /^(o|p)/i.test(jenis ?? '') ? 'Peluang' : 'Risiko',
      bagian: null, proses: null, uraian, dampak, kemungkinan, dampak_residual: null, kemungkinan_residual: null, signifikan: null,
      tindakan: tindakan || null, evaluasi: evaluasi || null, pic: null, target: null, sumber: sumberIsu41(nomor),
    })
  })
  return { jenis: 'isu41', nomor, bagian, isu, dilewati }
}

function bacaPeluang002(tabel: string[][][], nomor: string, bagian: string | null): HasilBaca {
  const t = tabel.find((x) => kecil(x[0]?.[1] ?? '').startsWith('nama peluang'))
  if (!t) throw new Error('Tabel peluang (kolom "Nama peluang") tidak ditemukan.')
  const h = t[0].map(kecil)
  const ix = (uji: (s: string) => boolean) => h.findIndex(uji)
  const i = {
    nama: 1, deskripsi: ix((s) => s.startsWith('deskripsi')), seu: ix((s) => s.includes('seu')), sasaran: ix((s) => s.includes('sasaran')),
    pj: ix((s) => s.startsWith('penanggung')), tgl: ix((s) => s.startsWith('tanggal')), kwh: ix((s) => s.includes('kwh')), ket: ix((s) => s.startsWith('keterangan')),
  }
  const peluang: PeluangFormulir[] = [], dilewati: string[] = []
  for (const b of t.slice(1)) {
    const nama = b[i.nama]
    if (!nama) continue
    const g = (k: number) => (k >= 0 ? b[k] || null : null)
    peluang.push({
      nama, deskripsi: g(i.deskripsi), seu_terkait: g(i.seu), sasaran_teks: g(i.sasaran), pemilik: g(i.pj),
      tanggal_identifikasi: tanggalIso(g(i.tgl) ?? undefined), estimasi_kwh: bilangan(g(i.kwh) ?? undefined), metode: g(i.ket),
    })
  }
  return { jenis: 'peluang002', nomor, bagian, peluang, dilewati }
}

function bacaPeluang005(l: Lembar, nomor: string, bagian: string | null): HasilBaca {
  const s = l.sel
  let barisKepala = 0
  for (let r = 1; r <= 40; r++) if (kecil(s.get(`B${r}`) ?? '').startsWith('nama peluang')) { barisKepala = r; break }
  if (!barisKepala) throw new Error('Kepala tabel "Nama Peluang" tidak ditemukan.')
  const kepala = (c: string) => kecil(s.get(`${c}${barisKepala}`) ?? '')
  const kolom = (uji: (h: string) => boolean) => { for (let c = 1; c <= 45; c++) { const k = indeksKeKolom(c); if (uji(kepala(k))) return k } return null }
  const k = {
    deskripsi: kolom((h) => h.startsWith('deskripsi')), seu: kolom((h) => h.includes('penggunaan energi signifikan')), sasaran: kolom((h) => h.startsWith('bagian dari sasaran')),
    pj: kolom((h) => h.startsWith('penanggung')), tgl: kolom((h) => h.startsWith('tanggal identifikasi')), hemat: kolom((h) => h.startsWith('perkiraan penghematan')),
  }
  const peluang: PeluangFormulir[] = [], dilewati: string[] = []
  for (let r = barisKepala + 1; r <= barisKepala + 300; r++) {
    const nama = s.get(`B${r}`)
    if (!nama || /^total listrik/i.test(nama)) continue
    const v = (c: string | null) => (c ? s.get(`${c}${r}`) ?? null : null)
    peluang.push({
      nama, deskripsi: v(k.deskripsi), seu_terkait: v(k.seu), sasaran_teks: v(k.sasaran), pemilik: v(k.pj),
      tanggal_identifikasi: tanggalIso(v(k.tgl) ?? undefined), estimasi_kwh: bilangan(v(k.hemat) ?? undefined), metode: null,
    })
  }
  return { jenis: 'peluang005', nomor, bagian, peluang, dilewati }
}

/** Kenali dan baca satu berkas formulir. Mengembalikan null bila bukan formulir yang dikenali. */
export function bacaFormulir(namaFile: string, buf: Uint8Array): HasilBaca | null {
  const ext = namaFile.toLowerCase().split('.').pop()
  if (ext === 'xlsx' || ext === 'xlsm') {
    const lembar = bacaXlsx(buf)
    for (const l of lembar) {
      const kepala = [...l.sel.entries()].filter(([a]) => Number(a.replace(/[A-Z]+/, '')) <= 12).map(([, v]) => v).join(' ')
      const m = NOMOR.exec(kepala)
      if (!m) continue
      const jenis = JENIS_DARI_NOMOR[`${m[1]}/${m[2]}`]
      if (jenis === 'risiko61') return bacaRisiko61(l, bakuNomor(m[0]))
      if (jenis === 'peluang005') {
        const bagian = [...l.sel.entries()].find(([a, v]) => a.startsWith('B') && kecil(v) === 'bagian')
        return bacaPeluang005(l, bakuNomor(m[0]), bagian ? tanpaTitikDua(l.sel.get(bagian[0].replace('B', 'C'))) : null)
      }
    }
    return null
  }
  if (ext === 'docx') {
    const tabel = bacaDocxTabel(buf)
    const kepala = tabel[0] ?? []
    const nomorTeks = kepala.map((b) => b.join(' ')).join(' ')
    const m = NOMOR.exec(nomorTeks)
    if (!m) return null
    const bagianBaris = kepala.find((b) => kecil(b[0] ?? '') === 'bagian')
    const bagian = bagianBaris ? tanpaTitikDua(bagianBaris.at(-1)) : null
    const jenis = JENIS_DARI_NOMOR[`${m[1]}/${m[2]}`]
    if (jenis === 'isu41') return bacaIsu41(tabel, bakuNomor(m[0]), bagian)
    if (jenis === 'peluang002') return bacaPeluang002(tabel, bakuNomor(m[0]), bagian)
    return null
  }
  return null
}

// ---------- Gabungan peluang 002 + 005 ----------

/**
 * Pemetaan awal peluang lama (seed P-01..P-10) ke nama di formulir, dipakai sekali saat baris lama belum punya `kunci`.
 * Sesudah sinkron pertama, pencocokan memakai kolom `kunci`.
 */
export const ALIAS_PELUANG: [RegExp, string][] = [
  [/tata udara|hvac/, 'P-01'], [/\bled\b/, 'P-02'], [/pompa/, 'P-03'], [/submeter/, 'P-04'], [/beban puncak|faktor daya/, 'P-05'],
  [/pemeliharaan preventif/, 'P-06'], [/pelatihan|kampanye|perilaku/, 'P-08'], [/penerangan jalan/, 'P-10'],
]

/** Dua nama peluang dianggap sama bila satu awalan yang lain ("… melalui SCADA") atau kata-katanya hampir sama. */
export function namaSerupa(a: string, b: string): boolean {
  if (a === b || a.startsWith(`${b} `) || b.startsWith(`${a} `)) return true
  const ka = new Set(a.split(' ')), kb = new Set(b.split(' '))
  const irisan = [...ka].filter((x) => kb.has(x)).length
  return irisan / new Set([...ka, ...kb]).size >= 0.75
}

/** Gabungkan peluang formulir 002 (docx) dan 005 (xlsx) berdasarkan nama. Estimasi kWh 0 ("belum dihitung") disimpan kosong. */
export function gabungPeluang(p002: PeluangFormulir[], p005: PeluangFormulir[]): (PeluangFormulir & { sumber: string })[] {
  const isi = (a: string | null, b: string | null) => (a && a.trim() ? a : b)
  const peta = new Map<string, PeluangFormulir & { asal: Set<string> }>()
  for (const [asal, daftar] of [['005/SOP-008', p005], ['002/SOP-007', p002]] as const) {
    for (const p of daftar) {
      const k = kunciNama(p.nama)
      const ada = peta.get(k) ?? [...peta].find(([k2]) => namaSerupa(k, k2))?.[1]
      if (!ada) { peta.set(k, { ...p, asal: new Set([asal]) }); continue }
      ada.asal.add(asal)
      // 002 (docx) lebih lengkap untuk penanggung jawab, kWh, dan metode; 005 melengkapi yang kosong
      const prefer002 = asal === '002/SOP-007'
      const [a, b] = prefer002 ? [p, ada] : [ada, p]
      Object.assign(ada, {
        deskripsi: isi(a.deskripsi, b.deskripsi), seu_terkait: isi(a.seu_terkait, b.seu_terkait), sasaran_teks: isi(a.sasaran_teks, b.sasaran_teks),
        pemilik: isi(a.pemilik, b.pemilik), tanggal_identifikasi: a.tanggal_identifikasi ?? b.tanggal_identifikasi,
        estimasi_kwh: a.estimasi_kwh || b.estimasi_kwh || null, metode: isi(a.metode, b.metode),
      })
    }
  }
  return [...peta.values()].map(({ asal, ...p }) => ({ ...p, estimasi_kwh: p.estimasi_kwh || null, sumber: `Formulir Peluang ${[...asal].sort().join(' + ')}` }))
}
