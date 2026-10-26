'use client'

import { Bot, Send, Square, Trash2, X } from 'lucide-react'
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react'

type Pesan = { peran: 'user' | 'model'; teks: string }

const CONTOH = [
  'Dokumen mana yang lewat tenggat?',
  'Klausul apa yang paling lemah kesiapannya?',
  'Ringkas temuan audit yang masih terbuka',
  'Bagaimana tren konsumsi energi tahun ini?',
]

export function Chatbot() {
  const [buka, setBuka] = useState(false)
  const [pesan, setPesan] = useState<Pesan[]>([])
  const [input, setInput] = useState('')
  const [jalan, setJalan] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const batal = useRef<AbortController | null>(null)
  const daftar = useRef<HTMLDivElement>(null)
  const kolom = useRef<HTMLTextAreaElement>(null)

  useEffect(() => { daftar.current?.scrollTo({ top: daftar.current.scrollHeight }) }, [pesan])
  useEffect(() => { if (buka) kolom.current?.focus() }, [buka])

  async function kirim(teks: string) {
    const q = teks.trim()
    if (!q || jalan) return
    const riwayat: Pesan[] = [...pesan, { peran: 'user', teks: q }]
    setPesan([...riwayat, { peran: 'model', teks: '' }])
    setInput('')
    setGalat(null)
    setJalan(true)
    const ac = new AbortController()
    batal.current = ac
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pesan: riwayat }),
        signal: ac.signal,
      })
      if (res.redirected) throw new Error('Sesi berakhir. Silakan masuk kembali.')
      if (!res.ok || !res.body) throw new Error(((await res.json().catch(() => null)) as { pesan?: string } | null)?.pesan ?? 'Asisten tidak dapat dihubungi.')
      const baca = res.body.getReader()
      const dekode = new TextDecoder()
      let jawab = ''
      for (;;) {
        const { done, value } = await baca.read()
        if (done) break
        jawab += dekode.decode(value, { stream: true })
        setPesan([...riwayat, { peran: 'model', teks: jawab }])
      }
      if (!jawab) throw new Error('Asisten tidak memberi jawaban. Coba ulangi pertanyaan.')
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setGalat((e as Error).message)
        setPesan(riwayat.slice(0, -1))
        setInput(q)
      }
    } finally {
      setJalan(false)
      batal.current = null
    }
  }

  function kirimForm(e: FormEvent) {
    e.preventDefault()
    void kirim(input)
  }

  function tombol(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault()
      void kirim(input)
    }
    if (e.key === 'Escape') setBuka(false)
  }

  if (!buka) {
    return (
      <button type="button" className="chat-fab" onClick={() => setBuka(true)} aria-label="Buka asisten AI" title="Asisten AI">
        <Bot aria-hidden="true" />
      </button>
    )
  }

  return (
    <section className="chat card pad-0" aria-label="Asisten AI SMEn">
      <header className="chat-head">
        <Bot aria-hidden="true" />
        <div><b>Asisten SMEn</b><span className="muted small">Gemini · membaca data dashboard</span></div>
        <div className="spacer" />
        <button type="button" className="btn btn-ikon" onClick={() => { batal.current?.abort(); setPesan([]); setGalat(null) }} disabled={!pesan.length} aria-label="Hapus percakapan" title="Hapus percakapan"><Trash2 aria-hidden="true" /></button>
        <button type="button" className="btn btn-ikon" onClick={() => setBuka(false)} aria-label="Tutup asisten" title="Tutup"><X aria-hidden="true" /></button>
      </header>

      <div className="chat-isi" ref={daftar} aria-live="polite">
        {!pesan.length && (
          <div className="chat-awal">
            <p className="muted small">Tanyakan kesiapan dokumen, data energi, EnPI, temuan, atau hal umum ISO 50001.</p>
            {CONTOH.map((c) => <button key={c} type="button" className="btn kecil" onClick={() => void kirim(c)}>{c}</button>)}
          </div>
        )}
        {pesan.map((p, i) => (
          <div key={i} className={`chat-msg ${p.peran}`}>
            {p.teks || <span className="chat-ketik" aria-label="Menulis jawaban"><i /><i /><i /></span>}
          </div>
        ))}
        {galat && <p className="pesan galat">{galat}</p>}
      </div>

      <form className="chat-form" onSubmit={kirimForm}>
        <textarea ref={kolom} rows={1} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={tombol}
          placeholder="Tulis pertanyaan…" aria-label="Pertanyaan" maxLength={4000} />
        {jalan
          ? <button type="button" className="btn btn-ikon" onClick={() => batal.current?.abort()} aria-label="Hentikan jawaban" title="Hentikan"><Square aria-hidden="true" /></button>
          : <button type="submit" className="btn btn-ikon utama" disabled={!input.trim()} aria-label="Kirim" title="Kirim"><Send aria-hidden="true" /></button>}
      </form>
      <p className="chat-catatan muted">Jawaban AI bisa keliru. Periksa kembali sebelum dipakai sebagai bukti audit.</p>
    </section>
  )
}
