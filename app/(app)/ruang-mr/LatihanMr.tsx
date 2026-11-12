'use client'

import { CircleCheck, ChevronDown, Eye, EyeOff, RotateCcw, Search, Shuffle, TriangleAlert, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import type { Fungsi, TanyaMr } from '@/lib/ruang-mr'

type Tanda = 'kuasai' | 'latih'

function baca<T>(kunci: string, awal: T): T {
  try { const v = localStorage.getItem(kunci); return v ? (JSON.parse(v) as T) : awal } catch { return awal }
}
function tulis(kunci: string, nilai: unknown) {
  try { localStorage.setItem(kunci, JSON.stringify(nilai)) } catch { /* penyimpanan tidak tersedia */ }
}

/** Bank soal per kelompok, dengan jawaban tersembunyi dan penanda penguasaan per peramban. `kunci` membedakan simpanan tiap ruang. */
export function LatihanMr({ fungsi, tanya, fakta, kunci = 'ruang-mr' }: { fungsi: Fungsi[]; tanya: TanyaMr[]; fakta: Record<string, string[]>; kunci?: string }) {
  const KUNCI_TANDA = `${kunci}:tanda`
  const [pilih, setPilih] = useState<string>('')
  const [cari, setCari] = useState('')
  const [saring, setSaring] = useState<'' | 'belum' | Tanda>('')
  const [terbuka, setTerbuka] = useState<Set<string>>(new Set())
  const [tanda, setTanda] = useState<Record<string, Tanda>>({})
  const [acak, setAcak] = useState<string | null>(null)

  useEffect(() => { setTanda(baca(KUNCI_TANDA, {})) }, [KUNCI_TANDA])

  function beriTanda(id: string, t: Tanda) {
    setTanda((s) => {
      const n = { ...s }
      if (n[id] === t) delete n[id]; else n[id] = t
      tulis(KUNCI_TANDA, n)
      return n
    })
  }

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return tanya.filter((t) => (!pilih || t.fungsi === pilih) &&
      (!saring || (saring === 'belum' ? !tanda[t.id] : tanda[t.id] === saring)) &&
      (!q || `${t.tanya} ${t.jawab.join(' ')} ${t.bukti} ${t.klausul.join(' ')}`.toLowerCase().includes(q)))
  }, [tanya, pilih, cari, saring, tanda])

  const kuasai = tanya.filter((t) => tanda[t.id] === 'kuasai').length
  const latih = tanya.filter((t) => tanda[t.id] === 'latih').length
  const semuaTerbuka = tampil.length > 0 && tampil.every((t) => terbuka.has(t.id))

  function alih(id: string, buka: boolean) {
    setTerbuka((s) => {
      if (s.has(id) === buka) return s
      const n = new Set(s)
      if (buka) n.add(id); else n.delete(id)
      return n
    })
  }

  function soalAcak() {
    const kolam = tanya.filter((t) => tanda[t.id] !== 'kuasai')
    const daftar = kolam.length ? kolam : tanya
    const t = daftar[Math.floor(Math.random() * daftar.length)]
    setPilih(''); setCari(''); setSaring(''); setTerbuka(new Set()); setAcak(t.id)
    requestAnimationFrame(() => document.getElementById(`mr-${t.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }))
  }

  const adaSaring = !!(pilih || cari || saring)

  return (
    <div className="mr-latihan">
      <div className="mr-fungsi" role="tablist" aria-label="Fungsi MR">
        {fungsi.map((f) => {
          const n = tanya.filter((t) => t.fungsi === f.kode)
          const k = n.filter((t) => tanda[t.id] === 'kuasai').length
          return (
            <button key={f.kode} type="button" role="tab" aria-selected={pilih === f.kode} className={f.kode === 'celah' ? 'celah' : undefined}
              onClick={() => setPilih(pilih === f.kode ? '' : f.kode)}>
              <span className="mono">{f.no}</span>
              <b>{f.judul}</b>
              <span className="muted small">{k}/{n.length} dikuasai · klausul {f.klausul}</span>
              <i style={{ width: `${n.length ? (k / n.length) * 100 : 0}%` }} aria-hidden="true" />
            </button>
          )
        })}
      </div>

      {pilih && (() => {
        const f = fungsi.find((x) => x.kode === pilih)!
        return (
          <div className="card mr-fakta">
            <div>
              <span className="eyebrow">Fungsi {f.no} · dasar SK: &ldquo;{f.dasar}&rdquo;</span>
              <p>{f.inti}</p>
            </div>
            <div>
              <span className="eyebrow">Fakta hari ini</span>
              <ul>{fakta[f.kode].map((x) => <li key={x}>{x}</li>)}</ul>
            </div>
          </div>
        )
      })()}

      <div className="card tj-daftar">
        <div className="toolbar">
          <label className="cari">
            <Search aria-hidden="true" />
            <span className="sr-only">Cari pertanyaan</span>
            <input type="search" placeholder="Cari pertanyaan, jawaban, klausul…" value={cari} onChange={(e) => setCari(e.target.value)} />
          </label>
          <label>
            <span className="sr-only">Status penguasaan</span>
            <select value={saring} onChange={(e) => setSaring(e.target.value as typeof saring)}>
              <option value="">Semua status</option>
              <option value="belum">Belum ditandai</option>
              <option value="latih">Perlu latihan</option>
              <option value="kuasai">Sudah kuasai</option>
            </select>
          </label>
          {adaSaring && <button type="button" className="btn kecil" onClick={() => { setPilih(''); setCari(''); setSaring('') }}><X aria-hidden="true" />Hapus saringan</button>}
          <span style={{ flex: 1 }} />
          <span className="muted small" aria-live="polite">{kuasai} dikuasai · {latih} perlu latihan · {tanya.length - kuasai - latih} belum</span>
          <button type="button" className="btn" onClick={soalAcak}><Shuffle aria-hidden="true" />Soal acak</button>
          <button type="button" className="btn" onClick={() => setTerbuka(semuaTerbuka ? new Set() : new Set(tampil.map((t) => t.id)))}>
            {semuaTerbuka ? <><EyeOff aria-hidden="true" />Sembunyikan jawaban</> : <><Eye aria-hidden="true" />Tampilkan jawaban</>}
          </button>
        </div>

        <div className="mr-progres" role="img" aria-label={`${kuasai} dari ${tanya.length} pertanyaan dikuasai`}>
          <b style={{ width: `${(kuasai / tanya.length) * 100}%` }} />
          <u style={{ width: `${(latih / tanya.length) * 100}%` }} />
        </div>

        {tampil.length === 0 && <p className="muted tj-kosong">Tidak ada pertanyaan yang cocok.</p>}

        <div className="tj-list mr-list">
          {tampil.map((t) => {
            const f = fungsi.find((x) => x.kode === t.fungsi)!
            return (
              <details key={t.id} id={`mr-${t.id}`} className={`tj-item${acak === t.id ? ' mr-acak' : ''}`} open={terbuka.has(t.id)} onToggle={(e) => alih(t.id, e.currentTarget.open)}>
                <summary>
                  <span className="tj-q mono">{t.id}</span>
                  <span className="tj-tanya">
                    {t.tanya}
                    {tanda[t.id] && <span className={`mr-tanda ${tanda[t.id]}`}>{tanda[t.id] === 'kuasai' ? 'Sudah kuasai' : 'Perlu latihan'}</span>}
                  </span>
                  <span className="tj-kl">
                    <span className="mono">{t.stage}</span>
                    {t.klausul.map((x) => <span key={x} className="mono">{x}</span>)}
                  </span>
                  <ChevronDown aria-hidden="true" className="tj-panah" />
                </summary>
                <div className="tj-isi">
                  <div>
                    <span className="eyebrow">Contoh jawaban · {f.no} {f.judul}</span>
                    <ul>{t.jawab.map((j) => <li key={j}>{j}</li>)}</ul>
                  </div>
                  <dl>
                    <div><dt>Bukti yang ditunjukkan</dt><dd>{t.bukti}</dd></div>
                    {t.hindari
                      ? <div className="mr-hindari"><dt><TriangleAlert aria-hidden="true" />Hindari</dt><dd>{t.hindari}</dd></div>
                      : <div><dt>Fakta hari ini</dt><dd>{fakta[t.fungsi][0]}</dd></div>}
                  </dl>
                  <div className="mr-aksi">
                    <span className="tj-tautan small">
                      Buka di aplikasi:{' '}
                      {t.halaman.map((h, i) => <span key={h.href + h.label}>{i > 0 && ', '}<Link href={h.href}>{h.label}</Link></span>)}
                    </span>
                    <span style={{ flex: 1 }} />
                    <button type="button" className={`btn kecil${tanda[t.id] === 'latih' ? ' aktif' : ''}`} aria-pressed={tanda[t.id] === 'latih'} onClick={() => beriTanda(t.id, 'latih')}>
                      <RotateCcw aria-hidden="true" />Perlu latihan
                    </button>
                    <button type="button" className={`btn kecil${tanda[t.id] === 'kuasai' ? ' utama' : ''}`} aria-pressed={tanda[t.id] === 'kuasai'} onClick={() => beriTanda(t.id, 'kuasai')}>
                      <CircleCheck aria-hidden="true" />Sudah kuasai
                    </button>
                  </div>
                </div>
              </details>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** Daftar periksa pribadi MR sebelum audit; centang disimpan per peramban. */
export function DaftarPeriksa({ butir, kunci = 'ruang-mr' }: { butir: string[]; kunci?: string }) {
  const KUNCI_PERIKSA = `${kunci}:periksa`
  const [centang, setCentang] = useState<number[]>([])
  useEffect(() => { setCentang(baca(KUNCI_PERIKSA, [])) }, [KUNCI_PERIKSA])

  function alih(i: number) {
    setCentang((s) => {
      const n = s.includes(i) ? s.filter((x) => x !== i) : [...s, i]
      tulis(KUNCI_PERIKSA, n)
      return n
    })
  }

  return (
    <div className="card mr-periksa">
      <div className="row">
        <span className="eyebrow">{centang.length} dari {butir.length} beres</span>
        {centang.length > 0 && <button type="button" className="btn kecil" onClick={() => { setCentang([]); tulis(KUNCI_PERIKSA, []) }}><RotateCcw aria-hidden="true" />Atur ulang</button>}
      </div>
      <ul>
        {butir.map((b, i) => (
          <li key={b}>
            <label>
              <input type="checkbox" checked={centang.includes(i)} onChange={() => alih(i)} />
              <span>{b}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  )
}
