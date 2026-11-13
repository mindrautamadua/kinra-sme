'use client'

import { Save, Send } from 'lucide-react'
import { useState, useTransition } from 'react'
import { Chip } from '@/components/Chip'
import { tanggal, waktu } from '@/lib/format'
import { type Jawaban, type LembarPublik, PENUTUP, type Pertanyaan, STATUS_LEMBAR_CHIP, type StatusLembar } from '@/lib/penyelidikan'
import { simpanJawabanPublik } from '../actions'

export function FormLembar({ token, lembar }: { token: string; lembar: LembarPublik }) {
  const [jawaban, setJawaban] = useState<Jawaban>(lembar.jawaban ?? {})
  const [nama, setNama] = useState(lembar.dijawab_nama ?? '')
  const [jabatan, setJabatan] = useState(lembar.dijawab_jabatan ?? '')
  const [status, setStatus] = useState<StatusLembar>(lembar.status)
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null)
  const [menunggu, mulai] = useTransition()
  const kunci = status === 'Ditinjau'

  const ubah = (id: string, kolom: 'nilai' | 'keterangan', v: string) =>
    setJawaban((j) => ({ ...j, [id]: { nilai: j[id]?.nilai ?? '', ...(j[id]?.keterangan ? { keterangan: j[id].keterangan } : {}), [kolom]: v } }))

  function simpan(kirim: boolean) {
    if (kirim) {
      const kosong = [...lembar.pertanyaan, ...PENUTUP].filter((q) => !(jawaban[q.id]?.nilai ?? '').trim()).length
      if (!nama.trim()) return setPesan({ ok: false, teks: 'Isi nama pengisi sebelum mengirim.' })
      if (kosong && !confirm(`${kosong} pertanyaan belum dijawab. Tetap kirim?`)) return
    }
    mulai(async () => {
      const h = await simpanJawabanPublik(token, jawaban, nama, jabatan, kirim)
      if (!h.ok) return setPesan({ ok: false, teks: h.pesan })
      setStatus(h.status as StatusLembar)
      setPesan({ ok: true, teks: kirim ? 'Jawaban terkirim. Terima kasih. Anda masih dapat memperbaikinya lewat tautan ini sampai lembar ditinjau.' : 'Draf tersimpan. Buka tautan yang sama untuk melanjutkan.' })
    })
  }

  return (
    <>
      <div className="card lembar-head">
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <span className="kode">{lembar.kode}{lembar.enpi_kode ? ` · ${lembar.enpi_kode}` : ''}</span>
          <Chip kode={STATUS_LEMBAR_CHIP[status]} label={status} />
        </div>
        <h1>{lembar.judul}</h1>
        <p className="muted small">
          Untuk: <b>{lembar.pic_bagian}</b>{lembar.pic_nama ? ` (${lembar.pic_nama})` : ''}
          {lembar.tenggat && <> · Mohon diisi paling lambat <b>{tanggal(lembar.tenggat, 'panjang')}</b></>}
        </p>
        <p className="small">ISO 50001 klausul 9.1.1 mewajibkan setiap deviasi signifikan kinerja energi diselidiki dan ditanggapi. Jawaban Anda menjadi dasar penyelidikan resmi Tim SMEn. Jawab sesuai kondisi lapangan; tulis &ldquo;tidak tahu&rdquo; bila memang tidak tahu.</p>
        {lembar.ringkasan && <div className="lembar-blok"><b>Data yang ditemukan</b><p>{lembar.ringkasan}</p></div>}
        {lembar.hipotesis && <div className="lembar-blok"><b>Dugaan awal Tim SMEn (mohon dikonfirmasi atau dibantah)</b><p>{lembar.hipotesis}</p></div>}
        {kunci && <p className="lembar-pesan ok">Lembar ini sudah ditinjau Tim SMEn{lembar.catatan_tinjauan ? `: ${lembar.catatan_tinjauan}` : '.'} Jawaban tidak dapat diubah lagi.</p>}
      </div>

      <form className="card lembar-form" onSubmit={(e) => { e.preventDefault(); simpan(true) }}>
        <fieldset disabled={kunci || menunggu}>
          <h2>Pertanyaan</h2>
          {lembar.pertanyaan.map((q, i) => <Butir key={q.id} no={i + 1} q={q} j={jawaban[q.id]} ubah={ubah} />)}
          <h2>Kesimpulan Anda</h2>
          {PENUTUP.map((q, i) => <Butir key={q.id} no={lembar.pertanyaan.length + i + 1} q={q} j={jawaban[q.id]} ubah={ubah} />)}
          <h2>Pengisi</h2>
          <div className="form-grid">
            <label className="field"><span>Nama</span><input value={nama} onChange={(e) => setNama(e.target.value)} maxLength={120} autoComplete="name" /></label>
            <label className="field"><span>Jabatan / bagian</span><input value={jabatan} onChange={(e) => setJabatan(e.target.value)} maxLength={120} /></label>
          </div>
          {lembar.dijawab_at && <p className="muted small">Terakhir dikirim {waktu(lembar.dijawab_at)} WIB.</p>}
          {pesan && <p className={`lembar-pesan ${pesan.ok ? 'ok' : 'galat'}`} role="status">{pesan.teks}</p>}
          <div className="row" style={{ gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button type="button" className="btn" onClick={() => simpan(false)}><Save aria-hidden="true" /><span className="teks">Simpan draf</span></button>
            <button type="submit" className="btn utama"><Send aria-hidden="true" /><span className="teks">{menunggu ? 'Menyimpan…' : 'Kirim jawaban'}</span></button>
          </div>
        </fieldset>
      </form>
      <p className="muted small" style={{ textAlign: 'center' }}>Tautan ini khusus untuk {lembar.pic_bagian}. Jangan diteruskan ke pihak lain.</p>
    </>
  )
}

function Butir({ no, q, j, ubah }: { no: number; q: Pertanyaan; j?: { nilai: string; keterangan?: string }; ubah: (id: string, k: 'nilai' | 'keterangan', v: string) => void }) {
  const nama = `q-${q.id}`
  return (
    <div className="lembar-butir">
      <div className="lembar-tanya"><span className="no">{no}</span><div><b>{q.teks}</b>{q.petunjuk && <span className="muted small">{q.petunjuk}</span>}</div></div>
      {q.jenis === 'teks' && (
        <textarea aria-label={q.teks} value={j?.nilai ?? ''} onChange={(e) => ubah(q.id, 'nilai', e.target.value)} rows={3} maxLength={4000} />
      )}
      {q.jenis === 'pilihan' && (
        <div className="lembar-opsi" role="radiogroup" aria-label={q.teks}>
          {(q.opsi ?? []).map((o) => (
            <label key={o}><input type="radio" name={nama} value={o} checked={j?.nilai === o} onChange={() => ubah(q.id, 'nilai', o)} />{o}</label>
          ))}
        </div>
      )}
      {(q.jenis === 'tanggal' || q.jenis === 'angka') && (
        <input type={q.jenis === 'tanggal' ? 'date' : 'number'} step="any" aria-label={q.teks} value={j?.nilai ?? ''} onChange={(e) => ubah(q.id, 'nilai', e.target.value)} style={{ maxWidth: 240 }} />
      )}
      {q.jenis !== 'teks' && (
        <textarea aria-label={`Keterangan: ${q.teks}`} placeholder="Keterangan (opsional)" value={j?.keterangan ?? ''} onChange={(e) => ubah(q.id, 'keterangan', e.target.value)} rows={2} maxLength={4000} />
      )}
    </div>
  )
}
