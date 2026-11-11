'use client'

import { AlertTriangle, Trash2, X } from 'lucide-react'
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { cocokKata, KetikKonfirmasi } from './KetikKonfirmasi'

/** Permintaan konfirmasi hapus. `kata`: teks yang harus diketik, biasanya kode item; 'HAPUS' bila item tak berkode. */
export type MintaHapus = { judul: string; kata: string; poin?: string[] }
type Minta = (m: MintaHapus) => Promise<boolean>

// Di luar provider (seharusnya tidak terjadi): jatuh ke confirm() bawaan agar hapus tidak gagal diam-diam
const Ctx = createContext<Minta>(async (m) => window.confirm(m.judul))

/**
 * Pengganti `confirm()` untuk penghapusan: `if (!(await mintaHapus({ judul, kata })) ) return`.
 * Modal meminta pengguna mengetik `kata` sebelum tombol hapus aktif.
 */
export const useKonfirmasiHapus = () => useContext(Ctx)

export function KonfirmasiHapusProvider({ children }: { children: ReactNode }) {
  const dlg = useRef<HTMLDialogElement>(null)
  const jawab = useRef<((v: boolean) => void) | null>(null)
  const [minta, setMinta] = useState<MintaHapus | null>(null)
  const [ketik, setKetik] = useState('')
  const cocok = !!minta && cocokKata(ketik, minta.kata)

  const mintaHapus = useCallback<Minta>((m) => new Promise<boolean>((selesai) => {
    jawab.current?.(false)
    jawab.current = selesai
    setKetik('')
    setMinta(m)
  }), [])

  useEffect(() => {
    const el = dlg.current
    if (minta && el && !el.open) el.showModal()
  }, [minta])

  const tutup = (v: boolean) => {
    jawab.current?.(v)
    jawab.current = null
    setMinta(null)
    if (dlg.current?.open) dlg.current.close()
  }
  const hapus = () => { if (cocok) tutup(true) }

  return (
    <Ctx.Provider value={mintaHapus}>
      {children}
      <dialog ref={dlg} className="panel ks-hapus" aria-labelledby="judul-konfirmasi-hapus"
        onClose={(e) => { if (e.target === e.currentTarget && jawab.current) tutup(false) }}>
        {minta && (
          <div className="card">
            <div className="row">
              <div><h3 id="judul-konfirmasi-hapus">{minta.judul}</h3></div>
              <button type="button" className="btn btn-ikon" aria-label="Tutup" onClick={() => tutup(false)}><X aria-hidden="true" /></button>
            </div>
            <div className="pesan galat ks-hapus-peringatan">
              <AlertTriangle aria-hidden="true" />
              <div>
                <b>Tindakan ini tidak dapat dibatalkan.</b>
                {minta.poin?.length ? <ul>{minta.poin.map((p) => <li key={p}>{p}</li>)}</ul> : null}
              </div>
            </div>
            <KetikKonfirmasi kata={minta.kata} nilai={ketik} onUbah={setKetik} onKirim={hapus} />
            <div className="ks-catatan-aksi">
              <button type="button" className="btn" onClick={() => tutup(false)} autoFocus>Batal</button>
              <button type="button" className="btn hapus-tegas" disabled={!cocok} onClick={hapus}>
                <Trash2 aria-hidden="true" /> Hapus permanen
              </button>
            </div>
          </div>
        )}
      </dialog>
    </Ctx.Provider>
  )
}
