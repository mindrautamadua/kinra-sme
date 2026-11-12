import { Download, FileText } from 'lucide-react'
import { SectionHead } from '@/components/SectionHead'

export default function Komitmen() {
  return (
    <section className="km">
      <SectionHead eyebrow="Komitmen bersama · PT Kawasan Industri Nusantara | KEK Sei Mangkei" judul="Komitmen & Kebijakan Sistem Manajemen Energi">
        <p className="muted">Hemat energi, kinerja meningkat, kawasan berkelanjutan.</p>
      </SectionHead>

      <div className="km-dok">
        <article className="km-lembar">
          <div className="km-aksi">
            <div>
              <span className="eyebrow">Klausul 5.2 · No. 001/PO/KINRA/SMEn/X/2026</span>
              <h3>Kebijakan Sistem Manajemen Energi</h3>
              <p className="muted small">Ditetapkan 22 Oktober 2026 oleh Plt. Direktur.</p>
            </div>
            <a href="/komitmen/kebijakan-energi?unduh=pdf" className="btn"><FileText aria-hidden="true" /> Unduh PDF</a>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="km-gambar"
            src="/komitmen/kebijakan-energi"
            width={1488}
            height={2113}
            alt="Kebijakan Sistem Manajemen Energi PT KINRA No. 001/PO/KINRA/SMEn/X/2026: komitmen manajemen puncak dan seluruh personel meningkatkan kinerja energi secara berkelanjutan berdasarkan ISO 50001:2018, sepuluh butir pelaksanaan, ruang lingkup, ditandatangani Plt. Direktur 22 Oktober 2026."
          />
        </article>

        <article className="km-lembar">
          <div className="km-aksi">
            <div>
              <span className="eyebrow">Klausul 7.3 · Kesadaran</span>
              <h3>Poster komitmen</h3>
              <p className="muted small">Untuk dicetak dan dipasang di area kerja.</p>
            </div>
            <a href="/poster-komitmen-smen.jpg" download className="btn"><Download aria-hidden="true" /> Unduh poster</a>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="km-gambar"
            src="/poster-komitmen-smen.jpg"
            width={1107}
            height={1600}
            alt="Poster Komitmen Penerapan SMEn PT KINRA: empat komitmen (meningkatkan kinerja energi, mematuhi peraturan, menyediakan informasi dan sumber daya, mengutamakan produk dan desain hemat energi), dasar hukum (UU 30/2007, PP 33/2023, SNI ISO 50001:2018), siklus SMEn, dan langkah karyawan: matikan peralatan, atur AC 25 °C, catat pemakaian, laporkan pemborosan."
          />
        </article>
      </div>
    </section>
  )
}
