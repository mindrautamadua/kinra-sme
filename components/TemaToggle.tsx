'use client'

import { Moon, Sun } from 'lucide-react'
import { useEffect, useState } from 'react'

export function TemaToggle() {
  const [gelap, setGelap] = useState(true)

  useEffect(() => {
    const attr = document.documentElement.dataset.theme
    setGelap(attr ? attr === 'dark' : !window.matchMedia('(prefers-color-scheme: light)').matches)
  }, [])

  function ganti() {
    const tema = gelap ? 'light' : 'dark'
    document.documentElement.dataset.theme = tema
    document.cookie = `kinra_tema=${tema}; path=/; max-age=31536000; samesite=lax`
    setGelap(!gelap)
  }

  return (
    <button type="button" className="btn btn-ikon" onClick={ganti} aria-label={gelap ? 'Ganti ke tema terang' : 'Ganti ke tema gelap'}>
      {gelap ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </button>
  )
}
