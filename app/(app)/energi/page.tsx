import { Flame, Leaf, Sun, TrendingUp, Zap } from 'lucide-react'
import Link from 'next/link'
import { AngkaNaik } from '@/components/AngkaNaik'
import { Grafik } from '@/components/charts/Grafik'
import { Chip } from '@/components/Chip'
import { SectionHead } from '@/components/SectionHead'
import { ambilAsetMeter, ambilEnergi, ambilParameter, rekapEnergi } from '@/lib/data'
import { Istilah } from '@/components/Istilah'
import { Sankey } from '@/components/Sankey'
import { KWH_PER_LITER, nilaiEnergi, rupiahRingkas, susunKonversi, tonCo2 } from '@/lib/konversi'
import { penggunaEnergi } from '@/lib/tinjauan'
import { FormParameter } from './FormParameter'
import { pemakaianMeter } from '@/lib/enpi'
import { angka, BULAN, BULAN_PANJANG, delta, energiListrik, persen } from '@/lib/format'
import { TabelEnergi } from './TabelEnergi'

export const dynamic = 'force-dynamic'

const WARNA = { pln: 's3', pltbg: 's1', plts: 'jingga', dexlite: 's2', dexlite_genset: 's2' } as const
const IKON = { pln: Zap, pltbg: Leaf, plts: Sun, dexlite: Flame, dexlite_genset: Flame } as const

