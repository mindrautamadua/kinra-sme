import { energiListrik, persen } from '@/lib/format'
import type { PenggunaEnergi } from '@/lib/tinjauan'

/** Grafik Pareto: batang konsumsi per pengguna energi + garis kumulatif + ambang kumulatif. Tanpa state. */
export function ParetoGrafik({ daftar, ambangKumulatif }: { daftar: PenggunaEnergi[]; ambangKumulatif: number }) {
  const L = 900, T = 300, KIRI = 56, KANAN = 48, ATAS = 20, BAWAH = 54
  const n = Math.max(1, daftar.length)
  const lebar = (L - KIRI - KANAN) / n
  const tinggi = T - ATAS - BAWAH
  const maks = Math.max(1, ...daftar.map((p) => p.kwh))
  const y = (v: number) => ATAS + tinggi - (v / maks) * tinggi
  const yPersen = (p: number) => ATAS + tinggi - (p / 100) * tinggi
  const titik = daftar.map((p, i) => ({ x: KIRI + lebar * (i + 0.5), y: yPersen(p.kumulatif) }))
  const potong = (s: string) => (s.length > 16 ? `${s.slice(0, 15)}…` : s)

  return (
    <svg viewBox={`0 0 ${L} ${T}`} className="tp-svg" role="img"
      aria-label={`Pareto pengguna energi: ${daftar.map((p) => `${p.nama} ${persen(p.porsi)}`).join(', ')}`}>
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line x1={KIRI} x2={L - KANAN} y1={yPersen(g)} y2={yPersen(g)} className="tp-grid" />
          <text x={L - KANAN + 8} y={yPersen(g)} dominantBaseline="middle" className="tp-ax">{g}%</text>
        </g>
      ))}
      <line x1={KIRI} x2={L - KANAN} y1={yPersen(ambangKumulatif)} y2={yPersen(ambangKumulatif)} className="tp-ambang" />
      <text x={L - KANAN - 6} y={yPersen(ambangKumulatif) + 14} textAnchor="end" className="tp-ambang-t">ambang kumulatif {ambangKumulatif}%</text>
      {daftar.map((p, i) => {
        const x = KIRI + lebar * i + lebar * 0.18
        const w = lebar * 0.64
        return (
          <g key={p.id} className={`tp-batang${p.kandidat ? ' kandidat' : ''}${p.seu ? ' seu' : ''}`} style={{ '--i': i } as React.CSSProperties}>
            <rect x={x} y={y(p.kwh)} width={w} height={Math.max(1, ATAS + tinggi - y(p.kwh))} rx={4}>
              <title>{`${p.nama}: ${energiListrik(p.kwh)}/bulan · ${persen(p.porsi)} · kumulatif ${persen(p.kumulatif)}`}</title>
            </rect>
            <text x={x + w / 2} y={y(p.kwh) - 6} textAnchor="middle" className="tp-nilai">{persen(p.porsi, 0)}</text>
            <text x={x + w / 2} y={ATAS + tinggi + 16} textAnchor="middle" className="tp-nama">{potong(p.nama)}</text>
            <text x={x + w / 2} y={ATAS + tinggi + 30} textAnchor="middle" className="tp-sub">{p.dasar === 'meter' ? 'meter' : p.dasar === 'inventaris' ? 'perkiraan' : 'data BBM'}</text>
          </g>
        )
      })}
      <polyline points={titik.map((t) => `${t.x},${t.y}`).join(' ')} className="tp-kumulatif" pathLength={100} />
      {titik.map((t, i) => <circle key={i} cx={t.x} cy={t.y} r={4} className="tp-titik" style={{ '--i': i } as React.CSSProperties} />)}
      <text x={KIRI - 10} y={ATAS + tinggi / 2} transform={`rotate(-90 ${KIRI - 10} ${ATAS + tinggi / 2})`} textAnchor="middle" className="tp-ax">konsumsi/bulan</text>
    </svg>
  )
}
