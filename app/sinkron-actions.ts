'use server'

import { revalidatePath } from 'next/cache'
import { cekAkses } from '@/lib/sesi'
import { type Pratinjau, pratinjauRegister, terapkanRegister } from '@/lib/sinkron-register'

/** Pratinjau sinkron register isu & peluang dari berkas formulir upload. Hanya membaca. */
export async function pratinjauSinkron(): Promise<{ ok: true; data: Pratinjau } | { ok: false; pesan: string }> {
  const t = await cekAkses('register.ubah')
  if (t) return { ok: false, pesan: t }
  try { return { ok: true, data: await pratinjauRegister() } }
  catch (e) { return { ok: false, pesan: (e as Error).message } }
}

/** Tulis sumber yang dipilih ke register. Admin saja karena bisa menghapus banyak baris sekaligus (dijaga di aplikasi; RLS delete isu/peluang sejak 0079 juga mengizinkan konsultan & Tim KINRA). */
export async function terapkanSinkron(kunci: string[]): Promise<{ ok: true; ringkas: string } | { ok: false; pesan: string }> {
  const t = await cekAkses('register.sinkron')
  if (t) return { ok: false, pesan: t }
  if (!kunci.length) return { ok: false, pesan: 'Pilih minimal satu sumber.' }
  try {
    const r = await terapkanRegister(kunci)
    revalidatePath('/register'); revalidatePath('/ruang-mrti'); revalidatePath('/peta')
    return r
  } catch (e) { return { ok: false, pesan: (e as Error).message } }
}
