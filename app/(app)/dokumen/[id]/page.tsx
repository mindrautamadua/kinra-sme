import { ArrowLeft, FileText } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Chip } from '@/components/Chip'
import { SectionHead } from '@/components/SectionHead'
import { boleh } from '@/lib/akses'
import { ambilBerkas, ambilKlausul } from '@/lib/data'
import { penggunaSaya } from '@/lib/sesi'
import { waktu } from '@/lib/format'
import { KATEGORI_TEMUAN_CHIP, KELOMPOK, TEMUAN_STATUS_CHIP } from '@/lib/status'
import { ambilTemplat } from '@/lib/formulir/data'
import { STATUS_FORMULIR } from '@/lib/formulir/isi'
import { templatUntukDokumen } from '@/lib/formulir/tautan'
import type { StatusFormulir } from '@/lib/formulir/tipe'
import { db } from '@/lib/supabase'
import type { Dokumen, Temuan } from '@/lib/types'
import { EvidenceBerkas } from './EvidenceBerkas'
import { FormDokumen } from './FormDokumen'

export const dynamic = 'force-dynamic'

export default async function HalamanDokumen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const klausul = await ambilKlausul()

  if (id === 'baru') {
    if (!boleh((await penggunaSaya())?.peran, 'dokumen.tambah')) notFound()
    return (
      <section>
        <Link href="/kesiapan" className="btn kecil" style={{ marginBottom: 16 }}><ArrowLeft aria-hidden="true" /> Kesiapan audit</Link>
        <SectionHead eyebrow="Dokumen baru" judul="Tambah dokumen atau rekaman audit" />
        <div className="card"><FormDokumen dokumen={null} klausul={klausul} /></div>
      </section>
    )
  }

  if (!/^[0-9a-f-]{36}$/.test(id)) notFound()
  const s = await db()
  const [{ data: dok }, { data: temuan }, { berkas, migrasi }] = await Promise.all([
    s.from('dokumen_audit').select('*').eq('id', id).maybeSingle<Dokumen>(),
    s.from('temuan').select('*').eq('dokumen_id', id),
    ambilBerkas(id),
  ])
  if (!dok) notFound()
  const k = klausul.find((x) => x.kode === dok.klausul_kode)
  const templat = templatUntukDokumen(dok.kode).map((kode) => ambilTemplat(kode)).filter((x) => x !== null)
  const { data: isian } = templat.length
    ? await s.from('formulir_isian').select('id, templat_kode, judul, status, diubah_at').in('templat_kode', templat.map((x) => x.kode)).order('diubah_at', { ascending: false })
    : { data: [] }
  const daftarIsian = (isian ?? []) as { id: string; templat_kode: string; judul: string; status: StatusFormulir; diubah_at: string }[]
  const disetujui = daftarIsian.filter((x) => x.status === 'disetujui').length

  return (
    <section>
      <Link href={`/kesiapan?klausul=${encodeURIComponent(dok.klausul_kode)}`} className="btn kecil" style={{ marginBottom: 16 }}><ArrowLeft aria-hidden="true" /> Kesiapan audit</Link>
      <SectionHead eyebrow={`${dok.kode} · ${dok.klausul_kode === 'P' ? 'Persiapan awal' : `Klausul ${dok.klausul_kode} ${k?.judul ?? ''}`}`} judul={dok.nama}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip kode={berkas.length + disetujui ? 'good' : 'crit'} label={berkas.length + disetujui ? 'Ada evidence' : 'Belum ada evidence'} />
          <Chip kode="na" label={KELOMPOK[dok.kelompok]} />
        </div>
      </SectionHead>

      <div className="grid-2">
        <div className="stack">
          <div className="card" id="evidence">
            <div className="row">
              <div><h3>Evidence</h3><p className="muted small">Klik berkas untuk melihatnya langsung di aplikasi</p></div>
              <Chip kode={berkas.length ? 'good' : 'crit'} label={berkas.length ? `${berkas.length} berkas` : 'Belum ada evidence'} />
            </div>
            <EvidenceBerkas dokumenId={dok.id} berkas={berkas} migrasi={migrasi} />
          </div>
          {templat.length > 0 && (
            <div className="card" id="formulir">
              <div className="row">
                <div><h3>Formulir di aplikasi</h3><p className="muted small">Isian yang disetujui dihitung sebagai evidence dokumen ini.</p></div>
                <Chip kode={disetujui ? 'good' : daftarIsian.length ? 'warn' : 'na'} label={disetujui ? `${disetujui} disetujui` : daftarIsian.length ? 'Belum disetujui' : 'Belum diisi'} />
              </div>
              <div className="list">
                {templat.map((tp) => (
                  <Link key={tp.kode} href={`/formulir/${tp.kode}`} className="list-item">
                    <FileText aria-hidden="true" style={{ width: 16, height: 16, flex: 'none' }} />
                    <span className="grow"><b>{tp.judul}</b><span className="muted small">Klausul {tp.klausul.join(', ')} · buat atau buka isian</span></span>
                  </Link>
                ))}
                {daftarIsian.map((x) => (
                  <Link key={x.id} href={`/formulir/isian/${x.id}`} className="list-item">
                    <span className="mono small muted" style={{ width: 130 }}>{waktu(x.diubah_at)}</span>
                    <span className="grow small">{x.judul}</span>
                    <Chip kode={STATUS_FORMULIR[x.status].chip} label={STATUS_FORMULIR[x.status].label} />
                  </Link>
                ))}
              </div>
            </div>
          )}
          {(temuan?.length ?? 0) > 0 && (
            <div className="card">
              <h3 style={{ marginBottom: 10 }}>Temuan audit terkait</h3>
              <div className="list">
                {(temuan as Temuan[]).map((t) => (
                  <Link key={t.id} href={`/temuan#${t.nomor}`} className="list-item">
                    <span className="mono small">{t.nomor}</span>
                    <span className="grow"><b>{t.uraian}</b></span>
                    <Chip kode={KATEGORI_TEMUAN_CHIP[t.kategori]} label={t.kategori} />
                    <Chip kode={TEMUAN_STATUS_CHIP[t.status]} label={t.status} />
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 14 }}>Detail dokumen</h3>
          <FormDokumen dokumen={dok} klausul={klausul} />
          <p className="sumber">Terakhir diubah {waktu(dok.diubah_at)}</p>
        </div>
      </div>
    </section>
  )
}
