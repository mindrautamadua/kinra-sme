import { ChevronRight, FileText } from 'lucide-react'
import Link from 'next/link'
import { Chip } from '@/components/Chip'
import { SectionHead } from '@/components/SectionHead'
import { ambilKlausul } from '@/lib/data'
import { daftarTemplat, rekapIsian } from '@/lib/formulir/data'
import { waktu } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function Formulir() {
  const [templat, { rekap, migrasi }, klausul] = await Promise.all([daftarTemplat(), rekapIsian(), ambilKlausul()])

  const perKode = new Map<string, { total: number; draf: number; diajukan: number; disetujui: number; terakhir: string | null }>()
  for (const r of rekap) {
    const x = perKode.get(r.templat_kode) ?? { total: 0, draf: 0, diajukan: 0, disetujui: 0, terakhir: null }
    x.total++; x[r.status]++
    if (!x.terakhir || r.diubah_at > x.terakhir) x.terakhir = r.diubah_at
    perKode.set(r.templat_kode, x)
  }
  const terisi = templat.filter((t) => (perKode.get(t.kode)?.total ?? 0) > 0).length
  const disetujui = templat.filter((t) => (perKode.get(t.kode)?.disetujui ?? 0) > 0).length

  // kelompokkan per klausul utama (4–10)
  const grup = new Map<string, typeof templat>()
  for (const t of templat) {
    const induk = t.klausul[0].split('.')[0]
    grup.set(induk, [...(grup.get(induk) ?? []), t])
  }
  const judulInduk = (k: string) => klausul.find((x) => x.kode === k)?.judul ?? `Klausul ${k}`

  return (
    <section>
      <SectionHead no="01" eyebrow="Formulir SMEn · isi langsung di aplikasi"
        judul={`${templat.length} formulir, ${terisi} sudah mulai diisi, ${disetujui} sudah disetujui`}>
        <p className="muted">Setiap formulir berasal dari dokumen implementasi SMEn KINRA (folder <span className="mono">formulir/</span>). Buka formulir, buat isian, lalu isi tabel dan kolomnya. Alurnya: <b>Draf</b>, lalu <b>Diajukan</b>, lalu <b>Disetujui</b> oleh admin atau konsultan. Setiap isian bisa dicetak atau disimpan sebagai PDF.</p>
      </SectionHead>

      {migrasi && (
        <p className="pesan" role="alert" style={{ marginBottom: 16 }}>
          Tabel formulir belum ada. Jalankan <span className="mono">supabase/migrations/0011_formulir.sql</span> di Supabase SQL Editor, lalu muat ulang halaman.
        </p>
      )}

      <div className="stack">
        {[...grup.entries()].map(([induk, daftar]) => (
          <div key={induk} className="card">
            <div className="row" style={{ marginBottom: 6 }}>
              <div><span className="eyebrow">Klausul {induk}</span><h3>{judulInduk(induk)}</h3></div>
            </div>
            <div className="list">
              {daftar.map((t) => {
                const r = perKode.get(t.kode)
                return (
                  <Link key={t.kode} href={`/formulir/${t.kode}`} className="list-item fm-item">
                    <span className="fm-ikon" aria-hidden="true"><FileText /></span>
                    <span className="grow">
                      <b>{t.judul}</b>
                      <span className="muted small">
                        {t.klausul.join(', ')}{t.nomor && <> · <span className="mono">{t.nomor}</span></>}
                        {t.varian.length > 0 && <> · {t.varian.length} bagian</>}
                        {r?.terakhir && <> · diubah {waktu(r.terakhir)}</>}
                      </span>
                    </span>
                    <span className="fm-status">
                      {!r && <Chip kode="na" label="Belum diisi" />}
                      {r && r.disetujui > 0 && <Chip kode="good" label={`${r.disetujui} disetujui`} />}
                      {r && r.diajukan > 0 && <Chip kode="warn" label={`${r.diajukan} diajukan`} />}
                      {r && r.draf > 0 && <Chip kode="info" label={`${r.draf} draf`} />}
                    </span>
                    <ChevronRight aria-hidden="true" className="muted" style={{ width: 16, height: 16, flex: 'none' }} />
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
