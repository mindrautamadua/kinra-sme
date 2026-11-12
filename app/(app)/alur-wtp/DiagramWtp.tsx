'use client'

import { useState } from 'react'
import { angka, persen } from '@/lib/format'
import type { HasilTahap } from '@/lib/alur-wtp'

type Lapisan = 'listrik' | 'fm' | 'nomor'

const POSISI_NOMOR: Record<number, [number, number]> = {
  1: [104, 368], 2: [654, 404], 3: [745, 402], 4: [890, 340], 5: [738, 612], 6: [650, 214], 7: [570, 62], 8: [420, 230], 9: [1012, 180],
}

const SIFAT: Record<HasilTahap['sifat'], string> = { volume: 'Ikut volume', tetap: 'Tetap / berkala', siaga: 'Siaga', pasif: 'Tanpa beban' }

function Pompa({ x, y, jenis }: { x: number; y: number; jenis: 'baku' | 'olah' | 'api' }) {
  return (
    <g className={`aw-pompa ${jenis}`} transform={`translate(${x},${y})`}>
      <circle r="9" /><path d="M0,-9 H12" />
    </g>
  )
}

function Fm({ x, y, label }: { x: number; y: number; label: string }) {
  return (
    <g className="aw-lap aw-l-fm aw-fm" transform={`translate(${x},${y})`}>
      <rect x="-1" y="-9" width="34" height="16" rx="8" /><text x="16" y="3" textAnchor="middle">{label}</text>
    </g>
  )
}

function Kwh({ x, y, label, pasti, w = 74 }: { x: number; y: number; label: string; pasti?: boolean; w?: number }) {
  return (
    <g className={`aw-kwh ${pasti ? 'pasti' : 'ragu'}`} transform={`translate(${x},${y})`}>
      <rect width={w} height="20" rx="4" /><text x={w / 2} y="14" textAnchor="middle">{label}</text>
    </g>
  )
}

