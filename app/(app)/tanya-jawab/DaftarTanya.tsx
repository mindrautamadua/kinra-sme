'use client'

import { ChevronDown, Eye, EyeOff, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { UNIT_AUDIT } from '@/lib/tanya-jawab'
import { ModalEvidence } from './ModalEvidence'

const kunci = (u: number, q: number) => `${u}-${q}`
const SEMUA_KUNCI = UNIT_AUDIT.flatMap((u) => u.tanya.map((t) => kunci(u.no, t.no)))
const urutKlausul = (a: string, b: string) => {
  const [a1, a2] = a.split('.').map(Number), [b1, b2] = b.split('.').map(Number)
  return a1 - b1 || a2 - b2
}
const DAFTAR_KLAUSUL = [...new Set(UNIT_AUDIT.flatMap((u) => u.tanya.flatMap((t) => t.klausul)))].sort(urutKlausul)

export function DaftarTanya() {
  const [cari, setCari] = useState('')
  const [unit, setUnit] = useState(0)
  const [kl, setKl] = useState('')
  const [terbuka, setTerbuka] = useState<Set<string>>(new Set())
  const [evidence, setEvidence] = useState<string | null>(null)

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return UNIT_AUDIT
      .filter((u) => !unit || u.no === unit)
      .map((u) => ({
        ...u,
        tanya: u.tanya.filter((t) => (!kl || t.klausul.includes(kl)) &&
          (!q || `${u.nama} ${t.tanya} ${t.jawab.join(' ')} ${t.bukti} ${t.indikator} ${t.klausul.join(' ')}`.toLowerCase().includes(q))),
      }))
      .filter((u) => u.tanya.length > 0)
  }, [cari, unit, kl])

  const jumlah = tampil.reduce((n, u) => n + u.tanya.length, 0)
  const kunciTampil = tampil.flatMap((u) => u.tanya.map((t) => kunci(u.no, t.no)))
  const semuaTerbuka = kunciTampil.length > 0 && kunciTampil.every((k) => terbuka.has(k))
  const adaSaring = !!(cari || unit || kl)

  function alih(k: string, buka: boolean) {
    setTerbuka((s) => {
      if (s.has(k) === buka) return s
      const n = new Set(s)
      if (buka) n.add(k); else n.delete(k)
      return n
    })
  }

  return (
    <div className="card tj-daftar">
      <div className="toolbar">
        <label className="cari">
          <Search aria-hidden="true" />
          <span className="sr-only">Cari pertanyaan</span>
          <input type="search" placeholder="Cari pertanyaan, jawaban, bukti…" value={cari} onChange={(e) => setCari(e.target.value)} />
        </label>
        <label>
          <span className="sr-only">Unit</span>
          <select value={unit} onChange={(e) => setUnit(Number(e.target.value))}>
            <option value={0}>Semua unit</option>
            {UNIT_AUDIT.map((u) => <option key={u.no} value={u.no}>{u.no}. {u.nama}</option>)}
          </select>
        </label>
        <label>
          <span className="sr-only">Klausul</span>
          <select value={kl} onChange={(e) => setKl(e.target.value)}>
            <option value="">Semua klausul</option>
            {DAFTAR_KLAUSUL.map((k) => <option key={k} value={k}>Klausul {k}</option>)}
          </select>
        </label>
        {adaSaring && <button type="button" className="btn kecil" onClick={() => { setCari(''); setUnit(0); setKl('') }}><X aria-hidden="true" />Hapus saringan</button>}
        <span style={{ flex: 1 }} />
        <span className="muted small" aria-live="polite">{jumlah} pertanyaan</span>
        <button type="button" className="btn" onClick={() => setTerbuka(semuaTerbuka ? new Set() : new Set(adaSaring ? [...terbuka, ...kunciTampil] : SEMUA_KUNCI))}>
          {semuaTerbuka ? <><EyeOff aria-hidden="true" />Sembunyikan jawaban</> : <><Eye aria-hidden="true" />Tampilkan semua jawaban</>}
        </button>
      </div>

      {tampil.length === 0 && <p className="muted tj-kosong">Tidak ada pertanyaan yang cocok.</p>}

      {tampil.map((u) => (
        <section key={u.no} className="tj-unit" aria-labelledby={`unit-${u.no}`}>
          <header className="tj-unit-kepala">
            <span className="tj-no">{u.no}</span>
            <div>
              <span className="eyebrow">Unit {u.no} · {u.kelompok}</span>
              <h3 id={`unit-${u.no}`}>{u.nama}</h3>
              <p className="muted small">
                Klausul {u.klausul}{u.klausulSumber && <span title={`Tertulis di materi sumber: ${u.klausulSumber}`}> (dikoreksi)</span>} · {u.ringkas}
              </p>
            </div>
          </header>
          <div className="tj-list">
            {u.tanya.map((t) => {
              const k = kunci(u.no, t.no)
              return (
                <details key={k} className="tj-item" open={terbuka.has(k)} onToggle={(e) => alih(k, e.currentTarget.open)}>
                  <summary>
                    <span className="tj-q mono">Q{t.no}</span>
                    <span className="tj-tanya">{t.tanya}</span>
                    <span className="tj-kl">{t.klausul.map((x) => <span key={x} className="mono">{x}</span>)}</span>
                    <ChevronDown aria-hidden="true" className="tj-panah" />
                  </summary>
                  <div className="tj-isi">
                    <div>
                      <span className="eyebrow">Jawaban</span>
                      <ul>{t.jawab.map((j) => <li key={j}>{j}</li>)}</ul>
                    </div>
                    <dl>
                      <div><dt>Bukti</dt><dd>{t.bukti}</dd></div>
                      <div><dt>Indikator</dt><dd>{t.indikator}</dd></div>
                    </dl>
                    <p className="tj-tautan small">
                      Cek evidence:{' '}
                      {t.klausul.map((x, i) => (
                        <span key={x}>{i > 0 && ', '}<button type="button" className="tj-ev-tombol" onClick={() => setEvidence(x)}>Klausul {x}</button></span>
                      ))}
                      {t.klausulSumber && <span className="muted"> · materi sumber menulis klausul {t.klausulSumber}</span>}
                    </p>
                  </div>
                </details>
              )
            })}
          </div>
        </section>
      ))}
      <ModalEvidence kode={evidence} onTutup={() => setEvidence(null)} />
    </div>
  )
}
