import { Building2, CalendarCheck, Database, Gauge } from 'lucide-react'
import { SectionHead } from '@/components/SectionHead'
import { ambilAsetMeter, ambilEnergi, ambilPompa } from '@/lib/data'
import { adaBacaan, konsumsiBacaan } from '@/lib/enpi'
import { angka, BULAN_PANJANG, hariIni, persen } from '@/lib/format'
import { LABEL_TEMUAN, periksaKualitasMeter } from '@/lib/kualitas-meter'
import { BacaanMeter } from './BacaanMeter'
import { JamOperasiPompa } from './JamOperasiPompa'
import { KualitasMeter } from './KualitasMeter'
import { type KotakAset, PetaAset } from './PetaAset'
import { PilihPeriode } from './PilihPeriode'
import { RegisterAset } from './RegisterAset'
import { RegisterMeter } from './RegisterMeter'

export const dynamic = 'force-dynamic'

/** Kunci kemiripan nama aset untuk mendeteksi kemungkinan duplikat (mis. "Gudang Limbah Uk 8x6" dua kali). */
function kunciNama(nama: string) {
  const s = nama.toLowerCase()
  const ukuran = /(\d+(?:[.,]\d+)?)\s*x\s*(\d+(?:[.,]\d+)?)/.exec(s)
  const kata = (s.match(/[a-z]+/g) ?? []).filter((k) => !['pembangunan', 'baru', 'bangunan', 'uk', 'ukuran', 'm', 'mtr', 'di', 'dan', 'untuk', 'pt'].includes(k))
  return `${kata.slice(0, 2).join(' ')}|${ukuran ? `${ukuran[1]}x${ukuran[2]}` : ''}`
}

