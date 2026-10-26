'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { gantiSandi } from '@/app/actions'

export function FormGantiSandi({ nama, wajib }: { nama: string; wajib: boolean }) {
  const [hasil, aksi, menunggu] = useActionState(gantiSandi, undefined)
  return (
    <form action={aksi}>
      <div>
        <p className="eyebrow">Akun · {nama}</p>
        <h2 style={{ marginTop: 6 }}>Ganti sandi</h2>
        <p className="muted small" style={{ marginTop: 6 }}>
          {wajib ? 'Sandi Anda masih sandi sementara. Buat sandi baru sebelum melanjutkan.' : 'Minimal 8 karakter. Sesi di perangkat lain akan diakhiri.'}
        </p>
      </div>
      <label className="field"><span>Sandi saat ini</span><input type="password" name="lama" autoComplete="current-password" required /></label>
      <label className="field"><span>Sandi baru</span><input type="password" name="baru" autoComplete="new-password" minLength={8} required /></label>
      <label className="field"><span>Ulangi sandi baru</span><input type="password" name="ulang" autoComplete="new-password" minLength={8} required /></label>
      {hasil?.pesan && <p className="pesan galat" role="alert">{hasil.pesan}</p>}
      <button className="btn-masuk" type="submit" disabled={menunggu}>{menunggu ? 'Menyimpan…' : 'Simpan sandi baru'}</button>
      {!wajib && <Link href="/" className="muted small">Batal, kembali ke dashboard</Link>}
    </form>
  )
}
