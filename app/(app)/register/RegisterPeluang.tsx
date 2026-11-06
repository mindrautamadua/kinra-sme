'use client'

import { Pencil, Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { simpanPeluang } from '@/app/actions'
import { Chip } from '@/components/Chip'
import { useBoleh } from '@/components/Peran'
import { angka } from '@/lib/format'
import { rupiahRingkas } from '@/lib/konversi'
import type { Peluang } from '@/lib/types'

const STATUS_P = ['Belum dinilai', 'Dinilai', 'Disetujui', 'Berjalan', 'Selesai', 'Ditunda', 'Ditolak']
const chipStatus = (s: string) => (s === 'Selesai' ? 'good' : s === 'Berjalan' || s === 'Disetujui' ? 'info' : s === 'Ditolak' || s === 'Ditunda' ? 'na' : s === 'Dinilai' ? 'warn' : 'serious') as 'good'

const ALUR = ['Belum dinilai', 'Dinilai', 'Disetujui', 'Berjalan', 'Selesai']
const KUADRAN = [
  { kode: 'qw', judul: 'Quick win', ket: 'Hemat besar, balik modal cepat: jadikan rencana aksi lebih dulu' },
  { kode: 'st', judul: 'Proyek strategis', ket: 'Hemat besar, investasi besar: perlu business case' },
  { kode: 'kc', judul: 'Perbaikan kecil', ket: 'Murah, hemat kecil: kerjakan sambil jalan' },
  { kode: 'tu', judul: 'Tinjau ulang', ket: 'Hemat kecil, investasi besar' },
]
const kuadran = (p: Peluang) => p.skor_energi === null || p.skor_roi === null ? null
  : p.skor_energi >= 3 ? (p.skor_roi >= 3 ? 'qw' : 'st') : (p.skor_roi >= 3 ? 'kc' : 'tu')

export function RegisterPeluang({ peluang, tarif, aksi }: { peluang: Peluang[]; tarif: number; aksi: { kode: string; peluang: string; status: string }[] }) {
  const router = useRouter()
  const bisa = useBoleh()
  const dlg = useRef<HTMLDialogElement>(null)
  const [edit, setEdit] = useState<Peluang | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [tahap, setTahap] = useState<string | null>(null)
  const [menunggu, mulai] = useTransition()
  const urut = [...peluang].sort((a, b) => (b.prioritas ?? -1) - (a.prioritas ?? -1) || a.kode.localeCompare(b.kode))
  const tampil = tahap ? urut.filter((p) => (tahap === 'lain' ? !ALUR.includes(p.status) : p.status === tahap)) : urut
  const kodeBaru = `P-${String(Math.max(0, ...peluang.map((p) => Number(p.kode.slice(2)) || 0)) + 1).padStart(2, '0')}`
  const dinilai = peluang.filter((p) => p.skor_energi !== null && p.skor_roi !== null)
  const belum = peluang.filter((p) => p.skor_energi === null || p.skor_roi === null)
  const maksKwh = Math.max(1, ...peluang.map((p) => p.estimasi_kwh ?? 0))
  const aksiDari = (kode: string) => aksi.filter((a) => a.peluang === kode)
  const lain = peluang.filter((p) => !ALUR.includes(p.status))

  function buka(p: Peluang | null) { setEdit(p); setGalat(null); dlg.current?.showModal() }

  return (
    <>
      <div className="card">
        <ol className="rg-alur" aria-label="Alur status peluang">
          {ALUR.map((a, i) => {
            const n = peluang.filter((p) => p.status === a).length
            return (
              <li key={a} style={{ '--i': i } as React.CSSProperties}>
                <button type="button" aria-pressed={tahap === a} onClick={() => setTahap(tahap === a ? null : a)} className={n ? 'ada' : undefined}>
                  <b className="tnum">{n}</b><span>{a}</span>
                </button>
              </li>
            )
          })}
        </ol>
        {lain.length > 0 && <p className="muted small" style={{ marginTop: 8 }}>
          <button type="button" className="pt-tautan" onClick={() => setTahap(tahap === 'lain' ? null : 'lain')}>{lain.length} ditunda atau ditolak</button>
        </p>}
      </div>

      <div className="rg-atas" style={{ marginTop: 16 }}>
        <div className="card">
          <h3>Matriks prioritas</h3>
          <p className="muted small">Vertikal: potensi penghematan energi · horizontal: pengembalian investasi (1–5). Ukuran titik sebanding estimasi kWh.</p>
          <div className="rg-prio-matriks">
            <svg viewBox="0 0 400 300" role="img" aria-label="Matriks prioritas peluang: energi terhadap ROI">
              <rect x="40" y="10" width="170" height="130" className="kd st" /><rect x="210" y="10" width="180" height="130" className="kd qw" />
              <rect x="40" y="140" width="170" height="130" className="kd tu" /><rect x="210" y="140" width="180" height="130" className="kd kc" />
              <text x="48" y="28" className="kd-t">Proyek strategis</text><text x="382" y="28" textAnchor="end" className="kd-t">Quick win</text>
              <text x="48" y="262" className="kd-t">Tinjau ulang</text><text x="382" y="262" textAnchor="end" className="kd-t">Perbaikan kecil</text>
              {[1, 2, 3, 4, 5].map((v) => <text key={`x${v}`} x={40 + ((v - 0.5) / 5) * 350} y={288} textAnchor="middle" className="kd-ax">{v}</text>)}
              {[1, 2, 3, 4, 5].map((v) => <text key={`y${v}`} x={30} y={270 - ((v - 0.5) / 5) * 260} textAnchor="end" dominantBaseline="middle" className="kd-ax">{v}</text>)}
              {dinilai.map((p, i) => {
                const geser = (dinilai.filter((q, j) => j < i && q.skor_energi === p.skor_energi && q.skor_roi === p.skor_roi).length) * 9
                const cx = 40 + ((p.skor_roi! - 0.5) / 5) * 350 + geser
                const cy = 270 - ((p.skor_energi! - 0.5) / 5) * 260
                const r = 9 + ((p.estimasi_kwh ?? 0) / maksKwh) * 16
                return (
                  <g key={p.kode} className="kd-titik" style={{ '--i': i } as React.CSSProperties} onClick={() => buka(p)}>
                    <circle cx={cx} cy={cy} r={r}><title>{`${p.kode} · ${p.uraian}`}</title></circle>
                    <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central">{p.kode.replace('P-', '')}</text>
                  </g>
                )
              })}
            </svg>
            {!dinilai.length && <p className="rg-kosong">Belum ada peluang yang dinilai. Isi skor energi dan ROI agar peluang muncul di matriks.</p>}
          </div>
        </div>
        <div className="rg-kanan">
          <div className="card">
            <h3>Rekomendasi</h3>
            <ul className="rg-kuadran">
              {KUADRAN.map((k) => {
                const isi = dinilai.filter((p) => kuadran(p) === k.kode)
                return <li key={k.kode} className={`kd-${k.kode}`}><b>{k.judul} · {isi.length}</b><span className="muted small">{k.ket}</span>
                  {isi.length > 0 && <span className="small">{isi.map((p) => p.kode).join(', ')}</span>}</li>
              })}
            </ul>
          </div>
          {belum.length > 0 && (
            <div className="card">
              <h3>Belum dinilai · {belum.length}</h3>
              <p className="muted small">Peluang tanpa skor tidak bisa diprioritaskan. Mulai dari yang terkait SEU (WTP, WWTP).</p>
              <div className="rg-belum">{belum.map((p) => <button key={p.kode} type="button" className="btn kecil" onClick={() => buka(p)} disabled={!bisa('register.ubah')} title={p.uraian}>{p.kode} · {p.uraian.slice(0, 34)}{p.uraian.length > 34 ? '…' : ''}</button>)}</div>
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="toolbar">
          {tahap && <button type="button" className="btn kecil" onClick={() => setTahap(null)}><X aria-hidden="true" /> {tahap === 'lain' ? 'Ditunda/ditolak' : tahap}</button>}
          <span style={{ flex: 1 }} />
          {bisa('register.ubah') && <button type="button" className="btn utama" onClick={() => buka(null)}><Plus aria-hidden="true" /><span className="teks">Tambah peluang</span></button>}
        </div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>ID</th><th>Peluang</th><th>Pemilik</th><th className="num">Energi · ROI</th><th className="num">Prioritas</th><th className="num">Estimasi hemat</th><th>Status · aksi</th><th /></tr></thead>
            <tbody>
              {tampil.length === 0 && <tr className="kosong"><td colSpan={8}>Tidak ada peluang pada tahap ini.</td></tr>}
              {tampil.map((p) => (
                <tr key={p.kode}>
                  <td className="kode">{p.kode}</td>
                  <td style={{ maxWidth: 340 }}>{p.uraian}<span className="upd">{p.variabel}</span></td>
                  <td className="small">{p.pemilik}</td>
                  <td className="num">{p.skor_energi ?? '–'} · {p.skor_roi ?? '–'}</td>
                  <td className="num"><b>{p.prioritas !== null ? angka(p.prioritas, 1) : '–'}</b>{kuadran(p) && <span className="upd">{KUADRAN.find((k) => k.kode === kuadran(p))!.judul}</span>}</td>
                  <td className="num">{p.estimasi_kwh !== null ? <>{angka(p.estimasi_kwh)} kWh<span className="upd">±{rupiahRingkas(p.estimasi_kwh * tarif)}/thn</span></> : '–'}</td>
                  <td><Chip kode={chipStatus(p.status)} label={p.status} />
                    {aksiDari(p.kode).map((a) => <span key={a.kode} className="upd">→ {a.kode} ({a.status})</span>)}
                    {!aksiDari(p.kode).length && (p.status === 'Disetujui' || p.status === 'Berjalan') && <span className="upd txt-bad">Belum ada rencana aksi</span>}</td>
                  <td>{bisa('register.ubah') && <button type="button" className="btn btn-ikon" aria-label={`Ubah ${p.kode}`} onClick={() => buka(p)}><Pencil aria-hidden="true" /></button>}</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td colSpan={8}>{tampil.length} dari {peluang.length} peluang · urut prioritas tertinggi</td></tr></tfoot>
          </table>
        </div>
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
    </>
  )
}
