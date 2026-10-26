'use client'

import { useEffect, useRef, useState } from 'react'

const fmt = (v: number, d: number) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: d }).format(v)

// Angka KPI naik dari 0 saat pertama terlihat (900ms cubicOut, sama dengan grafik).
// Server merender nilai akhir, jadi tanpa JS atau dengan reduced motion angka langsung benar.
// Pembaca layar selalu membaca nilai akhir lewat teks sr-only.
export function AngkaNaik({ nilai, desimal = 0, awalan = '', akhiran = '' }: { nilai: number; desimal?: number; awalan?: string; akhiran?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [kini, setKini] = useState<number | null>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || !nilai || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    setKini(0)
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return
      io.disconnect()
      const t0 = performance.now()
      const langkah = (t: number) => {
        const p = Math.min(1, (t - t0) / 900)
        setKini(p < 1 ? nilai * (1 - (1 - p) ** 3) : null)
        if (p < 1) raf = requestAnimationFrame(langkah)
      }
      raf = requestAnimationFrame(langkah)
    })
    io.observe(el)
    return () => { io.disconnect(); cancelAnimationFrame(raf); setKini(null) }
  }, [nilai])

  return (
    <>
      <span ref={ref} aria-hidden="true">{awalan}{fmt(kini ?? nilai, desimal)}{akhiran}</span>
      <span className="sr-only">{awalan}{fmt(nilai, desimal)}{akhiran}</span>
    </>
  )
}
