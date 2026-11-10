import { AlertTriangle, Crosshair, Gauge, Layers, Wallet } from 'lucide-react'
import Link from 'next/link'
import { Chip } from '@/components/Chip'
import { Istilah } from '@/components/Istilah'
import { SectionHead } from '@/components/SectionHead'
import { ambilAsetMeter, ambilKinerja, ambilParameter, ambilSeu } from '@/lib/data'
import { angka, energiListrik, hariIni, persen, tanggal } from '@/lib/format'
import { nilaiEnergi, nilaiPengguna, rupiahRingkas, susunKonversi, tonCo2 } from '@/lib/konversi'
import { adaBacaan } from '@/lib/enpi'
import { penggunaEnergi } from '@/lib/tinjauan'
import { DiagramSubmeter } from './DiagramSubmeter'
import { FormTinjauan } from './FormTinjauan'
import { type BarisKesiapan, KesiapanSeu } from './KesiapanSeu'
import { ParetoGrafik } from './ParetoGrafik'
import { RegisterSeu } from './RegisterSeu'

export const dynamic = 'force-dynamic'

export default async function TinjauanPage() {
  const [{ seu, tinjauan, siap }, { aset, meter, bacaan }, { sumber, energi, variabel, enpi, hasil }, param] = await Promise.all([ambilSeu(), ambilAsetMeter(), ambilKinerja(), ambilParameter()])
  const kv = susunKonversi(param)
  // Rupiah & CO₂ per pengguna: BBM dihitung dari liter (kWh setara dikembalikan ke liter per jenis BBM)
  const nilaiP = (id: string, kwh: number) => nilaiPengguna(kv, id, kwh)

  if (!siap) {
    return (
      <section>
        <SectionHead hero eyebrow="Klausul 6.3 · Tinjauan energi" judul="Tabel tinjauan energi dan SEU belum ada" />
        <p className="pesan">Jalankan migrasi <code>supabase/migrations/0027_tinjauan_energi_seu.sql</code> di SQL Editor Supabase, lalu muat ulang halaman ini.</p>
      </section>
    )
  }

  const kini = hariIni()
  const ambangPersen = tinjauan?.ambang_persen ?? 10
  const ambangKumulatif = tinjauan?.ambang_kumulatif ?? 80
  const { daftar, total, tanpaData, porsiMeter } = penggunaEnergi({ aset, meter, bacaan, sumber, energi, seu, ambangPersen, ambangKumulatif })
  const aktif = seu.filter((s) => s.status !== 'Dicabut')
  const ditetapkan = seu.filter((s) => s.status === 'Ditetapkan')
  const porsiSeu = (kode: string) => daftar.filter((p) => p.seu?.kode === kode).reduce((t, p) => t + p.porsi, 0)
  const tercakup = aktif.reduce((t, s) => t + porsiSeu(s.kode), 0)
  const kandidatTanpaSeu = daftar.filter((p) => p.kandidat && !p.seu)
  const totalNilai = daftar.reduce((t, p) => { const n = nilaiP(p.id, p.kwh); return { rupiah: t.rupiah + n.rupiah, kgCo2: t.kgCo2 + n.kgCo2 } }, { rupiah: 0, kgCo2: 0 })
  const nilaiSeuTahun = daftar.filter((p) => p.seu && p.seu.status !== 'Dicabut').reduce((t, p) => t + nilaiP(p.id, p.kwh).rupiah, 0) * 12
  const asetBesarTanpaData = [...tanpaData].sort((a, b) => (b.luas_m2 ?? 0) - (a.luas_m2 ?? 0))
  const dua = daftar.slice(0, 2)
  const porsiDua = dua.reduce((t, p) => t + p.porsi, 0)

  // Kesiapan per SEU: daftar cek yang lazim ditanyakan auditor
  const [th, bl] = [Number(kini.slice(0, 4)), Number(kini.slice(5, 7))]
  const lalu = bl === 1 ? { t: th - 1, b: 12 } : { t: th, b: bl - 1 }
  const terbaca = (kode: string) => bacaan.some((b) => b.meter_kode === kode && b.tahun === lalu.t && b.bulan === lalu.b && adaBacaan(b))
  const kesiapan: BarisKesiapan[] = aktif.map((s) => {
    const h = hasil.find((x) => x.enpi.kode === s.enpi_kode)
    const adaData = !!h && !h.galat && !!h.model
    return {
      kode: s.kode, nama: s.nama.replace(/\s*\(.*\)$/, ''), porsi: porsiSeu(s.kode),
      cek: [
        { label: 'Ditetapkan', ok: s.status === 'Ditetapkan', ket: s.status === 'Ditetapkan' ? `Ditetapkan ${tanggal(s.ditetapkan_at)}${s.ditetapkan_oleh ? ` oleh ${s.ditetapkan_oleh}` : ''}` : 'Masih kandidat; tetapkan oleh admin/konsultan' },
        { label: 'Alasan & kriteria', ok: !!s.alasan && s.kriteria.length > 0, ket: s.alasan ? 'Alasan penetapan tercatat' : 'Tulis alasan penetapan' },
        { label: 'Variabel relevan', ok: s.variabel_kode.length > 0, ket: s.variabel_kode.length ? s.variabel_kode.join(', ') : 'Tentukan faktor yang memengaruhi konsumsi' },
        { label: 'EnPI', ok: !!s.enpi_kode, ket: s.enpi_kode ? `${s.enpi_kode}` : 'Hubungkan ke EnPI lingkup KINRA' },
        { label: 'Data EnPI', ok: s.enpi_kode ? (adaData ? true : null) : false, ket: adaData ? 'Model EnPI terbentuk' : s.enpi_kode ? 'Menunggu bacaan meter untuk baseline' : 'Belum ada EnPI' },
        { label: 'Personel', ok: !!s.personel, ket: s.personel ?? 'Catat personel yang pekerjaannya memengaruhi SEU (7.2)' },
        { label: 'Meter terbaca', ok: s.meter_kode.length ? s.meter_kode.every(terbaca) : false, ket: s.meter_kode.length ? `${s.meter_kode.filter(terbaca).length}/${s.meter_kode.length} meter terbaca bulan lalu` : 'Belum ada meter' },
        { label: 'Submeter', ok: s.meter_kode.length > 1, ket: s.meter_kode.length > 1 ? `${s.meter_kode.length} meter` : 'Baru meter utama; lihat rencana submeter' },
      ],
    }
  })

  // Intensitas energi bangunan (kWh/m²/tahun), hanya aset bangunan yang punya luas dan data energi
  const intensitas = daftar
    .filter((p) => p.id.startsWith('aset:'))
    .map((p) => ({ p, a: aset.find((x) => `aset:${x.kode}` === p.id)! }))
    .filter(({ a }) => a && (a.luas_m2 ?? 0) > 20 && !/^(WTP|WWTP)$/i.test(a.nama.trim()))
    .map(({ p, a }) => ({ nama: a.nama, kode: a.kode, ike: (p.kwh * 12) / a.luas_m2!, luas: a.luas_m2!, ac: a.luas_ac_m2 ?? 0, dasar: p.dasar }))
    .sort((a, b) => b.ike - a.ike)
  const maksIke = Math.max(1, ...intensitas.map((x) => x.ike))
  const rataIke = intensitas.length ? intensitas.reduce((t, x) => t + x.ike, 0) / intensitas.length : 0

  // Catatan analis
  const catatan: { kode: 'crit' | 'warn' | 'info'; teks: string }[] = []
  if (dua.length === 2 && porsiDua >= 80) catatan.push({ kode: 'info', teks: `${dua.map((p) => p.nama).join(' dan ')} menyerap ${persen(porsiDua, 0)} energi KINRA. Fokus SMEn pada dua instalasi ini memberi dampak terbesar; penghematan 5% di keduanya setara ±${rupiahRingkas(dua.reduce((t, p) => t + nilaiP(p.id, p.kwh).rupiah, 0) * 12 * 0.05)} per tahun.` })
  if (!ditetapkan.length) catatan.push({ kode: 'crit', teks: aktif.length ? `${aktif.length} SEU masih berstatus kandidat. Tanpa penetapan resmi, auditor dapat mengeluarkan temuan mayor klausul 6.3.` : 'Belum ada SEU di register.' })
  if (porsiMeter < 50) catatan.push({ kode: 'warn', teks: `Hanya ${persen(porsiMeter, 0)} energi KINRA yang terukur dari meter; sisanya perkiraan inventaris. Tinjauan energi harus didasarkan pada data pengukuran (6.3a).` })
  const boiler = tanpaData.find((a) => /boiler/i.test(a.nama))
  if (tanpaData.length) catatan.push({ kode: 'warn', teks: `${tanpaData.length} dari ${aset.length} aset belum punya data energi${boiler ? `, termasuk ${boiler.nama} (${angka(boiler.luas_m2 ?? 0, 0)} m²) yang berpotensi menjadi SEU` : ''}.` })
  if (kandidatTanpaSeu.length) catatan.push({ kode: 'warn', teks: `${kandidatTanpaSeu.map((p) => p.nama).join(', ')} memenuhi kriteria SEU tetapi belum ada di register.` })
  if (intensitas.length >= 2 && intensitas[0].ike > rataIke * 1.5) catatan.push({ kode: 'info', teks: `${intensitas[0].nama} memiliki intensitas energi ${angka(intensitas[0].ike, 0)} kWh/m²/tahun, ${angka(intensitas[0].ike / rataIke, 1)}× rata-rata bangunan KINRA. Layak ditelusuri sebagai peluang penghematan.` })
  if (tinjauan?.status !== 'Disetujui') catatan.push({ kode: 'info', teks: 'Catatan tinjauan energi masih draft. Persetujuan admin/konsultan menjadi bukti bahwa tinjauan dilakukan dan dikaji.' })

  return (
    <>
      <section>
        <SectionHead hero eyebrow={<>Klausul 6.3 · <Istilah kata="Tinjauan energi" /> & penggunaan energi signifikan (<Istilah kata="SEU" />)</>}
          judul={<>{dua.map((p) => p.nama.replace(/\s*\(.*\)$/, '')).join(' dan ')} memakai <span className="ks-sorot">{persen(porsiDua, 0)}</span> energi KINRA</>}>
          <p className="muted">
            Tinjauan energi menjawab tiga hal: di mana energi dipakai, mana yang signifikan (SEU), dan siapa yang mengendalikannya.
            SEU menjadi fokus EnPI, sasaran, pengendalian operasional, dan kompetensi personel. Lingkupnya hanya energi dalam kendali KINRA, tidak termasuk listrik tenant.
          </p>
        </SectionHead>
        <div className="tiles">
          <div className="tile"><div className="tile-head"><span className="tile-ikon"><Wallet aria-hidden="true" /></span><span className="label">Energi KINRA per bulan</span></div>
            <div className="nilai tnum">{angka(total / 1000, 0)}<small>MWh</small></div>
            <div className="meta">±{rupiahRingkas(totalNilai.rupiah)} · {tonCo2(totalNilai.kgCo2)} per bulan</div></div>
          <div className="tile"><div className="tile-head"><span className="tile-ikon"><Crosshair aria-hidden="true" /></span><span className="label">Tercakup SEU</span></div>
            <div className="nilai tnum">{angka(tercakup, 0)}<small>%</small></div>
            <div className="meta">{ditetapkan.length} ditetapkan · {aktif.length - ditetapkan.length} kandidat</div></div>
          <div className="tile"><div className="tile-head"><span className="tile-ikon"><Gauge aria-hidden="true" /></span><span className="label">Nilai 1% penghematan SEU</span></div>
            <div className="nilai tnum">{rupiahRingkas(nilaiSeuTahun * 0.01).replace('Rp', '')}<small>per tahun</small></div>
            <div className="meta">Dari biaya energi SEU ±{rupiahRingkas(nilaiSeuTahun)}/tahun</div></div>
          <div className="tile"><div className="tile-head"><span className="tile-ikon"><AlertTriangle aria-hidden="true" /></span><span className="label">Kepercayaan data</span></div>
            <div className="nilai tnum">{angka(porsiMeter, 0)}<small>% dari meter</small></div>
            <div className="meta">{tanpaData.length} aset belum punya data energi</div></div>
        </div>
        {catatan.length > 0 && (
          <div className="card rg-catatan" style={{ marginTop: 16 }}>
            <span className="eyebrow">Catatan analis · terdeteksi otomatis</span>
            <ul>{catatan.map((c) => <li key={c.teks} className={c.kode}>{c.teks}</li>)}</ul>
          </div>
        )}
      </section>

      <section>
        <SectionHead no="01" eyebrow="Siapa memakai energi" judul="Pareto pengguna energi KINRA">
          <p className="muted">
            Batang biru adalah kandidat SEU: porsi ≥ {angka(ambangPersen)}% atau termasuk kelompok teratas yang membentuk {angka(ambangKumulatif)}% konsumsi. Garis menunjukkan porsi kumulatif.
            BBM dikonversi ke kWh setara agar dapat dibandingkan.
          </p>
        </SectionHead>
        <div className="card">
          <ParetoGrafik daftar={daftar} ambangKumulatif={ambangKumulatif} />
          <div className="table-wrap" style={{ marginTop: 8 }}>
            <table className="tbl">
              <thead><tr><th>Pengguna energi</th><th className="num">Per bulan</th><th className="num">Porsi · kumulatif</th><th className="num">Biaya · emisi per bulan</th><th>SEU</th></tr></thead>
              <tbody>
                {daftar.map((p) => {
                  const n = nilaiP(p.id, p.kwh)
                  return (
                    <tr key={p.id}>
                      <td><b>{p.nama}</b><span className="upd">{p.dasar === 'meter' ? `rata-rata ${p.bulanData} bulan lengkap terakhir` : p.dasar === 'inventaris' ? 'perkiraan inventaris' : `rata-rata ${p.bulanData} bulan data BBM`}</span></td>
                      <td className="num">{energiListrik(p.kwh)}</td>
                      <td className="num">{persen(p.porsi)}<span className="upd">{persen(p.kumulatif, 0)}</span></td>
                      <td className="num">{rupiahRingkas(n.rupiah)}<span className="upd">{tonCo2(n.kgCo2)}</span></td>
                      <td>{p.seu ? <Chip kode={p.seu.status === 'Ditetapkan' ? 'good' : p.seu.status === 'Dicabut' ? 'na' : 'info'} label={`${p.seu.kode} · ${p.seu.status}`} /> : p.kandidat ? <Chip kode="warn" label="Kandidat, belum di register" /> : <span className="muted small">–</span>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="sumber">Sumber: bacaan stand meter (Aset & Meter), data inventaris aset Bagian M/E, dan data BBM bulanan. Rupiah dan CO₂ memakai parameter di halaman Data Energi{kv.asumsi.length ? ' (sebagian masih asumsi)' : ''}.</p>
        </div>
      </section>

      <section>
        <SectionHead no="02" eyebrow="Kesiapan SEU menghadapi audit" judul={`${aktif.length} SEU di register, ${ditetapkan.length} ditetapkan`}>
          <p className="muted">Untuk setiap SEU, auditor memeriksa: penetapan dan alasannya, variabel relevan, EnPI beserta datanya, personel yang memengaruhinya, dan pengukurannya. Penetapan dan pencabutan dilakukan admin atau konsultan; Tim KINRA dapat mengusulkan kandidat.</p>
        </SectionHead>
        <KesiapanSeu baris={kesiapan} />
        <div style={{ marginTop: 16 }}>
          <RegisterSeu seu={seu} aset={aset} meter={meter} sumber={sumber} variabel={variabel}
            enpi={enpi.map((e) => ({ kode: e.kode, nama: e.nama, lingkup: e.lingkup ?? 'kinra' }))}
            porsi={Object.fromEntries(seu.map((s) => [s.kode, porsiSeu(s.kode)]))} />
        </div>
      </section>

      <section>
        <SectionHead no="03" eyebrow="Rencana pengukuran SEU · klausul 6.6 & 9.1" judul="Di mana submeter dipasang">
          <p className="muted">
            Satu meter utama hanya memberi tahu total. Submeter pada beban terbesar menunjukkan bagian mana yang boros dan memungkinkan EnPI per proses.
            Klik titik ukur untuk melihat kegunaannya; saring per tahap untuk melihat urutan pemasangan.
          </p>
        </SectionHead>
        <DiagramSubmeter />
      </section>

      {intensitas.length > 0 && (
        <section>
          <SectionHead no="04" eyebrow="Intensitas energi bangunan" judul="kWh per m² per tahun">
            <p className="muted">Membandingkan bangunan dengan ukuran berbeda secara adil. Bangunan dengan intensitas jauh di atas rata-rata layak ditelusuri: jam operasi, beban AC, peralatan laboratorium, atau pemborosan.</p>
          </SectionHead>
          <div className="card">
            <ul className="ti-daftar">
              {intensitas.map((x, i) => (
                <li key={x.kode} style={{ '--i': i } as React.CSSProperties}>
                  <div className="ti-nama"><b>{x.nama}</b><span className="muted small">{angka(x.luas, 0)} m²{x.ac ? ` · ${angka(x.ac, 0)} m² ber-AC` : ''} · {x.dasar === 'meter' ? 'meter' : 'perkiraan'}</span></div>
                  <div className="ti-bar"><i style={{ width: `${(x.ike / maksIke) * 100}%` }} className={x.ike > rataIke * 1.5 ? 'tinggi' : undefined} /></div>
                  <b className="tnum ti-angka">{angka(x.ike, 0)}<small> kWh/m²</small></b>
                </li>
              ))}
            </ul>
            <p className="sumber">Rata-rata {angka(rataIke, 0)} kWh/m²/tahun dari {intensitas.length} bangunan. WTP dan WWTP tidak dibandingkan per m² karena bebannya proses, bukan bangunan. Pembanding standar intensitas energi bangunan perlu diverifikasi konsultan sebelum dikutip.</p>
          </div>
        </section>
      )}

      <section>
        <SectionHead no={intensitas.length ? '05' : '04'} eyebrow="Kualitas data tinjauan" judul={`${tanpaData.length} aset belum punya data energi`}>
          <p className="muted">Aset tanpa data bisa menyembunyikan SEU. Prioritaskan aset terluas dan yang punya peralatan besar (pompa, boiler, pendingin).</p>
        </SectionHead>
        <div className="card">
          <div className="table-wrap">
            <table className="tbl">
              <thead><tr><th>Kode</th><th>Aset</th><th className="num">Luas</th><th>Meter</th></tr></thead>
              <tbody>
                {asetBesarTanpaData.slice(0, 12).map((a) => (
                  <tr key={a.kode} className={/boiler|pompa|genset|power house/i.test(a.nama) ? 'lewat' : undefined}>
                    <td className="kode">{a.kode}</td>
                    <td>{a.nama}{a.area && <span className="upd">Area {a.area}</span>}{/boiler/i.test(a.nama) && <span className="upd txt-bad">Boiler: pastikan kepemilikan dan bahan bakar; berpotensi menjadi SEU</span>}</td>
                    <td className="num">{a.luas_m2 !== null ? `${angka(a.luas_m2, 0)} m²` : '–'}</td>
                    <td className="small">{meter.some((m) => m.aset_kode === a.kode) ? 'Ada, belum terbaca' : 'Belum ada'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {asetBesarTanpaData.length > 12 && <p className="muted small" style={{ marginTop: 8 }}>Dan {asetBesarTanpaData.length - 12} aset lain. Lihat semuanya di <Link href="/aset">Aset & Meter</Link>.</p>}
          <p className="sumber">Baris bergaris merah: aset dengan peralatan yang umumnya boros energi.</p>
        </div>
      </section>

      <section>
        <SectionHead no={intensitas.length ? '06' : '05'} eyebrow="Catatan tinjauan" judul={tinjauan ? `Tinjauan ${tanggal(tinjauan.periode_mulai)} – ${tanggal(tinjauan.periode_selesai)}` : 'Belum ada catatan tinjauan'}>
          <p className="muted">ISO 50001 meminta tinjauan energi didokumentasikan dan diperbarui secara berkala serta saat ada perubahan besar pada fasilitas, peralatan, atau proses.</p>
        </SectionHead>
        <div className="card">
          <div className="row">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <Layers aria-hidden="true" size={16} />
              {tinjauan ? <Chip kode={tinjauan.status === 'Disetujui' ? 'good' : 'warn'} label={tinjauan.status === 'Disetujui' ? `Disetujui ${tinjauan.disetujui_oleh ?? ''}` : 'Draft'} /> : <Chip kode="na" label="Belum ada" />}
            </div>
            <FormTinjauan tinjauan={tinjauan} />
          </div>
          {tinjauan?.ringkasan && <p style={{ marginTop: 12 }}>{tinjauan.ringkasan}</p>}
        </div>
      </section>
    </>
  )
}
