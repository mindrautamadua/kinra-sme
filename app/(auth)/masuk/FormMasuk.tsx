'use client'

import { useActionState } from 'react'
import { masuk } from '@/app/actions'

export function FormMasuk({ lanjut }: { lanjut: string }) {
  const [hasil, aksi, menunggu] = useActionState(masuk, undefined)
  return (
    <form action={aksi}>
      <div>
        <p className="eyebrow">Masuk</p>
        <h2 style={{ marginTop: 6 }}>Dashboard SMEn</h2>
        <p className="muted small" style={{ marginTop: 6 }}>Gunakan akun yang diberikan admin SMEn.</p>
      </div>
      <input type="hidden" name="lanjut" value={lanjut} />
      <label className="field"><span>Email</span><input type="email" name="email" autoComplete="username" required autoFocus /></label>
      <label className="field"><span>Sandi</span><input type="password" name="sandi" autoComplete="current-password" required /></label>
      {hasil?.pesan && <p className="pesan galat" role="alert">{hasil.pesan}</p>}
      <button className="btn-masuk" type="submit" disabled={menunggu}>{menunggu ? 'Memeriksa…' : 'Masuk'}</button>
      <p className="muted small">Lupa sandi? Hubungi admin SMEn untuk mengatur ulang.</p>
    </form>
  )
}
