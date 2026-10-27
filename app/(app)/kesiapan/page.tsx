import { Plus } from 'lucide-react'
import Link from 'next/link'
import { SectionHead } from '@/components/SectionHead'
import { boleh } from '@/lib/akses'
import { ambilDokumen, ambilKlausul } from '@/lib/data'
import { penggunaSaya } from '@/lib/sesi'
import { hariIni, persen } from '@/lib/format'
import { adaBukti, kesiapan, terlambat } from '@/lib/status'
import { TabelKesiapan } from './TabelKesiapan'

export const dynamic = 'force-dynamic'

export default async function Kesiapan({ searchParams }: { searchParams: Promise<{ klausul?: string; status?: string }> }) {
  const sp = await searchParams
  const [dokumen, klausul, saya] = await Promise.all([ambilDokumen(), ambilKlausul(), penggunaSaya()])
  const kini = hariIni()
  const tanpaBukti = dokumen.filter((d) => !adaBukti(d)).length

  return (
    <section>
      <div className="ks-kepala">
        <SectionHead hero eyebrow="Kesiapan audit ISO 50001:2018"
          judul={<>Kesiapan {persen(kesiapan(dokumen))}: <span className="ks-sorot">{dokumen.filter((d) => d.status === 'final').length} final</span>, {dokumen.filter((d) => terlambat(d, kini)).length} terlambat, {tanpaBukti} belum ada evidence</>}>
          <p className="muted">
            Satu baris per dokumen atau rekaman yang akan diperiksa auditor. Klik tahap status, kartu peringatan, atau klausul untuk menyaring tabel;
            riwayat perubahan status tersimpan otomatis.
          </p>
        </SectionHead>
        <div className="toolbar">
          {boleh(saya?.peran, 'dokumen.tambah') && <Link className="btn utama" href="/dokumen/baru"><Plus aria-hidden="true" /><span className="teks">Tambah dokumen</span></Link>}
        </div>
      </div>
      <TabelKesiapan dokumen={dokumen} klausul={klausul} kini={kini} klausulAwal={sp.klausul ?? ''} statusAwal={sp.status ?? ''} />
    </section>
  )
}
