'use client'

import { AudioLines, ChevronRight, Mic, MicOff, PhoneOff, Send, Square, Trash2, X } from 'lucide-react'
import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { KiraAvatar } from './kira/KiraAvatar'
import type { KeadaanSuara, SesiSuara } from './kira/sesiSuara'

type Pesan = { peran: 'user' | 'model'; teks: string; suara?: boolean }

const CONTOH = [
  'Dokumen mana yang lewat tenggat?',
  'Klausul apa yang paling lemah kesiapannya?',
  'Ringkas temuan audit yang masih terbuka',
  'Bagaimana tren konsumsi energi tahun ini?',
]

const LABEL_SUARA: Record<KeadaanSuara, string> = {
  menghubungkan: 'Menghubungkan…',
  mendengar: 'KIRA mendengarkan',
  berbicara: 'KIRA berbicara',
  selesai: 'Sesi suara selesai',
}

/** Tingkat suara 0–1 dari analyser. */
function tingkat(a: AnalyserNode | null, buf: Uint8Array<ArrayBuffer>): number {
  if (!a) return 0
  a.getByteTimeDomainData(buf)
  let s = 0
  for (let i = 0; i < buf.length; i++) { const v = (buf[i] - 128) / 128; s += v * v }
  return Math.min(1, Math.sqrt(s / buf.length) * 4)
}

