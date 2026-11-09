'use server'

import { revalidatePath } from 'next/cache'
import { ambilAsetMeter, ambilDeviasi, ambilDokumen, ambilIsu, ambilKinerja, ambilSasaran, ambilSeu, ambilTemuan } from '@/lib/data'
import { deteksiDeviasi, gabungDeviasi, terbuka } from '@/lib/deviasi'
import { hariIni } from '@/lib/format'
import { boleh } from '@/lib/akses'
import { penggunaSaya } from '@/lib/sesi'
import { type HasilSoal, type ModeSimulasi, type Prediksi, type Soal, LABEL_MODE, susunCelah, susunSoal } from '@/lib/simulasi'
import { db } from '@/lib/supabase'
import { UNIT_AUDIT } from '@/lib/tanya-jawab'

const KEY = process.env.GEMINI_API_KEY
// gemini-2.5-flash ditolak API untuk kunci baru (Nov 2026); atur GEMINI_MODEL di .env.local untuk mengganti
const MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview'
const MAKS_JAWABAN = 3000

type Gagal = { ok: false; pesan: string }

/** Susun soal simulasi untuk satu unit: bank soal + celah nyata dari data aplikasi. */
export async function mulaiSimulasi(unitNo: number, mode: ModeSimulasi, jumlah: number): Promise<{ ok: true; soal: Soal[]; celah: number } | Gagal> {
  if (!(await penggunaSaya())) return { ok: false, pesan: 'Sesi berakhir. Silakan masuk kembali.' }
  if (!UNIT_AUDIT.some((u) => u.no === unitNo)) return { ok: false, pesan: 'Unit tidak dikenal.' }
  if (mode !== 'stage1' && mode !== 'stage2') return { ok: false, pesan: 'Mode tidak dikenal.' }
  const n = Math.min(10, Math.max(3, Math.round(jumlah)))
  const [dokumen, { seu }, kinerja, { meter, bacaan }, register, temuan, { sasaran }, isu] = await Promise.all([
    ambilDokumen(), ambilSeu(), ambilKinerja(), ambilAsetMeter(), ambilDeviasi(), ambilTemuan(), ambilSasaran(), ambilIsu(),
  ])
  const deviasi = gabungDeviasi(deteksiDeviasi(kinerja.hasil), register).baris.filter((x) => terbuka(x.r))
  const celah = susunCelah({ dokumen, seu, hasil: kinerja.hasil, meter, bacaan, deviasi, temuan, sasaran, isu, kini: hariIni() })
  const soal = susunSoal(unitNo, mode, n, celah)
  return { ok: true, soal, celah: soal.filter((s) => s.sumber === 'celah').length }
}

type Nilai = { skor: number; alasan: string; bukti_kurang: string; lanjut: string | null }

