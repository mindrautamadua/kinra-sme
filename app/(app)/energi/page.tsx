import { Flame, Leaf, Sun, TrendingUp, Zap } from 'lucide-react'
import Link from 'next/link'
import { AngkaNaik } from '@/components/AngkaNaik'
import { Grafik } from '@/components/charts/Grafik'
import { Chip } from '@/components/Chip'
import { SectionHead } from '@/components/SectionHead'
import { ambilAsetMeter, ambilEnergi, rekapEnergi } from '@/lib/data'
import { pemakaianMeter } from '@/lib/enpi'
import { angka, BULAN, BULAN_PANJANG, delta, energiListrik, persen } from '@/lib/format'
import { TabelEnergi } from './TabelEnergi'

export const dynamic = 'force-dynamic'

const WARNA = { pln: 's3', pltbg: 's1', plts: 'jingga', dexlite: 's2' } as const
const IKON = { pln: Zap, pltbg: Leaf, plts: Sun, dexlite: Flame } as const

export default async function Energi({ searchParams }: { searchParams: Promise<{ tahun?: string }> }) {
  const [{ sumber, data }, { aset, meter, bacaan }] = await Promise.all([ambilEnergi(), ambilAsetMeter()])
  const { tahun: daftarTahun, tj } = rekapEnergi(sumber, data)
  const sp = await searchParams
  const tahun = Number(sp.tahun) || daftarTahun.at(-1) || new Date().getFullYear()
  const listrik = sumber.filter((s) => s.satuan === 'kWh')
  const bbm = sumber.filter((s) => s.satuan !== 'kWh')

  const nilai = (th: number, b: number, k: string) => data.find((d) => d.tahun === th && d.bulan === b && d.sumber_kode === k)?.nilai ?? null
  const blnAkhir = Math.max(0, ...data.filter((d) => d.tahun === tahun && d.sumber_kode === 'pln').map((d) => d.bulan))
  const kwhTahun = data.filter((d) => d.tahun === tahun && listrik.some((s) => s.kode === d.sumber_kode)).reduce((t, d) => t + d.nilai, 0)
  const kwhEbt = data.filter((d) => d.tahun === tahun && sumber.find((s) => s.kode === d.sumber_kode)?.terbarukan).reduce((t, d) => t + d.nilai, 0)
  const tjIni = tj((d) => d.tahun === tahun && d.bulan <= blnAkhir)
  const tjLalu = tj((d) => d.tahun === tahun - 1 && d.bulan <= blnAkhir)
  const rata = blnAkhir ? kwhTahun / blnAkhir : 0

  // Bulan tanpa data listrik dianggap belum lengkap, agar garis tidak jatuh ke nol karena hanya ada BBM
  const totalBulan = (th: number) => BULAN.map((_, i) => {
    if (nilai(th, i + 1, 'pln') === null) return null
    const v = tj((d) => d.tahun === th && d.bulan === i + 1)
    return v > 0 ? Math.round(v * 100) / 100 : null
  })

  const naik = tjLalu ? ((tjIni - tjLalu) / tjLalu) * 100 : null
  const pangsaEbt = kwhTahun ? (kwhEbt / kwhTahun) * 100 : 0
  const kwhEbtLalu = data.filter((d) => d.tahun === tahun - 1 && d.bulan <= blnAkhir && sumber.find((s) => s.kode === d.sumber_kode)?.terbarukan).reduce((t, d) => t + d.nilai, 0)
  const kwhLalu = data.filter((d) => d.tahun === tahun - 1 && d.bulan <= blnAkhir && listrik.some((s) => s.kode === d.sumber_kode)).reduce((t, d) => t + d.nilai, 0)
  const pangsaEbtLalu = kwhLalu ? (kwhEbtLalu / kwhLalu) * 100 : null

  // Aliran sumber -> kawasan, tebal garis sebanding pangsa TJ tahun terpilih
  const tjTahun = tj((d) => d.tahun === tahun)
  const aliran = sumber.map((s, i) => {
    const t = tj((d) => d.tahun === tahun && d.sumber_kode === s.kode)
    const asli = data.filter((d) => d.tahun === tahun && d.sumber_kode === s.kode).reduce((a, d) => a + d.nilai, 0)
    return { ...s, t, asli, pangsa: tjTahun ? (t / tjTahun) * 100 : 0, y: ((i + 0.5) / sumber.length) * 100 }
  })

  const bulanIni = totalBulan(tahun)
  const puncakI = bulanIni.reduce<number>((m, v, i) => (v ?? -1) > (bulanIni[m] ?? -1) ? i : m, 0)
  const akhirIni = blnAkhir ? bulanIni[blnAkhir - 1] : null
  const akhirLalu = blnAkhir ? totalBulan(tahun - 1)[blnAkhir - 1] : null

  // Batas lingkup SMEn: PLN kawasan memuat listrik tenant; pemakaian sendiri KINRA diukur dari meter aset
  const { hasil: perMeter, jumlahMeter } = pemakaianMeter(meter.filter((m) => m.sumber_kode === 'pln'), bacaan)
  const kunciTerakhir = Math.max(-1, ...[...perMeter.keys()].filter((k) => nilai(Math.floor(k / 12), (k % 12) + 1, 'pln') !== null))
  const acuan = kunciTerakhir >= 0
    ? { tahun: Math.floor(kunciTerakhir / 12), bulan: (kunciTerakhir % 12) + 1, kinra: perMeter.get(kunciTerakhir)!.kwh, terbaca: perMeter.get(kunciTerakhir)!.terbaca, sumberKinra: 'meter' as const }
    : { tahun, bulan: blnAkhir, kinra: aset.reduce((t, a) => t + (a.kwh_bulan ?? 0), 0), terbaca: 0, sumberKinra: 'inventaris' as const }
  const plnAcuan = acuan.bulan ? nilai(acuan.tahun, acuan.bulan, 'pln') : null
  const porsiKinra = plnAcuan ? Math.min(100, (acuan.kinra / plnAcuan) * 100) : null
  const rekapKinra = BULAN_PANJANG.map((_, i) => {
    const r = perMeter.get(tahun * 12 + i)
    const p = nilai(tahun, i + 1, 'pln')
    return { bulan: i, kwh: r?.kwh ?? null, terbaca: r?.terbaca ?? 0, pln: p, porsi: r && p ? (r.kwh / p) * 100 : null }
  })

  // Peta panas bulan x tahun
  const peta = daftarTahun.map((t) => ({ t, v: totalBulan(t) }))
  const maksPeta = Math.max(0, ...peta.flatMap((r) => r.v.map((v) => v ?? 0)))
  const minPeta = Math.min(...peta.flatMap((r) => r.v.filter((v): v is number => v !== null)), maksPeta)

  return (
    <>
      <section>
        <div className="ks-kepala">
          <SectionHead hero eyebrow="Data energi kawasan KEK Sei Mangkei · termasuk tenant"
            judul={<>{tahun}: <span className="ks-sorot">{energiListrik(kwhTahun)}</span> listrik dalam {blnAkhir} bulan, {delta(naik)} dibanding {tahun - 1}</>}>
            <p className="muted">Angka kawasan mencakup listrik tenant, sehingga tidak menjadi dasar klaim kinerja SMEn KINRA; lihat pemisahan lingkup di bawah. Energi terbarukan (PLTBG + PLTS) menyumbang {persen(pangsaEbt)} listrik. Rata-rata {energiListrik(rata)} per bulan. Konversi: 1 kWh = 3,6 × 10⁻⁶ TJ.</p>
          </SectionHead>
          <nav className="seg en-tahun" aria-label="Tahun">
            {daftarTahun.map((t) => <Link key={t} href={`/energi?tahun=${t}`} aria-current={t === tahun ? 'true' : undefined}>{t}</Link>)}
          </nav>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div className="row">
            <div>
              <h3>Batas lingkup SMEn · {acuan.bulan ? `${BULAN_PANJANG[acuan.bulan - 1]} ${acuan.tahun}` : '–'}</h3>
              <p className="muted small">Ruang Lingkup & Batasan EnMS: fasilitas dan proses produksi tenant tidak otomatis termasuk lingkup. Kinerja SMEn diukur dari pemakaian sendiri KINRA.</p>
            </div>
            <Link className="btn kecil" href="/aset">Aset & Meter</Link>
          </div>
          <div className="mini-stats" style={{ margin: '12px 0' }}>
            <div><span>Listrik PLN kawasan</span><b className="tnum">{energiListrik(plnAcuan)}</b></div>
            <div><span>Pemakaian sendiri KINRA{acuan.sumberKinra === 'inventaris' ? ' (perkiraan)' : ''}</span><b className="tnum">{energiListrik(acuan.kinra)}</b></div>
            <div><span>Disalurkan ke tenant & lainnya</span><b className="tnum">{plnAcuan !== null ? energiListrik(Math.max(0, plnAcuan - acuan.kinra)) : '–'}</b></div>
          </div>
          {porsiKinra !== null && (
            <div className="pg" role="img" aria-label={`Pemakaian sendiri KINRA ${persen(porsiKinra)} dari listrik PLN kawasan`}>
              <div className="track"><b className="bg-good" style={{ width: `${Math.max(porsiKinra, 0.5)}%` }} /></div>
            </div>
          )}
          <p className="sumber">
            {acuan.sumberKinra === 'meter'
              ? `Pemakaian sendiri dari bacaan ${acuan.terbaca} dari ${jumlahMeter} meter PLN aset KINRA (${persen(porsiKinra)} dari PLN kawasan).`
              : `Belum ada bacaan stand meter; pemakaian sendiri diperkirakan dari data inventaris aset (${persen(porsiKinra)} dari PLN kawasan ${BULAN_PANJANG[acuan.bulan - 1] ?? ''} ${acuan.tahun}). Isi bacaan bulanan di halaman Aset & Meter.`}
            {' '}PLTBG dan PLTS dicatat sebagai pasokan kawasan; kepemilikan dan alokasinya perlu ditetapkan dalam tinjauan energi.
          </p>
        </div>

        <div className="card en-aliran">
          <div className="row">
            <div><h3>Aliran energi ke kawasan, {tahun}</h3><p className="muted small">Tebal garis sebanding pangsa terhadap total Terajoule (TJ)</p></div>
            <div className="legend"><span><Leaf size={13} aria-hidden="true" className="txt-good" />Terbarukan</span></div>
          </div>
          <div className="en-alir">
            <ul className="en-sumber">
              {aliran.map((a) => {
                const Ikon = IKON[a.kode as keyof typeof IKON] ?? Zap
                return (
                  <li key={a.kode} className={`w-${WARNA[a.kode as keyof typeof WARNA] ?? 's3'}`}>
                    <span className="en-ikon"><Ikon aria-hidden="true" /></span>
                    <span className="grow">
                      <b>{a.nama}{a.terbarukan && <Leaf aria-label="terbarukan" className="en-daun" />}</b>
                      <span className="muted small tnum">{a.satuan === 'kWh' ? energiListrik(a.asli) : `${angka(a.asli)} ${a.satuan}`} · {angka(a.t, 2)} TJ</span>
                    </span>
                    <b className="tnum en-pangsa">{persen(a.pangsa)}</b>
                  </li>
                )
              })}
            </ul>
            <svg className="en-garis" viewBox="0 0 100 100" preserveAspectRatio="none" role="img"
              aria-label={`Pangsa energi ${tahun}: ${aliran.map((a) => `${a.nama} ${persen(a.pangsa)}`).join(', ')}`}>
              {aliran.map((a, i) => {
                const d = `M0,${a.y} C55,${a.y} 45,50 100,50`
                const w = 2 + (a.pangsa / 100) * 26
                return (
                  <g key={a.kode} className={`w-${WARNA[a.kode as keyof typeof WARNA] ?? 's3'}`} style={{ '--i': i } as React.CSSProperties}>
                    <path d={d} className="dasar" pathLength={100} style={{ strokeWidth: w }} vectorEffect="non-scaling-stroke" />
                    <path d={d} className="arus" pathLength={100} style={{ strokeWidth: Math.max(1.5, w * 0.35) }} vectorEffect="non-scaling-stroke" />
                  </g>
                )
              })}
            </svg>
            <div className="en-hub">
              <span className="eyebrow">KEK Sei Mangkei</span>
              <b className="tnum"><AngkaNaik nilai={tjIni} desimal={1} /><small>TJ</small></b>
              <span className="muted small">{BULAN[0]}–{BULAN[blnAkhir - 1] ?? ''} {tahun}</span>
              {naik !== null && <Chip kode={naik > 0 ? 'serious' : 'good'} label={`${delta(naik)} vs ${tahun - 1}`} />}
              <div className="en-ebt" role="img" aria-label={`Pangsa listrik terbarukan ${persen(pangsaEbt)}`}>
                <svg viewBox="0 0 36 36" className="ks-mini lengkap" aria-hidden="true">
                  <circle cx="18" cy="18" r="15" pathLength={100} className="trk" />
                  <circle cx="18" cy="18" r="15" pathLength={100} className="isi" style={{ strokeDasharray: `${pangsaEbt} 100` }} />
                </svg>
                <span><b className="tnum">{persen(pangsaEbt)}</b><span className="muted small">listrik terbarukan</span></span>
              </div>
            </div>
          </div>
          <p className="sumber">Sumber: Penggunaan Energy Listrik 2024–2026 (Kasubag M/E), Rekap BBM Operasional 2025–2026. Faktor BBM 36 MJ/liter adalah asumsi.</p>
        </div>

        <div className="insights" style={{ margin: '16px 0' }}>
          <div className="insight perhatian">
            <span className="area">Puncak konsumsi {tahun}</span>
            <div className="angka tnum">{angka(bulanIni[puncakI], 2)} <small className="muted" style={{ fontSize: 14 }}>TJ</small></div>
            <h3>{BULAN_PANJANG[puncakI]}</h3>
            <p>Bulan dengan total energi tertinggi sepanjang data {tahun}.</p>
          </div>
          <div className={`insight ${akhirIni !== null && akhirLalu ? (akhirIni > akhirLalu ? 'kritis' : 'positif') : ''}`}>
            <span className="area">Bulan terakhir vs {tahun - 1}</span>
            <div className="angka tnum">{akhirIni !== null && akhirLalu ? delta(((akhirIni - akhirLalu) / akhirLalu) * 100) : '–'}</div>
            <h3>{BULAN_PANJANG[blnAkhir - 1] ?? '–'} {tahun}</h3>
            <p>{angka(akhirIni, 2)} TJ dibanding {angka(akhirLalu, 2)} TJ pada bulan yang sama tahun lalu.</p>
          </div>
          <div className={`insight ${pangsaEbtLalu !== null && pangsaEbt >= pangsaEbtLalu ? 'positif' : 'perhatian'}`}>
            <span className="area"><TrendingUp size={12} aria-hidden="true" /> Bauran terbarukan</span>
            <div className="angka tnum">{persen(pangsaEbt)}</div>
            <h3>{pangsaEbtLalu === null ? 'Belum ada pembanding' : `${pangsaEbt >= pangsaEbtLalu ? 'Naik' : 'Turun'} dari ${persen(pangsaEbtLalu)}`}</h3>
            <p>Pangsa PLTBG + PLTS terhadap listrik {BULAN[0]}–{BULAN[blnAkhir - 1] ?? ''}, dibanding periode sama {tahun - 1}.</p>
          </div>
        </div>

        <div className="grid-3-1">
          <div className="card">
            <div className="row"><div><h3>Listrik per bulan per sumber, {tahun}</h3><p className="muted small">kWh</p></div>
              <div className="mini-stats">{listrik.map((s) => <div key={s.kode}><span>{s.kode.toUpperCase()}</span><b className="tnum">{energiListrik(data.filter((d) => d.tahun === tahun && d.sumber_kode === s.kode).reduce((t, d) => t + d.nilai, 0))}</b></div>)}</div>
            </div>
            <Grafik tinggi={320} label={`Listrik bulanan ${tahun} per sumber`} spek={{
              jenis: 'batang', satuan: 'kWh', kategori: BULAN,
              seri: listrik.map((s) => ({ nama: s.nama, tumpuk: 'kwh', warna: WARNA[s.kode as keyof typeof WARNA] ?? 's3', data: BULAN.map((_, i) => nilai(tahun, i + 1, s.kode)) })),
            }} />
            <p className="sumber">Sumber: Penggunaan Energy Listrik tahun 2024–2026 (Kasubag M/E).</p>
          </div>
          <div className="card">
            <h3>Bauran {tahun}</h3>
            <p className="muted small">Berdasarkan TJ</p>
            <Grafik tinggi={260} label={`Bauran energi ${tahun}`} spek={{
              jenis: 'donat', satuan: 'TJ', tengah: `${angka(tj((d) => d.tahun === tahun), 1)} TJ`,
              data: sumber.map((s) => ({ nama: s.kode.toUpperCase(), nilai: Math.round(tj((d) => d.tahun === tahun && d.sumber_kode === s.kode) * 100) / 100, warna: WARNA[s.kode as keyof typeof WARNA] ?? 's3' })),
            }} />
          </div>
        </div>
      </section>

      <section>
        <SectionHead no="01" eyebrow="Tren antar tahun" judul={`Total ${daftarTahun.map((t) => `${t} ${angka(tj((d) => d.tahun === t), 1)} TJ`).join(' · ')}`}>
          <p className="muted">Bahan baseline energi (EnB) dan EnPI. Tahun dasar pada pelacak konsumsi: 2025.</p>
        </SectionHead>
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="row"><div><h3>Peta panas konsumsi bulanan</h3><p className="muted small">Total TJ per bulan · makin pekat makin besar · sel kosong = data listrik belum ada</p></div>
            <div className="legend-scale" style={{ marginTop: 0 }}><span>{angka(minPeta, 1)}</span><i className="en-skala" /><span>{angka(maksPeta, 1)} TJ</span></div>
          </div>
          <div className="table-wrap">
            <div className="en-peta" role="table" aria-label="Total energi bulanan per tahun (TJ)">
              <div role="row" className="en-peta-baris kepala">
                <span role="columnheader" />
                {BULAN.map((b) => <span key={b} role="columnheader">{b}</span>)}
                <span role="columnheader">Total</span>
              </div>
              {peta.map((r, ri) => (
                <div role="row" key={r.t} className={`en-peta-baris${r.t === tahun ? ' pilih' : ''}`}>
                  <span role="rowheader" className="mono">{r.t}</span>
                  {r.v.map((v, i) => {
                    const f = v === null || maksPeta === minPeta ? 0 : 15 + ((v - minPeta) / (maksPeta - minPeta)) * 85
                    return (
                      <span role="cell" key={i} className={v === null ? 'kosong' : f > 60 ? 'terang' : undefined}
                        style={{ '--f': `${f}%`, '--i': ri * 12 + i } as React.CSSProperties} title={`${BULAN_PANJANG[i]} ${r.t}: ${angka(v, 2)} TJ`}>
                        {v === null ? '–' : angka(v, 1)}
                      </span>
                    )
                  })}
                  <span role="cell" className="tnum en-peta-total">{angka(tj((d) => d.tahun === r.t), 1)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="grid-2">
          <div className="card">
            <h3>Total energi bulanan (TJ)</h3>
            <Grafik tinggi={300} label="Perbandingan total energi bulanan antar tahun" spek={{
              jenis: 'garis', satuan: 'TJ', kategori: BULAN,
              seri: daftarTahun.map((t, i, arr) => ({ nama: String(t), data: totalBulan(t), warna: i === arr.length - 1 ? 's1' : i === arr.length - 2 ? 's2' : 's3', putus: i < arr.length - 2 })),
            }} />
          </div>
          <div className="card">
            <h3>BBM kendaraan operasional (liter)</h3>
            <p className="muted small">Dump truck, sky lift, backhoe loader, road sweeper, damkar</p>
            <Grafik tinggi={280} label="BBM bulanan per tahun" spek={{
              jenis: 'batang', satuan: 'liter', kategori: BULAN,
              seri: daftarTahun.filter((t) => data.some((d) => d.tahun === t && bbm.some((s) => s.kode === d.sumber_kode))).map((t, i, arr) => ({
                nama: String(t), warna: i === arr.length - 1 ? 's1' : 's3',
                data: BULAN.map((_, b) => bbm.reduce<number | null>((acc, s) => { const v = nilai(t, b + 1, s.kode); return v === null ? acc : (acc ?? 0) + v }, null)),
              })),
            }} />
            <p className="sumber">Sumber: Rekap BBM Operasional 2025–2026 (Dexlite). Faktor 36 MJ/liter adalah asumsi, verifikasi dengan data pemasok.</p>
          </div>
        </div>
      </section>

      <section>
        <SectionHead no="02" eyebrow="Lingkup SMEn KINRA" judul={`Pemakaian sendiri KINRA ${tahun}`}>
          <p className="muted">Jumlah konsumsi meter PLN aset KINRA per bulan (dari bacaan stand × faktor kali). Inilah dasar EnPI lingkup KINRA, bukan total PLN kawasan.</p>
        </SectionHead>
        <div className="card">
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Bulan</th><th className="num">Pemakaian KINRA</th><th className="num">Meter terbaca</th><th className="num">PLN kawasan</th><th className="num">Porsi KINRA</th></tr></thead>
              <tbody>
                {rekapKinra.map((r) => (
                  <tr key={r.bulan}>
                    <td>{BULAN_PANJANG[r.bulan]}</td>
                    <td className="num">{r.kwh === null ? '–' : `${angka(r.kwh, 0)} kWh`}</td>
                    <td className="num">{r.terbaca ? `${r.terbaca}/${jumlahMeter}` : '–'}</td>
                    <td className="num">{r.pln === null ? '–' : `${angka(r.pln, 0)} kWh`}</td>
                    <td className="num">{r.porsi === null ? '–' : persen(r.porsi)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="sumber">{rekapKinra.some((r) => r.kwh !== null) ? 'Bulan dengan meter terbaca kurang dari jumlah meter belum lengkap.' : `Belum ada bacaan meter untuk ${tahun}. Isi stand awal dan akhir tiap meter di halaman Aset & Meter.`}</p>
        </div>
      </section>

      <section>
        <SectionHead no="03" eyebrow="Input data" judul={`Isi data ${tahun} per bulan`}>
          <p className="muted">Ketik angka lalu pindah kolom (Tab) untuk menyimpan. Kosongkan sel untuk menghapus. Gunakan data meter/tagihan aktual, bukan perkiraan. Data PLN di sini adalah total kawasan termasuk tenant.</p>
        </SectionHead>
        <TabelEnergi tahun={tahun} sumber={sumber} data={data.filter((d) => d.tahun === tahun)} />
      </section>
    </>
  )
}
