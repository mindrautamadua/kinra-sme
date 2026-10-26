'use client'

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useState } from 'react'

/** Ciutkan/lebarkan sidebar. Pilihan disimpan di cookie agar server merender keadaan yang sama tanpa kedip. */
export function SidebarToggle({ awalCiut }: { awalCiut: boolean }) {
  const [ciut, setCiut] = useState(awalCiut)

  function ganti() {
    const baru = !ciut
    document.querySelector('.shell')?.toggleAttribute('data-ciut', baru)
    document.cookie = `kinra_sidebar=${baru ? 'ciut' : 'lebar'}; path=/; max-age=31536000; samesite=lax`
    setCiut(baru)
  }

  return (
    <button type="button" className="btn btn-ikon sidebar-toggle" onClick={ganti}
      aria-controls="sidebar" aria-expanded={!ciut} aria-label={ciut ? 'Lebarkan menu' : 'Ciutkan menu'} title={ciut ? 'Lebarkan menu' : 'Ciutkan menu'}>
      {ciut ? <PanelLeftOpen aria-hidden="true" /> : <PanelLeftClose aria-hidden="true" />}
    </button>
  )
}