export default async function AsetPage({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const [{ aset, meter, bacaan, siap }, { sumber, data }, { pompa, jam }] = await Promise.all([ambilAsetMeter(), ambilEnergi(), ambilPompa()])
  const sp = await searchParams

  // Periode default: bulan bacaan terakhir; bila belum ada bacaan, bulan berjalan
  const terakhir = bacaan.at(-1)
  const sekarang = new Date()
  const m = /^(\d{4})-(\d{2})$/.exec(sp.periode ?? '')
  const tahun = m ? Number(m[1]) : terakhir?.tahun ?? sekarang.getFullYear()
  const bulan = m && Number(m[2]) >= 1 && Number(m[2]) <= 12 ? Number(m[2]) : terakhir?.bulan ?? sekarang.getMonth() + 1
  const plnBulan = data.find((d) => d.tahun === tahun && d.bulan === bulan && d.sumber_kode === 'pln')?.nilai ?? null

  if (!siap) {
    return (
      <section>
        <SectionHead hero eyebrow="Aset & meter energi" judul="Tabel aset dan meter belum ada" />
        <p className="pesan">Jalankan migrasi <code>supabase/migrations/0022_aset_meter.sql</code> di SQL Editor Supabase, lalu muat ulang halaman ini.</p>
      </section>
    )
  }

  const kini = hariIni()
  const luas = aset.reduce((t, a) => t + (a.luas_m2 ?? 0), 0)
  const bermeter = new Set(meter.map((x) => x.aset_kode).filter(Boolean) as string[])
  const jumlahBacaan: Record<string, number> = {}
  for (const b of bacaan) jumlahBacaan[b.meter_kode] = (jumlahBacaan[b.meter_kode] ?? 0) + 1
  const statusAset = (kode: string, kwh: number | null): KotakAset['status'] => (bermeter.has(kode) ? 'meter' : kwh ? 'inventaris' : 'tanpa')
  const tanpaData = aset.filter((a) => statusAset(a.kode, a.kwh_bulan) === 'tanpa')
  const kwhDiketahui = aset.reduce((t, a) => t + (a.kwh_bulan ?? 0), 0)
  const kwhBermeter = aset.filter((a) => bermeter.has(a.kode)).reduce((t, a) => t + (a.kwh_bulan ?? 0), 0)
  const luasTanpa = tanpaData.reduce((t, a) => t + (a.luas_m2 ?? 0), 0)

  // Pembacaan bulan lalu dan kalibrasi
  const [th, bl] = [Number(kini.slice(0, 4)), Number(kini.slice(5, 7))]
  const lalu = bl === 1 ? { t: th - 1, b: 12 } : { t: th, b: bl - 1 }
  const terbaca = meter.filter((x) => bacaan.some((b) => b.meter_kode === x.kode && b.tahun === lalu.t && b.bulan === lalu.b && adaBacaan(b)))
  const tanpaKalibrasi = meter.filter((x) => !x.kalibrasi_terakhir)
  const kalibrasiLewat = meter.filter((x) => x.kalibrasi_berikutnya && x.kalibrasi_berikutnya < kini)
  // Kualitas data bacaan sampai bulan lalu (bulan berjalan belum selesai)
  const kualitas = periksaKualitasMeter(meter, bacaan, { tahun: lalu.t, bulan: lalu.b }, 24)
  const temuanBerat = kualitas.temuan.filter((t) => t.tingkat !== 'info' && t.jenis !== 'kosong')

  // Kelengkapan data aset per kolom
  const kolom: { label: string; n: number }[] = [
    { label: 'Luas bangunan', n: aset.filter((a) => (a.luas_m2 ?? 0) > 0).length },
    { label: 'Jumlah lantai & ruangan', n: aset.filter((a) => (a.jumlah_lantai ?? 0) > 0 && (a.jumlah_ruangan ?? 0) > 0).length },
    { label: 'Tahun bangun', n: aset.filter((a) => a.tahun_bangun).length },
    { label: 'Fungsi ruang', n: aset.filter((a) => a.fungsi).length },
    { label: 'Data energi (kWh/bulan)', n: aset.filter((a) => a.kwh_bulan).length },
    { label: 'PIC', n: aset.filter((a) => a.pic).length },
  ]
  const skorData = aset.length ? kolom.reduce((t, k) => t + k.n, 0) / (kolom.length * aset.length) * 100 : 0

  // Umur bangunan per tahun bangun
  const perTahun = new Map<number, { n: number; luas: number }>()
  for (const a of aset) if (a.tahun_bangun) { const r = perTahun.get(a.tahun_bangun) ?? { n: 0, luas: 0 }; perTahun.set(a.tahun_bangun, { n: r.n + 1, luas: r.luas + (a.luas_m2 ?? 0) }) }
  const tahunList = [...perTahun.keys()].sort()
  const rentangTahun = tahunList.length ? Array.from({ length: tahunList.at(-1)! - tahunList[0] + 1 }, (_, i) => tahunList[0] + i) : []
  const maksLuasTahun = Math.max(1, ...[...perTahun.values()].map((v) => v.luas))
  const tanpaTahun = aset.filter((a) => !a.tahun_bangun).length
  const umurRata = tahunList.length ? aset.filter((a) => a.tahun_bangun).reduce((t, a) => t + (th - a.tahun_bangun!), 0) / aset.filter((a) => a.tahun_bangun).length : 0

  // Catatan analis
  const catatan: { kode: 'crit' | 'warn' | 'info'; teks: string }[] = []
  if (meter.length && terbaca.length < meter.length) catatan.push({ kode: terbaca.length ? 'warn' : 'crit', teks: `${terbaca.length} dari ${meter.length} meter sudah terbaca untuk ${BULAN_PANJANG[lalu.b - 1]} ${lalu.t}. Bacaan bulanan adalah satu-satunya sumber EnPI lingkup KINRA (EnPI-04, EnPI-05).` })
  if (kwhDiketahui && kwhBermeter / kwhDiketahui > 0.95 && tanpaData.length) catatan.push({ kode: 'info', teks: `Meter yang ada sudah mencakup ${persen((kwhBermeter / kwhDiketahui) * 100, 0)} konsumsi yang diketahui, tetapi ${tanpaData.length} aset (${angka(luasTanpa, 0)} m²) belum punya data energi sama sekali. Prioritaskan ${[...tanpaData].sort((a, b) => (b.luas_m2 ?? 0) - (a.luas_m2 ?? 0)).slice(0, 3).map((a) => a.nama.trim()).join(', ')}.` })
  if (tanpaKalibrasi.length) catatan.push({ kode: 'warn', teks: `${tanpaKalibrasi.length} dari ${meter.length} meter belum punya data kalibrasi/verifikasi. Auditor akan meminta bukti akurasi peralatan ukur (klausul 7.1.5 dan 9.1).` })
  if (kalibrasiLewat.length) catatan.push({ kode: 'crit', teks: `${kalibrasiLewat.length} meter melewati jadwal kalibrasi: ${kalibrasiLewat.map((x) => x.kode).join(', ')}.` })
  if (temuanBerat.length) {
    const terbaru = temuanBerat[0]
    catatan.push({ kode: temuanBerat.some((t) => t.tingkat === 'crit') ? 'crit' : 'warn', teks: `${temuanBerat.length} temuan kualitas data meter dalam 24 bulan terakhir; terbaru ${LABEL_TEMUAN[terbaru.jenis].toLowerCase()} ${terbaru.meter_nama} ${terbaru.label}${terbaru.selisih_persen !== null ? ` (${terbaru.selisih_persen > 0 ? '+' : ''}${angka(terbaru.selisih_persen, 0)}%)` : ''}. Lihat bagian Kualitas data meter.` })
  }
  const grupNama = new Map<string, string[]>()
  for (const a of aset) { const k = kunciNama(a.nama); grupNama.set(k, [...(grupNama.get(k) ?? []), `${a.nama.trim()} (${a.kode.replace('KINRA-', '')})`]) }
  const duplikat = [...grupNama.entries()].filter(([k, v]) => v.length > 1 && k.split('|')[1])
  if (duplikat.length) catatan.push({ kode: 'warn', teks: `Kemungkinan aset tercatat ganda: ${duplikat.map(([, v]) => v.join(' dan ')).join('; ')}.` })
  const janggal = aset.filter((a) => a.luas_m2 === null || a.luas_m2 === 0 || a.jumlah_ruangan === 0)
  if (janggal.length) catatan.push({ kode: 'info', teks: `${janggal.length} aset dengan data luas atau ruangan kosong/nol: ${janggal.slice(0, 4).map((a) => a.nama.trim()).join(', ')}${janggal.length > 4 ? ', …' : ''}.` })

  const kotak: KotakAset[] = aset.map((a) => ({
    kode: a.kode, nama: a.nama.trim(), luas: a.luas_m2 ?? 0, status: statusAset(a.kode, a.kwh_bulan),
    ket: bermeter.has(a.kode) ? 'terukur meter' : a.kwh_bulan ? `perkiraan ${angka(a.kwh_bulan, 0)} kWh/bulan` : 'belum ada data energi',
  }))
  // kWh meter pembanding untuk tabel jam operasi pompa
  const kwhMeterUnit = (kode: string[], label: string) => {
    const perBulan: Record<string, number> = {}
    for (const b of bacaan) {
      const m = meter.find((x) => x.kode === b.meter_kode && kode.includes(x.kode))
      const v = m ? konsumsiBacaan(b, m) : null
      if (v !== null) perBulan[`${b.tahun}-${b.bulan}`] = (perBulan[`${b.tahun}-${b.bulan}`] ?? 0) + v
    }
    return { label, perBulan }
  }
  const kwhMeterPompa = {
    'IPAB I': kwhMeterUnit(['KINRA-MTR-005', 'KINRA-MTR-008'], 'kWh meter WTP + intake'),
    'IPAL I': kwhMeterUnit(['KINRA-MTR-004'], 'kWh meter WWTP'),
  }
  const luasStatus = (s: KotakAset['status']) => kotak.filter((k) => k.status === s).reduce((t, k) => t + k.luas, 0)

  return (
    <>
      <section>
        <SectionHead hero eyebrow="PA-12 · Klausul 6.3, 6.6, 7.1.5, 9.1"
          judul={<>{meter.length} meter mengukur <span className="ks-sorot">{persen(kwhDiketahui ? (kwhBermeter / kwhDiketahui) * 100 : 0, 0)}</span> konsumsi yang diketahui; {tanpaData.length} dari {aset.length} aset belum terpetakan energinya</>}>
          <p className="muted">Register aset gedung/fasilitas dan meter energi KINRA: dasar tinjauan energi (SEU), rencana pengumpulan data energi, dan bukti kalibrasi peralatan ukur.</p>
        </SectionHead>
        <div className="tiles">
          <div className="tile"><div className="tile-head"><span className="tile-ikon"><Building2 aria-hidden="true" /></span><span className="label">Aset & luas</span></div>
            <div className="nilai tnum">{aset.length}<small>aset · {angka(luas, 0)} m²</small></div>
            <div className="meta">{bermeter.size} bermeter · {aset.length - bermeter.size - tanpaData.length} perkiraan · {tanpaData.length} tanpa data</div></div>
          <div className="tile"><div className="tile-head"><span className="tile-ikon"><Gauge aria-hidden="true" /></span><span className="label">Terbaca {BULAN_PANJANG[lalu.b - 1]}</span></div>
            <div className="nilai tnum">{terbaca.length}<small>dari {meter.length} meter</small></div>
            <div className="meta">{meter.length - terbaca.length ? `${meter.length - terbaca.length} meter belum dibaca` : 'Semua meter terbaca'}</div></div>
          <div className="tile"><div className="tile-head"><span className="tile-ikon"><CalendarCheck aria-hidden="true" /></span><span className="label">Kalibrasi meter</span></div>
            <div className="nilai tnum">{meter.length - tanpaKalibrasi.length}<small>dari {meter.length} tercatat</small></div>
            <div className="meta">{kalibrasiLewat.length ? `${kalibrasiLewat.length} lewat jadwal` : 'Tidak ada yang lewat jadwal'}</div></div>
          <div className="tile"><div className="tile-head"><span className="tile-ikon"><Database aria-hidden="true" /></span><span className="label">Kelengkapan data aset</span></div>
            <div className="nilai tnum">{angka(skorData, 0)}<small>%</small></div>
            <div className="meta">Rata-rata 6 kolom data utama</div></div>
        </div>
        {catatan.length > 0 && (
          <div className="card rg-catatan" style={{ marginTop: 16 }}>
            <span className="eyebrow">Catatan analis · terdeteksi otomatis</span>
            <ul>{catatan.map((c) => <li key={c.teks} className={c.kode}>{c.teks}</li>)}</ul>
          </div>
        )}
      </section>

      <section>
        <SectionHead no="01" eyebrow="Peta komposisi aset" judul="Seberapa besar kawasan KINRA yang sudah terukur?">
          <p className="muted">Setiap kotak adalah satu aset, luasnya sebanding luas bangunan. Warna menunjukkan status data energinya. Arahkan kursor untuk rinciannya.</p>
        </SectionHead>
        <div className="card">
          <PetaAset kotak={kotak} />
          <div className="pa-legenda">
            {([['meter', 'Terukur meter'], ['inventaris', 'Perkiraan inventaris'], ['tanpa', 'Belum ada data energi']] as const).map(([s, l]) => (
              <span key={s}><i className={`pa-warna s-${s}`} />{l} · {angka(luasStatus(s), 0)} m² ({persen(luas ? (luasStatus(s) / luas) * 100 : 0, 0)})</span>
            ))}
          </div>
        </div>
        <div className="grid-2" style={{ marginTop: 16 }}>
          <div className="card">
            <h3>Kelengkapan data aset</h3>
            <p className="muted small">Data aset yang lengkap memudahkan pembagian konsumsi dan pembandingan intensitas energi.</p>
            <div className="rg-lengkap">
              {kolom.map((k) => {
                const p = aset.length ? (k.n / aset.length) * 100 : 0
                return (
                  <div key={k.label}>
                    <div className="row"><span className="small">{k.label}</span><b className="tnum small">{k.n}/{aset.length}</b></div>
                    <div className="pg" style={{ marginTop: 4 }}><div className="track"><b className={p >= 90 ? 'bg-good' : p >= 50 ? '' : 'bg-warn'} style={{ width: `${p}%` }} /></div></div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="card">
            <h3>Umur bangunan</h3>
            <p className="muted small">Luas bangunan menurut tahun dibangun. Rata-rata umur {angka(umurRata, 0)} tahun{tanpaTahun ? `; ${tanpaTahun} aset tanpa tahun bangun` : ''}. Bangunan lama umumnya kandidat audit selubung, AC, dan penerangan.</p>
            <div className="pa-umur" role="img" aria-label="Luas bangunan per tahun dibangun">
              {rentangTahun.map((t, i) => {
                const v = perTahun.get(t)
                return (
                  <div key={t} className="pa-umur-kol" title={v ? `${t}: ${v.n} aset, ${angka(v.luas, 0)} m²` : `${t}: –`}>
                    <i style={{ height: `${v ? Math.max(4, (v.luas / maksLuasTahun) * 100) : 0}%`, '--i': i } as React.CSSProperties} />
                    <span>{String(t).slice(2)}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      <section id="kualitas-data">
        <SectionHead no="02" eyebrow="Kualitas data meter · klausul 7.1.5, 9.1" judul={kualitas.ringkas.masalah + kualitas.ringkas.anomali + kualitas.ringkas.kosong
          ? `${kualitas.ringkas.masalah + kualitas.ringkas.anomali + kualitas.ringkas.kosong} bulan-meter perlu dicek sebelum dipakai EnPI`
          : 'Semua bacaan 24 bulan terakhir lolos pemeriksaan'}>
          <p className="muted">Pemeriksaan otomatis setiap bacaan: bulan kosong, stand mundur atau tidak bersambung, selisih dengan tagihan, dan konsumsi di luar pola bulan-bulan sebelumnya. Data yang salah di sini terbawa ke EnPI, deviasi, dan laporan.</p>
        </SectionHead>
        <KualitasMeter hasil={kualitas} />
      </section>

      <section>
        <SectionHead no="03" eyebrow="Bacaan stand meter" judul={`Bacaan ${BULAN_PANJANG[bulan - 1]} ${tahun}`}>
          <p className="muted">Catat stand awal dan akhir setiap meter per bulan. Stand awal otomatis diambil dari stand akhir bulan sebelumnya bila sudah ada.</p>
        </SectionHead>
        <PilihPeriode tahun={tahun} bulan={bulan} />
        <BacaanMeter key={`${tahun}-${bulan}`} meter={meter} bacaan={bacaan} tahun={tahun} bulan={bulan} plnBulan={plnBulan} />
      </section>

      <section>
        <SectionHead no="04" eyebrow="Register induk meter energi" judul="Meter & alat ukur">
          <p className="muted">Lengkapi akurasi, jadwal kalibrasi/verifikasi, PIC, dan bukti pendukung setiap meter (klausul 6.6, 7.1.5, dan 9.1).</p>
        </SectionHead>
        <RegisterMeter meter={meter} aset={aset} sumber={sumber} jumlahBacaan={jumlahBacaan} />
      </section>

      <section>
        <SectionHead no="05" eyebrow="Daftar aset gedung & fasilitas" judul="Aset KINRA">
          <p className="muted">Data luas, teknis, dan energi per gedung/fasilitas sebagai dasar pembagian konsumsi dan penentuan SEU.</p>
        </SectionHead>
        <RegisterAset aset={aset} meter={meter} />
      </section>

      <section>
        <SectionHead no="06" eyebrow="Jam operasi pompa & motor" judul="Pompa IPAB, IPAL, dan Tangki Timbun">
          <p className="muted">Jam operasi bulanan per pompa/motor beserta daya dan kapasitasnya. Dipakai untuk menelusuri perubahan konsumsi SEU WTP dan WWTP, dan sebagai calon variabel relevan EnPI.</p>
        </SectionHead>
        <JamOperasiPompa pompa={pompa} jam={jam} kwhMeter={kwhMeterPompa} />
      </section>
    </>
  )
}
