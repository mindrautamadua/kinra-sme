'use client'

import { useState } from 'react'
import { angka } from '@/lib/format'
import type { JamOperasiPompa as Jam, Pompa } from '@/lib/types'

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const jamSebulan = (t: number, b: number) => new Date(t, b, 0).getDate() * 24

/**
 * Tabel jam operasi pompa per unit dan tahun (migrasi 0044).
 * kWh perkiraan = daya papan nama × jam operasi; lebih besar dari kWh meter karena motor jarang bekerja pada daya penuh.
 */
export function JamOperasiPompa({ pompa, jam, kwhMeter }: {
  pompa: Pompa[]; jam: Jam[]; kwhMeter: Record<string, { label: string; perBulan: Record<string, number> }>
}) {
  const unitList = [...new Set(pompa.map((p) => p.unit))]
  const tahunList = [...new Set(jam.map((j) => j.tahun))].sort((a, b) => b - a)
  const [unit, setUnit] = useState(unitList[0] ?? '')
  const [tahun, setTahun] = useState(tahunList[0] ?? new Date().getFullYear())

  if (!pompa.length) return <p className="pesan">Belum ada data pompa. Jalankan migrasi <code>supabase/migrations/0044_bbm_genset_ipal_pompa.sql</code>.</p>

  const peta = new Map(jam.map((j) => [`${j.pompa_kode}|${j.tahun}|${j.bulan}`, j]))
  const daftar = pompa.filter((p) => p.unit === unit)
  const kwhBulan = BULAN.map((_, i) => daftar.reduce((s, p) => s + (p.daya_kw ?? 0) * (peta.get(`${p.kode}|${tahun}|${i + 1}`)?.jam ?? 0), 0))
  const adaBulan = BULAN.map((_, i) => daftar.some((p) => peta.has(`${p.kode}|${tahun}|${i + 1}`)))
  const meter = kwhMeter[unit]
  const janggal = daftar.flatMap((p) => BULAN.map((_, i) => ({ p, b: i + 1, j: peta.get(`${p.kode}|${tahun}|${i + 1}`)?.jam ?? null })))
    .filter((x) => x.j !== null && x.j > jamSebulan(tahun, x.b))

  return (
    <>
      <div className="toolbar">
        <div className="seg" role="tablist" aria-label="Unit">
          {unitList.map((u) => <button key={u} type="button" role="tab" aria-selected={u === unit} onClick={() => setUnit(u)}>{u}</button>)}
        </div>
        <label className="small" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>Tahun
          <select value={tahun} onChange={(e) => setTahun(Number(e.target.value))}>{tahunList.map((t) => <option key={t} value={t}>{t}</option>)}</select>
        </label>
        <span className="muted small" style={{ flex: 1, textAlign: 'right' }}>{daftar.length} pompa/motor · S = standby</span>
      </div>
      {janggal.length > 0 && (
        <p className="pesan" role="note" style={{ marginBottom: 12 }}>
          {janggal.length} isian melebihi jumlah jam dalam bulannya: {janggal.map((x) => `${x.p.nama} (${x.p.lokasi ?? x.p.kode}) ${BULAN[x.b - 1]} ${angka(x.j!, 0)} jam`).join('; ')}. Periksa ulang di sumber data.
        </p>
      )}
      <div className="card">
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr><th>Pompa / motor</th><th className="num">kW</th>{BULAN.map((b) => <th key={b} className="num">{b}</th>)}<th className="num">Jam/tahun</th><th className="num">kWh perkiraan</th></tr>
            </thead>
            <tbody>
              {daftar.map((p) => {
                const sel = BULAN.map((_, i) => peta.get(`${p.kode}|${tahun}|${i + 1}`) ?? null)
                const total = sel.reduce((s, j) => s + (j?.jam ?? 0), 0)
                return (
                  <tr key={p.kode}>
                    <td>{p.nama}<span className="upd">{[p.lokasi, p.kapasitas].filter(Boolean).join(' · ') || p.kode}</span></td>
                    <td className="num">{p.daya_kw === null ? '–' : angka(p.daya_kw, p.daya_kw % 1 ? 2 : 0)}</td>
                    {sel.map((j, i) => {
                      const lebih = j?.jam != null && j.jam > jamSebulan(tahun, i + 1)
                      return (
                        <td key={i} className={`num small${lebih ? ' txt-bad' : ''}`} title={lebih ? `Melebihi ${jamSebulan(tahun, i + 1)} jam dalam ${BULAN[i]}` : j?.keterangan ?? undefined}>
                          {j?.jam != null ? angka(j.jam, 0) : j?.keterangan ? <span className="muted">S</span> : ''}
                        </td>
                      )
                    })}
                    <td className="num"><b>{total ? angka(total, 0) : '–'}</b></td>
                    <td className="num">{total && p.daya_kw ? angka(total * p.daya_kw, 0) : '–'}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr>
                <th colSpan={2}>kWh perkiraan (daya × jam)</th>
                {kwhBulan.map((v, i) => <td key={i} className="num small">{adaBulan[i] ? angka(v, 0) : ''}</td>)}
                <td />
                <td className="num"><b>{angka(kwhBulan.reduce((s, v) => s + v, 0), 0)}</b></td>
              </tr>
              {meter && (
                <tr>
                  <th colSpan={2}>{meter.label}</th>
                  {BULAN.map((_, i) => { const v = meter.perBulan[`${tahun}-${i + 1}`]; return <td key={i} className="num small">{v === undefined ? '' : angka(v, 0)}</td> })}
                  <td />
                  <td className="num"><b>{angka(BULAN.reduce((s, _, i) => s + (meter.perBulan[`${tahun}-${i + 1}`] ?? 0), 0), 0)}</b></td>
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      </div>
      <p className="sumber">kWh perkiraan memakai daya papan nama, sehingga umumnya lebih besar dari kWh meter (motor jarang bekerja pada beban penuh). Selisih yang berubah tajam antarbulan layak ditelusuri. Sumber: sheet Variabel yang Relevan, Pelacak Konsumsi Energi.</p>
    </>
  )
}
