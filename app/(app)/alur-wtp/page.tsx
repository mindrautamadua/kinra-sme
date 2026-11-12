import { Droplets, Gauge, PlugZap, Wrench } from 'lucide-react'
import { SectionHead } from '@/components/SectionHead'
import { ambilAsetMeter, ambilPompa, ambilVariabel } from '@/lib/data'
import { PERTANYAAN_ME, susunAlurWtp } from '@/lib/alur-wtp'
import { angka, BULAN, persen } from '@/lib/format'
import { DiagramWtp } from './DiagramWtp'

export const dynamic = 'force-dynamic'

export default async function AlurWtp() {
  const [{ meter, bacaan }, { pompa, jam }, { data: variabel }] = await Promise.all([ambilAsetMeter(), ambilPompa(), ambilVariabel()])
  const a = susunAlurWtp({ meter, bacaan, pompa, jam, variabel })
  const kwhMeter = (a.kwhMeter.wtp ?? 0) + (a.kwhMeter.intake ?? 0)
  const intensitas = a.air.distribusi ? kwhMeter / a.air.distribusi : null
  const rasioEstimasi = kwhMeter ? (a.kwhEstimasiTotal / kwhMeter) * 100 : null
  const p = a.periode
  const periode = p ? `${BULAN[p.mulai.bulan - 1]} ${p.mulai.tahun} – ${BULAN[p.selesai.bulan - 1]} ${p.selesai.tahun}` : 'belum ada data'
  const dist = a.tahap.find((t) => t.id === 'distribusi')
  const intake = a.tahap.find((t) => t.id === 'intake')
  const pks = a.tahap.find((t) => t.id === 'pks')

  return (
    <>
      <section>
        <SectionHead hero eyebrow={<>SEU-01 · WTP 1 · Klausul 6.3, 6.6</>}
          judul={<>Alur proses WTP KEK Sei Mangkei: 9 tahap, {a.jumlahPompa} pompa terdaftar, <span className="ks-sorot">{dist ? persen(dist.porsi, 0) : '–'}</span> beban pompa di distribusi</>}>
          <p className="muted">
            Gambar alir pengolahan air bersih yang dipaparkan tim KINRA (12 Nov 2026), digambar ulang lalu dipetakan ke register pompa IPAB I,
            jam operasi, meter kWh, dan data air. Halaman ini menunjukkan pompa mana yang memakan listrik, apa yang sudah terukur, dan apa yang perlu dikonfirmasi Bagian M/E.
            Rata-rata per bulan, {periode}.
          </p>
        </SectionHead>
        <div className="tiles">
          <div className="tile"><div className="tile-head"><span className="tile-ikon"><PlugZap aria-hidden="true" /></span><span className="label">Listrik WTP + intake</span></div>
            <div className="nilai tnum">{angka(kwhMeter / 1000, 1)}<small>MWh/bulan</small></div>
            <div className="meta">MTR-005 {angka(a.kwhMeter.wtp, 0)} · MTR-008 {angka(a.kwhMeter.intake, 0)} kWh</div></div>
          <div className="tile"><div className="tile-head"><span className="tile-ikon"><Droplets aria-hidden="true" /></span><span className="label">Distribusi WTP I</span></div>
            <div className="nilai tnum">{angka(a.air.distribusi, 0)}<small>m³/bulan</small></div>
            <div className="meta">Air baku I {angka(a.air.baku, 0)} m³/bulan</div></div>
          <div className="tile"><div className="tile-head"><span className="tile-ikon"><Gauge aria-hidden="true" /></span><span className="label">Intensitas</span></div>
            <div className="nilai tnum">{angka(intensitas, 3)}<small>kWh/m³</small></div>
            <div className="meta">kWh WTP + intake per m³ terdistribusi</div></div>
          <div className="tile"><div className="tile-head"><span className="tile-ikon"><Wrench aria-hidden="true" /></span><span className="label">Estimasi beban pompa</span></div>
            <div className="nilai tnum">{angka(a.kwhEstimasiTotal / 1000, 1)}<small>MWh/bulan</small></div>
            <div className="meta">kW pengenal × jam operasi · {rasioEstimasi !== null ? `${persen(rasioEstimasi, 0)} dari meter` : '–'}</div></div>
        </div>
      </section>

      <section>
        <SectionHead no="01" eyebrow="Alur proses" judul="Tahap, pompa, dan titik ukur">
          <p className="muted">Pilih nomor tahap di diagram atau tombol di bawahnya. Porsi tiap tahap dihitung dari daya pengenal × jam operasi pompa; angka ini batas atas karena pompa jarang bekerja di daya pengenal, jadi pakai untuk membandingkan antartahap, bukan pengganti meter.</p>
        </SectionHead>
        <DiagramWtp tahap={a.tahap} />
      </section>

      <section>
        <SectionHead no="02" eyebrow="Analisis" judul="Arti untuk ENPI-05 dan SEU-01" />
        <div className="grid-2 aw-dua">
          <div className="card">
            <ul className="aw-daftar">
              <li><b>Pembagi ENPI-05 mungkin terlalu kecil.</b> Pembaginya hanya distribusi ke kawasan. Jalur PKS punya {pks?.pompa.length ?? 0} pompa ({angka(pks?.kwTerpasang, 1)} kW) dengan estimasi {angka(pks?.kwhEstimasi, 0)} kWh/bulan; bila terukur di MTR-005, kWh-nya terhitung tetapi volumenya tidak.</li>
              <li><b>Beban siaga perlu dipisah.</b> Pompa hydrant dan pompa damkar tidak ikut volume produksi. Uji rutin menambah beban tetap yang tidak bisa dihemat lewat pengaturan produksi.</li>
              <li><b>Air baku sudah terukur.</b> Air Baku I adalah jumlah water meter FM1a (kolam Water Intake) dan FM1b (langsung dari sungai), dan MTR-008 mengukur pompa kedua sumber itu (konfirmasi M/E, 12 Nov 2026). Jadi kWh intake per m³ air baku dan kehilangan air proses (air baku dikurangi air keluar) bisa dihitung. Air backwash dikembalikan ke settling pit, jadi airnya tidak hilang tetapi ikut dipompa ulang.</li>
              <li><b>Prioritas submeter.</b> Distribusi ({dist ? persen(dist.porsi, 0) : '–'} estimasi beban), intake ({intake ? persen(intake.porsi, 0) : '–'}), lalu jalur PKS dan hydrant.</li>
            </ul>
          </div>
          <div className="card">
            <span className="eyebrow">Pertanyaan untuk Bagian M/E</span>
            <ol className="aw-daftar">
              {PERTANYAAN_ME.map((q) => <li key={q}>{q}</li>)}
            </ol>
          </div>
        </div>
        <p className="muted small" style={{ marginTop: 12 }}>Sumber gambar: &quot;Flow Process Pengolahan Air Bersih WTP KEK Sei Mangkei&quot; (WhatsApp, 12 Nov 2026, 1225 × 671 px). Angka bertanda ≈ terbaca samar. Register pompa dan jam operasi dari migrasi 0044.</p>
      </section>
    </>
  )
}