export function DiagramWtp({ tahap }: { tahap: HasilTahap[] }) {
  const [pilih, setPilih] = useState(7)
  const [mati, setMati] = useState<Record<Lapisan, boolean>>({ listrik: false, fm: false, nomor: false })
  const t = tahap.find((x) => x.no === pilih) ?? tahap[0]
  const ubah = (l: Lapisan) => setMati((m) => ({ ...m, [l]: !m[l] }))
  const kelas = ['aw-svg', ...(Object.keys(mati) as Lapisan[]).filter((l) => mati[l]).map((l) => `aw-sembunyi-${l}`)].join(' ')

  return (
    <div className="aw">
      <div className="card pad-0">
        <div className="aw-alat" role="group" aria-label="Lapisan diagram">
          <span className="eyebrow">Lapisan</span>
          {([['listrik', 'Meter listrik', 'var(--warn)'], ['fm', 'Water meter', 'var(--brand)'], ['nomor', 'Nomor tahap', 'var(--ink)']] as const).map(([k, label, warna]) => (
            <button key={k} type="button" className="aw-toggle" aria-pressed={!mati[k]} onClick={() => ubah(k)}>
              <i style={{ background: warna }} />{label}
            </button>
          ))}
        </div>
        <div className="aw-gulir">
          <svg className={kelas} viewBox="0 0 1300 640" role="img" aria-label="Diagram alir WTP: sungai, intake, settling pit, lamella, clarifier, filter, reservoir dan distribusi ke kawasan, sistem hydrant, serta jalur water basin ke dua PKS.">
            <defs>
              {(['baku', 'olah', 'api'] as const).map((j) => (
                <marker key={j} id={`aw-panah-${j}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <path d="M0,0 L10,5 L0,10 z" className={`aw-isi-${j}`} />
                </marker>
              ))}
            </defs>

            {/* Sungai dan intake */}
            <path className="aw-sungai" d="M70,40 C40,90 100,130 70,180 C40,230 100,270 72,320 C44,370 100,410 70,460 C40,510 90,560 60,620" />
            <text className="aw-lbl kecil" x="18" y="632">Sungai Bah Tongguran</text>
            <Pompa x={104} y={395} jenis="baku" /><Pompa x={104} y={420} jenis="baku" />
            <path className="aw-pipa baku" d="M126,407 H136 V585 H430 V564" markerEnd="url(#aw-panah-baku)" />
            <Fm x={262} y={585} label="FM1b" />
            <text className="aw-kcl" x="146" y="600">langsung dari sungai</text>
            <rect className="aw-kotak baku" x="152" y="425" width="150" height="95" rx="6" />
            <text className="aw-lbl" x="227" y="468" textAnchor="middle">Water Intake</text>
            <text className="aw-sub" x="227" y="486" textAnchor="middle">kolam air baku</text>
            <Pompa x={325} y={455} jenis="baku" /><Pompa x={325} y={485} jenis="baku" />
            <path className="aw-pipa baku" d="M302,470 H312 M346,470 H356 V420 H412" markerEnd="url(#aw-panah-baku)" />
            <Fm x={360} y={408} label="FM1a" />

            {/* Settling pit */}
            <rect className="aw-kotak baku" x="414" y="395" width="250" height="165" rx="6" />
            <path className="aw-sekat" d="M464,395 V560 M514,395 V560 M564,395 V560 M614,395 V560" />
            <rect className="aw-latar-teks" x="452" y="455" width="176" height="42" rx="4" />
            <text className="aw-lbl" x="540" y="474" textAnchor="middle">Water Settling Pit</text>
            <text className="aw-sub" x="540" y="490" textAnchor="middle">1.650 m³ · 5 kompartemen</text>
            <g className="aw-isi-lumpur"><circle cx="440" cy="388" r="3" /><circle cx="490" cy="388" r="3" /><circle cx="590" cy="388" r="3" /><circle cx="640" cy="388" r="3" /></g>
            <text className="aw-kcl" x="520" y="381" textAnchor="middle">titik injeksi kimia</text>
            <Pompa x={520} y={590} jenis="baku" /><Pompa x={552} y={590} jenis="baku" />
            <path className="aw-pipa baku tipis" d="M530,560 V578 M562,560 V578" />
            <text className="aw-kcl" x="584" y="594">2 pompa pengisian mobil damkar</text>

            {/* Hydrant */}
            <rect className="aw-putus" x="410" y="220" width="150" height="110" rx="6" />
            <Pompa x={440} y={285} jenis="api" /><Pompa x={475} y={285} jenis="api" /><Pompa x={510} y={285} jenis="api" />
            <path className="aw-pipa api tipis" d="M440,295 V395 M475,295 V395 M510,295 V395" />
            <text className="aw-lbl api" x="485" y="244" textAnchor="middle">Fire Hydrant System</text>
            <text className="aw-sub" x="485" y="260" textAnchor="middle">3 pompa</text>
            <path className="aw-pipa api" d="M410,310 H300 V352" markerEnd="url(#aw-panah-api)" />
            <rect className="aw-kotak api" x="226" y="354" width="150" height="30" rx="4" />
            <text className="aw-lbl kecil" x="301" y="374" textAnchor="middle">Industrial Estate (hydrant)</text>

            {/* Lamella dan clarifier */}
            <Pompa x={695} y={430} jenis="baku" /><Pompa x={695} y={460} jenis="baku" />
            <path className="aw-pipa baku" d="M664,445 H684 M716,445 H734" markerEnd="url(#aw-panah-baku)" />
            <rect className="aw-lamella" x="736" y="415" width="190" height="62" rx="4" />
            <path className="aw-pipa olah tipis" d="M768,415 V477 M800,415 V477 M832,415 V477 M864,415 V477 M896,415 V477" />
            <text className="aw-lbl" x="831" y="500" textAnchor="middle">Lamella (Water Settler Tube)</text>
            <text className="aw-sub" x="831" y="514" textAnchor="middle">6 modul · dosing tawas &amp; soda ash</text>
            <circle className="aw-lingkar" cx="960" cy="420" r="22" />
            <rect className="aw-dosing" x="946" y="413" width="28" height="12" rx="2" />
            <text className="aw-kcl" x="988" y="424">dosing kimia</text>
            <path className="aw-kotak tangki" d="M790,330 H872 V362 L842,382 H820 L790,362 Z" />
            <path className="aw-isi-lumpur" d="M820,382 L842,382 L831,394 Z" />
            <text className="aw-lbl kecil" x="831" y="350" textAnchor="middle">Clarifier</text>
            <text className="aw-sub" x="831" y="322" textAnchor="middle">150 m³</text>
            <path className="aw-lumpur" d="M831,394 V414" />
            <path className="aw-lumpur" d="M736,470 H668" />
            <text className="aw-kcl" x="670" y="488">pipa backwash</text>
            <text className="aw-kcl" x="670" y="500">kembali ke pit</text>

            {/* Filter */}
            <g className="aw-isi-olah">
              {[752, 776, 800, 862, 886, 910].flatMap((x) => [560, 584].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="11" />))}
            </g>
            <path className="aw-pipa olah tipis" d="M776,477 V546 M886,477 V546" />
            <text className="aw-lbl" x="831" y="622" textAnchor="middle">Filter tekan 12 unit</text>
            <text className="aw-sub" x="831" y="636" textAnchor="middle">2 bank × 6</text>
            <path className="aw-pipa olah" d="M922,584 H990 V300" />
            <Fm x={940} y={584} label="FM2" />

            {/* Reservoir dan distribusi */}
            <rect className="aw-kotak olah" x="640" y="205" width="150" height="100" rx="6" />
            <text className="aw-lbl" x="715" y="250" textAnchor="middle">Reservoir</text>
            <text className="aw-sub" x="715" y="266" textAnchor="middle">500 m³</text>
            <path className="aw-pipa olah" d="M990,300 H792" markerEnd="url(#aw-panah-olah)" />
            <rect className="aw-putus" x="560" y="50" width="240" height="110" rx="6" />
            <text className="aw-lbl" x="680" y="72" textAnchor="middle">Distribution System</text>
            <Pompa x={640} y={120} jenis="olah" /><Pompa x={680} y={120} jenis="olah" /><Pompa x={720} y={120} jenis="olah" />
            <text className="aw-sub" x="680" y="150" textAnchor="middle">pompa distribusi · VSD</text>
            <rect className="aw-dosing" x="752" y="88" width="16" height="30" rx="7" />
            <text className="aw-kcl" x="772" y="98">tangki</text><text className="aw-kcl" x="772" y="110">tekan</text>
            <path className="aw-pipa olah tipis" d="M680,205 V132 M640,132 V170 H720 V132" />
            <path className="aw-pipa olah" d="M600,100 H420 V140" markerEnd="url(#aw-panah-olah)" />
            <Fm x={500} y={100} label="FM3" />
            <rect className="aw-kotak olah" x="350" y="142" width="140" height="44" rx="4" />
            <text className="aw-lbl kecil" x="420" y="160" textAnchor="middle">Tenant / kawasan</text>
            <text className="aw-sub" x="420" y="176" textAnchor="middle">distribusi kawasan</text>

            {/* Jalur PKS */}
            <Pompa x={815} y={232} jenis="olah" /><Pompa x={815} y={262} jenis="olah" />
            <path className="aw-pipa olah tipis" d="M792,247 H805 M836,247 H880 V200 H1000" markerEnd="url(#aw-panah-olah)" />
            <rect className="aw-kotak olah" x="1002" y="170" width="110" height="140" rx="6" />
            <text className="aw-lbl" x="1057" y="236" textAnchor="middle">Water Basin</text>
            <text className="aw-sub" x="1057" y="252" textAnchor="middle">300 m³</text>
            <Pompa x={1040} y={148} jenis="olah" /><Pompa x={1072} y={148} jenis="olah" />
            <path className="aw-pipa olah tipis" d="M1050,170 V160 M1082,170 V160 M1094,139 H1140 V200" />
            <ellipse className="aw-kotak olah" cx="1150" cy="215" rx="22" ry="18" />
            <ellipse className="aw-kotak olah" cx="1150" cy="262" rx="22" ry="18" />
            <text className="aw-kcl" x="1180" y="219">Sand filter 1</text><text className="aw-kcl" x="1180" y="266">Sand filter 2</text>
            <text className="aw-sub" x="1180" y="282">≈68 m³ / unit</text>
            <path className="aw-pipa olah tipis" d="M1150,197 V120 H1185" />
            <rect className="aw-kotak tangki" x="1188" y="30" width="56" height="40" rx="6" />
            <rect className="aw-kotak tangki" x="1188" y="96" width="56" height="40" rx="6" />
            <text className="aw-kcl" x="1150" y="22">Clean Water Tank Tower</text>
            <text className="aw-kcl" x="1150" y="152">Processing Water Tank Tower</text>
            <path className="aw-pipa olah tipis" d="M1244,50 H1262 V330" markerEnd="url(#aw-panah-olah)" />
            <Fm x={1246} y={300} label="FM4" />
            <rect className="aw-kotak pks" x="1150" y="334" width="140" height="34" rx="4" />
            <text className="aw-lbl kecil" x="1220" y="356" textAnchor="middle">PKS 30 ton TBS/jam</text>
            <path className="aw-pipa olah tipis" d="M1112,290 H1130 V430" />
            <rect className="aw-kotak tangki" x="1100" y="432" width="50" height="40" rx="6" />
            <rect className="aw-kotak tangki" x="1170" y="432" width="50" height="40" rx="6" />
            <text className="aw-kcl" x="1100" y="425">2 tangki air bersih</text>
            <path className="aw-pipa olah tipis" d="M1125,472 V540 M1195,472 V540" markerEnd="url(#aw-panah-olah)" />
            <Fm x={1088} y={510} label="FM5" /><Fm x={1144} y={526} label="FM6" /><Fm x={1200} y={510} label="FM7" />
            <rect className="aw-kotak pks" x="1090" y="544" width="140" height="34" rx="4" />
            <text className="aw-lbl kecil" x="1160" y="566" textAnchor="middle">PKS 45 ton TBS/jam</text>

            {/* Meter listrik */}
            <g className="aw-lap aw-l-listrik">
              <Kwh x={170} y={398} label="MTR-008" pasti w={74} />
              <Kwh x={660} y={170} label="MTR-005" pasti />
              <Kwh x={936} y={452} label="MTR-005" pasti w={64} />
              <Kwh x={456} y={196} label="kWh ?" w={58} />
              <Kwh x={1028} y={112} label="kWh ?" w={58} />
            </g>

            {/* Nomor tahap */}
            <g className="aw-lap aw-l-nomor">
              {tahap.map((x) => {
                const [cx, cy] = POSISI_NOMOR[x.no]
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
        <div className="aw-legenda">
          <span><i className="aw-garis baku" />Air baku</span>
          <span><i className="aw-garis olah" />Air olahan</span>
          <span><i className="aw-garis api" />Hydrant</span>
          <span><i className="aw-garis lumpur" />Lumpur / kimia</span>
          <span><b>Kotak kuning penuh</b> meter kWh pasti; <b>bergaris putus</b> belum jelas meternya</span>
          <span>Angka ≈ terbaca samar dari gambar</span>
        </div>
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
