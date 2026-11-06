'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRouter } from 'next/navigation'

const fmt = (t: number, b: number) => `${t}-${String(b).padStart(2, '0')}`

/** Pilih bulan bacaan stand meter. Disimpan di URL (?periode=YYYY-MM). */
export function PilihPeriode({ tahun, bulan }: { tahun: number; bulan: number }) {
  const router = useRouter()
  const ke = (t: number, b: number) => router.push(`/aset?periode=${fmt(t, b)}`, { scroll: false })
  const geser = (n: number) => { const i = tahun * 12 + (bulan - 1) + n; ke(Math.floor(i / 12), (i % 12) + 1) }
  return (
    <div className="toolbar" style={{ marginBottom: 12 }}>
      <button type="button" className="btn btn-ikon" aria-label="Bulan sebelumnya" onClick={() => geser(-1)}><ChevronLeft aria-hidden="true" /></button>
      <label><span className="sr-only">Periode bacaan</span>
        <input type="month" value={fmt(tahun, bulan)} min="2020-01" max="2035-12"
          onChange={(e) => { const [t, b] = e.target.value.split('-').map(Number); if (t && b) ke(t, b) }} />
      </label>
      <button type="button" className="btn btn-ikon" aria-label="Bulan berikutnya" onClick={() => geser(1)}><ChevronRight aria-hidden="true" /></button>
    </div>
  )
}
