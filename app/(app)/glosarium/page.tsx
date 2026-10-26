import { SectionHead } from '@/components/SectionHead'
import { GLOSARIUM } from '@/lib/glosarium'
import { DaftarIstilah } from './DaftarIstilah'

export default function Glosarium() {
  return (
    <section>
      <SectionHead eyebrow="Glosarium · ISO 50001:2018" judul={`${GLOSARIUM.length} istilah SMEn dalam bahasa sehari-hari`}>
        <p className="muted">Kamus singkat istilah yang muncul di standar, dokumen SMEn, dan aplikasi ini. Nomor klausul merujuk ke SNI ISO 50001:2018; klik istilah bertanda menu untuk langsung membuka halaman terkait.</p>
      </SectionHead>
      <DaftarIstilah />
    </section>
  )
}
