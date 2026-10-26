import { ArrowLeft, ExternalLink, FolderOpen } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Chip } from '@/components/Chip'
import { SectionHead } from '@/components/SectionHead'
import { boleh } from '@/lib/akses'
import { ambilKlausul } from '@/lib/data'
import { penggunaSaya } from '@/lib/sesi'
import { waktu } from '@/lib/format'
import { FOLDER_BUKTI, KATEGORI_TEMUAN_CHIP, KELOMPOK, STATUS, TEMUAN_STATUS_CHIP } from '@/lib/status'
import { db } from '@/lib/supabase'
import type { Dokumen, StatusDokumen, Temuan } from '@/lib/types'
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
  const [{ data: dok }, { data: riwayat }, { data: temuan }] = await Promise.all([
    s.from('dokumen_audit').select('*').eq('id', id).maybeSingle<Dokumen>(),
    s.from('riwayat_status').select('*').eq('dokumen_id', id).order('at', { ascending: false }).limit(20),
    s.from('temuan').select('*').eq('dokumen_id', id),
  ])
  if (!dok) notFound()
  const k = klausul.find((x) => x.kode === dok.klausul_kode)

  return (
    <section>
      <Link href={`/kesiapan?klausul=${encodeURIComponent(dok.klausul_kode)}`} className="btn kecil" style={{ marginBottom: 16 }}><ArrowLeft aria-hidden="true" /> Kesiapan audit</Link>
      <SectionHead eyebrow={`${dok.kode} · ${dok.klausul_kode === 'P' ? 'Persiapan awal' : `Klausul ${dok.klausul_kode} ${k?.judul ?? ''}`}`} judul={dok.nama}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip kode={STATUS[dok.status].chip} label={STATUS[dok.status].label} />
          <Chip kode="na" label={KELOMPOK[dok.kelompok]} />
        </div>
      </SectionHead>

      <div className="grid-2">
        <div className="stack">
          <div className="card">
            <div className="row">
              <div><h3>Evidence</h3><p className="muted small">Semua berkas bukti disimpan di OneDrive</p></div>
              <Chip kode={dok.link_eksternal ? 'good' : 'crit'} label={dok.link_eksternal ? 'Tautan tersedia' : 'Belum ada tautan'} />
            </div>
            {dok.link_eksternal ? (
              <a className="btn utama" href={dok.link_eksternal} target="_blank" rel="noreferrer"><ExternalLink aria-hidden="true" /> Buka evidence di OneDrive</a>
            ) : (
              <ol className="ink-2 small" style={{ paddingLeft: 18, margin: 0, lineHeight: 1.8 }}>
                <li>Unggah berkas ke folder evidence OneDrive (subfolder klausul {dok.klausul_kode === 'P' ? 'persiapan awal' : dok.klausul_kode}).</li>
                <li>Di OneDrive, pilih berkas/subfolder → Bagikan → Salin tautan.</li>
                <li>Tempel tautan di kolom <b style={{ display: 'inline' }}>Tautan evidence (OneDrive)</b>, lalu Simpan.</li>
              </ol>
            )}
            <a className="btn kecil" href={FOLDER_BUKTI} target="_blank" rel="noreferrer" style={{ marginTop: 14 }}><FolderOpen aria-hidden="true" /> Buka folder induk evidence</a>
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 10 }}>Riwayat status</h3>
            <div className="list">
              {(riwayat ?? []).map((r: { id: number; dari: StatusDokumen | null; ke: StatusDokumen; at: string; oleh?: string | null }) => (
                <div key={r.id}>
                  <span className="mono small muted" style={{ width: 130 }}>{waktu(r.at)}</span>
                  <span className="grow small">{r.dari ? `${STATUS[r.dari].label} → ` : 'Dibuat sebagai '}<b style={{ display: 'inline' }}>{STATUS[r.ke].label}</b>{r.oleh && <span className="muted"> · {r.oleh}</span>}</span>
                </div>
              ))}
            </div>
          </div>
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
