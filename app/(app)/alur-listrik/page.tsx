import { Building2, Factory, PlugZap, Unplug } from 'lucide-react'
import { SectionHead } from '@/components/SectionHead'
import { ambilAsetMeter, ambilEnergi } from '@/lib/data'
import { GARDU, PERTANYAAN_LISTRIK, susunAlurListrik } from '@/lib/alur-listrik'
import { angka, BULAN, persen } from '@/lib/format'
import { DiagramListrik } from './DiagramListrik'

export const dynamic = 'force-dynamic'

export default async function AlurListrikPage() {
  const [{ data: energi }, { meter, bacaan }] = await Promise.all([ambilEnergi(), ambilAsetMeter()])
  const a = susunAlurListrik({ energi, meter, bacaan })
  const p = a.periode
  const periode = p ? `${BULAN[p.mulai.bulan - 1]} ${p.mulai.tahun} – ${BULAN[p.selesai.bulan - 1]} ${p.selesai.tahun}` : 'belum ada data'
  const porsiKinra = a.kwhKawasan && a.kwhKinra !== null ? (a.kwhKinra / a.kwhKawasan) * 100 : null
  const tenant = a.kwhKawasan !== null && a.kwhKinra !== null ? Math.max(0, a.kwhKawasan - a.kwhKinra) : null
  const terbesar = [...a.meter].sort((x, y) => (y.kwh ?? 0) - (x.kwh ?? 0))[0]

  return (
    <>
      <section>
        <SectionHead hero eyebrow="Listrik kawasan · Klausul 4.3, 6.3, 6.6"
          judul={<>Alur pasokan listrik: 4 gardu dari Gardu Induk PLN ke Gardu Transaksi, aset KINRA <span className="ks-sorot">{persen(porsiKinra, 1)}</span> dari listrik kawasan</>}>
          <p className="muted">
            Gambar tata letak gardu dari tim KINRA (13 Nov 2026), digambar ulang lalu dihubungkan ke data listrik di aplikasi.
            Gambar sumber berhenti di Gardu Transaksi; beban hilir ditambahkan dari meter aset KINRA. Rata-rata per bulan, {periode}.
          </p>
        </SectionHead>
        <div className="tiles">
          <div className="tile"><div className="tile-head"><span className="tile-ikon"><Factory aria-hidden="true" /></span><span className="label">Listrik PLN kawasan</span></div>
            <div className="nilai tnum">{angka((a.kwhKawasan ?? 0) / 1000, 1)}<small>MWh/bulan</small></div>
            <div className="meta">termasuk tenant · titik ukur belum dikonfirmasi</div></div>
          <div className="tile"><div className="tile-head"><span className="tile-ikon"><Building2 aria-hidden="true" /></span><span className="label">Aset KINRA</span></div>
            <div className="nilai tnum">{angka((a.kwhKinra ?? 0) / 1000, 1)}<small>MWh/bulan</small></div>
            <div className="meta">{a.meter.length} meter, terbesar {terbesar?.nama ?? '–'}</div></div>
          <div className="tile"><div className="tile-head"><span className="tile-ikon"><Unplug aria-hidden="true" /></span><span className="label">Tenant dan susut</span></div>
            <div className="nilai tnum">{angka((tenant ?? 0) / 1000, 1)}<small>MWh/bulan</small></div>
            <div className="meta">selisih kawasan dikurangi aset KINRA</div></div>
          <div className="tile"><div className="tile-head"><span className="tile-ikon"><PlugZap aria-hidden="true" /></span><span className="label">Penyulang</span></div>
            <div className="nilai tnum">2<small>penyulang</small></div>
            <div className="meta">hanya penyulang merah sampai Gardu Transaksi</div></div>
        </div>
      </section>

      <section>
        <SectionHead no="01" eyebrow="Alur pasokan" judul="Gardu, penyulang, dan titik ukur">
          <p className="muted">Pilih nomor di diagram atau tombol di bawahnya. Rute kabel dan isi panel mengikuti gambar sumber; fungsi tiap gardu adalah penjelasan umum yang perlu dikonfirmasi Bagian M/E.</p>
        </SectionHead>
        <DiagramListrik gardu={GARDU} data={a} />
      </section>

      <section>
        <SectionHead no="02" eyebrow="Analisis" judul="Arti untuk batas SMEn dan rencana pengukuran" />
        <div className="grid-2 aw-dua">
          <div className="card">
            <ul className="aw-daftar">
              <li><b>Gardu Transaksi adalah batas pasokan.</b> Semua listrik kawasan dari PLN lewat kWh meter transaksi. Bila angka &quot;Listrik PLN kawasan&quot; berasal dari meter ini, angka tersebut sah sebagai total masuk kawasan (klausul 6.6).</li>
              <li><b>Lingkup SMEn tetap di meter aset.</b> Aset KINRA hanya {persen(porsiKinra, 1)} dari listrik kawasan; sisanya tenant dan susut jaringan. EnPI KINRA tetap dihitung dari meter aset, bukan dari meter transaksi.</li>
              <li><b>Susut jaringan belum terlihat.</b> Selisih {angka((tenant ?? 0) / 1000, 1)} MWh/bulan menggabungkan tenant dan susut. Bila jaringan dari Gardu Transaksi ke beban dikelola KINRA, susut itu energi KINRA dan perlu dipisahkan dengan data meter tenant.</li>
              <li><b>Keandalan pasokan.</b> Dua penyulang sampai Gardu Distribusi, tetapi hanya satu (merah) yang sampai Gardu Transaksi. Ini masukan untuk register isu: risiko padam bila penyulang merah gangguan.</li>
            </ul>
          </div>
          <div className="card">
            <span className="eyebrow">Pertanyaan untuk Bagian M/E</span>
            <ol className="aw-daftar">
              {PERTANYAAN_LISTRIK.map((q) => <li key={q}>{q}</li>)}
            </ol>
          </div>
        </div>
        <p className="muted small" style={{ marginTop: 12 }}>Sumber gambar: tata letak Gardu Induk PLN, Gardu Hubung Utama, Gardu Distribusi, dan Gardu Transaksi dari tim KINRA (13 Nov 2026). Listrik PLN kawasan dari data energi bulanan; meter aset dari bacaan KINRA-MTR-001 s.d. 009.</p>
      </section>
    </>
  )
}
