import type { Metadata } from 'next'
import Image from 'next/image'
import { ambilLembarPublik } from '../actions'
import { FormLembar } from './FormLembar'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Lembar Penyelidikan Deviasi · SMEn KINRA',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

export default async function HalamanLembar({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const l = await ambilLembarPublik(token)

  return (
    <main className="lembar-publik">
      <header className="lembar-kop">
        <Image src="/logo-kinra.png" alt="KINRA Sei Mangkei" width={900} height={325} priority style={{ width: 140, height: 'auto' }} />
        <div className="muted small">Sistem Manajemen Energi ISO 50001:2018 · Klausul 9.1.1</div>
      </header>
      {l === 'migrasi' || !l ? (
        <div className="card">
          <h1 style={{ fontSize: 20 }}>Tautan tidak dapat dibuka</h1>
          <p className="muted">Tautan tidak valid, sudah diganti, atau sudah dinonaktifkan. Mintalah tautan terbaru kepada Koordinator SMEn.</p>
        </div>
      ) : (
        <FormLembar token={token} lembar={l} />
      )}
    </main>
  )
}
