'use client'

import { Pencil, Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { simpanPeluang } from '@/app/actions'
import { Chip } from '@/components/Chip'
import { useBoleh } from '@/components/Peran'
import { angka } from '@/lib/format'
import type { Peluang } from '@/lib/types'

const STATUS_P = ['Belum dinilai', 'Dinilai', 'Disetujui', 'Berjalan', 'Selesai', 'Ditunda', 'Ditolak']
const chipStatus = (s: string) => (s === 'Selesai' ? 'good' : s === 'Berjalan' || s === 'Disetujui' ? 'info' : s === 'Ditolak' || s === 'Ditunda' ? 'na' : s === 'Dinilai' ? 'warn' : 'serious') as 'good'

export function RegisterPeluang({ peluang }: { peluang: Peluang[] }) {
  const router = useRouter()
  const bisa = useBoleh()
  const dlg = useRef<HTMLDialogElement>(null)
  const [edit, setEdit] = useState<Peluang | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [menunggu, mulai] = useTransition()
  const urut = [...peluang].sort((a, b) => (b.prioritas ?? -1) - (a.prioritas ?? -1) || a.kode.localeCompare(b.kode))
  const kodeBaru = `P-${String(Math.max(0, ...peluang.map((p) => Number(p.kode.slice(2)) || 0)) + 1).padStart(2, '0')}`

  function buka(p: Peluang | null) { setEdit(p); setGalat(null); dlg.current?.showModal() }

  return (
    <div className="card">
      <div className="toolbar"><span style={{ flex: 1 }} />{bisa('register.ubah') && <button type="button" className="btn utama" onClick={() => buka(null)}><Plus aria-hidden="true" /><span className="teks">Tambah peluang</span></button>}</div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>ID</th><th>Peluang</th><th>Pemilik</th><th className="num">Energi</th><th className="num">ROI</th><th className="num">Prioritas</th><th className="num">Estimasi hemat</th><th>Status</th><th /></tr></thead>
          <tbody>
            {urut.map((p) => (
              <tr key={p.kode}>
                <td className="kode">{p.kode}</td>
                <td style={{ maxWidth: 340 }}>{p.uraian}<span className="upd">{p.variabel}</span></td>
                <td className="small">{p.pemilik}</td>
                <td className="num">{p.skor_energi ?? '–'}</td>
                <td className="num">{p.skor_roi ?? '–'}</td>
                <td className="num"><b>{p.prioritas !== null ? angka(p.prioritas, 1) : '–'}</b></td>
                <td className="num">{p.estimasi_kwh !== null ? `${angka(p.estimasi_kwh)} kWh` : '–'}</td>
                <td><Chip kode={chipStatus(p.status)} label={p.status} /></td>
                <td>{bisa('register.ubah') && <button type="button" className="btn btn-ikon" aria-label={`Ubah ${p.kode}`} onClick={() => buka(p)}><Pencil aria-hidden="true" /></button>}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td colSpan={9}>{peluang.length} peluang · urut prioritas tertinggi</td></tr></tfoot>
        </table>
      </div>

      <dialog ref={dlg} className="panel" onClose={() => setEdit(null)}>
        <form className="card" key={edit?.kode ?? 'baru'} action={(f) => mulai(async () => {
          const h = await simpanPeluang(edit?.kode ?? '', f)
          if (!h.ok) return setGalat(h.pesan)
          dlg.current?.close(); router.refresh()
        })}>
          <div className="row"><h3>{edit ? `Ubah ${edit.kode}` : 'Peluang baru'}</h3><button type="button" className="btn btn-ikon" aria-label="Tutup" onClick={() => dlg.current?.close()}><X aria-hidden="true" /></button></div>
          <div className="form-grid">
            <label className="field"><span>ID</span><input name="kode" defaultValue={edit?.kode ?? kodeBaru} readOnly={!!edit} /></label>
            <label className="field"><span>Status</span><select name="status" defaultValue={edit?.status ?? 'Belum dinilai'}>{STATUS_P.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label className="field full"><span>Peluang peningkatan</span><textarea name="uraian" required defaultValue={edit?.uraian ?? ''} /></label>
            <label className="field full"><span>Variabel/data terkait</span><input name="variabel" defaultValue={edit?.variabel ?? ''} /></label>
            <label className="field full"><span>Metode kajian/tindakan awal</span><textarea name="metode" defaultValue={edit?.metode ?? ''} /></label>
            <label className="field"><span>Pemilik usulan</span><input name="pemilik" defaultValue={edit?.pemilik ?? ''} /></label>
            <label className="field"><span>Estimasi hemat (kWh/tahun)</span><input type="number" name="estimasi_kwh" min={0} step="any" defaultValue={edit?.estimasi_kwh ?? ''} /></label>
            <label className="field"><span>Skor potensi energi (1–5)</span><input type="number" name="skor_energi" min={1} max={5} defaultValue={edit?.skor_energi ?? ''} /></label>
            <label className="field"><span>Skor ROI (1–5)</span><input type="number" name="skor_roi" min={1} max={5} defaultValue={edit?.skor_roi ?? ''} /></label>
          </div>
          {galat && <p className="pesan galat" role="alert" style={{ marginTop: 12 }}>{galat}</p>}
          <div className="toolbar" style={{ marginTop: 16, marginBottom: 0 }}><button className="btn utama" type="submit" disabled={menunggu}>{menunggu ? 'Menyimpan…' : 'Simpan'}</button></div>
        </form>
      </dialog>
    </div>
  )
}
