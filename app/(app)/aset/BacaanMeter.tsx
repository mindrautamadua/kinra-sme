'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { simpanBacaan } from '@/app/actions'
import { useBoleh } from '@/components/Peran'
import { angka, BULAN_PANJANG, delta, waktu } from '@/lib/format'
import { konsumsiBacaan } from '@/lib/enpi'
import type { MeterEnergi, PembacaanMeter } from '@/lib/types'

/** Angka format Indonesia (3.698,09) atau titik desimal (3698.09). Kosong = null, tidak valid = NaN. */
function bacaAngka(mentah: string): number | null {
  const t = mentah.trim().replace(/\s/g, '')
  if (!t) return null
  const bersih = t.includes(',') ? t.replace(/\./g, '').replace(',', '.') : t
  return Number(bersih)
}

const tampil = (v: number | null | undefined) => (v === null || v === undefined ? '' : angka(v, 2))

type Baris = { awal: string; akhir: string }

export function BacaanMeter({ meter, bacaan, tahun, bulan, plnBulan }: {
  meter: MeterEnergi[]; bacaan: PembacaanMeter[]; tahun: number; bulan: number; plnBulan: number | null
}) {
  const router = useRouter()
  const bisaUbah = useBoleh()('aset.ubah')
  const [, mulai] = useTransition()
  const lalu = bulan === 1 ? { tahun: tahun - 1, bulan: 12 } : { tahun, bulan: bulan - 1 }
  const cari = (kode: string, th: number, bl: number) => bacaan.find((b) => b.meter_kode === kode && b.tahun === th && b.bulan === bl)

  // Stand awal kosong diisi dari stand akhir bulan lalu (ditandai), agar petugas cukup mengetik stand akhir
  const awalDari: Record<string, boolean> = {}
  const [isi, setIsi] = useState<Record<string, Baris>>(() => Object.fromEntries(meter.map((m) => {
    const ini = cari(m.kode, tahun, bulan)
    const akhirLalu = cari(m.kode, lalu.tahun, lalu.bulan)?.stand_akhir ?? null
    const awal = ini?.stand_awal ?? (ini ? null : akhirLalu)
    return [m.kode, { awal: tampil(awal), akhir: tampil(ini?.stand_akhir) }]
  })))
  for (const m of meter) awalDari[m.kode] = !cari(m.kode, tahun, bulan) && cari(m.kode, lalu.tahun, lalu.bulan)?.stand_akhir != null
  const [tersimpan, setTersimpan] = useState<Record<string, { awal: number | null; akhir: number | null }>>(() => Object.fromEntries(meter.map((m) => {
    const ini = cari(m.kode, tahun, bulan)
    return [m.kode, { awal: ini?.stand_awal ?? null, akhir: ini?.stand_akhir ?? null }]
  })))
  const [status, setStatus] = useState<Record<string, { s: 'simpan' | 'ok' | 'galat'; pesan?: string }>>({})

  // kWh tagihan historis (tanpa stand) dipakai bila stand bulan ini belum diisi
  const kwhTagihan = (m: MeterEnergi) => cari(m.kode, tahun, bulan)?.kwh_tagihan ?? null
  const konsumsi = (m: MeterEnergi) => {
    const a = bacaAngka(isi[m.kode]?.awal ?? ''), b = bacaAngka(isi[m.kode]?.akhir ?? '')
    if (a === null && b === null) return kwhTagihan(m)
    if (a === null || b === null || !Number.isFinite(a) || !Number.isFinite(b)) return null
    return (b - a) * m.faktor_kali
  }
  const konsumsiLalu = (m: MeterEnergi) => {
    const r = cari(m.kode, lalu.tahun, lalu.bulan)
    return r ? konsumsiBacaan(r, m) : null
  }

  function simpan(m: MeterEnergi) {
    const a = bacaAngka(isi[m.kode].awal), b = bacaAngka(isi[m.kode].akhir)
    if ((a !== null && !Number.isFinite(a)) || (b !== null && !Number.isFinite(b))) {
      setStatus((s) => ({ ...s, [m.kode]: { s: 'galat', pesan: 'Angka tidak valid' } })); return
    }
    // Belum ada stand akhir dan awal hanya isian otomatis: tidak perlu disimpan
    if (b === null && awalDari[m.kode] && tersimpan[m.kode].awal === null) return
    const lama = tersimpan[m.kode]
    if (lama.awal === a && lama.akhir === b) return
    setStatus((s) => ({ ...s, [m.kode]: { s: 'simpan' } }))
    mulai(async () => {
      const h = await simpanBacaan(m.kode, tahun, bulan, a, b)
      if (!h.ok) { setStatus((s) => ({ ...s, [m.kode]: { s: 'galat', pesan: h.pesan } })); return }
      setTersimpan((t) => ({ ...t, [m.kode]: { awal: a, akhir: b } }))
      setStatus((s) => ({ ...s, [m.kode]: { s: 'ok' } }))
      router.refresh()
    })
  }

  const ubah = (kode: string, k: keyof Baris, v: string) => setIsi((x) => ({ ...x, [kode]: { ...x[kode], [k]: v } }))
  const daftarKwh = meter.filter((m) => m.satuan.toLowerCase() === 'kwh')
  const terisi = daftarKwh.filter((m) => konsumsi(m) !== null)
  const total = terisi.reduce((t, m) => t + (konsumsi(m) ?? 0), 0)
  const totalPln = daftarKwh.filter((m) => m.sumber_kode === 'pln').reduce((t, m) => t + (konsumsi(m) ?? 0), 0)
  const gaya = (k: string) => {
    const st = status[k]?.s
    return st === 'galat' ? { borderColor: 'var(--crit)' } : st === 'ok' ? { borderColor: 'var(--good)' } : undefined
  }

  return (
    <div className="card">
      <div className="table-wrap">
        <table className="tbl">
          <thead>
            <tr>
              <th>Meter</th><th>Lokasi</th><th className="num">Faktor kali</th>
              <th className="num">Stand awal</th><th className="num">Stand akhir</th>
              <th className="num">Konsumsi</th><th className="num">vs {BULAN_PANJANG[lalu.bulan - 1]}</th>
            </tr>
          </thead>
          <tbody>
            {meter.length === 0 && <tr className="kosong"><td colSpan={7}>Belum ada meter. Tambahkan di register meter di bawah.</td></tr>}
            {meter.map((m) => {
              const k = konsumsi(m)
              const kl = konsumsiLalu(m)
              const r = cari(m.kode, tahun, bulan)
              const st = status[m.kode]
              return (
                <tr key={m.kode}>
                  <td className="kode">{m.kode}<span className="upd">No. {m.no_meter ?? '–'}</span></td>
                  <td>{m.lokasi ?? '–'}{m.area_dilayani && m.area_dilayani !== m.lokasi && <span className="upd">{m.area_dilayani}</span>}</td>
                  <td className="num">×{angka(m.faktor_kali, 2)}</td>
                  <td className="num">
                    <label><span className="sr-only">Stand awal {m.kode}</span>
                      <input className="sel" inputMode="decimal" readOnly={!bisaUbah} value={isi[m.kode]?.awal ?? ''}
                        onChange={(e) => ubah(m.kode, 'awal', e.target.value)} onBlur={() => simpan(m)} style={gaya(m.kode)} />
                    </label>
                    {awalDari[m.kode] && tersimpan[m.kode].awal === null && <span className="upd">dari stand akhir bulan lalu</span>}
                  </td>
                  <td className="num">
                    <label><span className="sr-only">Stand akhir {m.kode}</span>
                      <input className="sel" inputMode="decimal" readOnly={!bisaUbah} value={isi[m.kode]?.akhir ?? ''}
                        onChange={(e) => ubah(m.kode, 'akhir', e.target.value)} onBlur={() => simpan(m)} style={gaya(m.kode)} />
                    </label>
                    {st?.s === 'galat' && <span className="upd txt-bad" role="alert">{st.pesan}</span>}
                    {st?.s !== 'galat' && r?.diubah_oleh && <span className="upd">{r.diubah_oleh} · {waktu(r.diubah_at)}</span>}
                  </td>
                  <td className="num">
                    {k === null ? '–' : <b className={k < 0 ? 'txt-bad' : undefined}>{angka(k, 1)} {m.satuan}</b>}
                    {k !== null && k < 0 && <span className="upd txt-bad">Stand akhir lebih kecil dari awal</span>}
                    {k !== null && !isi[m.kode]?.awal && !isi[m.kode]?.akhir && kwhTagihan(m) !== null && <span className="upd">dari tagihan, tanpa stand</span>}
                  </td>
                  <td className="num">{k !== null && kl ? delta(((k - kl) / kl) * 100) : '–'}</td>
                </tr>
              )
            })}
          </tbody>
          {daftarKwh.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={5}><b>Total {terisi.length} dari {daftarKwh.length} meter kWh terbaca</b></td>
                <td className="num"><b>{angka(total, 1)} kWh</b></td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {plnBulan !== null && totalPln > 0 && (
        <p className="pesan" style={{ marginTop: 12 }}>
          Meter PLN terdaftar mencatat {angka(totalPln, 0)} kWh, atau {angka((totalPln / plnBulan) * 100, 1)}% dari total listrik PLN kawasan {BULAN_PANJANG[bulan - 1]} {tahun} ({angka(plnBulan, 0)} kWh di Data Energi).
          Sisanya belum tercakup submeter; selisih ini bahan rencana pengukuran (klausul 6.6) dan pemetaan SEU.
        </p>
      )}
      {!bisaUbah && <p className="pesan" style={{ marginTop: 12 }}>Peran Pembaca hanya dapat melihat bacaan meter.</p>}
      <p className="sumber">Konsumsi = (stand akhir − stand awal) × faktor kali. Ketik angka lalu pindah kolom untuk menyimpan; kosongkan kedua stand untuk menghapus bacaan bulan ini. Bulan historis tanpa stand memakai kWh tagihan. Hijau = tersimpan, merah = gagal.</p>
    </div>
  )
}
