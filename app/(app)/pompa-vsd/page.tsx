import { SectionHead } from '@/components/SectionHead'
import { Istilah } from '@/components/Istilah'
import { ambilParameter } from '@/lib/data'
import { susunKonversi } from '@/lib/konversi'
import { POMPA_WTP1 } from '@/lib/pompa'
import { SimulasiPompa } from './SimulasiPompa'

export const dynamic = 'force-dynamic'

export default async function PompaVsd() {
  const kv = susunKonversi(await ambilParameter())
  return (
    <>
      <section>
        <SectionHead hero eyebrow={<>SEU-01 · WTP 1 · pompa distribusi {POMPA_WTP1.dayaKw} kW</>} judul="Pompa air dengan katup vs dengan VSD">
          <p className="muted">Geser kebutuhan debit dan bandingkan dua cara mengurangi aliran: menutup katup sambil motor tetap 50 Hz, atau menurunkan putaran motor dengan <Istilah kata="VSD">VSD</Istilah>. Angka daya dihitung dari hukum afinitas pompa sentrifugal.</p>
        </SectionHead>
        <SimulasiPompa tarif={kv.tarifListrik} />
      </section>

      <section>
        <SectionHead no="01" eyebrow="Konteks KINRA" judul="Yang terjadi di WTP 1">
          <p className="muted"><b>Tanpa VSD</b>, debit diatur dengan menutup katup. Motor tetap berputar penuh dan energinya terbuang sebagai gesekan di katup. <b>Dengan VSD</b>, putaran motor diturunkan sehingga pompa hanya bekerja sebesar yang dibutuhkan jaringan.</p>
        </SectionHead>
        <div className="pv-fakta">
          <div className="card"><span className="eyebrow">VSD terpasang</span><b className="tnum">{POMPA_WTP1.vsdTerpasang}<small>unit</small></b><span className="muted small">dipasang {POMPA_WTP1.vsdDipasang.join(', ')}</span></div>
          <div className="card"><span className="eyebrow">Beroperasi</span><b className="tnum">{POMPA_WTP1.vsdBeroperasi}<small>× {POMPA_WTP1.dayaKw} kW</small></b><span className="muted small">1 unit cadangan</span></div>
          <div className="card"><span className="eyebrow">Kapasitas WTP 1</span><b className="tnum">{POMPA_WTP1.kapasitasWtp}<small>m³/jam</small></b><span className="muted small">beroperasi 24 jam/hari</span></div>
        </div>
        <div className="card" style={{ marginTop: 16 }}>
          <p>Penghematan VSD paling besar saat kebutuhan air turun naik, misalnya malam hari. Bila WTP 1 harus berjalan mendekati kapasitas penuh sepanjang hari, putaran tidak bisa diturunkan jauh dan selisihnya mengecil. Head statis yang tinggi juga memperkecil penghematan.</p>
          <p>Data KINRA: ketiga VSD sudah beroperasi sejak 2022, Jan 2024, dan Agu 2025, jadi sudah menjadi bagian baseline ENPI-05 (2025, rata-rata <b>0,670 kWh/m³</b>). Data meter baru tersedia mulai 2024, sehingga penghematan VSD terhadap kondisi tanpa VSD belum bisa dibuktikan dengan data KINRA. Intensitas WTP 1 sempat turun ke <b>0,571–0,602 kWh/m³</b> pada Feb–Jul 2026 lalu kembali ke <b>0,645–0,667 kWh/m³</b> pada Agu–Okt 2026; penyebabnya sedang diselidiki di register deviasi. Lihat ENPI-05 di halaman Kinerja Energi.</p>
          <p className="muted small" style={{ marginBottom: 0 }}>Halaman ini ilustrasi untuk sosialisasi. Kurva daya mode katup memakai pendekatan umum pompa sentrifugal (daya ≈ 40% + 60% × debit), bukan kurva pabrikan pompa WTP 1. Rupiah memakai tarif listrik di parameter energi.</p>
        </div>
      </section>
    </>
  )
}
