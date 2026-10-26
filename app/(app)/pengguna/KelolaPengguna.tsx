'use client'

import { KeyRound, Pencil, Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { aturUlangSandi, tambahPengguna, ubahPengguna } from '@/app/actions'
import { Chip } from '@/components/Chip'
import { AKSES, DAFTAR_PERAN, LABEL_AKSI, LABEL_PERAN, type Peran } from '@/lib/akses'
import { waktu } from '@/lib/format'

export type BarisPengguna = { id: string; email: string; nama: string; peran: Peran; aktif: boolean; terakhir_masuk: string | null; terkunci_sampai: string | null }

const PERAN = DAFTAR_PERAN

function sandiAcak() {
  const h = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
  const a = crypto.getRandomValues(new Uint32Array(12))
  return Array.from(a, (n) => h[n % h.length]).join('')
}

export function KelolaPengguna({ daftar, sayaId }: { daftar: BarisPengguna[]; sayaId: string }) {
  const router = useRouter()
  const dlg = useRef<HTMLDialogElement>(null)
  const [edit, setEdit] = useState<BarisPengguna | null>(null)
  const [sandiBaru, setSandiBaru] = useState('')
  const [info, setInfo] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [menunggu, mulai] = useTransition()

  function buka(p: BarisPengguna | null) { setEdit(p); setGalat(null); setSandiBaru(sandiAcak()); dlg.current?.showModal() }

  return (
    <div className="stack">
      {info && <p className="pesan" role="status">{info}</p>}
      <div className="card">
        <div className="toolbar"><span style={{ flex: 1 }} /><button type="button" className="btn utama" onClick={() => buka(null)}><Plus aria-hidden="true" /><span className="teks">Tambah pengguna</span></button></div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Nama</th><th>Peran</th><th>Status</th><th>Terakhir masuk</th><th /></tr></thead>
            <tbody>
              {daftar.map((p) => (
                <tr key={p.id}>
                  <td><b>{p.nama}</b>{p.id === sayaId && <span className="muted small"> (Anda)</span>}<span className="upd">{p.email}</span></td>
                  <td><Chip kode={p.peran === 'admin' ? 'warn' : p.peran === 'konsultan' ? 'info' : p.peran === 'tim_kinra' ? 'good' : 'na'} label={LABEL_PERAN[p.peran]} /></td>
                  <td>
                    {!p.aktif ? <Chip kode="crit" label="Nonaktif" />
                      : p.terkunci_sampai && p.terkunci_sampai > new Date().toISOString() ? <Chip kode="serious" label="Terkunci sementara" />
                      : <Chip kode="good" label="Aktif" />}
                  </td>
                  <td className="small mono">{waktu(p.terakhir_masuk)}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button type="button" className="btn btn-ikon" aria-label={`Ubah ${p.nama}`} onClick={() => buka(p)}><Pencil aria-hidden="true" /></button>{' '}
                    <button type="button" className="btn btn-ikon" aria-label={`Atur ulang sandi ${p.nama}`} title="Atur ulang sandi" disabled={menunggu}
                      onClick={() => {
                        const s = sandiAcak()
                        if (!confirm(`Atur ulang sandi ${p.nama}? Sesi aktifnya akan diakhiri.`)) return
                        mulai(async () => {
                          const h = await aturUlangSandi(p.id, s)
                          setInfo(h.ok ? `Sandi sementara ${p.nama} (${p.email}): ${s} — sampaikan secara langsung; wajib diganti saat login.` : `Gagal: ${h.pesan}`)
                        })
                      }}><KeyRound aria-hidden="true" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={5}>{daftar.length} akun</td></tr></tfoot>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 12 }}>Hak akses per peran</h3>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Tindakan</th>{PERAN.map((p) => <th key={p} style={{ textAlign: 'center' }}>{LABEL_PERAN[p]}</th>)}</tr></thead>
            <tbody>
              {Object.entries(AKSES).map(([a, ps]) => (
                <tr key={a}>
                  <td>{LABEL_AKSI[a as keyof typeof LABEL_AKSI] ?? a}</td>
                  {PERAN.map((p) => <td key={p} style={{ textAlign: 'center' }}>{(ps as Peran[]).includes(p) ? <Chip kode="good" label="Ya" /> : <span className="muted">–</span>}</td>)}
                </tr>
              ))}
              <tr><td>Melihat semua data</td>{PERAN.map((p) => <td key={p} style={{ textAlign: 'center' }}><Chip kode="good" label="Ya" /></td>)}</tr>
            </tbody>
          </table>
        </div>
        <p className="sumber">Ditegakkan di database (RLS & trigger), bukan hanya di tampilan.</p>
      </div>

      <dialog ref={dlg} className="panel" onClose={() => setEdit(null)}>
        <form className="card" key={edit?.id ?? 'baru'} action={(f) => mulai(async () => {
          const h = edit ? await ubahPengguna(edit.id, f) : await tambahPengguna(f)
          if (!h.ok) return setGalat(h.pesan)
          if (!edit) setInfo(`Akun ${f.get('nama')} (${f.get('email')}) dibuat. Sandi sementara: ${f.get('sandi')} — sampaikan secara langsung; wajib diganti saat login pertama.`)
          dlg.current?.close(); router.refresh()
        })}>
          <div className="row"><h3>{edit ? `Ubah ${edit.nama}` : 'Pengguna baru'}</h3><button type="button" className="btn btn-ikon" aria-label="Tutup" onClick={() => dlg.current?.close()}><X aria-hidden="true" /></button></div>
          <div className="form-grid">
            <label className="field full"><span>Nama</span><input name="nama" required defaultValue={edit?.nama ?? ''} /></label>
            <label className="field full"><span>Email</span><input type="email" name="email" required defaultValue={edit?.email ?? ''} disabled={!!edit} /></label>
            <label className="field"><span>Peran</span>
              <select name="peran" defaultValue={edit?.peran ?? 'tim_kinra'}>{PERAN.map((p) => <option key={p} value={p}>{LABEL_PERAN[p]}</option>)}</select>
            </label>
            {edit ? (
              <label className="field" style={{ justifyContent: 'flex-end' }}><span>Status</span>
                <span style={{ display: 'flex', gap: 8, alignItems: 'center', height: 36 }}><input type="checkbox" name="aktif" defaultChecked={edit.aktif} style={{ width: 18, height: 18 }} /> Aktif</span>
              </label>
            ) : (
              <label className="field"><span>Sandi sementara</span><input name="sandi" required minLength={8} value={sandiBaru} onChange={(e) => setSandiBaru(e.target.value)} className="mono" /></label>
            )}
          </div>
          {galat && <p className="pesan galat" role="alert" style={{ marginTop: 12 }}>{galat}</p>}
          <div className="toolbar" style={{ marginTop: 16, marginBottom: 0 }}><button className="btn utama" type="submit" disabled={menunggu}>{menunggu ? 'Menyimpan…' : 'Simpan'}</button></div>
        </form>
      </dialog>
    </div>
  )
}
