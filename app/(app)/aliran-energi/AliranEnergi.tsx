'use client'

import { ArrowLeft, ChevronLeft, ChevronRight, Leaf, Pause, Play, ZoomIn } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { DataAliran, PeriodeAliran, SimpulAliran, TampilanAliran, TautanAliran } from '@/lib/aliran-energi'
import { delta, energiListrik, persen } from '@/lib/format'
import { rupiahRingkas, tonCo2 } from '@/lib/konversi'

// ---------------------------------------------------------------------------
// Tata letak Sankey N kolom
// ---------------------------------------------------------------------------
const W = 1000, LS = 14, CELAH = 8, SLOT_MIN = 32, ATAS = 26, KIRI = 168, KANAN = 200, PITA = 300

type PosSimpul = { x: number; y: number; h: number; op: number }
type PosPita = { x0: number; x1: number; y0: number; y1: number; t: number; op: number }
type Tata = { s: Record<string, PosSimpul>; p: Record<string, PosPita> }

const kunciPita = (t: TautanAliran) => `${t.dari}>${t.ke}`

function nilaiSimpul(tautan: TautanAliran[]) {
  const masuk = new Map<string, number>(), keluar = new Map<string, number>()
  for (const t of tautan) {
    keluar.set(t.dari, (keluar.get(t.dari) ?? 0) + t.kwh)
    masuk.set(t.ke, (masuk.get(t.ke) ?? 0) + t.kwh)
  }
  return (id: string) => Math.max(masuk.get(id) ?? 0, keluar.get(id) ?? 0)
}

/**
 * Skala kWh → piksel tetap untuk semua periode dalam satu tampilan, agar tebal pita bisa dibandingkan antarbulan.
 * Kolom terbesar mendapat PITA piksel; tinggi kanvas memberi ruang minimal per simpul agar label kecil tidak bertumpuk.
 */
function skalaGlobal(simpul: SimpulAliran[], periode: PeriodeAliran[], v: TampilanAliran) {
  const nKolom = Math.max(...simpul.map((s) => s.kolom)) + 1
  const perKolom = Array.from({ length: nKolom }, (_, k) => simpul.filter((s) => s.kolom === k).length)
  let maks = 1
  for (const p of periode) {
    const nilai = nilaiSimpul(p.tautan[v])
    for (let k = 0; k < nKolom; k++) maks = Math.max(maks, simpul.filter((s) => s.kolom === k).reduce((t, s) => t + nilai(s.id), 0))
  }
  return { skala: PITA / maks, tinggi: Math.max(420, ATAS * 2 + PITA + Math.max(...perKolom) * (SLOT_MIN + CELAH) - SLOT_MIN * 2) }
}

function tataLetak(simpul: SimpulAliran[], tautan: TautanAliran[], { skala, tinggi: H }: { skala: number; tinggi: number }): Tata {
  const nilai = nilaiSimpul(tautan)
  const nKolom = Math.max(...simpul.map((s) => s.kolom)) + 1
  const xKolom = (k: number) => KIRI + (k * (W - KIRI - KANAN - LS)) / Math.max(1, nKolom - 1)
  const urutSeu = new Map(simpul.filter((s) => s.jenis === 'seu' || s.jenis === 'nonseu').map((s, i) => [s.id, i]))
  const s: Tata['s'] = {}
  for (let k = 0; k < nKolom; k++) {
    let ns = simpul.filter((x) => x.kolom === k && nilai(x.id) > 0)
    // Pengguna dikelompokkan per SEU tujuan lalu diurut terbesar, agar pita tidak saling silang
    if (ns.some((x) => x.jenis === 'pengguna')) {
      ns = [...ns].sort((a, b) => (urutSeu.get(a.seu ? `seu:${a.seu}` : 'nonseu') ?? 99) - (urutSeu.get(b.seu ? `seu:${b.seu}` : 'nonseu') ?? 99) || nilai(b.id) - nilai(a.id))
    }
    const slot = (x: SimpulAliran) => Math.max(SLOT_MIN, nilai(x.id) * skala)
    const tinggi = ns.reduce((t, x) => t + slot(x), 0) + CELAH * Math.max(0, ns.length - 1)
    let y = Math.max(ATAS, (H - tinggi) / 2)
    for (const x of ns) {
      const h = Math.max(2, nilai(x.id) * skala)
      s[x.id] = { x: xKolom(k), y: y + (slot(x) - h) / 2, h, op: 1 }
      y += slot(x) + CELAH
    }
  }
  // Tumpukan pita: keluar diurut menurut posisi tujuan, masuk menurut posisi asal
  const p: Tata['p'] = {}
  const ada = tautan.filter((t) => t.kwh > 0 && s[t.dari] && s[t.ke])
  const offKeluar = new Map<string, number>(), offMasuk = new Map<string, number>()
  const keluar = [...ada].sort((a, b) => s[a.dari].y - s[b.dari].y || s[a.ke].y - s[b.ke].y)
  const yKeluar = new Map<string, number>()
  for (const t of keluar) {
    const tebal = Math.max(1.5, t.kwh * skala)
    const o = offKeluar.get(t.dari) ?? 0
    yKeluar.set(kunciPita(t), s[t.dari].y + o + tebal / 2)
    offKeluar.set(t.dari, o + tebal)
  }
  const masuk = [...ada].sort((a, b) => s[a.ke].y - s[b.ke].y || s[a.dari].y - s[b.dari].y)
  for (const t of masuk) {
    const tebal = Math.max(1.5, t.kwh * skala)
    const o = offMasuk.get(t.ke) ?? 0
    p[kunciPita(t)] = { x0: s[t.dari].x + LS, x1: s[t.ke].x, y0: yKeluar.get(kunciPita(t))!, y1: s[t.ke].y + o + tebal / 2, t: tebal, op: 1 }
    offMasuk.set(t.ke, o + tebal)
  }
  return { s, p }
}

