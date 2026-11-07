'use client'

import { Activity, Presentation, BookA, Building2, Clapperboard, Crosshair, Fan, FlaskConical, Map as IkonPeta, BookOpen, MessagesSquare, CalendarRange, ClipboardCheck, FileText, Gauge, LayoutDashboard, Network, ScanSearch, SearchCheck, ShieldAlert, Target, Users } from 'lucide-react'
import Link from 'next/link'
import { Fragment } from 'react'
import { usePathname } from 'next/navigation'
import { FITUR_FORMULIR } from '@/lib/fitur'

type ItemMenu = { href: string; label: string; ikon: typeof LayoutDashboard }
type GrupMenu = { kode: string; judul: string | null; ket?: string; item: ItemMenu[] }

/** Menu dikelompokkan mengikuti siklus PDCA ISO 50001, sama dengan Peta SMEn. */
export const GRUP_MENU: GrupMenu[] = [
  { kode: 'mulai', judul: null, item: [
    { href: '/', label: 'Ringkasan', ikon: LayoutDashboard },
    { href: '/peta', label: 'Peta SMEn', ikon: IkonPeta },
    { href: '/direksi', label: 'Ringkasan Direksi', ikon: Presentation },
  ] },
  { kode: 'plan', judul: 'Plan · Rencanakan', ket: 'Risiko, SEU, target', item: [
    { href: '/register', label: 'Isu & Peluang', ikon: ShieldAlert },
    { href: '/tinjauan', label: 'Tinjauan Energi & SEU', ikon: Crosshair },
    { href: '/sasaran', label: 'Sasaran & Aksi', ikon: Target },
  ] },
  { kode: 'do', judul: 'Do · Lakukan', ket: 'Aset, meter, program', item: [
    { href: '/aset', label: 'Aset & Meter', ikon: Building2 },
    ...(FITUR_FORMULIR ? [{ href: '/formulir', label: 'Formulir', ikon: FileText }] : []),
    { href: '/timeline', label: 'Timeline', ikon: CalendarRange },
  ] },
  { kode: 'check', judul: 'Check · Periksa', ket: 'Data & kinerja energi', item: [
    { href: '/energi', label: 'Data Energi', ikon: Gauge },
    { href: '/kinerja', label: 'Kinerja Energi', ikon: Activity },
  ] },
  { kode: 'audit', judul: 'Check · Audit', ket: 'Kesiapan & latihan audit', item: [
    { href: '/kesiapan', label: 'Kesiapan Audit', ikon: ClipboardCheck },
    { href: '/dependensi', label: 'Peta Evidence', ikon: Network },
    { href: '/auditor', label: 'Ruang Auditor', ikon: ScanSearch },
    { href: '/tanya-jawab', label: 'Tanya Jawab Audit', ikon: MessagesSquare },
  ] },
  { kode: 'act', judul: 'Act · Perbaiki', ket: 'Tindak lanjut temuan', item: [
    { href: '/temuan', label: 'Temuan Audit', ikon: SearchCheck },
  ] },
  { kode: 'bantuan', judul: 'Bantuan', item: [
    { href: '/panduan', label: 'Panduan', ikon: BookOpen },
    { href: '/glosarium', label: 'Glosarium', ikon: BookA },
    { href: '/cerita-energi', label: 'Cerita Energi KINRA', ikon: Clapperboard },
    { href: '/lab-enpi', label: 'Laboratorium EnPI', ikon: FlaskConical },
    { href: '/pompa-vsd', label: 'Simulasi Pompa & VSD', ikon: Fan },
  ] },
]

/** Daftar datar (untuk breadcrumb dan halaman lain yang butuh semua menu). */
export const MENU: ItemMenu[] = GRUP_MENU.flatMap((g) => g.item)

export const MENU_ADMIN = { href: '/pengguna', label: 'Pengguna', ikon: Users }

function aktif(path: string, href: string) {
  return href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`) ||
    (href === '/kesiapan' && path.startsWith('/dokumen'))
}

export function Navigasi({ varian, admin }: { varian: 'sidebar' | 'mobile'; admin: boolean }) {
  const path = usePathname()
  const grup = admin
    ? GRUP_MENU.map((g) => (g.kode === 'bantuan' ? { ...g, item: [...g.item, MENU_ADMIN] } : g))
    : GRUP_MENU
  if (varian === 'mobile') {
    return (
      <nav className="mobile-nav" aria-label="Navigasi utama">
        {grup.map((g) => (
          <Fragment key={g.kode}>
            {g.judul && <span className="mobile-grup" aria-hidden="true">{g.judul.split(' · ')[0]}</span>}
            {g.item.map((m) => (
              <Link key={m.href} href={m.href} aria-current={aktif(path, m.href) ? 'page' : undefined}>{m.label}</Link>
            ))}
          </Fragment>
        ))}
      </nav>
    )
  }
  let no = 0
  return (
    <nav className="nav" aria-label="Navigasi utama">
      {grup.map((g) => (
        <div key={g.kode} className={`nav-grup g-${g.kode}`} role="group" aria-label={g.judul ?? 'Mulai'}>
          {g.judul && (
            <div className="nav-grup-judul" title={g.ket}>
              <span>{g.judul}</span>
            </div>
          )}
          {g.item.map((m) => {
            no += 1
            return (
              <Link key={m.href} href={m.href} aria-current={aktif(path, m.href) ? 'page' : undefined} title={m.label}>
                <span className="no">{String(no).padStart(2, '0')}</span>
                <m.ikon aria-hidden="true" />
                <span className="menu-label">{m.label}</span>
              </Link>
            )
          })}
        </div>
      ))}
    </nav>
  )
}

export function Crumb() {
  const path = usePathname()
  const m = [...MENU, MENU_ADMIN].find((x) => aktif(path, x.href))
  return <b>{m?.label ?? 'SMEn'}</b>
}
