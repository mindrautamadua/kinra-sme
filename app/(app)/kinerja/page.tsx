import { CircleCheck, CircleX } from 'lucide-react'
import Link from 'next/link'
import { AngkaNaik } from '@/components/AngkaNaik'
import { Chip } from '@/components/Chip'
import { Grafik } from '@/components/charts/Grafik'
import { SectionHead } from '@/components/SectionHead'
import { ambilKinerja } from '@/lib/data'
import { AMBANG, cusum, type HasilEnpi, LABEL_METODE, type Model, pasangan, ringkas, rumus } from '@/lib/enpi'
import { angka } from '@/lib/format'
import { DaftarEnpi, DaftarVariabel } from './KelolaEnpi'
import { TabelVariabel } from './TabelVariabel'

export const dynamic = 'force-dynamic'

const desimal = (satuan: string) => (satuan === 'TJ' ? 2 : 0)
const layak = (m: Model | null) => !!m && (m.r2 === null || m.r2 >= AMBANG.r2) && (m.cvrmse === null || m.cvrmse <= AMBANG.cvrmse) && m.n >= AMBANG.nMin
const SKALA = 30 // gauge ±30%

/** Gauge setengah lingkaran: kiri = lebih boros, kanan = lebih efisien. */
function Gauge({ p }: { p: number | null }) {
  const v = Math.max(-SKALA, Math.min(SKALA, p ?? 0))
  const len = (Math.abs(v) / SKALA) * 50
  const busur = 'M20,110 A90,90 0 0 1 200,110'
  return (
    <svg className="kj-gauge" viewBox="0 0 220 124" aria-hidden="true">
      <path d={busur} pathLength={100} className="trk" />
      <path d={busur} pathLength={100} className="zona boros" style={{ strokeDasharray: '49.4 100' }} />
      <path d={busur} pathLength={100} className="zona efisien" style={{ strokeDasharray: '49.4 100', strokeDashoffset: -50.6 }} />
      {p !== null && <path d={busur} pathLength={100} className={`isi ${v >= 0 ? 'efisien' : 'boros'}`}
        style={{ strokeDasharray: `${len} 100`, strokeDashoffset: v >= 0 ? -50 : -(50 - len) }} />}
      {[-SKALA, -SKALA / 2, 0, SKALA / 2, SKALA].map((t) => {
        const a = Math.PI - ((t + SKALA) / (2 * SKALA)) * Math.PI
        return <text key={t} x={110 + 106 * Math.cos(a)} y={112 - 106 * Math.sin(a)} className="tik">{t > 0 ? `+${t}` : t}</text>
      })}
      <g className="jarum" style={{ '--sudut': `${(v / SKALA) * 90}deg` } as React.CSSProperties}>
        <line x1="110" y1="110" x2="110" y2="34" />
        <circle cx="110" cy="110" r="7" />
      </g>
    </svg>
  )
}

/** Batang hemat per bulan: ke atas = hemat (biru), ke bawah = boros (merah). */
function SparkHemat({ h, tinggi = 40 }: { h: HasilEnpi; tinggi?: number }) {
  const p = pasangan(h.laporan)
  const maks = Math.max(0, ...p.map((t) => Math.abs(t.harapan - t.aktual)))
  if (!p.length) return <span className="muted small">Belum ada bulan pelaporan</span>
  return (
    <span className="kj-spark" style={{ height: tinggi }} aria-hidden="true">
      {p.map((t, i) => {
        const v = t.harapan - t.aktual
        return <i key={t.label} className={v >= 0 ? 'plus' : 'minus'} title={`${t.label}: ${v >= 0 ? 'hemat' : 'boros'} ${angka(Math.abs(v), desimal(h.satuan))} ${h.satuan}`}
          style={{ '--h': `${maks ? (Math.abs(v) / maks) * 50 : 0}%`, '--i': i } as React.CSSProperties} />
      })}
    </span>
  )
}

