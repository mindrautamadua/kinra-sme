'use client'

import { useState } from 'react'
import { angka, persen } from '@/lib/format'
import type { AlurListrik, GarduListrik } from '@/lib/alur-listrik'
import { Kwh } from '../alur-wtp/KerangkaAlur'

const POSISI_NOMOR: Record<number, [number, number]> = { 1: [1048, 24], 2: [834, 512], 3: [466, 472], 4: [126, 472], 5: [74, 540] }

/** Bangunan gardu: dinding ganda dengan pintu ayun, seperti gambar sumber. */
function Bangunan({ x, y, w, h, pintu }: { x: number; y: number; w: number; h: number; pintu: 'kiri' | 'kanan' }) {
  const px = pintu === 'kiri' ? x + 6 : x + w - 6
  const arah = pintu === 'kiri' ? 1 : -1
  return (
    <g className="al-gardu">
      <rect className="al-dinding" x={x} y={y} width={w} height={h} />
      <rect className="al-dinding dalam" x={x + 6} y={y + 6} width={w - 12} height={h - 12} />
      <path className="al-pintu" d={`M${px},${y + 34} L${px + arah * 26},${y + 78} A30,30 0 0 ${pintu === 'kiri' ? 1 : 0} ${px},${y + 90}`} />
    </g>
  )
}

/** Panel 4 × 2 sel dengan tulisan PANEL, seperti gambar sumber. */
function Panel({ x, y }: { x: number; y: number }) {
  return (
    <g className="al-panel" transform={`translate(${x},${y})`}>
      <rect x="10" y="-8" width="12" height="8" />
      {[0, 1, 2, 3].flatMap((c) => [0, 1].map((r) => <rect key={`${c}-${r}`} x={c * 32} y={r * 26} width="32" height="26" />))}
      <text x="16" y="44" textAnchor="middle">PANEL</text>
      <path className="al-rel" d="M0,62 H128" />
    </g>
  )
}

const KUBIKEL = [['IM', 30], ['IM', 30], ['CM', 30], ['DM1-W', 46]] as const

function Kubikel({ x, y }: { x: number; y: number }) {
  let cx = 0
  return (
    <g className="al-panel" transform={`translate(${x},${y})`}>
      <path className="al-rel" d="M0,-10 H136" />
      {KUBIKEL.map(([nama, w], i) => {
        const kiri = cx
        cx += w
        return (
          <g key={i}>
            <rect x={kiri} y="0" width={w} height="24" /><rect x={kiri} y="24" width={w} height="30" />
            <text x={kiri + w / 2} y="16" textAnchor="middle" className={nama === 'DM1-W' ? 'tebal' : undefined}>{nama}</text>
          </g>
        )
      })}
      <rect x="112" y="54" width="12" height="8" />
    </g>
  )
}

