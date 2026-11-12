import { CircleCheck, CircleX } from 'lucide-react'
import Link from 'next/link'
import { AngkaNaik } from '@/components/AngkaNaik'
import { Chip } from '@/components/Chip'
import { Grafik } from '@/components/charts/Grafik'
import { SectionHead } from '@/components/SectionHead'
import { Istilah } from '@/components/Istilah'
import { ambilDeviasi, ambilKinerja, ambilParameter, ambilSasaran, ambilSeu } from '@/lib/data'
import { hitungDekomposisi, pilihLingkup, tahunTersedia } from '@/lib/dekomposisi'
import { nilaiEnergi, rupiahRingkas, susunKonversi, tonCo2 } from '@/lib/konversi'
import { deteksiDeviasi, gabungDeviasi, hariSejak, terbuka as deviasiTerbuka } from '@/lib/deviasi'
import { hariIni } from '@/lib/format'
import { AMBANG, cusum, type HasilEnpi, LABEL_METODE, modelLayak, pasangan, pilihEnpiUtama, ringkas, rumus, type Titik } from '@/lib/enpi'
import { angka } from '@/lib/format'
import { DaftarDeviasi } from './DaftarDeviasi'
import { DaftarEnpi, DaftarVariabel } from './KelolaEnpi'
import { TabelVariabel } from './TabelVariabel'
import { Waterfall } from './Waterfall'

export const dynamic = 'force-dynamic'

const desimal = (satuan: string) => (satuan === 'TJ' ? 2 : 0)
/** Model layak hanya berlaku untuk EnPI rasio/regresi; EnPI absolut tidak punya model (R² dan CV(RMSE) kosong). */
const layak = modelLayak
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

