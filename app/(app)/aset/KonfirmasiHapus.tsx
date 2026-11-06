'use client'

import { AlertTriangle, Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState, useTransition } from 'react'

type Target = { judul: string; poin: string[]; hapus: () => Promise<{ ok: true } | { ok: false; pesan: string }> }

/** Modal konfirmasi hapus aset/meter. `target` null = tertutup. */
export function KonfirmasiHapus({ target, onTutup, onSelesai }: { target: Target | null; onTutup: () => void; onSelesai: () => void }) {
  const dlg = useRef<HTMLDialogElement>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [sibuk, mulai] = useTransition()

  useEffect(() => {
    const el = dlg.current
    if (!el) return
    if (target && !el.open) { setGalat(null); el.showModal() }
    if (!target && el.open) el.close()
  }, [target])

  function hapus() {
    if (!target) return
    mulai(async () => {
      const h = await target.hapus()
      if (!h.ok) { setGalat(h.pesan); return }
      onTutup()
      onSelesai()
    })
  }

  return (
    <dialog ref={dlg} className="panel ks-hapus" aria-labelledby="judul-hapus-aset"
      onCancel={(e) => { if (sibuk) e.preventDefault() }}
      onClose={(e) => { if (e.target === e.currentTarget) onTutup() }}>
      {target && (
        <div className="card">
          <div className="row">
            <h3 id="judul-hapus-aset">{target.judul}</h3>
            <button type="button" className="btn btn-ikon" aria-label="Tutup" disabled={sibuk} onClick={() => dlg.current?.close()}><X aria-hidden="true" /></button>
          </div>
          <div className="pesan galat ks-hapus-peringatan">
            <AlertTriangle aria-hidden="true" />
            <div>
              <b>Tindakan ini tidak dapat dibatalkan.</b>
              <ul>{target.poin.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>
          </div>
          {galat && <p className="pesan galat small" role="alert">{galat}</p>}
          <div className="ks-catatan-aksi">
            <button type="button" className="btn" disabled={sibuk} onClick={() => dlg.current?.close()} autoFocus>Batal</button>
            <button type="button" className="btn hapus-tegas" disabled={sibuk} onClick={hapus}>
              <Trash2 aria-hidden="true" /> {sibuk ? 'Menghapus…' : 'Hapus permanen'}
            </button>
          </div>
        </div>
      )}
    </dialog>
  )
}
