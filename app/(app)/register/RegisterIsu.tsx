'use client'

import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { hapusIsu, simpanIsu } from '@/app/actions'
import { Chip } from '@/components/Chip'
import { useBoleh } from '@/components/Peran'
import { tingkatRisiko } from '@/lib/status'
import type { Isu } from '@/lib/types'

export function RegisterIsu({ isu }: { isu: Isu[] }) {
  const router = useRouter()
  const bisa = useBoleh()
  const dlg = useRef<HTMLDialogElement>(null)
  const [edit, setEdit] = useState<Isu | null>(null)
  const [filter, setFilter] = useState<'' | 'Risiko' | 'Peluang'>('')
  const [sel, setSel] = useState<[number, number] | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [menunggu, mulai] = useTransition()

  const risiko = isu.filter((i) => i.jenis === 'Risiko')
  const sel5 = (d: number, k: number) => risiko.filter((i) => i.dampak === d && i.kemungkinan === k).length
  const tampil = isu.filter((i) => (!filter || i.jenis === filter) && (!sel || (i.jenis === 'Risiko' && i.dampak === sel[0] && i.kemungkinan === sel[1])))

  function buka(i: Isu | null) { setEdit(i); setGalat(null); dlg.current?.showModal() }

  return (
    <div className="grid-1-2">
      <div className="card">
        <h3>Peta risiko</h3>
        <p className="muted small" style={{ marginBottom: 12 }}>Jumlah risiko per sel. Klik sel untuk menyaring.</p>
        <div className="risk" role="grid" aria-label="Matriks dampak terhadap kemungkinan">
          {[5, 4, 3, 2, 1].map((d) => [
            <span key={`a${d}`} className="ax">{d}</span>,
            ...[1, 2, 3, 4, 5].map((k) => {
              const n = sel5(d, k)
              const aktif = sel?.[0] === d && sel?.[1] === k
              return (
                <button key={`${d}-${k}`} type="button" className="c r" aria-pressed={aktif}
                  aria-label={`Dampak ${d}, kemungkinan ${k}: ${n} risiko`}
                  onClick={() => setSel(aktif ? null : [d, k])}
                  style={{ '--f': `${Math.min(90, ((d * k) / 25) * 90)}%`, outline: aktif ? '2px solid var(--brand)' : undefined, color: 'var(--ink)', cursor: 'pointer', font: 'inherit' } as React.CSSProperties}>
                  {n || ''}
                </button>
              )
            }),
          ])}
          <span />
          {[1, 2, 3, 4, 5].map((k) => <span key={`b${k}`} className="ax">{k}</span>)}
        </div>
        <p className="muted small" style={{ marginTop: 8 }}>Vertikal: dampak · Horizontal: kemungkinan</p>
      </div>

      <div className="card">
        <div className="toolbar">
          <div className="seg" role="group" aria-label="Jenis isu">
            {(['', 'Risiko', 'Peluang'] as const).map((j) => <button key={j} type="button" aria-pressed={filter === j} onClick={() => setFilter(j)}>{j || 'Semua'}<span className="n">{j ? isu.filter((i) => i.jenis === j).length : isu.length}</span></button>)}
          </div>
          {sel && <button type="button" className="btn kecil" onClick={() => setSel(null)}><X aria-hidden="true" /> Sel {sel[0]}×{sel[1]}</button>}
          <span style={{ flex: 1 }} />
          {bisa('register.ubah') && <button type="button" className="btn utama" onClick={() => buka(null)}><Plus aria-hidden="true" /><span className="teks">Tambah isu</span></button>}
        </div>
        <div className="table-wrap tall">
          <table className="tbl">
            <thead><tr><th>Isu</th><th className="num">D×K</th><th>Tingkat</th><th>Tindakan</th><th /></tr></thead>
            <tbody>
              {tampil.length === 0 && <tr className="kosong"><td colSpan={5}>Tidak ada isu yang cocok.</td></tr>}
              {tampil.map((i) => {
                const t = tingkatRisiko(i.skor)
                return (
                  <tr key={i.id}>
                    <td style={{ maxWidth: 320 }}>{i.uraian}<span className="upd">{i.asal} · {i.jenis}{i.pic && ` · ${i.pic}`}</span></td>
                    <td className="num">{i.dampak}×{i.kemungkinan}<span className="upd">{i.skor}</span></td>
                    <td>{i.jenis === 'Risiko' ? <Chip kode={t.chip} label={t.label} /> : <Chip kode="info" label="Peluang" />}</td>
                    <td className="small" style={{ maxWidth: 360 }}>{i.tindakan}<span className="upd">Evaluasi: {i.evaluasi ?? '–'}</span></td>
                    <td>{bisa('register.ubah') && <button type="button" className="btn btn-ikon" aria-label={`Ubah isu ${i.id}`} onClick={() => buka(i)}><Pencil aria-hidden="true" /></button>}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot><tr><td colSpan={5}>{tampil.length} dari {isu.length} isu</td></tr></tfoot>
          </table>
        </div>
      </div>

      <dialog ref={dlg} className="panel" onClose={() => setEdit(null)}>
        <form className="card" key={edit?.id ?? 'baru'} action={(f) => mulai(async () => {
          const h = await simpanIsu(edit?.id ?? null, f)
          if (!h.ok) return setGalat(h.pesan)
          dlg.current?.close(); router.refresh()
        })}>
          <div className="row"><h3>{edit ? 'Ubah isu' : 'Isu baru'}</h3><button type="button" className="btn btn-ikon" aria-label="Tutup" onClick={() => dlg.current?.close()}><X aria-hidden="true" /></button></div>
          <div className="form-grid">
            <label className="field"><span>Asal</span><select name="asal" defaultValue={edit?.asal ?? 'Internal'}><option>Internal</option><option>Eksternal</option></select></label>
            <label className="field"><span>Jenis</span><select name="jenis" defaultValue={edit?.jenis ?? 'Risiko'}><option>Risiko</option><option>Peluang</option></select></label>
            <label className="field full"><span>Isu yang diidentifikasi</span><textarea name="uraian" required defaultValue={edit?.uraian ?? ''} /></label>
            <label className="field"><span>Dampak (1–5)</span><input type="number" name="dampak" min={1} max={5} required defaultValue={edit?.dampak ?? 3} /></label>
            <label className="field"><span>Kemungkinan (1–5)</span><input type="number" name="kemungkinan" min={1} max={5} required defaultValue={edit?.kemungkinan ?? 2} /></label>
            <label className="field full"><span>Tindakan</span><textarea name="tindakan" defaultValue={edit?.tindakan ?? ''} /></label>
            <label className="field full"><span>Evaluasi efektivitas</span><textarea name="evaluasi" defaultValue={edit?.evaluasi ?? ''} /></label>
            <label className="field"><span>PIC</span><input name="pic" defaultValue={edit?.pic ?? ''} /></label>
          </div>
          {galat && <p className="pesan galat" role="alert" style={{ marginTop: 12 }}>{galat}</p>}
          <div className="toolbar" style={{ marginTop: 16, marginBottom: 0 }}>
            <button className="btn utama" type="submit" disabled={menunggu}>{menunggu ? 'Menyimpan…' : 'Simpan'}</button>
            <span style={{ flex: 1 }} />
            {edit && bisa('register.hapus') && <button type="button" className="btn bahaya" disabled={menunggu} onClick={() => {
              if (!confirm('Hapus isu ini?')) return
              mulai(async () => { const h = await hapusIsu(edit.id); if (!h.ok) return setGalat(h.pesan); dlg.current?.close(); router.refresh() })
            }}><Trash2 aria-hidden="true" /> Hapus</button>}
          </div>
        </form>
      </dialog>
    </div>
  )
}
