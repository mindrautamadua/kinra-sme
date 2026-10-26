'use client'

import { createContext, type ReactNode, useContext } from 'react'
import { type Aksi, boleh, type Peran } from '@/lib/akses'

const Ctx = createContext<Peran | null>(null)

export function PeranProvider({ peran, children }: { peran: Peran; children: ReactNode }) {
  return <Ctx.Provider value={peran}>{children}</Ctx.Provider>
}

/** Cek hak akses di komponen klien (hanya untuk menampilkan/menyembunyikan; penjaga utama ada di database). */
export function useBoleh(): (aksi: Aksi) => boolean {
  const peran = useContext(Ctx)
  return (aksi) => boleh(peran, aksi)
}
