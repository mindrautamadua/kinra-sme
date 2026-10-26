import Image from 'next/image'
import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="masuk">
      <div className="masuk-brand">
        <span className="lingkaran" style={{ width: 360, height: 360, right: -110, top: -120, background: '#fcaf17', opacity: 0.9 }} aria-hidden="true" />
        <span className="lingkaran" style={{ width: 240, height: 240, right: 60, top: 120, background: '#f15a22', opacity: 0.85 }} aria-hidden="true" />
        <span className="lingkaran" style={{ width: 170, height: 170, right: -30, top: 260, background: '#32a3dc', opacity: 0.9 }} aria-hidden="true" />
        <span className="logo"><Image src="/logo-kinra.png" alt="KINRA Sei Mangkei" width={900} height={325} priority /></span>
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h1>Sistem Manajemen Energi ISO 50001:2018</h1>
          <p>Monitoring kesiapan audit, data energi, dan tindak lanjut temuan PT Kawasan Industri Nusantara, KEK Sei Mangkei.</p>
        </div>
      </div>
      <div className="masuk-form">{children}</div>
    </div>
  )
}
