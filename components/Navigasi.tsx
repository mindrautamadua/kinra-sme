'use client'

import { Activity, BookA, BookOpen, CalendarRange, ClipboardCheck, Gauge, LayoutDashboard, SearchCheck, ShieldAlert, Target, Users } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export const MENU = [
  { href: '/', label: 'Ringkasan', ikon: LayoutDashboard },
  { href: '/kesiapan', label: 'Kesiapan Audit', ikon: ClipboardCheck },
  { href: '/energi', label: 'Data Energi', ikon: Gauge },
  { href: '/kinerja', label: 'Kinerja Energi', ikon: Activity },
  { href: '/sasaran', label: 'Sasaran & Aksi', ikon: Target },
  { href: '/register', label: 'Isu & Peluang', ikon: ShieldAlert },
  { href: '/temuan', label: 'Temuan Audit', ikon: SearchCheck },
  { href: '/timeline', label: 'Timeline', ikon: CalendarRange },
  { href: '/panduan', label: 'Panduan', ikon: BookOpen },
  { href: '/glosarium', label: 'Glosarium', ikon: BookA },
]

export const MENU_ADMIN = { href: '/pengguna', label: 'Pengguna', ikon: Users }

function aktif(path: string, href: string) {
  return href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`) ||
    (href === '/kesiapan' && path.startsWith('/dokumen'))
}

export function Navigasi({ varian, admin }: { varian: 'sidebar' | 'mobile'; admin: boolean }) {
  const path = usePathname()
  const menu = admin ? [...MENU, MENU_ADMIN] : MENU
  if (varian === 'mobile') {
    return (
      <nav className="mobile-nav" aria-label="Navigasi utama">
        {menu.map((m) => (
          <Link key={m.href} href={m.href} aria-current={aktif(path, m.href) ? 'page' : undefined}>{m.label}</Link>
        ))}
      </nav>
    )
  }
  return (
    <nav className="nav" aria-label="Navigasi utama">
      {menu.map((m, i) => (
        <Link key={m.href} href={m.href} aria-current={aktif(path, m.href) ? 'page' : undefined} title={m.label}>
          <span className="no">{String(i + 1).padStart(2, '0')}</span>
          <m.ikon aria-hidden="true" />
          <span className="menu-label">{m.label}</span>
        </Link>
      ))}
    </nav>
  )
}

export function Crumb() {
  const path = usePathname()
  const m = [...MENU, MENU_ADMIN].find((x) => aktif(path, x.href))
  return <b>{m?.label ?? 'SMEn'}</b>
}
