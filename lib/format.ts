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

/**
 * Semua tanggal & jam ditampilkan dalam WIB (Asia/Jakarta), apa pun zona waktu server (Vercel = UTC) atau browser.
 * Tanggal tanpa jam ('YYYY-MM-DD') diperlakukan sebagai tanggal kalender apa adanya.
 */
const ZONA = 'Asia/Jakarta'
const fmtWib = new Intl.DateTimeFormat('en-CA', { timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })

/** Komponen tanggal & jam WIB dari sebuah Date. */
export function bagianWib(d: Date): { tahun: number; bulan: number; hari: number; jam: number; menit: number } {
  const p = Object.fromEntries(fmtWib.formatToParts(d).map((x) => [x.type, x.value]))
  return { tahun: Number(p.year), bulan: Number(p.month), hari: Number(p.day), jam: Number(p.hour), menit: Number(p.minute) }
}

const isoTanggal = (t: number, b: number, h: number) => `${t}-${String(b).padStart(2, '0')}-${String(h).padStart(2, '0')}`

export function tanggal(v: string | Date | null | undefined, opsi: 'pendek' | 'panjang' = 'pendek'): string {
  if (!v) return '–'
  let t: number, b: number, h: number
  const polos = typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.exec(v)
  if (polos) {
    [t, b, h] = (v as string).split('-').map(Number)
  } else {
    const d = typeof v === 'string' ? new Date(v) : v
    if (Number.isNaN(d.getTime())) return '–'
    ;({ tahun: t, bulan: b, hari: h } = bagianWib(d))
  }
  return `${h} ${(opsi === 'panjang' ? BULAN_PANJANG : BULAN)[b - 1]} ${t}`
}

export function waktu(v: string | null | undefined): string {
  if (!v) return '–'
  const d = new Date(v)
  if (Number.isNaN(d.getTime())) return '–'
  const w = bagianWib(d)
  return `${tanggal(d)} ${String(w.jam).padStart(2, '0')}.${String(w.menit).padStart(2, '0')}`
}

/** Tanggal hari ini menurut WIB, format 'YYYY-MM-DD'. */
export function hariIni(): string {
  const w = bagianWib(new Date())
  return isoTanggal(w.tahun, w.bulan, w.hari)
}

/**
 * Selisih hari kalender (WIB) dari `kini` ke `v`. Positif = di masa depan.
 * `kini` boleh 'YYYY-MM-DD' atau Date (diambil tanggal WIB-nya); bawaan hari ini WIB.
 */
export function selisihHari(v: string, kini: string | Date = hariIni()): number {
  const k = typeof kini === 'string' ? kini.slice(0, 10) : (() => { const w = bagianWib(kini); return isoTanggal(w.tahun, w.bulan, w.hari) })()
  return Math.round((Date.parse(`${v.slice(0, 10)}T00:00:00Z`) - Date.parse(`${k}T00:00:00Z`)) / 86_400_000)
}
