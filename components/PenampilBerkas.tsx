'use client'

import { ChevronLeft, ChevronRight, Download, ExternalLink, File, FileImage, FileSpreadsheet, FileText, FileVideo, Paperclip, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Berkas, BerkasTampil } from '@/lib/types'

type Jenis = 'gambar' | 'pdf' | 'video' | 'audio' | 'office' | 'teks' | 'lain'

function jenisBerkas(b: Berkas): Jenis {
  const m = b.mime ?? ''
  const n = b.nama_file
  if (m.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(n)) return 'gambar'
  if (m === 'application/pdf' || /\.pdf$/i.test(n)) return 'pdf'
  if (m.startsWith('video/') || /\.(mp4|webm|mov)$/i.test(n)) return 'video'
  if (m.startsWith('audio/') || /\.(mp3|wav|m4a|ogg)$/i.test(n)) return 'audio'
  if (/\.(docx?|xlsx?|pptx?)$/i.test(n)) return 'office'
  if (m.startsWith('text/') || /\.(txt|csv|md|json)$/i.test(n)) return 'teks'
  return 'lain'
}

export function IkonBerkas({ b }: { b: Berkas }) {
  const j = jenisBerkas(b)
  const C = j === 'gambar' ? FileImage : j === 'video' ? FileVideo : j === 'pdf' || j === 'teks' ? FileText
    : j === 'office' ? (/\.xlsx?$/i.test(b.nama_file) ? FileSpreadsheet : FileText) : File
  return <C aria-hidden="true" />
}

export function ukuranBerkas(n: number | null) {
  if (!n) return '–'
  return n < 1024 * 1024 ? `${Math.max(1, Math.round(n / 1024))} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`
}

export const unduhUrl = (b: BerkasTampil) => b.url && `${b.url}&download=${encodeURIComponent(b.nama_file)}`

/** Dialog penampil berkas evidence (PDF, gambar, video, Office, teks). Terbuka selama `indeks` tidak null. */
export function PenampilBerkas({ berkas, indeks, setIndeks, judul }: {
  berkas: BerkasTampil[]; indeks: number | null; setIndeks: (i: number | null) => void; judul?: string
}) {
  const dlg = useRef<HTMLDialogElement>(null)
  const aktif = indeks !== null ? berkas[indeks] : null

  useEffect(() => {
    if (indeks !== null && !dlg.current?.open) dlg.current?.showModal()
    if (indeks === null && dlg.current?.open) dlg.current.close()
  }, [indeks])

  return (
    <dialog ref={dlg} className="penampil" onClose={() => setIndeks(null)}
      onKeyDown={(e) => {
        if (indeks === null) return
        if (e.key === 'ArrowRight' && indeks < berkas.length - 1) setIndeks(indeks + 1)
        if (e.key === 'ArrowLeft' && indeks > 0) setIndeks(indeks - 1)
      }}>
      {aktif && (
        <div className="penampil-isi">
          <div className="penampil-kepala">
            <span className="berkas-ikon"><IkonBerkas b={aktif} /></span>
            <span className="grow" style={{ minWidth: 0 }}>
              <b className="potong">{aktif.nama_file}</b>
              <span className="muted small potong">{judul && `${judul} · `}{indeks! + 1} dari {berkas.length} · {ukuranBerkas(aktif.ukuran)}</span>
            </span>
            <button type="button" className="btn btn-ikon kecil" disabled={indeks === 0} onClick={() => setIndeks(indeks! - 1)} aria-label="Berkas sebelumnya"><ChevronLeft aria-hidden="true" /></button>
            <button type="button" className="btn btn-ikon kecil" disabled={indeks === berkas.length - 1} onClick={() => setIndeks(indeks! + 1)} aria-label="Berkas berikutnya"><ChevronRight aria-hidden="true" /></button>
            {aktif.url && <a className="btn btn-ikon kecil" href={aktif.url} target="_blank" rel="noreferrer" aria-label="Buka di tab baru" title="Buka di tab baru"><ExternalLink aria-hidden="true" /></a>}
            {aktif.url && <a className="btn btn-ikon kecil" href={unduhUrl(aktif)!} aria-label="Unduh" title="Unduh"><Download aria-hidden="true" /></a>}
            <button type="button" className="btn btn-ikon kecil" onClick={() => setIndeks(null)} aria-label="Tutup" autoFocus><X aria-hidden="true" /></button>
          </div>
          <div className="penampil-badan">
            <Pratinjau key={aktif.id} b={aktif} />
          </div>
        </div>
      )}
    </dialog>
  )
}

function Pratinjau({ b }: { b: BerkasTampil }) {
  const url = b.url
  const j = jenisBerkas(b)
  const [teks, setTeks] = useState<string | null>(null)

  useEffect(() => {
    if (j !== 'teks' || !url) return
    fetch(url).then((r) => r.text()).then((t) => setTeks(t.slice(0, 500_000))).catch(() => setTeks('Gagal memuat isi berkas.'))
  }, [j, url])

  if (!url) return <div className="penampil-kosong"><Paperclip aria-hidden="true" /><p>Berkas tidak dapat dibuka. Muat ulang halaman lalu coba lagi.</p></div>
  if (j === 'gambar') return <img src={url} alt={b.nama_file} />
  if (j === 'pdf') return <iframe src={url} title={b.nama_file} />
  if (j === 'video') return <video src={url} controls />
  if (j === 'audio') return <audio src={url} controls />
  // Office Online membaca berkas lewat signed URL (berlaku 1 jam)
  if (j === 'office') return <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`} title={b.nama_file} />
  if (j === 'teks') return <pre>{teks ?? 'Memuat…'}</pre>
  return (
    <div className="penampil-kosong">
      <Paperclip aria-hidden="true" />
      <p>Pratinjau tidak tersedia untuk jenis berkas ini.</p>
      <a className="btn utama" href={unduhUrl(b)!}><Download aria-hidden="true" /> Unduh berkas</a>
    </div>
  )
}
