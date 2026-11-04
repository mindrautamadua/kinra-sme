'use client'

import { FileWarning, Link2Off, TimerReset } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { selisihHari, tanggal } from '@/lib/format'
import { adaBukti, kesiapan, kesiapanPerKlausul, terlambat } from '@/lib/status'
import type { Dokumen, Klausul } from '@/lib/types'

const fmt = (v: number, d = 0) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v)

// Angka bergerak halus ke nilai baru: dari 0 saat pertama tampil, lalu dari nilai lama saat saringan berubah.
// Server merender nilai akhir; dengan reduced motion angka langsung lompat.
function useTween(target: number, durasi = 900) {
  const [v, setV] = useState(target)
  const kini = useRef(0)
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { kini.current = target; setV(target); return }
    const dari = kini.current
    const t0 = performance.now()
    let raf = 0
    const langkah = (t: number) => {
      const p = Math.min(1, (t - t0) / durasi)
      kini.current = dari + (target - dari) * (1 - (1 - p) ** 3)
      setV(kini.current)
      if (p < 1) raf = requestAnimationFrame(langkah)
    }
    raf = requestAnimationFrame(langkah)
    return () => cancelAnimationFrame(raf)
  }, [target, durasi])
  return v
}

function Angka({ nilai, desimal = 0, akhiran = '' }: { nilai: number; desimal?: number; akhiran?: string }) {
  const v = useTween(nilai)
  return <><span aria-hidden="true">{fmt(v, desimal)}{akhiran}</span><span className="sr-only">{fmt(nilai, desimal)}{akhiran}</span></>
}

function CincinMini({ p }: { p: number }) {
  return (
    <svg className="ks-mini" viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r="15" pathLength={100} className="trk" />
      <circle cx="18" cy="18" r="15" pathLength={100} className="isi" style={{ strokeDasharray: `${p} 100` }} />
    </svg>
  )
}

export function PanelKesiapan({ rows, klausul, kini, kl, setKl, hanyaLewat, setHanyaLewat, tanpaBukti, setTanpaBukti }: {
  rows: Dokumen[]; klausul: Klausul[]; kini: string
  kl: string; setKl: (k: string) => void
  hanyaLewat: boolean; setHanyaLewat: (v: boolean) => void
  tanpaBukti: boolean; setTanpaBukti: (v: boolean) => void
}) {
  const hari = new Date(`${kini}T00:00:00`)
  const skor = kesiapan(rows)
  const lewat = rows.filter((d) => terlambat(d, kini)).length
  const kosongBukti = rows.filter((d) => !adaBukti(d)).length
  const adaEvidence = rows.length - kosongBukti
  const pekanIni = rows.filter((d) => d.tenggat && !adaBukti(d) && d.tenggat >= kini && selisihHari(d.tenggat, hari) <= 7).length

  const perKlausul = kesiapanPerKlausul(rows, klausul, kini)

  return (
    <div className="ks">
      <div className="card ks-ringkas">
        <div className="ks-ringkas-skor">
          <span className="eyebrow">Kesiapan</span>
          <b className="tnum"><Angka nilai={skor} desimal={1} /><small>%</small></b>
          <span className="muted small">{adaEvidence} dari {rows.length} dokumen sudah ada evidence</span>
        </div>
        <div className="ks-ringkas-kanan">
          <div className="stackbar ks-ringkas-bar" role="img" aria-label={`Kesiapan ${fmt(skor, 1)}%`}>
            <span className="bg-good" style={{ width: `${Math.min(100, skor)}%` }} />
          </div>
          <span className="muted small">Dokumen dihitung siap begitu minimal satu berkas evidence diunggah. Unggah lewat kolom Evidence di tabel.</span>
        </div>
      </div>

      <div className="ks-alerts">
        <button type="button" className={`insight ks-alert ${lewat ? 'kritis' : 'positif'}`} aria-pressed={hanyaLewat} onClick={() => setHanyaLewat(!hanyaLewat)}>
          <span className="area"><FileWarning aria-hidden="true" />Lewat tenggat</span>
          <span className="angka tnum"><Angka nilai={lewat} /><small> dokumen</small></span>
          <span className="ket">{lewat ? 'Klik untuk menampilkan hanya yang terlambat' : 'Semua dokumen masih dalam jadwal'}</span>
        </button>
        <button type="button" className={`insight ks-alert ${kosongBukti ? 'perhatian' : 'positif'}`} aria-pressed={tanpaBukti} onClick={() => setTanpaBukti(!tanpaBukti)}>
          <span className="area"><Link2Off aria-hidden="true" />Tanpa evidence</span>
          <span className="angka tnum"><Angka nilai={kosongBukti} /><small> dokumen</small></span>
          <span className="ket">{kosongBukti ? 'Belum ada berkas terunggah. Klik untuk menyaring' : 'Semua dokumen sudah punya evidence'}</span>
        </button>
        <div className="insight ks-alert info">
          <span className="area"><TimerReset aria-hidden="true" />Jatuh tempo 7 hari</span>
          <span className="angka tnum"><Angka nilai={pekanIni} /><small> dokumen</small></span>
          <span className="ket">Belum ada evidence dengan tenggat sampai {tanggal(new Date(hari.getTime() + 7 * 86_400_000))}</span>
        </div>
      </div>

      <div className="card ks-klausul">
        <div className="row">
          <div><h3>Kesiapan per klausul</h3><p className="muted small">Klik klausul untuk menyaring tabel · {perKlausul.filter((k) => k.p >= 100).length} dari {perKlausul.length} lengkap</p></div>
          {kl && <button type="button" className="btn kecil" onClick={() => setKl('')}>Tampilkan semua klausul</button>}
        </div>
        <div className="ks-strip" role="group" aria-label="Saring menurut klausul">
          {perKlausul.map((k, i) => (
            <button key={k.kode} type="button" aria-pressed={kl === k.kode} onClick={() => setKl(kl === k.kode ? '' : k.kode)}
              style={{ '--i': i } as React.CSSProperties} className={k.p >= 100 ? 'lengkap' : undefined}
              aria-label={`Klausul ${k.kode} ${k.judul}: kesiapan ${Math.round(k.p)}%, ${k.n} dokumen${k.lewat ? `, ${k.lewat} terlambat` : ''}`}>
              <CincinMini p={k.p} />
              <span className="ks-strip-isi">
                <span className="k mono">{k.kode === 'P' ? 'Persiapan' : `Klausul ${k.kode}`}{k.lewat > 0 && <em>{k.lewat} terlambat</em>}</span>
                <span className="j">{k.judul}</span>
              </span>
              <b className="tnum">{Math.round(k.p)}%</b>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
