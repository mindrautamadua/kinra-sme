'use client'

import { ExternalLink, FileX2, Search } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { lihatBerkas } from '@/app/actions'
import { Chip } from '@/components/Chip'
import { IkonBerkas, PenampilBerkas, ukuranBerkas } from '@/components/PenampilBerkas'
import { waktu } from '@/lib/format'
import { INDUK_KLAUSUL, KELOMPOK } from '@/lib/status'
import type { Berkas, BerkasTampil, KelompokDokumen } from '@/lib/types'

type BerkasRingkas = { id: string; nama: string; mime: string | null; ukuran: number | null; at: string; oleh: string | null }
type DokAuditor = {
  id: string; kode: string; nama: string; kelompok: KelompokDokumen; nomor: string | null; pic: string | null; keterangan: string | null
  wajib: boolean; bukti: boolean; masukan: string[]; berkas: BerkasRingkas[]
}
export type KlausulAuditor = {
  kode: string; judul: string; induk: string; dokumen: DokAuditor[]
  temuanBuka: { nomor: string; kategori: string; uraian: string }[]
}

const idHash = (kode: string) => `k-${kode.replace(/\./g, '-')}`

export function RuangAuditor({ klausul }: { klausul: KlausulAuditor[] }) {
  const [aktif, setAktif] = useState(klausul.find((k) => k.kode !== 'P')?.kode ?? klausul[0]?.kode ?? '')
  const [hanyaWajib, setHanyaWajib] = useState(false)
  const [cari, setCari] = useState('')
  const [penampil, setPenampil] = useState<{ judul: string; berkas: BerkasTampil[]; indeks: number | null } | null>(null)
  const [memuat, setMemuat] = useState<string | null>(null)
  const [galat, setGalat] = useState<string | null>(null)

  // Klausul terpilih disimpan di hash (#k-6-3) agar tautan bisa dibagikan ke auditor
  useEffect(() => {
    const dariHash = () => {
      const k = klausul.find((x) => `#${idHash(x.kode)}` === location.hash)
      if (k) setAktif(k.kode)
    }
    dariHash()
    addEventListener('hashchange', dariHash)
    return () => removeEventListener('hashchange', dariHash)
  }, [klausul])

  function pilihKlausul(kode: string) {
    setAktif(kode)
    history.replaceState(null, '', `#${idHash(kode)}`)
  }

  const byKode = useMemo(() => Object.fromEntries(klausul.flatMap((k) => k.dokumen.map((d) => [d.kode, { ...d, klausul: k.kode }]))), [klausul])
  const q = cari.trim().toLowerCase()
  const cocok = (d: DokAuditor) => (!hanyaWajib || d.wajib) && (!q || `${d.kode} ${d.nama} ${d.nomor ?? ''} ${d.berkas.map((b) => b.nama).join(' ')}`.toLowerCase().includes(q))
  const k = klausul.find((x) => x.kode === aktif) ?? klausul[0]
  const tampil = k ? k.dokumen.filter(cocok) : []

  async function buka(d: DokAuditor, berkasId: string) {
    setGalat(null)
    setMemuat(berkasId)
    const h = await lihatBerkas(d.id)
    setMemuat(null)
    if (!h.ok) return setGalat(`Berkas ${d.kode} gagal dibuka: ${h.pesan}`)
    const daftar = h.berkas ?? []
    const i = daftar.findIndex((b) => b.id === berkasId)
    setPenampil({ judul: `${d.kode} · ${d.nama}`, berkas: daftar, indeks: i < 0 ? 0 : i })
  }

  // Kelompokkan navigasi per bab (induk klausul)
  const bab = useMemo(() => {
    const m = new Map<string, KlausulAuditor[]>()
    for (const x of klausul) m.set(x.induk, [...(m.get(x.induk) ?? []), x])
    return [...m.entries()]
  }, [klausul])

  return (
    <div className="ra">
      <nav className="card ra-nav" aria-label="Daftar klausul">
        <label className="cari ra-cari">
          <Search aria-hidden="true" />
          <span className="sr-only">Cari dokumen atau berkas</span>
          <input type="search" placeholder="Cari dokumen atau nama berkas…" value={cari} onChange={(e) => setCari(e.target.value)} />
        </label>
        <label className="dp-opsi"><input type="checkbox" checked={hanyaWajib} onChange={(e) => setHanyaWajib(e.target.checked)} /> Hanya wajib ISO</label>
        {bab.map(([induk, daftar]) => (
          <div key={induk} className="ra-bab">
            <span className="eyebrow">{induk === 'P' ? 'Persiapan' : `${induk}. ${INDUK_KLAUSUL[induk] ?? ''}`}</span>
            {daftar.map((x) => {
              const ds = x.dokumen.filter(cocok)
              if (!ds.length) return null
              const ada = ds.filter((d) => d.bukti).length
              return (
                <button key={x.kode} type="button" className="ra-kl" aria-current={x.kode === k?.kode ? 'true' : undefined} onClick={() => pilihKlausul(x.kode)}>
                  <span className="mono">{x.kode === 'P' ? 'P' : x.kode}</span>
                  <span className="ra-kl-j">{x.judul}</span>
                  <b className={`tnum ${ada === ds.length ? 'txt-good' : ''}`}>{ada}/{ds.length}</b>
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      <div className="ra-isi" id={k ? idHash(k.kode) : undefined}>
        {k && (
          <div className="card">
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <span className="eyebrow">{k.kode === 'P' ? 'Persiapan awal' : `Klausul ${k.kode}`}</span>
                <h2 style={{ margin: '4px 0 0' }}>{k.judul}</h2>
                <p className="muted small" style={{ margin: '4px 0 0' }}>
                  {k.dokumen.filter((d) => d.bukti).length} dari {k.dokumen.length} dokumen ada evidence
                  {k.dokumen.some((d) => d.wajib) && <> · wajib {k.dokumen.filter((d) => d.wajib && d.bukti).length}/{k.dokumen.filter((d) => d.wajib).length}</>}
                </p>
              </div>
              {k.temuanBuka.length > 0 && <Link href="/temuan" className="btn kecil"><Chip kode="warn" label={`${k.temuanBuka.length} temuan terbuka`} /></Link>}
            </div>
            {k.temuanBuka.length > 0 && (
              <ul className="ra-temuan">
                {k.temuanBuka.map((t) => <li key={t.nomor}><Link href={`/temuan#${t.nomor}`} className="mono">{t.nomor}</Link> · {t.kategori} · {t.uraian}</li>)}
              </ul>
            )}
          </div>
        )}

        {galat && <p className="pesan galat" role="alert">{galat}</p>}
        {tampil.length === 0 && <p className="muted card">Tidak ada dokumen yang cocok di klausul ini.</p>}

        {tampil.map((d) => (
          <article key={d.id} className={`card ra-dok${d.bukti ? '' : ' kosong'}`}>
            <div className="ra-dok-kepala">
              <div style={{ minWidth: 0 }}>
                <span className="mono small muted">{d.kode}{d.nomor && ` · ${d.nomor}`}</span>
                <h3>{d.nama}</h3>
                <p className="muted small" style={{ margin: 0 }}>{KELOMPOK[d.kelompok]}{d.pic && ` · PIC ${d.pic}`}{d.keterangan && ` · ${d.keterangan}`}</p>
              </div>
              <div className="ra-chips">
                {d.wajib && <Chip kode="info" label="Wajib ISO" />}
                <Chip kode={d.bukti ? 'good' : 'crit'} label={d.bukti ? `${d.berkas.length} berkas` : 'Belum ada evidence'} />
              </div>
            </div>

            {d.berkas.length > 0 ? (
              <div className="berkas-list" style={{ margin: 0 }}>
                {d.berkas.map((b) => (
                  <div key={b.id} className="berkas-item">
                    <button type="button" className="berkas-buka" disabled={memuat === b.id} onClick={() => buka(d, b.id)} aria-label={`Lihat ${b.nama}`}>
                      <span className="berkas-ikon"><IkonBerkas b={{ nama_file: b.nama, mime: b.mime } as Berkas} /></span>
                      <span className="grow">
                        <b>{b.nama}</b>
                        <span className="muted small">{memuat === b.id ? 'Membuka…' : `${ukuranBerkas(b.ukuran)} · ${waktu(b.at)}${b.oleh ? ` · ${b.oleh}` : ''}`}</span>
                      </span>
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="ra-kosong small"><FileX2 aria-hidden="true" /> Evidence belum diunggah.</p>
            )}

            {d.masukan.length > 0 && (
              <p className="muted small" style={{ margin: 0 }}>
                Bergantung pada:{' '}
                {d.masukan.map((m, i) => {
                  const x = byKode[m]
                  return (
                    <span key={m}>
                      {i > 0 && ', '}
                      <button type="button" className="dp-kode" onClick={() => x && pilihKlausul(x.klausul)} title={x?.nama}>{m}</button>
                      <i className={`dp-titik ${x?.bukti ? 'ada' : 'belum'}`} title={x?.bukti ? 'Ada evidence' : 'Belum ada evidence'} />
                    </span>
                  )
                })}
              </p>
            )}
            <Link href={`/dokumen/${d.id}`} className="ra-detail small"><ExternalLink aria-hidden="true" /> Detail dokumen</Link>
          </article>
        ))}
      </div>

      {penampil && (
        <PenampilBerkas berkas={penampil.berkas} judul={penampil.judul} indeks={penampil.indeks}
          setIndeks={(i) => setPenampil((p) => (i === null ? null : p && { ...p, indeks: i }))} />
      )}
    </div>
  )
}
