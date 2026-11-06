import { angka } from '@/lib/format'

export type KotakAset = { kode: string; nama: string; luas: number; status: 'meter' | 'inventaris' | 'tanpa'; ket: string }
type Persegi = KotakAset & { x: number; y: number; w: number; h: number }

/** Treemap squarified: luas kotak sebanding luas bangunan. */
function susun(item: KotakAset[], x: number, y: number, w: number, h: number): Persegi[] {
  const total = item.reduce((t, i) => t + i.luas, 0)
  if (!item.length || total <= 0) return []
  const skala = (w * h) / total
  const sisa = item.map((i) => ({ ...i, a: i.luas * skala }))
  const hasil: Persegi[] = []
  let [cx, cy, cw, ch] = [x, y, w, h]
  const terburuk = (baris: { a: number }[], sisi: number) => {
    const s = baris.reduce((t, r) => t + r.a, 0)
    const maks = Math.max(...baris.map((r) => r.a)), min = Math.min(...baris.map((r) => r.a))
    return Math.max((sisi * sisi * maks) / (s * s), (s * s) / (sisi * sisi * min))
  }
  while (sisa.length) {
    const sisi = Math.min(cw, ch)
    const baris = [sisa.shift()!]
    while (sisa.length && terburuk([...baris, sisa[0]], sisi) <= terburuk(baris, sisi)) baris.push(sisa.shift()!)
    const s = baris.reduce((t, r) => t + r.a, 0)
    if (cw >= ch) {
      const lebar = s / ch
      let yy = cy
      for (const r of baris) { const tinggi = r.a / lebar; hasil.push({ ...r, x: cx, y: yy, w: lebar, h: tinggi }); yy += tinggi }
      cx += lebar; cw -= lebar
    } else {
      const tinggi = s / cw
      let xx = cx
      for (const r of baris) { const lebar = r.a / tinggi; hasil.push({ ...r, x: xx, y: cy, w: lebar, h: tinggi }); xx += lebar }
      cy += tinggi; ch -= tinggi
    }
  }
  return hasil
}

export function PetaAset({ kotak }: { kotak: KotakAset[] }) {
  const L = 1000, T = 380
  const isi = susun([...kotak].filter((k) => k.luas > 0).sort((a, b) => b.luas - a.luas), 0, 0, L, T)
  return (
    <svg viewBox={`0 0 ${L} ${T}`} className="pa-svg" role="img" aria-label="Peta komposisi aset menurut luas bangunan dan status data energi">
      {isi.map((k, i) => {
        const muat = k.w > 90 && k.h > 34
        const kecil = k.w > 46 && k.h > 20
        return (
          <g key={k.kode} className={`pa-kotak s-${k.status}`} style={{ '--i': i } as React.CSSProperties}>
            <rect x={k.x + 1.5} y={k.y + 1.5} width={Math.max(0, k.w - 3)} height={Math.max(0, k.h - 3)} rx={6}>
              <title>{`${k.nama} · ${angka(k.luas, 0)} m² · ${k.ket}`}</title>
            </rect>
            {muat ? (
              <text x={k.x + 9} y={k.y + 20}>
                <tspan className="pa-nama">{k.nama.length * 6.4 > k.w - 14 ? `${k.nama.slice(0, Math.max(4, Math.floor((k.w - 14) / 6.4) - 1))}…` : k.nama}</tspan>
                <tspan x={k.x + 9} dy={15} className="pa-luas">{angka(k.luas, 0)} m²</tspan>
              </text>
            ) : kecil ? <text x={k.x + k.w / 2} y={k.y + k.h / 2} textAnchor="middle" dominantBaseline="middle" className="pa-luas">{angka(k.luas, 0)}</text> : null}
          </g>
        )
      })}
    </svg>
  )
}