export default async function Energi({ searchParams }: { searchParams: Promise<{ tahun?: string }> }) {
  const [{ sumber, data }, { aset, meter, bacaan }, param] = await Promise.all([ambilEnergi(), ambilAsetMeter(), ambilParameter()])
  const kv = susunKonversi(param)
  const { tahun: daftarTahun, tj } = rekapEnergi(sumber, data)
  const sp = await searchParams
  const tahun = Number(sp.tahun) || daftarTahun.at(-1) || new Date().getFullYear()
  const listrik = sumber.filter((s) => s.satuan === 'kWh')
  const bbm = sumber.filter((s) => s.satuan !== 'kWh')
  /** BBM kendaraan saja (genset IPAB/IPAL bukan kendaraan) */
  const bbmKendaraan = bbm.filter((s) => s.kode !== 'dexlite_genset')

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
  // Bulan acuan: bulan terakhir yang SEMUA meter terbaca dan PLN kawasan terisi (bulan sebagian akan meremehkan pemakaian KINRA)
  const kunciTerakhir = Math.max(-1, ...[...perMeter.entries()].filter(([k, r]) => r.terbaca >= jumlahMeter && nilai(Math.floor(k / 12), (k % 12) + 1, 'pln') !== null).map(([k]) => k))
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

  // Aliran energi per bulan (rata-rata tahun terpilih): kawasan → tenant / KINRA, lalu KINRA → aset & kendaraan
  const bulanAda = [...new Set(data.filter((d) => d.tahun === tahun && d.sumber_kode === 'pln').map((d) => d.bulan))]
  const rataBulan = (k: string) => bulanAda.length ? bulanAda.reduce((t, b) => t + (nilai(tahun, b, k) ?? 0), 0) / bulanAda.length : 0
  const pakai = penggunaEnergi({ aset, meter, bacaan, sumber, energi: data, seu: [], ambangPersen: 10, ambangKumulatif: 80 })
  const asetKinra = pakai.daftar.filter((p) => p.id.startsWith('aset:'))
  // Semua BBM lingkup KINRA (Dexlite kendaraan, genset, bensin), rata-rata 12 bulan terakhir
  const bbmDaftar = pakai.daftar.filter((p) => p.id.startsWith('sumber:'))
  const bbmKinra = bbmDaftar.length ? { kwh: bbmDaftar.reduce((t, p) => t + p.kwh, 0) } : null
  const literBulan = bbmDaftar.reduce((t, p) => t + p.kwh / (KWH_PER_LITER[p.id.slice(7)] ?? 10), 0)
  const nKinraBbm = bbmDaftar.reduce((t, p) => { const kode = p.id.slice(7); const n = nilaiEnergi(kv, p.kwh / (KWH_PER_LITER[kode] ?? 10), 'liter', kode); return { rupiah: t.rupiah + n.rupiah, kgCo2: t.kgCo2 + n.kgCo2 } }, { rupiah: 0, kgCo2: 0 })
  // Listrik KINRA: rata-rata bulan lengkap tahun terpilih, agar sebanding dengan kawasan tahun yang sama
  const bulanKinra = rekapKinra.filter((r) => r.kwh !== null && r.terbaca >= jumlahMeter)
  const asetTotal = asetKinra.reduce((t, p) => t + p.kwh, 0)
  const listrikKinra = bulanKinra.length ? bulanKinra.reduce((t, r) => t + r.kwh!, 0) / bulanKinra.length : asetTotal
  const skalaAset = asetTotal ? listrikKinra / asetTotal : 1
  const kawasanBulan = listrik.reduce((t, s) => t + rataBulan(s.kode), 0)
  const nKinraListrik = nilaiEnergi(kv, listrikKinra, 'kWh')
  const nKawasan = nilaiEnergi(kv, kawasanBulan, 'kWh')
  // Porsi antar-aset dari 12 bulan lengkap terakhir, diskalakan ke total tahun terpilih
  const asetUtama = asetKinra.slice(0, 3).map((p) => ({ ...p, kwh: p.kwh * skalaAset }))
  const asetLain = asetKinra.slice(3).reduce((t, p) => t + p.kwh, 0) * skalaAset

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
            <div><span>Biaya listrik KINRA</span><b className="tnum">{rupiahRingkas(nilaiEnergi(kv, acuan.kinra, 'kWh').rupiah)}</b></div>
            <div><span>Emisi listrik KINRA</span><b className="tnum">{tonCo2(nilaiEnergi(kv, acuan.kinra, 'kWh').kgCo2)}</b></div>
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
        <SectionHead no="00" eyebrow="Aliran energi · rata-rata per bulan" judul={<>Dari setiap 100 kWh listrik kawasan, hanya <span className="ks-sorot">{kawasanBulan ? angka((listrikKinra / kawasanBulan) * 100, 1) : '–'} kWh</span> dipakai KINRA sendiri</>}>
          <p className="muted">
            Kiri: seluruh listrik kawasan {tahun}, termasuk yang disalurkan ke tenant (di luar lingkup SMEn). Kanan: energi dalam lingkup KINRA, diperbesar, dipecah ke pengguna terbesarnya (kandidat <Istilah kata="SEU" />).
            Arahkan kursor ke pita untuk melihat angkanya.
          </p>
          <Link className="btn kecil" href="/aliran-energi" style={{ marginTop: 8 }}>Buka diagram aliran interaktif per bulan</Link>
        </SectionHead>
        <div className="sk-dua">
          <div className="card">
            <h3>Kawasan (termasuk tenant)</h3>
            <p className="muted small">{energiListrik(kawasanBulan)}/bulan · ±{rupiahRingkas(nKawasan.rupiah)} · {tonCo2(nKawasan.kgCo2)}</p>
            <Sankey label={`Aliran listrik kawasan ${tahun}`} format={(v) => energiListrik(v)}
              simpul={[
                ...listrik.map((s) => ({ id: s.kode, label: s.nama.replace('Listrik ', ''), kolom: 0 as const, warna: `var(--${s.kode === 'pln' ? 's3' : s.kode === 'pltbg' ? 's1' : 'jingga'})` })),
                { id: 'kawasan', label: 'Kawasan', kolom: 1, warna: 'var(--ink-2)' },
                { id: 'tenant', label: 'Tenant & lainnya', kolom: 2, warna: 'var(--s3)', catatan: 'di luar lingkup' },
                { id: 'kinra', label: 'KINRA', kolom: 2, warna: 'var(--good)', catatan: 'lingkup SMEn' },
              ]}
              tautan={[
                ...listrik.map((s) => ({ dari: s.kode, ke: 'kawasan', nilai: rataBulan(s.kode) })),
                { dari: 'kawasan', ke: 'tenant', nilai: Math.max(0, kawasanBulan - listrikKinra) },
                { dari: 'kawasan', ke: 'kinra', nilai: listrikKinra, warna: 'var(--good)' },
              ]} />
          </div>
          <div className="card">
            <h3>Lingkup KINRA (diperbesar)</h3>
            <p className="muted small">{energiListrik(listrikKinra + (bbmKinra?.kwh ?? 0))} setara/bulan · ±{rupiahRingkas(nKinraListrik.rupiah + nKinraBbm.rupiah)} · {tonCo2(nKinraListrik.kgCo2 + nKinraBbm.kgCo2)}</p>
            <Sankey label="Aliran energi lingkup KINRA" format={(v) => energiListrik(v)}
              simpul={[
                { id: 'listrik', label: 'Listrik', kolom: 0, warna: 'var(--s3)' },
                ...(bbmKinra ? [{ id: 'bbm', label: 'BBM', kolom: 0 as const, warna: 'var(--s2)', catatan: `${angka(literBulan, 0)} L` }] : []),
                { id: 'kinra', label: 'KINRA', kolom: 1, warna: 'var(--good)' },
                ...asetUtama.map((p) => ({ id: p.id, label: p.nama, kolom: 2 as const, warna: 'var(--s1)', catatan: p.dasar === 'inventaris' ? 'perkiraan' : undefined })),
                ...(asetLain > 0 ? [{ id: 'lain', label: `${asetKinra.length - 3} aset lain`, kolom: 2 as const, warna: 'var(--s3)' }] : []),
                ...(bbmKinra ? [{ id: 'kendaraan', label: 'Kendaraan & genset', kolom: 2 as const, warna: 'var(--s2)' }] : []),
              ]}
              tautan={[
                { dari: 'listrik', ke: 'kinra', nilai: listrikKinra },
                ...(bbmKinra ? [{ dari: 'bbm', ke: 'kinra', nilai: bbmKinra.kwh }] : []),
                ...asetUtama.map((p) => ({ dari: 'kinra', ke: p.id, nilai: p.kwh, warna: 'var(--s1)' })),
                ...(asetLain > 0 ? [{ dari: 'kinra', ke: 'lain', nilai: asetLain }] : []),
                ...(bbmKinra ? [{ dari: 'kinra', ke: 'kendaraan', nilai: bbmKinra.kwh, warna: 'var(--s2)' }] : []),
              ]} />
          </div>
        </div>
        <p className="sumber">
          Kawasan: rata-rata bulanan data energi {tahun}. KINRA: rata-rata bulan lengkap bacaan meter {tahun}{bulanKinra.length ? '' : ' (belum ada, memakai 12 bulan lengkap terakhir/inventaris)'}, ditambah BBM 12 bulan terakhir dikonversi ke kWh setara (Dexlite 36 MJ/L, bensin 33 MJ/L).
          Rupiah dan CO₂ memakai parameter di bagian 03{kv.asumsi.length ? ` (masih asumsi: ${kv.asumsi.join(', ')})` : ''}.
        </p>
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
              seri: daftarTahun.filter((t) => data.some((d) => d.tahun === t && bbmKendaraan.some((s) => s.kode === d.sumber_kode))).map((t, i, arr) => ({
                nama: String(t), warna: i === arr.length - 1 ? 's1' : 's3',
                data: BULAN.map((_, b) => bbmKendaraan.reduce<number | null>((acc, s) => { const v = nilai(t, b + 1, s.kode); return v === null ? acc : (acc ?? 0) + v }, null)),
              })),
            }} />
            <p className="sumber">Sumber: Rekap BBM Operasional (Dexlite dan bensin kendaraan; BBM genset IPAB/IPAL tidak termasuk). Faktor 36 MJ/liter adalah asumsi, verifikasi dengan data pemasok.</p>
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
        <SectionHead no="03" eyebrow="Konversi rupiah & emisi" judul="Tarif dan faktor emisi">
          <p className="muted">Angka rupiah dan CO₂ di aplikasi dihitung dari parameter berikut. {kv.asumsi.length ? `Masih asumsi: ${kv.asumsi.join(', ')}.` : 'Semua parameter sudah terverifikasi.'}</p>
        </SectionHead>
        <FormParameter param={param} />
      </section>

      <section>
        <SectionHead no="04" eyebrow="Input data" judul={`Isi data ${tahun} per bulan`}>
          <p className="muted">Ketik angka lalu pindah kolom (Tab) untuk menyimpan. Kosongkan sel untuk menghapus. Gunakan data meter/tagihan aktual, bukan perkiraan. Data PLN di sini adalah total kawasan termasuk tenant.</p>
        </SectionHead>
        <TabelEnergi tahun={tahun} sumber={sumber} data={data.filter((d) => d.tahun === tahun)} />
      </section>
    </>
  )
}
