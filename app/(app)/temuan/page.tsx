import { SectionHead } from '@/components/SectionHead'
import { ambilDokumen, ambilKlausul, ambilTemuan } from '@/lib/data'
import { hariIni } from '@/lib/format'
import { DaftarTemuan } from './DaftarTemuan'

export const dynamic = 'force-dynamic'

export default async function Temuan() {
  const [temuan, klausul, dokumen] = await Promise.all([ambilTemuan(), ambilKlausul(), ambilDokumen()])
  const buka = temuan.filter((t) => t.status !== 'Tertutup')
  const kini = hariIni()
  const lewat = buka.filter((t) => t.tenggat && t.tenggat < kini).length

  return (
    <section>
      <SectionHead eyebrow="Klausul 9.2 & 10.1 · Temuan audit dan tindakan perbaikan"
        judul={temuan.length ? `${buka.length} dari ${temuan.length} temuan masih terbuka, ${lewat} melewati tenggat` : 'Belum ada temuan audit tercatat'}>
        <p className="muted">Catat temuan Internal Audit (5–24 Nov 2026), TÜV Stage 1 (20 Nov) dan Stage 2 (10–11 Des). Setiap temuan mengikuti alur Terbuka → Proses → Verifikasi → Tertutup dan dapat ditautkan ke dokumen bukti perbaikan.</p>
      </SectionHead>
      <DaftarTemuan temuan={temuan} klausul={klausul} dokumen={dokumen.map((d) => ({ id: d.id, kode: d.kode, nama: d.nama }))} kini={kini} />
    </section>
  )
}
