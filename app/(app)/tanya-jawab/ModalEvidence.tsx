'use client'

import { ArrowUpRight, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { type EvidenceDokumen, evidenceKlausul } from '@/app/actions'
import { Chip } from '@/components/Chip'
import { IkonBerkas, PenampilBerkas, ukuranBerkas } from '@/components/PenampilBerkas'
import { tanggal } from '@/lib/format'
import { STATUS_DOKUMEN } from '@/lib/status'

type Muat = { kode: string; judul?: string; dokumen?: EvidenceDokumen[]; galat?: string }

/** Modal daftar evidence satu klausul. `kode` null = tertutup. Klik berkas membuka penampil. */
export function ModalEvidence({ kode, onTutup }: { kode: string | null; onTutup: () => void }) {
  const dlg = useRef<HTMLDialogElement>(null)
  const [isi, setIsi] = useState<Muat | null>(null)
  const [lihat, setLihat] = useState<{ d: EvidenceDokumen; indeks: number | null } | null>(null)

  useEffect(() => {
    const el = dlg.current
    if (!el) return
    if (!kode) { if (el.open) el.close(); return }
    if (!el.open) el.showModal()
    let batal = false
    setIsi({ kode })
    evidenceKlausul(kode).then((h) => {
      if (batal) return
      setIsi(h.ok ? { kode, judul: h.judul, dokumen: h.dokumen } : { kode, galat: h.pesan })
    })
    return () => { batal = true }
  }, [kode])

  const dok = isi?.dokumen ?? []
  const ada = dok.filter((d) => d.berkas.length > 0).length

  return (
    <>
      {/* Event close dari penampil (dialog lain) ikut naik lewat pohon React; hanya tanggapi close milik dialog ini */}
      <dialog ref={dlg} className="panel tj-ev-dlg" aria-labelledby="judul-ev-klausul" onClose={(e) => { if (e.target === e.currentTarget) { setLihat(null); onTutup() } }}>
        {isi && (
          <div className="card tj-ev">
            <div className="row">
              <div>
                <span className="eyebrow">Evidence · Klausul {isi.kode}</span>
                <h3 id="judul-ev-klausul">{isi.judul ?? `Klausul ${isi.kode}`}</h3>
                {isi.dokumen && <p className="muted small">{ada} dari {dok.length} dokumen sudah ada evidence. Klik berkas untuk membukanya.</p>}
              </div>
              <button type="button" className="btn btn-ikon" aria-label="Tutup" onClick={() => dlg.current?.close()} autoFocus><X aria-hidden="true" /></button>
            </div>

            {!isi.dokumen && !isi.galat && <p className="muted small">Memuat evidence…</p>}
            {isi.galat && <p className="pesan galat small" role="alert">{isi.galat}</p>}
            {isi.dokumen && dok.length === 0 && <p className="muted small">Belum ada dokumen untuk klausul ini di lembar Kesiapan.</p>}

            <div className="tj-ev-daftar">
              {dok.map((d) => (
                <div key={d.id} className="tj-ev-dok">
                  <div className="tj-ev-kepala">
                    <span className="mono small muted">{d.kode}</span>
                    <Link href={`/dokumen/${d.id}`} className="tj-ev-nama">{d.nama}</Link>
                    {d.wajib && <Chip kode="info" label="Wajib ISO" />}
                    <Chip kode={(STATUS_DOKUMEN[d.status] ?? STATUS_DOKUMEN.belum).chip} label={`Status: ${(STATUS_DOKUMEN[d.status] ?? STATUS_DOKUMEN.belum).label}`} />
                    <Chip kode={d.berkas.length ? (d.berkas.some((y) => y.sah) ? 'good' : 'warn') : 'crit'} label={d.berkas.length ? `${d.berkas.length} berkas${d.berkas.some((y) => y.sah) ? '' : ' · belum ada versi sah'}` : 'Belum ada evidence'} />
                  </div>
                  {d.posisiDraf && <p className="tj-ev-posisi small muted">Draf ada di: <b>{d.posisiDraf}</b></p>}
                  {d.berkas.length > 0 && (
                    <ul className="tj-ev-berkas">
                      {d.berkas.map((b, i) => (
                        <li key={b.id}>
                          <button type="button" onClick={() => setLihat({ d, indeks: i })} disabled={!b.url} title={b.url ? 'Buka berkas' : 'Tautan berkas gagal dibuat'}>
                            <span className="berkas-ikon"><IkonBerkas b={b} /></span>
                            <span className="grow potong">{b.nama_file}</span>
                            {b.sah ? <span className="berkas-sah">Versi sah</span> : d.berkas.some((y) => y.sah) ? <span className="berkas-draf">Draf</span> : null}
                            <span className="muted small tnum">{ukuranBerkas(b.ukuran)} · {tanggal(b.diunggah_at)}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            <Link className="btn kecil" href={`/kesiapan?klausul=${encodeURIComponent(isi.kode)}#tabel-kesiapan`} style={{ alignSelf: 'flex-start' }}>
              Buka di lembar Kesiapan <ArrowUpRight aria-hidden="true" />
            </Link>
          </div>
        )}
      </dialog>
      <PenampilBerkas berkas={lihat?.d.berkas ?? []} judul={lihat ? `${lihat.d.kode} · ${lihat.d.nama}` : undefined}
        indeks={lihat?.indeks ?? null} setIndeks={(i) => setLihat((l) => (l ? { ...l, indeks: i } : l))} />
    </>
  )
}
