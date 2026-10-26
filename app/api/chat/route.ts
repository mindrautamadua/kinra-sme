import { konteksDashboard } from '@/lib/konteks-ai'
import { penggunaSaya } from '@/lib/sesi'

export const dynamic = 'force-dynamic'

const KEY = process.env.GEMINI_API_KEY
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
const MAKS_PESAN = 20
const MAKS_KARAKTER = 4000

type Pesan = { peran: 'user' | 'model'; teks: string }

const INSTRUKSI = `Anda asisten SMEn PT Kawasan Industri Nusantara (KINRA), KEK Sei Mangkei, yang membantu persiapan sertifikasi ISO 50001:2018.
Jawab dalam bahasa Indonesia, ringkas dan langsung. Gunakan teks biasa tanpa Markdown (tanpa **, #, atau tabel); untuk daftar pakai baris berawalan "- ".
Untuk pertanyaan tentang data SMEn, jawab hanya dari DATA DASHBOARD di bawah. Bila data tidak tersedia, katakan tidak ada di dashboard; jangan mengarang angka.
Untuk pertanyaan umum ISO 50001/50006 boleh memakai pengetahuan umum; sebutkan klausul bila relevan.`

export async function POST(req: Request) {
  const saya = await penggunaSaya()
  if (!saya) return Response.json({ pesan: 'Sesi berakhir. Silakan masuk kembali.' }, { status: 401 })
  if (!KEY) return Response.json({ pesan: 'GEMINI_API_KEY belum diisi di .env.local.' }, { status: 500 })

  const body = await req.json().catch(() => null) as { pesan?: Pesan[] } | null
  const riwayat = (body?.pesan ?? [])
    .filter((p) => (p.peran === 'user' || p.peran === 'model') && typeof p.teks === 'string' && p.teks.trim())
    .slice(-MAKS_PESAN)
  if (!riwayat.length || riwayat.at(-1)!.peran !== 'user') return Response.json({ pesan: 'Pertanyaan kosong.' }, { status: 400 })

  let data: string
  try {
    data = await konteksDashboard()
  } catch (e) {
    data = `(Data dashboard gagal dimuat: ${(e as Error).message})`
  }

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: `${INSTRUKSI}\n\nPengguna: ${saya.nama} (${saya.peran}).\n\n# DATA DASHBOARD\n${data}` }] },
      contents: riwayat.map((p) => ({ role: p.peran, parts: [{ text: p.teks.slice(0, MAKS_KARAKTER) }] })),
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
    }),
    signal: req.signal,
  })
  if (!res.ok || !res.body) {
    const galat = await res.json().catch(() => null) as { error?: { message?: string } } | null
    return Response.json({ pesan: `Gemini menolak permintaan: ${galat?.error?.message ?? res.statusText}` }, { status: 502 })
  }

  // Ubah SSE Gemini menjadi aliran teks polos
  const dekode = new TextDecoder()
  const kode = new TextEncoder()
  let sisa = ''
  const aliran = res.body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(potong, ctrl) {
      sisa += dekode.decode(potong, { stream: true })
      const baris = sisa.split('\n')
      sisa = baris.pop() ?? ''
      for (const b of baris) {
        if (!b.startsWith('data:')) continue
        try {
          const j = JSON.parse(b.slice(5)) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
          const teks = j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('')
          if (teks) ctrl.enqueue(kode.encode(teks))
        } catch { /* baris tidak lengkap diabaikan */ }
      }
    },
  }))
  return new Response(aliran, { headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } })
}
