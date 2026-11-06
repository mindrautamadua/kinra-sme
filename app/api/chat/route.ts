import { butuhTanyaJawab, instruksiKira } from '@/lib/kira'
import { konteksDashboard } from '@/lib/konteks-ai'
import { penggunaSaya } from '@/lib/sesi'

export const dynamic = 'force-dynamic'

const KEY = process.env.GEMINI_API_KEY
// gemini-2.5-flash ditolak API untuk kunci baru (Nov 2026); atur GEMINI_MODEL di .env.local untuk mengganti
const MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview'
const MAKS_PESAN = 20
const MAKS_KARAKTER = 4000

type Pesan = { peran: 'user' | 'model'; teks: string }


export async function POST(req: Request) {
  const saya = await penggunaSaya()
  if (!saya) return Response.json({ pesan: 'Sesi berakhir. Silakan masuk kembali.' }, { status: 401 })
  if (!KEY) return Response.json({ pesan: 'GEMINI_API_KEY belum diisi di .env.local.' }, { status: 500 })

  const body = await req.json().catch(() => null) as { pesan?: Pesan[] } | null
  const riwayat = (body?.pesan ?? [])
    .filter((p) => (p.peran === 'user' || p.peran === 'model') && typeof p.teks === 'string' && p.teks.trim())
    .slice(-MAKS_PESAN)
  if (!riwayat.length || riwayat.at(-1)!.peran !== 'user') return Response.json({ pesan: 'Pertanyaan kosong.' }, { status: 400 })

  // Materi tanya jawab audit (~9 ribu token) hanya dikirim bila pertanyaan relevan
  const materi = butuhTanyaJawab(riwayat)
  let data: string
  try {
    data = await konteksDashboard({ tanyaJawab: materi })
  } catch (e) {
    data = `(Data dashboard gagal dimuat: ${(e as Error).message})`
  }

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: instruksiKira('teks', saya, data, materi) }] },
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