/** Keadaan "kosong": posisi sama, tinggi dan tebal nol. Dipakai untuk animasi masuk. */
const kosongkan = (t: Tata): Tata => ({
  s: Object.fromEntries(Object.entries(t.s).map(([k, v]) => [k, { ...v, y: v.y + v.h / 2, h: 0, op: 0 }])),
  p: Object.fromEntries(Object.entries(t.p).map(([k, v]) => [k, { ...v, t: 0, op: 0 }])),
})

const lerp = (a: number, b: number, u: number) => a + (b - a) * u
function campur(a: Tata, b: Tata, u: number): Tata {
  const s: Tata['s'] = {}, p: Tata['p'] = {}
  for (const k of new Set([...Object.keys(a.s), ...Object.keys(b.s)])) {
    const x = a.s[k] ?? { ...b.s[k], y: b.s[k].y + b.s[k].h / 2, h: 0, op: 0 }
    const y = b.s[k] ?? { ...a.s[k], y: a.s[k].y + a.s[k].h / 2, h: 0, op: 0 }
    s[k] = { x: lerp(x.x, y.x, u), y: lerp(x.y, y.y, u), h: lerp(x.h, y.h, u), op: lerp(x.op, y.op, u) }
  }
  for (const k of new Set([...Object.keys(a.p), ...Object.keys(b.p)])) {
    const x = a.p[k] ?? { ...b.p[k], t: 0, op: 0 }
    const y = b.p[k] ?? { ...a.p[k], t: 0, op: 0 }
    p[k] = { x0: lerp(x.x0, y.x0, u), x1: lerp(x.x1, y.x1, u), y0: lerp(x.y0, y.y0, u), y1: lerp(x.y1, y.y1, u), t: lerp(x.t, y.t, u), op: lerp(x.op, y.op, u) }
  }
  return { s, p }
}
const halus = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - (-2 * u + 2) ** 3 / 2)
const geraKurang = () => typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Transisi tata letak: setiap perubahan target dianimasikan dari keadaan yang sedang tampil. */
function useTataBergerak(target: Tata, durasi = 750) {
  const [tampil, setTampil] = useState(target)
  const kini = useRef(target)
  const raf = useRef(0)
  const pertama = useRef(true)

  const jalankan = useCallback((dari: Tata, ke: Tata, ms: number) => {
    cancelAnimationFrame(raf.current)
    const t0 = performance.now()
    const langkah = (t: number) => {
      const u = Math.min(1, (t - t0) / ms)
      const v = u >= 1 ? ke : campur(dari, ke, halus(u))
      kini.current = v
      setTampil(v)
      if (u < 1) raf.current = requestAnimationFrame(langkah)
    }
    raf.current = requestAnimationFrame(langkah)
  }, [])

  // Animasi masuk: tumbuh dari nol (sebelum paint, agar tidak berkedip)
  useLayoutEffect(() => {
    if (!pertama.current) return
    pertama.current = false
    if (geraKurang()) return
    const nol = kosongkan(target)
    kini.current = nol
    setTampil(nol)
    jalankan(nol, target, 1300)
  }, [target, jalankan])

  useEffect(() => {
    if (kini.current === target) return
    if (geraKurang()) { kini.current = target; setTampil(target); return }
    jalankan(kini.current, target, durasi)
  }, [target, durasi, jalankan])

  useEffect(() => () => cancelAnimationFrame(raf.current), [])
  return tampil
}

