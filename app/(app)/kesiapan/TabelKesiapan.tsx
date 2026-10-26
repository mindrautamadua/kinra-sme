'use client'

import { Download, ExternalLink, Search, X } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { ubahStatusDokumen } from '@/app/actions'
import { Chip } from '@/components/Chip'
import { useBoleh } from '@/components/Peran'
import { selisihHari, tanggal } from '@/lib/format'
import { KELOMPOK, kesiapan, STATUS, terlambat, URUTAN_STATUS } from '@/lib/status'
import type { Dokumen, KelompokDokumen, Klausul, StatusDokumen } from '@/lib/types'
import { PanelKesiapan } from './PanelKesiapan'

export function TabelKesiapan({ dokumen, klausul, kini, klausulAwal, statusAwal }: {
  dokumen: Dokumen[]; klausul: Klausul[]; kini: string; klausulAwal: string; statusAwal: string
}) {
  const [rows, setRows] = useState(dokumen)
  const [kelompok, setKelompok] = useState<KelompokDokumen | ''>('')
  const [status, setStatus] = useState<StatusDokumen | ''>((URUTAN_STATUS as string[]).includes(statusAwal) ? (statusAwal as StatusDokumen) : '')
  const [kl, setKl] = useState(klausulAwal)
  const [cari, setCari] = useState('')
  const [hanyaLewat, setHanyaLewat] = useState(false)
  const [tanpaBukti, setTanpaBukti] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const [, mulai] = useTransition()
  const bisa = useBoleh()

  const judulKlausul = useMemo(() => Object.fromEntries(klausul.map((k) => [k.kode, k])), [klausul])

  const tersaring = useMemo(() => {
    const q = cari.trim().toLowerCase()
    return rows
      .filter((d) => (!kelompok || d.kelompok === kelompok) && (!status || d.status === status) && (!kl || d.klausul_kode === kl))
      .filter((d) => !hanyaLewat || terlambat(d, kini))
      .filter((d) => !tanpaBukti || !d.link_eksternal)
      .filter((d) => !q || `${d.kode} ${d.nama} ${d.pic ?? ''} ${d.nomor_dokumen ?? ''} ${d.keterangan ?? ''}`.toLowerCase().includes(q))
      .sort((a, b) => (judulKlausul[a.klausul_kode]?.urutan ?? 0) - (judulKlausul[b.klausul_kode]?.urutan ?? 0) || a.kode.localeCompare(b.kode))
  }, [rows, kelompok, status, kl, cari, hanyaLewat, tanpaBukti, kini, judulKlausul])

  const adaSaring = !!(kelompok || status || kl || cari || hanyaLewat || tanpaBukti)
  function reset() {
    setKelompok(''); setStatus(''); setKl(''); setCari(''); setHanyaLewat(false); setTanpaBukti(false)
  }

  function ganti(d: Dokumen, s: StatusDokumen) {
    const lama = d.status
    setRows((r) => r.map((x) => (x.id === d.id ? { ...x, status: s } : x)))
    setGalat(null)
    mulai(async () => {
      const h = await ubahStatusDokumen(d.id, s)
      if (!h.ok) {
        setRows((r) => r.map((x) => (x.id === d.id ? { ...x, status: lama } : x)))
        setGalat(`Status ${d.kode} gagal disimpan: ${h.pesan}`)
      }
    })
  }

  function unduhCsv() {
    const kolom = ['Kode', 'Klausul', 'Kelompok', 'Nama', 'Nomor dokumen', 'PIC', 'Status', 'Tenggat', 'Evidence OneDrive', 'Keterangan']
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const isi = tersaring.map((d) => [d.kode, d.klausul_kode, KELOMPOK[d.kelompok], d.nama, d.nomor_dokumen, d.pic, STATUS[d.status].label, d.tenggat, d.link_eksternal, d.keterangan].map(esc).join(','))
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
      <PanelKesiapan rows={rows} klausul={klausul} kini={kini} status={status} setStatus={setStatus} kl={kl} setKl={setKl}
        hanyaLewat={hanyaLewat} setHanyaLewat={setHanyaLewat} tanpaBukti={tanpaBukti} setTanpaBukti={setTanpaBukti} />
      <div className="card ks-tabel" id="tabel-kesiapan">
        <div className="row">
          <div><h3>Lembar monitoring</h3><p className="muted small">Skor, cincin, dan pipeline di atas ikut bergerak saat status berubah</p></div>
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
          <label>
            <span className="sr-only">Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value as StatusDokumen | '')}>
              <option value="">Semua status</option>
              {URUTAN_STATUS.map((s) => <option key={s} value={s}>{STATUS[s].label}</option>)}
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
          <span style={{ flex: 1 }} />
          <button type="button" className="btn" onClick={unduhCsv}><Download aria-hidden="true" /><span className="teks">Unduh CSV</span></button>
        </div>

        {galat && <p className="pesan galat" role="alert" style={{ marginBottom: 12 }}>{galat}</p>}

        <div className="table-wrap tall">
          <table className="tbl">
            <thead>
              <tr>
                <th>Kode</th><th>Dokumen / rekaman</th><th>PIC</th><th>Status</th><th>Tenggat</th><th className="num">Evidence</th>
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
                const tahap = URUTAN_STATUS.indexOf(d.status)
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
                      <span className="upd">{KELOMPOK[d.kelompok]}{d.nomor_dokumen && ` · ${d.nomor_dokumen}`}{d.keterangan && ` · ${d.keterangan}`}</span>
                    </td>
                    <td className="small">{d.pic ?? <span className="muted">–</span>}</td>
                    <td>
                      {bisa('dokumen.ubah') ? (
                        <label>
                          <span className="sr-only">Status {d.kode}</span>
                          <select className={`inline status-sel ${STATUS[d.status].chip}`} value={d.status} onChange={(e) => ganti(d, e.target.value as StatusDokumen)}>
                            {URUTAN_STATUS.map((s) => <option key={s} value={s} disabled={(s === 'disetujui' || s === 'final') && !bisa('dokumen.setujui')}>{STATUS[s].label}</option>)}
                          </select>
                        </label>
                      ) : <Chip kode={STATUS[d.status].chip} label={STATUS[d.status].label} />}
                      <span className={`ks-step st-${STATUS[d.status].chip}`} aria-hidden="true">
                        {URUTAN_STATUS.slice(1).map((s, i) => <i key={s} className={i < tahap ? 'on' : undefined} />)}
                      </span>
                    </td>
                    <td className="small tnum" style={{ whiteSpace: 'nowrap' }}>
                      {tanggal(d.tenggat)}
                      {h !== null && d.status !== 'final' && d.status !== 'disetujui' && (
                        <span className={`upd ${lewat ? 'txt-bad' : ''}`}>{h < 0 ? `lewat ${-h} hari` : h === 0 ? 'hari ini' : `${h} hari lagi`}</span>
                      )}
                    </td>
                    <td className="num">
                      {d.link_eksternal
                        ? <a href={d.link_eksternal} target="_blank" rel="noreferrer" className="small" aria-label={`Buka evidence ${d.kode} di OneDrive`}>OneDrive <ExternalLink size={11} aria-hidden="true" /></a>
                        : <Link href={`/dokumen/${d.id}`} className="txt-bad small">belum</Link>}
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
    </>
  )
}
