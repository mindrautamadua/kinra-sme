import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function Tile({ ikon: Ikon, label, nilai, satuan, meta, chip, progres, target }: {
  ikon: LucideIcon
  label: string
  nilai: ReactNode
  satuan?: string
  meta?: ReactNode
  chip?: ReactNode
  progres?: number
  target?: number
}) {
  return (
    <div className="tile">
      <div className="tile-head">
        <span className="tile-ikon"><Ikon aria-hidden="true" /></span>
        <span className="label">{label}</span>
        {chip}
      </div>
      <div className="nilai tnum">{nilai}{satuan && <small>{satuan}</small>}</div>
      {meta && <div className="meta">{meta}</div>}
      {progres !== undefined && (
        <div className="pg" role="img" aria-label={`${label}: ${Math.round(progres)}%${target !== undefined ? ` dari target ${target}%` : ''}`}>
          <div className={`track${target !== undefined && progres >= target ? ' over' : ''}`}>
            <b style={{ width: `${Math.min(100, Math.max(0, progres))}%` }} />
            {target !== undefined && <u style={{ left: `${target}%` }} />}
          </div>
        </div>
      )}
    </div>
  )
}
