'use client'

import { Pencil } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { simpanCatatanDokumen } from '@/app/actions'
import { waktu } from '@/lib/format'
import type { Dokumen } from '@/lib/types'

/** Saran isian posisi draf; tetap bisa diketik bebas. */
const SARAN_POSISI = ['Tim KINRA', 'Konsultan', 'Dokumen Kontrol', 'PIC', 'Menunggu tanda tangan', 'Selesai, siap diunggah']

/** Sel "Keterangan" di lembar Kesiapan: posisi draf + catatan bebas, bisa diubah langsung oleh peran dengan hak dokumen.ubah. */
export function CatatanDokumen({ d, bisaUbah }: { d: Dokumen; bisaUbah: boolean }) {
  const router = useRouter()
  const [ubah, setUbah] = useState(false)
  const [posisi, setPosisi] = useState(d.posisi_draf ?? '')
  const [ket, setKet] = useState(d.keterangan ?? '')
  const [galat, setGalat] = useState<string | null>(null)
  const [sibuk, mulai] = useTransition()

  function buka() {
    setPosisi(d.posisi_draf ?? ''); setKet(d.keterangan ?? ''); setGalat(null); setUbah(true)
  }

  function simpan(e: React.FormEvent) {
    e.preventDefault()
    mulai(async () => {
      const h = await simpanCatatanDokumen(d.id, posisi, ket)
      if (!h.ok) { setGalat(h.pesan); return }
      setUbah(false)
      router.refresh()
    })
  }

  if (ubah) {
    return (
      <form className="ks-catatan-form" onSubmit={simpan}>
        <label className="small">
          <span className="muted">Draf ada di</span>
          <input list="saran-posisi-draf" value={posisi} onChange={(e) => setPosisi(e.target.value)} maxLength={120} placeholder="mis. Konsultan" autoFocus />
        </label>
        <datalist id="saran-posisi-draf">{SARAN_POSISI.map((s) => <option key={s} value={s} />)}</datalist>
        <label className="small">
          <span className="muted">Keterangan</span>
          <textarea value={ket} onChange={(e) => setKet(e.target.value)} maxLength={1000} rows={3} placeholder="Catatan lain, mis. menunggu revisi bab 3" />
        </label>
        {galat && <p className="pesan galat small" role="alert">{galat}</p>}
        <div className="ks-catatan-aksi">
          <button type="button" className="btn kecil" onClick={() => setUbah(false)} disabled={sibuk}>Batal</button>
          <button type="submit" className="btn kecil utama" disabled={sibuk}>{sibuk ? 'Menyimpan…' : 'Simpan'}</button>
        </div>
      </form>
    )
  }

  const kosong = !d.posisi_draf && !d.keterangan
  return (
    <div className="ks-catatan">
      <div className="grow">
        {d.posisi_draf && <span className="ks-posisi">Draf di: <b>{d.posisi_draf}</b></span>}
        {d.keterangan && <span className="ks-ket">{d.keterangan}</span>}
        {kosong && <span className="muted">–</span>}
        {/* Tanpa nama pengubah (mis. diisi lewat SQL Editor) tidak ditampilkan: jejak tanpa orang tidak bisa dipertanggungjawabkan */}
        {d.catatan_at && d.catatan_oleh && <span className="upd">{d.catatan_oleh} · {waktu(d.catatan_at)}</span>}
      </div>
      {bisaUbah && (
        <button type="button" className="btn btn-ikon kecil" onClick={buka} aria-label={`Ubah keterangan ${d.kode}`} title="Ubah posisi draf & keterangan">
          <Pencil aria-hidden="true" />
        </button>
      )}
    </div>
  )
}
