'use client'

import { useState, useTransition } from 'react'
import { simpanVariabelBulanan } from '@/app/actions'
import { useBoleh } from '@/components/Peran'
import { angka, BULAN_PANJANG } from '@/lib/format'
import type { VariabelBulanan, VariabelRelevan } from '@/lib/types'

export function TabelVariabel({ tahun, variabel, data }: { tahun: number; variabel: VariabelRelevan[]; data: VariabelBulanan[] }) {
  const awal = Object.fromEntries(data.map((d) => [`${d.bulan}-${d.variabel_kode}`, d.nilai]))
  const [nilai, setNilai] = useState<Record<string, number>>(awal)
  const [status, setStatus] = useState<Record<string, 'simpan' | 'ok' | 'galat'>>({})
  const [, mulai] = useTransition()
  const bisaUbah = useBoleh()('energi.ubah')

  function simpan(bulan: number, kode: string, mentah: string) {
    const kunci = `${bulan}-${kode}`
    const bersih = mentah.trim().replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
    const v = bersih === '' ? null : Number(bersih)
    if (v !== null && !Number.isFinite(v)) { setStatus((s) => ({ ...s, [kunci]: 'galat' })); return }
    if ((nilai[kunci] ?? null) === v) return
    setStatus((s) => ({ ...s, [kunci]: 'simpan' }))
    mulai(async () => {
      const h = await simpanVariabelBulanan(tahun, bulan, kode, v)
      setStatus((s) => ({ ...s, [kunci]: h.ok ? 'ok' : 'galat' }))
      if (h.ok) setNilai((n) => { const c = { ...n }; if (v === null) delete c[kunci]; else c[kunci] = v; return c })
    })
  }

  if (!variabel.length) return <div className="card"><p className="muted">Belum ada variabel relevan. Tambahkan di daftar variabel di bawah.</p></div>

  return (
    <div className="card">
      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr><th>Bulan</th>{variabel.map((v) => <th key={v.kode} className="num">{v.nama}<br /><span style={{ textTransform: 'none' }}>{v.satuan}</span></th>)}</tr>
          </thead>
          <tbody>
            {BULAN_PANJANG.map((b, i) => (
              <tr key={b}>
                <td>{b}</td>
                {variabel.map((v) => {
                  const k = `${i + 1}-${v.kode}`
                  const st = status[k]
                  return (
                    <td key={v.kode} className="num">
                      <label>
                        <span className="sr-only">{v.nama} {b} {tahun}</span>
                        <input className="sel" inputMode="decimal" readOnly={!bisaUbah} defaultValue={nilai[k] !== undefined ? angka(nilai[k], 3) : ''}
                          onBlur={(e) => simpan(i + 1, v.kode, e.target.value)}
                          style={st === 'galat' ? { borderColor: 'var(--crit)' } : st === 'ok' ? { borderColor: 'var(--good)' } : undefined}
                          aria-invalid={st === 'galat' || undefined} />
                      </label>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!bisaUbah && <p className="pesan" style={{ marginTop: 12 }}>Hanya admin dan Tim KINRA yang dapat mengisi data variabel.</p>}
      <p className="sumber">Isi dari catatan operasional yang dapat ditelusuri (log WTP, daftar tenant, dsb.). Format angka Indonesia: titik ribuan, koma desimal. Hijau = tersimpan, merah = gagal.</p>
    </div>
  )
}
