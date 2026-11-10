'use client'

import { ChevronLeft, ChevronRight, Maximize2, Minimize2, Pause, Play } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { CeritaEnergi } from '@/lib/cerita-energi'
import { angka } from '@/lib/format'

/** Durasi tiap adegan (detik). */
const DURASI = [7, 9, 8, 7, 8, 7]

const juta = (kwh: number) => angka(kwh / 1e6, 2)
const rpMiliar = (v: number) => (v >= 1e9 ? `Rp${angka(v / 1e9, 2)} miliar` : `Rp${angka(v / 1e6, 0)} juta`)
const WARNA: Record<string, string> = { 'KINRA-MTR-005': 'var(--ce-biru)', 'KINRA-MTR-004': 'var(--ce-jingga)', gedung: 'var(--ce-putih)', dexlite: 'var(--ce-merah)', dexlite_genset: 'var(--ce-merah)', bensin: 'var(--ce-merah-2)' }

function HitungNaik({ ke, aktif, format }: { ke: number; aktif: boolean; format: (v: number) => string }) {
  const [v, setV] = useState(aktif ? 0 : ke)
  useEffect(() => {
    if (!aktif) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setV(ke); return }
    let raf = 0
    const t0 = performance.now(), lama = 1400
    const langkah = (t: number) => {
      const p = Math.min(1, Math.max(0, (t - t0) / lama))
      setV(ke * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(langkah)
    }
    raf = requestAnimationFrame(langkah)
    return () => cancelAnimationFrame(raf)
  }, [ke, aktif])
  return <span className="tnum">{format(v)}</span>
}

