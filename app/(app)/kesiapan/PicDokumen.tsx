'use client'

import { Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { simpanPicDokumen } from '@/app/actions'
import type { Dokumen } from '@/lib/types'

/** Sel "PIC" di lembar Kesiapan, bisa diubah langsung oleh peran dengan hak dokumen.ubah (termasuk Tim KINRA). */
export function PicDokumen({ d, bisaUbah, saran }: { d: Dokumen; bisaUbah: boolean; saran: string[] }) {
  const router = useRouter()
  const [ubah, setUbah] = useState(false)
  const [pic, setPic] = useState(d.pic ?? '')
  const [galat, setGalat] = useState<string | null>(null)
  const [sibuk, mulai] = useTransition()

  function buka() {
    setPic(d.pic ?? ''); setGalat(null); setUbah(true)
  }

  function simpan(e: React.FormEvent) {
    e.preventDefault()
    if (pic.trim() === (d.pic ?? '')) { setUbah(false); return }
    mulai(async () => {
      const h = await simpanPicDokumen(d.id, pic)
      if (!h.ok) { setGalat(h.pesan); return }
      setUbah(false)
      router.refresh()
    })
  }

  if (ubah) {
    return (
      <form className="ks-catatan-form" onSubmit={simpan} onKeyDown={(e) => { if (e.key === 'Escape') setUbah(false) }}>
        <input list="saran-pic" value={pic} onChange={(e) => setPic(e.target.value)} maxLength={120} placeholder="Nama / unit PIC"
          aria-label={`PIC ${d.kode}`} autoFocus />
        {galat && <p className="pesan galat small" role="alert">{galat}</p>}
        <div className="ks-catatan-aksi">
          <button type="button" className="btn kecil" onClick={() => setUbah(false)} disabled={sibuk}>Batal</button>
          <button type="submit" className="btn kecil utama" disabled={sibuk}>{sibuk ? 'Menyimpan…' : 'Simpan'}</button>
        </div>
        <datalist id="saran-pic">{saran.map((s) => <option key={s} value={s} />)}</datalist>
      </form>
    )
  }

  return (
    <div className="ks-catatan">
      <div className="grow">{d.pic ?? <span className="muted">–</span>}</div>
      {bisaUbah && (
        <button type="button" className="btn btn-ikon kecil" onClick={buka} aria-label={`Ubah PIC ${d.kode}`} title="Ubah PIC">
          <Pencil aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
