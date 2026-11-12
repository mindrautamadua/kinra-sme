'use client'

import { type ReactNode, useState } from 'react'
import { angka, persen } from '@/lib/format'
import type { HasilTahap } from '@/lib/alur-wtp'

export type Lapisan = 'listrik' | 'fm' | 'nomor'

const SIFAT: Record<HasilTahap['sifat'], string> = { volume: 'Ikut volume', tetap: 'Tetap / berkala', siaga: 'Siaga', pasif: 'Tanpa beban' }

export function Pompa({ x, y, jenis }: { x: number; y: number; jenis: 'baku' | 'olah' | 'api' }) {
  return (
    <g className={`aw-pompa ${jenis}`} transform={`translate(${x},${y})`}>
      <circle r="9" /><path d="M0,-9 H12" />
    </g>
  )
}

export function Fm({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g className="aw-lap aw-l-fm aw-fm" transform={`translate(${x},${y})`}>
      <rect x="-1" y="-9" width="34" height="16" rx="8" /><text x="16" y="3" textAnchor="middle">{label}</text>
    </g>
  )
}

export function Kwh({ x, y, label, pasti, w = 74 }: { x: number; y: number; label: string; pasti?: boolean; w?: number }) {
  return (
    <g className={`aw-kwh ${pasti ? 'pasti' : 'ragu'}`} transform={`translate(${x},${y})`}>
      <rect width={w} height="20" rx="4" /><text x={w / 2} y="14" textAnchor="middle">{label}</text>
    </g>
  )
}

/**
 * Kerangka diagram alur proses (WTP, WWTP): tombol lapisan, SVG dengan nomor tahap yang bisa diklik,
 * legenda, tab tahap, dan panel rincian pompa per tahap. Isi gambar diberikan lewat `children`.
 */
export function KerangkaAlur({ tahap, posisiNomor, viewBox, label, awal, lapisan, legenda, children }: {
  tahap: HasilTahap[]
  posisiNomor: Record<number, [number, number]>
  viewBox: string
  label: string
  awal: number
  lapisan: readonly (readonly [Lapisan, string, string])[]
  legenda: ReactNode
  children: ReactNode
}) {
  const [pilih, setPilih] = useState(awal)
  const [mati, setMati] = useState<Record<Lapisan, boolean>>({ listrik: false, fm: false, nomor: false })
  const t = tahap.find((x) => x.no === pilih) ?? tahap[0]
  const ubah = (l: Lapisan) => setMati((m) => ({ ...m, [l]: !m[l] }))
  const kelas = ['aw-svg', ...(Object.keys(mati) as Lapisan[]).filter((l) => mati[l]).map((l) => `aw-sembunyi-${l}`)].join(' ')

  return (
    <div className="aw">
      <div className="card pad-0">
        <div className="aw-alat" role="group" aria-label="Lapisan diagram">
          <span className="eyebrow">Lapisan</span>
          {lapisan.map(([k, nama, warna]) => (
            <button key={k} type="button" className="aw-toggle" aria-pressed={!mati[k]} onClick={() => ubah(k)}>
              <i style={{ background: warna }} />{nama}
            </button>
          ))}
        </div>
        <div className="aw-gulir">
          <svg className={kelas} viewBox={viewBox} role="img" aria-label={label}>
            {children}
            <g className="aw-lap aw-l-nomor">
              {tahap.map((x) => {
                const [cx, cy] = posisiNomor[x.no]
                return (
                  <g key={x.no} className={`aw-nomor${x.no === pilih ? ' aktif' : ''}`} transform={`translate(${cx},${cy})`}
                    role="button" tabIndex={0} aria-label={`Tahap ${x.no}: ${x.nama}`}
                    onClick={() => setPilih(x.no)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPilih(x.no) } }}>
                    <circle r="12" /><text y="4" textAnchor="middle">{x.no}</text>
                  </g>
                )
              })}
            </g>
          </svg>
        </div>
        <div className="aw-legenda">{legenda}</div>
      </div>

      <div className="aw-tahap" role="tablist" aria-label="Tahap proses">
        {tahap.map((x) => (
          <button key={x.no} type="button" role="tab" aria-selected={x.no === pilih} className="aw-tab" onClick={() => setPilih(x.no)}>
            <span className="aw-tab-no">{x.no}</span>
            <span className="aw-tab-nama">{x.nama}</span>
            <span className="aw-tab-porsi tnum">{x.kwhEstimasi ? persen(x.porsi, 0) : '–'}</span>
          </button>
        ))}
      </div>

      <div className="card aw-detail" role="tabpanel" aria-label={`Tahap ${t.no}: ${t.nama}`}>
        <div className="aw-detail-head">
          <span className="eyebrow">Tahap {t.no}</span>
          <h3>{t.nama}</h3>
          <p className="muted">{t.ringkas}</p>
        </div>
        <dl className="aw-fakta">
          <div><dt>Sifat beban</dt><dd>{SIFAT[t.sifat]}<small>{t.beban}</small></dd></div>
          <div><dt>Meter kWh</dt><dd><span className={`chip ${t.meter.status === 'pasti' ? 'good' : t.meter.status === 'belum-jelas' ? 'warn' : 'na'}`}>{t.meter.label}</span></dd></div>
          <div><dt>Data air</dt><dd>{t.dataAir}</dd></div>
          <div><dt>Estimasi kWh/bulan</dt><dd className="tnum">{t.kwhEstimasi ? angka(t.kwhEstimasi, 0) : '–'}<small>{t.pompa.length ? `${t.pompa.length} pompa, ${angka(t.kwTerpasang, 1)} kW terpasang` : 'tidak ada pompa di register'}</small></dd></div>
        </dl>
        {t.pompa.length > 0 && (
          <div className="aw-gulir">
            <table className="tbl">
              <thead><tr><th>Kode</th><th>Pompa</th><th>Lokasi</th><th className="num">kW</th><th>Kapasitas</th><th className="num">Jam/bulan</th><th className="num">Estimasi kWh/bulan</th></tr></thead>
              <tbody>
                {t.pompa.map((p) => (
                  <tr key={p.kode}>
                    <td className="mono">{p.kode}</td><td>{p.nama}</td><td>{p.lokasi}</td>
                    <td className="num">{angka(p.daya_kw, 2)}</td><td>{p.kapasitas ?? '–'}</td>
                    <td className="num">{p.jamBulan ? angka(p.jamBulan, 0) : <span className="muted">siaga</span>}</td>
                    <td className="num">{p.kwhBulan ? angka(p.kwhBulan, 0) : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
