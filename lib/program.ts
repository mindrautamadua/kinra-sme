/**
 * Progres program pendampingan untuk laporan kesiapan: rencana vs realisasi (kurva-S), jalur kritis,
 * keterlambatan beserta dampaknya ke klausul/dokumen, dan PICA. Sumber: data Timeline (tabel kegiatan).
 */
import { keadaan } from './kegiatan'
import { siapAudit } from './status'
import type { Dokumen, Kegiatan } from './types'

export type BarisProgram = {
  k: Kegiatan
  mulai: string
  rencana: string        // tanggal sesi terakhir = rencana selesai
  realisasi: string | null
  status: ReturnType<typeof keadaan>
  terlambat: number      // hari lewat dari rencana, 0 bila tidak terlambat
}

export type Dampak = { kegiatan: BarisProgram; klausul: string[]; dokumen: Dokumen[] }
export type Pica = { no: number; nama: string; masalah: string; tindakan: string; pic: string | null; tenggat: string | null; otomatis: boolean }

const hari = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000
const isoDari = (n: number) => new Date(n * 86_400_000).toISOString().slice(0, 10)

export function susunProgram(kegiatan: Kegiatan[], dokumen: Dokumen[], kini: string, batas: { stage1: string; stage2: string }) {
  const baris: BarisProgram[] = kegiatan
    .filter((k) => k.sesi.length)
    .map((k) => {
      const t = k.sesi.map((s) => s.tanggal).sort()
      const status = keadaan(k, kini)
      const realisasi = status === 'selesai' ? (k.selesai_at?.slice(0, 10) ?? t.at(-1)!) : null
      const terlambat = status !== 'selesai' && t.at(-1)! < kini ? Math.round(hari(kini) - hari(t.at(-1)!)) : 0
      return { k, mulai: t[0], rencana: t.at(-1)!, realisasi, status, terlambat }
    })
    .sort((a, b) => a.rencana.localeCompare(b.rencana))

  const total = baris.length
  const selesai = baris.filter((b) => b.status === 'selesai').length
  const rencanaKini = baris.filter((b) => b.rencana <= kini).length
  const terlambat = baris.filter((b) => b.terlambat > 0)

  // Kurva-S: kumulatif rencana dan realisasi per hari, dari sesi pertama sampai rencana terakhir
  const awal = baris.length ? baris.reduce((m, b) => (b.mulai < m ? b.mulai : m), baris[0].mulai) : kini
  const akhir = baris.length ? baris.reduce((m, b) => (b.rencana > m ? b.rencana : m), kini) : kini
  const kurva: { tanggal: string; rencana: number; realisasi: number | null }[] = []
  for (let d = hari(awal); d <= hari(akhir); d++) {
    const iso = isoDari(d)
    kurva.push({
      tanggal: iso,
      rencana: total ? (baris.filter((b) => b.rencana <= iso).length / total) * 100 : 0,
      realisasi: iso <= kini ? (total ? (baris.filter((b) => b.realisasi && b.realisasi <= iso).length / total) * 100 : 0) : null,
    })
  }

  // Jalur kritis: kegiatan belum selesai yang dijadwalkan sampai Stage 2
  const jalur = baris.filter((b) => b.status !== 'selesai' && b.rencana <= batas.stage2)
    .map((b) => ({ ...b, sebelumS1: b.rencana <= batas.stage1, sisaHari: Math.round(hari(b.rencana) - hari(kini)) }))

  // Dampak keterlambatan: klausul dan dokumen terkait yang belum siap audit
  const dampak: Dampak[] = terlambat.map((b) => ({
    kegiatan: b,
    klausul: b.k.klausul ?? [],
    dokumen: dokumen.filter((d) => (b.k.dokumen_kode ?? []).includes(d.kode) && !siapAudit(d)),
  }))

  // PICA: kegiatan dengan kendala tercatat, atau terlambat (masalah otomatis)
  const pica: Pica[] = baris
    .filter((b) => b.k.kendala || b.terlambat > 0)
    .map((b) => ({
      no: b.k.no, nama: b.k.nama,
      masalah: b.k.kendala ?? `Lewat ${b.terlambat} hari dari jadwal (${b.rencana}) dan belum ditandai selesai.`,
      tindakan: b.k.tindak_lanjut ?? 'Konfirmasi pelaksanaan; bila belum terlaksana, tetapkan jadwal ulang dan dampaknya ke tonggak audit.',
      pic: b.k.tindak_pic ?? null, tenggat: b.k.tindak_tenggat ?? null, otomatis: !b.k.kendala && !b.k.tindak_lanjut,
    }))
    .sort((a, b) => Number(a.otomatis) - Number(b.otomatis))

  return {
    baris, total, selesai, rencanaKini, terlambat, kurva, jalur, dampak, pica,
    persenRealisasi: total ? (selesai / total) * 100 : 0,
    persenRencana: total ? (rencanaKini / total) * 100 : 0,
  }
}
