'use client'

import { ArrowUpRight, Search, X } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { GLOSARIUM, KATEGORI_ISTILAH, type KategoriIstilah } from '@/lib/glosarium'

const urut = [...GLOSARIUM].sort((a, b) => a.istilah.localeCompare(b.istilah, 'id'))
const hurufAwal = (s: string) => (/[a-z]/i.test(s[0]) ? s[0].toUpperCase() : '#')

export function DaftarIstilah() {
  const [cari, setCari] = useState('')
  const [kategori, setKategori] = useState<KategoriIstilah | ''>('')

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return urut.filter((x) => (!kategori || x.kategori === kategori) &&
      (!q || `${x.istilah} ${x.asli ?? ''} ${x.arti} ${x.klausul ?? ''}`.toLowerCase().includes(q)))
  }, [cari, kategori])

  const kelompok = useMemo(() => {
    const m = new Map<string, typeof tampil>()
    for (const x of tampil) m.set(hurufAwal(x.istilah), [...(m.get(hurufAwal(x.istilah)) ?? []), x])
    return [...m]
  }, [tampil])

  return (
    <div className="card">
      <div className="toolbar">
        <div className="seg" role="group" aria-label="Kategori istilah">
          <button type="button" aria-pressed={kategori === ''} onClick={() => setKategori('')}>Semua<span className="n">{GLOSARIUM.length}</span></button>
          {(Object.keys(KATEGORI_ISTILAH) as KategoriIstilah[]).map((k) => (
            <button key={k} type="button" aria-pressed={kategori === k} onClick={() => setKategori(k)}>
              {KATEGORI_ISTILAH[k]}<span className="n">{GLOSARIUM.filter((x) => x.kategori === k).length}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="toolbar">
        <label className="cari">
          <Search aria-hidden="true" />
          <span className="sr-only">Cari istilah</span>
          <input type="search" placeholder="Cari istilah, singkatan, klausul…" value={cari} onChange={(e) => setCari(e.target.value)} />
        </label>
        {(cari || kategori) && <button type="button" className="btn kecil" onClick={() => { setCari(''); setKategori('') }}><X aria-hidden="true" />Hapus saringan</button>}
        <span className="muted small" aria-live="polite">{tampil.length} istilah</span>
      </div>

      {kelompok.length > 0 && (
        <nav className="gl-abjad" aria-label="Lompat ke huruf">
          {kelompok.map(([h]) => <a key={h} href={`#huruf-${h}`}>{h}</a>)}
        </nav>
      )}

      {kelompok.length === 0 && <p className="muted gl-kosong">Tidak ada istilah yang cocok dengan “{cari}”.</p>}

      {kelompok.map(([h, daftar]) => (
        <div key={h} id={`huruf-${h}`} className="gl-huruf">
          <span className="gl-label" aria-hidden="true">{h}</span>
          <dl className="gl-daftar">
            {daftar.map((x) => (
              <div key={x.istilah}>
                <dt>
                  {x.href ? <Link href={x.href} className="gl-tautan" title="Buka halaman terkait">{x.istilah}<ArrowUpRight aria-hidden="true" /></Link> : x.istilah}
                  {x.asli && <span className="muted small"> · {x.asli}</span>}
                </dt>
                <dd>{x.arti}</dd>
                <dd className="gl-meta">
                  <span>{KATEGORI_ISTILAH[x.kategori]}</span>
                  {x.klausul && <span className="mono">Klausul {x.klausul}</span>}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  )
}
