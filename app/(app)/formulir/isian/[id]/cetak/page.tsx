import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { LembarFormulir } from '@/components/formulir/LembarFormulir'
import { ambilIsian, ambilTemplat } from '@/lib/formulir/data'
import { selaraskan, STATUS_FORMULIR } from '@/lib/formulir/isi'
import { waktu } from '@/lib/format'
import { TombolCetak } from '@/components/TombolCetak'

export const dynamic = 'force-dynamic'

export default async function CetakIsian({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await ambilIsian(id)
  if (!r) notFound()
  const t = ambilTemplat(r.isian.templat_kode)
  if (!t) notFound()
  const i = r.isian

  return (
    <section className="cetak">
      <div className="toolbar tanpa-cetak">
        <Link href={`/formulir/isian/${i.id}`} className="btn kecil"><ArrowLeft aria-hidden="true" /> Kembali ke isian</Link>
        <span className="muted small">Status: {STATUS_FORMULIR[i.status].label}. Pilih “Simpan sebagai PDF” di dialog cetak untuk membuat berkas PDF. Orientasi lanskap disarankan.</span>
        <span style={{ flex: 1 }} />
        <TombolCetak />
      </div>
      <div className="card lembar-kartu">
        <LembarFormulir t={t} isi={selaraskan(t, i.isi)} persetujuan={{
          diajukan: i.diajukan_oleh ? `${i.diajukan_oleh}, ${waktu(i.diajukan_at)}` : null,
          disetujui: i.status === 'disetujui' && i.disetujui_oleh ? `${i.disetujui_oleh}, ${waktu(i.disetujui_at)}` : null,
        }} />
      </div>
    </section>
  )
}
