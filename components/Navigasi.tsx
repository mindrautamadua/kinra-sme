'use client'

import { Activity, BookA, Building2, Crosshair, Map as IkonPeta, BookOpen, MessagesSquare, CalendarRange, ClipboardCheck, FileText, Gauge, LayoutDashboard, Network, ScanSearch, SearchCheck, ShieldAlert, Target, Users } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { FITUR_FORMULIR } from '@/lib/fitur'

export const MENU = [
  { href: '/', label: 'Ringkasan', ikon: LayoutDashboard },
  { href: '/peta', label: 'Peta SMEn', ikon: IkonPeta },
  { href: '/kesiapan', label: 'Kesiapan Audit', ikon: ClipboardCheck },
  { href: '/dependensi', label: 'Peta Evidence', ikon: Network },
  { href: '/auditor', label: 'Ruang Auditor', ikon: ScanSearch },
  { href: '/tanya-jawab', label: 'Tanya Jawab Audit', ikon: MessagesSquare },
  ...(FITUR_FORMULIR ? [{ href: '/formulir', label: 'Formulir', ikon: FileText }] : []),
  { href: '/energi', label: 'Data Energi', ikon: Gauge },
  { href: '/aset', label: 'Aset & Meter', ikon: Building2 },
  { href: '/tinjauan', label: 'Tinjauan Energi & SEU', ikon: Crosshair },
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
