'use client'

import { GoogleGenAI, type LiveServerMessage, Modality, type Session } from '@google/genai'

/**
 * Sesi suara dua arah KIRA lewat Gemini Live API.
 * Mikrofon → PCM 16 kHz mono (AudioWorklet) → WebSocket; balasan PCM 24 kHz diputar berurutan.
 * Saat pengguna memotong (server mengirim `interrupted`), antrean suara KIRA langsung dihentikan.
 */

export type KeadaanSuara = 'menghubungkan' | 'mendengar' | 'berbicara' | 'selesai'

export type PanggilanSuara = {
  keadaan: (k: KeadaanSuara) => void
  transkrip: (peran: 'user' | 'model', teks: string) => void
  galat: (pesan: string) => void
}

const LAJU_MASUK = 16_000
const LAJU_KELUAR = 24_000

// Turunkan laju sampel ke 16 kHz dengan rata-rata blok, kirim potongan 100 ms sebagai Int16.
const WORKLET = `
class MikKira extends AudioWorkletProcessor {
  constructor() { super(); this.r = sampleRate / ${LAJU_MASUK}; this.p = 0; this.s = 0; this.c = 0; this.o = new Int16Array(${LAJU_MASUK / 10}); this.n = 0 }
  process(inputs) {
    const x = inputs[0] && inputs[0][0]
    if (!x) return true
    for (let k = 0; k < x.length; k++) {
      this.s += x[k]; this.c++; this.p += 1
      if (this.p >= this.r) {
        this.p -= this.r
        const v = Math.max(-1, Math.min(1, this.s / this.c))
        this.s = 0; this.c = 0
        this.o[this.n++] = v < 0 ? v * 0x8000 : v * 0x7fff
        if (this.n === this.o.length) { this.port.postMessage(this.o.buffer, [this.o.buffer]); this.o = new Int16Array(${LAJU_MASUK / 10}); this.n = 0 }
      }
    }
    return true
  }
}
registerProcessor('mik-kira', MikKira)
`

function keBase64(buf: ArrayBuffer): string {
  const b = new Uint8Array(buf)
  let s = ''
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000))
  return btoa(s)
}

function dariBase64(data: string): Float32Array<ArrayBuffer> {
  const biner = atob(data)
  const n = biner.length >> 1
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) {
    const v = biner.charCodeAt(i * 2) | (biner.charCodeAt(i * 2 + 1) << 8)
    out[i] = (v >= 0x8000 ? v - 0x10000 : v) / 0x8000
  }
  return out
}

export class SesiSuara {
  private sesi: Session | null = null
  private stream: MediaStream | null = null
  private ctxMasuk: AudioContext | null = null
  private ctxKeluar: AudioContext | null = null
  private node: AudioWorkletNode | null = null
  private keluar: GainNode | null = null
  private sumber = new Set<AudioBufferSourceNode>()
  private berikut = 0
  private ditutup = false
  private bisu = false
  private keadaanKini: KeadaanSuara = 'menghubungkan'
  analisMasuk: AnalyserNode | null = null
  analisKeluar: AnalyserNode | null = null

  constructor(private cb: PanggilanSuara) {}

  private set(k: KeadaanSuara) {
    if (this.keadaanKini === k || this.ditutup) return
    this.keadaanKini = k
    this.cb.keadaan(k)
  }

