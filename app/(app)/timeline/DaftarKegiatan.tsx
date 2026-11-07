'use client'

import { Check, CircleCheck, CircleDashed, CircleX, LoaderCircle, RotateCcw, Link2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { simpanKeterkaitanKegiatan, ubahStatusKegiatan } from '@/app/actions'
import { Chip } from '@/components/Chip'
import { tanggal, waktu } from '@/lib/format'
import { keadaan, KEADAAN, type Keadaan } from '@/lib/kegiatan'
import type { Kegiatan, StatusKegiatan } from '@/lib/types'

const URUTAN: Keadaan[] = ['konfirmasi', 'berjalan', 'belum', 'selesai']
const IKON = { selesai: CircleCheck, berjalan: LoaderCircle, belum: CircleDashed, konfirmasi: CircleX }

export function DaftarKegiatan({ kegiatan, kini, bisaUbah }: { kegiatan: Kegiatan[]; kini: string; bisaUbah: boolean }) {
  const router = useRouter()
  const [filter, setFilter] = useState<Keadaan | ''>('')
  const [menunggu, mulai] = useTransition()
  const [galat, setGalat] = useState<string | null>(null)
  const dlg = useRef<HTMLDialogElement>(null)
  const [edit, setEdit] = useState<Kegiatan | null>(null)
  const [galatF, setGalatF] = useState<string | null>(null)
  function bukaEdit(k: Kegiatan) { setEdit(k); setGalatF(null); dlg.current?.showModal() }

  const dengan = kegiatan.map((k) => ({ k, st: keadaan(k, kini) }))
  const grup = URUTAN.map((st) => ({ st, isi: dengan.filter((x) => x.st === st) }))
    .filter((g) => g.isi.length && (!filter || g.st === filter))

  function ubah(no: number, status: StatusKegiatan) {
    setGalat(null)
    mulai(async () => {
      const h = await ubahStatusKegiatan(no, status)
      if (!h.ok) setGalat(h.pesan)
      router.refresh()
    })
  }

  return (
    <div className="stack">
      <div className="toolbar" style={{ marginBottom: 0 }}>
        <div className="seg" role="group" aria-label="Saring status">
          <button type="button" aria-pressed={filter === ''} onClick={() => setFilter('')}>Semua<span className="n">{kegiatan.length}</span></button>
          {URUTAN.map((s) => (
            <button key={s} type="button" aria-pressed={filter === s} onClick={() => setFilter(s)}>
              {KEADAAN[s].label}<span className="n">{dengan.filter((x) => x.st === s).length}</span>
            </button>
          ))}
        </div>
      </div>
      {galat && <p className="pesan galat" role="alert">Gagal menyimpan: {galat}</p>}

      {grup.map(({ st, isi }) => {
        const Ikon = IKON[st]
        return (
          <div key={st} className={`card keg-grup keg-${st}`}>
            <div className="row" style={{ marginBottom: 6 }}>
              <h3 className="keg-judul"><Ikon aria-hidden="true" /> {KEADAAN[st].label} <span className="muted tnum">({isi.length})</span></h3>
              {st === 'konfirmasi' && <p className="small txt-bad">Tanggal pelaksanaan sudah lewat. Pastikan sudah terlaksana, lalu tandai selesai.</p>}
            </div>
            <div className="list">
              {isi.map(({ k }) => {
                const t = k.sesi.map((s) => s.tanggal).sort()
                const lewat = k.sesi.filter((s) => s.tanggal < kini).length
                return (
                  <div key={k.no} className="keg-item">
                    <span className={`keg-ikon ${KEADAAN[st].chip}`} aria-hidden="true"><Ikon /></span>
                    <div className="grow">
                      <b className="keg-nama">{k.no}. {k.nama}</b>
                      <span className="muted small" style={{ display: 'block' }}>
                        {tanggal(t[0])}{t.length > 1 && ` s.d. ${tanggal(t.at(-1))}`} · {k.sesi.length} sesi ({lewat} sudah lewat) · {k.metode} · {k.peserta}
                      </span>
                      {st === 'selesai' && k.selesai_at && <span className="small txt-good" style={{ display: 'block' }}>Ditandai selesai {waktu(k.selesai_at)}</span>}
                      {((k.klausul?.length ?? 0) > 0 || (k.dokumen_kode?.length ?? 0) > 0) && (
                        <span className="keg-kait small">
                          {k.klausul?.length ? <>Klausul {k.klausul.join(', ')}</> : null}
                          {k.dokumen_kode?.length ? <> · Dokumen {k.dokumen_kode.join(', ')}</> : null}
                        </span>
                      )}
                      {(k.kendala || k.tindak_lanjut) && (
                        <span className="keg-pica small">
                          {k.kendala && <><b>Kendala:</b> {k.kendala} </>}
                          {k.tindak_lanjut && <><b>Tindak lanjut:</b> {k.tindak_lanjut}{k.tindak_pic ? ` (${k.tindak_pic}` : ''}{k.tindak_pic && k.tindak_tenggat ? `, ${tanggal(k.tindak_tenggat)})` : k.tindak_pic ? ')' : k.tindak_tenggat ? ` (${tanggal(k.tindak_tenggat)})` : ''}</>}
                        </span>
                      )}
                      <div className="sesi" style={{ marginTop: 6 }}>
                        {k.sesi.map((s, i) => (
                          <span key={i} className={s.tanggal < kini ? 'lalu' : s.tanggal === kini ? 'hari-ini' : undefined}>
                            {s.tanggal < kini && <Check size={10} aria-hidden="true" />} {tanggal(s.tanggal)} · {s.jam}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="keg-aksi">
                      <Chip kode={KEADAAN[st].chip} label={KEADAAN[st].label} />
                      {bisaUbah && <button type="button" className="btn btn-ikon kecil" onClick={() => bukaEdit(k)} aria-label={`Kendala dan keterkaitan ${k.nama}`} title="Kendala & keterkaitan"><Link2 aria-hidden="true" /></button>}
                      {bisaUbah && (st === 'selesai'
                        ? <button type="button" className="btn kecil" disabled={menunggu} onClick={() => ubah(k.no, 'belum')}><RotateCcw aria-hidden="true" /> Batalkan</button>
                        : <>
                            {st === 'belum' && <button type="button" className="btn kecil" disabled={menunggu} onClick={() => ubah(k.no, 'berjalan')}>Mulai</button>}
                            <button type="button" className="btn kecil utama" disabled={menunggu} onClick={() => ubah(k.no, 'selesai')}><Check aria-hidden="true" /> Tandai selesai</button>
                          </>)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      <dialog ref={dlg} className="panel" onClose={(e) => { if (e.target === e.currentTarget) setEdit(null) }}>
        {edit && (
          <form className="card" key={edit.no} action={(f) => mulai(async () => {
            const h = await simpanKeterkaitanKegiatan(edit.no, f)
            if (!h.ok) return setGalatF(h.pesan)
            dlg.current?.close(); router.refresh()
          })}>
            <div className="row"><div><span className="eyebrow">Kegiatan {edit.no}</span><h3>{edit.nama}</h3></div>
              <button type="button" className="btn btn-ikon" aria-label="Tutup" onClick={() => dlg.current?.close()}><X aria-hidden="true" /></button></div>
            <p className="muted small">Keterkaitan dipakai laporan kesiapan untuk menunjukkan klausul dan dokumen yang tertahan bila kegiatan ini terlambat.</p>
            <div className="form-grid">
              <label className="field"><span>Klausul (pisahkan koma)</span><input name="klausul" defaultValue={edit.klausul?.join(', ') ?? ''} placeholder="mis. 6.3, 7.2" /></label>
              <label className="field"><span>Kode dokumen (pisahkan koma)</span><input name="dokumen_kode" defaultValue={edit.dokumen_kode?.join(', ') ?? ''} placeholder="mis. MK-01, R-7.2-01" /></label>
              <label className="field full"><span>Kendala / masalah</span><textarea name="kendala" defaultValue={edit.kendala ?? ''} placeholder="Apa yang menghambat kegiatan ini?" /></label>
              <label className="field full"><span>Tindak lanjut</span><textarea name="tindak_lanjut" defaultValue={edit.tindak_lanjut ?? ''} placeholder="Tindakan korektif yang disepakati" /></label>
              <label className="field"><span>PIC tindak lanjut</span><input name="tindak_pic" defaultValue={edit.tindak_pic ?? ''} /></label>
              <label className="field"><span>Tenggat</span><input type="date" name="tindak_tenggat" defaultValue={edit.tindak_tenggat ?? ''} /></label>
            </div>
            {galatF && <p className="pesan galat" role="alert" style={{ marginTop: 12 }}>{galatF}</p>}
            <div className="toolbar" style={{ marginTop: 16, marginBottom: 0 }}><button className="btn utama" type="submit" disabled={menunggu}>{menunggu ? 'Menyimpan…' : 'Simpan'}</button></div>
          </form>
        )}
      </dialog>
    </div>
  )
}
