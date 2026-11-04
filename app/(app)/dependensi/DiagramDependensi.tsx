'use client'

import { ExternalLink, X } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Chip } from '@/components/Chip'
import { DEPENDENSI, KOLOM_DEPENDENSI } from '@/lib/dependensi'
import { KELOMPOK } from '@/lib/status'
import type { KelompokDokumen } from '@/lib/types'

export type NodeDok = {
  kode: string; id: string | null; nama: string; klausul: string; kolom: string
  kelompok: KelompokDokumen; wajib: boolean; bukti: boolean; pic: string | null
  anggota?: { kode: string; bukti: boolean }[]
}

type Rel = { k: string; r: string }

// Ukuran tata letak (px)
const W = 184, H = 46, GX = 56, GY = 8, TOP = 62, SUBH = 22, PADX = 16, JEDA_SUB = 6

export function DiagramDependensi({ nodes, judulKlausul, urutanKlausul }: { nodes: NodeDok[]; judulKlausul: Record<string, string>; urutanKlausul: string[] }) {
  const [sel, setSel] = useState<string | null>(null)
  const [sorotWajib, setSorotWajib] = useState(false)
  const [sorotBelum, setSorotBelum] = useState(false)
  const [tampilSop, setTampilSop] = useState(true)
  const [rantai, setRantai] = useState(false)
  const kanvas = useRef<HTMLDivElement>(null)

  const byKode = useMemo(() => Object.fromEntries(nodes.map((n) => [n.kode, n])), [nodes])
  const kolIdx = useMemo(() => Object.fromEntries(KOLOM_DEPENDENSI.map((k, i) => [k.id, i])), [])

  // Hanya garis yang kedua ujungnya ada di lembar Kesiapan Audit
  const garis = useMemo(() => DEPENDENSI.filter(([a, b]) => byKode[a] && byKode[b]), [byKode])
  const { masuk, keluar } = useMemo(() => {
    const masuk: Record<string, Rel[]> = {}, keluar: Record<string, Rel[]> = {}
    for (const [a, b, r] of garis) { (keluar[a] ??= []).push({ k: b, r }); (masuk[b] ??= []).push({ k: a, r }) }
    return { masuk, keluar }
  }, [garis])

  const tampil = useMemo(() => nodes.filter((n) => tampilSop || n.kelompok !== 'sop'), [nodes, tampilSop])

  // Posisi kotak dan judul subklausul per kolom
  const tata = useMemo(() => {
    const pos: Record<string, { x: number; y: number }> = {}
    const sub: { x: number; y: number; teks: string }[] = []
    let tinggi = 0
    KOLOM_DEPENDENSI.forEach((kol, i) => {
      const x = PADX + i * (W + GX)
      let y = TOP
      for (const kl of urutanKlausul) {
        const ds = tampil.filter((n) => n.kolom === kol.id && n.klausul === kl).sort((a, b) => a.kode.localeCompare(b.kode))
        if (!ds.length) continue
        if (kl !== 'P') { sub.push({ x, y: y + 4, teks: `${kl} · ${judulKlausul[kl] ?? ''}` }); y += SUBH }
        for (const n of ds) { pos[n.kode] = { x, y }; y += H + GY }
        y += JEDA_SUB
      }
      tinggi = Math.max(tinggi, y)
    })
    return { pos, sub, lebar: PADX * 2 + KOLOM_DEPENDENSI.length * W + (KOLOM_DEPENDENSI.length - 1) * GX, tinggi: tinggi + 20 }
  }, [tampil, urutanKlausul, judulKlausul])

  const telusur = (start: string, peta: Record<string, Rel[]>) => {
    const hasil = new Set<string>(), antre = [start]
    while (antre.length) {
      const k = antre.shift()!
      for (const { k: n } of peta[k] ?? []) if (!hasil.has(n) && n !== start) { hasil.add(n); if (rantai) antre.push(n) }
    }
    return hasil
  }
  const hulu = sel ? telusur(sel, masuk) : new Set<string>()
  const hilir = sel ? telusur(sel, keluar) : new Set<string>()

  function pilih(k: string | null, gulir = false) {
    if (k && !tampilSop && byKode[k]?.kelompok === 'sop') setTampilSop(true)
    setSel(k)
    if (k && gulir) requestAnimationFrame(() => {
      const p = tata.pos[k], c = kanvas.current
      if (!p || !c) return
      c.scrollIntoView({ behavior: 'smooth', block: 'start' })
      c.scrollTo({ left: Math.max(0, p.x - c.clientWidth / 2 + W / 2), top: Math.max(0, p.y - c.clientHeight / 2) })
    })
  }

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setSel(null) }
    addEventListener('keydown', esc)
    return () => removeEventListener('keydown', esc)
  }, [])

  function jalur(a: string, b: string) {
    const pa = tata.pos[a], pb = tata.pos[b]
    if (!pa || !pb) return null
    const ca = kolIdx[byKode[a].kolom] ?? 0, cb = kolIdx[byKode[b].kolom] ?? 0
    if (ca < cb) {
      const x1 = pa.x + W, y1 = pa.y + H / 2, x2 = pb.x, y2 = pb.y + H / 2, m = (x2 - x1) * 0.45
      return { d: `M${x1},${y1} C${x1 + m},${y1} ${x2 - m},${y2} ${x2},${y2}`, balik: false }
    }
    if (ca === cb) {
      const x = pa.x + W, y1 = pa.y + H / 2, y2 = pb.y + H / 2, o = 18 + Math.min(26, Math.abs(y2 - y1) / 12)
      return { d: `M${x},${y1} C${x + o},${y1} ${x + o},${y2} ${x},${y2}`, balik: false }
    }
    const x1 = pa.x, y1 = pa.y + H / 2, x2 = pb.x + W, y2 = pb.y + H / 2, m = Math.max(60, (x1 - x2) * 0.3)
    return { d: `M${x1},${y1} C${x1 - m},${y1 + 40} ${x2 + m},${y2 + 40} ${x2},${y2}`, balik: true }
  }

  const nWajib = nodes.filter((n) => n.wajib).length
  const nBelum = nodes.filter((n) => !n.bukti).length
  const d = sel ? byKode[sel] : null

  const Relasi = ({ items, arah }: { items: Rel[]; arah: 'hulu' | 'hilir' }) => items.length === 0
    ? <p className="muted small" style={{ margin: 0 }}>Tidak ada</p>
    : (
      <ul className="dp-rel">
        {items.map(({ k, r }) => (
          <li key={k} className={arah}>
            <span>
              <button type="button" className="dp-kode" onClick={() => pilih(k, true)}>{k}</button>{' '}
              {byKode[k].nama}
              <i className={`dp-titik ${byKode[k].bukti ? 'ada' : 'belum'}`} title={byKode[k].bukti ? 'Ada evidence' : 'Belum ada evidence'} />
            </span>
            <small>{r}</small>
          </li>
        ))}
      </ul>
    )

  return (
    <>
      <div className="dp-bar">
        <div className="legend">
          <span><i className="dp-k k-persiapan" />Persiapan</span>
          <span><i className="dp-k k-manual" />Manual &amp; kebijakan</span>
          <span><i className="dp-k k-sop" />SOP</span>
          <span><i className="dp-k k-formulir" />Formulir</span>
          <span><i className="dp-k k-rekaman" />Rekaman</span>
          <span><i className="dp-garis hulu" />Dibutuhkan</span>
          <span><i className="dp-garis hilir" />Memberi masukan</span>
          <span><i className="dp-garis balik" />Umpan balik</span>
        </div>
        <span style={{ flex: 1 }} />
        <label className="dp-opsi"><input type="checkbox" checked={sorotWajib} onChange={(e) => setSorotWajib(e.target.checked)} /> Sorot wajib ISO</label>
        <label className="dp-opsi"><input type="checkbox" checked={sorotBelum} onChange={(e) => setSorotBelum(e.target.checked)} /> Sorot belum ada evidence</label>
        <label className="dp-opsi"><input type="checkbox" checked={tampilSop} onChange={(e) => { setTampilSop(e.target.checked); if (!e.target.checked && d?.kelompok === 'sop') setSel(null) }} /> Tampilkan SOP</label>
        <label className="dp-opsi"><input type="checkbox" checked={rantai} onChange={(e) => setRantai(e.target.checked)} /> Rantai lengkap</label>
      </div>

      <div className="dp-utama">
        <div className="card dp-kanvas" ref={kanvas}>
          <div className="dp-stage" style={{ width: tata.lebar, height: tata.tinggi }}>
            <svg width={tata.lebar} height={tata.tinggi} aria-hidden="true">
              {garis.map(([a, b]) => {
                const j = jalur(a, b)
                if (!j) return null
                const isHulu = !!sel && (a === sel || hulu.has(a)) && (b === sel || hulu.has(b)) && hulu.has(a)
                const isHilir = !!sel && (a === sel || hilir.has(a)) && hilir.has(b)
                const kelas = ['dp-edge', j.balik && 'balik', isHulu && 'hulu', !isHulu && isHilir && 'hilir', sel && !isHulu && !isHilir && 'redup'].filter(Boolean).join(' ')
                return <path key={`${a}>${b}`} d={j.d} className={kelas} />
              })}
            </svg>
            {KOLOM_DEPENDENSI.map((kol, i) => (
              <div key={kol.id} className="dp-kolom" style={{ left: PADX + i * (W + GX) }}>{kol.judul}<small>{kol.sub}</small></div>
            ))}
            {tata.sub.map((s) => <div key={`${s.x}-${s.y}`} className="dp-sub" style={{ left: s.x, top: s.y, width: W }} title={s.teks}>{s.teks}</div>)}
            {tampil.map((n) => {
              const p = tata.pos[n.kode]
              if (!p) return null
              const redup = sel
                ? !(n.kode === sel || hulu.has(n.kode) || hilir.has(n.kode))
                : (sorotWajib && !n.wajib) || (sorotBelum && n.bukti)
              const kelas = ['dp-node', `k-${n.kelompok}`, n.kode === sel && 'pilih', hulu.has(n.kode) && 'hulu', !hulu.has(n.kode) && hilir.has(n.kode) && 'hilir', redup && 'redup'].filter(Boolean).join(' ')
              return (
                <button key={n.kode} type="button" className={kelas} style={{ left: p.x, top: p.y, width: W, height: H }}
                  aria-pressed={n.kode === sel} title={`${n.kode} · ${n.nama}`} onClick={() => pilih(sel === n.kode ? null : n.kode)}
                  aria-label={`${n.kode} ${n.nama}${n.wajib ? ', wajib ISO' : ''}, ${n.bukti ? 'ada evidence' : 'belum ada evidence'}`}>
                  <span className="k">{n.kode}{n.wajib && <em>WAJIB</em>}</span>
                  <span className="n">{n.nama}</span>
                  <i className={`dp-titik ${n.bukti ? 'ada' : 'belum'}`} aria-hidden="true" />
                </button>
              )
            })}
          </div>
        </div>

        <aside className="card dp-detail" aria-live="polite">
          {!d ? (
            <>
              <div><span className="eyebrow">Belum ada yang dipilih</span><h3>Klik satu dokumen di diagram</h3></div>
              <p className="muted small" style={{ margin: 0 }}>Panel ini menampilkan dokumen yang menjadi masukannya, dokumen yang bergantung padanya, alasannya, dan status evidence masing-masing.</p>
              <div className="mini-stats">
                <div><span>Dokumen</span><b className="tnum">{nodes.length}</b></div>
                <div><span>Wajib ISO</span><b className="tnum">{nWajib}</b></div>
                <div><span>Belum ada evidence</span><b className="tnum txt-bad">{nBelum}</b></div>
                <div><span>Hubungan</span><b className="tnum">{garis.length}</b></div>
              </div>
              <div>
                <span className="eyebrow">Coba mulai dari</span>
                <p style={{ margin: '6px 0 0', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {['F-6.3-01', 'R-9.1-01', 'R-9.3-01'].filter((k) => byKode[k]).map((k) => <button key={k} type="button" className="dp-kode" onClick={() => pilih(k, true)}>{k}</button>)}
                </p>
              </div>
            </>
          ) : (
            <>
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <span className="eyebrow">{d.kode} · {d.klausul === 'P' ? 'Persiapan' : `Klausul ${d.klausul}`}</span>
                  <h3>{d.nama}</h3>
                </div>
                <button type="button" className="btn btn-ikon kecil" aria-label="Hapus pilihan" onClick={() => setSel(null)}><X aria-hidden="true" /></button>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                <Chip kode={d.bukti ? 'good' : 'crit'} label={d.bukti ? 'Ada evidence' : 'Belum ada evidence'} />
                {d.wajib ? <Chip kode="info" label="Wajib ISO" /> : <Chip kode="na" label="Pendukung" />}
                <Chip kode="na" label={KELOMPOK[d.kelompok]} />
              </div>
              {d.pic && <p className="muted small" style={{ margin: 0 }}>PIC: {d.pic}</p>}
              {d.anggota && (
                <p className="muted small" style={{ margin: 0 }}>
                  {d.anggota.filter((x) => x.bukti).length} dari {d.anggota.length} formulir sudah ada evidence: {d.anggota.filter((x) => !x.bukti).map((x) => x.kode).join(', ') || 'semua lengkap'}{d.anggota.some((x) => !x.bukti) && ' belum'}.
                </p>
              )}
              {(() => {
                const m = masuk[d.kode] ?? []
                const kurang = m.filter(({ k }) => !byKode[k].bukti).length
                return m.length > 0 && kurang > 0 && (
                  <p className="pesan small" style={{ margin: 0 }}>{kurang} dari {m.length} dokumen masukan belum ada evidence; dokumen ini kemungkinan ikut tertahan.</p>
                )
              })()}
              <div><span className="eyebrow">Membutuhkan ({(masuk[d.kode] ?? []).length})</span><Relasi items={masuk[d.kode] ?? []} arah="hulu" /></div>
              <div><span className="eyebrow">Menjadi masukan untuk ({(keluar[d.kode] ?? []).length})</span><Relasi items={keluar[d.kode] ?? []} arah="hilir" /></div>
              {rantai && <p className="muted small" style={{ margin: 0 }}>Rantai lengkap: {hulu.size} dokumen di hulu, {hilir.size} di hilir.</p>}
              {d.id
                ? <Link className="btn" href={`/dokumen/${d.id}`}><ExternalLink aria-hidden="true" /> Buka dokumen</Link>
                : <Link className="btn" href="/kesiapan?klausul=7.5"><ExternalLink aria-hidden="true" /> Buka klausul 7.5 di Kesiapan Audit</Link>}
            </>
          )}
        </aside>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="row"><div><h3>Evidence dan dependensinya per klausul</h3><p className="muted small">Klik kode untuk menyorotnya di diagram</p></div></div>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Kode</th><th>Dokumen / rekaman</th><th>Evidence</th><th>Membutuhkan</th><th>Masukan untuk</th></tr></thead>
            <tbody>
              {urutanKlausul.map((kl) => {
                const ds = nodes.filter((n) => n.klausul === kl).sort((a, b) => a.kode.localeCompare(b.kode))
                if (!ds.length) return null
                const tautan = (arr?: Rel[]) => arr?.length
                  ? <span className="dp-links">{arr.map(({ k }) => <button key={k} type="button" className="dp-kode" onClick={() => pilih(k, true)}>{k}</button>)}</span>
                  : <span className="muted">–</span>
                return [
                  <tr key={`g-${kl}`} className="grup"><td colSpan={5}>{kl === 'P' ? 'Persiapan awal' : `Klausul ${kl}`} · {judulKlausul[kl]}</td></tr>,
                  ...ds.map((n) => (
                    <tr key={n.kode}>
                      <td className="kode"><button type="button" className="dp-kode" onClick={() => pilih(n.kode, true)}>{n.kode}</button></td>
                      <td>{n.nama}{n.wajib && <> <Chip kode="info" label="Wajib ISO" /></>}</td>
                      <td><Chip kode={n.bukti ? 'good' : 'crit'} label={n.bukti ? 'Ada' : 'Belum'} /></td>
                      <td>{tautan(masuk[n.kode])}</td>
                      <td>{tautan(keluar[n.kode])}</td>
                    </tr>
                  )),
                ]
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