export default async function Kinerja({ searchParams }: { searchParams: Promise<{ tahun?: string; banding?: string }> }) {
  const [{ sumber, energi, variabel, dataVariabel, enpi, hasil, meter, bacaan }, register, { aksi }, param, { seu }] = await Promise.all([ambilKinerja(), ambilDeviasi(), ambilSasaran(), ambilParameter(), ambilSeu()])
  const kv = susunKonversi(param)
  const nilaiHemat = (h: HasilEnpi, v: number) => (h.satuan === 'TJ' ? null : nilaiEnergi(kv, Math.abs(v), h.satuan, h.enpi.sumber_kode[0]))
  const kini = hariIni()
  const { baris: barisDeviasi, sisa: sisaDeviasi } = gabungDeviasi(deteksiDeviasi(hasil), register)
  const deviasiBuka = barisDeviasi.filter((b) => deviasiTerbuka(b.r))
  const jumlahDeviasi = (kode: string) => deviasiBuka.filter((b) => b.d.enpi_kode === kode).length
  const aktif = hasil.filter((h) => h.enpi.aktif)
  // Lingkup KINRA = dasar klaim kinerja; lingkup kawasan memuat listrik tenant dan hanya konteks
  const kinra = (h: HasilEnpi) => (h.enpi.lingkup ?? 'kinra') === 'kinra'
  const aktifKinra = aktif.filter(kinra)
  const aktifKawasan = aktif.filter((h) => !kinra(h))
  const sp = await searchParams
  const daftarTahun = [...new Set([...energi.map((d) => d.tahun), new Date().getFullYear()])].sort()
  const tahun = Number(sp.tahun) || daftarTahun.at(-1)!
  const utama = pilihEnpiUtama(hasil)

  // Jembatan perubahan energi: bandingkan dua tahun berurutan yang punya bacaan meter (default: dua tahun terakhir)
  const tahunMeter = tahunTersedia(bacaan, pilihLingkup(hasil, meter))
  const pasanganTahun = tahunMeter.slice(1).map((b) => ({ a: b - 1, b })).filter((p) => tahunMeter.includes(p.a))
  const diminta = sp.banding?.match(/^(\d{4})-(\d{4})$/)
  const banding = (diminta && pasanganTahun.find((p) => p.a === Number(diminta[1]) && p.b === Number(diminta[2]))) || pasanganTahun.at(-1)
  const dekomposisi = banding ? hitungDekomposisi({ hasil, seu, meter, bacaan, variabelData: dataVariabel, tahunA: banding.a, tahunB: banding.b }) : null
  const ekstra = utama?.ekstrapolasi ?? 0

  // EnPI absolut yang "boros" padahal ada EnPI ternormalisasi untuk lingkup yang sama: jelaskan penyebabnya.
  // Lingkup sama = lingkup (KINRA/kawasan), sumber energi, dan himpunan meter sama; EnPI berbasis meter tidak
  // disamakan hanya karena sama-sama bersumber PLN.
  const himpunanSama = (a: string[], b: string[]) => a.length === b.length && a.every((k) => b.includes(k))
  const samaLingkup = (a: HasilEnpi, b: HasilEnpi) => (a.enpi.lingkup ?? 'kinra') === (b.enpi.lingkup ?? 'kinra')
    && himpunanSama(a.enpi.sumber_kode, b.enpi.sumber_kode) && himpunanSama(a.enpi.meter_kode ?? [], b.enpi.meter_kode ?? [])
  const tenant = variabel.find((v) => v.kode === 'tenant')
  const nilaiTenant = (th: number, bl: number) => dataVariabel.find((d) => d.variabel_kode === 'tenant' && d.tahun === th && d.bulan === bl)?.nilai
  const catatanAbsolut = aktif.filter((h) => h.enpi.metode === 'absolut' && (ringkas(h.laporan).perbaikan ?? 0) < 0)
    .map((h) => {
      const pasangannya = aktif.find((x) => x !== h && x.enpi.metode !== 'absolut' && !x.galat && samaLingkup(x, h))
      if (!pasangannya) return null
      if (kinra(h)) return { kode: h.enpi.kode, teks: `${h.enpi.kode} memakai metode absolut: konsumsi dibandingkan langsung dengan bulan yang sama pada baseline tanpa memperhitungkan perubahan variabel relevan, sehingga kenaikan beban operasi ikut terbaca sebagai boros. Untuk menilai efisiensi, lihat ${pasangannya.enpi.kode} yang dinormalisasi variabel relevan.` }
      const awal = h.baseline.find((t) => nilaiTenant(t.tahun, t.bulan) !== undefined)
      const akhir = [...h.laporan].reverse().find((t) => t.aktual !== null && nilaiTenant(t.tahun, t.bulan) !== undefined)
      const tumbuh = tenant && awal && akhir ? ` Jumlah tenant naik dari ${angka(nilaiTenant(awal.tahun, awal.bulan))} (${awal.label}) menjadi ${angka(nilaiTenant(akhir.tahun, akhir.bulan))} (${akhir.label}).` : ''
      return { kode: h.enpi.kode, teks: `${h.enpi.kode} memakai metode absolut: konsumsi dibandingkan langsung dengan bulan yang sama pada baseline tanpa memperhitungkan perubahan kondisi operasi, sehingga kenaikan akibat pertumbuhan tenant ikut terbaca sebagai boros.${tumbuh} Untuk menilai efisiensi kawasan, lihat ${pasangannya.enpi.kode} yang dinormalisasi variabel relevan. Keduanya berlingkup kawasan (data PLN termasuk tenant), jadi bukan dasar klaim kinerja SMEn KINRA.` }
    }).filter((x): x is { kode: string; teks: string } => !!x)
  const ru = utama && ringkas(utama.laporan)
  const terpakai: Record<string, string[]> = {}
  for (const e of enpi) for (const v of e.variabel_kode) (terpakai[v] ??= []).push(e.kode)
  const ternormalisasi = aktifKinra.filter((h) => h.enpi.metode !== 'absolut').length
  const m = utama?.model ?? null
  const cek = [
    { ok: aktifKinra.length > 0, judul: 'EnPI lingkup KINRA dipantau', ket: `${aktifKinra.length} lingkup KINRA, ${aktifKawasan.length} konteks kawasan` },
    { ok: ternormalisasi > 0, judul: 'Ada EnPI ternormalisasi', ket: ternormalisasi ? `${ternormalisasi} rasio/regresi` : 'Baru EnPI absolut' },
    { ok: aktifKinra.some((h) => h.enpi.metode !== 'absolut' && layak(h.model)), judul: 'Model baseline layak', ket: `R² ≥ ${angka(AMBANG.r2, 2)}, CV(RMSE) ≤ ${AMBANG.cvrmse}%, n ≥ ${AMBANG.nMin}` },
    { ok: aktifKinra.length > 0 && aktifKinra.every((h) => !h.laporan.some((t) => t.aktual !== null && t.harapan === null)), judul: 'Pelaporan terbandingkan', ket: 'Setiap bulan pelaporan punya nilai harapan' },
  ]

  return (
    <>
      <section>
        <SectionHead hero eyebrow={<>Klausul 6.4 & 6.5 · <Istilah kata="EnPI" /> dan baseline energi (<Istilah kata="EnB" />)</>}
          judul={utama && ru?.perbaikan != null && ekstra > 0
            ? <>{utama.enpi.nama}: <span className="kj-sorot-buruk">penghematan belum dapat diklaim</span>, {ekstra} bulan pelaporan di luar rentang baseline</>
            : utama && ru?.perbaikan != null
            ? <>{utama.enpi.nama}: <span className={ru.perbaikan >= 0 ? 'ks-sorot' : 'kj-sorot-buruk'}>{ru.perbaikan >= 0 ? 'lebih efisien' : 'lebih boros'} {angka(Math.abs(ru.perbaikan), 1)}%</span> dibanding baseline</>
            : aktifKinra.length ? 'EnPI lingkup KINRA menunggu data bacaan meter' : 'Kinerja energi belum dapat dihitung'}>
          <p className="muted">
            {ru && utama ? `${ru.bulan} bulan pelaporan sejak baseline berakhir, setara ${ru.hemat >= 0 ? 'penghematan' : 'kelebihan'} ${angka(Math.abs(ru.hemat), desimal(utama.satuan))} ${utama.satuan}. ` : ''}
            Perbaikan = (konsumsi harapan − aktual) ÷ harapan.{' '}
            {utama?.enpi.metode === 'absolut'
              ? <>Pada {utama.enpi.kode} (metode absolut), harapan = konsumsi bulan yang sama pada periode baseline tanpa normalisasi, sehingga kenaikan beban operasi (mis. volume air WTP) ikut terbaca sebagai boros dan penghematan dari aksi efisiensi bisa tertutup. Gunakan EnPI rasio/regresi per SEU untuk menilai efisiensi.</>
              : <>Konsumsi harapan dihitung dari model baseline pada kondisi bulan berjalan, sehingga perubahan beban operasi tidak terbaca sebagai penghematan.</>}
            {ekstra > 0 && <b> Angka di bawah adalah hasil ekstrapolasi model; kondisi operasi berubah besar sejak baseline, pertimbangkan penyesuaian baseline (6.5).</b>}
            {!utama && aktifKinra.length > 0 && <b> EnPI lingkup KINRA ({aktifKinra.map((h) => h.enpi.kode).join(', ')}) diukur dari bacaan stand meter aset di halaman Aset & Meter; baseline terbentuk setelah 12 bulan bacaan. EnPI kawasan di bawah memuat listrik tenant sehingga hanya menjadi konteks.</b>}
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
                {m && (utama?.enpi.metode === 'absolut'
                  ? <Chip kode="info" label="Metode absolut, tanpa model" />
                  : <Chip kode={layak(m) ? 'good' : 'warn'} label={layak(m) ? 'Model layak' : 'Perlu ditinjau'} />)}
              </div>
              {[
                { label: 'R²', nilai: m?.r2 ?? null, teks: m?.r2 != null ? angka(m.r2, 2) : '–', p: (m?.r2 ?? 0) * 100, batas: AMBANG.r2 * 100, ok: m?.r2 == null ? null : m.r2 >= AMBANG.r2, ket: `≥ ${angka(AMBANG.r2, 2)}`,
                  artinya: m?.r2 != null ? `Artinya ${angka(m.r2 * 100, 0)}% naik-turunnya konsumsi dijelaskan oleh variabel relevan.` : 'Metode absolut tidak memakai model, sehingga R² tidak berlaku.' },
                { label: 'CV(RMSE)', nilai: m?.cvrmse ?? null, teks: m?.cvrmse != null ? `${angka(m.cvrmse, 1)}%` : '–', p: ((m?.cvrmse ?? 0) / 30) * 100, batas: (AMBANG.cvrmse / 30) * 100, ok: m?.cvrmse == null ? null : m.cvrmse <= AMBANG.cvrmse, ket: `≤ ${AMBANG.cvrmse}%`,
                  artinya: m?.cvrmse != null ? `Artinya perkiraan model rata-rata meleset sekitar ${angka(m.cvrmse, 0)}% dari konsumsi aktual.` : 'Berlaku untuk EnPI rasio atau regresi.' },
                { label: 'Titik baseline', nilai: m?.n ?? null, teks: m ? `${m.n} bulan` : '–', p: ((m?.n ?? 0) / 24) * 100, batas: (AMBANG.nMin / 24) * 100, ok: m ? m.n >= AMBANG.nMin : null, ket: `≥ ${AMBANG.nMin} bulan`,
                  artinya: m ? `Model dibentuk dari ${m.n} bulan data; minimal 12 agar pola musiman tertangkap.` : 'Belum ada data baseline.' },
              ].map((u) => (
                <div key={u.label} className="kj-meter">
                  <div className="kj-meter-head">
                    <span><Istilah kata={u.label === 'Titik baseline' ? 'EnB' : u.label}>{u.label}</Istilah></span>
                    <b className="tnum">{u.teks}</b>
                    <span className={`chip ${u.ok === null ? 'na' : u.ok ? 'good' : 'warn'}`}>{u.ok === null ? 'Tidak berlaku' : u.ok ? 'Lolos' : 'Belum'} · {u.ket}</span>
                  </div>
                  <div className="pg" role="img" aria-label={`${u.label} ${u.teks}, ambang ${u.ket}`}>
                    <div className="track"><b className={u.ok === null ? 'bg-na' : u.ok ? 'bg-good' : 'bg-warn'} style={{ width: `${Math.min(100, Math.max(0, u.p))}%` }} /><u style={{ left: `${u.batas}%` }} /></div>
                  </div>
                  <p className="kj-artinya">{u.artinya}</p>
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

        {[
          { daftar: aktifKinra, judul: 'Lingkup SMEn KINRA', ket: 'Dasar klaim kinerja energi: aset dan fasilitas dalam kendali KINRA' },
          { daftar: aktifKawasan, judul: 'Konteks kawasan (termasuk tenant)', ket: 'Bukan dasar klaim kinerja SMEn; bahan koordinasi dengan tenant' },
        ].filter((g) => g.daftar.length > 0).map(({ daftar, judul, ket }) => (
          <div key={judul} style={{ marginBottom: 16 }}>
            <div className="row" style={{ marginBottom: 8 }}><div><span className="eyebrow">{judul}</span><p className="muted small">{ket}</p></div></div>
            <div className="kj-papan" role="list" aria-label={`Papan skor EnPI ${judul}`}>
            {daftar.map((h, i) => {
              const rr = ringkas(h.laporan)
              return (
                <a key={h.enpi.kode} role="listitem" href={`#enpi-${h.enpi.kode}`} className="kj-skor" style={{ '--i': i } as React.CSSProperties}>
                  <span className="eyebrow">{h.enpi.kode} · {h.enpi.metode}</span>
                  <b className="kj-skor-nama">{h.enpi.nama}</b>
                  <span className={`kj-skor-p tnum ${rr.perbaikan === null ? '' : rr.perbaikan >= 0 ? 'txt-good' : 'txt-bad'}`}>
                    {rr.perbaikan === null ? '–' : `${rr.perbaikan < 0 ? '−' : '+'}${angka(Math.abs(rr.perbaikan), 1)}%`}
                  </span>
                  <SparkHemat h={h} />
                  {(h.ekstrapolasi > 0 || h.enpi.kode === utama?.enpi.kode || jumlahDeviasi(h.enpi.kode) > 0) && (
                    <span style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {h.enpi.kode === utama?.enpi.kode && <Chip kode="info" label="EnPI utama" />}
                      {h.ekstrapolasi > 0 && <Chip kode="warn" label="Ekstrapolasi" />}
                      {jumlahDeviasi(h.enpi.kode) > 0 && <Chip kode="crit" label={`${jumlahDeviasi(h.enpi.kode)} deviasi terbuka`} />}
                    </span>
                  )}
                  <span className="muted small">{h.galat ? (h.enpi.meter_kode?.length ? 'Menunggu bacaan meter' : 'Model belum terbentuk') : `${rr.bulan} bulan · ${rr.hemat >= 0 ? 'hemat' : 'boros'} ${angka(Math.abs(rr.hemat), desimal(h.satuan))} ${h.satuan}${nilaiHemat(h, rr.hemat) ? ` · ${rupiahRingkas(nilaiHemat(h, rr.hemat)!.rupiah)} · ${tonCo2(nilaiHemat(h, rr.hemat)!.kgCo2)}` : ''}`}</span>
                </a>
              )
            })}
            </div>
          </div>
        ))}

        {catatanAbsolut.map((c) => <p key={c.kode} className="pesan" style={{ marginBottom: 16 }}>{c.teks}</p>)}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {aktif.length === 0 && <div className="card"><p className="muted">Belum ada EnPI aktif. Tambahkan di bagian definisi EnPI.</p></div>}
          {aktif.map((h) => <KartuEnpi key={h.enpi.kode} h={h} />)}
        </div>
      </section>

      {dekomposisi && (
        <section id="mengapa">
          <SectionHead no="01" eyebrow={<>ISO 50006 & 50015 · dekomposisi perubahan energi</>} judul="Mengapa konsumsi listrik berubah?">
            <p className="muted">Kenaikan kWh belum tentu pemborosan. Setiap perubahan dipecah menjadi kondisi operasi (mis. volume air yang diolah naik), kinerja sebenarnya setelah dinormalisasi oleh model EnPI tiap SEU, dan pengguna yang belum punya variabel relevan. Inilah jawaban untuk pertanyaan auditor “apa bukti kinerja energi membaik?”.</p>
          </SectionHead>
          <Waterfall d={dekomposisi} pasangan={pasanganTahun} tarif={kv.tarifListrik} />
        </section>
      )}

      <section id="deviasi">
        <SectionHead no={dekomposisi ? '02' : '01'} eyebrow="Klausul 9.1 · Deviasi signifikan kinerja energi" judul={deviasiBuka.length ? `${deviasiBuka.length} deviasi signifikan perlu diselidiki` : 'Tidak ada deviasi signifikan terbuka'}>
          <p className="muted">ISO 50001 mewajibkan deviasi signifikan kinerja energi diselidiki dan ditanggapi. Aplikasi mendeteksinya otomatis dari model EnPI lingkup KINRA setiap bulan; tim mencatat penyebab, tindakan, dan verifikasinya di sini.</p>
        </SectionHead>
        <DaftarDeviasi baris={barisDeviasi.map((b) => ({ ...b, umur: hariSejak(b.d.tahun, b.d.bulan, kini) }))} sisa={sisaDeviasi}
          aksi={aksi.map((a) => ({ kode: a.kode, uraian: a.uraian }))} />
      </section>

      <section id="variabel">
        <SectionHead no={dekomposisi ? '03' : '02'} eyebrow="Variabel relevan · input bulanan" judul={`Data variabel ${tahun}`}>
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
        <SectionHead no={dekomposisi ? '04' : '03'} eyebrow="Definisi EnPI & EnB" judul={`${enpi.length} EnPI terdefinisi, ${aktif.length} aktif dipantau`}>
          <p className="muted">Tetapkan EnPI untuk organisasi dan untuk tiap SEU. Baseline disesuaikan bila ruang lingkup, fasilitas, atau variabel statis berubah signifikan (6.5); catat alasannya di kolom catatan.</p>
        </SectionHead>
        <DaftarEnpi enpi={enpi} sumber={sumber} variabel={variabel} meter={meter} />
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
          <span className="eyebrow">{h.enpi.kode} · {LABEL_METODE[h.enpi.metode]} · {(h.enpi.lingkup ?? 'kinra') === 'kinra' ? (h.enpi.meter_kode?.length ? `lingkup KINRA, ${h.enpi.meter_kode.length} meter` : 'lingkup KINRA') : 'kawasan termasuk tenant'}</span>
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

      {!h.galat && <TabelBulanan h={h} />}

      {(rm || h.peringatan.length > 0) && (
        <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rm && <p className="small"><span className="mono">{rm}</span>{m && <span className="muted"> · n = {m.n} bulan</span>} {m && h.enpi.metode !== 'absolut' && <Chip kode={valid ? 'good' : 'warn'} label={valid ? 'Model layak' : 'Model perlu ditinjau'} />}</p>}
          {h.peringatan.map((p) => <p key={p} className="muted small">• {p}</p>)}
        </div>
      )}
    </div>
  )
}

/** Tabel efisiensi per bulan: aktual, harapan, hemat, dan intensitas (bila EnPI punya satu variabel). */
function TabelBulanan({ h }: { h: HasilEnpi }) {
  const d = desimal(h.satuan)
  const v = h.variabel.length === 1 ? h.variabel[0] : null
  const fmtI = (x: number | null) => (x === null ? '–' : angka(x, Math.abs(x) < 10 ? 3 : 1))
  const intensitas = (e: number | null, x: number | null | undefined) => (v && e !== null && x ? e / x : null)
  // Intensitas baseline sebagai acuan: total energi baseline dibagi total variabel baseline
  const bl = h.baseline.filter((t) => t.aktual !== null && (!v || t.x[0]))
  const iBaseline = v && bl.length ? bl.reduce((s, t) => s + t.aktual!, 0) / bl.reduce((s, t) => s + (t.x[0] ?? 0), 0) : null
  const baris: { t: Titik; fase: 'laporan' | 'baseline' }[] = [
    ...[...h.laporan].reverse().map((t) => ({ t, fase: 'laporan' as const })),
    ...[...h.baseline].reverse().map((t) => ({ t, fase: 'baseline' as const })),
  ]
  if (!baris.length) return null
  const satuanI = v ? `${h.satuan}/${v.satuan}` : ''
  return (
    <details className="kj-bulanan">
      <summary>Tabel efisiensi per bulan ({h.laporan.length} bulan pelaporan{h.baseline.length ? `, ${h.baseline.length} bulan baseline` : ''})</summary>
      {iBaseline !== null && <p className="muted small">Intensitas baseline: <b className="tnum">{fmtI(iBaseline)}</b> {satuanI}. Hemat = harapan − aktual; positif berarti lebih efisien dari baseline.</p>}
      <div className="kj-bulanan-gulir">
        <table className="tbl">
          <thead>
            <tr>
              <th>Bulan</th>
              {v && <th className="num">{v.nama} ({v.satuan})</th>}
              <th className="num">Aktual ({h.satuan})</th>
              <th className="num">Harapan ({h.satuan})</th>
              <th className="num">Hemat ({h.satuan})</th>
              <th className="num">Hemat %</th>
              {v && <th className="num">Intensitas ({satuanI})</th>}
            </tr>
          </thead>
          <tbody>
            {baris.map(({ t, fase }) => {
              const hemat = t.aktual !== null && t.harapan !== null ? t.harapan - t.aktual : null
              const pr = hemat !== null && t.harapan ? (hemat / t.harapan) * 100 : null
              const kelas = pr === null ? '' : pr >= 0 ? 'txt-good' : 'txt-bad'
              return (
                <tr key={`${fase}-${t.tahun}-${t.bulan}`} className={fase === 'baseline' ? 'kj-baseline' : undefined}>
                  <td>{t.label}{fase === 'baseline' && <span className="upd">baseline</span>}</td>
                  {v && <td className="num">{t.x[0] === null || t.x[0] === undefined ? '–' : angka(t.x[0], t.x[0] < 100 ? 2 : 0)}</td>}
                  <td className="num">{t.aktual === null ? '–' : angka(t.aktual, d)}</td>
                  <td className="num">{t.harapan === null ? '–' : angka(t.harapan, d)}</td>
                  <td className={`num ${kelas}`}>{hemat === null ? '–' : `${hemat < 0 ? '−' : ''}${angka(Math.abs(hemat), d)}`}</td>
                  <td className={`num ${kelas}`}>{pr === null ? '–' : `${pr < 0 ? '−' : '+'}${angka(Math.abs(pr), 1)}%`}</td>
                  {v && <td className="num">{fmtI(intensitas(t.aktual, t.x[0]))}</td>}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </details>
  )
}
