// Unggah bukti bersama (dipakai banyak sasaran sekaligus) dari folder sumber-data ke rekaman Kesiapan Audit.
//
// Daftar hadir sosialisasi dan catatan pelatihan membuktikan sasaran SB-xx-1 dan SB-xx-2 semua bagian. Berkas diunggah
// sekali ke rekaman tautannya (migrasi 0056), lalu tampil di panel bukti setiap sasaran yang ditautkan.
//
// Jalankan dari akar repo, SETELAH migrasi 0056:
//   node scripts/unggah_bukti_bersama.mjs          # unggah
//   node scripts/unggah_bukti_bersama.mjs --coba   # hanya periksa berkas lokal, tanpa login dan tanpa unggah
// Login memakai akun aplikasi (peran admin/konsultan/tim_kinra). Email & sandi diminta di terminal,
// atau isi lewat env SMEN_EMAIL dan SMEN_SANDI. URL & publishable key dibaca dari .env.local.
// Aman diulang: berkas dengan nama yang sudah terpasang di rekaman yang sama dilewati.
// Berkas TIDAK ditandai versi sah; tandai sendiri di Kesiapan setelah diperiksa.

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import { createInterface } from 'node:readline/promises'

const BUCKET = 'smen-evidence'
const MAKS = 50 * 1024 * 1024
const K72 = 'sumber-data/6. Dokumen Implementasi SMEn - KINRA/7.2 Kompetensi'

/** Rekaman tujuan → berkas atau folder (semua berkas di dalamnya) */
const RENCANA = [
  { kode: 'R-7.3-01', sumber: [
    `${K72}/003_Daftar Hadir (Training ISO 50001) Rev.0 (Net).xlsx`,
    `${K72}/Daftar Hadir Program ISO 50001 (PT KINRA) (Jawaban) (Net).xlsx`,
    'sumber-data/0. Materi Kickoff & Training/2. Sosialisasi Kebijakan, Manual dan SOP SMEn ISO 50001 2018 KINRA (011126).pdf',
  ] },
  { kode: 'R-7.2-01', sumber: [
    `${K72}/005-Catatan Pelatihan Rev.0 (Net).xlsx`,
    `${K72}/006_Matriks Kompetensi Personil ISO50001-Rev.0-KINRA (Net).xlsx`,
  ] },
  { kode: 'R-7.2-02', sumber: [
    `${K72}/A. Sertifikat Pelatihan SMEn - KINRA (2026)`,
    `${K72}/B. Sertifikat Auditor SMEn - KINRA (2026)`,
  ] },
]

const MIME = {
  '.pdf': 'application/pdf',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}
// Sama dengan namaAman() di app/actions.ts
const namaAman = (n) => n.normalize('NFKD').replace(/[^\w.-]+/g, '_').replace(/_+/g, '_').slice(-120) || 'berkas'

/** Uraikan sumber menjadi daftar berkas; folder diurutkan menurut nomor di depan nama. */
function berkasDari(sumber) {
  if (!existsSync(sumber)) throw new Error(`Tidak ditemukan: ${sumber}`)
  if (!statSync(sumber).isDirectory()) return [sumber]
  return readdirSync(sumber).filter((n) => !n.startsWith('.'))
    .sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0) || a.localeCompare(b))
    .map((n) => join(sumber, n))
}

function bacaEnv() {
  const env = {}
  for (const f of ['.env.local', '.env']) {
    if (!existsSync(f)) continue
    for (const baris of readFileSync(f, 'utf8').split('\n')) {
      const m = baris.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
    }
  }
  return { ...env, ...process.env }
}

async function tanya(pertanyaan, rahasia = false) {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  if (rahasia) rl._writeToOutput = (s) => { if (s.includes(pertanyaan)) process.stdout.write(s) }
  const j = await rl.question(pertanyaan)
  rl.close()
  if (rahasia) process.stdout.write('\n')
  return j.trim()
}

// Periksa semua berkas lokal lebih dulu agar tidak berhenti di tengah unggahan
const rencana = RENCANA.map((r) => ({ ...r, berkas: r.sumber.flatMap(berkasDari) }))
for (const r of rencana) {
  console.log(`${r.kode}: ${r.berkas.length} berkas`)
  for (const f of r.berkas) {
    const n = statSync(f).size
    if (n > MAKS) throw new Error(`${f} melebihi 50 MB`)
    console.log(`  · ${basename(f)} (${(n / 1024).toFixed(0)} KB)`)
  }
}
if (process.argv.includes('--coba')) process.exit(0)

const env = bacaEnv()
const URL_SB = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
if (!URL_SB || !KEY) throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY tidak ditemukan di .env.local')

const klien = (token) => createClient(URL_SB, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: token ? { 'x-sesi': token } : {} },
})

const email = env.SMEN_EMAIL || await tanya('\nEmail: ')
const sandi = env.SMEN_SANDI || await tanya('Sandi: ', true)
const { data: hasil, error: eMasuk } = await klien().rpc('masuk', { p_email: email, p_sandi: sandi })
if (eMasuk || !hasil?.token) throw new Error(eMasuk?.message || hasil?.galat || 'Gagal masuk')
const s = klien(hasil.token)

let naik = 0, lewat = 0, gagal = 0
try {
  for (const r of rencana) {
    const { data: dok, error: eDok } = await s.from('dokumen_audit').select('id, nama').eq('kode', r.kode).maybeSingle()
    if (eDok || !dok) { console.error(`✗ ${r.kode}: rekaman tidak ditemukan`); gagal += r.berkas.length; continue }
    const { data: ada } = await s.from('berkas').select('nama_file').eq('dokumen_id', dok.id)
    const sudah = new Set((ada ?? []).map((b) => b.nama_file))
    console.log(`\n${r.kode} — ${dok.nama}`)
    for (const f of r.berkas) {
      const nama = basename(f)
      if (sudah.has(nama)) { console.log(`  = ${nama} (sudah ada)`); lewat++; continue }
      const isi = readFileSync(f)
      const mime = MIME[extname(nama).toLowerCase()] || 'application/octet-stream'
      const path = `${dok.id}/${randomUUID()}-${namaAman(nama)}`
      const { error: eUp } = await s.storage.from(BUCKET).upload(path, isi, { contentType: mime, upsert: false })
      if (eUp) { console.error(`  ✗ ${nama}: ${eUp.message}`); gagal++; continue }
      const { error: eIns } = await s.from('berkas').insert({ dokumen_id: dok.id, path, nama_file: nama, mime, ukuran: isi.length, folder: 'Evidence' })
      if (eIns) {
        await s.storage.from(BUCKET).remove([path])
        console.error(`  ✗ ${nama}: ${eIns.message}`); gagal++; continue
      }
      console.log(`  + ${nama} (${(isi.length / 1024).toFixed(0)} KB)`); naik++
    }
  }
} finally {
  await s.rpc('keluar')
}
console.log(`\nSelesai: ${naik} diunggah, ${lewat} dilewati, ${gagal} gagal.`)
if (gagal) process.exitCode = 1