export function Chatbot() {
  const [buka, setBuka] = useState(false)
  const [pesan, setPesan] = useState<Pesan[]>([])
  const [input, setInput] = useState('')
  const [jalan, setJalan] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const [suara, setSuara] = useState<KeadaanSuara | null>(null)
  const [bisu, setBisu] = useState(false)
  const batal = useRef<AbortController | null>(null)
  const daftar = useRef<HTMLDivElement>(null)
  const kolom = useRef<HTMLTextAreaElement>(null)
  const sesi = useRef<SesiSuara | null>(null)
  const orb = useRef<HTMLDivElement>(null)

  const aktifSuara = suara !== null && suara !== 'selesai'

  useEffect(() => { daftar.current?.scrollTo({ top: daftar.current.scrollHeight }) }, [pesan])
  useEffect(() => { if (buka && !aktifSuara) kolom.current?.focus() }, [buka, aktifSuara])
  useEffect(() => () => sesi.current?.tutup(), [])

  // Animasi orb mengikuti volume mikrofon atau suara KIRA
  useEffect(() => {
    if (!aktifSuara) return
    const buf = new Uint8Array(256)
    let raf = 0
    let halus = 0
    const langkah = () => {
      const s = sesi.current
      const v = suara === 'berbicara' ? tingkat(s?.analisKeluar ?? null, buf) : tingkat(s?.analisMasuk ?? null, buf)
      halus += (v - halus) * 0.25
      orb.current?.style.setProperty('--lv', halus.toFixed(3))
      raf = requestAnimationFrame(langkah)
    }
    raf = requestAnimationFrame(langkah)
    return () => cancelAnimationFrame(raf)
  }, [aktifSuara, suara])

  async function mulaiSuara() {
    if (aktifSuara) return
    batal.current?.abort()
    setGalat(null)
    setBisu(false)
    const { SesiSuara } = await import('./kira/sesiSuara')
    const s = new SesiSuara({
      keadaan: (k) => {
        setSuara(k)
        if (k === 'selesai') sesi.current = null
      },
      transkrip: (peran, teks) => setPesan((p) => {
        const akhir = p.at(-1)
        if (akhir?.suara && akhir.peran === peran) return [...p.slice(0, -1), { ...akhir, teks: akhir.teks + teks }]
        return [...p, { peran, teks: teks.trimStart(), suara: true }]
      }),
      galat: (m) => setGalat(m),
    })
    sesi.current = s
    void s.mulai()
  }

  function akhiriSuara() {
    sesi.current?.tutup()
    sesi.current = null
    setSuara(null)
  }

  function gantiBisu() {
    const v = !bisu
    setBisu(v)
    sesi.current?.setBisu(v)
  }

  async function kirim(teks: string) {
    const q = teks.trim()
    if (!q || jalan) return
    if (aktifSuara && sesi.current) {
      // Saat sesi suara berjalan, ketikan dikirim ke KIRA dan dijawab dengan suara.
      setPesan((p) => [...p, { peran: 'user', teks: q }])
      setInput('')
      sesi.current.kirimTeks(q)
      return
    }
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
        body: JSON.stringify({ pesan: riwayat.map(({ peran, teks }) => ({ peran, teks })) }),
        signal: ac.signal,
      })
      if (res.redirected) throw new Error('Sesi berakhir. Silakan masuk kembali.')
      if (!res.ok || !res.body) throw new Error(((await res.json().catch(() => null)) as { pesan?: string } | null)?.pesan ?? 'KIRA tidak dapat dihubungi.')
      const baca = res.body.getReader()
      const dekode = new TextDecoder()
      let jawab = ''
      for (;;) {
        const { done, value } = await baca.read()
        if (done) break
        jawab += dekode.decode(value, { stream: true })
        setPesan([...riwayat, { peran: 'model', teks: jawab }])
      }
      if (!jawab) throw new Error('KIRA tidak memberi jawaban. Coba ulangi pertanyaan.')
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
      <button type="button" className={`kira-fab${aktifSuara ? ' aktif' : ''}`} onClick={() => setBuka(true)} aria-label="Buka KIRA, asisten SMEn">
        <KiraAvatar />
        <span className="kira-fab-teks">{aktifSuara ? LABEL_SUARA[suara] : 'Tanya KIRA'}</span>
      </button>
    )
  }

  return (
    <section className="chat card pad-0" aria-label="KIRA, asisten SMEn">
      <header className="chat-head">
        <KiraAvatar className="kecil" />
        <div><b>KIRA</b><span className="muted small">KINRA Intelligent Relationship Assistant</span></div>
        <div className="spacer" />
        {!aktifSuara && (
          <button type="button" className="btn btn-ikon" onClick={() => void mulaiSuara()} aria-label="Bicara dengan KIRA" title="Bicara dengan KIRA"><AudioLines aria-hidden="true" /></button>
        )}
        <button type="button" className="btn btn-ikon" onClick={() => { batal.current?.abort(); setPesan([]); setGalat(null) }} disabled={!pesan.length} aria-label="Hapus percakapan" title="Hapus percakapan"><Trash2 aria-hidden="true" /></button>
        <button type="button" className="btn btn-ikon" onClick={() => setBuka(false)} aria-label="Perkecil KIRA" title={aktifSuara ? 'Perkecil (sesi suara tetap berjalan)' : 'Tutup'}><X aria-hidden="true" /></button>
      </header>

      {aktifSuara && (
        <div className={`kira-suara ${suara}`}>
          <div className="kira-orb" ref={orb} aria-hidden="true"><KiraAvatar /></div>
          <p className="kira-status" role="status">{bisu && suara === 'mendengar' ? 'Mikrofon dibisukan' : LABEL_SUARA[suara]}</p>
          <div className="kira-kendali">
            <button type="button" className="btn btn-ikon" onClick={gantiBisu} disabled={suara === 'menghubungkan'} aria-pressed={bisu} aria-label={bisu ? 'Aktifkan mikrofon' : 'Bisukan mikrofon'} title={bisu ? 'Aktifkan mikrofon' : 'Bisukan mikrofon'}>
              {bisu ? <MicOff aria-hidden="true" /> : <Mic aria-hidden="true" />}
            </button>
            <button type="button" className="btn kira-akhiri" onClick={akhiriSuara}><PhoneOff aria-hidden="true" /> Akhiri</button>
          </div>
        </div>
      )}

      <div className="chat-isi" ref={daftar} aria-live="polite">
        {!pesan.length && !aktifSuara && (
          <div className="chat-awal">
            <div className="kira-sapa">
              <KiraAvatar />
              <div><b>Halo, saya KIRA <span aria-hidden="true">👋</span></b><p className="muted small">Ada yang bisa saya bantu hari ini? Tanyakan kesiapan dokumen, data energi, EnPI, temuan, atau hal umum ISO 50001.</p></div>
            </div>
            <button type="button" className="kira-mulai" onClick={() => void mulaiSuara()}>
              <AudioLines aria-hidden="true" /><span><b>Bicara langsung dengan KIRA</b><small>Percakapan suara dua arah, bisa dipotong kapan saja</small></span><ChevronRight aria-hidden="true" />
            </button>
            {CONTOH.map((c) => <button key={c} type="button" className="btn kecil" onClick={() => void kirim(c)}>{c}</button>)}
          </div>
        )}
        {pesan.map((p, i) => (
          <div key={i} className={`chat-msg ${p.peran}${p.suara ? ' suara' : ''}`}>
            {p.teks || <span className="chat-ketik" aria-label="Menulis jawaban"><i /><i /><i /></span>}
          </div>
        ))}
        {galat && <p className="pesan galat">{galat}</p>}
      </div>

      <form className="chat-form" onSubmit={kirimForm}>
        <textarea ref={kolom} rows={1} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={tombol}
          placeholder={aktifSuara ? 'Atau ketik ke KIRA…' : 'Tulis pertanyaan…'} aria-label="Pertanyaan" maxLength={4000} />
        {jalan
          ? <button type="button" className="btn btn-ikon" onClick={() => batal.current?.abort()} aria-label="Hentikan jawaban" title="Hentikan"><Square aria-hidden="true" /></button>
          : <button type="submit" className="btn btn-ikon utama" disabled={!input.trim()} aria-label="Kirim" title="Kirim"><Send aria-hidden="true" /></button>}
      </form>
      <p className="chat-catatan muted">Jawaban KIRA bisa keliru. Periksa kembali sebelum dipakai sebagai bukti audit.</p>
    </section>
  )
}
