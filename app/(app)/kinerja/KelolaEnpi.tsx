'use client'

import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { hapusEnpi, hapusVariabel, simpanEnpi, simpanVariabel } from '@/app/actions'
import { Chip } from '@/components/Chip'
import { useBoleh } from '@/components/Peran'
import { LABEL_METODE } from '@/lib/enpi'
import type { Enpi, MetodeEnpi, SumberEnergi, VariabelRelevan } from '@/lib/types'

const bulanIso = (d: string) => d.slice(0, 7)

export function DaftarEnpi({ enpi, sumber, variabel }: { enpi: Enpi[]; sumber: SumberEnergi[]; variabel: VariabelRelevan[] }) {
  const router = useRouter()
  const bisa = useBoleh()
  const dlg = useRef<HTMLDialogElement>(null)
  const [edit, setEdit] = useState<Enpi | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [menunggu, mulai] = useTransition()
  const kodeBaru = `ENPI-${String(Math.max(0, ...enpi.map((e) => Number(e.kode.replace(/\D/g, '')) || 0)) + 1).padStart(2, '0')}`
  const namaVar = Object.fromEntries(variabel.map((v) => [v.kode, v.nama]))

  function buka(e: Enpi | null) { setEdit(e); setGalat(null); dlg.current?.showModal() }

  return (
    <div className="card">
      <div className="toolbar"><span style={{ flex: 1 }} />
        {bisa('enpi.tambah') && <button type="button" className="btn utama" onClick={() => buka(null)}><Plus aria-hidden="true" /><span className="teks">Tambah EnPI</span></button>}
      </div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Kode</th><th>EnPI</th><th>Ruang lingkup</th><th>Metode · variabel</th><th>Baseline (EnB)</th><th>Status</th><th /></tr></thead>
          <tbody>
            {enpi.length === 0 && <tr className="kosong"><td colSpan={7}>Belum ada EnPI.</td></tr>}
            {enpi.map((e) => (
              <tr key={e.kode}>
                <td className="kode">{e.kode}</td>
                <td style={{ maxWidth: 280 }}><b>{e.nama}</b>{e.alasan_baseline && <span className="upd">{e.alasan_baseline}</span>}</td>
                <td className="small">{e.sumber_kode.map((k) => k.toUpperCase()).join(' + ')}</td>
                <td className="small">{LABEL_METODE[e.metode]}{e.variabel_kode.length > 0 && <span className="upd">{e.variabel_kode.map((k) => namaVar[k] ?? k).join(', ')}</span>}</td>
                <td className="small tnum" style={{ whiteSpace: 'nowrap' }}>{bulanIso(e.baseline_mulai)} s.d. {bulanIso(e.baseline_selesai)}</td>
                <td><Chip kode={e.aktif ? 'good' : 'na'} label={e.aktif ? 'Aktif' : 'Nonaktif'} /></td>
                <td>{bisa('enpi.ubah') && <button type="button" className="btn btn-ikon" aria-label={`Ubah ${e.kode}`} onClick={() => buka(e)}><Pencil aria-hidden="true" /></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dialog ref={dlg} className="panel" onClose={() => setEdit(null)}>
        <FormEnpi key={edit?.kode ?? 'baru'} edit={edit} kodeBaru={kodeBaru} sumber={sumber} variabel={variabel} galat={galat} menunggu={menunggu}
          tutup={() => dlg.current?.close()}
          simpan={(f) => mulai(async () => { const h = await simpanEnpi(edit?.kode ?? null, f); if (!h.ok) return setGalat(h.pesan); dlg.current?.close(); router.refresh() })}
          hapus={edit && bisa('enpi.hapus') ? () => { if (!confirm(`Hapus ${edit.kode}? Sasaran yang terkait akan kehilangan tautan EnPI.`)) return; mulai(async () => { const h = await hapusEnpi(edit.kode); if (!h.ok) return setGalat(h.pesan); dlg.current?.close(); router.refresh() }) } : undefined} />
      </dialog>
    </div>
  )
}

function FormEnpi({ edit, kodeBaru, sumber, variabel, galat, menunggu, tutup, simpan, hapus }: {
  edit: Enpi | null; kodeBaru: string; sumber: SumberEnergi[]; variabel: VariabelRelevan[]
  galat: string | null; menunggu: boolean; tutup: () => void; simpan: (f: FormData) => void; hapus?: () => void
}) {
  const [metode, setMetode] = useState<MetodeEnpi>(edit?.metode ?? 'regresi')
  return (
    <form className="card" action={simpan}>
      <div className="row"><h3>{edit ? `Ubah ${edit.kode}` : 'EnPI baru'}</h3><button type="button" className="btn btn-ikon" aria-label="Tutup" onClick={tutup}><X aria-hidden="true" /></button></div>
      <div className="form-grid">
        <label className="field"><span>Kode</span><input name="kode" required defaultValue={edit?.kode ?? kodeBaru} readOnly={!!edit} /></label>
        <label className="field"><span>Urutan tampil</span><input type="number" name="urutan" defaultValue={edit?.urutan ?? 0} /></label>
        <label className="field full"><span>Nama EnPI</span><input name="nama" required defaultValue={edit?.nama ?? ''} placeholder="mis. Intensitas energi WTP per m³ air olahan" /></label>
        <fieldset className="field full" style={{ border: 0, padding: 0, margin: 0 }}>
          <span>Ruang lingkup sumber energi</span>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {sumber.map((s) => (
              <label key={s.kode} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                <input type="checkbox" name="sumber_kode" value={s.kode} defaultChecked={edit ? edit.sumber_kode.includes(s.kode) : s.satuan === 'kWh'} style={{ height: 'auto' }} />{s.nama}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="field"><span>Metode</span>
          <select name="metode" value={metode} onChange={(e) => setMetode(e.target.value as MetodeEnpi)}>
            {(Object.keys(LABEL_METODE) as MetodeEnpi[]).map((m) => <option key={m} value={m}>{LABEL_METODE[m]}</option>)}
          </select>
        </label>
        <label className="field"><span>Status</span>
          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', height: 36, textTransform: 'none', letterSpacing: 0, fontFamily: 'inherit', fontSize: 13, color: 'var(--ink)' }}>
            <input type="checkbox" name="aktif" defaultChecked={edit?.aktif ?? true} style={{ height: 'auto' }} />Aktif dipantau
          </span>
        </label>
        {metode !== 'absolut' && (
          <fieldset className="field full" style={{ border: 0, padding: 0, margin: 0 }}>
            <span>Variabel relevan {metode === 'rasio' ? '(pilih satu)' : '(satu atau lebih)'}</span>
            {variabel.length === 0 ? <p className="muted small">Belum ada variabel relevan. Tambahkan dulu di daftar variabel.</p> : (
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {variabel.map((v) => (
                  <label key={v.kode} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                    <input type={metode === 'rasio' ? 'radio' : 'checkbox'} name="variabel_kode" value={v.kode} defaultChecked={edit?.variabel_kode.includes(v.kode)} style={{ height: 'auto' }} />
                    {v.nama} <span className="muted small">({v.satuan})</span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>
        )}
        <label className="field"><span>Awal baseline</span><input type="month" name="baseline_mulai" required defaultValue={edit ? bulanIso(edit.baseline_mulai) : '2025-01'} /></label>
        <label className="field"><span>Akhir baseline</span><input type="month" name="baseline_selesai" required defaultValue={edit ? bulanIso(edit.baseline_selesai) : '2025-12'} /></label>
        <label className="field full"><span>Alasan pemilihan / penyesuaian baseline</span><textarea name="alasan_baseline" defaultValue={edit?.alasan_baseline ?? ''} placeholder="Periode representatif, data lengkap, sebelum aksi penghematan dimulai…" /></label>
        <label className="field full"><span>Catatan</span><textarea name="catatan" defaultValue={edit?.catatan ?? ''} placeholder="Kondisi penyesuaian baseline (6.5): perubahan lingkup, fasilitas, atau variabel statis" /></label>
      </div>
      <p className="muted small" style={{ marginTop: 12 }}>
        Absolut: konsumsi dibanding bulan yang sama di baseline. Rasio: konsumsi ÷ variabel. Regresi: model linier konsumsi terhadap variabel; disarankan untuk SEU dengan variabel yang berubah-ubah.
      </p>
      {galat && <p className="pesan galat" role="alert" style={{ marginTop: 12 }}>{galat}</p>}
      <div className="toolbar" style={{ marginTop: 16, marginBottom: 0 }}>
        <button className="btn utama" type="submit" disabled={menunggu}>{menunggu ? 'Menyimpan…' : 'Simpan'}</button>
        <span style={{ flex: 1 }} />
        {hapus && <button type="button" className="btn" onClick={hapus}><Trash2 aria-hidden="true" /><span className="teks">Hapus</span></button>}
      </div>
    </form>
  )
}

export function DaftarVariabel({ variabel, terpakai }: { variabel: VariabelRelevan[]; terpakai: Record<string, string[]> }) {
  const router = useRouter()
  const bisa = useBoleh()
  const dlg = useRef<HTMLDialogElement>(null)
  const [edit, setEdit] = useState<VariabelRelevan | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [menunggu, mulai] = useTransition()

  function buka(v: VariabelRelevan | null) { setEdit(v); setGalat(null); dlg.current?.showModal() }

  return (
    <div className="card">
      <div className="toolbar"><span style={{ flex: 1 }} />
        {bisa('enpi.tambah') && <button type="button" className="btn" onClick={() => buka(null)}><Plus aria-hidden="true" /><span className="teks">Tambah variabel</span></button>}
      </div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Kode</th><th>Variabel</th><th>Satuan</th><th>Dipakai EnPI</th><th /></tr></thead>
          <tbody>
            {variabel.length === 0 && <tr className="kosong"><td colSpan={5}>Belum ada variabel relevan.</td></tr>}
            {variabel.map((v) => (
              <tr key={v.kode}>
                <td className="kode">{v.kode}</td>
                <td style={{ maxWidth: 380 }}><b>{v.nama}</b>{v.keterangan && <span className="upd">{v.keterangan}</span>}</td>
                <td className="small">{v.satuan}</td>
                <td className="small">{terpakai[v.kode]?.join(', ') || <span className="muted">–</span>}</td>
                <td>{bisa('enpi.ubah') && <button type="button" className="btn btn-ikon" aria-label={`Ubah ${v.nama}`} onClick={() => buka(v)}><Pencil aria-hidden="true" /></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <dialog ref={dlg} className="panel" onClose={() => setEdit(null)}>
        <form className="card" key={edit?.kode ?? 'baru'} action={(f) => mulai(async () => {
          const h = await simpanVariabel(edit?.kode ?? null, f)
          if (!h.ok) return setGalat(h.pesan)
          dlg.current?.close(); router.refresh()
        })}>
          <div className="row"><h3>{edit ? `Ubah ${edit.nama}` : 'Variabel relevan baru'}</h3><button type="button" className="btn btn-ikon" aria-label="Tutup" onClick={() => dlg.current?.close()}><X aria-hidden="true" /></button></div>
          <div className="form-grid">
            <label className="field"><span>Kode</span><input name="kode" required pattern="[a-z0-9_]+" defaultValue={edit?.kode ?? ''} readOnly={!!edit} placeholder="mis. jam_operasi" /></label>
            <label className="field"><span>Satuan</span><input name="satuan" required defaultValue={edit?.satuan ?? ''} placeholder="mis. jam, m³, unit" /></label>
            <label className="field full"><span>Nama</span><input name="nama" required defaultValue={edit?.nama ?? ''} /></label>
            <label className="field full"><span>Keterangan & sumber data</span><textarea name="keterangan" defaultValue={edit?.keterangan ?? ''} /></label>
            <label className="field"><span>Urutan</span><input type="number" name="urutan" defaultValue={edit?.urutan ?? 0} /></label>
          </div>
          {galat && <p className="pesan galat" role="alert" style={{ marginTop: 12 }}>{galat}</p>}
          <div className="toolbar" style={{ marginTop: 16, marginBottom: 0 }}>
            <button className="btn utama" type="submit" disabled={menunggu}>{menunggu ? 'Menyimpan…' : 'Simpan'}</button>
            <span style={{ flex: 1 }} />
            {edit && bisa('enpi.hapus') && (
              <button type="button" className="btn" onClick={() => {
                if (!confirm(`Hapus variabel ${edit.nama} beserta semua data bulanannya?`)) return
                mulai(async () => { const h = await hapusVariabel(edit.kode); if (!h.ok) return setGalat(h.pesan); dlg.current?.close(); router.refresh() })
              }}><Trash2 aria-hidden="true" /><span className="teks">Hapus</span></button>
            )}
          </div>
        </form>
      </dialog>
    </div>
  )
}
