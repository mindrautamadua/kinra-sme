'use client'

import { useState } from 'react'
import { KET_TAHAP, LABEL_TAHAP, SKEMA, type TahapMeter, type TitikUkur } from '@/lib/submeter'

const SEMUA_TAHAP: TahapMeter[] = [0, 1, 2, 3]

/** Diagram skema rencana submeter SEU dengan aliran air, lumpur, dan listrik beranimasi. */
export function DiagramSubmeter({ awal }: { awal?: string }) {
  const [kode, setKode] = useState(awal ?? SKEMA[0].kode)
  const [tahap, setTahap] = useState<TahapMeter | null>(null)
  const skema = SKEMA.find((s) => s.kode === kode)!
  const [pilih, setPilih] = useState<string>(skema.titik.find((t) => t.tahap === 1)?.id ?? skema.titik[0].id)
  const t = skema.titik.find((x) => x.id === pilih) ?? skema.titik[0]
  const redup = (x: TitikUkur) => tahap !== null && x.tahap !== tahap

  function ganti(k: string) {
    const s = SKEMA.find((x) => x.kode === k)!
    setKode(k)
    setPilih(s.titik.find((x) => x.tahap === 1)?.id ?? s.titik[0].id)
  }

  return (
    <div className="card sm-kartu">
      <div className="toolbar">
        <div className="seg" role="tablist" aria-label="Pilih SEU">
          {SKEMA.map((s) => (
            <button key={s.kode} type="button" role="tab" aria-selected={s.kode === kode} onClick={() => ganti(s.kode)}>{s.seu} · {s.kode.toUpperCase()}</button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Saring tahap">
          <button type="button" aria-pressed={tahap === null} onClick={() => setTahap(null)}>Semua</button>
          {SEMUA_TAHAP.map((x) => (
            <button key={x} type="button" aria-pressed={tahap === x} onClick={() => setTahap(x)}>
              <i className={`sm-dot t${x}`} aria-hidden="true" />{LABEL_TAHAP[x]}<span className="n">{skema.titik.filter((y) => y.tahap === x).length}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="sm-wrap">
        <div className="sm-kanvas">
          <svg viewBox="0 0 1000 440" role="img" aria-label={`Skema rencana submeter ${skema.nama}`} className="sm-svg">
            <defs>
              <marker id="sm-panah" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M0,0 L10,5 L0,10 z" className="sm-panah" />
              </marker>
            </defs>

            {skema.jalur.map((j, i) => (
              <g key={i}>
                <path d={j.d} className={`sm-jalur dasar ${j.jenis}`} />
                <path d={j.d} className={`sm-jalur arus ${j.jenis}`} markerEnd={j.jenis === 'listrik' ? undefined : 'url(#sm-panah)'} />
              </g>
            ))}

            {skema.unit.map((u) => (
              <g key={u.id} className={`sm-unit ${u.jenis}`}>
                <rect x={u.x} y={u.y} width={u.w} height={u.h} rx={10} />
                <text x={u.x + u.w / 2} y={u.y + u.h / 2 - (u.label.length - 1) * 7} textAnchor="middle" dominantBaseline="middle">
                  {u.label.map((l, i) => <tspan key={i} x={u.x + u.w / 2} dy={i ? 14 : 0}>{l}</tspan>)}
                </text>
              </g>
            ))}
            {skema.label?.map((l) => <text key={l.teks} x={l.x} y={l.y} className="sm-ket">{l.teks}</text>)}
            <text x={20} y={238} className="sm-ket">aliran air →</text>
            <text x={200} y={30} className="sm-ket">bus listrik panel MCC</text>

            {skema.titik.map((x) => (
              <g key={x.id} className={`sm-titik t${x.tahap}${x.id === pilih ? ' pilih' : ''}${redup(x) ? ' redup' : ''}`}
                transform={`translate(${x.x},${x.y})`} role="button" tabIndex={0} aria-pressed={x.id === pilih}
                aria-label={`${x.label}, ${LABEL_TAHAP[x.tahap]}`}
                onClick={() => setPilih(x.id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPilih(x.id) } }}>
                <circle r={20} className="sm-denyut" />
                <circle r={14} className="sm-badan" />
                <text textAnchor="middle" dominantBaseline="central">{x.jenis}</text>
              </g>
            ))}
          </svg>
          <div className="sm-legenda" aria-hidden="true">
            <span><i className="sm-garis air" />Air</span>
            {skema.jalur.some((j) => j.jenis === 'lumpur') && <span><i className="sm-garis lumpur" />Lumpur</span>}
            {skema.jalur.some((j) => j.jenis === 'buang') && <span><i className="sm-garis buang" />Air buangan</span>}
            <span><i className="sm-garis listrik" />Listrik</span>
            {SEMUA_TAHAP.map((x) => <span key={x}><i className={`sm-dot t${x}`} />{LABEL_TAHAP[x]}</span>)}
          </div>
        </div>

        <aside className="sm-panel" aria-live="polite">
          <span className="eyebrow">{skema.seu} · {LABEL_TAHAP[t.tahap]}</span>
          <h3>{t.label}</h3>
          <p className="muted small">{KET_TAHAP[t.tahap]}</p>
          <dl>
            <div><dt>Mengukur</dt><dd>{t.jenis === 'DO' ? 'Oksigen terlarut (mg/L)' : t.jenis === 'COD' ? 'Beban organik (kg COD)' : t.jenis === 'bar' ? 'Tekanan (bar)' : t.jenis === 'm³' ? 'Volume air (m³)' : 'Energi listrik (kWh, kW, faktor daya)'}</dd></div>
            {t.kode && <div><dt>Kode meter</dt><dd className="mono">{t.kode}</dd></div>}
            <div><dt>Kegunaan</dt><dd>{t.kegunaan}</dd></div>
          </dl>
          <div className="sm-indikator">
            <span className="eyebrow">Indikator yang dimungkinkan</span>
            <ul>{skema.indikator.map((i) => <li key={i}>{i}</li>)}</ul>
          </div>
        </aside>
      </div>
      <p className="sumber">Rancangan umum untuk {skema.nama.split(' · ')[1].toLowerCase()}. Cocokkan dengan single line diagram dan panel MCC di lapangan sebelum pengadaan. Spesifikasi submeter: power meter multifungsi kelas 0,5S atau 1 dengan CT, sebaiknya dengan port Modbus.</p>
    </div>
  )
}