/** Angka yang bergeser halus dari nilai sebelumnya ke nilai baru. */
function AngkaGeser({ nilai, format }: { nilai: number; format: (v: number) => string }) {
  const [v, setV] = useState(nilai)
  const kini = useRef(nilai)
  useEffect(() => {
    if (geraKurang()) { kini.current = nilai; setV(nilai); return }
    const dari = kini.current, t0 = performance.now()
    let raf = 0
    const langkah = (t: number) => {
      const u = Math.min(1, (t - t0) / 700)
      kini.current = lerp(dari, nilai, halus(u))
      setV(kini.current)
      if (u < 1) raf = requestAnimationFrame(langkah)
    }
    raf = requestAnimationFrame(langkah)
    return () => cancelAnimationFrame(raf)
  }, [nilai])
  return <><span aria-hidden="true">{format(v)}</span><span className="sr-only">{format(nilai)}</span></>
}

/** Semua simpul dan pita yang tersambung (hulu dan hilir) dengan satu simpul. */
function jalur(id: string, tautan: TautanAliran[]) {
  const simpul = new Set([id]), pita = new Set<string>()
  const telusur = (arah: 'hulu' | 'hilir', dari: string) => {
    for (const t of tautan) {
      const cocok = arah === 'hilir' ? t.dari === dari : t.ke === dari
      if (!cocok || pita.has(kunciPita(t))) continue
      pita.add(kunciPita(t))
      const lanjut = arah === 'hilir' ? t.ke : t.dari
      simpul.add(lanjut)
      telusur(arah, lanjut)
    }
  }
  telusur('hilir', id); telusur('hulu', id)
  return { simpul, pita }
}

const warna = (s?: SimpulAliran) => `var(--${s?.warna ?? 's3'})`

