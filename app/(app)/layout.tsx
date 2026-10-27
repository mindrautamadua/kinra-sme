import { KeyRound, LogOut } from 'lucide-react'
import { cookies } from 'next/headers'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'
import { keluar } from '@/app/actions'
import { Chatbot } from '@/components/Chatbot'
import { Chip } from '@/components/Chip'
import { Crumb, Navigasi } from '@/components/Navigasi'
import { PeranProvider } from '@/components/Peran'
import { SidebarToggle } from '@/components/SidebarToggle'
import { TemaToggle } from '@/components/TemaToggle'
import { Ungkap } from '@/components/Ungkap'
import { boleh, LABEL_PERAN } from '@/lib/akses'
import { hariIni, selisihHari, tanggal } from '@/lib/format'
import { penggunaSaya } from '@/lib/sesi'
import { TONGGAK } from '@/lib/status'
import { db } from '@/lib/supabase'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const saya = await penggunaSaya()
  if (!saya) redirect('/masuk')
  if (saya.wajib_ganti_sandi) redirect('/ganti-sandi')

  const ciut = (await cookies()).get('kinra_sidebar')?.value === 'ciut'
  const kini = hariIni()
  const { error: galatDb } = await (await db()).from('klausul').select('kode', { head: true, count: 'exact' })
  const berikut = TONGGAK.filter((t) => t.tanggal >= kini).sort((a, b) => a.tanggal.localeCompare(b.tanggal))[0]

  return (
    <PeranProvider peran={saya.peran}>
      <div className="progress-top" aria-hidden="true" />
      <div className="aurora" aria-hidden="true"><i /><i /><i /></div>
      <div className="shell" data-ciut={ciut || undefined}>
        <aside className="sidebar" id="sidebar">
          <div className="brand">
            <svg className="motif" viewBox="0 0 92 92" aria-hidden="true">
              <circle cx="56" cy="36" r="30" fill="#fcaf17" opacity=".9" />
              <circle cx="40" cy="52" r="22" fill="#f15a22" opacity=".85" />
              <circle cx="66" cy="62" r="16" fill="#32a3dc" opacity=".9" />
            </svg>
            <span className="brand-logo"><Image src="/logo-kinra.png" alt="KINRA Sei Mangkei" width={900} height={325} priority /></span>
            <b>KINRA</b>
            <span className="brand-sub">Sistem Manajemen Energi</span>
          </div>
          <Navigasi varian="sidebar" admin={boleh(saya.peran, 'pengguna.kelola')} />
          <div className="side-card">
            <span className="eyebrow">Standar</span>
            <b>ISO 50001:2018</b>
            <p className="muted small">KEK Sei Mangkei · Sertifikasi 2026</p>
          </div>
        </aside>
        <div className="main">
          <header className="topbar">
            <SidebarToggle awalCiut={ciut} />
            <div className="crumbs"><span>SMEn</span><span aria-hidden="true">/</span><Crumb /></div>
            <div className="spacer" />
            {berikut && (
              <span className="live" title={`${berikut.nama}, ${tanggal(berikut.tanggal, 'panjang')}`}>
                <i aria-hidden="true" />
                <span className="teks">{berikut.nama}:</span>
                <b className="tnum">{selisihHari(berikut.tanggal) === 0 ? 'hari ini' : `${selisihHari(berikut.tanggal)} hari lagi`}</b>
              </span>
            )}
            <div className="akun">
              <span className="akun-nama"><b>{saya.nama}</b><Chip kode="info" label={LABEL_PERAN[saya.peran]} /></span>
              <Link href="/ganti-sandi?dari=menu" className="btn btn-ikon" aria-label="Ganti sandi" title="Ganti sandi"><KeyRound aria-hidden="true" /></Link>
              <form action={keluar}><button type="submit" className="btn btn-ikon" aria-label="Keluar" title="Keluar"><LogOut aria-hidden="true" /></button></form>
            </div>
            <TemaToggle />
          </header>
          <Navigasi varian="mobile" admin={boleh(saya.peran, 'pengguna.kelola')} />
          <main className="konten">
            {galatDb ? (
              <section className="card" style={{ maxWidth: 760 }}>
                <p className="eyebrow">Penyiapan</p>
                <h2 style={{ margin: '8px 0 12px' }}>Database SMEn belum siap</h2>
                <p className="ink-2">Supabase menjawab: <span className="mono small">{galatDb.message}</span></p>
                <ol className="ink-2" style={{ paddingLeft: 18, lineHeight: 1.8 }}>
                  <li>Buka Supabase Studio → SQL Editor.</li>
                  <li>Jalankan migrasi di <span className="mono">supabase/migrations</span> sesuai urutan nomor.</li>
                  <li>Muat ulang halaman ini.</li>
                </ol>
              </section>
            ) : children}
          </main>
        </div>
      </div>
      <Ungkap />
      {!galatDb && <Chatbot />}
    </PeranProvider>
  )
}
