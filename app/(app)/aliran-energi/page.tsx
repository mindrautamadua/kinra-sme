import Link from 'next/link'
import { Istilah } from '@/components/Istilah'
import { SectionHead } from '@/components/SectionHead'
import { susunAliran } from '@/lib/aliran-energi'
import { ambilAsetMeter, ambilEnergi, ambilParameter, ambilSeu } from '@/lib/data'
import { persen } from '@/lib/format'
import { susunKonversi } from '@/lib/konversi'
import { AliranEnergi } from './AliranEnergi'

export const dynamic = 'force-dynamic'

export default async function AliranEnergiPage() {
  const [{ sumber, data: energi }, { aset, meter, bacaan }, { seu }, param] = await Promise.all([ambilEnergi(), ambilAsetMeter(), ambilSeu(), ambilParameter()])
  const kv = susunKonversi(param)
  const data = susunAliran({ sumber, energi, aset, meter, bacaan, seu, kv })

  if (!data) {
    return (
      <section>
        <SectionHead hero eyebrow="Aliran energi · klausul 6.3" judul="Belum ada bacaan meter untuk digambarkan" />
        <p className="muted">Isi bacaan meter bulanan di <Link href="/aset">Aset & Meter</Link>; diagram aliran tersusun otomatis dari data itu.</p>
      </section>
    )
  }

  // Judul memakai rata-rata 12 bulan lengkap terakhir (atau bulan lengkap terakhir), sama dengan Tinjauan Energi
  const acuan = data.periode.find((p) => p.kunci === -1) ?? data.periode[data.awal]
  const total = data.simpul.kinra.filter((s) => s.kolom === 0).reduce((t, s) => t + (acuan.nilai[s.id]?.kwh ?? 0), 0)
  const lewatSeu = data.simpul.kinra.filter((s) => s.jenis === 'seu').reduce((t, s) => t + (acuan.nilai[s.id]?.kwh ?? 0), 0)
  const nSeu = data.simpul.kinra.filter((s) => s.jenis === 'seu').length

  return (
    <section>
      <SectionHead hero eyebrow="Aliran energi · tinjauan energi klausul 6.3"
        judul={<>Ke mana energi KINRA mengalir: <span className="ks-sorot">{persen(total ? (lewatSeu / total) * 100 : 0)}</span> lewat {nSeu} <Istilah kata="SEU" /></>}>
        <p className="muted">
          Diagram ini menelusuri setiap kWh dari sumbernya ke aset yang memakainya, lalu ke penggunaan energi signifikan yang mengendalikannya.
          Putar timelapse untuk melihat bagaimana aliran berubah bulan demi bulan, atau beralih ke tampilan kawasan untuk melihat batas lingkup SMEn terhadap listrik tenant.
        </p>
      </SectionHead>
      <AliranEnergi data={data} />
      <p className="sumber">
        Sumber: bacaan meter aset KINRA ({data.meterTotal} meter kWh; meter intake digabung ke asetnya), data energi kawasan dan BBM bulanan, register SEU.
        BBM dikonversi ke kWh setara (Dexlite 36 MJ/L, bensin 33 MJ/L). Rupiah dan CO₂ memakai parameter di halaman <Link href="/energi">Data Energi</Link>
        {kv.asumsi.length ? ` (masih asumsi: ${kv.asumsi.join(', ')})` : ''}. Bulan bertanda titik di garis waktu belum lengkap semua meternya.
      </p>
    </section>
  )
}