// ---------------------------------------------------------------------------
// Komponen utama
// ---------------------------------------------------------------------------
export function AliranEnergi({ data }: { data: DataAliran }) {
  const [tampilan, setTampilan] = useState<TampilanAliran>('kinra')
  // Bulan yang punya data untuk tampilan aktif (data kawasan bisa berhenti lebih awal dari bacaan meter)
  const bulanan = useMemo(() => data.periode.filter((p) => p.kunci >= 0 && p.tautan[tampilan].length > 0), [data.periode, tampilan])
  const rata = data.periode.find((p) => p.kunci === -1) ?? null
  const [arahZoom, setArahZoom] = useState<'masuk' | 'keluar' | null>(null)
  const [kunci, setKunci] = useState(() => data.periode[data.awal].kunci)
  const [pakaiRata, setPakaiRata] = useState(false)
  const [main, setMain] = useState(false)
  const [fokus, setFokus] = useState<string | null>(null)
  const [arah, setArah] = useState<string | null>(null)

  // Bulan terpilih; bila tidak ada di tampilan ini, pakai bulan terdekat sebelumnya (atau yang pertama)
  const iBulan = Math.max(0, bulanan.findLastIndex((p) => p.kunci <= kunci))
  const periode = (pakaiRata && rata ? rata : bulanan[iBulan]) ?? data.periode[data.awal]
  const simpul = data.simpul[tampilan]
  const tautan = periode.tautan[tampilan]
  const skala = useMemo(() => skalaGlobal(simpul, data.periode, tampilan), [simpul, data.periode, tampilan])
  const target = useMemo(() => tataLetak(simpul, tautan, skala), [simpul, tautan, skala])
  const tata = useTataBergerak(target)
  const H = skala.tinggi
  const total = useMemo(() => simpul.filter((s) => s.kolom === 0).reduce((t, s) => t + (periode.nilai[s.id]?.kwh ?? 0), 0), [simpul, periode])
  // Rincian kartu lingkup KINRA: listrik meter aset vs BBM (kWh setara), agar beda dengan simpul "Listrik" terbaca
  const listrikAset = periode.nilai['src:listrik']?.kwh ?? 0

  // Putar otomatis bulan demi bulan
  const urutan = useRef(bulanan)
  useEffect(() => { urutan.current = bulanan }, [bulanan])
  useEffect(() => {
    if (!main) return
    const id = setInterval(() => setKunci((k) => {
      const b = urutan.current
      const i = b.findIndex((p) => p.kunci > k)
      return i >= 0 ? b[i].kunci : k
    }), geraKurang() ? 1600 : 1250)
    return () => clearInterval(id)
  }, [main])
  useEffect(() => { if (main && iBulan >= bulanan.length - 1) setMain(false) }, [main, iBulan, bulanan.length])

  const putar = () => {
    if (main) { setMain(false); return }
    setPakaiRata(false)
    if (iBulan >= bulanan.length - 1) setKunci(bulanan[0].kunci)
    setMain(true)
  }
  const keBulan = (i: number) => { setMain(false); setPakaiRata(false); setKunci(bulanan[Math.max(0, Math.min(bulanan.length - 1, i))].kunci) }
  const gantiTampilan = (v: TampilanAliran) => {
    if (v === tampilan) return
    setArahZoom(v === 'kinra' ? 'masuk' : 'keluar')
    setTampilan(v); setFokus(null); setArah(null)
  }
  const klikSimpul = (s: SimpulAliran) => {
    if (s.jenis === 'kinra') { gantiTampilan('kinra'); return }
    setFokus((f) => (f === s.id ? null : s.id))
  }

  const aktif = arah ?? fokus
  const sorot = useMemo(() => (aktif && tata.s[aktif] ? jalur(aktif, tautan) : null), [aktif, tautan, tata.s])
  const label = (id: string) => simpul.find((s) => s.id === id)?.label ?? id
  const nKolom = Math.max(...simpul.map((s) => s.kolom)) + 1
  const sebagian = periode.meterTerbaca < data.meterTotal
  const iSebelum = pakaiRata ? -1 : iBulan - 1
  const sebelum = iSebelum >= 0 ? bulanan[iSebelum] : null
  const totalSebelum = sebelum ? simpul.filter((s) => s.kolom === 0).reduce((t, s) => t + (sebelum.nilai[s.id]?.kwh ?? 0), 0) : null

  // Angka ringkas per tampilan
  const n = (id: string) => periode.nilai[id] ?? { kwh: 0, rupiah: 0, kg: 0 }
  const lewatSeu = simpul.filter((s) => s.jenis === 'seu').reduce((t, s) => t + n(s.id).kwh, 0)
  const biaya = simpul.filter((s) => s.kolom === 0).reduce((t, s) => t + n(s.id).rupiah, 0)
  const emisi = simpul.filter((s) => s.kolom === 0).reduce((t, s) => t + n(s.id).kg, 0)
  const ebt = n('kw:pltbg').kwh + n('kw:plts').kwh
  const terbesar = simpul.filter((s) => s.jenis === 'pengguna').sort((a, b) => n(b.id).kwh - n(a.id).kwh)[0]

  return (
    <div className="ae" data-tampilan={tampilan}>
      <div className="ae-kendali">
        <div className="seg" role="tablist" aria-label="Tampilan aliran">
          <button type="button" role="tab" aria-selected={tampilan === 'kinra'} onClick={() => gantiTampilan('kinra')}>Lingkup KINRA</button>
          {data.periode.some((p) => p.tautan.kawasan.length > 0) && (
            <button type="button" role="tab" aria-selected={tampilan === 'kawasan'} onClick={() => gantiTampilan('kawasan')}>Kawasan (termasuk tenant)</button>
          )}
        </div>
        <div className="ae-periode" aria-live="polite">
          <span className="eyebrow">Periode</span>
          <b key={periode.kunci} className="ae-bulan">{periode.label}</b>
          {sebagian && !pakaiRata && <span className="chip warn">{periode.meterTerbaca}/{data.meterTotal} meter terbaca</span>}
        </div>
      </div>

      <div className="ae-kpi">
        {tampilan === 'kinra' ? (
          <>
            <div><span>Energi lingkup KINRA</span><b className="tnum"><AngkaGeser nilai={total} format={energiListrik} /></b>
              <small className="muted">{totalSebelum ? `${delta(((total - totalSebelum) / totalSebelum) * 100)} vs ${sebelum!.ringkas}` : 'kWh setara'}</small>
              <small className="muted">listrik {energiListrik(listrikAset)} + BBM {energiListrik(total - listrikAset)} setara</small></div>
            <div><span>Lewat SEU</span><b className="tnum"><AngkaGeser nilai={total ? (lewatSeu / total) * 100 : 0} format={(v) => persen(v)} /></b>
              <small className="muted">{energiListrik(lewatSeu)}</small></div>
            <div><span>Biaya</span><b className="tnum"><AngkaGeser nilai={biaya} format={rupiahRingkas} /></b><small className="muted">listrik + BBM</small></div>
            <div><span>Emisi</span><b className="tnum"><AngkaGeser nilai={emisi} format={tonCo2} /></b><small className="muted">CO₂</small></div>
          </>
        ) : (
          <>
            <div><span>Listrik kawasan</span><b className="tnum"><AngkaGeser nilai={total} format={energiListrik} /></b>
              <small className="muted">{totalSebelum ? `${delta(((total - totalSebelum) / totalSebelum) * 100)} vs ${sebelum!.ringkas}` : 'semua sumber'}</small></div>
            <div><span><Leaf aria-hidden="true" size={11} /> Terbarukan</span><b className="tnum"><AngkaGeser nilai={total ? (ebt / total) * 100 : 0} format={(v) => persen(v)} /></b><small className="muted">PLTBG + PLTS</small></div>
            <div><span>Dipakai KINRA</span><b className="tnum"><AngkaGeser nilai={total ? (n('kw:kinra').kwh / total) * 100 : 0} format={(v) => persen(v, 2)} /></b><small className="muted">{energiListrik(n('kw:kinra').kwh)}</small></div>
            <div><span>Ke tenant & lainnya</span><b className="tnum"><AngkaGeser nilai={n('kw:tenant').kwh} format={energiListrik} /></b><small className="muted">di luar lingkup SMEn</small></div>
          </>
        )}
      </div>

      <div className="ae-badan">
        <div className={`card ae-kanvas${arahZoom ? ` zoom-${arahZoom}` : ''}`} key={tampilan} onAnimationEnd={() => setArahZoom(null)}>
          {tautan.length === 0 ? (
            <p className="muted ae-kosong">Belum ada data {tampilan === 'kawasan' ? 'listrik kawasan' : 'bacaan meter'} untuk {periode.label}. Pilih bulan lain.</p>
          ) : (
            <div className="ae-gulir">
              <svg viewBox={`0 0 ${W} ${H}`} className={`ae-svg${sorot ? ' ada-sorot' : ''}`} role="img"
                aria-label={`Aliran energi ${tampilan === 'kinra' ? 'lingkup KINRA' : 'kawasan'} ${periode.label}: ${tautan.map((t) => `${label(t.dari)} ke ${label(t.ke)} ${energiListrik(t.kwh)}`).join('; ')}`}>
                <defs>
                  <filter id="ae-pijar" x="-20%" y="-50%" width="140%" height="200%">
                    <feGaussianBlur stdDeviation="2.4" result="b" />
                    <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                  {Object.entries(tata.p).map(([k, p], i) => {
                    const [dari, ke] = k.split('>')
                    return (
                      <linearGradient key={k} id={`ae-g-${tampilan}-${i}`} gradientUnits="userSpaceOnUse" x1={p.x0} x2={p.x1} y1={0} y2={0}>
                        <stop offset="0%" style={{ stopColor: warna(simpul.find((s) => s.id === dari)) }} />
                        <stop offset="100%" style={{ stopColor: warna(simpul.find((s) => s.id === ke)) }} />
                      </linearGradient>
                    )
                  })}
                </defs>

                {Object.entries(tata.p).map(([k, p], i) => {
                  if (p.t < 0.3 && p.op < 0.05) return null
                  const mx = (p.x0 + p.x1) / 2
                  const d = `M${p.x0},${p.y0} C${mx},${p.y0} ${mx},${p.y1} ${p.x1},${p.y1}`
                  const t = tautan.find((x) => kunciPita(x) === k)
                  const porsi = t && total ? t.kwh / total : 0
                  const redup = sorot && !sorot.pita.has(k)
                  return (
                    <g key={k} className={`ae-pita${redup ? ' redup' : ''}${sorot?.pita.has(k) ? ' terang' : ''}`} style={{ opacity: p.op }}>
                      <path d={d} className="dasar" strokeWidth={Math.max(0.5, p.t)} stroke={`url(#ae-g-${tampilan}-${i})`}>
                        {t && <title>{`${label(t.dari)} → ${label(t.ke)}: ${energiListrik(t.kwh)} (${persen(porsi * 100)})`}</title>}
                      </path>
                      {p.t > 1 && (
                        <path d={d} className="arus" strokeWidth={Math.max(1.2, Math.min(p.t * 0.32, 7))} stroke={`url(#ae-g-${tampilan}-${i})`}
                          style={{ animationDuration: `${(3.4 - 2.4 * Math.sqrt(porsi)).toFixed(2)}s`, animationDelay: `${(-i * 0.37).toFixed(2)}s` }} />
                      )}
                    </g>
                  )
                })}

                {simpul.map((s) => {
                  const p = tata.s[s.id]
                  if (!p || p.op < 0.02) return null
                  const v = n(s.id).kwh
                  const kiri = s.kolom === 0, akhir = s.kolom === nKolom - 1
                  const tx = kiri ? p.x - 10 : p.x + LS + 10
                  const ty = p.y + p.h / 2
                  const redup = sorot && !sorot.simpul.has(s.id)
                  return (
                    <g key={s.id} className={`ae-simpul j-${s.jenis}${redup ? ' redup' : ''}${fokus === s.id ? ' dipilih' : ''}`} style={{ opacity: p.op }}
                      tabIndex={0} role="button" aria-label={`${s.label}: ${energiListrik(v)}`} aria-pressed={fokus === s.id}
                      onMouseEnter={() => setArah(s.id)} onMouseLeave={() => setArah(null)}
                      onFocus={() => setArah(s.id)} onBlur={() => setArah(null)}
                      onClick={() => klikSimpul(s)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); klikSimpul(s) } }}>
                      <rect className="tangkap" x={kiri ? p.x - KIRI + 12 : p.x} y={p.y - 6} width={kiri ? KIRI - 12 + LS : (akhir ? KANAN : 150) + LS} height={Math.max(p.h + 12, 30)} />
                      <rect className="batang" x={p.x} y={p.y} width={LS} height={Math.max(0, p.h)} rx={4} style={{ fill: warna(s) }} />
                      {s.jenis === 'kinra' && <circle className="denyut" cx={p.x + LS / 2} cy={ty} r={14} style={{ stroke: warna(s) }} />}
                      <text x={tx} y={ty - 7} textAnchor={kiri ? 'end' : 'start'} className="ae-label">{s.label}</text>
                      <text x={tx} y={ty + 9} textAnchor={kiri ? 'end' : 'start'} className="ae-nilai">
                        {energiListrik(v)}{total ? ` · ${persen((v / total) * 100)}` : ''}
                      </text>
                    </g>
                  )
                })}
              </svg>
            </div>
          )}
          <p className="ae-petunjuk muted small">
            {tampilan === 'kawasan'
              ? <><ZoomIn size={13} aria-hidden="true" /> Klik simpul <b>KINRA</b> untuk memperbesar ke lingkup SMEn. Tebal pita sebanding kWh; kecepatan partikel sebanding porsinya.</>
              : <>Arahkan kursor ke simpul untuk menyorot jalurnya, klik untuk detail. Tebal pita sebanding kWh setara dan memakai skala yang sama untuk semua bulan.</>}
            <span className="ae-geser"> Geser diagram ke samping untuk melihat kolom kanan.</span>
          </p>
        </div>

        <PanelDetail data={data} bulanan={bulanan} periode={periode} pakaiRata={pakaiRata} iBulan={iBulan} keBulan={keBulan}
          simpul={simpul} tautan={tautan} fokus={fokus} setFokus={setFokus} total={total} tampilan={tampilan}
          gantiTampilan={gantiTampilan} lewatSeu={lewatSeu} terbesar={terbesar} />
      </div>

      <div className="ae-waktu card">
        <div className="ae-tombol">
          <button type="button" className="btn btn-ikon" aria-label="Bulan sebelumnya" onClick={() => keBulan(iBulan - 1)} disabled={!pakaiRata && iBulan === 0}><ChevronLeft aria-hidden="true" /></button>
          <button type="button" className={`btn ae-main${main ? ' aktif' : ''}`} onClick={putar} aria-pressed={main}>
            {main ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}{main ? 'Jeda' : 'Putar timelapse'}
          </button>
          <button type="button" className="btn btn-ikon" aria-label="Bulan berikutnya" onClick={() => keBulan(iBulan + 1)} disabled={!pakaiRata && iBulan === bulanan.length - 1}><ChevronRight aria-hidden="true" /></button>
          {rata && (
            <button type="button" className={`btn kecil${pakaiRata ? ' utama' : ''}`} aria-pressed={pakaiRata} title={rata.label} onClick={() => { setMain(false); setPakaiRata((v) => !v) }}>
              {rata.label.replace(' bulan lengkap terakhir', ' bln')}
            </button>
          )}
        </div>
        <div className="ae-rel">
          <input type="range" min={0} max={bulanan.length - 1} value={iBulan} aria-label="Pilih bulan" aria-valuetext={bulanan[iBulan]?.label}
            className={pakaiRata ? 'pudar' : ''} style={{ '--isi': `${(iBulan / Math.max(1, bulanan.length - 1)) * 100}%` } as React.CSSProperties}
            onChange={(e) => keBulan(Number(e.target.value))} />
          <div className="ae-tahun" aria-hidden="true">
            {bulanan.map((p, i) => (p.kunci % 12 === 0 || i === 0) && (
              <span key={p.kunci} style={{ left: `${(i / Math.max(1, bulanan.length - 1)) * 100}%` }}>{Math.floor(p.kunci / 12)}</span>
            ))}
            {bulanan.map((p, i) => p.meterTerbaca < data.meterTotal && (
              <i key={`s${p.kunci}`} title={`${p.label}: ${p.meterTerbaca}/${data.meterTotal} meter`} style={{ left: `${(i / Math.max(1, bulanan.length - 1)) * 100}%` }} />
            ))}
          </div>
        </div>
      </div>

      <details className="ae-tabel">
        <summary>Lihat sebagai tabel ({periode.label})</summary>
        <table className="tbl">
          <thead><tr><th>Dari</th><th>Ke</th><th className="num">kWh{tampilan === 'kinra' ? ' setara' : ''}</th><th className="num">Porsi</th></tr></thead>
          <tbody>
            {tautan.map((t) => (
              <tr key={kunciPita(t)}><td>{label(t.dari)}</td><td>{label(t.ke)}</td><td className="num tnum">{energiListrik(t.kwh)}</td><td className="num tnum">{persen(total ? (t.kwh / total) * 100 : 0)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Panel detail simpul + grafik garis kecil yang dapat diklik
// ---------------------------------------------------------------------------
function PanelDetail(o: {
  data: DataAliran; bulanan: PeriodeAliran[]; periode: PeriodeAliran; pakaiRata: boolean; iBulan: number; keBulan: (i: number) => void
  simpul: SimpulAliran[]; tautan: TautanAliran[]; fokus: string | null; setFokus: (v: string | null) => void; total: number
  tampilan: TampilanAliran; gantiTampilan: (v: TampilanAliran) => void; lewatSeu: number; terbesar?: SimpulAliran
}) {
  const s = o.simpul.find((x) => x.id === o.fokus) ?? null
  const id = s?.id ?? null
  const n = (k: string) => o.periode.nilai[k] ?? { kwh: 0, rupiah: 0, kg: 0 }
  const seri = o.bulanan.map((p) => (id ? p.nilai[id]?.kwh ?? 0 : o.simpul.filter((x) => x.kolom === 0).reduce((t, x) => t + (p.nilai[x.id]?.kwh ?? 0), 0)))
  const nilai = id ? n(id) : null
  const anggota = s && (s.jenis === 'seu' || s.jenis === 'nonseu' || s.jenis === 'sumber' || s.jenis === 'pusat')
    ? o.tautan.filter((t) => (s.jenis === 'sumber' || s.jenis === 'pusat' ? t.dari === s.id : t.ke === s.id)).sort((a, b) => b.kwh - a.kwh)
    : []
  const lbl = (k: string) => o.simpul.find((x) => x.id === k)?.label ?? k
  const seuDari = s?.seu ? o.simpul.find((x) => x.id === `seu:${s.seu}`) : null

  return (
    <aside className="card ae-panel" aria-live="polite">
      {s ? (
        <div key={s.id} className="ae-panel-isi">
          <button type="button" className="btn kecil ae-kembali" onClick={() => o.setFokus(null)}><ArrowLeft aria-hidden="true" /> Ringkasan</button>
          <span className="eyebrow" style={{ color: warna(s) }}>{({ sumber: 'Sumber', pusat: 'Pusat distribusi', luar: 'Di luar lingkup', kinra: 'Lingkup SMEn', pengguna: 'Pengguna energi', seu: 'SEU', nonseu: 'Bukan SEU' } as const)[s.jenis]}</span>
          <h3>{s.label}</h3>
          <div className="ae-besar tnum"><AngkaGeser nilai={nilai!.kwh} format={energiListrik} /></div>
          <p className="muted small">{o.total ? `${persen((nilai!.kwh / o.total) * 100)} dari total` : ''}{s.ket ? ` · ${s.ket}` : ''}</p>
          <div className="mini-stats ae-mini">
            <div><span>Biaya</span><b className="tnum">{rupiahRingkas(nilai!.rupiah)}</b></div>
            <div><span>Emisi</span><b className="tnum">{tonCo2(nilai!.kg)}</b></div>
          </div>
          {s.jenis === 'pengguna' && (
            <p className="small">{seuDari ? <>Tercakup <b style={{ color: warna(seuDari) }}>{seuDari.label}</b>.</> : <>Belum masuk SEU mana pun. Bila porsinya besar atau potensinya tinggi, pertimbangkan pada tinjauan energi berikutnya (klausul 6.3).</>}</p>
          )}
          {anggota.length > 0 && (
            <ul className="ae-anggota">
              {anggota.map((t) => {
                const k = s.jenis === 'sumber' || s.jenis === 'pusat' ? t.ke : t.dari
                return (
                  <li key={k}>
                    <button type="button" onClick={() => o.setFokus(k)}>{lbl(k)}</button>
                    <span className="tnum">{energiListrik(t.kwh)}</span>
                    <i style={{ width: `${(t.kwh / Math.max(1, anggota[0].kwh)) * 100}%`, background: warna(o.simpul.find((x) => x.id === k)) }} />
                  </li>
                )
              })}
            </ul>
          )}
          {s.href && <Link className="btn kecil" href={s.href}>{s.jenis === 'seu' ? 'Buka register SEU' : s.href === '/aset' ? 'Buka Aset & Meter' : 'Buka Data Energi'}</Link>}
        </div>
      ) : (
        <div key="ringkas" className="ae-panel-isi">
          <span className="eyebrow">Membaca diagram</span>
          {o.tampilan === 'kinra' ? (
            <>
              <h3>Ke mana energi KINRA pergi</h3>
              <p className="small">
                {o.terbesar && o.total ? <><b>{o.terbesar.label}</b> menyerap <b>{persen((n(o.terbesar.id).kwh / o.total) * 100)}</b> energi lingkup KINRA pada {o.periode.label}. </> : null}
                SEU yang terdaftar menanggung <b>{persen(o.total ? (o.lewatSeu / o.total) * 100 : 0)}</b>; sisanya mengalir ke pengguna lain.
              </p>
              <p className="muted small">Kolom kanan memperlihatkan apakah penetapan SEU (klausul 6.3) sudah mencakup pengguna energi terbesar. Klik simpul untuk rincian.</p>
            </>
          ) : (
            <>
              <h3>Listrik kawasan dan batas lingkup</h3>
              <p className="small">Dari setiap 100 kWh listrik kawasan, <b>{o.total ? (n('kw:kinra').kwh / o.total * 100).toLocaleString('id-ID', { maximumFractionDigits: 1 }) : '–'} kWh</b> dipakai KINRA sendiri. Sisanya disalurkan ke tenant dan tidak menjadi dasar klaim kinerja SMEn.</p>
              <button type="button" className="btn kecil utama" onClick={() => o.gantiTampilan('kinra')}><ZoomIn aria-hidden="true" /> Perbesar lingkup KINRA</button>
            </>
          )}
        </div>
      )}
      <Garis seri={o.bulanan.map((p, i) => ({ v: seri[i], label: p.ringkas, sebagian: p.meterTerbaca < o.data.meterTotal }))}
        aktif={o.pakaiRata ? -1 : o.iBulan} onPilih={o.keBulan} warnaGaris={s ? warna(s) : 'var(--brand)'}
        judul={`Tren ${s ? s.label : 'total'} per bulan`} />
    </aside>
  )
}

function Garis({ seri, aktif, onPilih, warnaGaris, judul }: { seri: { v: number; label: string; sebagian: boolean }[]; aktif: number; onPilih: (i: number) => void; warnaGaris: string; judul: string }) {
  const L = 280, T = 70, P = 4
  const maks = Math.max(1, ...seri.map((x) => x.v))
  const x = (i: number) => P + (i * (L - P * 2)) / Math.max(1, seri.length - 1)
  const y = (v: number) => T - P - (v / maks) * (T - P * 2 - 8)
  const d = seri.map((s, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(s.v).toFixed(1)}`).join(' ')
  const pilih = (e: React.MouseEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const i = Math.round((((e.clientX - r.left) / r.width) * L - P) / ((L - P * 2) / Math.max(1, seri.length - 1)))
    onPilih(Math.max(0, Math.min(seri.length - 1, i)))
  }
  return (
    <figure className="ae-garis">
      <figcaption className="muted small">{judul} · klik untuk pindah bulan</figcaption>
      <svg viewBox={`0 0 ${L} ${T}`} onClick={pilih} role="img" aria-label={`${judul}: ${seri.map((s) => `${s.label} ${energiListrik(s.v)}`).join(', ')}`}>
        <path d={`${d} L${x(seri.length - 1)},${T} L${x(0)},${T} Z`} className="area" style={{ fill: warnaGaris }} />
        <path d={d} className="garis" style={{ stroke: warnaGaris }} />
        {seri.map((s, i) => s.sebagian && <circle key={i} cx={x(i)} cy={T - 2} r={1.6} className="sebagian" />)}
        {aktif >= 0 && seri[aktif] && (
          <g className="penanda" style={{ transform: `translate(${x(aktif)}px, ${y(seri[aktif].v)}px)` }}>
            <circle r={7} className="halo" style={{ fill: warnaGaris }} />
            <circle r={3.4} style={{ fill: warnaGaris }} />
          </g>
        )}
      </svg>
    </figure>
  )
}
