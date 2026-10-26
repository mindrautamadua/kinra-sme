import Link from 'next/link'

export default function TidakAda() {
  return (
    <section className="card" style={{ maxWidth: 560 }}>
      <p className="eyebrow">404</p>
      <h2 style={{ margin: '8px 0 12px' }}>Halaman tidak ditemukan</h2>
      <Link className="btn utama" href="/">Kembali ke ringkasan</Link>
    </section>
  )
}
