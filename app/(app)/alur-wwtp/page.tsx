import { Droplets, Gauge, PlugZap, Wrench } from 'lucide-react'
import { SectionHead } from '@/components/SectionHead'
import { Istilah } from '@/components/Istilah'
import { ambilAsetMeter, ambilPompa, ambilVariabel } from '@/lib/data'
import { PERTANYAAN_WWTP, susunAlurWwtp } from '@/lib/alur-wwtp'
import { angka, BULAN, persen } from '@/lib/format'
import { DiagramWwtp } from './DiagramWwtp'

export const dynamic = 'force-dynamic'

export default async function AlurWwtp() {
  const [{ meter, bacaan }, { pompa, jam }, { data: variabel }] = await Promise.all([ambilAsetMeter(), ambilPompa(), ambilVariabel()])
  const a = susunAlurWwtp({ meter, bacaan, pompa, jam, variabel })
  const intensitas = a.air.inlet && a.kwhMeter !== null ? a.kwhMeter / a.air.inlet : null
  const rasioEstimasi = a.kwhMeter ? (a.kwhEstimasiTotal / a.kwhMeter) * 100 : null
  const p = a.periode
  const periode = p ? `${BULAN[p.mulai.bulan - 1]} ${p.mulai.tahun} – ${BULAN[p.selesai.bulan - 1]} ${p.selesai.tahun}` : 'belum ada data'
  const aerasi = a.tahap.filter((t) => t.id.startsWith('aerasi'))
  const porsiAerasi = aerasi.reduce((s, t) => s + t.porsi, 0)
  const kwhAerator = a.tahap.flatMap((t) => t.pompa).filter((x) => /aerator/i.test(x.nama)).reduce((s, x) => s + x.kwhBulan, 0)
  const porsiAerator = a.kwhEstimasiTotal ? (kwhAerator / a.kwhEstimasiTotal) * 100 : 0
  const influent = a.tahap.find((t) => t.id === 'influent')
  const eq = a.tahap.find((t) => t.id === 'ekualisasi')
  const clar = a.tahap.find((t) => t.id === 'clarifier')
  const was = clar?.pompa.find((x) => x.nama === 'WAS')

  return (
    <>
      <section>
        <SectionHead hero eyebrow={<>SEU-02 · <Istilah kata="WWTP">WWTP (IPAL I)</Istilah> · Klausul 6.3, 6.6</>}
          judul={<>Alur proses WWTP IPAL I: 8 tahap, {a.jumlahUnit} unit peralatan, <span className="ks-sorot">{persen(porsiAerator, 0)}</span> beban di aerator</>}>
          <p className="muted">
            Gambar alir instalasi pengolahan air limbah (Lampiran BAPRK-03/01, terbit 25 Jun 2026), digambar ulang lalu dipetakan ke register pompa dan aerator IPAL I,
            jam operasi, meter kWh, dan volume inlet/outlet. IPAL II tidak dikelola KINRA sehingga tidak termasuk. Rata-rata per bulan, {periode}.
          </p>
        </SectionHead>
        <div className="tiles">
          <div className="tile"><div className="tile-head"><span className="tile-ikon"><PlugZap aria-hidden="true" /></span><span className="label">Listrik WWTP</span></div>
            <div className="nilai tnum">{angka((a.kwhMeter ?? 0) / 1000, 1)}<small>MWh/bulan</small></div>
            <div className="meta">meter KINRA-MTR-004</div></div>
          <div className="tile"><div className="tile-head"><span className="tile-ikon"><Droplets aria-hidden="true" /></span><span className="label">Air limbah masuk</span></div>
            <div className="nilai tnum">{angka(a.air.inlet, 0)}<small>m³/bulan</small></div>
            <div className="meta">inlet IPAL I · outlet {angka(a.air.outlet, 0)} m³/bulan</div></div>
          <div className="tile"><div className="tile-head"><span className="tile-ikon"><Gauge aria-hidden="true" /></span><span className="label">Intensitas</span></div>
            <div className="nilai tnum">{angka(intensitas, 3)}<small>kWh/m³</small></div>
            <div className="meta">kWh WWTP per m³ inlet (ENPI-06)</div></div>
          <div className="tile"><div className="tile-head"><span className="tile-ikon"><Wrench aria-hidden="true" /></span><span className="label">Estimasi beban peralatan</span></div>
            <div className="nilai tnum">{angka(a.kwhEstimasiTotal / 1000, 1)}<small>MWh/bulan</small></div>
            <div className="meta">kW pengenal × jam operasi · {rasioEstimasi !== null ? `${persen(rasioEstimasi, 0)} dari meter` : '–'}</div></div>
        </div>
      </section>

      <section>
        <SectionHead no="01" eyebrow="Alur proses" judul="Tahap, pompa, aerator, dan titik ukur">
          <p className="muted">Pilih nomor tahap di diagram atau tombol di bawahnya. Porsi tiap tahap dihitung dari daya pengenal × jam operasi; angka ini batas atas karena peralatan jarang bekerja di daya pengenal, jadi pakai untuk membandingkan antartahap, bukan pengganti meter.</p>
        </SectionHead>
        <DiagramWwtp tahap={a.tahap} />
      </section>

      <section>
        <SectionHead no="02" eyebrow="Analisis" judul="Arti untuk ENPI-06 dan SEU-02" />
        <div className="grid-2 aw-dua">
          <div className="card">
            <ul className="aw-daftar">
              <li><b>Aerasi adalah beban utama.</b> Ketiga kolam aerasi menyumbang {persen(porsiAerasi, 0)} estimasi beban, dan seluruh aerator (termasuk pengaduk ekualisasi) {persen(porsiAerator, 0)}. Aerator berjalan terus mengikuti beban organik, bukan volume, jadi peluang hemat terbesar ada di pengaturan aerator berdasarkan DO.</li>
              <li><b>Beban tetap besar membuat rasio bias.</b> Karena sebagian besar beban tidak ikut volume, kWh per m³ turun ketika inlet naik walau tidak ada perbaikan nyata. Ini sejalan dengan catatan ENPI-06: pertimbangkan regresi kWh = a + b × inlet setelah data cukup.</li>
              <li><b>Beban ikut volume.</b> Pompa influent chamber ({angka(influent?.kwTerpasang, 0)} kW terpasang) dan pompa transfer ekualisasi ({angka(eq?.kwTerpasang, 0)} kW, termasuk aerator pengaduk) yang naik turun bersama debit.</li>
              <li><b>Belum ada submeter.</b> Seluruh IPAL I hanya terukur di KINRA-MTR-004. Prioritas submeter: aerator kolam aerasi, lalu pompa influent dan ekualisasi.{was && !was.daya_kw ? ' Pompa WAS belum punya daya pengenal di register.' : ''}</li>
            </ul>
          </div>
          <div className="card">
            <span className="eyebrow">Pertanyaan untuk Bagian M/E</span>
            <ol className="aw-daftar">
              {PERTANYAAN_WWTP.map((q) => <li key={q}>{q}</li>)}
            </ol>
          </div>
        </div>
        <p className="muted small" style={{ marginTop: 12 }}>Sumber gambar: &quot;Flow Process Instalasi Pengolahan Air Limbah&quot;, Lampiran BAPRK-03/01, tgl. terbit 25-06-2026. Register pompa, aerator, dan jam operasi dari migrasi 0044; volume inlet/outlet dari migrasi 0044 dan 0060.</p>
      </section>
    </>
  )
}
