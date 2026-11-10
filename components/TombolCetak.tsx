'use client'

import { Printer } from 'lucide-react'

export function TombolCetak({ label = 'Cetak / PDF' }: { label?: string }) {
  return <button type="button" className="btn utama" onClick={() => window.print()}><Printer aria-hidden="true" /> {label}</button>
}
