import { Download } from 'lucide-react'
import { SectionHead } from '@/components/SectionHead'

export default function Komitmen() {
  return (
    <section className="km">
      <SectionHead eyebrow="Komitmen bersama · PT Kawasan Industri Nusantara | KEK Sei Mangkei" judul="Komitmen Penerapan Sistem Manajemen Energi">
        <div className="km-aksi">
          <p className="muted">Hemat energi, kinerja meningkat, kawasan berkelanjutan.</p>
          <a href="/poster-komitmen-smen.jpg" download className="btn"><Download aria-hidden="true" /> Unduh poster</a>
        </div>
      </SectionHead>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="km-poster"
        src="/poster-komitmen-smen.jpg"
        width={1107}
        height={1600}
        alt="Poster Komitmen Penerapan SMEn PT KINRA: empat komitmen (meningkatkan kinerja energi, mematuhi peraturan, menyediakan informasi dan sumber daya, mengutamakan produk dan desain hemat energi), dasar hukum (UU 30/2007, PP 33/2023, SNI ISO 50001:2018), siklus SMEn, dan langkah karyawan: matikan peralatan, atur AC 25 °C, catat pemakaian, laporkan pemborosan."
      />
    </section>
  )
}
