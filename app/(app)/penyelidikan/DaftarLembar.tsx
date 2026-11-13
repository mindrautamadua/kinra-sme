'use client'

import { Copy, ExternalLink, Pencil, RefreshCw, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { buatUlangTautan, ubahLembar } from '@/app/actions'
import { Chip } from '@/components/Chip'
import { tanggal, waktu } from '@/lib/format'
import { type Lembar, semuaPertanyaan, STATUS_LEMBAR_CHIP, terjawab } from '@/lib/penyelidikan'

const STATUS = ['Belum diisi', 'Draf', 'Dijawab', 'Ditinjau'] as const

export function DaftarLembar({ lembar }: { lembar: Lembar[] }) {
  const router = useRouter()
  const dlg = useRef<HTMLDialogElement>(null)
  const [edit, setEdit] = useState<Lembar | null>(null)
  const [lihat, setLihat] = useState<number | null>(null)
  const [disalin, setDisalin] = useState<number | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [menunggu, mulai] = useTransition()

  const tautan = (l: Lembar) => `${typeof window === 'undefined' ? '' : window.location.origin}/f/${l.token}`
  async function salin(l: Lembar) {
    const teks = `Lembar Penyelidikan Deviasi ${l.kode} – ${l.judul}\nMohon diisi paling lambat ${tanggal(l.tenggat, 'panjang')}:\n${tautan(l)}`
    try { await navigator.clipboard.writeText(teks) } catch { prompt('Salin tautan ini:', tautan(l)); return }
    setDisalin(l.id); setTimeout(() => setDisalin(null), 2000)
  }

  return (
    <>
      <div className="card">
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Lembar</th><th>PIC · tenggat</th><th>Status</th><th>Tautan PIC</th><th /></tr></thead>
            <tbody>
              {lembar.length === 0 && <tr className="kosong"><td colSpan={5}>Belum ada lembar penyelidikan.</td></tr>}
              {lembar.map((l) => {
                const { n, total } = terjawab(l)
                return [
                  <tr key={l.id}>
                    <td style={{ maxWidth: 380 }}><span className="kode">{l.kode}{l.enpi_kode ? ` · ${l.enpi_kode}` : ''}</span><br />{l.judul}</td>
                    <td className="small">{l.pic_bagian}{l.pic_nama && <span className="upd">{l.pic_nama}</span>}<span className="upd">{tanggal(l.tenggat)}</span></td>
                    <td>
                      <Chip kode={STATUS_LEMBAR_CHIP[l.status]} label={l.status} />
                      <span className="upd">{n}/{total} terjawab{l.dijawab_at ? ` · ${waktu(l.dijawab_at)}` : ''}</span>
                    </td>
                    <td>
                      {l.aktif ? (
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button type="button" className="btn" onClick={() => salin(l)}><Copy aria-hidden="true" /><span className="teks">{disalin === l.id ? 'Tersalin' : 'Salin'}</span></button>
                          <a className="btn btn-ikon" href={`/f/${l.token}`} target="_blank" rel="noreferrer" aria-label={`Buka formulir ${l.kode}`} title="Buka formulir PIC"><ExternalLink aria-hidden="true" /></a>
                        </div>
                      ) : <span className="muted small">Nonaktif</span>}
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button type="button" className="btn" aria-expanded={lihat === l.id} onClick={() => setLihat(lihat === l.id ? null : l.id)}>{lihat === l.id ? 'Tutup' : 'Jawaban'}</button>{' '}
                      <button type="button" className="btn btn-ikon" aria-label={`Ubah ${l.kode}`} onClick={() => { setEdit(l); setGalat(null); dlg.current?.showModal() }}><Pencil aria-hidden="true" /></button>
                    </td>
                  </tr>,
                  lihat === l.id && (
                    <tr key={`${l.id}-j`}>
                      <td colSpan={5}><RincianJawaban l={l} /></td>
                    </tr>
                  ),
                ]
              })}
            </tbody>
          </table>
        </div>
      </div>

      <dialog ref={dlg} className="panel" onClose={() => setEdit(null)}>
        {edit && (
          <form className="card" key={edit.id} action={(f) => mulai(async () => { const h = await ubahLembar(edit.id, f); if (!h.ok) return setGalat(h.pesan); dlg.current?.close(); router.refresh() })}>
            <div className="row"><h3>{edit.kode} · tinjau &amp; atur</h3><button type="button" className="btn btn-ikon" aria-label="Tutup" onClick={() => dlg.current?.close()}><X aria-hidden="true" /></button></div>
            <div className="form-grid">
              <label className="field"><span>Bagian PIC</span><input name="pic_bagian" required defaultValue={edit.pic_bagian} /></label>
              <label className="field"><span>Nama PIC</span><input name="pic_nama" defaultValue={edit.pic_nama ?? ''} /></label>
              <label className="field"><span>Tenggat</span><input type="date" name="tenggat" defaultValue={edit.tenggat ?? ''} /></label>
              <label className="field"><span>Status</span><select name="status" defaultValue={edit.status}>{STATUS.map((s) => <option key={s}>{s}</option>)}</select></label>
              <label className="field full"><span>Catatan peninjau (terlihat oleh PIC)</span><textarea name="catatan_tinjauan" defaultValue={edit.catatan_tinjauan ?? ''} /></label>
              <label className="field full" style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}><input type="checkbox" name="aktif" defaultChecked={edit.aktif} style={{ height: 'auto' }} /> Tautan aktif</label>
            </div>
            <p className="muted small">Status Ditinjau mengunci jawaban PIC. Ubah kembali ke Dijawab bila PIC perlu memperbaiki.</p>
            {galat && <p className="txt-bad small" role="alert">{galat}</p>}
            <div className="row" style={{ justifyContent: 'space-between', marginTop: 12, marginBottom: 0 }}>
              <button type="button" className="btn" disabled={menunggu} onClick={() => {
                if (!confirm(`Buat tautan baru untuk ${edit.kode}? Tautan lama langsung tidak berlaku.`)) return
                mulai(async () => { const h = await buatUlangTautan(edit.id); if (!h.ok) return setGalat(h.pesan); dlg.current?.close(); router.refresh() })
              }}><RefreshCw aria-hidden="true" /><span className="teks">Buat tautan baru</span></button>
              <button type="submit" className="btn utama" disabled={menunggu}>{menunggu ? 'Menyimpan…' : 'Simpan'}</button>
            </div>
          </form>
        )}
      </dialog>
    </>
  )
}

function RincianJawaban({ l }: { l: Lembar }) {
  return (
    <div className="jawaban-lembar">
      {l.hipotesis && <p className="muted small"><b>Dugaan awal:</b> {l.hipotesis}</p>}
      <dl className="jawaban-lembar">
        {semuaPertanyaan(l).map((q, i) => {
          const j = l.jawaban?.[q.id]
          return (
            <div key={q.id}>
              <dt>{i + 1}. {q.teks}</dt>
              <dd>{j?.nilai ? (q.jenis === 'tanggal' ? tanggal(j.nilai, 'panjang') : j.nilai) : <span className="muted">Belum dijawab</span>}{j?.keterangan && <span className="muted">{`\nKeterangan: ${j.keterangan}`}</span>}</dd>
            </div>
          )
        })}
      </dl>
      <p className="muted small">Pengisi: {l.dijawab_nama ?? '–'}{l.dijawab_jabatan ? ` (${l.dijawab_jabatan})` : ''}{l.ditinjau_oleh ? ` · Ditinjau ${l.ditinjau_oleh}, ${waktu(l.ditinjau_at)}` : ''}</p>
    </div>
  )
}
