import { SectionHead } from '@/components/SectionHead'
import { susunCerita } from '@/lib/cerita-energi'
import { ambilAsetMeter, ambilKinerja, ambilParameter } from '@/lib/data'
import { susunKonversi } from '@/lib/konversi'
import { CeritaEnergiPlayer } from './CeritaEnergi'

export const dynamic = 'force-dynamic'

export default async function CeritaEnergi() {
  const [{ aset, meter, bacaan }, { energi, dataVariabel }, param] = await Promise.all([ambilAsetMeter(), ambilKinerja(), ambilParameter()])
  const cerita = susunCerita({ meter, bacaan, aset, energi, dataVariabel, kv: susunKonversi(param) })
  return (
    <section>
      <SectionHead hero eyebrow="Klausul 7.3 & 7.4 · kepedulian dan komunikasi energi" judul="Ke mana energi KINRA pergi?">
        <p className="muted">Tayangan singkat untuk sosialisasi karyawan, layar lobi, dan pembuka rapat. Angkanya diambil langsung dari data meter aset dan BBM di aplikasi untuk 12 bulan terakhir yang datanya lengkap, sehingga ikut terbarui setiap bulan. Tekan layar penuh untuk menayangkan; tayangan berulang otomatis.</p>
      </SectionHead>
      {cerita ? <CeritaEnergiPlayer c={cerita} /> : (
        <div className="card"><p className="muted">Belum ada bulan dengan bacaan lengkap untuk semua meter aset. Lengkapi bacaan di halaman Aset & Meter.</p></div>
      )}
    </section>
  )
}
