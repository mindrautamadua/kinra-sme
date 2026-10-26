import type { Metadata } from 'next'
import { IBM_Plex_Mono, Nunito_Sans } from 'next/font/google'
import { cookies } from 'next/headers'
import type { ReactNode } from 'react'
import './globals.css'

const sans = Nunito_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-sans' })
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-mono' })

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
