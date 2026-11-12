'use client'

import { BadgeCheck, FileSpreadsheet, RefreshCw, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { pratinjauSinkron, terapkanSinkron } from '@/app/sinkron-actions'
import { useBoleh } from '@/components/Peran'
import { tanggal } from '@/lib/format'
import type { Pratinjau, SumberSinkron } from '@/lib/sinkron-register'

const adaUbah = (s: SumberSinkron) => s.tambah.length + s.ubah.length + s.hapus.length > 0

/** Tombol + dialog sinkron register isu & peluang dari berkas formulir yang diupload. */
export function SinkronFormulir() {
  const boleh = useBoleh()
  const router = useRouter()
  const dlg = useRef<HTMLDialogElement>(null)
  const [data, setData] = useState<Pratinjau | null>(null)
  const [pilih, setPilih] = useState<Set<string>>(new Set())
  const [pesan, setPesan] = useState<{ jenis: 'ok' | 'galat'; teks: string } | null>(null)
  const [sibuk, mulai] = useTransition()
  const bolehTerapkan = boleh('register.sinkron')

  if (!boleh('register.ubah')) return null

  function periksa() {
    setPesan(null); setData(null)
    dlg.current?.showModal()
    mulai(async () => {
      const r = await pratinjauSinkron()
      if (!r.ok) { setPesan({ jenis: 'galat', teks: r.pesan }); return }
      setData(r.data)
      setPilih(new Set(r.data.sumber.filter(adaUbah).map((s) => s.kunci)))
    })
  }

  function terapkan() {
    setPesan(null)
    mulai(async () => {
      const r = await terapkanSinkron([...pilih])
      if (!r.ok) { setPesan({ jenis: 'galat', teks: r.pesan }); return }
      setPesan({ jenis: 'ok', teks: `Register diperbarui: ${r.ringkas}` })
      router.refresh()
      const ulang = await pratinjauSinkron()
      if (ulang.ok) { setData(ulang.data); setPilih(new Set()) }
    })
  }

  const alih = (k: string) => setPilih((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n })
  const total = data?.sumber.filter((s) => pilih.has(s.kunci)).reduce((n, s) => n + s.tambah.length + s.ubah.length + s.hapus.length, 0) ?? 0

  return (
    <>
      <button type="button" className="btn" onClick={periksa}><RefreshCw aria-hidden="true" />Sinkron dari formulir</button>
      <dialog ref={dlg} className="panel sf-dlg" aria-labelledby="judul-sinkron" onClose={(e) => { if (e.target === e.currentTarget) setPesan(null) }}>
        <div className="card">
        <div className="row">
          <div>
            <span className="eyebrow">Klausul 4.1, 6.1 & 6.2 · sumber: berkas formulir yang diupload</span>
            <h3 id="judul-sinkron">Sinkron register dari formulir</h3>
          </div>
          <button type="button" className="btn btn-ikon" aria-label="Tutup" onClick={() => dlg.current?.close()}><X aria-hidden="true" /></button>
        </div>
        <p className="muted small">
          Aplikasi membaca berkas formulir di dokumen klausul 4.1, 6.1, dan 6.2: berkas bertanda <b>versi sah</b> lebih dulu, bila tidak ada dipakai yang terbaru diunggah.
          Perbarui berkas di Kesiapan Audit (dari OneDrive) sebelum sinkron. Tidak ada yang berubah sampai Anda menekan Terapkan.
        </p>

        {sibuk && !data && <p className="muted sf-memuat"><RefreshCw aria-hidden="true" className="putar" />Membaca berkas formulir…</p>}
        {pesan && <p className={`pesan ${pesan.jenis === 'ok' ? 'sukses' : 'galat'}`} role={pesan.jenis === 'ok' ? 'status' : 'alert'}>{pesan.teks}</p>}

        {data && (
          <>
            <p className="small muted">{data.diperiksa} berkas xlsx/docx diperiksa · {data.sumber.length} formulir dikenali{data.tidakDikenali.length ? ` · ${data.tidakDikenali.length} berkas bukan formulir register (dilewati)` : ''}.</p>
            {data.galat.map((g) => <p key={g} className="pesan galat">{g}</p>)}
            {data.sumber.length === 0 && <p className="muted">Belum ada berkas formulir isu/risiko/peluang yang diupload. Unggah formulirnya sebagai evidence di Kesiapan Audit, lalu ulangi.</p>}

            <div className="sf-daftar">
              {data.sumber.map((s) => {
                const ubah = adaUbah(s)
                return (
                  <details key={s.kunci} className={`sf-sumber${ubah ? '' : ' sama'}`} open={ubah && (s.hapus.length > 0 || s.kunci === 'peluang')}>
                    <summary>
                      <input type="checkbox" aria-label={`Terapkan ${s.judul}`} checked={pilih.has(s.kunci)} disabled={!ubah || !bolehTerapkan}
                        onClick={(e) => e.stopPropagation()} onChange={() => alih(s.kunci)} />
                      <span className="sf-judul">{s.judul}</span>
                      <span className="sf-angka">
                        {ubah ? <>
                          {s.tambah.length > 0 && <b className="tambah">+{s.tambah.length}</b>}
                          {s.ubah.length > 0 && <b className="ubah">~{s.ubah.length}</b>}
                          {s.hapus.length > 0 && <b className="hapus">−{s.hapus.length}</b>}
                        </> : <span className="muted">sudah sama</span>}
                        <span className="muted"> · {s.sama} sama</span>
                      </span>
                    </summary>
                    <div className="sf-isi">
                      {s.berkas.map((b) => (
                        <p key={b.nama} className="small sf-berkas">
                          <FileSpreadsheet aria-hidden="true" />{b.nama}
                          {b.sah && <span className="sf-sah"><BadgeCheck aria-hidden="true" />versi sah</span>}
                          <span className="muted"> · diunggah {tanggal(b.at)} · {b.dokumen}</span>
                        </p>
                      ))}
                      {s.diabaikan.length > 0 && <p className="small muted">Berkas lain untuk formulir yang sama tidak dipakai: {s.diabaikan.join(', ')}</p>}
                      {s.tambah.length > 0 && <><span className="eyebrow">Ditambah</span><ul>{s.tambah.map((x, i) => <li key={i}>{x.label}{x.detail && <span className="muted"> · {x.detail}</span>}</li>)}</ul></>}
                      {s.ubah.length > 0 && <><span className="eyebrow">Diperbarui</span><ul>{s.ubah.map((x, i) => <li key={i}>{x.label}<span className="muted"> · {x.kolom.join(', ')}</span></li>)}</ul></>}
                      {s.hapus.length > 0 && <><span className="eyebrow">Dihapus (tidak ada di formulir)</span><ul className="hapus">{s.hapus.map((x, i) => <li key={i}>{x.label}{x.detail && <span className="muted"> · {x.detail}</span>}</li>)}</ul></>}
                      {s.dilewati.length > 0 && <p className="small muted">Dilewati: {s.dilewati.join('; ')}</p>}
                      {s.catatan.map((c) => <p key={c} className="small muted">{c}</p>)}
                    </div>
                  </details>
                )
              })}
            </div>
            {data.tanpaBerkas.length > 0 && <p className="small muted">Risiko 6.1 bagian berikut tidak punya berkas upload, jadi tidak disentuh: {data.tanpaBerkas.join(', ')}.</p>}

            <div className="toolbar" style={{ marginTop: 14, marginBottom: 0 }}>
              <button type="button" className="btn" disabled={sibuk} onClick={periksa}><RefreshCw aria-hidden="true" />Periksa ulang</button>
              <span style={{ flex: 1 }} />
              {bolehTerapkan
                ? <button type="button" className="btn utama" disabled={sibuk || pilih.size === 0} onClick={terapkan}>{sibuk ? 'Menerapkan…' : `Terapkan ${pilih.size} sumber (${total} perubahan)`}</button>
                : <span className="muted small">Penerapan hanya oleh Admin karena dapat menghapus baris register.</span>}
            </div>
          </>
        )}
        </div>
      </dialog>
    </>
  )
}
