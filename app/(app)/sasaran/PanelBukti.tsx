'use client'

import { X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ambilBukti } from '@/app/actions'
import { EvidenceBerkas } from '@/components/EvidenceBerkas'
import { useBoleh } from '@/components/Peran'
import type { BerkasTampil, PemilikBukti } from '@/lib/types'

export type TargetBukti = PemilikBukti & { kode: string; judul: string; target?: string | null; status?: string | null }

/**
 * Panel unggah & lihat bukti pelaksanaan satu sasaran atau satu rencana aksi (klausul 6.2, 9.1).
 * Setiap berkas dicatat dengan periode pencapaian (bulan) agar terlihat bukti untuk bulan mana.
 */
export function PanelBukti({ target, kini, onTutup }: { target: TargetBukti | null; kini: string; onTutup: () => void }) {
  const dlg = useRef<HTMLDialogElement>(null)
  const bisa = useBoleh()
  const [periode, setPeriode] = useState(kini.slice(0, 7))
  const [berkas, setBerkas] = useState<BerkasTampil[] | null>(null)
  const [migrasi, setMigrasi] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)

  const muat = useCallback(async (t: TargetBukti) => {
    const h = await ambilBukti({ jenis: t.jenis, id: t.id })
    if (!h.ok) { setGalat(h.pesan); setBerkas([]); return }
    setGalat(null); setMigrasi(!!h.migrasi); setBerkas(h.berkas ?? [])
  }, [])

  useEffect(() => {
    if (!target) return
    setBerkas(null); setGalat(null); setPeriode(kini.slice(0, 7))
    dlg.current?.showModal()
    void muat(target)
  }, [target, kini, muat])

  const perPeriode = new Map<string, number>()
  for (const b of berkas ?? []) perPeriode.set(b.periode ?? 'tanpa periode', (perPeriode.get(b.periode ?? 'tanpa periode') ?? 0) + 1)

  return (
    <dialog ref={dlg} className="panel" onClose={onTutup}>
      {target && (
        <div className="card">
          <div className="row">
            <div>
              <span className="eyebrow">Bukti pelaksanaan · {target.jenis === 'sasaran' ? 'sasaran' : 'rencana aksi'} {target.kode}</span>
              <h3>{target.judul}</h3>
              {target.target && <p className="muted small">Target: {target.target}</p>}
            </div>
            <button type="button" className="btn btn-ikon" aria-label="Tutup" onClick={() => dlg.current?.close()}><X aria-hidden="true" /></button>
          </div>
          <p className="muted small" style={{ margin: '4px 0 12px' }}>
            Unggah rekaman yang membuktikan pelaksanaan, misalnya daftar hadir, materi, hasil tes, checklist inspeksi, foto sebelum/sesudah, atau data kWh.
            {target.jenis === 'sasaran' && ' Sasaran hanya dapat ditandai Tercapai bila sudah punya minimal satu bukti.'}
            {' '}Unggah oleh Admin dan Tim KINRA; hapus oleh Admin.
          </p>
          {bisa('bukti.unggah') && (
            <label className="field" style={{ maxWidth: 260, marginBottom: 12 }}>
              <span>Periode pencapaian untuk berkas berikutnya</span>
              <input type="month" value={periode} onChange={(e) => setPeriode(e.target.value || kini.slice(0, 7))} />
            </label>
          )}
          {perPeriode.size > 0 && (
            <p className="small" style={{ margin: '0 0 10px' }}>
              {[...perPeriode.entries()].map(([p, n]) => `${p}: ${n} berkas`).join(' · ')}
            </p>
          )}
          {galat && <p className="pesan galat small" role="alert">{galat}</p>}
          {berkas === null
            ? <p className="muted small">Memuat bukti…</p>
            : <EvidenceBerkas key={`${target.jenis}-${target.id}`} pemilik={{ jenis: target.jenis, id: target.id }} periode={periode} berkas={berkas} migrasi={migrasi} onBerubah={() => void muat(target)} />}
        </div>
      )}
    </dialog>
  )
}
