'use client'

import { Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTransition } from 'react'
import { hapusIsian } from '@/app/actions'
import { useBoleh } from '@/components/Peran'
import { useKonfirmasiHapus } from '@/components/KonfirmasiHapus'

/** Tombol hapus satu isian formulir langsung dari daftar di halaman dokumen. Hanya tampil untuk peran yang boleh menghapus. */
export function HapusIsian({ id, judul }: { id: string; judul: string }) {
  const router = useRouter()
  const mintaHapus = useKonfirmasiHapus()
  const bisa = useBoleh()
  const [menunggu, mulai] = useTransition()
  if (!bisa('formulir.hapus')) return null

  return (
    <button type="button" className="btn btn-ikon kecil bahaya" aria-label={`Hapus isian ${judul}`} title="Hapus isian" disabled={menunggu}
      onClick={async () => {
        if (!(await mintaHapus({ judul: `Hapus isian “${judul}”?`, kata: 'HAPUS' }))) return
        mulai(async () => {
          const h = await hapusIsian(id)
          if (!h.ok) return alert(h.pesan)
          router.refresh()
        })
      }}>
      <Trash2 aria-hidden="true" />
    </button>
  )
}
