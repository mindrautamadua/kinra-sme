'use client'

import { useEffect } from 'react'

// Reveal saat scroll (panduan §9). Hanya blok yang masih di bawah layar yang disembunyikan,
// jadi isi yang sudah terlihat tidak berkedip, dan tanpa JS semuanya tetap tampil.
// Animasi CSS di dalam blok (bar, matriks) ditahan di awal lalu diputar saat blok muncul.
// Memakai Web Animations API, bukan kelas: komponen ini bisa jalan sebelum halaman selesai
// hydrate, dan mengubah className di DOM server memicu hydration mismatch.
export function Ungkap() {
  useEffect(() => {
    const konten = document.querySelector('.konten')
    if (!konten || matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const sudah = new WeakSet<Element>()
    const ditahan = new Map<Element, Animation[]>()

    const io = new IntersectionObserver((entri) => {
      for (const e of entri) {
        if (!e.isIntersecting) continue
        io.unobserve(e.target)
        ditahan.get(e.target)?.forEach((a) => a.play())
        ditahan.delete(e.target)
      }
    }, { rootMargin: '0px 0px -40px 0px' })

    const pindai = () => {
      for (const el of konten.querySelectorAll(':scope > section > *')) {
        if (sudah.has(el)) continue
        sudah.add(el)
        if (el.getBoundingClientRect().top < innerHeight) continue
        const anim = el.getAnimations({ subtree: true })
        anim.push(el.animate(
          [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'none' }],
          { duration: 800, easing: 'cubic-bezier(.2, .8, .2, 1)', fill: 'backwards' },
        ))
        anim.forEach((a) => { a.pause(); a.currentTime = 0 })
        ditahan.set(el, anim)
        io.observe(el)
      }
    }

    pindai()
    // Pindah halaman atau streaming dari loading.tsx mengganti isi .konten
    const mo = new MutationObserver(pindai)
    mo.observe(konten, { childList: true })
    return () => { io.disconnect(); mo.disconnect() }
  }, [])

  return null
}
