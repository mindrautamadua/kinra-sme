'use client'

import { Pencil, Plus, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { hapusSeu, simpanSeu } from '@/app/actions'
import { Chip } from '@/components/Chip'
import { useBoleh } from '@/components/Peran'
import { persen, tanggal } from '@/lib/format'
import type { KodeChip } from '@/lib/status'
import type { Aset, KriteriaSeu, MeterEnergi, Seu, StatusSeu, SumberEnergi, VariabelRelevan } from '@/lib/types'
import { KonfirmasiHapus } from '../aset/KonfirmasiHapus'

const KRITERIA: Record<KriteriaSeu, string> = {
  porsi: 'Porsi konsumsi besar',
  potensi: 'Potensi peningkatan kinerja besar',
  regulasi: 'Persyaratan hukum/lainnya',
}
const STATUS: StatusSeu[] = ['Kandidat', 'Ditetapkan', 'Dicabut']
const CHIP: Record<StatusSeu, KodeChip> = { Kandidat: 'info', Ditetapkan: 'good', Dicabut: 'na' }

const kodeBerikut = (daftar: { kode: string }[]) =>
  `SEU-${String(Math.max(0, ...daftar.map((x) => Number(x.kode.replace(/\D/g, '')) || 0)) + 1).padStart(2, '0')}`

const centang = { display: 'inline-flex', gap: 6, alignItems: 'center' } as const
const grup = { display: 'flex', gap: 14, flexWrap: 'wrap', maxHeight: 180, overflowY: 'auto' } as const

export function RegisterSeu({ seu, aset, meter, sumber, variabel, enpi, porsi }: {
  seu: Seu[]; aset: Aset[]; meter: MeterEnergi[]; sumber: SumberEnergi[]; variabel: VariabelRelevan[]
  enpi: { kode: string; nama: string; lingkup: string }[]; porsi: Record<string, number>
}) {
  const router = useRouter()
  const bisa = useBoleh()
  const dlg = useRef<HTMLDialogElement>(null)
  const [edit, setEdit] = useState<Seu | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [hapus, setHapus] = useState<Seu | null>(null)
  const [menunggu, mulai] = useTransition()
  const nama = (daftar: { kode: string; nama: string }[], kode: string) => daftar.find((x) => x.kode === kode)?.nama ?? kode

  function buka(s: Seu | null) { setEdit(s); setGalat(null); dlg.current?.showModal() }
  const bolehTetapkan = bisa('seu.tetapkan')

  return (
    <>
      <div className="toolbar">
        <span style={{ flex: 1 }} />
        {bisa('seu.ubah') && <button type="button" className="btn utama" onClick={() => buka(null)}><Plus aria-hidden="true" /><span className="teks">Usulkan SEU</span></button>}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {seu.length === 0 && <div className="card"><p className="muted">Belum ada SEU di register.</p></div>}
        {seu.map((s) => {
          const kurang = [
            !s.alasan && 'alasan penetapan',
            !s.variabel_kode.length && 'variabel relevan',
            !s.enpi_kode && 'EnPI pengukur',
            !s.pic && 'PIC',
            !s.personel && 'personel terkait',
          ].filter(Boolean) as string[]
          return (
            <div key={s.kode} className="card">
              <div className="row">
                <div>
                  <span className="eyebrow">{s.kode} · {persen(porsi[s.kode] ?? 0)} energi KINRA</span>
                  <h3>{s.nama}</h3>
                  {s.deskripsi && <p className="muted small">{s.deskripsi}</p>}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Chip kode={CHIP[s.status]} label={s.status} />
                  {bisa('seu.ubah') && <button type="button" className="btn btn-ikon" aria-label={`Ubah ${s.kode}`} onClick={() => buka(s)}><Pencil aria-hidden="true" /></button>}
                  {bisa('seu.hapus') && <button type="button" className="btn btn-ikon" aria-label={`Hapus ${s.kode}`} onClick={() => setHapus(s)}><Trash2 aria-hidden="true" /></button>}
                </div>
              </div>
              <dl className="te-seu-detail">
                <div><dt>Aset · sumber</dt><dd>{[...s.aset_kode.map((k) => nama(aset, k)), ...s.sumber_kode.map((k) => nama(sumber, k))].join(', ') || '–'}</dd></div>
                <div><dt>Meter</dt><dd className="mono small">{s.meter_kode.join(', ') || '–'}</dd></div>
                <div><dt>Kriteria</dt><dd>{s.kriteria.map((k) => KRITERIA[k]).join(' · ') || '–'}</dd></div>
                <div><dt>Variabel relevan</dt><dd>{s.variabel_kode.map((k) => nama(variabel, k)).join(', ') || '–'}</dd></div>
                <div><dt>EnPI</dt><dd>{s.enpi_kode ? <Link href={`/kinerja#enpi-${s.enpi_kode}`}>{s.enpi_kode} · {nama(enpi, s.enpi_kode)}</Link> : '–'}</dd></div>
                <div><dt>PIC · personel</dt><dd>{s.pic ?? '–'}{s.personel && <span className="upd">{s.personel}</span>}</dd></div>
                <div className="full"><dt>Alasan</dt><dd>{s.alasan ?? '–'}</dd></div>
                <div><dt>Ditetapkan</dt><dd>{s.ditetapkan_at ? `${tanggal(s.ditetapkan_at)}${s.ditetapkan_oleh ? ` oleh ${s.ditetapkan_oleh}` : ''}` : '–'}</dd></div>
                <div><dt>Tinjau berikutnya</dt><dd>{tanggal(s.tinjau_berikutnya)}</dd></div>
              </dl>
              {kurang.length > 0 && s.status !== 'Dicabut' && <p className="pesan small" style={{ marginTop: 12 }}>Belum lengkap: {kurang.join(', ')}.</p>}
            </div>
          )
        })}
      </div>

      <dialog ref={dlg} className="panel" onClose={(e) => { if (e.target === e.currentTarget) setEdit(null) }}>
        <form className="card" key={edit?.kode ?? 'baru'} action={(f) => mulai(async () => {
          const h = await simpanSeu(edit?.kode ?? null, f)
          if (!h.ok) return setGalat(h.pesan)
          dlg.current?.close(); router.refresh()
        })}>
          <div className="row"><h3>{edit ? `Ubah ${edit.kode}` : 'Usulan SEU baru'}</h3><button type="button" className="btn btn-ikon" aria-label="Tutup" onClick={() => dlg.current?.close()}><X aria-hidden="true" /></button></div>
          <div className="form-grid">
            <label className="field"><span>Kode</span><input name="kode" required defaultValue={edit?.kode ?? kodeBerikut(seu)} readOnly={!!edit} /></label>
            <label className="field"><span>Status</span>
              <select name="status" defaultValue={edit?.status ?? 'Kandidat'}>
                {STATUS.map((s) => <option key={s} value={s} disabled={!bolehTetapkan && s !== (edit?.status ?? 'Kandidat')}>{s}</option>)}
              </select>
            </label>
            <label className="field full"><span>Nama SEU</span><input name="nama" required defaultValue={edit?.nama ?? ''} placeholder="mis. Pompa distribusi WTP" /></label>
            <label className="field full"><span>Deskripsi peralatan</span><textarea name="deskripsi" defaultValue={edit?.deskripsi ?? ''} /></label>
            <fieldset className="field full" style={{ border: 0, padding: 0, margin: 0 }}>
              <span>Aset</span>
              <div style={grup}>{aset.map((a) => <label key={a.kode} style={centang}><input type="checkbox" name="aset_kode" value={a.kode} defaultChecked={edit?.aset_kode.includes(a.kode)} style={{ height: 'auto' }} />{a.nama}</label>)}</div>
            </fieldset>
            <fieldset className="field full" style={{ border: 0, padding: 0, margin: 0 }}>
              <span>Meter pengukur</span>
              <div style={grup}>{meter.map((m) => <label key={m.kode} style={centang}><input type="checkbox" name="meter_kode" value={m.kode} defaultChecked={edit?.meter_kode.includes(m.kode)} style={{ height: 'auto' }} />{m.lokasi ?? m.kode} <span className="muted small">({m.kode})</span></label>)}</div>
            </fieldset>
            <fieldset className="field full" style={{ border: 0, padding: 0, margin: 0 }}>
              <span>Sumber energi non-meter (mis. BBM)</span>
              <div style={grup}>{sumber.filter((x) => x.kode !== 'pln' && x.kode !== 'pltbg' && x.kode !== 'plts').map((x) => <label key={x.kode} style={centang}><input type="checkbox" name="sumber_kode" value={x.kode} defaultChecked={edit?.sumber_kode.includes(x.kode)} style={{ height: 'auto' }} />{x.nama}</label>)}</div>
            </fieldset>
            <fieldset className="field full" style={{ border: 0, padding: 0, margin: 0 }}>
              <span>Kriteria penetapan</span>
              <div style={grup}>{(Object.keys(KRITERIA) as KriteriaSeu[]).map((k) => <label key={k} style={centang}><input type="checkbox" name="kriteria" value={k} defaultChecked={edit ? edit.kriteria.includes(k) : k === 'porsi'} style={{ height: 'auto' }} />{KRITERIA[k]}</label>)}</div>
            </fieldset>
            <fieldset className="field full" style={{ border: 0, padding: 0, margin: 0 }}>
              <span>Variabel relevan</span>
              <div style={grup}>{variabel.map((v) => <label key={v.kode} style={centang}><input type="checkbox" name="variabel_kode" value={v.kode} defaultChecked={edit?.variabel_kode.includes(v.kode)} style={{ height: 'auto' }} />{v.nama}</label>)}</div>
            </fieldset>
            <label className="field full"><span>EnPI pengukur</span>
              <select name="enpi_kode" defaultValue={edit?.enpi_kode ?? ''}>
                <option value="">Belum ditentukan</option>
                {enpi.filter((e) => e.lingkup === 'kinra').map((e) => <option key={e.kode} value={e.kode}>{e.kode} · {e.nama}</option>)}
              </select>
            </label>
            <label className="field"><span>PIC</span><input name="pic" defaultValue={edit?.pic ?? 'Bagian M/E'} /></label>
            <label className="field"><span>Tinjau berikutnya</span><input type="date" name="tinjau_berikutnya" defaultValue={edit?.tinjau_berikutnya ?? ''} /></label>
            <label className="field full"><span>Personel yang pekerjaannya memengaruhi SEU</span><input name="personel" defaultValue={edit?.personel ?? ''} placeholder="mis. Operator WTP, teknisi pompa (dasar matriks kompetensi 7.2)" /></label>
            <label className="field full"><span>Alasan penetapan</span><textarea name="alasan" defaultValue={edit?.alasan ?? ''} placeholder="Porsi konsumsi, potensi penghematan, atau persyaratan yang mendasari" /></label>
            <label className="field"><span>Urutan</span><input type="number" name="urutan" defaultValue={edit?.urutan ?? seu.length + 1} /></label>
          </div>
          {!bolehTetapkan && <p className="muted small" style={{ marginTop: 12 }}>Penetapan dan pencabutan SEU dilakukan admin atau konsultan. Anda dapat menyimpan usulan sebagai Kandidat.</p>}
          {galat && <p className="pesan galat" role="alert" style={{ marginTop: 12 }}>{galat}</p>}
          <div className="toolbar" style={{ marginTop: 16, marginBottom: 0 }}>
            <button className="btn utama" type="submit" disabled={menunggu}>{menunggu ? 'Menyimpan…' : 'Simpan'}</button>
          </div>
        </form>
      </dialog>

      <KonfirmasiHapus onTutup={() => setHapus(null)} onSelesai={() => router.refresh()}
        target={hapus && {
          judul: `Hapus ${hapus.kode} “${hapus.nama}”?`, kata: hapus.kode,
          poin: ['SEU hilang dari register beserta alasan dan riwayat penetapannya.', 'Bila SEU tidak lagi signifikan, sebaiknya ubah status menjadi Dicabut agar jejaknya tetap ada untuk auditor.'],
          hapus: () => hapusSeu(hapus.kode),
        }} />
    </>
  )
}
