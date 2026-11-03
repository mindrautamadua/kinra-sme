import { GoogleGenAI, Modality } from '@google/genai'
import { instruksiKira } from '@/lib/kira'
import { konteksDashboard } from '@/lib/konteks-ai'
import { penggunaSaya } from '@/lib/sesi'

export const dynamic = 'force-dynamic'

const KEY = process.env.GEMINI_API_KEY
const MODEL = process.env.GEMINI_LIVE_MODEL || 'gemini-3.8-live'
const SUARA = process.env.KIRA_SUARA || 'Aoede'

/**
 * Terbitkan token sementara Gemini Live untuk satu sesi suara KIRA.
 * API key tidak pernah dikirim ke browser. Model, suara, dan instruksi sistem (termasuk data dashboard
 * yang dibaca dengan sesi pengguna, jadi RLS tetap berlaku) dikunci di token sehingga browser tidak bisa mengubahnya.
 */
export async function POST() {
  const saya = await penggunaSaya()
  if (!saya) return Response.json({ pesan: 'Sesi berakhir. Silakan masuk kembali.' }, { status: 401 })
  if (!KEY) return Response.json({ pesan: 'GEMINI_API_KEY belum diisi di .env.local.' }, { status: 500 })

  let data: string
  try {
    data = await konteksDashboard()
  } catch (e) {
    data = `(Data dashboard gagal dimuat: ${(e as Error).message})`
  }

  const config = {
    responseModalities: [Modality.AUDIO],
    systemInstruction: instruksiKira('suara', saya, data),
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: SUARA } } },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    realtimeInputConfig: { automaticActivityDetection: { silenceDurationMs: 600 } },
  }

  try {
    const ai = new GoogleGenAI({ apiKey: KEY, httpOptions: { apiVersion: 'v1alpha' } })
    const kini = Date.now()
    const token = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime: new Date(kini + 30 * 60_000).toISOString(),
        newSessionExpireTime: new Date(kini + 60_000).toISOString(),
        liveConnectConstraints: { model: MODEL, config },
      },
    })
    if (!token.name) throw new Error('token kosong')
    return Response.json({ token: token.name, model: MODEL }, { headers: { 'cache-control': 'no-store' } })
  } catch (e) {
    return Response.json({ pesan: `Gemini menolak membuat sesi suara: ${(e as Error).message}` }, { status: 502 })
  }
}
