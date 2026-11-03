'use client'

import { useState } from 'react'

/** Simbol KIRA: dua bilah (jingga dan biru) sesuai panduan merek. */
export function KiraSimbol({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="kira-jingga" x1="0" y1="1" x2="0.6" y2="0">
          <stop offset="0" stopColor="#f15a22" /><stop offset="0.55" stopColor="#f7941d" /><stop offset="1" stopColor="#fcc32a" />
        </linearGradient>
        <linearGradient id="kira-biru" x1="0" y1="1" x2="0.4" y2="0">
          <stop offset="0" stopColor="#1565d8" /><stop offset="1" stopColor="#36a9f4" />
        </linearGradient>
      </defs>
      <path d="M13 54 C12 36 22 22 40 15 C33 26 31 40 34 54 Z" fill="url(#kira-jingga)" />
      <path d="M31 54 C29 36 36 19 52 7 C55 27 49 44 31 54 Z" fill="url(#kira-biru)" />
    </svg>
  )
}

/** Avatar KIRA: maskot dari /kira.png bila ada, selain itu simbol. */
export function KiraAvatar({ className }: { className?: string }) {
  const [gagal, setGagal] = useState(false)
  return (
    <span className={`kira-avatar ${className ?? ''}`}>
      {gagal
        ? <KiraSimbol />
        // eslint-disable-next-line @next/next/no-img-element
        : <img src="/kira.png" alt="" onError={() => setGagal(true)} ref={(el) => { if (el?.complete && !el.naturalWidth) setGagal(true) }} />}
    </span>
  )
}
