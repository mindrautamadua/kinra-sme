import { redirect } from 'next/navigation'
import { boleh } from '@/lib/akses'
import { penggunaSaya } from '@/lib/sesi'
import { FormGantiSandi } from './FormGantiSandi'

export default async function GantiSandi() {
  const saya = await penggunaSaya()
  if (!saya) redirect('/masuk')
  if (!boleh(saya.peran, 'sandi.ganti')) redirect('/')
  return <FormGantiSandi nama={saya.nama} wajib={saya.wajib_ganti_sandi} />
}
