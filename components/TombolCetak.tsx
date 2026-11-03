'use client'

import { Printer } from 'lucide-react'

export function TombolCetak() {
  return <button type="button" className="btn utama" onClick={() => window.print()}><Printer aria-hidden="true" /> Cetak / PDF</button>
}
