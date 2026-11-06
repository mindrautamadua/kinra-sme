'use client'

import { Pencil, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { simpanParameter } from '@/app/actions'
import { Chip } from '@/components/Chip'
import { useBoleh } from '@/components/Peran'
import { angka } from '@/lib/format'
import type { ParameterEnergi } from '@/lib/konversi'

/** Daftar parameter konversi rupiah & CO₂; admin/konsultan dapat mengubah nilai, status, dan sumbernya. */
export function FormParameter({ param }: { param: ParameterEnergi[] }) {
  const router = useRouter()
  const bisa = useBoleh()('parameter.ubah')
  const dlg = useRef<HTMLDialogElement>(null)
  const [edit, setEdit] = useState<ParameterEnergi | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [menunggu, mulai] = useTransition()

  return (
    <div className="card">
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Parameter</th><th className="num">Nilai</th><th>Status</th><th>Sumber</th><th /></tr></thead>
          <tbody>
            {param.map((p) => (
              <tr key={p.kode}>
                <td><b>{p.nama}</b></td>
                <td className="num">{angka(p.nilai, p.nilai < 10 ? 2 : 2)} {p.satuan}</td>
                <td><Chip kode={p.status === 'Data' ? 'good' : 'warn'} label={p.status} /></td>
                <td className="small" style={{ maxWidth: 420 }}>{p.sumber ?? '–'}</td>
                <td>{bisa && <button type="button" className="btn btn-ikon" aria-label={`Ubah ${p.nama}`} onClick={() => { setEdit(p); setGalat(null); dlg.current?.showModal() }}><Pencil aria-hidden="true" /></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="sumber">Dipakai untuk menampilkan rupiah dan emisi CO₂ di seluruh aplikasi. Nilai berstatus Asumsi wajib diverifikasi sebelum dikutip di laporan resmi. Hanya admin dan konsultan yang dapat mengubah.</p>
      <dialog ref={dlg} className="panel" onClose={(e) => { if (e.target === e.currentTarget) setEdit(null) }}>
        {edit && (
          <form className="card" key={edit.kode} action={(f) => mulai(async () => {
            const nilai = Number(String(f.get('nilai') ?? '').replace(',', '.'))
            const h = await simpanParameter(edit.kode, nilai, f.get('status') === 'Data' ? 'Data' : 'Asumsi', String(f.get('sumber') ?? ''))
            if (!h.ok) return setGalat(h.pesan)
            dlg.current?.close(); router.refresh()
          })}>
            <div className="row"><h3>{edit.nama}</h3><button type="button" className="btn btn-ikon" aria-label="Tutup" onClick={() => dlg.current?.close()}><X aria-hidden="true" /></button></div>
            <div className="form-grid">
              <label className="field"><span>Nilai ({edit.satuan})</span><input name="nilai" inputMode="decimal" required defaultValue={String(edit.nilai)} /></label>
              <label className="field"><span>Status</span>
                <select name="status" defaultValue={edit.status}><option value="Data">Data (terverifikasi)</option><option value="Asumsi">Asumsi</option></select>
              </label>
              <label className="field full"><span>Sumber</span><textarea name="sumber" defaultValue={edit.sumber ?? ''} placeholder="mis. Faktor emisi grid Sumatera KESDM 2025; tagihan PLN Okt 2026" /></label>
            </div>
            {galat && <p className="pesan galat" role="alert" style={{ marginTop: 12 }}>{galat}</p>}
            <div className="toolbar" style={{ marginTop: 16, marginBottom: 0 }}><button className="btn utama" type="submit" disabled={menunggu}>{menunggu ? 'Menyimpan…' : 'Simpan'}</button></div>
          </form>
        )}
      </dialog>
    </div>
  )
}
