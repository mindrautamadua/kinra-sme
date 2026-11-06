import { CircleCheck, Lightbulb, ShieldAlert, Zap } from 'lucide-react'
import { Istilah } from '@/components/Istilah'
import { SectionHead } from '@/components/SectionHead'
import { ambilIsu, ambilParameter, ambilPeluang, ambilSasaran } from '@/lib/data'
import { angka, persen } from '@/lib/format'
import { nilaiEnergi, rupiahRingkas, susunKonversi, tonCo2 } from '@/lib/konversi'
import { RegisterIsu } from './RegisterIsu'
import { RegisterPeluang } from './RegisterPeluang'

export const dynamic = 'force-dynamic'

export default async function Register() {
  const [isu, peluang, { aksi }, param] = await Promise.all([ambilIsu(), ambilPeluang(), ambilSasaran(), ambilParameter()])
  const kv = susunKonversi(param)
  const risiko = isu.filter((i) => i.jenis === 'Risiko')
  const tinggi = risiko.filter((i) => i.skor >= 15)
  const sedang = risiko.filter((i) => i.skor >= 8 && i.skor < 15)
  const tertinggi = [...risiko].sort((a, b) => b.skor - a.skor)[0]
  const lengkap = isu.filter((i) => i.tindakan && i.evaluasi && i.pic).length
  const dinilai = peluang.filter((p) => p.prioritas !== null).length
  const jadiAksi = new Set(aksi.map((a) => a.peluang_kode).filter(Boolean))
  const potensiKwh = peluang.filter((p) => p.status !== 'Ditolak').reduce((t, p) => t + (p.estimasi_kwh ?? 0), 0)
  const potensi = nilaiEnergi(kv, potensiKwh, 'kWh')

  return (
    <>
      <section>
        <SectionHead hero eyebrow={<>Klausul 4.1, 6.1 & 6.2 · <Istilah kata="Risiko & peluang" /> SMEn</>}
          judul={<>{risiko.length} risiko dan {peluang.length + isu.length - risiko.length} peluang tercatat; <span className="ks-sorot">{persen(isu.length ? (lengkap / isu.length) * 100 : 0, 0)}</span> isu sudah menutup siklus tindakan–evaluasi</>}>
          <p className="muted">
            Halaman ini menjawab tiga pertanyaan auditor klausul 6.1: risiko apa yang dapat menggagalkan SMEn, apa tindakannya, dan bagaimana efektivitasnya dievaluasi.
            Peluang peningkatan kinerja energi dinilai prioritasnya lalu dijadikan rencana aksi (6.2).
          </p>
        </SectionHead>
        <div className="tiles">
          <div className="tile"><div className="tile-head"><span className="tile-ikon"><ShieldAlert aria-hidden="true" /></span><span className="label">Risiko tinggi / sedang</span></div>
            <div className="nilai tnum">{tinggi.length}<small>/ {sedang.length}</small></div>
            <div className="meta">{tertinggi ? `Tertinggi skor ${tertinggi.skor}: ${tertinggi.uraian.slice(0, 60)}${tertinggi.uraian.length > 60 ? '…' : ''}` : 'Belum ada risiko'}</div></div>
          <div className="tile"><div className="tile-head"><span className="tile-ikon"><CircleCheck aria-hidden="true" /></span><span className="label">Siklus lengkap</span></div>
            <div className="nilai tnum">{lengkap}<small>dari {isu.length} isu</small></div>
            <div className="meta">Punya tindakan, evaluasi efektivitas, dan PIC</div></div>
          <div className="tile"><div className="tile-head"><span className="tile-ikon"><Lightbulb aria-hidden="true" /></span><span className="label">Peluang dinilai</span></div>
            <div className="nilai tnum">{dinilai}<small>dari {peluang.length}</small></div>
            <div className="meta">{peluang.filter((p) => jadiAksi.has(p.kode)).length} sudah menjadi rencana aksi</div></div>
          <div className="tile"><div className="tile-head"><span className="tile-ikon"><Zap aria-hidden="true" /></span><span className="label">Potensi penghematan</span></div>
            <div className="nilai tnum">{angka(potensiKwh / 1000, 0)}<small>MWh/tahun</small></div>
            <div className="meta">{potensiKwh ? `±${rupiahRingkas(potensi.rupiah)} · ${tonCo2(potensi.kgCo2)} per tahun` : 'Isi estimasi hemat pada peluang'}</div></div>
        </div>
      </section>

      <section>
        <SectionHead no="01" eyebrow="Klausul 4.1 & 6.1 · Isu internal dan eksternal" judul="Peta risiko dan prioritas penanganan">
          <p className="muted">Setiap titik adalah satu isu, ditempatkan menurut dampak × kemungkinan (skala 1–5). Zona hijau &lt; 8, kuning 8–14, merah ≥ 15. Klik titik atau sel untuk menyaring tabel. Sumber: Formulir Isu Internal Eksternal 001/SOP-003/KINRA/SMEn/X/2026.</p>
        </SectionHead>
        <RegisterIsu isu={isu} />
      </section>

      <section>
        <SectionHead no="02" eyebrow="Klausul 6.1 & 6.2 · Peluang peningkatan kinerja energi" judul="Dari ide menjadi penghematan">
          <p className="muted">Skor prioritas = (potensi penghematan energi + pengembalian investasi) / 2, masing-masing 1–5. Peluang di kuadran kanan atas adalah kandidat terbaik untuk rencana aksi. Sumber: Formulir Peluang Peningkatan Kinerja Energi 002/SOP-007/KINRA/SMEn/X/2026.</p>
        </SectionHead>
        <RegisterPeluang peluang={peluang} tarif={kv.tarifListrik} aksi={aksi.filter((a) => a.peluang_kode).map((a) => ({ kode: a.kode, peluang: a.peluang_kode!, status: a.status }))} />
      </section>
    </>
  )
}
