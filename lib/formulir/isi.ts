import type { KodeChip } from '@/lib/status'
import type { IsiFormulir, Kolom, StatusFormulir, Templat } from './tipe'

export const STATUS_FORMULIR: Record<StatusFormulir, { label: string; chip: KodeChip }> = {
  draf: { label: 'Draf', chip: 'na' },
  diajukan: { label: 'Diajukan', chip: 'warn' },
  disetujui: { label: 'Disetujui', chip: 'good' },
}

/** Isian awal dari templat: salin nilai contoh, atau baris milik varian (bagian) bila dipilih. */
export function isiAwal(t: Templat, varian?: string | null): IsiFormulir {
  const v = varian ? t.varian?.find((x) => x.nama === varian) : undefined
  const kepala = Object.fromEntries(t.kepala.map((k) => [k.label, v?.kepala[k.label] ?? k.nilai]))
  const teks: Record<string, string> = {}
  const tabel: Record<string, string[][]> = {}
  for (const b of t.blok) {
    if (b.jenis === 'teks' || b.jenis === 'isian') teks[b.id] = b.teks
    else if (b.jenis === 'cek') teks[b.id] = b.nilai
    else if (b.jenis === 'tabel') tabel[b.id] = (v?.tabel[b.id] ?? b.baris).map((r) => [...r])
  }
  return { kepala, teks, tabel, ttd: t.ttd.map(() => ({ nama: '', tanggal: '' })) }
}

/** Lengkapi isian lama bila templat bertambah blok/kolom setelah isian dibuat. */
export function selaraskan(t: Templat, isi: Partial<IsiFormulir> | null | undefined): IsiFormulir {
  const awal = isiAwal(t)
  const hasil: IsiFormulir = {
    kepala: { ...awal.kepala, ...(isi?.kepala ?? {}) },
    teks: { ...awal.teks, ...(isi?.teks ?? {}) },
    tabel: {},
    ttd: t.ttd.map((_, i) => isi?.ttd?.[i] ?? { nama: '', tanggal: '' }),
  }
  for (const b of t.blok) {
    if (b.jenis !== 'tabel') continue
    const rows = isi?.tabel?.[b.id] ?? awal.tabel[b.id]
    hasil.tabel[b.id] = rows.map((r) => b.kolom.map((_, j) => r[j] ?? ''))
  }
  return hasil
}

const bil = (s: string | undefined) => {
  const v = (s ?? '').trim().replace(/\./g, '').replace(',', '.')
  const n = Number(v)
  return v !== '' && Number.isFinite(n) ? n : null
}

/** Nilai kolom rumus untuk satu baris. Kosong bila ada operand yang belum diisi. */
export function nilaiRumus(k: Kolom, baris: string[]): string {
  if (!k.rumus) return ''
  const n = k.rumus.kolom.map((i) => bil(baris[i]))
  if (n.some((x) => x === null)) return ''
  const hasil = k.rumus.op === 'kali' ? n.reduce((a, b) => a! * b!, 1)! : n.reduce((a, b) => a! + b!, 0)!
  return String(Math.round(hasil * 100) / 100).replace('.', ',')
}

/** Persentase isian yang terisi (kepala, isian, dan sel tabel non-rumus). Untuk indikator kelengkapan. */
export function kelengkapan(t: Templat, isi: IsiFormulir): number {
  let total = 0
  let terisi = 0
  const hitung = (v: string | undefined) => { total++; if ((v ?? '').trim()) terisi++ }
  t.kepala.forEach((k) => hitung(isi.kepala[k.label]))
  for (const b of t.blok) {
    if (b.jenis === 'isian') hitung(isi.teks[b.id])
    if (b.jenis === 'tabel') {
      for (const r of isi.tabel[b.id] ?? []) b.kolom.forEach((k, j) => { if (k.jenis !== 'rumus' && k.jenis !== 'cek') hitung(r[j]) })
    }
  }
  isi.ttd.forEach((x) => hitung(x.nama))
  return total ? Math.round((terisi / total) * 100) : 0
}
