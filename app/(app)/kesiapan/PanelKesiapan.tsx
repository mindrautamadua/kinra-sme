'use client'

import { FileWarning, Link2Off, TimerReset } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { selisihHari, tanggal } from '@/lib/format'
import { adaBukti, adaSah, kemajuan, kesiapan, kesiapanPerKlausul, siapAudit, sudahFinal, terlambat } from '@/lib/status'
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
  const nSiap = rows.filter(siapAudit).length
  const nProses = rows.length - kosongBukti - nSiap
  const finalTanpaSah = rows.filter((d) => sudahFinal(d) && !adaSah(d)).length
  const banyakSah = rows.filter((d) => (d.jumlah_sah ?? 0) > 1).length
  const wajib = rows.filter((d) => d.wajib_iso)
  const wajibSiap = wajib.filter(siapAudit).length
  const pct = (n: number) => (rows.length ? (n / rows.length) * 100 : 0)
  const pekanIni = rows.filter((d) => d.tenggat && !adaBukti(d) && d.tenggat >= kini && selisihHari(d.tenggat, hari) <= 7).length

  const perKlausul = kesiapanPerKlausul(rows, klausul, kini)

  return (
    <div className="ks">
      <div className="card ks-ringkas">
        <div className="ks-ringkas-skor">
          <span className="eyebrow">Siap audit</span>
          <b className="tnum"><Angka nilai={skor} desimal={1} /><small>%</small></b>
          <span className="muted small">{nSiap} dari {rows.length} dokumen Final dengan berkas versi sah</span>
        </div>
        <div className="ks-ringkas-kanan">
          <div className="stackbar ks-ringkas-bar ks-tiga" role="img" aria-label={`Siap audit ${fmt(skor, 1)}%, ada evidence belum final/sah ${fmt(pct(nProses), 1)}%, belum ada evidence ${fmt(pct(kosongBukti), 1)}%`}>
            <span className="bg-good" style={{ width: `${pct(nSiap)}%` }} title={`Siap audit: ${nSiap}`} />
            <span className="bg-warn" style={{ width: `${pct(nProses)}%` }} title={`Ada evidence, belum final/sah: ${nProses}`} />
          </div>
          <span className="ks-tiga-legenda small">
            <span><i className="bg-good" />Siap audit {nSiap}</span>
            <span><i className="bg-warn" />Ada evidence, belum final/sah {nProses}</span>
            <span><i className="kosong" />Belum ada evidence {kosongBukti}</span>
          </span>
          <span className="muted small">
            Siap audit = status Final dan minimal satu berkas bertanda versi sah. Kemajuan evidence (berkas apa pun, termasuk draf): {fmt(kemajuan(rows), 1)}%.
            {wajib.length > 0 && <> <b className="ink-2">Wajib ISO 50001: {wajibSiap} dari {wajib.length} siap audit.</b></>}
            {finalTanpaSah > 0 && <> <b className="txt-bad">{finalTanpaSah} dokumen Final belum punya berkas versi sah.</b></>}
            {banyakSah > 0 && <> <b className="ink-2">{banyakSah} dokumen punya lebih dari satu berkas sah: tinjau dan lepas tanda pada draf bila ada.</b></>}
          </span>
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
          <div><h3>Kesiapan per klausul</h3><p className="muted small">Persentase = siap audit · batang hijau siap, kuning ada evidence tetapi belum final/sah · {perKlausul.filter((k) => k.p >= 100).length} dari {perKlausul.length} klausul siap penuh</p></div>
          {kl && <button type="button" className="btn kecil" onClick={() => setKl('')}>Tampilkan semua klausul</button>}
        </div>
        <div className="ks-strip" role="group" aria-label="Saring menurut klausul">
          {perKlausul.map((k, i) => (
            <button key={k.kode} type="button" aria-pressed={kl === k.kode} onClick={() => setKl(kl === k.kode ? '' : k.kode)}
              style={{ '--i': i } as React.CSSProperties} className={k.p >= 100 ? 'lengkap' : undefined}
              aria-label={`Klausul ${k.kode} ${k.judul}: siap audit ${Math.round(k.p)}%, ${k.nProses} ada evidence belum final/sah, ${k.n} dokumen${k.lewat ? `, ${k.lewat} terlambat` : ''}`}>
              <CincinMini p={k.p} />
              <span className="ks-strip-isi">
                <span className="k mono">{k.kode === 'P' ? 'Persiapan' : `Klausul ${k.kode}`}{k.lewat > 0 && <em>{k.lewat} terlambat</em>}</span>
                <span className="ks-mini-tiga" aria-hidden="true"><i className="bg-good" style={{ width: `${k.n ? (k.nSiap / k.n) * 100 : 0}%` }} /><i className="bg-warn" style={{ width: `${k.n ? (k.nProses / k.n) * 100 : 0}%` }} /></span>
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
