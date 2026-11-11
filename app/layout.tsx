import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import './globals.css'

// Font disimpan lokal (subset latin dari Google Fonts). next/font/google di Turbopack 16.4 gagal membaca URL
// Nunito Sans yang kini berformat /l/font?kit=…&skey=… ("next/font/google queries have exactly one entry").
// Nunito Sans adalah font variabel: satu berkas melayani bobot 400–700.
const sans = localFont({ src: './fonts/nunito-sans-latin.woff2', weight: '400 700', variable: '--font-sans', display: 'swap' })
const mono = localFont({
  src: [
    { path: './fonts/ibm-plex-mono-400.woff2', weight: '400' },
    { path: './fonts/ibm-plex-mono-500.woff2', weight: '500' },
    { path: './fonts/ibm-plex-mono-600.woff2', weight: '600' },
  ],
  variable: '--font-mono', display: 'swap',
})

export const metadata: Metadata = {
  title: 'SMEn KINRA',
  description: 'Dashboard Sistem Manajemen Energi ISO 50001:2018 PT Kawasan Industri Nusantara',
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const tema = (await cookies()).get('kinra_tema')?.value
  return (
    <html lang="id" data-theme={tema === 'light' || tema === 'dark' ? tema : undefined} className={`${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
