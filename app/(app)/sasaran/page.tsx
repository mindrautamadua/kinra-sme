import { SectionHead } from '@/components/SectionHead'
import { ambilKinerja, ambilPeluang, ambilSasaran } from '@/lib/data'
import { ringkas } from '@/lib/enpi'
import { hariIni } from '@/lib/format'
import { DaftarSasaran, type Capaian } from './DaftarSasaran'

export const dynamic = 'force-dynamic'

export default async function SasaranPage() {
  const [{ sasaran, aksi }, { hasil }, peluang] = await Promise.all([ambilSasaran(), ambilKinerja(), ambilPeluang()])
  const kini = hariIni()

  // Capaian: perbaikan EnPI pada tahun target dibanding target perbaikan sasaran
  const capaian: Record<number, Capaian> = {}
  for (const s of sasaran) {
    const h = hasil.find((x) => x.enpi.kode === s.enpi_kode)
    if (!h || !s.tahun_target) continue
    const r = ringkas(h.laporan.filter((t) => t.tahun === s.tahun_target))
    capaian[s.id] = {
      enpi: h.enpi.nama, satuan: h.satuan, bulan: r.bulan, perbaikan: r.perbaikan, hemat: r.hemat,
      persenTarget: r.perbaikan !== null && s.target_persen ? (r.perbaikan / s.target_persen) * 100 : null,
      galat: h.galat,
    }
  }

  const aktif = sasaran.filter((s) => s.status === 'Aktif')
  const terukur = aktif.filter((s) => capaian[s.id]?.persenTarget != null)
  const onTrack = terukur.filter((s) => capaian[s.id].persenTarget! >= 100).length

  return (
    <section>
      <SectionHead eyebrow="Klausul 6.2 · Sasaran, target energi & rencana aksi"
        judul={sasaran.length
          ? `${aktif.length} sasaran aktif, ${onTrack} dari ${terukur.length} yang terukur sudah memenuhi target`
          : 'Belum ada sasaran energi'}>
        <p className="muted">
          Setiap sasaran sebaiknya terhubung ke EnPI dengan target terukur dan tahun target, lalu dijabarkan ke rencana aksi (apa, siapa, sumber daya, kapan, cara verifikasi hasil).
          Penghematan aksi dicatat setelah diverifikasi dengan data meter, bukan dari estimasi.
        </p>
      </SectionHead>
      <DaftarSasaran sasaran={sasaran} aksi={aksi} capaian={capaian} kini={kini}
        enpi={hasil.map((h) => ({ kode: h.enpi.kode, nama: h.enpi.nama }))}
        peluang={peluang.map((p) => ({ kode: p.kode, uraian: p.uraian, status: p.status, estimasi_kwh: p.estimasi_kwh, pemilik: p.pemilik }))} />
    </section>
  )
}
