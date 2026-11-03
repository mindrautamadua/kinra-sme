import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ambilIsian, ambilTemplat, daftarIsian } from '@/lib/formulir/data'
import { selaraskan } from '@/lib/formulir/isi'
import { EditorFormulir } from './EditorFormulir'

export const dynamic = 'force-dynamic'

export default async function HalamanIsian({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await ambilIsian(id)
  if (!r) notFound()
  const t = ambilTemplat(r.isian.templat_kode)
  if (!t) notFound()
  const lain = (await daftarIsian(t.kode)).filter((x) => x.id !== id).length

  return (
    <section>
      <Link href={`/formulir/${t.kode}`} className="btn kecil" style={{ marginBottom: 16 }}>
        <ArrowLeft aria-hidden="true" /> {t.judul}{lain ? ` · ${lain} isian lain` : ''}
      </Link>
      <EditorFormulir t={t} isian={{ ...r.isian, isi: selaraskan(t, r.isian.isi) }} riwayat={r.riwayat} />
    </section>
  )
}