export function DiagramListrik({ gardu, data }: { gardu: GarduListrik[]; data: AlurListrik }) {
  const [pilih, setPilih] = useState(4)
  const g = gardu.find((x) => x.no === pilih) ?? gardu[0]
  const tenant = data.kwhKawasan !== null && data.kwhKinra !== null ? Math.max(0, data.kwhKawasan - data.kwhKinra) : null

  return (
    <div className="aw">
      <div className="card pad-0">
        <div className="aw-gulir">
          <svg className="aw-svg" viewBox="0 0 1300 630" role="img"
            aria-label="Diagram pasokan listrik: dua penyulang (merah dan hitam) dari Gardu Induk PLN ke Gardu Hubung Utama, lalu ke Gardu Distribusi. Hanya penyulang merah diteruskan ke Gardu Transaksi yang berisi kubikel IM, IM, CM, DM1-W dan kWh meter, lalu ke beban hilir.">
            {/* Gardu Induk PLN */}
            <Bangunan x={1035} y={40} w={225} h={165} pintu="kiri" />
            <Panel x={1095} y={105} />
            <text className="aw-lbl" x="1062" y="29">Gardu Induk PLN</text>

            {/* Gardu Hubung Utama */}
            <Bangunan x={820} y={340} w={225} h={160} pintu="kiri" />
            <Panel x={865} y={418} />
            <text className="aw-lbl" x="848" y="517">Gardu Hubung Utama</text>

            {/* Gardu Distribusi */}
            <Bangunan x={450} y={290} w={225} h={165} pintu="kiri" />
            <Panel x={495} y={378} />
            <text className="aw-lbl" x="480" y="477">Gardu Distribusi</text>

            {/* Gardu Transaksi */}
            <Bangunan x={110} y={290} w={225} h={165} pintu="kanan" />
            <Kubikel x={130} y={350} />
            <text className="aw-lbl" x="140" y="477">Gardu Transaksi</text>
            <g className="aw-l-listrik">
              <Kwh x={130} y={418} label="kWh meter transaksi" w={136} />
            </g>

            {/* Penyulang: merah sampai Gardu Transaksi, hitam berhenti di Gardu Distribusi */}
            <path className="aw-pipa api tipis" d="M1111,159 V300 H974 V418" />
            <path className="aw-pipa al-hitam tipis" d="M1175,159 V312 H986 V418" />
            <path className="aw-pipa al-hitam tipis" d="M876,418 V324 H712 V414 H623" />
            <path className="aw-pipa api tipis" d="M888,418 V316 H700 V403 H623" />
            <path className="aw-pipa api tipis" d="M591,378 V250 H185 V350" />
            <path className="aw-putus" d="M248,412 V414 H290 V522" />
            <text className="aw-kcl" x="1102" y="250" textAnchor="end">penyulang merah</text>
            <text className="aw-kcl" x="1184" y="270">penyulang hitam</text>
            <text className="aw-kcl" x="388" y="242" textAnchor="middle">penyulang merah ke Gardu Transaksi</text>
            <text className="aw-kcl" x="298" y="490">keluaran DM1-W</text>

            {/* Beban hilir: tidak ada di gambar sumber */}
            <rect className="al-hilir" x="60" y="522" width="420" height="96" rx="10" />
            <text className="aw-lbl kecil" x="88" y="545">Beban hilir</text>
            <text className="aw-sub" x="180" y="545">tidak ada di gambar sumber</text>
            <Kwh x={80} y={558} label="MTR-001 s.d. 009 · aset KINRA" pasti w={190} />
            <text className="aw-kcl" x="80" y="602">{angka((data.kwhKinra ?? 0) / 1000, 1)} MWh/bulan</text>
            <rect className="al-tenant" x="290" y="558" width="170" height="20" rx="4" />
            <text className="aw-kcl" x="375" y="572" textAnchor="middle">tenant (di luar lingkup)</text>
            <text className="aw-kcl" x="290" y="602">{tenant !== null ? `${angka(tenant / 1000, 1)} MWh/bulan (selisih)` : '–'}</text>

            <g className="aw-lap aw-l-nomor">
              {gardu.map((x) => {
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
          <span><i className="aw-garis api" />Penyulang merah (sampai Gardu Transaksi)</span>
          <span><i className="aw-garis al-hitam" />Penyulang hitam (berhenti di Gardu Distribusi)</span>
          <span><b>Kotak kuning</b> meter kWh; garis putus = sudah terpasang tetapi sumber datanya belum dikonfirmasi</span>
          <span>Beban hilir ditambahkan dari data aplikasi, bukan dari gambar</span>
        </div>
      </div>

      <div className="aw-tahap" role="tablist" aria-label="Tahap pasokan listrik">
        {gardu.map((x) => (
          <button key={x.no} type="button" role="tab" aria-selected={x.no === pilih} className="aw-tab" onClick={() => setPilih(x.no)}>
            <span className="aw-tab-no">{x.no}</span>
            <span className="aw-tab-nama">{x.nama}</span>
            <span />
          </button>
        ))}
      </div>

      <div className="card aw-detail" role="tabpanel" aria-label={`Tahap ${g.no}: ${g.nama}`}>
        <div className="aw-detail-head">
          <span className="eyebrow">Tahap {g.no}</span>
          <h3>{g.nama}</h3>
          <p className="muted">{g.ringkas}</p>
        </div>
        <dl className="aw-fakta">
          <div><dt>Panel / kubikel</dt><dd>{g.panel}</dd></div>
          <div><dt>Penyulang</dt><dd>{g.penyulang}</dd></div>
          <div><dt>Titik ukur</dt><dd><span className={`chip ${g.ukur.status === 'pasti' ? 'good' : g.ukur.status === 'belum-jelas' ? 'warn' : 'na'}`}>{g.ukur.label}</span></dd></div>
          <div><dt>Data di aplikasi</dt><dd>{g.dataAplikasi}
            {g.id === 'gt' && data.kwhKawasan !== null && <small>rata-rata {angka(data.kwhKawasan, 0)} kWh/bulan</small>}</dd></div>
        </dl>
        {g.id === 'beban' && (
          <div className="aw-gulir">
            <table className="tbl">
              <thead><tr><th>Meter</th><th>Area</th><th className="num">kWh/bulan</th><th className="num">Porsi KINRA</th><th className="num">Porsi kawasan</th></tr></thead>
              <tbody>
                {data.meter.map((m) => (
                  <tr key={m.kode}>
                    <td className="mono">{m.kode}</td><td>{m.nama}</td>
                    <td className="num">{angka(m.kwh, 0)}</td>
                    <td className="num">{data.kwhKinra && m.kwh !== null ? persen((m.kwh / data.kwhKinra) * 100, 1) : '–'}</td>
                    <td className="num">{data.kwhKawasan && m.kwh !== null ? persen((m.kwh / data.kwhKawasan) * 100, 1) : '–'}</td>
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
