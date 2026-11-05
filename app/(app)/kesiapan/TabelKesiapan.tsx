'use client'

import { Download, Eye, Search, Upload, X } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useRef, useState } from 'react'
import { lihatBerkas } from '@/app/actions'
import { Chip } from '@/components/Chip'
import { EvidenceBerkas } from '@/components/EvidenceBerkas'
import { useBoleh } from '@/components/Peran'
import { selisihHari, tanggal } from '@/lib/format'
import { adaBukti, KELOMPOK, kesiapan, terlambat } from '@/lib/status'
import type { BerkasTampil, Dokumen, KelompokDokumen, Klausul } from '@/lib/types'
import { CatatanDokumen } from './CatatanDokumen'
import { PanelKesiapan } from './PanelKesiapan'

export function TabelKesiapan({ dokumen, klausul, kini, klausulAwal }: {
  dokumen: Dokumen[]; klausul: Klausul[]; kini: string; klausulAwal: string
}) {
  const rows = dokumen
  const [kelompok, setKelompok] = useState<KelompokDokumen | ''>('')
  const [kl, setKl] = useState(klausulAwal)
  const [cari, setCari] = useState('')
  const [hanyaLewat, setHanyaLewat] = useState(false)
  const [tanpaBukti, setTanpaBukti] = useState(false)
  const [hanyaWajib, setHanyaWajib] = useState(false)
  const adaKolomWajib = rows.some((d) => d.wajib_iso !== undefined)
  const [galat, setGalat] = useState<string | null>(null)
  const bisa = useBoleh()
  const bisaUnggah = bisa('dokumen.ubah')
  // Panel evidence: satu-satunya tempat melihat, mengunggah, dan menghapus berkas evidence
  const dlg = useRef<HTMLDialogElement>(null)
  const [panel, setPanel] = useState<{ d: Dokumen; berkas: BerkasTampil[] } | null>(null)
  const [memuat, setMemuat] = useState<string | null>(null)

  async function muatBerkas(d: Dokumen) {
    const h = await lihatBerkas(d.id)
    if (!h.ok) { setGalat(`Berkas ${d.kode} gagal dimuat: ${h.pesan}`); return null }
    return h.berkas ?? []
  }

  async function bukaPanel(d: Dokumen) {
    setGalat(null)
    setMemuat(d.id)
    const berkas = await muatBerkas(d)
    setMemuat(null)
    if (!berkas) return
    setPanel({ d, berkas })
    dlg.current?.showModal()
  }

  async function segarkanPanel() {
    if (!panel) return
    const berkas = await muatBerkas(panel.d)
    if (berkas) setPanel((p) => (p ? { ...p, berkas } : p))
  }

  const judulKlausul = useMemo(() => Object.fromEntries(klausul.map((k) => [k.kode, k])), [klausul])

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return rows
      .filter((d) => (!kelompok || d.kelompok === kelompok) && (!kl || d.klausul_kode === kl))
      .filter((d) => !hanyaLewat || terlambat(d, kini))
      .filter((d) => !tanpaBukti || !adaBukti(d))
      .filter((d) => !hanyaWajib || d.wajib_iso)
      .filter((d) => !q || `${d.kode} ${d.nama} ${d.pic ?? ''} ${d.nomor_dokumen ?? ''} ${d.keterangan ?? ''} ${d.posisi_draf ?? ''}`.toLowerCase().includes(q))
      .sort((a, b) => (judulKlausul[a.klausul_kode]?.urutan ?? 0) - (judulKlausul[b.klausul_kode]?.urutan ?? 0) || a.kode.localeCompare(b.kode))
  }, [rows, kelompok, kl, cari, hanyaLewat, tanpaBukti, hanyaWajib, kini, judulKlausul])

  const adaSaring = !!(kelompok || kl || cari || hanyaLewat || tanpaBukti || hanyaWajib)
  function reset() {
    setKelompok(''); setKl(''); setCari(''); setHanyaLewat(false); setTanpaBukti(false); setHanyaWajib(false)
  }

  function unduhCsv() {
    const kolom = ['Kode', 'Klausul', 'Kelompok', 'Nama', 'Wajib ISO 50001', 'Nomor dokumen', 'PIC', 'Tenggat', 'Berkas evidence', 'Draf ada di', 'Keterangan', 'Catatan diubah oleh', 'Catatan diubah pada']
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const isi = tersaring.map((d) => [d.kode, d.klausul_kode, KELOMPOK[d.kelompok], d.nama, d.wajib_iso ? 'Ya' : 'Tidak', d.nomor_dokumen, d.pic, d.tenggat, d.jumlah_berkas ?? 0, d.posisi_draf, d.keterangan, d.catatan_oleh, d.catatan_at].map(esc).join(','))
    const blob = new Blob(['﻿' + [kolom.map(esc).join(','), ...isi].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `kesiapan-audit-smen-${kini}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  let klausulTerakhir = ''

  return (
    <>
      <PanelKesiapan rows={rows} klausul={klausul} kini={kini} kl={kl} setKl={setKl}
        hanyaLewat={hanyaLewat} setHanyaLewat={setHanyaLewat} tanpaBukti={tanpaBukti} setTanpaBukti={setTanpaBukti} />
      <div className="card ks-tabel" id="tabel-kesiapan">
        <div className="row">
          <div><h3>Lembar monitoring</h3><p className="muted small">Klik tombol di kolom Evidence untuk mengunggah atau melihat berkas</p></div>
          {adaSaring && <button type="button" className="btn kecil" onClick={reset}><X aria-hidden="true" />Hapus semua saringan</button>}
        </div>
        <div className="toolbar">
          <div className="seg" role="group" aria-label="Kelompok dokumen">
            <button type="button" aria-pressed={kelompok === ''} onClick={() => setKelompok('')}>Semua<span className="n">{rows.length}</span></button>
            {(Object.keys(KELOMPOK) as KelompokDokumen[]).map((k) => (
              <button key={k} type="button" aria-pressed={kelompok === k} onClick={() => setKelompok(k)}>
                {KELOMPOK[k]}<span className="n">{rows.filter((d) => d.kelompok === k).length}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="toolbar">
          <label className="cari">
            <Search aria-hidden="true" />
            <span className="sr-only">Cari dokumen</span>
            <input type="search" placeholder="Cari kode, nama, PIC…" value={cari} onChange={(e) => setCari(e.target.value)} />
          </label>
          <label>
            <span className="sr-only">Klausul</span>
            <select value={kl} onChange={(e) => setKl(e.target.value)}>
              <option value="">Semua klausul</option>
              {klausul.map((k) => <option key={k.kode} value={k.kode}>{k.kode === 'P' ? 'Persiapan' : k.kode} · {k.judul}</option>)}
            </select>
          </label>
          <button type="button" className="btn" aria-pressed={hanyaLewat} onClick={() => setHanyaLewat(!hanyaLewat)}
            style={hanyaLewat ? { borderColor: 'var(--crit)' } : undefined}>
            Hanya terlambat
          </button>
          <button type="button" className="btn" aria-pressed={tanpaBukti} onClick={() => setTanpaBukti(!tanpaBukti)}
            style={tanpaBukti ? { borderColor: 'var(--warn)' } : undefined}>
            Tanpa evidence
          </button>
          {adaKolomWajib && (
            <button type="button" className="btn" aria-pressed={hanyaWajib} onClick={() => setHanyaWajib(!hanyaWajib)}
              style={hanyaWajib ? { borderColor: 'var(--s1)' } : undefined} title="Informasi terdokumentasi yang disyaratkan langsung oleh ISO 50001:2018">
              Hanya wajib ISO
            </button>
          )}
          <span style={{ flex: 1 }} />
          <button type="button" className="btn" onClick={unduhCsv}><Download aria-hidden="true" /><span className="teks">Unduh CSV</span></button>
        </div>

        {galat && <p className="pesan galat" role="alert" style={{ marginBottom: 12 }}>{galat}</p>}

        <div className="table-wrap tall">
          <table className="tbl">
            <thead>
              <tr>
                <th>Kode</th><th>Dokumen / rekaman</th><th>Keterangan</th><th>PIC</th><th>Tenggat</th><th className="num">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {tersaring.length === 0 && <tr className="kosong"><td colSpan={6}>Tidak ada dokumen yang cocok.</td></tr>}
              {tersaring.map((d) => {
                const grup = d.klausul_kode !== klausulTerakhir
                klausulTerakhir = d.klausul_kode
                const k = judulKlausul[d.klausul_kode]
                const lewat = terlambat(d, kini)
                const h = d.tenggat ? selisihHari(d.tenggat) : null
                const pk = grup ? kesiapan(rows.filter((x) => x.klausul_kode === d.klausul_kode)) : 0
                return [
                  grup && (
                    <tr key={`g-${d.klausul_kode}`} className="grup">
                      <td colSpan={6}>
                        <span className="ks-grup">
                          <span>{d.klausul_kode === 'P' ? 'Persiapan awal' : `Klausul ${d.klausul_kode}`} · {k?.judul}</span>
                          <span className="ks-grup-bar" aria-hidden="true"><i style={{ width: `${pk}%` }} /></span>
                          <span className="muted tnum" style={{ fontWeight: 400 }}>kesiapan {Math.round(pk)}%</span>
                        </span>
                      </td>
                    </tr>
                  ),
                  <tr key={d.id} className={lewat ? 'lewat' : undefined}>
                    <td className="kode">{d.kode}</td>
                    <td>
                      <Link className="judul" href={`/dokumen/${d.id}`}>{d.nama}</Link>
                      {d.wajib_iso && <> <Chip kode="info" label="Wajib ISO" /></>}
                      <span className="upd">{KELOMPOK[d.kelompok]}{d.nomor_dokumen && ` · ${d.nomor_dokumen}`}</span>
                    </td>
                    <td className="small ks-kol-catatan"><CatatanDokumen d={d} bisaUbah={bisaUnggah} /></td>
                    <td className="small">{d.pic ?? <span className="muted">–</span>}</td>
                    <td className="small tnum" style={{ whiteSpace: 'nowrap' }}>
                      {tanggal(d.tenggat)}
                      {h !== null && !adaBukti(d) && (
                        <span className={`upd ${lewat ? 'txt-bad' : ''}`}>{h < 0 ? `lewat ${-h} hari` : h === 0 ? 'hari ini' : `${h} hari lagi`}</span>
                      )}
                    </td>
                    <td className="num">
                      {(d.jumlah_berkas ?? 0) > 0
                        ? <button type="button" className="btn kecil" disabled={memuat === d.id} onClick={() => bukaPanel(d)} aria-label={`Lihat ${d.jumlah_berkas} berkas evidence ${d.kode}`}>
                            <Eye aria-hidden="true" /> {memuat === d.id ? 'Memuat…' : `${d.jumlah_berkas} berkas`}
                          </button>
                        : bisaUnggah
                          ? <button type="button" className="btn kecil utama" disabled={memuat === d.id} onClick={() => bukaPanel(d)} aria-label={`Unggah evidence ${d.kode}`}>
                              <Upload aria-hidden="true" /> {memuat === d.id ? 'Memuat…' : 'Unggah'}
                            </button>
                          : <span className="txt-bad small">belum ada</span>}
                    </td>
                  </tr>,
                ]
              })}
            </tbody>
            <tfoot>
              <tr><td colSpan={6}>{tersaring.length} dari {rows.length} dokumen · kesiapan tampilan ini {Math.round(kesiapan(tersaring))}% · Sumber: Checklist Monev, Dokumen Implementasi SMEn, Timeline Rev.3</td></tr>
            </tfoot>
          </table>
        </div>
      </div>
      {/* Event close dari dialog penampil berkas (bersarang) ikut "naik" lewat pohon React; abaikan agar panel tidak kosong tertinggal */}
      <dialog ref={dlg} className="panel" onClose={(e) => { if (e.target === e.currentTarget) setPanel(null) }} aria-labelledby="judul-evidence">
        {panel && (
          <div className="card">
            <div className="row">
              <div>
                <span className="eyebrow">{panel.d.kode} · Evidence</span>
                <h3 id="judul-evidence">{panel.d.nama}</h3>
                <p className="muted small">Klik berkas untuk melihatnya. Dokumen dihitung siap begitu ada minimal satu berkas.</p>
              </div>
              <button type="button" className="btn btn-ikon" aria-label="Tutup" onClick={() => dlg.current?.close()}><X aria-hidden="true" /></button>
            </div>
            <EvidenceBerkas key={panel.d.id} dokumenId={panel.d.id} berkas={panel.berkas} onBerubah={segarkanPanel} />
          </div>
        )}
      </dialog>
    </>
  )
}
