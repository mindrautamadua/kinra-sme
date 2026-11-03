'use client'

import { ArrowDown, ArrowUp, Check, Copy, Database, ExternalLink, Eye, Lock, Pencil, Plus, Printer, RefreshCw, RotateCcw, Save, Send, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { buatIsian, hapusIsian, segarkanDataIsian, simpanIsian, ubahStatusIsian } from '@/app/actions'
import { Chip } from '@/components/Chip'
import { LembarFormulir } from '@/components/formulir/LembarFormulir'
import { useBoleh } from '@/components/Peran'
import { kelengkapan, nilaiRumus, STATUS_FORMULIR } from '@/lib/formulir/isi'
import { tabelTertaut } from '@/lib/formulir/tautan'
import type { IsianFormulir, IsiFormulir, Kolom, RiwayatFormulir, StatusFormulir, Templat } from '@/lib/formulir/tipe'
import { waktu } from '@/lib/format'

type Keadaan = 'bersih' | 'kotor' | 'menyimpan' | 'galat'
const JEDA_SIMPAN = 4000

const potret = (judul: string, periode: string, isi: IsiFormulir) => JSON.stringify({ judul, periode, isi })

/** Tinggi textarea mengikuti isi (fallback untuk peramban tanpa `field-sizing`). */
function jumlahBaris(v: string, lebar = 38) {
  return Math.min(12, Math.max(1, v.split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.length / lebar)), 0)))
}

