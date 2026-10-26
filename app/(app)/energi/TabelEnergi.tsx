'use client'

import { useState, useTransition } from 'react'
import { simpanEnergi } from '@/app/actions'
import { useBoleh } from '@/components/Peran'
import { angka, BULAN_PANJANG } from '@/lib/format'
import type { EnergiBulanan, SumberEnergi } from '@/lib/types'

export function TabelEnergi({ tahun, sumber, data }: { tahun: number; sumber: SumberEnergi[]; data: EnergiBulanan[] }) {
  const awal = Object.fromEntries(data.map((d) => [`${d.bulan}-${d.sumber_kode}`, d.nilai]))
  const [nilai, setNilai] = useState<Record<string, number>>(awal)
  const [status, setStatus] = useState<Record<string, 'simpan' | 'ok' | 'galat'>>({})
  const [, mulai] = useTransition()
  const bisaUbah = useBoleh()('energi.ubah')

  function simpan(bulan: number, kode: string, mentah: string) {
    const kunci = `${bulan}-${kode}`
    const bersih = mentah.trim().replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
    const v = bersih === '' ? null : Number(bersih)
    if (v !== null && (!Number.isFinite(v) || v < 0)) { setStatus((s) => ({ ...s, [kunci]: 'galat' })); return }
    if ((nilai[kunci] ?? null) === v) return
    setStatus((s) => ({ ...s, [kunci]: 'simpan' }))
    mulai(async () => {
      const h = await simpanEnergi(tahun, bulan, kode, v)
      setStatus((s) => ({ ...s, [kunci]: h.ok ? 'ok' : 'galat' }))
      if (h.ok) setNilai((n) => { const c = { ...n }; if (v === null) delete c[kunci]; else c[kunci] = v; return c })
    })
  }

  const total = (kode: string) => Object.entries(nilai).filter(([k]) => k.endsWith(`-${kode}`)).reduce((t, [, v]) => t + v, 0)
  const tjBulan = BULAN_PANJANG.map((_, i) => sumber.reduce((t, s) => t + (nilai[`${i + 1}-${s.kode}`] ?? 0) * Number(s.faktor_tj), 0))
  const maksTj = Math.max(0, ...tjBulan)

  return (
    <div className="card">
      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr><th>Bulan</th>{sumber.map((s) => <th key={s.kode} className="num">{s.nama}<br /><span style={{ textTransform: 'none' }}>{s.satuan}</span></th>)}<th>Total<br /><span style={{ textTransform: 'none' }}>TJ</span></th></tr>
          </thead>
          <tbody>
            {BULAN_PANJANG.map((b, i) => (
              <tr key={b}>
                <td>{b}</td>
                {sumber.map((s) => {
                  const k = `${i + 1}-${s.kode}`
                  const st = status[k]
                  return (
                    <td key={s.kode} className="num">
                      <label>
                        <span className="sr-only">{s.nama} {b} {tahun}</span>
                        <input className="sel" inputMode="decimal" readOnly={!bisaUbah} defaultValue={nilai[k] !== undefined ? angka(nilai[k], 3) : ''}
                          onBlur={(e) => simpan(i + 1, s.kode, e.target.value)}
                          style={st === 'galat' ? { borderColor: 'var(--crit)' } : st === 'ok' ? { borderColor: 'var(--good)' } : undefined}
                          aria-invalid={st === 'galat' || undefined} />
                      </label>
                    </td>
                  )
                })}
                <td className="en-tj">
                  <span className="tnum">{tjBulan[i] ? angka(tjBulan[i], 2) : '–'}</span>
                  <span className="en-tj-bar" aria-hidden="true"><i style={{ width: `${maksTj ? (tjBulan[i] / maksTj) * 100 : 0}%` }} /></span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr><td><b>Total</b></td>{sumber.map((s) => <td key={s.kode} className="num"><b>{angka(total(s.kode), 0)}</b></td>)}<td className="num"><b>{angka(tjBulan.reduce((a, b) => a + b, 0), 2)}</b></td></tr>
          </tfoot>
        </table>
      </div>
      {!bisaUbah && <p className="pesan" style={{ marginTop: 12 }}>Hanya admin dan Tim KINRA yang dapat mengubah data energi.</p>}
      <p className="sumber">Format angka Indonesia: titik pemisah ribuan, koma desimal (mis. 3.470.845,34). Hijau = tersimpan, merah = gagal/angka tidak valid.</p>
    </div>
  )
}