export function CeritaEnergiPlayer({ c }: { c: CeritaEnergi }) {
  const [i, setI] = useState(0)
  const [main, setMain] = useState(true)
  const [penuh, setPenuh] = useState(false)
  const [mulai, setMulai] = useState(() => Date.now())
  const panggung = useRef<HTMLDivElement>(null)
  const N = DURASI.length

  const ke = useCallback((n: number) => { setI(((n % N) + N) % N); setMulai(Date.now()) }, [N])

  useEffect(() => {
    if (!main) return
    const t = setTimeout(() => ke(i + 1), DURASI[i] * 1000 - (Date.now() - mulai))
    return () => clearTimeout(t)
  }, [i, main, mulai, ke])

  useEffect(() => {
    const f = () => setPenuh(document.fullscreenElement === panggung.current)
    document.addEventListener('fullscreenchange', f)
    return () => document.removeEventListener('fullscreenchange', f)
  }, [])

  const layarPenuh = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await panggung.current?.requestFullscreen()
    } catch { /* layar penuh tidak tersedia di perangkat ini */ }
  }
  const tombol = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') ke(i + 1)
    else if (e.key === 'ArrowLeft') ke(i - 1)
    else if (e.key === ' ') { e.preventDefault(); setMain((m) => !m); setMulai(Date.now()) }
  }

  const air = c.bagian.filter((b) => b.kelompok === 'air').reduce((s, b) => s + b.porsi, 0)
  const wtp = c.bagian.find((b) => b.id === 'KINRA-MTR-005')
  const wwtp = c.bagian.find((b) => b.id === 'KINRA-MTR-004')

  return (
    <div className="ce">
      <div className={`ce-panggung ${penuh ? 'penuh' : ''}`} ref={panggung} tabIndex={0} onKeyDown={tombol} aria-roledescription="tayangan" aria-label="Ke mana energi KINRA pergi">
        <div className="ce-adegan" key={i} aria-live="polite">
          {i === 0 && (
            <div className="ce-a ce-a0">
              <p className="ce-kecil ce-m1">Dalam 12 bulan terakhir, KINRA memakai</p>
              <p className="ce-raksasa ce-m2"><HitungNaik ke={c.totalKwh} aktif format={juta} /><span className="ce-satuan">juta kWh</span></p>
              <p className="ce-sedang ce-m3">setara {rpMiliar(c.rupiah)} dan {angka(c.tonCo2, 0)} ton CO₂</p>
              <p className="ce-sumber ce-m4">Listrik 7 meter aset + BBM, {c.periode.mulai} – {c.periode.selesai} · tanpa listrik tenant</p>
            </div>
          )}
          {i === 1 && (
            <div className="ce-a ce-a1">
              <p className="ce-judul ce-m1">Dua instalasi air memakai <em>{angka(air, 0)}%</em> energi KINRA</p>
              <div className="ce-batang ce-m2" role="img" aria-label={c.bagian.map((b) => `${b.nama} ${angka(b.porsi, 1)}%`).join(', ')}>
                {c.bagian.map((b, n) => (
                  <span key={b.id} style={{ flexGrow: Math.max(b.porsi, 0.6), background: WARNA[b.id] ?? 'var(--ce-putih)', animationDelay: `${0.6 + n * 0.35}s` }} />
                ))}
              </div>
              <ol className="ce-daftar ce-m3">
                {c.bagian.map((b, n) => (
                  <li key={b.id} style={{ animationDelay: `${0.9 + n * 0.35}s` }}><i style={{ background: WARNA[b.id] ?? 'var(--ce-putih)' }} /><span>{b.nama}</span><b className="tnum">{angka(b.porsi, 1)}%</b></li>
                ))}
              </ol>
            </div>
          )}
          {i === 2 && (
            <div className="ce-a ce-a2">
              <p className="ce-kecil ce-m1">Setiap 1 m³ air bersih yang diolah dan dipompa WTP 1</p>
              {c.wtp?.kwhPerM3 ? (
                <p className="ce-raksasa ce-m2"><HitungNaik ke={c.wtp.kwhPerM3} aktif format={(v) => angka(v, 2)} /><span className="ce-satuan">kWh</span></p>
              ) : (
                <p className="ce-raksasa ce-m2"><HitungNaik ke={(wtp?.kwh ?? 0) / c.periode.bulan / 1000} aktif format={(v) => angka(v, 0)} /><span className="ce-satuan">ribu kWh/bulan</span></p>
              )}
              <p className="ce-sedang ce-m3">Pompa air baku, pengolahan, dan pompa distribusi bekerja 24 jam. Setiap kebocoran berarti listrik yang ikut terbuang.</p>
              <p className="ce-sumber ce-m4">{c.wtp?.kwhPerM3 ? `Meter WTP 1 dibagi air diolah WTP 1 (tanpa air WTP 2/BTM), ${c.wtp.bulanAir} bulan data` : 'Meter WTP 1, rata-rata per bulan'}</p>
            </div>
          )}
          {i === 3 && (
            <div className="ce-a ce-a3">
              <p className="ce-kecil ce-m1">Mengolah air limbah kawasan tanpa henti</p>
              <p className="ce-raksasa ce-m2"><HitungNaik ke={(c.wwtp?.kwhBulan ?? 0) / 30.4} aktif format={(v) => angka(v, 0)} /><span className="ce-satuan">kWh per hari</span></p>
              <p className="ce-sedang ce-m3">WWTP menyumbang {angka(wwtp?.porsi ?? 0, 0)}% energi KINRA. Aerasi dan pompa yang diatur tepat adalah peluang hemat terbesar berikutnya.</p>
              <p className="ce-sumber ce-m4">Meter WWTP, rata-rata {c.periode.mulai} – {c.periode.selesai}</p>
            </div>
          )}
          {i === 4 && (
            <div className="ce-a ce-a4">
              <p className="ce-judul ce-m1">Hemat energi dimulai dari pekerjaan kita</p>
              <ul className="ce-aksi">
                <li style={{ animationDelay: '0.8s' }}><b>Laporkan</b><span>kebocoran pipa, keran, dan lampu yang menyala siang hari</span></li>
                <li style={{ animationDelay: '1.6s' }}><b>Matikan</b><span>peralatan, AC, dan lampu yang tidak dipakai</span></li>
                <li style={{ animationDelay: '2.4s' }}><b>Catat</b><span>bacaan meter dan BBM tepat waktu dan sesuai bukti</span></li>
              </ul>
            </div>
          )}
          {i === 5 && (
            <div className="ce-a ce-a5">
              <img className="ce-logo ce-m1" src="/logo-kinra.png" alt="KINRA Sei Mangkei" />
              <p className="ce-judul ce-m2">KINRA berkomitmen meningkatkan kinerja energi secara berkelanjutan</p>
              <p className="ce-sumber ce-m3">Kebijakan Energi PT Kawasan Industri Nusantara · Sistem Manajemen Energi ISO 50001:2018</p>
            </div>
          )}
        </div>

        <div className="ce-kendali">
          <button type="button" onClick={() => ke(i - 1)} aria-label="Adegan sebelumnya"><ChevronLeft aria-hidden="true" /></button>
          <button type="button" onClick={() => { setMain((m) => !m); setMulai(Date.now()) }} aria-label={main ? 'Jeda' : 'Putar'}>{main ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}</button>
          <button type="button" onClick={() => ke(i + 1)} aria-label="Adegan berikutnya"><ChevronRight aria-hidden="true" /></button>
          <div className="ce-titik" role="tablist" aria-label="Adegan">
            {DURASI.map((d, n) => (
              <button key={n} type="button" role="tab" aria-selected={n === i} aria-label={`Adegan ${n + 1}`} onClick={() => ke(n)}>
                <i style={n === i && main ? { animationDuration: `${d}s` } : undefined} className={n < i ? 'lewat' : n === i ? (main ? 'jalan' : 'henti') : ''} />
              </button>
            ))}
          </div>
          <button type="button" onClick={layarPenuh} aria-label={penuh ? 'Keluar layar penuh' : 'Layar penuh'}>{penuh ? <Minimize2 aria-hidden="true" /> : <Maximize2 aria-hidden="true" />}</button>
        </div>
      </div>
      <p className="muted small">Kendali papan ketik: ← → pindah adegan, spasi jeda/putar. Rupiah dan CO₂ memakai tarif dan faktor emisi di parameter energi; faktor emisi listrik masih asumsi sampai diganti faktor grid KESDM.</p>
    </div>
  )
}
