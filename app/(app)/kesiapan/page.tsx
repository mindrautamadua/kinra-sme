import { FileText, Plus } from 'lucide-react'
import Link from 'next/link'
import { SectionHead } from '@/components/SectionHead'
import { boleh } from '@/lib/akses'
import { ambilDokumen, ambilKlausul } from '@/lib/data'
import { penggunaSaya } from '@/lib/sesi'
import { hariIni, persen } from '@/lib/format'
import { adaBukti, kesiapan, siapAudit } from '@/lib/status'
import { TabelKesiapan } from './TabelKesiapan'

export const dynamic = 'force-dynamic'

export default async function Kesiapan({ searchParams }: { searchParams: Promise<{ klausul?: string }> }) {
  const sp = await searchParams
  const [dokumen, klausul, saya] = await Promise.all([ambilDokumen(), ambilKlausul(), penggunaSaya()])
  const kini = hariIni()
  const tanpaBukti = dokumen.filter((d) => !adaBukti(d)).length
  const nSiap = dokumen.filter(siapAudit).length

  return (
    <section>
      <div className="ks-kepala">
        <SectionHead hero eyebrow="Kesiapan audit ISO 50001:2018"
          judul={<>Siap audit {persen(kesiapan(dokumen))}: <span className="ks-sorot">{nSiap} dokumen Final dengan berkas sah</span>, {dokumen.length - tanpaBukti - nSiap} masih draf/belum sah, {tanpaBukti} belum ada evidence</>}>
          <p className="muted">
            Satu baris per dokumen atau rekaman yang akan diperiksa auditor. Dokumen dihitung siap audit bila berstatus Final dan punya minimal satu berkas bertanda versi sah (PDF yang disahkan/ditandatangani, atau rekaman yang lengkap). Klik kartu atau klausul untuk menyaring tabel.
          </p>
        </SectionHead>
        <div className="toolbar">
          <Link className="btn" href="/kesiapan/cetak"><FileText aria-hidden="true" /><span className="teks">Cetak laporan</span></Link>
          {boleh(saya?.peran, 'dokumen.tambah') && <Link className="btn utama" href="/dokumen/baru"><Plus aria-hidden="true" /><span className="teks">Tambah dokumen</span></Link>}
        </div>
      </div>
      <TabelKesiapan dokumen={dokumen} klausul={klausul} kini={kini} klausulAwal={sp.klausul ?? ''} />
    </section>
  )
}
