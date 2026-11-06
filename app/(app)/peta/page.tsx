import { SectionHead } from '@/components/SectionHead'
import { ambilDokumen, ambilIsu, ambilKinerja, ambilPeluang, ambilSasaran, ambilSeu, ambilTemuan } from '@/lib/data'
import { hariIni } from '@/lib/format'
import { susunPeta } from '@/lib/peta-smen'
import { PetaInteraktif } from './PetaInteraktif'

export const dynamic = 'force-dynamic'

export default async function PetaPage({ searchParams }: { searchParams: Promise<{ tahap?: string }> }) {
  const [dokumen, isu, peluang, { seu, tinjauan }, kinerja, { sasaran, aksi }, temuan] = await Promise.all([
    ambilDokumen(), ambilIsu(), ambilPeluang(), ambilSeu(), ambilKinerja(), ambilSasaran(), ambilTemuan(),
  ])
  const tahap = susunPeta({ dokumen, isu, peluang, seu, tinjauan, hasil: kinerja.hasil, sasaran, aksi, temuan, meter: kinerja.meter, bacaan: kinerja.bacaan, kini: hariIni() })
  const selesai = tahap.filter((t) => t.status === 'selesai').length
  const sp = await searchParams
  // Default: tahap pertama yang belum selesai, agar pengguna langsung melihat pekerjaan berikutnya
  const awal = Number(sp.tahap) || tahap.find((t) => t.status !== 'selesai')?.no || 1

  return (
    <section>
      <SectionHead hero eyebrow="Peta SMEn · siklus PDCA ISO 50001"
        judul={<>Sistem manajemen energi dalam 12 langkah: <span className="ks-sorot">{selesai} dari 12</span> sudah berjalan penuh</>}>
        <p className="muted">
          SMEn adalah cara kerja berulang: pahami di mana energi dipakai, tetapkan target, jalankan dengan disiplin, ukur hasilnya, lalu perbaiki.
          Setiap langkah saling bergantung. Klik satu langkah untuk melihat artinya, kondisi KINRA saat ini, pertanyaan auditor, dan langkah berikutnya.
        </p>
      </SectionHead>
      <PetaInteraktif tahap={tahap} awal={awal} />
      <p className="sumber">Status dihitung otomatis dari lembar Kesiapan, register SEU, EnPI lingkup KINRA, sasaran, bacaan meter, dan temuan audit. &ldquo;Sudah&rdquo; berarti bukti lengkap, bukan berarti tidak perlu dipelihara.</p>
    </section>
  )
}
