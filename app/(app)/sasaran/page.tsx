import { ChevronRight } from 'lucide-react'
import { Istilah } from '@/components/Istilah'
import { SectionHead } from '@/components/SectionHead'
import { ambilKinerja, ambilParameter, ambilPeluang, ambilSasaran, ambilSeu } from '@/lib/data'
import { ringkas } from '@/lib/enpi'
import { angka, BULAN, hariIni, tanggal } from '@/lib/format'
import { nilaiEnergi, rupiahRingkas, susunKonversi } from '@/lib/konversi'
import { LABEL_PROYEKSI, proyeksiSasaran } from '@/lib/proyeksi-sasaran'
import { DaftarSasaran, type Capaian } from './DaftarSasaran'

export const dynamic = 'force-dynamic'

export default async function SasaranPage() {
  const [{ sasaran, aksi }, kinerja, peluang, param, { seu }] = await Promise.all([
    ambilSasaran(), ambilKinerja(), ambilPeluang(), ambilParameter(), ambilSeu(),
  ])
  const { hasil } = kinerja
  const kv = susunKonversi(param)
  const kini = hariIni()

  // Capaian: perbaikan EnPI pada tahun target dibanding target perbaikan sasaran
  const capaian: Record<number, Capaian> = {}
  for (const s of sasaran) {
    const h = hasil.find((x) => x.enpi.kode === s.enpi_kode)
    if (!h || !s.tahun_target) continue
    const r = ringkas(h.laporan.filter((t) => t.tahun === s.tahun_target))
    const proyeksi = proyeksiSasaran(s, h, kini)
    capaian[s.id] = {
      proyeksi,
      rupiahKurang: proyeksi?.hematKurang && h.satuan !== 'TJ' ? nilaiEnergi(kv, proyeksi.hematKurang, h.satuan, h.enpi.sumber_kode[0]).rupiah : null,
      enpi: h.enpi.nama, satuan: h.satuan, bulan: r.bulan, perbaikan: r.perbaikan, hemat: r.hemat,
      persenTarget: r.perbaikan !== null && s.target_persen ? (r.perbaikan / s.target_persen) * 100 : null,
      galat: h.galat,
    }
  }

  const kinra = hasil.filter((h) => h.enpi.aktif && (h.enpi.lingkup ?? 'kinra') === 'kinra')
  const kodeKinra = new Set(kinra.map((h) => h.enpi.kode))
  const aktif = sasaran.filter((s) => s.status === 'Aktif')
  const terukur = aktif.filter((s) => capaian[s.id]?.persenTarget != null)
  const onTrack = terukur.filter((s) => capaian[s.id].persenTarget! >= 100).length
  const sasKinra = aktif.filter((s) => s.enpi_kode && kodeKinra.has(s.enpi_kode))
  const hidup = aksi.filter((a) => a.status !== 'Batal')
  const terverifikasi = aksi.reduce((t, a) => t + (a.hemat_terverifikasi_kwh ?? 0), 0)
  const seuTetap = seu.filter((s) => s.status === 'Ditetapkan')


  // Rantai 6.2: dari fokus (SEU) sampai bukti penghematan
  const rantai = [
    { label: 'SEU ditetapkan', nilai: `${seuTetap.length}/${seu.filter((s) => s.status !== 'Dicabut').length}`, ok: seuTetap.length > 0, href: '/tinjauan' },
    { label: 'EnPI lingkup KINRA', nilai: String(kinra.length), ok: kinra.length > 0, href: '/kinerja' },
    { label: 'Sasaran aktif terukur', nilai: `${sasKinra.length}`, ok: sasKinra.length > 0, href: '#sasaran' },
    { label: 'Rencana aksi', nilai: `${hidup.length}`, ok: hidup.length > 0, href: '#sasaran' },
    { label: 'Hemat terverifikasi', nilai: terverifikasi ? `${angka(terverifikasi / 1000, 1)} MWh` : '0', ok: terverifikasi > 0, href: '#sasaran' },
  ]

  // Catatan analis
  const catatan: { kode: 'crit' | 'warn' | 'info'; teks: string }[] = []
  if (!aktif.length) catatan.push({ kode: 'crit', teks: 'Belum ada sasaran energi aktif. Klausul 6.2 mewajibkan sasaran dan target energi yang terukur, konsisten dengan kebijakan energi, beserta rencana aksinya. Tanpa ini, temuan mayor sangat mungkin.' })
  else if (!sasKinra.length) catatan.push({ kode: 'crit', teks: `Belum ada sasaran kinerja energi yang terhubung ke EnPI lingkup KINRA.${sasaran.some((s) => s.bagian) ? ' Sasaran per bagian dari formulir 6.2 berupa target perilaku dan kepatuhan (sosialisasi, pelatihan, kepatuhan SOP).' : ''} Klausul 6.2 meminta target energi yang terukur dan mempertimbangkan SEU; auditor dapat menilai ini sebagai ketidaksesuaian. Tetapkan target kinerja energi di formulir, lalu catat di sini.` })
  if (!hidup.length) catatan.push({ kode: 'crit', teks: 'Belum ada rencana aksi: apa yang dilakukan, sumber daya, siapa, kapan, dan cara verifikasi hasilnya (6.2).' })
  // Bukti bersama di rekaman Kesiapan tautan (migrasi 0056) ikut dihitung sebagai bukti pelaksanaan
  const tanpaBukti = sasaran.filter((s) => s.status !== 'Draft' && !s.jumlah_bukti && !s.jumlah_bukti_rekaman)
  if (tanpaBukti.length) catatan.push({ kode: tanpaBukti.length === sasaran.length ? 'crit' : 'warn', teks: `${tanpaBukti.length} dari ${sasaran.length} sasaran belum punya bukti pelaksanaan (daftar hadir, hasil tes, checklist inspeksi). Auditor Stage 2 memeriksa penerapan; unggah lewat tombol bukti di setiap baris.` })
  const aksiTanpaBukti = hidup.filter((a) => (a.status === 'Selesai' || a.status === 'Berjalan') && !a.jumlah_bukti && !a.jumlah_bukti_rekaman).length
  if (aksiTanpaBukti) catatan.push({ kode: 'warn', teks: `${aksiTanpaBukti} rencana aksi berjalan/selesai belum punya bukti pelaksanaan.` })
  const tanpaVerifikasi = hidup.filter((a) => !a.metode_verifikasi).length
  if (tanpaVerifikasi) catatan.push({ kode: 'warn', teks: `${tanpaVerifikasi} rencana aksi belum punya metode verifikasi penghematan.` })
  const lewat = hidup.filter((a) => a.tenggat && a.tenggat < kini && a.status !== 'Selesai')
  if (lewat.length) catatan.push({ kode: 'warn', teks: `${lewat.length} rencana aksi lewat tenggat.` })
  const estimasi = hidup.reduce((t, a) => t + (a.estimasi_hemat_kwh ?? 0), 0)
  if (estimasi && terverifikasi < estimasi * 0.2 && hidup.some((a) => a.status === 'Selesai')) catatan.push({ kode: 'info', teks: `Penghematan terverifikasi baru ${angka((terverifikasi / estimasi) * 100, 0)}% dari estimasi. Catat hasil verifikasi untuk aksi yang sudah selesai.` })
  const terancam = aktif.filter((s) => capaian[s.id]?.proyeksi && ['sulit', 'berisiko'].includes(capaian[s.id].proyeksi!.status))
  if (terancam.length) catatan.push({ kode: terancam.some((s) => capaian[s.id].proyeksi!.status === 'sulit') ? 'crit' : 'warn', teks: `Proyeksi akhir tahun: ${terancam.map((s) => `${s.kode} ${LABEL_PROYEKSI[capaian[s.id].proyeksi!.status].toLowerCase()}`).join(', ')}. Percepat rencana aksi atau tinjau ulang target bersama manajemen (klausul 6.2, 9.3).` })

  // Timeline aksi (mulai–tenggat)
  const berjadwal = hidup.filter((a) => a.mulai || a.tenggat).sort((a, b) => (a.mulai ?? a.tenggat!).localeCompare(b.mulai ?? b.tenggat!))
  const tgl = berjadwal.flatMap((a) => [a.mulai, a.tenggat].filter(Boolean) as string[]).concat(kini)
  const awal = tgl.length ? tgl.reduce((m, t) => (t < m ? t : m)).slice(0, 7) + '-01' : kini
  const akhirTgl = tgl.length ? tgl.reduce((m, t) => (t > m ? t : m)) : kini
  const hari = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 86_400_000
  const rentang = Math.max(30, hari(akhirTgl) - hari(awal) + 15)
  const posisi = (iso: string) => ((hari(iso) - hari(awal)) / rentang) * 100
  const bulanSkala: { label: string; x: number }[] = []
  for (let d = new Date(`${awal}T00:00:00Z`); hari(d.toISOString().slice(0, 10)) <= hari(awal) + rentang; d.setUTCMonth(d.getUTCMonth() + 1)) {
    bulanSkala.push({ label: `${BULAN[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`, x: posisi(d.toISOString().slice(0, 10)) })
  }

  return (
    <>
      <section>
        <SectionHead hero eyebrow={<>Klausul 6.2 · <Istilah kata="Sasaran & target energi" /> & <Istilah kata="Rencana aksi" /></>}
          judul={aktif.length && !terukur.length
            ? <>{aktif.length} sasaran aktif, <span className="kj-sorot-buruk">belum ada yang terukur dengan EnPI</span></>
            : aktif.length
            ? <>{aktif.length} sasaran aktif, <span className="ks-sorot">{onTrack} dari {terukur.length}</span> yang terukur sudah memenuhi target</>
            : <>Belum ada sasaran energi: <span className="kj-sorot-buruk">klausul 6.2 belum terpenuhi</span></>}>
          <p className="muted">
            Setiap sasaran sebaiknya terhubung ke EnPI lingkup KINRA dengan target terukur dan tahun target, lalu dijabarkan ke rencana aksi (apa, siapa, sumber daya, kapan, cara verifikasi).
            Penghematan aksi dicatat setelah diverifikasi dengan data meter, bukan dari estimasi.
          </p>
        </SectionHead>

        <ol className="ss-rantai" aria-label="Rantai sasaran: dari SEU sampai penghematan terverifikasi">
          {rantai.map((r, i) => (
            <li key={r.label} className={r.ok ? 'ok' : 'belum'} style={{ '--i': i } as React.CSSProperties}>
              <a href={r.href}><b className="tnum">{r.nilai}</b><span>{r.label}</span></a>
              {i < rantai.length - 1 && <ChevronRight aria-hidden="true" className="ss-panah" />}
            </li>
          ))}
        </ol>

        {catatan.length > 0 && (
          <div className="card rg-catatan" style={{ marginTop: 16 }}>
            <span className="eyebrow">Catatan analis · terdeteksi otomatis</span>
            <ul>{catatan.map((c) => <li key={c.teks} className={c.kode}>{c.teks}</li>)}</ul>
          </div>
        )}
      </section>

      {berjadwal.length > 0 && (
        <section>
          <SectionHead no="01" eyebrow="Jadwal rencana aksi" judul={`${berjadwal.length} aksi terjadwal · ${lewat.length} lewat tenggat`}>
            <p className="muted">Batang dari tanggal mulai sampai tenggat; garis vertikal adalah hari ini.</p>
          </SectionHead>
          <div className="card">
            <div className="ss-gantt">
              <div className="ss-skala">{bulanSkala.map((b) => <span key={b.label} style={{ left: `${b.x}%` }}>{b.label}</span>)}</div>
              {berjadwal.map((a, i) => {
                const x0 = posisi(a.mulai ?? a.tenggat!), x1 = posisi(a.tenggat ?? a.mulai!)
                const telat = a.tenggat && a.tenggat < kini && a.status !== 'Selesai'
                return (
                  <div key={a.id} className="ss-baris">
                    <span className="ss-label"><b className="mono">{a.kode}</b> {a.uraian}</span>
                    <span className="ss-jalur">
                      <i className={`ss-batang s-${a.status.toLowerCase()}${telat ? ' telat' : ''}`} style={{ left: `${x0}%`, width: `${Math.max(1.5, x1 - x0)}%`, '--i': i } as React.CSSProperties}
                        title={`${a.kode}: ${tanggal(a.mulai)} – ${tanggal(a.tenggat)} · ${a.status}${a.estimasi_hemat_kwh ? ` · ±${rupiahRingkas(a.estimasi_hemat_kwh * kv.tarifListrik)}/thn` : ''}`} />
                    </span>
                  </div>
                )
              })}
              <i className="ss-kini" style={{ left: `calc(var(--label) + (100% - var(--label)) * ${posisi(kini) / 100})` }} aria-hidden="true" />
            </div>
          </div>
        </section>
      )}

      <section id="sasaran">
        <SectionHead no={berjadwal.length ? '02' : '01'} eyebrow="Sasaran, target & rencana aksi" judul={aktif.length ? `${aktif.length} sasaran aktif` : 'Mulai dari usulan di bawah'}>
          <p className="muted">Capaian dihitung dari perbaikan EnPI pada tahun target dibanding target perbaikan sasaran.</p>
        </SectionHead>
        <DaftarSasaran sasaran={sasaran} aksi={aksi} capaian={capaian} kini={kini} tarif={kv.tarifListrik} ef={kv.efListrik}
          enpi={hasil.map((h) => ({ kode: h.enpi.kode, nama: h.enpi.nama }))}
          peluang={peluang.map((p) => ({ kode: p.kode, uraian: p.uraian, status: p.status, estimasi_kwh: p.estimasi_kwh, pemilik: p.pemilik }))} />
      </section>
    </>
  )
}
