import { CircleCheck, CircleDot, CircleX, Info, TrendingDown, TriangleAlert } from 'lucide-react'
import { chipCapaian, type KodeChip } from '@/lib/status'

const IKON = { good: CircleCheck, warn: TriangleAlert, serious: TrendingDown, crit: CircleX, na: CircleDot, info: Info }
const LABEL: Record<KodeChip, string> = { good: 'Tercapai', warn: 'Waspada', serious: 'Di bawah target', crit: 'Kritis', na: 'Tanpa target', info: '' }

export function Chip({ kode, label, capaian }: { kode?: KodeChip; label?: string; capaian?: number }) {
  const k = kode ?? (capaian !== undefined ? chipCapaian(capaian) : 'na')
  const Ikon = IKON[k]
  return (
    <span className={`chip ${k}`}>
      <Ikon aria-hidden="true" />
      {label ?? LABEL[k]}
    </span>
  )
}
