'use client'

import { Bot, CheckCircle2, RotateCcw, Save, Send, SkipForward } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { mulaiSimulasi, nilaiJawaban, simpanSimulasi } from '@/app/simulasi-actions'
import { Chip } from '@/components/Chip'
import type { SimulasiTersimpan } from '@/lib/data'
import { tanggal } from '@/lib/format'
import { type HasilSoal, LABEL_MODE, type ModeSimulasi, prediksiTemuan, type Soal } from '@/lib/simulasi'
import type { KodeChip } from '@/lib/status'
import { UNIT_AUDIT } from '@/lib/tanya-jawab'

const CHIP_SKOR: KodeChip[] = ['crit', 'warn', 'info', 'good']
const LABEL_SKOR = ['Tidak memadai', 'Sebagian', 'Memadai', 'Meyakinkan']
const CHIP_TEMUAN = { Mayor: 'crit', Minor: 'warn', OFI: 'info' } as const

type Nilai = { skor: number; alasan: string; bukti_kurang: string; lanjut: string | null }

export function SimulasiAudit({ riwayat, bolehSimpan }: { riwayat: SimulasiTersimpan[]; bolehSimpan: boolean }) {
  const router = useRouter()
  const [unit, setUnit] = useState(3)
  const [mode, setMode] = useState<ModeSimulasi>('stage2')
  const [jumlah, setJumlah] = useState(5)
  const [soal, setSoal] = useState<Soal[] | null>(null)
  const [i, setI] = useState(0)
  const [jawab, setJawab] = useState('')
  const [jawabAwal, setJawabAwal] = useState<string | null>(null)
  const [nilai, setNilai] = useState<Nilai | null>(null)
  const [hasil, setHasil] = useState<HasilSoal[]>([])
  const [galat, setGalat] = useState<string | null>(null)
  const [tersimpan, setTersimpan] = useState(false)
  const [sibuk, mulai] = useTransition()

  const s = soal?.[i]
  const selesai = !!soal && hasil.length === soal.length
  const u = UNIT_AUDIT.find((x) => x.no === unit)!

  function awal(daftar?: Soal[]) {
    setGalat(null)
    mulai(async () => {
      let d = daftar
      if (!d) {
        const r = await mulaiSimulasi(unit, mode, jumlah)
        if (!r.ok) return setGalat(r.pesan)
        d = r.soal
      }
      setSoal(d); setI(0); setHasil([]); setJawab(''); setJawabAwal(null); setNilai(null); setTersimpan(false)
    })
  }

  function kirim() {
    if (!s || !jawab.trim()) return
    setGalat(null)
    const lanjutan = jawabAwal !== null
    const gabungan = lanjutan ? `${jawabAwal}\n[Jawaban atas pertanyaan lanjutan "${nilai?.lanjut}"]: ${jawab}` : jawab
    mulai(async () => {
      const r = await nilaiJawaban(unit, mode, s, gabungan, lanjutan)
      if (!r.ok) return setGalat(r.pesan)
      if (r.lanjut && !lanjutan) { setJawabAwal(jawab); setJawab(''); setNilai(r); return }
      setNilai(r)
      setHasil((h) => [...h, { soal: s, jawaban: gabungan, skor: r.skor, alasan: r.alasan, bukti: r.bukti_kurang }])
    })
  }

  function lewati() {
    if (!s) return
    setHasil((h) => [...h, { soal: s, jawaban: '(dilewati)', skor: 0, alasan: 'Pertanyaan dilewati.', bukti: s.bukti }])
    setNilai({ skor: 0, alasan: 'Pertanyaan dilewati: auditor akan mencatatnya sebagai tidak dapat menunjukkan bukti.', bukti_kurang: s.bukti, lanjut: null })
  }

  function berikut() { setI((x) => x + 1); setJawab(''); setJawabAwal(null); setNilai(null) }

  const sudahDinilai = !!s && hasil.length > i
  const menungguLanjut = !!nilai?.lanjut && jawabAwal !== null && !sudahDinilai

  // ---------- Persiapan ----------
  if (!soal) {
    return (
      <div className="sa-wrap">
        <div className="card">
          <div className="row"><div><span className="eyebrow">Simulasi audit bersama KIRA</span><h3>Latih jawaban sebelum auditor datang</h3></div><Bot aria-hidden="true" /></div>
          <p className="muted small">KIRA berperan sebagai auditor sertifikasi. Pertanyaan diambil dari materi unit Anda dan dari celah nyata di data aplikasi (dokumen tanpa evidence, SEU, EnPI, meter, deviasi, temuan). Setiap jawaban dinilai 0–3, lalu rapor menampilkan prediksi temuan.</p>
          <div className="form-grid" style={{ marginTop: 12 }}>
            <label className="field full"><span>Unit kerja</span>
              <select value={unit} onChange={(e) => setUnit(Number(e.target.value))}>
                {UNIT_AUDIT.map((x) => <option key={x.no} value={x.no}>{x.no}. {x.nama}</option>)}
              </select>
            </label>
            <label className="field"><span>Tahap audit</span>
              <select value={mode} onChange={(e) => setMode(e.target.value as ModeSimulasi)}>
                {(Object.keys(LABEL_MODE) as ModeSimulasi[]).map((m) => <option key={m} value={m}>{LABEL_MODE[m]}</option>)}
              </select>
            </label>
            <label className="field"><span>Jumlah pertanyaan</span>
              <select value={jumlah} onChange={(e) => setJumlah(Number(e.target.value))}>
                {[5, 10].map((n) => <option key={n} value={n}>{n} pertanyaan</option>)}
              </select>
            </label>
          </div>
          <p className="muted small" style={{ marginTop: 10 }}>Klausul unit ini: {u.klausul}.</p>
          {galat && <p className="pesan galat" role="alert" style={{ marginTop: 12 }}>{galat}</p>}
          <div className="toolbar" style={{ marginTop: 14, marginBottom: 0 }}>
            <button type="button" className="btn utama" disabled={sibuk} onClick={() => awal()}><Bot aria-hidden="true" />{sibuk ? 'Menyusun pertanyaan…' : 'Mulai simulasi'}</button>
          </div>
        </div>
        <div className="card">
          <span className="eyebrow">Riwayat latihan</span>
          {riwayat.length === 0 ? <p className="muted small" style={{ marginTop: 8 }}>Belum ada hasil tersimpan.</p> : (
            <ul className="sa-riwayat">
              {riwayat.slice(0, 10).map((r) => {
                const p = Math.round((r.skor / r.skor_maks) * 100)
                const mayor = r.prediksi.filter((x) => x.kategori === 'Mayor').length
                return (
                  <li key={r.id}>
                    <div><b>{r.unit_nama}</b><span className="muted small">{LABEL_MODE[r.mode].split(' · ')[0]} · {tanggal(r.dibuat_at)}{r.oleh ? ` · ${r.oleh}` : ''}</span></div>
                    <div className="sa-riwayat-skor"><b className={`tnum ${p >= 67 ? 'txt-good' : p < 40 ? 'txt-bad' : ''}`}>{p}%</b>
                      {mayor > 0 && <Chip kode="crit" label={`${mayor} mayor`} />}</div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    )
  }

  // ---------- Rapor ----------
  if (selesai) {
    const total = hasil.reduce((t, h) => t + h.skor, 0)
    const maks = hasil.length * 3
    const persen = Math.round((total / maks) * 100)
    const prediksi = prediksiTemuan(hasil)
    const lemah = hasil.filter((h) => h.skor <= 1).map((h) => h.soal)
    return (
      <div className="card sa-rapor">
        <div className="row">
          <div><span className="eyebrow">Rapor simulasi · {LABEL_MODE[mode]}</span><h3>{u.nama}</h3></div>
          <div className="sa-skor-besar"><b className={`tnum ${persen >= 67 ? 'txt-good' : persen < 40 ? 'txt-bad' : ''}`}>{persen}%</b><span className="muted small">{total} dari {maks}</span></div>
        </div>
        <h4>Prediksi temuan</h4>
        {prediksi.length === 0 ? <p className="pesan">Tidak ada temuan yang diprediksi dari jawaban ini. Pertahankan, dan pastikan buktinya siap ditunjukkan.</p> : (
          <ul className="sa-prediksi">
            {prediksi.map((p) => <li key={p.klausul}><Chip kode={CHIP_TEMUAN[p.kategori]} label={p.kategori} /><b className="mono">{p.klausul}</b><span>{p.uraian}</span></li>)}
          </ul>
        )}
        <p className="muted small">Prediksi berbasis aturan: celah di data menetapkan dasar keparahan, kualitas jawaban menggesernya. Ini alat latihan, bukan keputusan auditor.</p>
        <h4>Rincian jawaban</h4>
        <ol className="sa-rincian">
          {hasil.map((h, k) => (
            <li key={k}>
              <div className="row"><b>{h.soal.tanya}</b><Chip kode={CHIP_SKOR[h.skor]} label={`${h.skor}/3`} /></div>
              <p className="muted small">{h.alasan} {h.skor < 3 && h.bukti && <>Bukti yang kurang: {h.bukti}</>}</p>
            </li>
          ))}
        </ol>
        {galat && <p className="pesan galat" role="alert">{galat}</p>}
        <div className="toolbar" style={{ marginTop: 14, marginBottom: 0 }}>
          {bolehSimpan && <button type="button" className="btn utama" disabled={sibuk || tersimpan} onClick={() => mulai(async () => {
            const r = await simpanSimulasi({ unitNo: unit, mode, hasil, prediksi })
            if (!r.ok) return setGalat(r.pesan)
            setTersimpan(true); router.refresh()
          })}>{tersimpan ? <><CheckCircle2 aria-hidden="true" />Tersimpan</> : <><Save aria-hidden="true" />Simpan hasil latihan</>}</button>}
          {lemah.length > 0 && <button type="button" className="btn" disabled={sibuk} onClick={() => awal(lemah)}><RotateCcw aria-hidden="true" />Ulangi {lemah.length} pertanyaan yang lemah</button>}
          <button type="button" className="btn" onClick={() => setSoal(null)}>Simulasi baru</button>
        </div>
      </div>
    )
  }

  // ---------- Tanya jawab ----------
  return (
    <div className="card sa-sesi">
      <div className="row">
        <div><span className="eyebrow">{u.nama} · {LABEL_MODE[mode]}</span><h3>Pertanyaan {i + 1} dari {soal.length}</h3></div>
        <div className="sa-progres" aria-hidden="true">{soal.map((_, k) => <i key={k} className={k < hasil.length ? `t${hasil[k].skor}` : k === i ? 'kini' : ''} />)}</div>
      </div>
      {s && (
        <>
          <div className="sa-auditor">
            <Bot aria-hidden="true" />
            <div>
              <span className="eyebrow">Auditor · klausul {s.klausul.join(', ')}{s.sumber === 'celah' && ' · dari data aplikasi'}</span>
              <p>{s.tanya}</p>
              {menungguLanjut && <p className="sa-lanjut"><b>Pertanyaan lanjutan:</b> {nilai!.lanjut}</p>}
            </div>
          </div>
          {!sudahDinilai ? (
            <>
              <label className="field full" style={{ marginTop: 12 }}><span>{menungguLanjut ? 'Jawaban lanjutan Anda' : 'Jawaban Anda'}</span>
                <textarea rows={5} value={jawab} onChange={(e) => setJawab(e.target.value)} disabled={sibuk}
                  placeholder="Jawab seperti di depan auditor: sebutkan dokumen, rekaman, data, PIC, dan tanggal yang bisa ditunjukkan."
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) kirim() }} />
              </label>
              {galat && <p className="pesan galat" role="alert" style={{ marginTop: 10 }}>{galat}</p>}
              <div className="toolbar" style={{ marginTop: 12, marginBottom: 0 }}>
                <button type="button" className="btn utama" disabled={sibuk || !jawab.trim()} onClick={kirim}><Send aria-hidden="true" />{sibuk ? 'KIRA menilai…' : 'Kirim jawaban'}</button>
                {!menungguLanjut && <button type="button" className="btn" disabled={sibuk} onClick={lewati}><SkipForward aria-hidden="true" />Lewati</button>}
                <span className="muted small">Ctrl/⌘ + Enter untuk mengirim</span>
              </div>
            </>
          ) : nilai && (
            <div className="sa-nilai">
              <div className="row"><Chip kode={CHIP_SKOR[nilai.skor]} label={`${nilai.skor}/3 · ${LABEL_SKOR[nilai.skor]}`} /></div>
              <p>{nilai.alasan}</p>
              {nilai.skor < 3 && nilai.bukti_kurang && <p className="muted small"><b>Bukti yang masih kurang:</b> {nilai.bukti_kurang}</p>}
              <details className="sa-acuan">
                <summary>{s.sumber === 'celah' ? 'Lihat fakta dari data aplikasi' : 'Lihat contoh jawaban dari materi'}</summary>
                <p className="small">{s.acuan}</p>
                <p className="muted small"><b>Bukti objektif:</b> {s.bukti}</p>
                {s.sumber === 'bank' && <p className="muted small">Contoh jawaban adalah respons yang diharapkan, bukan hafalan. Sesuaikan dengan kondisi aktual KINRA.</p>}
              </details>
              <div className="toolbar" style={{ marginTop: 12, marginBottom: 0 }}>
                <button type="button" className="btn utama" onClick={berikut}>{i + 1 < soal.length ? 'Pertanyaan berikutnya' : 'Lihat rapor'}</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
