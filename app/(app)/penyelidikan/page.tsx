import { SectionHead } from '@/components/SectionHead'
import { boleh } from '@/lib/akses'
import { ambilLembar } from '@/lib/data'
import { penggunaSaya } from '@/lib/sesi'
import { DaftarLembar } from './DaftarLembar'

export const dynamic = 'force-dynamic'

export default async function Penyelidikan() {
  const saya = await penggunaSaya()
  if (!boleh(saya?.peran, 'penyelidikan.kelola')) {
    return (
      <section>
        <SectionHead eyebrow="Klausul 9.1.1 · Penyelidikan deviasi" judul="Halaman ini untuk Tim SMEn" />
        <p className="muted">Lembar penyelidikan dan tautan PIC hanya dapat dibuka oleh admin, konsultan, dan Tim KINRA.</p>
      </section>
    )
  }
  const { lembar, siap } = await ambilLembar()
  const dijawab = lembar.filter((l) => l.status === 'Dijawab' || l.status === 'Ditinjau').length

  return (
    <section>
      <SectionHead eyebrow="Klausul 9.1.1 · Penyelidikan deviasi signifikan kinerja energi"
        judul={siap ? `${dijawab} dari ${lembar.length} lembar penyelidikan sudah dijawab PIC` : 'Lembar penyelidikan belum aktif'}>
        <p className="muted">Setiap lembar berisi data deviasi, dugaan awal Tim SMEn, dan pertanyaan untuk PIC. Salin tautan khusus dan kirim ke PIC lewat WhatsApp atau email; PIC mengisi tanpa login dan jawabannya tersimpan di sini. Setelah ditinjau, rangkum penyebab dan tanggapan di register deviasi pada halaman Kinerja Energi.</p>
      </SectionHead>
      {!siap
        ? <div className="card"><p>Jalankan migrasi <code>0075_lembar_penyelidikan.sql</code> di Supabase SQL Editor, lalu muat ulang halaman ini.</p></div>
        : <DaftarLembar lembar={lembar} />}
    </section>
  )
}
