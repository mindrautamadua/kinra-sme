const nf = (d: number) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: d })

export const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
export const BULAN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

const kosong = (v: number | null | undefined): v is null | undefined => v === null || v === undefined || Number.isNaN(v)

export function angka(v: number | null | undefined, desimal = 0): string {
  return kosong(v) ? '–' : nf(desimal).format(v)
}

export function persen(v: number | null | undefined, desimal = 1): string {
  return kosong(v) ? '–' : `${nf(desimal).format(v)}%`
}

export function delta(v: number | null | undefined, desimal = 1): string {
  if (kosong(v)) return '–'
  const s = nf(desimal).format(Math.abs(v))
  return v > 0 ? `+${s}%` : v < 0 ? `−${s}%` : `${s}%`
}

/** kWh ringkas: 1.234.567 -> "1,23 GWh" */
export function energiListrik(kwh: number | null | undefined): string {
  if (kosong(kwh)) return '–'
  if (kwh >= 1e6) return `${nf(2).format(kwh / 1e6)} GWh`
  if (kwh >= 1e3) return `${nf(1).format(kwh / 1e3)} MWh`
  return `${nf(0).format(kwh)} kWh`
}

export function tanggal(v: string | Date | null | undefined, opsi: 'pendek' | 'panjang' = 'pendek'): string {
  if (!v) return '–'
  const d = typeof v === 'string' ? new Date(v.length === 10 ? `${v}T00:00:00` : v) : v
  if (Number.isNaN(d.getTime())) return '–'
  const b = opsi === 'panjang' ? BULAN_PANJANG[d.getMonth()] : BULAN[d.getMonth()]
  return `${d.getDate()} ${b} ${d.getFullYear()}`
}

export function waktu(v: string | null | undefined): string {
  if (!v) return '–'
  const d = new Date(v)
  return `${tanggal(d)} ${String(d.getHours()).padStart(2, '0')}.${String(d.getMinutes()).padStart(2, '0')}`
}

/** Selisih hari kalender dari hari ini (zona waktu lokal). Positif = di masa depan. */
export function selisihHari(v: string, kini = new Date()): number {
  const a = new Date(`${v}T00:00:00`)
  const b = new Date(kini.getFullYear(), kini.getMonth(), kini.getDate())
  return Math.round((a.getTime() - b.getTime()) / 86_400_000)
}

export function hariIni(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
