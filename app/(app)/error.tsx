'use client'

export default function Galat({ error, reset }: { error: Error; reset: () => void }) {
  const belumMigrasi = /relation .* does not exist|Could not find the table|schema cache/i.test(error.message)
  return (
    <section className="card" style={{ maxWidth: 720 }}>
      <p className="eyebrow">Galat</p>
      <h2 style={{ margin: '8px 0 12px' }}>{belumMigrasi ? 'Database belum disiapkan' : 'Data gagal dimuat'}</h2>
      <p className="ink-2">{belumMigrasi
        ? 'Tabel SMEn belum ada di Supabase. Jalankan supabase/migrations/0001_skema.sql lalu 0002_seed.sql di SQL Editor, kemudian muat ulang halaman.'
        : error.message}</p>
      <button type="button" className="btn utama" style={{ marginTop: 16 }} onClick={reset}>Coba lagi</button>
    </section>
  )
}
