import type { ReactNode } from 'react'

export function SectionHead({ no, eyebrow, judul, children, hero }: { no?: string; eyebrow: string; judul: ReactNode; children?: ReactNode; hero?: boolean }) {
  const Tag = hero ? 'h1' : 'h2'
  return (
    <header className="section-head">
      <div className="eyebrow-row">
        {no && <span className="no">{no}</span>}
        <span className="eyebrow">{eyebrow}</span>
      </div>
      <Tag className={hero ? 'hero-title' : undefined}>{judul}</Tag>
      {children}
    </header>
  )
}
