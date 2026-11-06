/**
 * Diagram Sankey sederhana 3 kolom (sumber → simpul → tujuan) dalam SVG, dengan arus beranimasi.
 * Lebar pita sebanding nilai. Tanpa state, dapat dirender di server.
 */
export type SimpulSankey = { id: string; label: string; kolom: 0 | 1 | 2; warna?: string; catatan?: string }
export type TautanSankey = { dari: string; ke: string; nilai: number; warna?: string }

const L = 920, T = 360, LEBAR_SIMPUL = 14, CELAH = 10, TEPI = 150, SLOT_MIN = 32

export function Sankey({ simpul, tautan, format, label }: { simpul: SimpulSankey[]; tautan: TautanSankey[]; format: (v: number) => string; label: string }) {
  const nilai = (id: string) => Math.max(
    tautan.filter((t) => t.dari === id).reduce((s, t) => s + t.nilai, 0),
    tautan.filter((t) => t.ke === id).reduce((s, t) => s + t.nilai, 0),
  )
  const kolom = [0, 1, 2].map((k) => simpul.filter((s) => s.kolom === k))
  const totalKolom = kolom.map((ns) => ns.reduce((s, n) => s + nilai(n.id), 0))
  const maks = Math.max(...totalKolom, 1)
  // Simpul kecil mendapat ruang minimal agar labelnya tidak bertumpuk; sisanya dibagi sebanding nilai
  const ruang = T - 40 - Math.max(...kolom.map((ns) => ns.length * (CELAH + SLOT_MIN)))
  const skala = Math.max(ruang, T * 0.45) / maks
  const xKolom = [TEPI, L / 2 - LEBAR_SIMPUL / 2, L - TEPI - LEBAR_SIMPUL]

  // Posisi simpul: ditumpuk vertikal, dipusatkan per kolom; simpul kecil tetap terlihat (min 2px)
  const pos = new Map<string, { x: number; y: number; h: number }>()
  kolom.forEach((ns, k) => {
    const slot = (n: SimpulSankey) => Math.max(SLOT_MIN, Math.max(2, nilai(n.id) * skala))
    const tinggi = ns.reduce((s, n) => s + slot(n), 0) + CELAH * (ns.length - 1)
    let y = Math.max(24, (T - tinggi) / 2)
    for (const n of ns) {
      const h = Math.max(2, nilai(n.id) * skala)
      pos.set(n.id, { x: xKolom[k], y: y + (slot(n) - h) / 2, h })
      y += slot(n) + CELAH
    }
  })

  const keluar = new Map<string, number>(), masuk = new Map<string, number>()
  const pita = tautan.filter((t) => t.nilai > 0 && pos.has(t.dari) && pos.has(t.ke)).map((t, i) => {
    const a = pos.get(t.dari)!, b = pos.get(t.ke)!
    const tebal = Math.max(1.5, t.nilai * skala)
    const y0 = a.y + (keluar.get(t.dari) ?? 0) + tebal / 2
    const y1 = b.y + (masuk.get(t.ke) ?? 0) + tebal / 2
    keluar.set(t.dari, (keluar.get(t.dari) ?? 0) + tebal)
    masuk.set(t.ke, (masuk.get(t.ke) ?? 0) + tebal)
    const x0 = a.x + LEBAR_SIMPUL, x1 = b.x, mx = (x0 + x1) / 2
    return { ...t, i, tebal, d: `M${x0},${y0} C${mx},${y0} ${mx},${y1} ${x1},${y1}` }
  })

  const warna = (id: string) => simpul.find((s) => s.id === id)?.warna ?? 'var(--s3)'
  return (
    <svg viewBox={`0 0 ${L} ${T}`} className="sk-svg" role="img" aria-label={label}>
      {pita.map((p) => (
        <g key={p.i} className="sk-pita" style={{ '--w': p.warna ?? warna(p.dari), '--i': p.i } as React.CSSProperties}>
          <path d={p.d} strokeWidth={p.tebal} className="dasar"><title>{`${simpul.find((s) => s.id === p.dari)?.label} → ${simpul.find((s) => s.id === p.ke)?.label}: ${format(p.nilai)}`}</title></path>
          <path d={p.d} strokeWidth={Math.max(1, Math.min(p.tebal * 0.35, 6))} className="arus" />
        </g>
      ))}
      {simpul.map((s) => {
        const p = pos.get(s.id)
        if (!p) return null
        const kiri = s.kolom === 0, tengah = s.kolom === 1
        const tx = kiri ? p.x - 8 : tengah ? p.x + LEBAR_SIMPUL / 2 : p.x + LEBAR_SIMPUL + 8
        const ty = tengah ? p.y - 22 : p.y + p.h / 2 - 6
        return (
          <g key={s.id} className="sk-simpul">
            <rect x={p.x} y={p.y} width={LEBAR_SIMPUL} height={p.h} rx={3} style={{ fill: s.warna ?? 'var(--s3)' }} />
            <text x={tx} y={ty} textAnchor={kiri ? 'end' : tengah ? 'middle' : 'start'} dominantBaseline="middle">
              <tspan className="sk-label">{s.label}</tspan>
              <tspan x={tx} dy={14} className="sk-nilai">{format(nilai(s.id))}{s.catatan ? ` · ${s.catatan}` : ''}</tspan>
            </text>
          </g>
        )
      })}
    </svg>
  )
}
