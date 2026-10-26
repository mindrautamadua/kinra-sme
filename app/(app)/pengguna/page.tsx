import { notFound } from 'next/navigation'
import { SectionHead } from '@/components/SectionHead'
import { boleh, DAFTAR_PERAN, LABEL_PERAN, type Peran } from '@/lib/akses'
import { penggunaSaya } from '@/lib/sesi'
import { db } from '@/lib/supabase'
import { KelolaPengguna, type BarisPengguna } from './KelolaPengguna'

export const dynamic = 'force-dynamic'

export default async function Pengguna() {
  const saya = await penggunaSaya()
  if (!saya || !boleh(saya.peran, 'pengguna.kelola')) notFound()
  const { data, error } = await (await db()).rpc('daftar_pengguna')
  if (error) throw new Error(error.message)
  const daftar = (data ?? []) as BarisPengguna[]
  const per = (p: Peran) => daftar.filter((d) => d.peran === p && d.aktif).length

  return (
    <section>
      <SectionHead eyebrow="Kelola pengguna"
        judul={`${daftar.filter((d) => d.aktif).length} pengguna aktif: ${DAFTAR_PERAN.map((p) => `${per(p)} ${LABEL_PERAN[p]}`).join(', ')}`}>
        <p className="muted">
          Admin mengelola semua data dan pengguna. Konsultan mereview dan menyetujui dokumen, mencatat dan menutup temuan.
          Tim KINRA melengkapi dokumen dan evidence, mengisi data energi, dan menindaklanjuti temuan. Pengguna baru wajib mengganti sandi saat login pertama.
        </p>
      </SectionHead>
      <KelolaPengguna daftar={daftar} sayaId={saya.id} />
    </section>
  )
}