export function EditorFormulir({ t, isian, riwayat }: { t: Templat; isian: IsianFormulir; riwayat: RiwayatFormulir[] }) {
  const router = useRouter()
  const bisa = useBoleh()
  const [isi, setIsi] = useState(isian.isi)
  const [judul, setJudul] = useState(isian.judul)
  const [periode, setPeriode] = useState(isian.periode ?? '')
  const [keadaan, setKeadaan] = useState<Keadaan>('bersih')
  const [pesan, setPesan] = useState<string | null>(null)
  const [mode, setMode] = useState<'isi' | 'pratinjau'>('isi')
  const [menunggu, mulai] = useTransition()
  const versi = useRef(isian.diubah_at)
  const tersimpan = useRef(potret(isian.judul, isian.periode ?? '', isian.isi))
  const sedangSimpan = useRef(false)

  const terkunci = isian.status === 'disetujui' || !bisa('formulir.isi')
  const kini = useMemo(() => potret(judul, periode, isi), [judul, periode, isi])
  const kotor = kini !== tersimpan.current
  const lengkap = useMemo(() => kelengkapan(t, isi), [t, isi])

  // Sinkronkan dengan data server (mis. setelah status berubah) selama tidak ada perubahan lokal.
  useEffect(() => {
    if (kotor) return
    versi.current = isian.diubah_at
    tersimpan.current = potret(isian.judul, isian.periode ?? '', isian.isi)
    setIsi(isian.isi); setJudul(isian.judul); setPeriode(isian.periode ?? '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isian.diubah_at, isian.status])

  const simpan = useCallback(async () => {
    if (sedangSimpan.current || terkunci) return
    const snap = potret(judul, periode, isi)
    if (snap === tersimpan.current) return
    sedangSimpan.current = true
    setKeadaan('menyimpan')
    const h = await simpanIsian(isian.id, t.kode, versi.current, { judul, periode: periode || null, isi })
    sedangSimpan.current = false
    if (h.ok) {
      versi.current = h.versi!
      tersimpan.current = snap
      setPesan(null)
      setKeadaan(potret(judul, periode, isi) === snap ? 'bersih' : 'kotor')
    } else {
      setPesan(h.pesan)
      setKeadaan('galat')
    }
  }, [isi, judul, periode, isian.id, t.kode, terkunci])

  useEffect(() => { if (kotor && keadaan === 'bersih') setKeadaan('kotor') }, [kotor, keadaan])

  // Simpan otomatis setelah jeda mengetik (kecuali setelah bentrok/galat, agar tidak mengulang terus)
  useEffect(() => {
    if (!kotor || terkunci || keadaan === 'galat') return
    const id = setTimeout(simpan, JEDA_SIMPAN)
    return () => clearTimeout(id)
  }, [kotor, terkunci, keadaan, simpan])

  useEffect(() => {
    const tombol = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); simpan() }
    }
    const pergi = (e: BeforeUnloadEvent) => { if (kotor) { e.preventDefault() } }
    window.addEventListener('keydown', tombol)
    window.addEventListener('beforeunload', pergi)
    return () => { window.removeEventListener('keydown', tombol); window.removeEventListener('beforeunload', pergi) }
  }, [simpan, kotor])

  // ---- pengubah isian (imutabel, agar baris lain tidak dirender ulang) ----
  const ubahKepala = (label: string, v: string) => setIsi((s) => ({ ...s, kepala: { ...s.kepala, [label]: v } }))
  const ubahTeks = (id: string, v: string) => setIsi((s) => ({ ...s, teks: { ...s.teks, [id]: v } }))
  const ubahTtd = (i: number, k: 'nama' | 'tanggal', v: string) =>
    setIsi((s) => ({ ...s, ttd: s.ttd.map((x, j) => (j === i ? { ...x, [k]: v } : x)) }))
  const ubahSel = useCallback((tid: string, ri: number, ci: number, v: string) => setIsi((s) => {
    const rows = s.tabel[tid].slice()
    rows[ri] = rows[ri].slice(); rows[ri][ci] = v
    return { ...s, tabel: { ...s.tabel, [tid]: rows } }
  }), [])
  const aksiBaris = useCallback((tid: string, ri: number, aksi: 'atas' | 'bawah' | 'hapus' | 'sisip', lebar: number) => setIsi((s) => {
    const rows = s.tabel[tid].slice()
    if (aksi === 'hapus') rows.splice(ri, 1)
    else if (aksi === 'sisip') rows.splice(ri + 1, 0, Array(lebar).fill(''))
    else {
      const j = aksi === 'atas' ? ri - 1 : ri + 1
      if (j < 0 || j >= rows.length) return s;
      [rows[ri], rows[j]] = [rows[j], rows[ri]]
    }
    return { ...s, tabel: { ...s.tabel, [tid]: rows } }
  }), [])

  function ubahStatus(ke: StatusFormulir, konfirmasi?: string) {
    if (konfirmasi && !confirm(konfirmasi)) return
    mulai(async () => {
      if (kotor) await simpan()
      const h = await ubahStatusIsian(isian.id, ke)
      if (!h.ok) { setPesan(h.pesan); return }
      setPesan(h.catatan ?? null)
      router.refresh()
    })
  }

  function muatUlangData() {
    mulai(async () => {
      if (kotor) await simpan()
      const h = await segarkanDataIsian(isian.id)
      if (!h.ok) return setPesan(h.pesan)
      setPesan(null)
      router.refresh()
    })
  }

  function salin() {
    mulai(async () => {
      if (kotor) await simpan()
      const f = new FormData()
      f.set('salin', isian.id)
      if (isian.varian) f.set('varian', isian.varian)
      if (periode) f.set('periode', periode)
      f.set('judul', `${judul} (salinan)`)
      const h = await buatIsian(t.kode, f)
      if (!h.ok) return setPesan(h.pesan)
      router.push(`/formulir/isian/${h.id}`)
    })
  }

  const st = STATUS_FORMULIR[isian.status]
  const labelSimpan = { bersih: 'Tersimpan', kotor: 'Belum disimpan', menyimpan: 'Menyimpan…', galat: 'Gagal menyimpan' }[keadaan]
  const tampilLembar = terkunci || mode === 'pratinjau'

  return (
    <div className="stack">
      <div className="card fm-bar">
        <div className="fm-bar-atas">
          <div className="fm-bar-judul">
            <span className="eyebrow">Klausul {t.klausul.join(', ')}{isian.varian ? ` · ${isian.varian}` : ''}</span>
            {terkunci
              ? <h2>{judul}</h2>
              : <input className="fm-judul" value={judul} onChange={(e) => setJudul(e.target.value)} aria-label="Judul isian" />}
          </div>
          <div className="fm-bar-status">
            <Chip kode={st.chip} label={st.label} />
            {!terkunci && <span className={`fm-simpan ${keadaan}`} role="status">{labelSimpan}</span>}
            <span className="muted small tnum" title="Kelengkapan isian (kolom kepala, isian, sel tabel, dan nama penanda tangan)">{lengkap}% terisi</span>
          </div>
        </div>
        <div className="toolbar" style={{ marginBottom: 0 }}>
          {!terkunci && (
            <div className="seg" role="group" aria-label="Tampilan">
              <button type="button" aria-pressed={mode === 'isi'} onClick={() => setMode('isi')}><Pencil aria-hidden="true" style={{ width: 13, height: 13, verticalAlign: -2 }} /> Isi</button>
              <button type="button" aria-pressed={mode === 'pratinjau'} onClick={() => setMode('pratinjau')}><Eye aria-hidden="true" style={{ width: 13, height: 13, verticalAlign: -2 }} /> Pratinjau</button>
            </div>
          )}
          {!terkunci && <button type="button" className="btn utama" onClick={simpan} disabled={!kotor || keadaan === 'menyimpan'} title="Ctrl/⌘ + S"><Save aria-hidden="true" /> Simpan</button>}
          {isian.status === 'draf' && bisa('formulir.isi') && (
            <button type="button" className="btn" disabled={menunggu} onClick={() => ubahStatus('diajukan', 'Ajukan isian ini untuk ditinjau dan disetujui?')}><Send aria-hidden="true" /> Ajukan</button>
          )}
          {isian.status === 'diajukan' && bisa('formulir.setujui') && (
            <button type="button" className="btn" disabled={menunggu} onClick={() => ubahStatus('disetujui', 'Setujui isian ini? Isian akan dikunci.')}><Check aria-hidden="true" /> Setujui</button>
          )}
          {((isian.status === 'diajukan' && bisa('formulir.isi')) || (isian.status === 'disetujui' && bisa('formulir.setujui'))) && (
            <button type="button" className="btn" disabled={menunggu} onClick={() => ubahStatus('draf', isian.status === 'disetujui' ? 'Buka kembali isian yang sudah disetujui untuk direvisi?' : undefined)}>
              <RotateCcw aria-hidden="true" /> Kembalikan ke draf
            </button>
          )}
          <span style={{ flex: 1 }} />
          <Link className="btn" href={`/formulir/isian/${isian.id}/cetak`} aria-disabled={kotor} onClick={(e) => { if (kotor) { e.preventDefault(); setPesan('Simpan perubahan dulu sebelum mencetak.') } }}>
            <Printer aria-hidden="true" /> Cetak / PDF
          </Link>
          {bisa('formulir.isi') && <button type="button" className="btn" disabled={menunggu} onClick={salin} title="Buat isian baru dari salinan isian ini"><Copy aria-hidden="true" /> Salin</button>}
          {bisa('formulir.hapus') && (
            <button type="button" className="btn bahaya btn-ikon" aria-label="Hapus isian" title="Hapus isian" disabled={menunggu} onClick={() => {
              if (!confirm(`Hapus isian "${judul}"? Tindakan ini tidak dapat dibatalkan.`)) return
              mulai(async () => {
                const h = await hapusIsian(isian.id)
                if (!h.ok) return setPesan(h.pesan)
                tersimpan.current = kini
                router.replace(`/formulir/${t.kode}`)
              })
            }}><Trash2 aria-hidden="true" /></button>
          )}
        </div>
        {pesan && (
          <p className="pesan" role="alert" style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ flex: 1 }}>{pesan}</span>
            {keadaan === 'galat' && <button type="button" className="btn kecil" onClick={() => { setKeadaan('kotor'); simpan() }}>Coba lagi</button>}
            <button type="button" className="btn btn-ikon kecil" aria-label="Tutup pesan" onClick={() => setPesan(null)}><X aria-hidden="true" /></button>
          </p>
        )}
        {terkunci && (
          <p className="muted small" style={{ marginTop: 12 }}>
            <Lock aria-hidden="true" style={{ width: 13, height: 13, verticalAlign: -2 }} />{' '}
            {isian.status === 'disetujui'
              ? `Disetujui oleh ${isian.disetujui_oleh ?? '–'} pada ${waktu(isian.disetujui_at)}. Kembalikan ke draf untuk merevisi.`
              : 'Peran Anda hanya dapat melihat isian ini.'}
          </p>
        )}
      </div>

      {tampilLembar ? (
        <div className="card"><LembarFormulir t={t} isi={isi} /></div>
      ) : (
        <>
          <div className="card">
            <h3 style={{ marginBottom: 12 }}>Identitas dokumen</h3>
            <div className="form-grid">
              <label className="field"><span>Periode</span><input value={periode} onChange={(e) => setPeriode(e.target.value)} placeholder="mis. November 2026" /></label>
              {t.kepala.map((k) => (
                <label key={k.label} className="field"><span>{k.label}</span>
                  <input value={isi.kepala[k.label] ?? ''} onChange={(e) => ubahKepala(k.label, e.target.value)} />
                </label>
              ))}
            </div>
          </div>

          <div className="card fm-dok">
            <header className="fm-dok-kepala">
              <h2>{t.judul}</h2>
              {t.subjudul && <p className="muted">{t.subjudul}</p>}
            </header>
            {t.blok.map((b, i) => {
              if (b.jenis === 'judul') return <h3 key={i} className="fm-h">{b.teks}</h3>
              if (b.jenis === 'teks') return (
                <textarea key={b.id} className="fm-p" value={isi.teks[b.id] ?? ''} rows={jumlahBaris(isi.teks[b.id] ?? '', 110)}
                  onChange={(e) => ubahTeks(b.id, e.target.value)} aria-label="Paragraf" />
              )
              if (b.jenis === 'cek') return (
                <label key={b.id} className="fm-cek"><input type="checkbox" checked={!!isi.teks[b.id]} onChange={(e) => ubahTeks(b.id, e.target.checked ? 'ya' : '')} /> {b.teks}</label>
              )
              if (b.jenis === 'isian') return (
                <label key={b.id} className="field fm-isian"><span>{b.label}</span>
                  {b.panjang
                    ? <textarea value={isi.teks[b.id] ?? ''} onChange={(e) => ubahTeks(b.id, e.target.value)} rows={jumlahBaris(isi.teks[b.id] ?? '', 90) + 1} />
                    : <input value={isi.teks[b.id] ?? ''} onChange={(e) => ubahTeks(b.id, e.target.value)} />}
                </label>
              )
              const rows = isi.tabel[b.id] ?? []
              const tt = tabelTertaut(t.kode, b.id)
              if (tt) return (
                <div key={b.id} className="fm-tabel">
                  <div className="pesan info fm-tertaut">
                    <Database aria-hidden="true" style={{ width: 15, height: 15, flex: 'none' }} />
                    <span className="grow">Tabel ini diambil dari <b>{tt.sumber}</b> dan tidak diketik di sini. Ubah datanya di halaman sumber, lalu muat ulang.</span>
                    <Link className="btn kecil" href={tt.href}><ExternalLink aria-hidden="true" /> Buka {tt.sumber}</Link>
                    <button type="button" className="btn kecil" disabled={menunggu} onClick={muatUlangData}><RefreshCw aria-hidden="true" /> Muat ulang data</button>
                  </div>
                  <div className="table-wrap">
                    <table className="tbl fm-tbl baca">
                      <thead><tr><th className="fm-no">#</th>{b.kolom.map((k, j) => <th key={j} scope="col">{k.label}</th>)}</tr></thead>
                      <tbody>
                        {rows.length === 0 && <tr className="kosong"><td colSpan={b.kolom.length + 1}>Belum ada data di {tt.sumber}.</td></tr>}
                        {rows.map((r, ri) => (
                          <tr key={ri}>
                            <td className="fm-no mono small muted">{ri + 1}</td>
                            {b.kolom.map((k, j) => <td key={j} className={k.jenis === 'angka' || k.jenis === 'rumus' ? 'num' : undefined}>{k.jenis === 'rumus' ? nilaiRumus(k, r) : k.jenis === 'cek' ? (r[j] ? '✓' : '') : r[j]}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
              return (
                <div key={b.id} className="fm-tabel">
                  <div className="table-wrap">
                    <table className="tbl fm-tbl">
                      <thead>
                        <tr>
                          <th className="fm-no">#</th>
                          {b.kolom.map((k, j) => <th key={j} scope="col" className={k.jenis ? `fm-${k.jenis}` : undefined}>{k.label}</th>)}
                          <th className="fm-aksi"><span className="sr-only">Aksi baris</span></th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length === 0 && <tr className="kosong"><td colSpan={b.kolom.length + 2}>Belum ada baris. Klik “Tambah baris”.</td></tr>}
                        {rows.map((r, ri) => (
                          <BarisTabel key={ri} tid={b.id} ri={ri} r={r} kolom={b.kolom} n={rows.length} ubahSel={ubahSel} aksiBaris={aksiBaris} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button type="button" className="btn kecil" style={{ marginTop: 8 }} onClick={() => aksiBaris(b.id, rows.length - 1, 'sisip', b.kolom.length)}>
                    <Plus aria-hidden="true" /> Tambah baris
                  </button>
                </div>
              )
            })}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 12 }}>Pengesahan</h3>
            <div className="fm-ttd">
              {t.ttd.map((x, i) => (
                <fieldset key={i}>
                  <legend>{x.peran} <span className="muted">· {x.jabatan}</span></legend>
                  <label className="field"><span>Nama</span><input value={isi.ttd[i]?.nama ?? ''} onChange={(e) => ubahTtd(i, 'nama', e.target.value)} /></label>
                  <label className="field"><span>Tanggal</span><input type="date" value={isi.ttd[i]?.tanggal ?? ''} onChange={(e) => ubahTtd(i, 'tanggal', e.target.value)} /></label>
                </fieldset>
              ))}
            </div>
          </div>
        </>
      )}

      <div className="card">
        <h3 style={{ marginBottom: 10 }}>Riwayat</h3>
        <div className="list">
          {riwayat.map((r) => (
            <div key={r.id}>
              <span className="mono small muted" style={{ width: 130 }}>{waktu(r.at)}</span>
              <span className="grow small">
                {r.dari ? `${STATUS_FORMULIR[r.dari].label} → ` : 'Dibuat sebagai '}<b style={{ display: 'inline' }}>{STATUS_FORMULIR[r.ke].label}</b>
                {r.oleh && <span className="muted"> · {r.oleh}</span>}
              </span>
            </div>
          ))}
          <div>
            <span className="mono small muted" style={{ width: 130 }}>{waktu(isian.diubah_at)}</span>
            <span className="grow small">Terakhir disimpan{isian.diubah_oleh && <span className="muted"> · {isian.diubah_oleh}</span>}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const BarisTabel = memo(function BarisTabel({ tid, ri, r, kolom, n, ubahSel, aksiBaris }: {
  tid: string; ri: number; r: string[]; kolom: Kolom[]; n: number
  ubahSel: (tid: string, ri: number, ci: number, v: string) => void
  aksiBaris: (tid: string, ri: number, aksi: 'atas' | 'bawah' | 'hapus' | 'sisip', lebar: number) => void
}) {
  return (
    <tr>
      <td className="fm-no mono small muted">{ri + 1}</td>
      {kolom.map((k, ci) => {
        const v = r[ci] ?? ''
        const label = `${k.label}, baris ${ri + 1}`
        if (k.jenis === 'cek') return (
          <td key={ci} className="fm-cek-sel"><input type="checkbox" checked={!!v} aria-label={label} onChange={(e) => ubahSel(tid, ri, ci, e.target.checked ? 'ya' : '')} /></td>
        )
        if (k.jenis === 'pilihan') return (
          <td key={ci}><select className="inline" value={v} aria-label={label} onChange={(e) => ubahSel(tid, ri, ci, e.target.value)}>
            <option value="">–</option>{k.opsi?.map((o) => <option key={o}>{o}</option>)}
          </select></td>
        )
        if (k.jenis === 'rumus') return <td key={ci} className="num"><output aria-label={label}>{nilaiRumus(k, r) || '–'}</output></td>
        if (k.jenis === 'angka') return (
          <td key={ci}><input className="fm-angka" inputMode="decimal" value={v} aria-label={label} onChange={(e) => ubahSel(tid, ri, ci, e.target.value)} /></td>
        )
        return (
          <td key={ci}><textarea className="fm-sel" value={v} rows={jumlahBaris(v)} aria-label={label} onChange={(e) => ubahSel(tid, ri, ci, e.target.value)} /></td>
        )
      })}
      <td className="fm-aksi">
        <div>
          <button type="button" className="btn btn-ikon kecil" aria-label={`Naikkan baris ${ri + 1}`} disabled={ri === 0} onClick={() => aksiBaris(tid, ri, 'atas', kolom.length)}><ArrowUp aria-hidden="true" /></button>
          <button type="button" className="btn btn-ikon kecil" aria-label={`Turunkan baris ${ri + 1}`} disabled={ri === n - 1} onClick={() => aksiBaris(tid, ri, 'bawah', kolom.length)}><ArrowDown aria-hidden="true" /></button>
          <button type="button" className="btn btn-ikon kecil" aria-label={`Sisipkan baris setelah baris ${ri + 1}`} onClick={() => aksiBaris(tid, ri, 'sisip', kolom.length)}><Plus aria-hidden="true" /></button>
          <button type="button" className="btn btn-ikon kecil bahaya" aria-label={`Hapus baris ${ri + 1}`} onClick={() => { if (r.some((x) => x.trim()) && !confirm(`Hapus baris ${ri + 1}?`)) return; aksiBaris(tid, ri, 'hapus', kolom.length) }}><X aria-hidden="true" /></button>
        </div>
      </td>
    </tr>
  )
})
