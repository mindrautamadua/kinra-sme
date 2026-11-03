// Unggah berkas di folder `persyaratan/Point N` sebagai evidence item PA-0N di aplikasi.
//
// Jalankan dari akar repo, SETELAH migrasi 0012 dijalankan:
//   node scripts/unggah_persyaratan.mjs
// Login memakai akun aplikasi (peran admin/konsultan/tim_kinra). Email & sandi diminta di terminal,
// atau isi lewat env SMEN_EMAIL dan SMEN_SANDI. URL & publishable key dibaca dari .env.local.
// Aman diulang: berkas dengan nama yang sudah terpasang di dokumen yang sama dilewati.

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'
import { createInterface } from 'node:readline/promises'

const BUCKET = 'smen-evidence'
const AKAR = 'persyaratan'
const MIME = {
  '.pdf': 'application/pdf',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
}
// Sama dengan namaAman() di app/actions.ts
const namaAman = (n) => n.normalize('NFKD').replace(/[^\w.-]+/g, '_').replace(/_+/g, '_').slice(-120) || 'berkas'

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

const env = bacaEnv()
const URL_SB = env.NEXT_PUBLIC_SUPABASE_URL
const KEY = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
if (!URL_SB || !KEY) throw new Error('NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY tidak ditemukan di .env.local')

const klien = (token) => createClient(URL_SB, KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
  global: { headers: token ? { 'x-sesi': token } : {} },
})

const email = env.SMEN_EMAIL || await tanya('Email: ')
const sandi = env.SMEN_SANDI || await tanya('Sandi: ', true)
const { data: hasil, error: eMasuk } = await klien().rpc('masuk', { p_email: email, p_sandi: sandi })
if (eMasuk || !hasil?.token) throw new Error(eMasuk?.message || hasil?.galat || 'Gagal masuk')
const s = klien(hasil.token)

let naik = 0, lewat = 0, gagal = 0
try {
  const folder = readdirSync(AKAR).filter((n) => /^Point \d+$/.test(n) && statSync(join(AKAR, n)).isDirectory())
  folder.sort((a, b) => Number(a.split(' ')[1]) - Number(b.split(' ')[1]))
  for (const f of folder) {
    const kode = `PA-${f.split(' ')[1].padStart(2, '0')}`
    const { data: dok, error: eDok } = await s.from('dokumen_audit').select('id, nama').eq('kode', kode).maybeSingle()
    if (eDok || !dok) { console.error(`✗ ${kode}: dokumen tidak ditemukan (jalankan migrasi 0012?)`); gagal++; continue }
    const { data: ada } = await s.from('berkas').select('nama_file').eq('dokumen_id', dok.id)
    const sudah = new Set((ada ?? []).map((b) => b.nama_file))
    console.log(`\n${kode} — ${dok.nama}`)
    for (const nama of readdirSync(join(AKAR, f)).filter((n) => !n.startsWith('.'))) {
      if (sudah.has(nama)) { console.log(`  = ${nama} (sudah ada)`); lewat++; continue }
      const isi = readFileSync(join(AKAR, f, nama))
      const mime = MIME[extname(nama).toLowerCase()] || 'application/octet-stream'
      const path = `${dok.id}/${randomUUID()}-${namaAman(nama)}`
      const { error: eUp } = await s.storage.from(BUCKET).upload(path, isi, { contentType: mime, upsert: false })
      if (eUp) { console.error(`  ✗ ${nama}: ${eUp.message}`); gagal++; continue }
      const { error: eIns } = await s.from('berkas').insert({
        dokumen_id: dok.id, path, nama_file: nama, mime, ukuran: isi.length, folder: 'Evidence',
      })
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