export default async function Kinerja({ searchParams }: { searchParams: Promise<{ tahun?: string }> }) {
  const { sumber, energi, variabel, dataVariabel, enpi, hasil } = await ambilKinerja()
  const aktif = hasil.filter((h) => h.enpi.aktif)
  const sp = await searchParams
  const daftarTahun = [...new Set([...energi.map((d) => d.tahun), new Date().getFullYear()])].sort()
  const tahun = Number(sp.tahun) || daftarTahun.at(-1)!
  const utama = aktif.find((h) => h.model && ringkas(h.laporan).bulan > 0)
  const ru = utama && ringkas(utama.laporan)
  const terpakai: Record<string, string[]> = {}
  for (const e of enpi) for (const v of e.variabel_kode) (terpakai[v] ??= []).push(e.kode)
  const ternormalisasi = aktif.filter((h) => h.enpi.metode !== 'absolut').length
  const m = utama?.model ?? null
  const cek = [
    { ok: aktif.length > 0, judul: 'EnPI aktif dipantau', ket: `${aktif.length} dari ${enpi.length} EnPI` },
    { ok: ternormalisasi > 0, judul: 'Ada EnPI ternormalisasi', ket: ternormalisasi ? `${ternormalisasi} rasio/regresi` : 'Baru EnPI absolut' },
    { ok: aktif.some((h) => h.enpi.metode !== 'absolut' && layak(h.model)), judul: 'Model baseline layak', ket: `R² ≥ ${angka(AMBANG.r2, 2)}, CV(RMSE) ≤ ${AMBANG.cvrmse}%, n ≥ ${AMBANG.nMin}` },
    { ok: aktif.length > 0 && aktif.every((h) => !h.laporan.some((t) => t.aktual !== null && t.harapan === null)), judul: 'Pelaporan terbandingkan', ket: 'Setiap bulan pelaporan punya nilai harapan' },
  ]

  return (
    <>
      <section>
        <SectionHead hero eyebrow="Klausul 6.4 & 6.5 · EnPI dan baseline energi (EnB)"
          judul={utama && ru?.perbaikan != null
            ? <>{utama.enpi.nama}: <span className={ru.perbaikan >= 0 ? 'ks-sorot' : 'kj-sorot-buruk'}>{ru.perbaikan >= 0 ? 'lebih efisien' : 'lebih boros'} {angka(Math.abs(ru.perbaikan), 1)}%</span> dibanding baseline</>
            : 'Kinerja energi belum dapat dihitung'}>
          <p className="muted">
            {ru && utama ? `${ru.bulan} bulan pelaporan sejak baseline berakhir, setara ${ru.hemat >= 0 ? 'penghematan' : 'kelebihan'} ${angka(Math.abs(ru.hemat), desimal(utama.satuan))} ${utama.satuan}. ` : ''}
            Perbaikan = (konsumsi harapan − aktual) ÷ harapan. Konsumsi harapan dihitung dari model baseline pada kondisi bulan berjalan, sehingga perubahan beban operasi tidak terbaca sebagai penghematan.
            {' '}{ternormalisasi === 0 && <b>Belum ada EnPI ternormalisasi (rasio/regresi): isi data variabel relevan lalu tambahkan EnPI per SEU.</b>}
          </p>
        </SectionHead>

        <div className="kj-hero">
          <div className="card kj-utama">
            {utama && ru ? (
              <>
                <div className="kj-gauge-wrap" role="img" aria-label={`Perbaikan ${utama.enpi.nama}: ${ru.perbaikan === null ? 'belum ada' : `${angka(ru.perbaikan, 1)}%`} dibanding baseline`}>
                  <Gauge p={ru.perbaikan} />
                  <div className="kj-gauge-ujung muted small" aria-hidden="true"><span>← Boros</span><span>Efisien →</span></div>
                  <div className="kj-gauge-nilai">
                    <b className={`tnum ${ru.perbaikan === null ? '' : ru.perbaikan >= 0 ? 'txt-good' : 'txt-bad'}`}>
                      {ru.perbaikan === null ? '–' : <AngkaNaik nilai={Math.abs(ru.perbaikan)} desimal={1} awalan={ru.perbaikan < 0 ? '−' : '+'} akhiran="%" />}
                    </b>
                    <span className="muted small">{ru.perbaikan !== null && ru.perbaikan >= 0 ? 'lebih efisien' : 'lebih boros'} dari baseline</span>
                  </div>
                </div>
                <div className="kj-utama-info">
                  <span className="eyebrow">{utama.enpi.kode} · EnPI utama</span>
                  <h3>{utama.enpi.nama}</h3>
                  <div className="kj-angka">
                    <div><span>{ru.hemat >= 0 ? 'Penghematan' : 'Kelebihan'}</span><b className="tnum"><AngkaNaik nilai={Math.abs(ru.hemat)} desimal={desimal(utama.satuan)} /><small>{utama.satuan}</small></b></div>
                    <div><span>Pelaporan</span><b className="tnum">{ru.bulan}<small>bulan</small></b></div>
                  </div>
                  <span className="muted small">Hemat per bulan</span>
                  <SparkHemat h={utama} tinggi={56} />
                </div>
              </>
            ) : <p className="muted">Belum ada EnPI aktif dengan data pelaporan. Lengkapi data energi setelah periode baseline.</p>}
          </div>

          <div className="kj-kanan">
            <div className="card kj-uji">
              <div className="row"><div><h3>Uji kelayakan model</h3><p className="muted small">Ambang ISO 50006 & ASHRAE Guideline 14{utama && ` · ${utama.enpi.kode}`}</p></div>
                {m && <Chip kode={layak(m) ? 'good' : 'warn'} label={layak(m) ? 'Model layak' : 'Perlu ditinjau'} />}
              </div>
              {[
                { label: 'R²', nilai: m?.r2 ?? null, teks: m?.r2 != null ? angka(m.r2, 2) : '–', p: (m?.r2 ?? 0) * 100, batas: AMBANG.r2 * 100, ok: m?.r2 == null ? null : m.r2 >= AMBANG.r2, ket: `≥ ${angka(AMBANG.r2, 2)}` },
                { label: 'CV(RMSE)', nilai: m?.cvrmse ?? null, teks: m?.cvrmse != null ? `${angka(m.cvrmse, 1)}%` : '–', p: ((m?.cvrmse ?? 0) / 30) * 100, batas: (AMBANG.cvrmse / 30) * 100, ok: m?.cvrmse == null ? null : m.cvrmse <= AMBANG.cvrmse, ket: `≤ ${AMBANG.cvrmse}%` },
                { label: 'Titik baseline', nilai: m?.n ?? null, teks: m ? `${m.n} bulan` : '–', p: ((m?.n ?? 0) / 24) * 100, batas: (AMBANG.nMin / 24) * 100, ok: m ? m.n >= AMBANG.nMin : null, ket: `≥ ${AMBANG.nMin} bulan` },
              ].map((u) => (
                <div key={u.label} className="kj-meter">
                  <div className="kj-meter-head">
                    <span>{u.label}</span>
                    <b className="tnum">{u.teks}</b>
                    <span className={`chip ${u.ok === null ? 'na' : u.ok ? 'good' : 'warn'}`}>{u.ok === null ? 'Tidak berlaku' : u.ok ? 'Lolos' : 'Belum'} · {u.ket}</span>
                  </div>
                  <div className="pg" role="img" aria-label={`${u.label} ${u.teks}, ambang ${u.ket}`}>
                    <div className="track"><b className={u.ok === null ? 'bg-na' : u.ok ? 'bg-good' : 'bg-warn'} style={{ width: `${Math.min(100, Math.max(0, u.p))}%` }} /><u style={{ left: `${u.batas}%` }} /></div>
                  </div>
                </div>
              ))}
            </div>
            <div className="kj-cek">
              {cek.map((c, i) => {
                const Ikon = c.ok ? CircleCheck : CircleX
                return (
                  <div key={c.judul} className={`kj-cek-item ${c.ok ? 'ok' : 'belum'}`} style={{ '--i': i } as React.CSSProperties}>
                    <Ikon aria-hidden="true" />
                    <b>{c.judul}</b>
                    <span className="muted small">{c.ok ? 'Terpenuhi' : 'Belum'} · {c.ket}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {aktif.length > 0 && (
          <div className="kj-papan" role="list" aria-label="Papan skor EnPI aktif">
            {aktif.map((h, i) => {
              const rr = ringkas(h.laporan)
              return (
                <a key={h.enpi.kode} role="listitem" href={`#enpi-${h.enpi.kode}`} className="kj-skor" style={{ '--i': i } as React.CSSProperties}>
                  <span className="eyebrow">{h.enpi.kode} · {h.enpi.metode}</span>
                  <b className="kj-skor-nama">{h.enpi.nama}</b>
                  <span className={`kj-skor-p tnum ${rr.perbaikan === null ? '' : rr.perbaikan >= 0 ? 'txt-good' : 'txt-bad'}`}>
                    {rr.perbaikan === null ? '–' : `${rr.perbaikan < 0 ? '−' : '+'}${angka(Math.abs(rr.perbaikan), 1)}%`}
                  </span>
                  <SparkHemat h={h} />
                  <span className="muted small">{h.galat ? 'Model belum terbentuk' : `${rr.bulan} bulan · ${rr.hemat >= 0 ? 'hemat' : 'boros'} ${angka(Math.abs(rr.hemat), desimal(h.satuan))} ${h.satuan}`}</span>
                </a>
              )
            })}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {aktif.length === 0 && <div className="card"><p className="muted">Belum ada EnPI aktif. Tambahkan di bagian definisi EnPI.</p></div>}
          {aktif.map((h) => <KartuEnpi key={h.enpi.kode} h={h} />)}
        </div>
      </section>

      <section id="variabel">
        <SectionHead no="01" eyebrow="Variabel relevan · input bulanan" judul={`Data variabel ${tahun}`}>
          <p className="muted">Variabel relevan adalah faktor terukur yang memengaruhi konsumsi energi secara signifikan dan rutin berubah. Tanpa data ini, EnPI tidak bisa dinormalisasi dan klaim penghematan sulit dibuktikan ke auditor.</p>
        </SectionHead>
        <div className="toolbar">
          <nav className="seg en-tahun" aria-label="Tahun">
            {daftarTahun.map((t) => <Link key={t} href={`/kinerja?tahun=${t}#variabel`} aria-current={t === tahun ? 'true' : undefined}>{t}</Link>)}
          </nav>
        </div>
        <TabelVariabel key={tahun} tahun={tahun} variabel={variabel} data={dataVariabel.filter((d) => d.tahun === tahun)} />
        <div style={{ marginTop: 16 }}><DaftarVariabel variabel={variabel} terpakai={terpakai} /></div>
      </section>

      <section>
        <SectionHead no="02" eyebrow="Definisi EnPI & EnB" judul={`${enpi.length} EnPI terdefinisi, ${aktif.length} aktif dipantau`}>
          <p className="muted">Tetapkan EnPI untuk organisasi dan untuk tiap SEU. Baseline disesuaikan bila ruang lingkup, fasilitas, atau variabel statis berubah signifikan (6.5); catat alasannya di kolom catatan.</p>
        </SectionHead>
        <DaftarEnpi enpi={enpi} sumber={sumber} variabel={variabel} />
      </section>
    </>
  )
}

function KartuEnpi({ h }: { h: HasilEnpi }) {
  const d = desimal(h.satuan)
  const r = ringkas(h.laporan)
  const semua = [...h.baseline, ...h.laporan]
  const bulat = (v: number | null) => (v === null ? null : Math.round(v * 10 ** (d + 1)) / 10 ** (d + 1))
  const cs = cusum(h.laporan)
  const fmt = (v: number) => angka(v, Math.abs(v) < 10 ? 3 : 1)
  const rm = rumus(h, fmt)
  const m = h.model
  const valid = layak(m)

  return (
    <div className="card kj-kartu" id={`enpi-${h.enpi.kode}`}>
      <div className="row">
        <div>
          <span className="eyebrow">{h.enpi.kode} · {LABEL_METODE[h.enpi.metode]}</span>
          <h3>{h.enpi.nama}</h3>
          <p className="muted small">
            Lingkup {h.enpi.sumber_kode.map((k) => k.toUpperCase()).join(' + ')} · baseline {h.enpi.baseline_mulai.slice(0, 7)} s.d. {h.enpi.baseline_selesai.slice(0, 7)}
            {h.variabel.length > 0 && ` · variabel: ${h.variabel.map((v) => v.nama).join(', ')}`}
          </p>
        </div>
        <div className="mini-stats">
          <div><span>Perbaikan</span><b className={`tnum ${r.perbaikan === null ? '' : r.perbaikan >= 0 ? 'txt-good' : 'txt-bad'}`}>{r.perbaikan === null ? '–' : `${r.perbaikan < 0 ? '−' : ''}${angka(Math.abs(r.perbaikan), 1)}%`}</b></div>
          <div><span>Hemat ({h.satuan})</span><b className="tnum">{r.bulan ? angka(r.hemat, d) : '–'}</b></div>
          {m?.r2 != null && <div><span>R²</span><b className="tnum">{angka(m.r2, 2)}</b></div>}
          {m?.cvrmse != null && <div><span>CV(RMSE)</span><b className="tnum">{angka(m.cvrmse, 1)}%</b></div>}
        </div>
      </div>

      {h.galat ? <p className="pesan galat">{h.galat}</p> : (
        <>
          <div className="kj-strip">
            <div><h3 style={{ fontSize: 13 }}>Hemat per bulan ({h.satuan})</h3><p className="muted small">Ke atas = hemat (biru) · ke bawah = boros (merah)</p></div>
            <SparkHemat h={h} tinggi={64} />
          </div>
          <div className="grid-2">
            <div>
              <h3 style={{ fontSize: 13 }}>Aktual vs harapan ({h.satuan})</h3>
              <p className="muted small">Bulan baseline lalu periode pelaporan. Harapan = konsumsi bila kinerja sama dengan baseline.</p>
              <Grafik tinggi={260} label={`${h.enpi.nama}: konsumsi aktual dibanding harapan`} spek={{
                jenis: 'garis', satuan: h.satuan, kategori: semua.map((t) => t.label),
                seri: [
                  { nama: 'Aktual', warna: 's1', data: semua.map((t) => bulat(t.aktual)) },
                  { nama: 'Harapan (baseline)', warna: 's3', putus: true, data: semua.map((t) => bulat(t.harapan)) },
                ],
              }} />
            </div>
            <div>
              <h3 style={{ fontSize: 13 }}>CUSUM selisih kumulatif ({h.satuan})</h3>
              <p className="muted small">Garis menurun = penghematan berkelanjutan. Garis naik = kinerja memburuk, cari penyebabnya.</p>
              {h.laporan.length ? (
                <Grafik tinggi={260} label={`${h.enpi.nama}: CUSUM`} spek={{
                  jenis: 'garis', satuan: h.satuan, kategori: h.laporan.map((t) => t.label),
                  seri: [{ nama: 'CUSUM', warna: (cs.filter((v) => v !== null).at(-1) ?? 0) <= 0 ? 's1' : 'merah', data: cs.map(bulat) }],
                }} />
              ) : <p className="muted small" style={{ marginTop: 24 }}>Belum ada data setelah periode baseline.</p>}
            </div>
          </div>
        </>
      )}

      {(rm || h.peringatan.length > 0) && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rm && <p className="small"><span className="mono">{rm}</span>{m && <span className="muted"> · n = {m.n} bulan</span>} {m && h.enpi.metode !== 'absolut' && <Chip kode={valid ? 'good' : 'warn'} label={valid ? 'Model layak' : 'Model perlu ditinjau'} />}</p>}
          {h.peringatan.map((p) => <p key={p} className="muted small">• {p}</p>)}
        </div>
      )}
    </div>
  )
}
