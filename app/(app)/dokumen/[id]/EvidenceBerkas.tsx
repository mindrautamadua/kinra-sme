'use client'

import { createClient } from '@supabase/supabase-js'
import { Download, Trash2, Upload } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { catatBerkas, hapusBerkas, siapkanUnggah } from '@/app/actions'
import { IkonBerkas, PenampilBerkas, ukuranBerkas, unduhUrl } from '@/components/PenampilBerkas'
import { useBoleh } from '@/components/Peran'
import { waktu } from '@/lib/format'
import { BUCKET_BUKTI, UKURAN_MAKS_BUKTI } from '@/lib/status'
import type { BerkasTampil } from '@/lib/types'

/** Daftar berkas evidence + unggah banyak berkas + penampil langsung di aplikasi. */
export function EvidenceBerkas({ dokumenId, berkas, migrasi }: { dokumenId: string; berkas: BerkasTampil[]; migrasi: boolean }) {
  const router = useRouter()
  const bisa = useBoleh()
  const bisaUbah = bisa('dokumen.ubah')
  const [progres, setProgres] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [seret, setSeret] = useState(false)
  const [buka, setBuka] = useState<number | null>(null)
  const [menunggu, mulai] = useTransition()
  const input = useRef<HTMLInputElement>(null)

  async function unggah(daftar: FileList | File[]) {
    const files = Array.from(daftar)
    if (!files.length) return
    setGalat(null)
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, { auth: { persistSession: false } })
    const gagal: string[] = []
    for (const [i, f] of files.entries()) {
      setProgres(`Mengunggah ${i + 1}/${files.length}: ${f.name}`)
      if (f.size > UKURAN_MAKS_BUKTI) { gagal.push(`${f.name}: melebihi ${UKURAN_MAKS_BUKTI / 1024 / 1024} MB`); continue }
      const s = await siapkanUnggah(dokumenId, f.name, f.size)
      if (!s.ok || !s.path || !s.token) { gagal.push(`${f.name}: ${s.ok ? 'gagal menyiapkan unggahan' : s.pesan}`); continue }
      const { error } = await sb.storage.from(BUCKET_BUKTI).uploadToSignedUrl(s.path, s.token, f, { contentType: f.type || undefined })
      if (error) { gagal.push(`${f.name}: ${error.message}`); continue }
      const c = await catatBerkas(dokumenId, { path: s.path, nama_file: f.name, mime: f.type, ukuran: f.size })
      if (!c.ok) gagal.push(`${f.name}: ${c.pesan}`)
    }
    setProgres(null)
    if (gagal.length) setGalat(gagal.join(' · '))
    if (input.current) input.current.value = ''
    router.refresh()
  }

  function hapus(b: BerkasTampil) {
    if (!confirm(`Hapus berkas ${b.nama_file}? Berkas akan terhapus permanen dari penyimpanan aplikasi.`)) return
    mulai(async () => {
      const h = await hapusBerkas(b.id)
      if (!h.ok) return setGalat(h.pesan)
      setBuka(null)
      router.refresh()
    })
  }

  if (migrasi) {
    return <p className="pesan small">Unggah berkas belum aktif. Jalankan <code>supabase/migrations/0010_evidence_storage.sql</code> di SQL Editor Supabase.</p>
  }

  const sibuk = !!progres || menunggu

  return (
    <>
      {berkas.length > 0 ? (
        <div className="berkas-list">
          {berkas.map((b, i) => (
            <div key={b.id} className="berkas-item">
              <button type="button" className="berkas-buka" onClick={() => setBuka(i)} disabled={!b.url} aria-label={`Lihat ${b.nama_file}`}>
                <span className="berkas-ikon"><IkonBerkas b={b} /></span>
                <span className="grow">
                  <b>{b.nama_file}</b>
                  <span className="muted small">{ukuranBerkas(b.ukuran)} · {waktu(b.diunggah_at)}{b.diunggah_oleh && ` · ${b.diunggah_oleh}`}</span>
                </span>
              </button>
              {b.url && <a className="btn btn-ikon kecil" href={unduhUrl(b)!} aria-label={`Unduh ${b.nama_file}`} title="Unduh"><Download aria-hidden="true" /></a>}
              {bisaUbah && <button type="button" className="btn btn-ikon kecil bahaya" disabled={sibuk} onClick={() => hapus(b)} aria-label={`Hapus ${b.nama_file}`} title="Hapus"><Trash2 aria-hidden="true" /></button>}
            </div>
          ))}
        </div>
      ) : (
        <p className="muted small" style={{ margin: '0 0 12px' }}>Belum ada berkas evidence yang diunggah.</p>
      )}

      {bisaUbah && (
        <label
          className={`unggah-zona${seret ? ' seret' : ''}${sibuk ? ' sibuk' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setSeret(true) }}
          onDragLeave={() => setSeret(false)}
          onDrop={(e) => { e.preventDefault(); setSeret(false); if (!sibuk) unggah(e.dataTransfer.files) }}
        >
          <input ref={input} type="file" multiple className="sr-only" disabled={sibuk} onChange={(e) => e.target.files && unggah(e.target.files)} />
          <Upload aria-hidden="true" />
          <span>{progres ?? <>Seret berkas ke sini atau <u>pilih berkas</u></>}</span>
          <span className="muted small">PDF, gambar, Word/Excel/PowerPoint, video · maks. {UKURAN_MAKS_BUKTI / 1024 / 1024} MB per berkas</span>
        </label>
      )}
      {galat && <p className="pesan galat small" role="alert" style={{ marginTop: 10 }}>{galat}</p>}

      <PenampilBerkas berkas={berkas} indeks={buka} setIndeks={setBuka} />
    </>
  )
}