  async mulai() {
    this.cb.keadaan('menghubungkan')
    try {
      // AudioContext dibuat selagi masih dalam klik pengguna agar tidak ditahan kebijakan autoplay (Safari).
      this.ctxKeluar = new AudioContext({ sampleRate: LAJU_KELUAR })
      this.ctxMasuk = new AudioContext()
      void this.ctxKeluar.resume()
      void this.ctxMasuk.resume()
      // Minta izin mikrofon lebih dulu agar penolakan terlihat sebelum token dibuat.
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
      if (this.ditutup) return this.bersihkan()

      const res = await fetch('/api/kira/token', { method: 'POST' })
      if (res.redirected) throw new Error('Sesi berakhir. Silakan masuk kembali.')
      const j = (await res.json().catch(() => null)) as { token?: string; model?: string; pesan?: string } | null
      if (!res.ok || !j?.token || !j.model) throw new Error(j?.pesan ?? 'KIRA tidak dapat dihubungi.')
      if (this.ditutup) return this.bersihkan()

      // Keluaran
      this.keluar = this.ctxKeluar.createGain()
      this.analisKeluar = this.ctxKeluar.createAnalyser()
      this.analisKeluar.fftSize = 256
      this.keluar.connect(this.analisKeluar).connect(this.ctxKeluar.destination)

      // Masukan
      const url = URL.createObjectURL(new Blob([WORKLET], { type: 'text/javascript' }))
      await this.ctxMasuk.audioWorklet.addModule(url)
      URL.revokeObjectURL(url)
      const src = this.ctxMasuk.createMediaStreamSource(this.stream)
      this.analisMasuk = this.ctxMasuk.createAnalyser()
      this.analisMasuk.fftSize = 256
      this.node = new AudioWorkletNode(this.ctxMasuk, 'mik-kira')
      src.connect(this.analisMasuk)
      src.connect(this.node)

      const ai = new GoogleGenAI({ apiKey: j.token, httpOptions: { apiVersion: 'v1alpha' } })
      this.sesi = await ai.live.connect({
        model: j.model,
        config: { responseModalities: [Modality.AUDIO], inputAudioTranscription: {}, outputAudioTranscription: {} },
        callbacks: {
          onmessage: (m) => this.pesan(m),
          onerror: () => this.cb.galat('Koneksi suara KIRA terputus.'),
          onclose: (e) => {
            if (this.ditutup) return
            this.cb.galat(e.code === 1000 ? 'Sesi suara berakhir.' : `Sesi suara ditutup: ${e.reason || `kode ${e.code}`}`)
            this.tutup()
          },
        },
      })
      if (this.ditutup) return this.bersihkan()

      this.node.port.onmessage = (e: MessageEvent<ArrayBuffer>) => {
        if (this.bisu || !this.sesi) return
        this.sesi.sendRealtimeInput({ audio: { data: keBase64(e.data), mimeType: `audio/pcm;rate=${LAJU_MASUK}` } })
      }
      // KIRA menyapa lebih dulu
      this.sesi.sendRealtimeInput({ text: 'Sapa saya singkat sebagai KIRA dan tanyakan apa yang bisa dibantu.' })
      this.set('mendengar')
    } catch (e) {
      const err = e as Error
      this.cb.galat(err.name === 'NotAllowedError' ? 'Izin mikrofon ditolak. Izinkan mikrofon di pengaturan browser lalu coba lagi.'
        : err.name === 'NotFoundError' ? 'Mikrofon tidak ditemukan.' : err.message)
      this.tutup()
    }
  }

  private pesan(m: LiveServerMessage) {
    const c = m.serverContent
    if (m.goAway) this.cb.galat('Sesi suara hampir habis (batas 15 menit). Mulai sesi baru bila perlu.')
    if (!c) return
    if (c.interrupted) this.hentikanSuara()
    if (c.inputTranscription?.text) this.cb.transkrip('user', c.inputTranscription.text)
    if (c.outputTranscription?.text) this.cb.transkrip('model', c.outputTranscription.text)
    for (const p of c.modelTurn?.parts ?? []) if (p.inlineData?.data) this.putar(p.inlineData.data)
  }

  private putar(data: string) {
    const ctx = this.ctxKeluar
    if (!ctx || !this.keluar) return
    const pcm = dariBase64(data)
    if (!pcm.length) return
    const buf = ctx.createBuffer(1, pcm.length, LAJU_KELUAR)
    buf.copyToChannel(pcm, 0)
    const s = ctx.createBufferSource()
    s.buffer = buf
    s.connect(this.keluar)
    const t = Math.max(ctx.currentTime + 0.03, this.berikut)
    s.start(t)
    this.berikut = t + buf.duration
    this.sumber.add(s)
    this.set('berbicara')
    s.onended = () => {
      this.sumber.delete(s)
      if (!this.sumber.size) this.set('mendengar')
    }
  }

  private hentikanSuara() {
    for (const s of this.sumber) { try { s.stop() } catch { /* sudah berhenti */ } }
    this.sumber.clear()
    this.berikut = 0
    this.set('mendengar')
  }

  setBisu(v: boolean) {
    this.bisu = v
    this.stream?.getAudioTracks().forEach((t) => { t.enabled = !v })
  }

  /** Kirim teks ketikan ke sesi suara yang sedang berjalan. */
  kirimTeks(teks: string) {
    this.sesi?.sendRealtimeInput({ text: teks })
  }

  tutup() {
    if (this.ditutup) return
    this.ditutup = true
    this.bersihkan()
    this.cb.keadaan('selesai')
  }

  private bersihkan() {
    this.hentikanSuara()
    try { this.sesi?.close() } catch { /* sudah tertutup */ }
    this.sesi = null
    this.node?.port.close()
    this.node?.disconnect()
    this.stream?.getTracks().forEach((t) => t.stop())
    void this.ctxMasuk?.close().catch(() => {})
    void this.ctxKeluar?.close().catch(() => {})
    this.ctxMasuk = this.ctxKeluar = null
    this.analisMasuk = this.analisKeluar = null
  }
}
