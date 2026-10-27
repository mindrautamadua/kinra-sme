'use client'

import { CircleAlert, CircleCheck, Download, LoaderCircle, RotateCw, Trash2, Upload, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { catatBerkas, hapusBerkas, siapkanUnggah } from '@/app/actions'
import { IkonBerkas, PenampilBerkas, ukuranBerkas, unduhUrl } from '@/components/PenampilBerkas'
import { useBoleh } from '@/components/Peran'
import { waktu } from '@/lib/format'
import { BUCKET_BUKTI, UKURAN_MAKS_BUKTI } from '@/lib/status'
import type { BerkasTampil } from '@/lib/types'

type Tahap = 'antre' | 'siapkan' | 'unggah' | 'simpan' | 'sukses' | 'gagal'
type Antrean = { id: string; file: File; tahap: Tahap; persen: number; pesan?: string; path?: string }

const LABEL_TAHAP: Record<Tahap, string> = {
  antre: 'Menunggu giliran', siapkan: 'Menyiapkan…', unggah: 'Mengunggah', simpan: 'Menyimpan…', sukses: 'Berhasil diunggah', gagal: 'Gagal',
}

/** Unggah ke signed upload URL lewat XHR agar progres per berkas bisa ditampilkan (fetch belum punya progres unggah). */
function kirim(path: string, token: string, file: File, onPersen: (p: number) => void): Promise<void> {
  return new Promise((selesai, gagal) => {
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/upload/sign/${BUCKET_BUKTI}/${encodeURI(path)}?token=${encodeURIComponent(token)}`
    const body = new FormData()
    body.append('cacheControl', '3600')
    body.append('', file)
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('apikey', key)
    xhr.setRequestHeader('Authorization', `Bearer ${key}`)
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.upload.onprogress = (e) => e.lengthComputable && onPersen(Math.round((e.loaded / e.total) * 100))
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return selesai()
      let pesan = `HTTP ${xhr.status}`
      try { pesan = JSON.parse(xhr.responseText).message ?? pesan } catch {}
      gagal(new Error(pesan))
    }
    xhr.onerror = () => gagal(new Error('Koneksi terputus'))
    xhr.send(body)
  })
}

/** Daftar berkas evidence + unggah banyak berkas (dengan progres per berkas) + penampil langsung di aplikasi. */
export function EvidenceBerkas({ dokumenId, berkas, migrasi }: { dokumenId: string; berkas: BerkasTampil[]; migrasi: boolean }) {
  const router = useRouter()
  const bisa = useBoleh()
  const bisaUbah = bisa('dokumen.ubah')
  const [antrean, setAntrean] = useState<Antrean[]>([])
  const [galat, setGalat] = useState<string | null>(null)
  const [seret, setSeret] = useState(false)
  const [buka, setBuka] = useState<number | null>(null)
  const [menunggu, mulai] = useTransition()
  const input = useRef<HTMLInputElement>(null)
  // Berkas diproses satu per satu, termasuk yang ditambahkan saat antrean masih berjalan
  const rantai = useRef<Promise<void>>(Promise.resolve())

  const ubah = (id: string, patch: Partial<Antrean>) => setAntrean((a) => a.map((x) => (x.id === id ? { ...x, ...patch } : x)))

  async function proses(item: Antrean) {
    const { id, file } = item
    if (file.size > UKURAN_MAKS_BUKTI) return ubah(id, { tahap: 'gagal', pesan: `Melebihi batas ${UKURAN_MAKS_BUKTI / 1024 / 1024} MB` })
    ubah(id, { tahap: 'siapkan', persen: 0, pesan: undefined })
    const s = await siapkanUnggah(dokumenId, file.name, file.size)
    if (!s.ok || !s.path || !s.token) return ubah(id, { tahap: 'gagal', pesan: s.ok ? 'Gagal menyiapkan unggahan' : s.pesan })
    ubah(id, { tahap: 'unggah' })
    try {
      await kirim(s.path, s.token, file, (persen) => ubah(id, { persen }))
    } catch (e) {
      return ubah(id, { tahap: 'gagal', pesan: e instanceof Error ? e.message : 'Unggah gagal' })
    }
    ubah(id, { tahap: 'simpan', persen: 100 })
    const c = await catatBerkas(dokumenId, { path: s.path, nama_file: file.name, mime: file.type, ukuran: file.size })
    if (!c.ok) return ubah(id, { tahap: 'gagal', pesan: c.pesan })
    ubah(id, { tahap: 'sukses', path: s.path })
    router.refresh()
    // Baris sukses memudar lalu hilang; berkasnya sudah muncul di daftar di atas
    setTimeout(() => setAntrean((a) => a.filter((x) => x.id !== id)), 4000)
  }

  function antrekan(items: Antrean[]) {
    for (const it of items) rantai.current = rantai.current.then(() => proses(it))
  }

  function tambah(daftar: FileList | File[]) {
    const items = Array.from(daftar).map((file): Antrean => ({ id: crypto.randomUUID(), file, tahap: 'antre', persen: 0 }))
    if (!items.length) return
    setGalat(null)
    setAntrean((a) => [...a, ...items])
    antrekan(items)
    if (input.current) input.current.value = ''
  }

  function ulangi(it: Antrean) {
    ubah(it.id, { tahap: 'antre', persen: 0, pesan: undefined })
    antrekan([it])
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

  const berjalan = antrean.filter((x) => x.tahap !== 'sukses' && x.tahap !== 'gagal').length
  const nSukses = antrean.filter((x) => x.tahap === 'sukses').length
  const nGagal = antrean.filter((x) => x.tahap === 'gagal').length
  const baru = new Set(antrean.filter((x) => x.tahap === 'sukses').map((x) => x.path))

  return (
    <>
      {berkas.length > 0 ? (
        <div className="berkas-list">
          {berkas.map((b, i) => (
            <div key={b.id} className={`berkas-item${baru.has(b.path) ? ' baru' : ''}`}>
              <button type="button" className="berkas-buka" onClick={() => setBuka(i)} disabled={!b.url} aria-label={`Lihat ${b.nama_file}`}>
                <span className="berkas-ikon"><IkonBerkas b={b} /></span>
                <span className="grow">
                  <b>{b.nama_file}</b>
                  <span className="muted small">{ukuranBerkas(b.ukuran)} · {waktu(b.diunggah_at)}{b.diunggah_oleh && ` · ${b.diunggah_oleh}`}</span>
                </span>
              </button>
              {b.url && <a className="btn btn-ikon kecil" href={unduhUrl(b)!} aria-label={`Unduh ${b.nama_file}`} title="Unduh"><Download aria-hidden="true" /></a>}
              {bisaUbah && <button type="button" className="btn btn-ikon kecil bahaya" disabled={menunggu} onClick={() => hapus(b)} aria-label={`Hapus ${b.nama_file}`} title="Hapus"><Trash2 aria-hidden="true" /></button>}
            </div>
          ))}
        </div>
      ) : (
        <p className="muted small" style={{ margin: '0 0 12px' }}>Belum ada berkas evidence yang diunggah.</p>
      )}

      {bisaUbah && (
        <label
          className={`unggah-zona${seret ? ' seret' : ''}${berjalan ? ' sibuk' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setSeret(true) }}
          onDragLeave={() => setSeret(false)}
          onDrop={(e) => { e.preventDefault(); setSeret(false); tambah(e.dataTransfer.files) }}
        >
          <input ref={input} type="file" multiple className="sr-only" onChange={(e) => e.target.files && tambah(e.target.files)} />
          <Upload aria-hidden="true" />
          <span>{berjalan ? <>Mengunggah {berjalan} berkas… <u>tambah lagi</u></> : <>Seret berkas ke sini atau <u>pilih berkas</u></>}</span>
          <span className="muted small">PDF, gambar, Word/Excel/PowerPoint, video · maks. {UKURAN_MAKS_BUKTI / 1024 / 1024} MB per berkas</span>
        </label>
      )}

      {antrean.length > 0 && (
        <div className="antrean" aria-label="Proses unggah">
          <p className="antrean-ringkas small" role="status" aria-live="polite">
            {berjalan ? `Memproses ${berjalan} berkas` : 'Selesai'}
            {nSukses > 0 && <span className="txt-good"> · {nSukses} berhasil</span>}
            {nGagal > 0 && <span className="txt-bad"> · {nGagal} gagal</span>}
          </p>
          {antrean.map((it) => (
            <div key={it.id} className={`antrean-item t-${it.tahap}`}>
              <span className="antrean-ikon" aria-hidden="true">
                {it.tahap === 'sukses' ? <CircleCheck /> : it.tahap === 'gagal' ? <CircleAlert /> : <LoaderCircle className={it.tahap === 'antre' ? undefined : 'putar'} />}
              </span>
              <span className="grow">
                <span className="antrean-baris">
                  <b className="potong">{it.file.name}</b>
                  <span className="muted small tnum">{it.tahap === 'unggah' ? `${it.persen}%` : ukuranBerkas(it.file.size)}</span>
                </span>
                <span className="antrean-bar" aria-hidden="true">
                  <i style={{ width: `${it.tahap === 'antre' ? 0 : it.tahap === 'siapkan' ? 4 : it.tahap === 'unggah' ? Math.max(4, it.persen) : 100}%` }} />
                </span>
                <span className="small antrean-tahap">{it.tahap === 'gagal' ? `Gagal: ${it.pesan}` : it.tahap === 'unggah' ? `Mengunggah ${ukuranBerkas(Math.round((it.file.size * it.persen) / 100))} dari ${ukuranBerkas(it.file.size)}` : LABEL_TAHAP[it.tahap]}</span>
              </span>
              {it.tahap === 'gagal' && (
                <>
                  <button type="button" className="btn btn-ikon kecil" onClick={() => ulangi(it)} aria-label={`Coba unggah ulang ${it.file.name}`} title="Coba lagi"><RotateCw aria-hidden="true" /></button>
                  <button type="button" className="btn btn-ikon kecil" onClick={() => setAntrean((a) => a.filter((x) => x.id !== it.id))} aria-label={`Buang ${it.file.name} dari daftar`} title="Buang"><X aria-hidden="true" /></button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
      {galat && <p className="pesan galat small" role="alert" style={{ marginTop: 10 }}>{galat}</p>}

      <PenampilBerkas berkas={berkas} indeks={buka} setIndeks={setBuka} />
    </>
  )
}
