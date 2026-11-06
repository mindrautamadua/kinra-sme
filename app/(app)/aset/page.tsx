import { Building2, Gauge, Snowflake, Zap } from 'lucide-react'
import { SectionHead } from '@/components/SectionHead'
import { ambilAsetMeter, ambilEnergi } from '@/lib/data'
import { angka, BULAN_PANJANG } from '@/lib/format'
import { BacaanMeter } from './BacaanMeter'
import { PilihPeriode } from './PilihPeriode'
import { RegisterAset } from './RegisterAset'
import { RegisterMeter } from './RegisterMeter'

export const dynamic = 'force-dynamic'

export default async function AsetPage({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const [{ aset, meter, bacaan, siap }, { sumber, data }] = await Promise.all([ambilAsetMeter(), ambilEnergi()])
  const sp = await searchParams

  // Periode default: bulan bacaan terakhir; bila belum ada bacaan, bulan berjalan
  const terakhir = bacaan.at(-1)
  const kini = new Date()
  const m = /^(\d{4})-(\d{2})$/.exec(sp.periode ?? '')
  const tahun = m ? Number(m[1]) : terakhir?.tahun ?? kini.getFullYear()
  const bulan = m && Number(m[2]) >= 1 && Number(m[2]) <= 12 ? Number(m[2]) : terakhir?.bulan ?? kini.getMonth() + 1
  const plnBulan = data.find((d) => d.tahun === tahun && d.bulan === bulan && d.sumber_kode === 'pln')?.nilai ?? null

  if (!siap) {
    return (
      <section>
        <SectionHead hero eyebrow="Aset & meter energi" judul="Tabel aset dan meter belum ada" />
        <p className="pesan">Jalankan migrasi <code>supabase/migrations/0022_aset_meter.sql</code> di SQL Editor Supabase, lalu muat ulang halaman ini.</p>
      </section>
    )
  }

  const luas = aset.reduce((t, a) => t + (a.luas_m2 ?? 0), 0)
  const luasAc = aset.reduce((t, a) => t + (a.luas_ac_m2 ?? 0), 0)
  const bermeter = new Set(meter.map((x) => x.aset_kode).filter(Boolean))
  const jumlahBacaan: Record<string, number> = {}
  for (const b of bacaan) jumlahBacaan[b.meter_kode] = (jumlahBacaan[b.meter_kode] ?? 0) + 1
  const kwhInventaris = aset.reduce((t, a) => t + (a.kwh_bulan ?? 0), 0)

  return (
    <>
      <section>
        <SectionHead hero eyebrow="PA-12 · Klausul 6.3, 6.6, 9.1"
          judul={<>{aset.length} aset, {meter.length} meter energi, <span className="ks-sorot">{bermeter.size} aset</span> sudah terukur meter</>}>
          <p className="muted">Register aset gedung/fasilitas dan meter energi KINRA. Bahan tinjauan energi (identifikasi SEU), rencana pengumpulan data energi, dan bukti kalibrasi peralatan ukur.</p>
        </SectionHead>
        <div className="tiles">
          <div className="tile"><div className="tile-head"><span className="tile-ikon"><Building2 aria-hidden="true" /></span><span className="label">Total luas bangunan</span></div>
            <div className="nilai tnum">{angka(luas, 0)}<small>m²</small></div>
            <div className="meta">{aset.filter((a) => a.luas_m2 === null).length} aset belum ada data luas</div></div>
          <div className="tile"><div className="tile-head"><span className="tile-ikon"><Snowflake aria-hidden="true" /></span><span className="label">Luas area ber-AC</span></div>
            <div className="nilai tnum">{angka(luasAc, 0)}<small>m²</small></div>
            <div className="meta">{aset.filter((a) => (a.luas_ac_m2 ?? 0) > 0).length} aset ber-AC</div></div>
          <div className="tile"><div className="tile-head"><span className="tile-ikon"><Gauge aria-hidden="true" /></span><span className="label">Meter terdaftar</span></div>
            <div className="nilai tnum">{meter.length}<small>meter</small></div>
            <div className="meta">{aset.length - bermeter.size} aset belum punya meter sendiri</div></div>
          <div className="tile"><div className="tile-head"><span className="tile-ikon"><Zap aria-hidden="true" /></span><span className="label">Listrik aset terinventaris</span></div>
            <div className="nilai tnum">{angka(kwhInventaris / 1000, 1)}<small>MWh/bulan</small></div>
            <div className="meta">Dari data inventaris awal {aset.filter((a) => a.kwh_bulan !== null).length} aset</div></div>
        </div>
      </section>

      <section>
        <SectionHead no="01" eyebrow="Bacaan stand meter" judul={`Bacaan ${BULAN_PANJANG[bulan - 1]} ${tahun}`}>
          <p className="muted">Catat stand awal dan akhir setiap meter per bulan. Stand awal otomatis diambil dari stand akhir bulan sebelumnya bila sudah ada.</p>
        </SectionHead>
        <PilihPeriode tahun={tahun} bulan={bulan} />
        <BacaanMeter key={`${tahun}-${bulan}`} meter={meter} bacaan={bacaan} tahun={tahun} bulan={bulan} plnBulan={plnBulan} />
      </section>

      <section>
        <SectionHead no="02" eyebrow="Register induk meter energi" judul="Meter & alat ukur">
          <p className="muted">Lengkapi akurasi, jadwal kalibrasi/verifikasi, PIC, dan bukti pendukung setiap meter (klausul 6.6 dan 9.1).</p>
        </SectionHead>
        <RegisterMeter meter={meter} aset={aset} sumber={sumber} jumlahBacaan={jumlahBacaan} />
      </section>

      <section>
        <SectionHead no="03" eyebrow="Daftar aset gedung & fasilitas" judul="Aset KINRA">
          <p className="muted">Data luas, teknis, dan energi per gedung/fasilitas sebagai dasar pembagian konsumsi dan penentuan SEU.</p>
        </SectionHead>
        <RegisterAset aset={aset} meter={meter} />
      </section>
    </>
  )
}