/** Nilai satu jawaban auditee dengan Gemini (keluaran JSON terstruktur, skala 0–3). */
export async function nilaiJawaban(unitNo: number, mode: ModeSimulasi, soal: Soal, jawaban: string, sudahLanjut: boolean): Promise<({ ok: true } & Nilai) | Gagal> {
  const saya = await penggunaSaya()
  if (!saya) return { ok: false, pesan: 'Sesi berakhir. Silakan masuk kembali.' }
  if (!KEY) return { ok: false, pesan: 'GEMINI_API_KEY belum diisi di .env.local.' }
  const unit = UNIT_AUDIT.find((u) => u.no === unitNo)
  const teks = jawaban.trim().slice(0, MAKS_JAWABAN)
  if (!unit) return { ok: false, pesan: 'Unit tidak dikenal.' }
  if (!teks) return { ok: false, pesan: 'Jawaban masih kosong.' }

  const instruksi = [
    'Anda adalah KIRA yang berperan sebagai auditor sertifikasi ISO 50001:2018 (gaya TÜV) yang tegas, adil, dan berbasis bukti.',
    `Auditee: unit ${unit.nama} (${unit.kelompok}) PT Kawasan Industri Nusantara (KINRA). Tahap audit: ${LABEL_MODE[mode]}.`,
    'Nilai jawaban auditee terhadap pertanyaan dengan rubrik:',
    '0 = tidak menjawab, keliru, atau mengelak; 1 = menjawab sebagian tanpa menyebut bukti; 2 = memadai dan menyebut bukti yang relevan; 3 = meyakinkan: bukti spesifik (nama dokumen, rekaman, data, tanggal, PIC) dan konsisten dengan acuan.',
    soal.sumber === 'celah'
      ? 'Pertanyaan ini disusun dari celah nyata di data aplikasi. Jawaban yang mengklaim sudah memenuhi tanpa menyebut bukti spesifik maksimal skor 1. Jawaban jujur yang mengakui celah dan menyebut rencana konkret (PIC, tenggat) boleh skor 1–2.'
      : 'Acuan berasal dari materi audit internal; jawaban tidak harus sama kata per kata, nilai substansinya.',
    'Tulis alasan singkat (maks 2 kalimat), dan bukti yang masih kurang (maks 1 kalimat) dalam bahasa Indonesia.',
    sudahLanjut ? 'Jangan ajukan pertanyaan lanjutan (isi lanjut dengan null).'
      : 'Bila skor 0 atau 1, ajukan SATU pertanyaan lanjutan khas auditor untuk menggali bukti (mis. "Bisa tunjukkan…?"); bila skor ≥ 2 isi lanjut dengan null.',
  ].join('\n')
  const isi = `Pertanyaan: ${soal.tanya}\nKlausul: ${soal.klausul.join(', ')}\nAcuan: ${soal.acuan}\nBukti yang diharapkan: ${soal.bukti}\n\nJawaban auditee:\n${teks}`

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: instruksi }] },
      contents: [{ role: 'user', parts: [{ text: isi }] }],
      generationConfig: {
        temperature: 0.2, maxOutputTokens: 1024, responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            skor: { type: 'INTEGER' }, alasan: { type: 'STRING' }, bukti_kurang: { type: 'STRING' },
            lanjut: { type: 'STRING', nullable: true },
          },
          required: ['skor', 'alasan', 'bukti_kurang'],
        },
      },
    }),
  }).catch((e: Error) => ({ ok: false, statusText: e.message, json: async () => null }) as unknown as Response)
  if (!res.ok) {
    const galat = await res.json().catch(() => null) as { error?: { message?: string } } | null
    return { ok: false, pesan: `KIRA gagal menilai: ${galat?.error?.message ?? res.statusText}` }
  }
  const j = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  try {
    const n = JSON.parse(j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '') as Nilai
    const skor = Math.max(0, Math.min(3, Math.round(Number(n.skor) || 0)))
    return { ok: true, skor, alasan: String(n.alasan ?? ''), bukti_kurang: String(n.bukti_kurang ?? ''), lanjut: !sudahLanjut && skor <= 1 && n.lanjut ? String(n.lanjut) : null }
  } catch {
    return { ok: false, pesan: 'Jawaban KIRA tidak dapat dibaca. Coba nilai ulang.' }
  }
}

/** Simpan hasil simulasi ke riwayat (migrasi 0029). */
export async function simpanSimulasi(d: { unitNo: number; mode: ModeSimulasi; hasil: HasilSoal[]; prediksi: Prediksi[] }): Promise<{ ok: true } | Gagal> {
  const saya = await penggunaSaya()
  if (!saya) return { ok: false, pesan: 'Sesi berakhir. Silakan masuk kembali.' }
  if (!boleh(saya.peran, 'simulasi.simpan')) return { ok: false, pesan: 'Akun pembaca tidak dapat menyimpan hasil simulasi.' }
  const unit = UNIT_AUDIT.find((u) => u.no === d.unitNo)
  if (!unit || !d.hasil.length) return { ok: false, pesan: 'Data simulasi tidak lengkap.' }
  const { error } = await (await db()).from('simulasi_audit').insert({
    unit_no: unit.no, unit_nama: unit.nama, mode: d.mode, jumlah: d.hasil.length,
    skor: d.hasil.reduce((t, h) => t + h.skor, 0), skor_maks: d.hasil.length * 3,
    prediksi: d.prediksi,
    jawaban: d.hasil.map((h) => ({ tanya: h.soal.tanya, sumber: h.soal.sumber, klausul: h.soal.klausul, jawaban: h.jawaban.slice(0, MAKS_JAWABAN), skor: h.skor, alasan: h.alasan, bukti: h.bukti })),
  })
  revalidatePath('/tanya-jawab')
  if (error?.code === 'PGRST205' || error?.code === '42P01') return { ok: false, pesan: 'Tabel riwayat belum ada. Jalankan migrasi 0029_simulasi_audit.sql di Supabase.' }
  return error ? { ok: false, pesan: error.message } : { ok: true }
}
