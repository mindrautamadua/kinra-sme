'use client'

import { Pencil, Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { simpanTinjauan } from '@/app/actions'
import { useBoleh } from '@/components/Peran'
import type { TinjauanEnergi } from '@/lib/types'

/** Ubah catatan tinjauan energi (periode, ambang SEU, ringkasan, persetujuan) atau mulai tinjauan baru. */
export function FormTinjauan({ tinjauan }: { tinjauan: TinjauanEnergi | null }) {
  const router = useRouter()
  const bisa = useBoleh()
  const dlg = useRef<HTMLDialogElement>(null)
  const [baru, setBaru] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const [menunggu, mulai] = useTransition()
  if (!bisa('seu.ubah')) return null
  const t = baru ? null : tinjauan

  function buka(b: boolean) { setBaru(b); setGalat(null); dlg.current?.showModal() }

  return (
    <>
      <div style={{ display: 'flex', gap: 8 }}>
        {tinjauan && <button type="button" className="btn" onClick={() => buka(false)}><Pencil aria-hidden="true" /><span className="teks">Ubah</span></button>}
        <button type="button" className="btn" onClick={() => buka(true)}><Plus aria-hidden="true" /><span className="teks">Tinjauan baru</span></button>
      </div>
      <dialog ref={dlg} className="panel">
        <form className="card" key={t?.id ?? 'baru'} action={(f) => mulai(async () => {
          const h = await simpanTinjauan(t?.id ?? null, f)
          if (!h.ok) return setGalat(h.pesan)
          dlg.current?.close(); router.refresh()
        })}>
          <div className="row"><h3>{t ? 'Ubah tinjauan energi' : 'Tinjauan energi baru'}</h3><button type="button" className="btn btn-ikon" aria-label="Tutup" onClick={() => dlg.current?.close()}><X aria-hidden="true" /></button></div>
          <div className="form-grid">
            <label className="field"><span>Awal periode</span><input type="date" name="periode_mulai" required defaultValue={t?.periode_mulai ?? ''} /></label>
            <label className="field"><span>Akhir periode</span><input type="date" name="periode_selesai" required defaultValue={t?.periode_selesai ?? ''} /></label>
            <label className="field"><span>Ambang porsi SEU (%)</span><input type="number" name="ambang_persen" min={1} max={100} step="any" defaultValue={t?.ambang_persen ?? tinjauan?.ambang_persen ?? 10} /></label>
            <label className="field"><span>Ambang kumulatif (%)</span><input type="number" name="ambang_kumulatif" min={1} max={100} step="any" defaultValue={t?.ambang_kumulatif ?? tinjauan?.ambang_kumulatif ?? 80} /></label>
            <label className="field full"><span>Status</span>
              <select name="status" defaultValue={t?.status ?? 'Draft'}>
                <option value="Draft">Draft</option>
                <option value="Disetujui" disabled={!bisa('seu.tetapkan')}>Disetujui</option>
              </select>
            </label>
            <label className="field full"><span>Ringkasan hasil tinjauan</span><textarea name="ringkasan" rows={5} defaultValue={t?.ringkasan ?? ''} placeholder="Temuan utama, SEU yang ditetapkan, perubahan sejak tinjauan sebelumnya, peluang yang diprioritaskan" /></label>
          </div>
          {galat && <p className="pesan galat" role="alert" style={{ marginTop: 12 }}>{galat}</p>}
          <div className="toolbar" style={{ marginTop: 16, marginBottom: 0 }}>
            <button className="btn utama" type="submit" disabled={menunggu}>{menunggu ? 'Menyimpan…' : 'Simpan'}</button>
          </div>
        </form>
      </dialog>
    </>
  )
}
