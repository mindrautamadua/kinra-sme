'use client'

import { Pencil, Plus, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { hapusTemuan, simpanTemuan, ubahStatusTemuan } from '@/app/actions'
import { Chip } from '@/components/Chip'
import { useBoleh } from '@/components/Peran'
import { tanggal } from '@/lib/format'
import { KATEGORI_TEMUAN_CHIP, TEMUAN_STATUS_CHIP } from '@/lib/status'
import type { Klausul, Temuan } from '@/lib/types'

const JENIS = ['Internal', 'TÜV Stage 1', 'TÜV Stage 2'] as const
const KATEGORI = ['Mayor', 'Minor', 'Observasi', 'OFI'] as const
const STATUS_T = ['Terbuka', 'Proses', 'Verifikasi', 'Tertutup'] as const

export function DaftarTemuan({ temuan, klausul, dokumen, kini }: { temuan: Temuan[]; klausul: Klausul[]; dokumen: { id: string; kode: string; nama: string }[]; kini: string }) {
  const router = useRouter()
  const bisa = useBoleh()
  const dlg = useRef<HTMLDialogElement>(null)
  const [edit, setEdit] = useState<Temuan | null>(null)
  const [jenis, setJenis] = useState('')
  const [status, setStatus] = useState('')
  const [galat, setGalat] = useState<string | null>(null)
  const [menunggu, mulai] = useTransition()

  const tampil = temuan.filter((t) => (!jenis || t.jenis_audit === jenis) && (!status || t.status === status))
  const prefiks = (j: string) => (j === 'Internal' ? 'AI' : j === 'TÜV Stage 1' ? 'S1' : 'S2')
  const nomorBaru = (j: string) => `${prefiks(j)}-${String(temuan.filter((t) => t.jenis_audit === j).length + 1).padStart(3, '0')}`
  const dokMap = Object.fromEntries(dokumen.map((d) => [d.id, d]))

  function buka(t: Temuan | null) { setEdit(t); setGalat(null); dlg.current?.showModal() }

  return (
    <>
      <div className="tiles" style={{ marginBottom: 16 }}>
        {KATEGORI.map((k) => {
          const n = temuan.filter((t) => t.kategori === k)
          return (
            <div key={k} className="tile">
              <div className="tile-head"><span className="label">{k === 'OFI' ? 'Peluang perbaikan (OFI)' : `Temuan ${k.toLowerCase()}`}</span><Chip kode={KATEGORI_TEMUAN_CHIP[k]} label={k} /></div>
              <div className="nilai tnum">{n.filter((t) => t.status !== 'Tertutup').length}<small>terbuka</small></div>
              <div className="meta">{n.length} total · {n.filter((t) => t.status === 'Tertutup').length} tertutup</div>
            </div>
          )
        })}
      </div>
      <div className="card">
        <div className="toolbar">
          <div className="seg" role="group" aria-label="Jenis audit">
            {['', ...JENIS].map((j) => <button key={j} type="button" aria-pressed={jenis === j} onClick={() => setJenis(j)}>{j || 'Semua audit'}</button>)}
          </div>
          <div className="seg" role="group" aria-label="Status">
            {['', ...STATUS_T].map((s) => <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)}>{s || 'Semua'}<span className="n">{s ? temuan.filter((t) => t.status === s).length : temuan.length}</span></button>)}
          </div>
          <span style={{ flex: 1 }} />
          {bisa('temuan.tambah') && <button type="button" className="btn utama" onClick={() => buka(null)}><Plus aria-hidden="true" /><span className="teks">Catat temuan</span></button>}
        </div>
        <div className="table-wrap tall">
          <table className="tbl">
            <thead><tr><th>No.</th><th>Klausul</th><th>Temuan</th><th>Kategori</th><th>PIC · tenggat</th><th>Status</th><th /></tr></thead>
            <tbody>
              {tampil.length === 0 && <tr className="kosong"><td colSpan={7}>Tidak ada temuan yang cocok.</td></tr>}
              {tampil.map((t) => {
                const lewat = t.status !== 'Tertutup' && !!t.tenggat && t.tenggat < kini
                return (
                  <tr key={t.id} id={t.nomor} className={lewat ? 'lewat' : undefined}>
                    <td className="kode">{t.nomor}<span className="upd">{t.jenis_audit} · {tanggal(t.tanggal)}</span></td>
                    <td className="kode">{t.klausul_kode ?? '–'}</td>
                    <td style={{ maxWidth: 380 }}>{t.uraian}
                      {t.tindakan && <span className="upd">Tindakan: {t.tindakan}</span>}
                      {t.dokumen_id && dokMap[t.dokumen_id] && <span className="upd">Bukti: <Link href={`/dokumen/${t.dokumen_id}`}>{dokMap[t.dokumen_id].kode}</Link></span>}
                    </td>
                    <td><Chip kode={KATEGORI_TEMUAN_CHIP[t.kategori]} label={t.kategori} /></td>
                    <td className="small">{t.pic ?? '–'}<span className={`upd ${lewat ? 'txt-bad' : ''}`}>{tanggal(t.tenggat)}</span></td>
                    <td>
                      <Chip kode={TEMUAN_STATUS_CHIP[t.status]} label={t.status} />
                      {bisa('temuan.ubah') && (
                      <label style={{ display: 'block', marginTop: 4 }}><span className="sr-only">Ubah status {t.nomor}</span>
                        <select className="inline" value={t.status} onChange={(e) => mulai(async () => { const h = await ubahStatusTemuan(t.id, e.target.value); if (!h.ok) alert(h.pesan); router.refresh() })}>
                          {STATUS_T.map((s) => <option key={s} disabled={s === 'Tertutup' && !bisa('temuan.tutup')}>{s}</option>)}
                        </select>
                      </label>
                      )}
                    </td>
                    <td>{bisa('temuan.ubah') && <button type="button" className="btn btn-ikon" aria-label={`Ubah ${t.nomor}`} onClick={() => buka(t)}><Pencil aria-hidden="true" /></button>}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot><tr><td colSpan={7}>{tampil.length} dari {temuan.length} temuan</td></tr></tfoot>
          </table>
        </div>
      </div>

      <dialog ref={dlg} className="panel" onClose={() => setEdit(null)}>
        <FormTemuan key={edit?.id ?? 'baru'} edit={edit} klausul={klausul} dokumen={dokumen} nomorBaru={nomorBaru} kini={kini} galat={galat} menunggu={menunggu}
          tutup={() => dlg.current?.close()}
          simpan={(f) => mulai(async () => { const h = await simpanTemuan(edit?.id ?? null, f); if (!h.ok) return setGalat(h.pesan); dlg.current?.close(); router.refresh() })}
          bisaTutup={bisa('temuan.tutup')}
          hapus={edit && bisa('temuan.hapus') ? () => { if (!confirm(`Hapus temuan ${edit.nomor}?`)) return; mulai(async () => { const h = await hapusTemuan(edit.id); if (!h.ok) return setGalat(h.pesan); dlg.current?.close(); router.refresh() }) } : undefined} />
      </dialog>
    </>
  )
}

function FormTemuan({ edit, klausul, dokumen, nomorBaru, kini, galat, menunggu, tutup, simpan, hapus, bisaTutup }: {
  edit: Temuan | null; klausul: Klausul[]; dokumen: { id: string; kode: string; nama: string }[]; nomorBaru: (j: string) => string; kini: string
  galat: string | null; menunggu: boolean; tutup: () => void; simpan: (f: FormData) => void; hapus?: () => void; bisaTutup: boolean
}) {
  const [jenis, setJenis] = useState<string>(edit?.jenis_audit ?? 'Internal')
  return (
    <form className="card" action={simpan}>
      <div className="row"><h3>{edit ? `Ubah ${edit.nomor}` : 'Temuan baru'}</h3><button type="button" className="btn btn-ikon" aria-label="Tutup" onClick={tutup}><X aria-hidden="true" /></button></div>
      <div className="form-grid">
        <label className="field"><span>Jenis audit</span><select name="jenis_audit" value={jenis} onChange={(e) => setJenis(e.target.value)}>{JENIS.map((j) => <option key={j}>{j}</option>)}</select></label>
        <label className="field"><span>Nomor</span><input name="nomor" required key={jenis} defaultValue={edit?.nomor ?? nomorBaru(jenis)} /></label>
        <label className="field"><span>Tanggal</span><input type="date" name="tanggal" defaultValue={edit?.tanggal ?? kini} /></label>
        <label className="field"><span>Klausul</span><select name="klausul_kode" defaultValue={edit?.klausul_kode ?? ''}><option value="">–</option>{klausul.filter((k) => k.kode !== 'P').map((k) => <option key={k.kode} value={k.kode}>{k.kode} · {k.judul}</option>)}</select></label>
        <label className="field"><span>Kategori</span><select name="kategori" defaultValue={edit?.kategori ?? 'Minor'}>{KATEGORI.map((k) => <option key={k}>{k}</option>)}</select></label>
        <label className="field"><span>Status</span><select name="status" defaultValue={edit?.status ?? 'Terbuka'}>{STATUS_T.map((s) => <option key={s} disabled={s === 'Tertutup' && !bisaTutup}>{s}</option>)}</select></label>
        <label className="field full"><span>Uraian temuan</span><textarea name="uraian" required defaultValue={edit?.uraian ?? ''} /></label>
        <label className="field full"><span>Bukti objektif</span><textarea name="bukti" defaultValue={edit?.bukti ?? ''} /></label>
        <label className="field"><span>Auditor</span><input name="auditor" defaultValue={edit?.auditor ?? ''} /></label>
        <label className="field"><span>Auditee</span><input name="auditee" defaultValue={edit?.auditee ?? ''} /></label>
        <label className="field full"><span>Akar masalah</span><textarea name="akar_masalah" defaultValue={edit?.akar_masalah ?? ''} /></label>
        <label className="field full"><span>Tindakan perbaikan</span><textarea name="tindakan" defaultValue={edit?.tindakan ?? ''} /></label>
        <label className="field"><span>PIC</span><input name="pic" defaultValue={edit?.pic ?? ''} /></label>
        <label className="field"><span>Tenggat</span><input type="date" name="tenggat" defaultValue={edit?.tenggat ?? ''} /></label>
        <label className="field full"><span>Dokumen bukti perbaikan</span>
          <select name="dokumen_id" defaultValue={edit?.dokumen_id ?? ''}><option value="">–</option>{dokumen.map((d) => <option key={d.id} value={d.id}>{d.kode} · {d.nama}</option>)}</select>
        </label>
      </div>
      {galat && <p className="pesan galat" role="alert" style={{ marginTop: 12 }}>{galat}</p>}
      <div className="toolbar" style={{ marginTop: 16, marginBottom: 0 }}>
        <button className="btn utama" type="submit" disabled={menunggu}>{menunggu ? 'Menyimpan…' : 'Simpan'}</button>
        <span style={{ flex: 1 }} />
        {hapus && <button type="button" className="btn bahaya" onClick={hapus} disabled={menunggu}><Trash2 aria-hidden="true" /> Hapus</button>}
      </div>
    </form>
  )
}
