import { ClipboardCheck, FileUp, Link2Off, SearchCheck, Target, TrendingUp, UserRound, Zap } from 'lucide-react'
import Link from 'next/link'
import { AngkaNaik } from '@/components/AngkaNaik'
import { Grafik } from '@/components/charts/Grafik'
import { Chip } from '@/components/Chip'
import { SectionHead } from '@/components/SectionHead'
import { ambilDokumen, ambilIsu, ambilJejakBukti, ambilKegiatan, ambilKinerja, ambilKlausul, ambilPeluang, ambilSasaran, ambilSeu, ambilTemuan, rekapEnergi } from '@/lib/data'
import { LABEL_STATUS, susunPeta } from '@/lib/peta-smen'
import { LABEL_METODE, pilihEnpiUtama, ringkas } from '@/lib/enpi'
import { angka, BULAN, delta, hariIni, persen, selisihHari, tanggal, waktu } from '@/lib/format'
import { adaBukti, hariWib, kesiapan, kesiapanPerKlausul, KELOMPOK, terlambat, tonggakDari, trenKesiapan } from '@/lib/status'

export const dynamic = 'force-dynamic'

export default async function Ringkasan() {
  const [dokumen, klausul, temuan, kegiatan, kinerja, jejak, isu, peluang, { seu, tinjauan }, { sasaran, aksi }] = await Promise.all([
    ambilDokumen(), ambilKlausul(), ambilTemuan(), ambilKegiatan(), ambilKinerja(), ambilJejakBukti(), ambilIsu(), ambilPeluang(), ambilSeu(), ambilSasaran(),
  ])
  const energi = { sumber: kinerja.sumber, data: kinerja.energi }
  const kini = hariIni()
  const peta = susunPeta({ dokumen, isu, peluang, seu, tinjauan, hasil: kinerja.hasil, sasaran, aksi, temuan, meter: kinerja.meter, bacaan: kinerja.bacaan, kini })

  const skor = kesiapan(dokumen)
  const siap = dokumen.filter(adaBukti).length
  const lewat = dokumen.filter((d) => terlambat(d, kini))
  const temuanBuka = temuan.filter((t) => t.status !== 'Tertutup')
  const tonggak = tonggakDari(kegiatan).filter((t) => t.tanggal >= kini)
  const berikut = tonggak[0]

  const perStatus = [
    { s: 'ada', label: 'Ada evidence', chip: 'good', n: siap },
    { s: 'belum', label: 'Belum ada evidence', chip: 'crit', n: dokumen.length - siap },
  ]
  let kumulatif = 0
  const busur = perStatus.map((x) => {
    const lebar = dokumen.length ? (x.n / dokumen.length) * 100 : 0
    const r = { ...x, lebar, mulai: kumulatif }
    kumulatif += lebar
    return r
  })
  const perKlausul = kesiapanPerKlausul(dokumen, klausul, kini)
  const terlemah = [...perKlausul].sort((a, b) => a.p - b.p).slice(0, 3)

  const tenggatDekat = dokumen
    .filter((d) => d.tenggat && !adaBukti(d) && selisihHari(d.tenggat) <= 10)
    .sort((a, b) => (a.tenggat ?? '').localeCompare(b.tenggat ?? ''))
    .slice(0, 8)

  const sesiBerikut = kegiatan
    .flatMap((k) => k.sesi.map((s) => ({ ...s, nama: k.nama, no: k.no })))
    .filter((s) => s.tanggal >= kini)
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
    .slice(0, 6)

  // Energi
  const { tahun, tj } = rekapEnergi(energi.sumber, energi.data)
  const thnAkhir = tahun.at(-1) ?? new Date().getFullYear()
  const blnAkhir = Math.max(0, ...energi.data.filter((d) => d.tahun === thnAkhir && d.sumber_kode === 'pln').map((d) => d.bulan))
  const tjKini = tj((d) => d.tahun === thnAkhir && d.bulan <= blnAkhir)
  const tjLalu = tj((d) => d.tahun === thnAkhir - 1 && d.bulan <= blnAkhir)
  const terbarukan = energi.sumber.filter((s) => s.terbarukan).map((s) => s.kode)
  // EnPI utama: sama dengan halaman Kinerja (penanda "utama", lalu ternormalisasi dengan model layak)
  const enpiUtama = pilihEnpiUtama(kinerja.hasil)
  const ru = enpiUtama && ringkas(enpiUtama.laporan)
  const pangsaEbt = tjKini ? (tj((d) => d.tahun === thnAkhir && d.bulan <= blnAkhir && terbarukan.includes(d.sumber_kode)) / tjKini) * 100 : 0

  // Tren & proyeksi dari jejak evidence
  const tambahHari = (iso: string, n: number) => { const d = new Date(`${iso}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
  const labelHari = (h: string) => `${Number(h.slice(8))} ${BULAN[Number(h.slice(5, 7)) - 1]}`
  const awalRiwayat = jejak[0] ? hariWib(jejak[0].at) : kini
  let mulai = tambahHari(kini, -29)
  if (awalRiwayat > mulai) mulai = awalRiwayat > kini ? kini : awalRiwayat
  const hariLalu: string[] = []
  for (let h = mulai; h <= kini; h = tambahHari(h, 1)) hariLalu.push(h)
  const tren = trenKesiapan(dokumen, jejak, hariLalu)
  tren[tren.length - 1] = skor
  const jendela = Math.min(14, hariLalu.length - 1)
  const laju = jendela > 0 ? (skor - tren[tren.length - 1 - jendela]) / jendela : null
  const hariKe100 = skor >= 100 ? 0 : laju && laju > 0 ? Math.ceil((100 - skor) / laju) : null
  const tgl100 = hariKe100 === null ? null : tambahHari(kini, hariKe100)
  const hBerikut = berikut ? selisihHari(berikut.tanggal) : 0
  const lajuPerlu = berikut && hBerikut > 0 ? (100 - skor) / hBerikut : null
  const keburu = tgl100 !== null && !!berikut && tgl100 <= berikut.tanggal
  const hariDepan: string[] = []
  if (berikut) for (let h = tambahHari(kini, 1); h <= berikut.tanggal; h = tambahHari(h, 1)) hariDepan.push(h)
  const r1 = (v: number) => Math.round(v * 10) / 10
  const akhir = hariLalu.length - 1

  // Insight
  // Quick win: dokumen tanpa evidence yang tenggatnya sudah lewat atau jatuh dalam 7 hari
  const nMendesak = dokumen.filter((d) => !adaBukti(d) && d.tenggat && selisihHari(d.tenggat) <= 7).length
  const naikMendesak = dokumen.length ? (nMendesak / dokumen.length) * 100 : 0
  const tanpaBukti = dokumen.length - siap
  const mayor = temuanBuka.filter((t) => t.kategori === 'Mayor').length
  const perPic = Object.values(dokumen.reduce<Record<string, { pic: string; ds: typeof dokumen }>>((a, d) => {
    const k = d.pic?.trim() || 'PIC belum ditetapkan'
    ;(a[k] ??= { pic: k, ds: [] }).ds.push(d)
    return a
  }, {})).map((x) => ({
    pic: x.pic, n: x.ds.length,
    sisa: x.ds.filter((d) => !adaBukti(d)).length,
    lewat: x.ds.filter((d) => terlambat(d, kini)).length,
  })).sort((a, b) => b.lewat - a.lewat || b.sisa - a.sisa).slice(0, 8)
  const maksPic = Math.max(1, ...perPic.map((p) => p.n))
  const picBerat = perPic[0]

  // Aktivitas terbaru
  const namaDok = Object.fromEntries(dokumen.map((d) => [d.id, d]))
  const aktivitas = jejak.filter((r) => namaDok[r.dokumen_id]).slice(-7).reverse()
  const pekanLalu = tambahHari(kini, -6)
  const gerakPekan = jejak.filter((r) => hariWib(r.at) >= pekanLalu)
  const dokPekan = new Set(gerakPekan.map((r) => r.dokumen_id)).size

  return (
    <>
      <nav className="card pt-strip" aria-label="Peta SMEn: status 12 langkah">
        <div className="row">
          <div><span className="eyebrow">Peta SMEn · siklus PDCA</span><h3>{peta.filter((t) => t.status === 'selesai').length} dari 12 langkah sudah berjalan penuh</h3></div>
          <Link className="btn kecil" href="/peta">Buka peta</Link>
        </div>
        <ol>
          {peta.map((t) => (
            <li key={t.no}>
              <Link href={`/peta?tahap=${t.no}`} className={`pt-titik s-${t.status}`} title={`${t.no}. ${t.nama}: ${LABEL_STATUS[t.status]}`}>
                <b>{t.no}</b><span>{t.nama}</span>
              </Link>
            </li>
          ))}
        </ol>
      </nav>

      <section>
        <div className="ks-kepala">
          <SectionHead hero eyebrow="Kesiapan audit ISO 50001:2018" judul={<>Kesiapan dokumen <span className="ks-sorot">{persen(skor)}</span>: {siap} dari {dokumen.length} dokumen siap diaudit</>}>
            <p className="muted">
              Persentase dokumen dan rekaman yang sudah punya berkas evidence terunggah di Kesiapan Audit.
              {berikut && <> {berikut.nama} dijadwalkan {tanggal(berikut.tanggal, 'panjang')}, {hBerikut} hari lagi.</>}
            </p>
          </SectionHead>
          <div className="toolbar"><Link className="btn utama" href="/kesiapan"><ClipboardCheck aria-hidden="true" /><span className="teks">Buka lembar kesiapan</span></Link></div>
        </div>

        <div className="ks-hero">
          <div className="card ks-skor">
            <div className="ks-cincin" role="img" aria-label={`Kesiapan ${persen(skor)}. ${perStatus.map((x) => `${x.label} ${x.n}`).join(', ')}`}>
              <svg viewBox="0 0 220 220" aria-hidden="true">
                <defs>
                  <linearGradient id="ks-grad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" style={{ stopColor: 'var(--biru)' }} />
                    <stop offset="1" style={{ stopColor: 'var(--brand)' }} />
                  </linearGradient>
                </defs>
                {busur.map((b) => b.lebar > 0 && (
                  <circle key={b.s} cx="110" cy="110" r="102" pathLength={100} className={`ks-seg st-${b.chip}`}
                    style={{ strokeDasharray: `${Math.max(0, b.lebar - 0.6)} ${100 - b.lebar + 0.6}`, strokeDashoffset: -b.mulai }} />
                ))}
                <circle cx="110" cy="110" r="84" pathLength={100} className="ks-trk" />
                <circle cx="110" cy="110" r="84" pathLength={100} className="ks-isi" style={{ strokeDasharray: `${skor} 100` }} />
              </svg>
              <div className="ks-tengah">
                <span className="eyebrow">Kesiapan</span>
                <b className="tnum"><AngkaNaik nilai={skor} desimal={1} /><small>%</small></b>
                <span className="muted small">{siap} dari {dokumen.length} ada evidence</span>
              </div>
            </div>
            <div className="ks-legenda">
              {perStatus.map((x) => <span key={x.s}><i className={`bg-${x.chip}`} />{x.label} <b className="tnum">{x.n}</b></span>)}
            </div>
            <div className="mini-stats hm-kelompok">
              {Object.entries(KELOMPOK).map(([k, l]) => (
                <div key={k}><span>{l}</span><b className="tnum">{dokumen.filter((d) => d.kelompok === k).length}</b></div>
              ))}
            </div>
          </div>

          <div className="ks-kanan">
            <div className="card ks-jalur">
              <div className="ks-hitung">
                <span className="eyebrow">Menuju {berikut?.nama ?? 'sertifikasi'}</span>
                <div className="ks-hari tnum">{berikut ? <AngkaNaik nilai={hBerikut} /> : '–'}<small>hari lagi</small></div>
                <p className="muted small">
                  {berikut ? tanggal(berikut.tanggal, 'panjang') : 'Semua tonggak sudah lewat'}
                  {lajuPerlu !== null && skor < 100 && <> · perlu <b className="ink-2">+{angka(lajuPerlu, 1)} poin/hari</b> agar 100% tepat waktu</>}
                </p>
              </div>
              {tonggak.length > 0 && (
                <div className="ks-rel" role="img" aria-label={`Jadwal: ${tonggak.map((t) => `${t.nama} ${tanggal(t.tanggal)}, ${selisihHari(t.tanggal)} hari lagi`).join('; ')}`}>
                  <div className="ks-rel-garis" aria-hidden="true">
                    <span className="ks-rel-kini"><i />Hari ini</span>
                    {tonggak.map((t, i) => {
                      const hAkhir = selisihHari(tonggak.at(-1)!.tanggal)
                      return (
                        <span key={t.kode} className={`ks-rel-titik ${i % 2 ? 'bawah' : 'atas'}${i === 0 ? ' berikut' : ''}`}
                          style={{ left: `${hAkhir ? (selisihHari(t.tanggal) / hAkhir) * 100 : 100}%`, '--i': i } as React.CSSProperties}>
                          <i />
                          <em><b>{t.nama}</b>{tanggal(t.tanggal)}</em>
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="card hm-proyeksi">
              <div className="row">
                <div><h3>Tren & proyeksi kesiapan</h3><p className="muted small">Direkonstruksi dari tanggal evidence pertama tiap dokumen · {hariLalu.length} hari terakhir{berikut && ` sampai ${berikut.nama}`}</p></div>
                <div className="mini-stats">
                  <div><span>Laju {jendela} hari</span><b className={`tnum ${laju !== null && laju > 0 ? 'txt-good' : ''}`}>{laju === null ? '–' : `${laju >= 0 ? '+' : '−'}${angka(Math.abs(laju), 2)}`}<small className="muted"> poin/hari</small></b></div>
                  <div><span>Proyeksi 100%</span><b className={`tnum ${tgl100 === null ? 'txt-bad' : keburu ? 'txt-good' : 'txt-bad'}`}>{tgl100 ? tanggal(tgl100) : 'Tidak bergerak'}</b></div>
                </div>
              </div>
              <Grafik tinggi={220} label={`Kesiapan ${persen(tren[0])} pada ${labelHari(hariLalu[0])} menjadi ${persen(skor)} hari ini; proyeksi 100% ${tgl100 ? tanggal(tgl100) : 'belum dapat dihitung'}`}
                spek={{
                  jenis: 'garis', satuan: '%', kategori: [...hariLalu, ...hariDepan].map(labelHari),
                  seri: [
                    { nama: 'Aktual', warna: 's1', data: [...tren.map(r1), ...hariDepan.map(() => null)] },
                    { nama: 'Proyeksi laju sekarang', warna: 's3', putus: true, data: [...hariLalu.map((_, i) => (i === akhir ? r1(skor) : null)), ...hariDepan.map((_, i) => (laju === null ? null : r1(Math.min(100, Math.max(0, skor + laju * (i + 1))))))] },
                    { nama: `Jalur ideal ke ${berikut?.nama ?? 'audit'}`, warna: 'jingga', putus: true, data: [...hariLalu.map((_, i) => (i === akhir ? r1(skor) : null)), ...hariDepan.map((_, i) => r1(skor + ((100 - skor) * (i + 1)) / hariDepan.length))] },
                  ],
                }} />
              <p className="sumber">{gerakPekan.length} evidence masuk dalam 7 hari terakhir, untuk {dokPekan} dokumen.</p>
            </div>
          </div>
        </div>

        <div className="insights hm-insights">
          <Link href="/kesiapan" className={`insight ${skor >= 100 || keburu ? 'positif' : 'kritis'}`}>
            <span className="area"><TrendingUp aria-hidden="true" />Proyeksi</span>
            <div className="angka tnum">{skor >= 100 ? 'Tuntas' : tgl100 ? tanggal(tgl100) : 'Mandek'}</div>
            <h3>{skor >= 100 ? 'Semua dokumen siap' : tgl100 === null ? 'Skor tidak naik 14 hari terakhir' : keburu ? `Tuntas sebelum ${berikut?.nama}` : `${berikut ? selisihHari(tgl100) - hBerikut : 0} hari setelah ${berikut?.nama ?? 'audit'}`}</h3>
            <p>{lajuPerlu !== null && skor < 100 ? `Butuh +${angka(lajuPerlu, 1)} poin/hari; laju sekarang ${laju === null ? '–' : `${angka(laju, 2)}`} poin/hari.` : 'Jaga evidence tetap lengkap dan mutakhir.'}</p>
          </Link>
          <Link href="/kesiapan" className="insight positif">
            <span className="area"><Zap aria-hidden="true" />Quick win</span>
            <div className="angka tnum">+{angka(naikMendesak, 1)} poin</div>
            <h3>{nMendesak} dokumen mendesak tanpa evidence</h3>
            <p>{nMendesak ? `Tenggatnya lewat atau jatuh dalam 7 hari. Mengunggah evidence-nya menaikkan skor ke ${persen(Math.min(100, skor + naikMendesak))}.` : 'Tidak ada dokumen mendesak yang belum punya evidence.'}</p>
          </Link>
          {terlemah[0] && (
            <Link href={`/kesiapan?klausul=${encodeURIComponent(terlemah[0].kode)}`} className="insight kritis">
              <span className="area"><Target aria-hidden="true" />Klausul terlemah</span>
              <div className="angka tnum">{persen(terlemah[0].p, 0)}</div>
              <h3>{terlemah[0].kode === 'P' ? 'Persiapan' : `Klausul ${terlemah[0].kode}`} · {terlemah[0].judul}</h3>
              <p>{terlemah[0].n} dokumen{terlemah[0].lewat ? `, ${terlemah[0].lewat} terlambat` : ''}. Berikutnya: {terlemah.slice(1).map((k) => `${k.kode} (${persen(k.p, 0)})`).join(', ') || '–'}.</p>
            </Link>
          )}
          {picBerat && (
            <Link href="/kesiapan" className={`insight ${picBerat.lewat ? 'kritis' : 'perhatian'}`}>
              <span className="area"><UserRound aria-hidden="true" />Beban PIC terberat</span>
              <div className="angka tnum">{picBerat.sisa} <small className="muted" style={{ fontSize: 14 }}>tanpa evidence</small></div>
              <h3>{picBerat.pic}</h3>
              <p>{picBerat.lewat ? `${picBerat.lewat} dokumen lewat tenggat. ` : ''}Pertimbangkan bagi beban atau pendampingan khusus.</p>
            </Link>
          )}
          <Link href="/kesiapan" className={`insight ${tanpaBukti ? 'perhatian' : 'positif'}`}>
            <span className="area"><Link2Off aria-hidden="true" />Evidence</span>
            <div className="angka tnum">{tanpaBukti} <small className="muted" style={{ fontSize: 14 }}>dokumen</small></div>
            <h3>{tanpaBukti ? 'Belum ada evidence' : 'Evidence lengkap'}</h3>
            <p>{tanpaBukti ? `Auditor meminta bukti; ${persen((tanpaBukti / Math.max(1, dokumen.length)) * 100, 0)} dokumen belum punya evidence.` : 'Setiap dokumen sudah punya evidence.'}</p>
          </Link>
          <Link href="/temuan" className={`insight ${mayor ? 'kritis' : temuanBuka.length ? 'perhatian' : 'positif'}`}>
            <span className="area"><SearchCheck aria-hidden="true" />Temuan audit</span>
            <div className="angka tnum">{temuanBuka.length} <small className="muted" style={{ fontSize: 14 }}>terbuka</small></div>
            <h3>{mayor ? `${mayor} temuan mayor` : temuanBuka.length ? 'Tanpa temuan mayor' : 'Bersih'}</h3>
            <p>{temuan.length} temuan tercatat · {lewat.length} dokumen lewat tenggat{lewat.length ? `, tertua ${tanggal(lewat.map((d) => d.tenggat!).sort()[0])}` : ''}.</p>
          </Link>
        </div>

        <div className="grid-2" style={{ marginTop: 16 }}>
          <div className="card">
            <div className="row"><div><h3>Beban per PIC</h3><p className="muted small">Urut terlambat lalu dokumen tanpa evidence · panjang bar = jumlah dokumen</p></div></div>
            <div className="hm-pic">
              {perPic.map((p, i) => (
                <div key={p.pic} className="hm-pic-baris" style={{ '--i': i } as React.CSSProperties}>
                  <span className="hm-pic-nama" title={p.pic}>{p.pic}</span>
                  <span className="hm-pic-bar" role="img" aria-label={`${p.pic}: ${p.n - p.sisa} ada evidence, ${p.sisa} belum`}>
                    <span className="stackbar" style={{ width: `${(p.n / maksPic) * 100}%` }}>
                      {p.n > p.sisa && <span className="bg-good" style={{ width: `${((p.n - p.sisa) / p.n) * 100}%` }} />}
                      {p.sisa > 0 && <span className="bg-crit" style={{ width: `${(p.sisa / p.n) * 100}%` }} />}
                    </span>
                  </span>
                  <span className="hm-pic-ket small tnum">{p.sisa}/{p.n}{p.lewat > 0 && <b className="txt-bad"> · {p.lewat} lewat</b>}</span>
                </div>
              ))}
            </div>
            <div className="legend">
              {perStatus.map((x) => <span key={x.s}><i className={`bg-${x.chip}`} />{x.label}</span>)}
            </div>
          </div>
          <div className="card">
            <div className="row"><div><h3>Aktivitas terbaru</h3><p className="muted small">Berkas evidence yang terakhir diunggah</p></div><Link className="btn kecil" href="/kesiapan">Lembar kesiapan</Link></div>
            <div className="list">
              {aktivitas.length === 0 && <p className="muted">Belum ada evidence tercatat.</p>}
              {aktivitas.map((r, i) => {
                const d = namaDok[r.dokumen_id]
                                return (
                  <Link key={`${r.dokumen_id}-${r.at}-${i}`} href={`/dokumen/${d.id}`} className="list-item hm-akt">
                    <span className="hm-akt-ikon naik"><FileUp aria-label="berkas diunggah" /></span>
                    <span className="grow"><b>{d.nama}</b><span className="muted small">{d.kode} · {r.label} · {r.oleh ?? 'sistem'} · {waktu(r.at)}</span></span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section>
        <SectionHead no="01" eyebrow="Agenda" judul={`${tenggatDekat.length} dokumen jatuh tempo dalam 10 hari`} />
        <div className="grid-2">
          <div className="card">
            <div className="row"><div><h3>Tenggat terdekat</h3><p className="muted small">Belum ada evidence, urut tenggat</p></div><Link className="btn kecil" href="/kesiapan">Semua dokumen</Link></div>
            <div className="list">
              {tenggatDekat.length === 0 && <p className="muted">Tidak ada tenggat dalam 10 hari ke depan.</p>}
              {tenggatDekat.map((d) => {
                const h = selisihHari(d.tenggat!)
                return (
                  <Link key={d.id} href={`/dokumen/${d.id}`} className="list-item">
                    <span className="kode mono small muted" style={{ width: 70 }}>{d.kode}</span>
                    <span className="grow"><b>{d.nama}</b><span className="muted small">{d.pic ?? 'PIC belum ditetapkan'}</span></span>
                    <span className="small tnum" style={{ textAlign: 'right' }}>
                      <Chip kode="crit" label="Belum ada evidence" /><br />
                      <span className={h < 0 ? 'txt-bad' : 'muted'}>{h < 0 ? `lewat ${-h} hari` : h === 0 ? 'hari ini' : `${h} hari lagi`}</span>
                    </span>
                  </Link>
                )
              })}
            </div>
          </div>
          <div className="card">
            <div className="row"><div><h3>Sesi pendampingan berikutnya</h3><p className="muted small">Timeline Pendampingan SMEn Rev.3</p></div><Link className="btn kecil" href="/timeline">Timeline</Link></div>
            <div className="list">
              {sesiBerikut.length === 0 && <p className="muted">Tidak ada sesi terjadwal.</p>}
              {sesiBerikut.map((s, i) => (
                <div key={`${s.no}-${s.tanggal}-${i}`}>
                  <span className="mono small" style={{ width: 92 }}>{tanggal(s.tanggal)}</span>
                  <span className="grow"><b>{s.nama}</b><span className="muted small">Pukul {s.jam} WIB</span></span>
                  {s.tanggal === kini && <Chip kode="info" label="Hari ini" />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <SectionHead no="02" eyebrow="Kinerja energi"
          judul={`Konsumsi ${BULAN[0]}–${BULAN[blnAkhir - 1] ?? ''} ${thnAkhir}: ${angka(tjKini, 1)} TJ, ${delta(tjLalu ? ((tjKini - tjLalu) / tjLalu) * 100 : null)} dari ${thnAkhir - 1}`}>
          <p className="muted">Angka kawasan termasuk listrik tenant, jadi bukan ukuran kinerja SMEn KINRA; kinerja SMEn dibaca dari EnPI lingkup KINRA (meter aset). Pangsa energi terbarukan (PLTBG + PLTS) {persen(pangsaEbt)}. Kenaikan didorong beban tenant yang bertambah.</p>
        </SectionHead>
        <div className="grid-3-1">
          <div className="card">
            <div className="row"><div><h3>Total energi per tahun</h3><p className="muted small">Terajoule (TJ), seluruh sumber kawasan termasuk tenant</p></div><Link className="btn kecil" href="/energi">Detail energi</Link></div>
            <Grafik label={`Total energi per tahun: ${tahun.map((t) => `${t} ${angka(tj((d) => d.tahun === t), 1)} TJ`).join(', ')}`}
              tinggi={280}
              spek={{
                jenis: 'batang', satuan: 'TJ', kategori: tahun.map(String),
                seri: energi.sumber.map((s, i) => ({
                  nama: s.nama, tumpuk: 'tj', warna: (['s3', 's1', 'jingga', 's2'] as const)[i % 4],
                  data: tahun.map((t) => Math.round(tj((d) => d.tahun === t && d.sumber_kode === s.kode) * 100) / 100),
                })),
              }} />
            <p className="sumber">Sumber: Data konsumsi energi 2024–2026 (Terajoule), Rekap BBM Operasional 2025–2026. Data {thnAkhir} sampai {BULAN[blnAkhir - 1]}.</p>
          </div>
          <div className="stack">
            <div className="tile"><div className="tile-head"><span className="label">{thnAkhir} s.d. {BULAN[blnAkhir - 1]}</span></div><div className="nilai tnum"><AngkaNaik nilai={tjKini} desimal={1} /><small>TJ</small></div><div className="meta">{thnAkhir - 1} periode sama: {angka(tjLalu, 1)} TJ</div></div>
            <div className="tile"><div className="tile-head"><span className="label">Energi terbarukan</span></div><div className="nilai tnum"><AngkaNaik nilai={pangsaEbt} desimal={1} akhiran="%" /></div><div className="meta">PLTBG + PLTS terhadap total</div></div>
            <Link href="/kinerja" className="tile" style={{ textDecoration: 'none', color: 'inherit' }} aria-label="Buka kinerja energi (EnPI)">
              <div className="tile-head">
                <span className="label">Perbaikan EnPI vs baseline</span>
                {ru?.perbaikan != null && (enpiUtama!.ekstrapolasi > 0
                  ? <Chip kode="warn" label="Ekstrapolasi" />
                  : <Chip kode={ru.perbaikan >= 0 ? 'good' : 'crit'} label={ru.perbaikan >= 0 ? 'Lebih efisien' : 'Lebih boros'} />)}
              </div>
              <div className={`nilai tnum ${ru?.perbaikan == null ? '' : ru.perbaikan >= 0 ? 'txt-good' : 'txt-bad'}`}>
                {ru?.perbaikan == null ? '–' : <AngkaNaik nilai={Math.abs(ru.perbaikan)} desimal={1} awalan={ru.perbaikan < 0 ? '−' : ''} akhiran="%" />}
              </div>
              <div className="meta">
                {enpiUtama && ru
                  ? `${enpiUtama.enpi.kode} ${enpiUtama.enpi.nama} · ${ru.bulan} bulan · ${LABEL_METODE[enpiUtama.enpi.metode].toLowerCase()}${enpiUtama.enpi.metode === 'absolut' ? ', belum ternormalisasi' : ''}${enpiUtama.ekstrapolasi > 0 ? ` · ${enpiUtama.ekstrapolasi} bulan di luar rentang baseline, belum dapat diklaim` : ''}`
                  : 'Belum ada EnPI dengan data pelaporan'}
              </div>
            </Link>
          </div>
        </div>
      </section>

      <footer className="footer muted small">
        Sumber data: Checklist Monev Implementasi ISO 50001-KINRA · Timeline Pendampingan SMEn Rev.3 (19 Okt 2026) · Dokumen Implementasi SMEn KINRA · Draft SOP ISO 50001 · Data konsumsi energi KEK Sei Mangkei 2024–2026.
      </footer>
    </>
  )
}
