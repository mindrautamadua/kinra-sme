import { SectionHead } from '@/components/SectionHead'
import { ambilIsu, ambilPeluang } from '@/lib/data'
import { RegisterIsu } from './RegisterIsu'
import { RegisterPeluang } from './RegisterPeluang'

export const dynamic = 'force-dynamic'

export default async function Register() {
  const [isu, peluang] = await Promise.all([ambilIsu(), ambilPeluang()])
  const risiko = isu.filter((i) => i.jenis === 'Risiko')
  const tinggi = risiko.filter((i) => i.skor >= 15).length
  const dinilai = peluang.filter((p) => p.prioritas !== null).length

  return (
    <>
      <section>
        <SectionHead no="01" eyebrow="Klausul 4.1 & 6.1 · Isu internal dan eksternal"
          judul={`${risiko.length} risiko dan ${isu.length - risiko.length} peluang teridentifikasi, ${tinggi} berisiko tinggi`}>
          <p className="muted">Skor = dampak × kemungkinan (skala 1–5). Rendah &lt; 8, sedang 8–14, tinggi ≥ 15. Sumber: Formulir Isu Internal Eksternal 001/SOP-003/KINRA/SMEn/X/2026.</p>
        </SectionHead>
        <RegisterIsu isu={isu} />
      </section>
      <section>
        <SectionHead no="02" eyebrow="Klausul 6.1 & 6.2 · Peluang peningkatan kinerja energi"
          judul={`${dinilai} dari ${peluang.length} peluang sudah dinilai prioritasnya`}>
          <p className="muted">Skor prioritas = (skor potensi penghematan energi + skor pengembalian investasi) / 2. Sumber: Formulir Peluang Peningkatan Kinerja Energi 002/SOP-007/KINRA/SMEn/X/2026.</p>
        </SectionHead>
        <RegisterPeluang peluang={peluang} />
      </section>
    </>
  )
}
