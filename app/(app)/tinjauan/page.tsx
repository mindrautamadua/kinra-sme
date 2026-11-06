import { AlertTriangle, Gauge, Layers, Target, Zap } from 'lucide-react'
import Link from 'next/link'
import { Chip } from '@/components/Chip'
import { SectionHead } from '@/components/SectionHead'
import { ambilAsetMeter, ambilKinerja, ambilSeu } from '@/lib/data'
import { angka, energiListrik, persen, tanggal } from '@/lib/format'
import { penggunaEnergi } from '@/lib/tinjauan'
import { FormTinjauan } from './FormTinjauan'
import { DiagramSubmeter } from './DiagramSubmeter'
import { RegisterSeu } from './RegisterSeu'

export const dynamic = 'force-dynamic'

export default async function TinjauanPage() {
  const [{ seu, tinjauan, siap }, { aset, meter, bacaan }, { sumber, energi, variabel, enpi }] = await Promise.all([ambilSeu(), ambilAsetMeter(), ambilKinerja()])

  if (!siap) {
    return (
      <section>
        <SectionHead hero eyebrow="Klausul 6.3 · Tinjauan energi" judul="Tabel tinjauan energi dan SEU belum ada" />
        <p className="pesan">Jalankan migrasi <code>supabase/migrations/0027_tinjauan_energi_seu.sql</code> di SQL Editor Supabase, lalu muat ulang halaman ini.</p>
      </section>
    )
  }

  const ambangPersen = tinjauan?.ambang_persen ?? 10
  const ambangKumulatif = tinjauan?.ambang_kumulatif ?? 80
  const { daftar, total, tanpaData, porsiMeter } = penggunaEnergi({ aset, meter, bacaan, sumber, energi, seu, ambangPersen, ambangKumulatif })
  const ditetapkan = seu.filter((s) => s.status === 'Ditetapkan')
  const tercakup = daftar.filter((p) => p.seu && p.seu.status !== 'Dicabut').reduce((t, p) => t + p.porsi, 0)
  const kandidatTanpaSeu = daftar.filter((p) => p.kandidat && !p.seu)
  const maks = Math.max(1, ...daftar.map((p) => p.kwh))
  const asetBesarTanpaData = [...tanpaData].sort((a, b) => (b.luas_m2 ?? 0) - (a.luas_m2 ?? 0))

  return (
    <>
      <section>
        <SectionHead hero eyebrow="Klausul 6.3 · Tinjauan energi & penggunaan energi signifikan (SEU)"
          judul={<>{daftar.slice(0, 2).map((p) => p.nama.replace(/\s*\(.*\)$/, '')).join(' dan ')} memakai <span className="ks-sorot">{persen(daftar.slice(0, 2).reduce((t, p) => t + p.porsi, 0), 0)}</span> energi KINRA</>}>
          <p className="muted">
            Tinjauan energi menjawab tiga hal: di mana energi dipakai, mana yang signifikan (SEU), dan siapa yang mengendalikannya.
            SEU menjadi fokus EnPI, sasaran, pengendalian operasional, dan kompetensi personel. Lingkupnya hanya energi dalam kendali KINRA, tidak termasuk listrik tenant.
          </p>
        </SectionHead>
        <div className="tiles">
          <div className="tile"><div className="tile-head"><span className="tile-ikon"><Zap aria-hidden="true" /></span><span className="label">Energi KINRA per bulan</span></div>
            <div className="nilai tnum">{angka(total / 1000, 1)}<small>MWh setara</small></div>
            <div className="meta">{daftar.length} pengguna energi dengan data</div></div>
          <div className="tile"><div className="tile-head"><span className="tile-ikon"><Gauge aria-hidden="true" /></span><span className="label">Terukur dari meter</span></div>
            <div className="nilai tnum">{angka(porsiMeter, 0)}<small>%</small></div>
            <div className="meta">{porsiMeter < 100 ? 'Sisanya perkiraan inventaris atau data BBM' : 'Seluruhnya dari bacaan meter'}</div></div>
          <div className="tile"><div className="tile-head"><span className="tile-ikon"><Target aria-hidden="true" /></span><span className="label">SEU ditetapkan</span></div>
            <div className="nilai tnum">{ditetapkan.length}<small>dari {seu.filter((s) => s.status !== 'Dicabut').length} di register</small></div>
            <div className="meta">Mencakup {persen(tercakup, 0)} energi KINRA</div></div>
          <div className="tile"><div className="tile-head"><span className="tile-ikon"><AlertTriangle aria-hidden="true" /></span><span className="label">Aset belum ada data energi</span></div>
            <div className="nilai tnum">{tanpaData.length}<small>dari {aset.length}</small></div>
            <div className="meta">Bisa menyembunyikan SEU yang belum diketahui</div></div>
        </div>
      </section>

      <section>
        <SectionHead no="01" eyebrow="Siapa memakai energi" judul="Pareto pengguna energi KINRA">
          <p className="muted">
            Diurutkan dari pemakai terbesar. Kandidat SEU: porsi ≥ {angka(ambangPersen)}% atau termasuk kelompok teratas yang membentuk {angka(ambangKumulatif)}% konsumsi.
            BBM dikonversi ke kWh setara agar dapat dibandingkan.
          </p>
        </SectionHead>
        <div className="card">
          <ol className="te-pareto" aria-label="Pareto pengguna energi">
            {daftar.map((p) => (
              <li key={p.id} className={p.kandidat ? 'kandidat' : undefined}>
                <div className="te-pareto-nama">
                  <b>{p.nama}</b>
                  <span className="muted small">
                    {p.dasar === 'meter' ? `rata-rata ${p.bulanData} bulan bacaan meter` : p.dasar === 'inventaris' ? 'perkiraan inventaris' : `rata-rata ${p.bulanData} bulan data`}
                  </span>
                </div>
                <div className="te-pareto-bar" aria-hidden="true">
                  <i style={{ width: `${(p.kwh / maks) * 100}%` }} />
                </div>
                <div className="te-pareto-angka tnum">
                  <b>{persen(p.porsi)}</b>
                  <span className="muted small">{energiListrik(p.kwh)}/bln · kum. {persen(p.kumulatif, 0)}</span>
                </div>
                <div className="te-pareto-status">
                  {p.seu
                    ? <Chip kode={p.seu.status === 'Ditetapkan' ? 'good' : p.seu.status === 'Dicabut' ? 'na' : 'info'} label={`${p.seu.kode} · ${p.seu.status}`} />
                    : p.kandidat ? <Chip kode="warn" label="Kandidat SEU" /> : null}
                </div>
              </li>
            ))}
          </ol>
          {kandidatTanpaSeu.length > 0 && (
            <p className="pesan" style={{ marginTop: 12 }}>
              {kandidatTanpaSeu.map((p) => p.nama).join(', ')} memenuhi kriteria kandidat SEU tetapi belum ada di register. Tambahkan sebagai kandidat atau catat alasan tidak dijadikan SEU.
            </p>
          )}
          <p className="sumber">Sumber: bacaan stand meter (halaman Aset & Meter), data inventaris aset Bagian M/E, dan data BBM bulanan. Listrik tenant tidak termasuk.</p>
        </div>
      </section>

      <section>
        <SectionHead no="02" eyebrow="Register SEU" judul={`${ditetapkan.length} SEU ditetapkan, ${seu.filter((s) => s.status === 'Kandidat').length} kandidat`}>
          <p className="muted">Setiap SEU wajib punya alasan penetapan, variabel relevan, EnPI pengukur, PIC, dan personel yang pekerjaannya memengaruhinya. Penetapan dan pencabutan dilakukan admin atau konsultan; Tim KINRA dapat mengusulkan kandidat.</p>
        </SectionHead>
        <RegisterSeu seu={seu} aset={aset} meter={meter} sumber={sumber} variabel={variabel}
          enpi={enpi.map((e) => ({ kode: e.kode, nama: e.nama, lingkup: e.lingkup ?? 'kinra' }))}
          porsi={Object.fromEntries(seu.map((s) => [s.kode, daftar.filter((p) => p.seu?.kode === s.kode).reduce((t, p) => t + p.porsi, 0)]))} />
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

      <section>
        <SectionHead no="04" eyebrow="Kualitas data tinjauan" judul={`${tanpaData.length} aset belum punya data energi`}>
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
        <SectionHead no="05" eyebrow="Catatan tinjauan" judul={tinjauan ? `Tinjauan ${tanggal(tinjauan.periode_mulai)} – ${tanggal(tinjauan.periode_selesai)}` : 'Belum ada catatan tinjauan'}>
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
