import { ArrowLeft, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Chip } from '@/components/Chip'
import { SectionHead } from '@/components/SectionHead'
import { ambilTemplat, daftarIsian } from '@/lib/formulir/data'
import { STATUS_FORMULIR } from '@/lib/formulir/isi'
import { DOKUMEN_TEMPLAT, TABEL_TERTAUT } from '@/lib/formulir/tautan'
import { waktu } from '@/lib/format'
import { db } from '@/lib/supabase'
import { BuatIsian } from './BuatIsian'

export const dynamic = 'force-dynamic'

export default async function HalamanTemplat({ params }: { params: Promise<{ kode: string }> }) {
  const { kode } = await params
  const t = ambilTemplat(kode)
  if (!t) notFound()
  const [isian, { data: dok }] = await Promise.all([
    daftarIsian(kode),
    DOKUMEN_TEMPLAT[t.kode] ? (await db()).from('dokumen_audit').select('id, kode, nama').eq('kode', DOKUMEN_TEMPLAT[t.kode]).limit(1) : Promise.resolve({ data: [] }),
  ])
  const tabel = t.blok.filter((b) => b.jenis === 'tabel').length
  const adaPeriode = t.kepala.some((k) => /^periode$/i.test(k.label))

  return (
    <section>
      <Link href="/formulir" className="btn kecil" style={{ marginBottom: 16 }}><ArrowLeft aria-hidden="true" /> Semua formulir</Link>
      <SectionHead eyebrow={`Klausul ${t.klausul.join(', ')}${t.nomor ? ` · ${t.nomor}` : ''}`} judul={t.judul}>
        <p className="muted">
          {t.subjudul && <>{t.subjudul}. </>}
          {tabel} tabel isian{t.varian?.length ? `, templat per bagian untuk ${t.varian.length} bagian` : ''}. Sumber: <span className="mono small">formulir/{t.sumber}</span>
        </p>
        {TABEL_TERTAUT[t.kode] && (
          <p className="pesan info" style={{ marginTop: 10 }}>
            Sebagian tabel formulir ini diambil dari data aplikasi, bukan diketik ulang:{' '}
            {TABEL_TERTAUT[t.kode].map((x, i) => <span key={x.tabel}>{i > 0 && ', '}<Link href={x.href}>{x.sumber}</Link></span>)}.
            Ubah datanya di halaman tersebut, lalu muat ulang ke isian.
          </p>
        )}
        {(t.tautan || (dok?.length ?? 0) > 0) && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 10 }}>
            {t.tautan && <Link href={t.tautan.href} className="btn kecil"><ExternalLink aria-hidden="true" /> Data terkait: {t.tautan.label}</Link>}
            {(dok ?? []).map((d: { id: string; kode: string; nama: string }) => (
              <Link key={d.id} href={`/dokumen/${d.id}`} className="btn kecil"><ExternalLink aria-hidden="true" /> Kesiapan Audit: {d.kode} {d.nama}</Link>
            ))}
          </div>
        )}
      </SectionHead>

      <div className="grid-1-2">
        <div className="card">
          <h3 style={{ marginBottom: 6 }}>Isian baru</h3>
          <p className="muted small" style={{ marginBottom: 14 }}>
            Isian baru langsung berisi baris contoh dari formulir asli. Ubah, hapus, atau tambah baris sesuai kondisi KINRA.
          </p>
          <BuatIsian kode={t.kode} varian={(t.varian ?? []).map((v) => v.nama)} adaPeriode={adaPeriode}
            sumber={isian.map((i) => ({ id: i.id, judul: i.judul }))} />
        </div>

        <div className="card">
          <div className="row"><div><h3>Isian</h3><p className="muted small">{isian.length ? `${isian.length} isian, terbaru di atas` : 'Belum ada isian untuk formulir ini.'}</p></div></div>
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Judul</th><th>Status</th><th>Terakhir diubah</th></tr></thead>
              <tbody>
                {isian.length === 0 && <tr className="kosong"><td colSpan={3}>Buat isian pertama di panel kiri.</td></tr>}
                {isian.map((i) => (
                  <tr key={i.id}>
                    <td><Link className="judul" href={`/formulir/isian/${i.id}`}>{i.judul}</Link>
                      <span className="upd">{[i.varian, i.periode].filter(Boolean).join(' · ') || 'Dibuat'} oleh {i.dibuat_oleh ?? '–'}</span></td>
                    <td><Chip kode={STATUS_FORMULIR[i.status].chip} label={STATUS_FORMULIR[i.status].label} />
                      {i.disetujui_oleh && <span className="upd">{i.disetujui_oleh}</span>}</td>
                    <td className="small">{waktu(i.diubah_at)}<span className="upd">{i.diubah_oleh ?? ''}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  )
}
