import { ArrowDownRight, ArrowUpRight, CircleAlert } from 'lucide-react'
import Link from 'next/link'
import { Chip } from '@/components/Chip'
import { SectionHead } from '@/components/SectionHead'
import { TombolCetak } from '@/components/TombolCetak'
import {
  ambilAsetMeter, ambilDeviasi, ambilDokumen, ambilIsu, ambilKegiatan, ambilKinerja, ambilParameter, ambilPeluang, ambilSasaran, ambilSeu, ambilTemuan,
} from '@/lib/data'
import { BATAS_HARI_TANGGAPAN, deteksiDeviasi, gabungDeviasi, hariSejak, terbuka } from '@/lib/deviasi'
import { pilihEnpiUtama, ringkas } from '@/lib/enpi'
import { angka, BULAN_PANJANG, energiListrik, hariIni, persen, selisihHari, tanggal } from '@/lib/format'
import { nilaiEnergi, nilaiPengguna, rupiahRingkas, susunKonversi, tonCo2 } from '@/lib/konversi'
import { LABEL_STATUS, susunPeta } from '@/lib/peta-smen'
import { LABEL_PROYEKSI, proyeksiSasaran } from '@/lib/proyeksi-sasaran'
import { grupStatus, kesiapan, tahapSiap, tonggakDari } from '@/lib/status'
import { penggunaEnergi } from '@/lib/tinjauan'

export const dynamic = 'force-dynamic'

type Perubahan = { judul: string; kini: number; lalu: number; satuan: string; makna: string }

export default async function RingkasanDireksi() {
  const [dokumen, kegiatan, temuan, isu, peluang, { seu, tinjauan }, kinerja, { sasaran, aksi }, register, { aset }, param] = await Promise.all([
    ambilDokumen(), ambilKegiatan(), ambilTemuan(), ambilIsu(), ambilPeluang(), ambilSeu(), ambilKinerja(), ambilSasaran(), ambilDeviasi(), ambilAsetMeter(), ambilParameter(),
  ])
  const kini = hariIni()
  const kv = susunKonversi(param)
  const { energi, sumber, hasil, meter, bacaan, dataVariabel } = kinerja

  // Periode laporan: bulan terakhir yang punya data PLN
  const kunciAkhir = Math.max(...energi.filter((d) => d.sumber_kode === 'pln').map((d) => d.tahun * 12 + d.bulan - 1))
  const th = Math.floor(kunciAkhir / 12), bl = (kunciAkhir % 12) + 1
  const nilai = (t: number, b: number, k: string) => energi.find((d) => d.tahun === t && d.bulan === b && d.sumber_kode === k)?.nilai
  const variabel = (t: number, b: number, k: string) => dataVariabel.find((d) => d.tahun === t && d.bulan === b && d.variabel_kode === k)?.nilai

  // 1. Angka kunci
  const skorSiap = kesiapan(dokumen)
  const pakai = penggunaEnergi({ aset, meter, bacaan, sumber, energi, seu, ambangPersen: tinjauan?.ambang_persen ?? 10, ambangKumulatif: tinjauan?.ambang_kumulatif ?? 80 })
  const biayaKinra = pakai.daftar.reduce((t, p) => {
    const n = nilaiPengguna(kv, p.id, p.kwh)
    return { rupiah: t.rupiah + n.rupiah, kgCo2: t.kgCo2 + n.kgCo2 }
  }, { rupiah: 0, kgCo2: 0 })
  const utama = pilihEnpiUtama(hasil)
  const ru = utama && ringkas(utama.laporan)
  const devBaris = gabungDeviasi(deteksiDeviasi(hasil), register).baris
  const devBuka = devBaris.filter((x) => terbuka(x.r))
  const devTelat = devBuka.filter((x) => !x.r && hariSejak(x.d.tahun, x.d.bulan, kini) > BATAS_HARI_TANGGAPAN)
  const temuanBuka = temuan.filter((t) => t.status !== 'Tertutup')
  const proyeksi = sasaran.filter((s) => s.status === 'Aktif').map((s) => {
    const h = hasil.find((x) => x.enpi.kode === s.enpi_kode)
    const p = h ? proyeksiSasaran(s, h, kini) : null
    return p && { s, p }
  }).filter((x) => !!x)
  const diJalur = proyeksi.filter((x) => x.p.status === 'di_jalur' || x.p.status === 'tercapai')
  const terancam = proyeksi.filter((x) => x.p.status === 'sulit' || x.p.status === 'berisiko')
  const berjalan = proyeksi.filter((x) => x.p.status !== 'belum_mulai' && x.p.status !== 'kurang_data')

  // 2. Perubahan terbesar: bulan laporan dibanding bulan yang sama tahun lalu
  const kandidat: (Perubahan | null)[] = [
    nilai(th, bl, 'pln') && nilai(th - 1, bl, 'pln')
      ? { judul: 'Listrik PLN kawasan (termasuk tenant)', kini: nilai(th, bl, 'pln')!, lalu: nilai(th - 1, bl, 'pln')!, satuan: 'kWh', makna: 'Didorong pertumbuhan tenant; bukan ukuran kinerja SMEn KINRA.' } : null,
    nilai(th, bl, 'dexlite') && nilai(th - 1, bl, 'dexlite')
      ? { judul: 'BBM kendaraan operasional KINRA', kini: nilai(th, bl, 'dexlite')!, lalu: nilai(th - 1, bl, 'dexlite')!, satuan: 'liter', makna: 'Lingkup KINRA: perlu penjelasan penyebab (armada, jam operasi, pencatatan).' } : null,
    variabel(th, bl, 'air_wtp1') && variabel(th - 1, bl, 'air_wtp1')
      ? { judul: 'Air diolah WTP I (tanpa BTM)', kini: variabel(th, bl, 'air_wtp1')!, lalu: variabel(th - 1, bl, 'air_wtp1')!, satuan: 'm³', makna: 'Beban WTP (SEU-01) ikut naik; pantau kWh per m³ setelah meter terbaca.' } : null,
    nilai(th, bl, 'pltbg') && nilai(th - 1, bl, 'pltbg')
      ? { judul: 'Pasokan PLTBG (biogas)', kini: nilai(th, bl, 'pltbg')!, lalu: nilai(th - 1, bl, 'pltbg')!, satuan: 'kWh', makna: 'Memengaruhi bauran energi terbarukan kawasan.' } : null,
  ]
  const perubahan = kandidat.filter((x): x is Perubahan => !!x)
    .sort((a, b) => Math.abs(b.kini / b.lalu - 1) - Math.abs(a.kini / a.lalu - 1)).slice(0, 3)

  // 3. Keputusan yang dibutuhkan
  const keputusan: { teks: string; ket: string; href: string }[] = []
  const kandidatSeu = seu.filter((s) => s.status === 'Kandidat')
  if (kandidatSeu.length) keputusan.push({ teks: `Tetapkan ${kandidatSeu.map((s) => s.kode).join(' dan ')} sebagai SEU`, ket: `${kandidatSeu.map((s) => s.nama.replace(/\s*\(.*\)$/, '')).join(', ')} menyerap sebagian besar energi KINRA. Tanpa SEU yang ditetapkan, auditor berpotensi mengeluarkan temuan mayor klausul 6.3.`, href: '/tinjauan' })
  const belumSah = dokumen.filter((d) => (d.jumlah_berkas ?? 0) > 0 && !(grupStatus(d.status) === 'final' && (d.jumlah_sah ?? 0) > 0))
  if (belumSah.length) keputusan.push({ teks: `Sahkan ${belumSah.length} dokumen yang evidence-nya masih draf`, ket: `Berkas sudah ada tetapi belum Final atau belum ada versi sah${belumSah.some((d) => d.wajib_iso) ? `, termasuk ${belumSah.filter((d) => d.wajib_iso).length} dokumen wajib ISO` : ''}. Stage 1 menilai kecukupan dokumen yang sudah ditetapkan (klausul 7.5).`, href: '/kesiapan' })
  if (tinjauan && tinjauan.status !== 'Disetujui') keputusan.push({ teks: 'Setujui catatan tinjauan energi', ket: 'Tinjauan energi masih draft; persetujuan menjadi bukti klausul 6.3.', href: '/tinjauan' })
  const kinraTanpaData = hasil.filter((h) => h.enpi.aktif && (h.enpi.lingkup ?? 'kinra') === 'kinra' && h.enpi.meter_kode?.length && (h.galat || !h.model))
  const stage2 = tonggakDari(kegiatan).find((t) => /stage 2/i.test(t.nama))
  if (kinraTanpaData.length) keputusan.push({ teks: 'Tetapkan strategi baseline EnPI lingkup KINRA', ket: `${kinraTanpaData.map((h) => h.enpi.kode).join(', ')} baru punya baseline setelah 12 bulan bacaan meter${stage2 ? `, sedangkan ${stage2.nama} ${tanggal(stage2.tanggal)}` : ''}. Pilih: rekonstruksi dari tagihan per sambungan, atau rencana pengukuran sebagai bukti.`, href: '/kinerja' })
  if (devTelat.length) keputusan.push({ teks: `Minta penyelidikan ${devTelat.length} deviasi signifikan`, ket: `Lebih dari ${BATAS_HARI_TANGGAPAN} hari belum diselidiki (${[...new Set(devTelat.map((x) => x.d.enpi_kode))].join(', ')}). Wajib menurut klausul 9.1.`, href: '/kinerja#deviasi' })
  if (terancam.length) keputusan.push({ teks: `Tindak lanjuti ${terancam.length} sasaran energi yang terancam tidak tercapai`, ket: `${terancam.map((x) => `${x.s.kode} (${x.s.enpi_kode}): proyeksi ${x.p.proyeksi === null ? '–' : persen(x.p.proyeksi, 1)} dari target ${persen(x.p.target, 1)}, ${LABEL_PROYEKSI[x.p.status].toLowerCase()}`).join('; ')}. Pilih: percepat rencana aksi dan sumber dayanya, atau tetapkan ulang target melalui tinjauan manajemen (klausul 6.2, 9.3).`, href: '/sasaran' })
  const lewatTenggat = temuanBuka.filter((t) => t.tenggat && t.tenggat < kini)
  if (lewatTenggat.length) keputusan.push({ teks: `Percepat ${lewatTenggat.length} temuan yang lewat tenggat`, ket: 'Temuan terbuka melewati tenggat menjadi sorotan auditor pada klausul 10.', href: '/temuan' })
  if (kv.asumsi.length) keputusan.push({ teks: 'Verifikasi parameter rupiah dan emisi', ket: `Masih asumsi: ${kv.asumsi.join(', ')}. Angka rupiah dan CO₂ di laporan ini bersifat perkiraan sampai diverifikasi.`, href: '/energi' })

  // 4. Menuju sertifikasi
  const tonggak = tonggakDari(kegiatan)
  const peta = susunPeta({ dokumen, isu, peluang, seu, tinjauan, hasil, sasaran, aksi, temuan, meter, bacaan, kini, deviasiBuka: devBuka.length })

  return (
    <article className="dr-laporan">
      <div className="toolbar tanpa-cetak"><Link className="btn" href="/">← Ringkasan</Link><span style={{ flex: 1 }} /><TombolCetak /></div>
      <SectionHead hero eyebrow={`Ringkasan direksi · data s.d. ${BULAN_PANJANG[bl - 1]} ${th}`}
        judul={<>Sistem Manajemen Energi KINRA: <span className="ks-sorot">{keputusan.length} keputusan</span> dibutuhkan bulan ini</>}>
        <p className="muted">Disusun otomatis dari aplikasi SMEn pada {tanggal(kini, 'panjang')}. Lingkup kinerja: energi dalam kendali KINRA, tidak termasuk listrik tenant.</p>
      </SectionHead>

      <section>
        <h2 className="dr-judul">1 · Angka kunci</h2>
        <div className="dr-angka">
          <div className="tile"><span className="label">Kesiapan audit</span><div className="nilai tnum">{angka(skorSiap, 0)}<small>%</small></div><div className="meta">Final + berkas sah · {dokumen.filter((d) => tahapSiap(d) === 'proses').length} masih draf/belum sah</div></div>
          <div className="tile"><span className="label">Energi KINRA per bulan</span><div className="nilai tnum">{angka(pakai.total / 1000, 0)}<small>MWh</small></div><div className="meta">±{rupiahRingkas(biayaKinra.rupiah)} · {tonCo2(biayaKinra.kgCo2)}</div></div>
          <div className="tile"><span className="label">EnPI utama</span>
            <div className="nilai tnum">{ru?.perbaikan == null ? '–' : utama!.ekstrapolasi ? '?' : `${ru.perbaikan >= 0 ? '+' : '−'}${angka(Math.abs(ru.perbaikan), 1)}%`}</div>
            <div className="meta">{utama ? `${utama.enpi.kode} ${utama.enpi.nama}${utama.ekstrapolasi ? ' · ekstrapolasi, belum dapat diklaim' : ''}` : 'Menunggu data meter'}</div></div>
          <div className="tile"><span className="label">Sasaran energi akhir tahun</span>
            <div className={`nilai tnum ${terancam.length ? 'txt-bad' : ''}`}>{berjalan.length ? <>{diJalur.length}<small>dari {berjalan.length} di jalur</small></> : '–'}</div>
            <div className="meta">{!proyeksi.length ? 'Belum ada sasaran aktif terukur'
              : !berjalan.length ? `${proyeksi.length} sasaran, tahun target ${[...new Set(proyeksi.map((x) => x.p.tahun))].join(', ')} belum berjalan`
              : `${terancam.length} terancam · proyeksi laju 3 bulan terakhir${proyeksi.length > berjalan.length ? ` · ${proyeksi.length - berjalan.length} belum berjalan` : ''}`}</div></div>
          <div className="tile"><span className="label">Deviasi signifikan terbuka</span><div className={`nilai tnum ${devBuka.length ? 'txt-bad' : ''}`}>{devBuka.length}</div><div className="meta">{devTelat.length} lewat {BATAS_HARI_TANGGAPAN} hari tanpa penyelidikan</div></div>
          <div className="tile"><span className="label">Temuan audit terbuka</span><div className="nilai tnum">{temuanBuka.length}</div><div className="meta">{temuanBuka.filter((t) => t.kategori === 'Mayor').length} mayor · {lewatTenggat.length} lewat tenggat</div></div>
        </div>
      </section>

      <section>
        <h2 className="dr-judul">2 · Perubahan terbesar ({BULAN_PANJANG[bl - 1]} {th} dibanding {BULAN_PANJANG[bl - 1]} {th - 1})</h2>
        <ol className="dr-perubahan">
          {perubahan.map((p) => {
            const d = (p.kini / p.lalu - 1) * 100
            const Ikon = d >= 0 ? ArrowUpRight : ArrowDownRight
            return (
              <li key={p.judul}>
                <Ikon aria-hidden="true" className={d >= 0 ? 'txt-bad' : 'txt-good'} />
                <div>
                  <b>{p.judul}: {d >= 0 ? 'naik' : 'turun'} {persen(Math.abs(d), 0)}</b>
                  <span className="muted small">{p.satuan === 'kWh' ? energiListrik(p.kini) : `${angka(p.kini, 0)} ${p.satuan}`} dibanding {p.satuan === 'kWh' ? energiListrik(p.lalu) : `${angka(p.lalu, 0)} ${p.satuan}`}. {p.makna}</span>
                </div>
              </li>
            )
          })}
          {!perubahan.length && <li className="muted">Belum ada data pembanding tahun lalu.</li>}
        </ol>
      </section>

      <section>
        <h2 className="dr-judul">3 · Keputusan yang dibutuhkan</h2>
        <ol className="dr-keputusan">
          {keputusan.map((k) => (
            <li key={k.teks}><CircleAlert aria-hidden="true" /><div><b>{k.teks}</b><span className="muted small">{k.ket}</span></div><Link href={k.href} className="tanpa-cetak small">Rincian →</Link></li>
          ))}
          {!keputusan.length && <li className="muted">Tidak ada keputusan mendesak.</li>}
        </ol>
      </section>

      <section>
        <h2 className="dr-judul">4 · Menuju sertifikasi ISO 50001</h2>
        <div className="dr-tonggak">
          {tonggak.map((t) => {
            const h = selisihHari(t.tanggal)
            return <div key={t.kode} className={h < 0 ? 'lewat' : undefined}><b>{t.nama}</b><span className="tnum">{tanggal(t.tanggal)}</span><span className="muted small">{h < 0 ? 'sudah lewat' : h === 0 ? 'hari ini' : `${h} hari lagi`}</span></div>
          })}
        </div>
        <div className="dr-peta">
          {peta.map((t) => <span key={t.no} className={`pt-titik s-${t.status}`} title={`${t.nama}: ${LABEL_STATUS[t.status]}`}><b>{t.no}</b><span>{t.nama}</span></span>)}
        </div>
        <p className="muted small">{peta.filter((t) => t.status === 'selesai').length} dari 12 langkah siklus SMEn sudah berjalan penuh.{' '}
          <Chip kode="info" label="Rincian di Peta SMEn" /></p>
      </section>

      <p className="sumber">Sumber: aplikasi SMEn KINRA (data energi, register SEU, EnPI, deviasi, temuan, kesiapan dokumen). Rupiah dan CO₂ memakai tarif dan faktor emisi di halaman Data Energi{kv.asumsi.length ? ' (sebagian masih asumsi)' : ''}.</p>
    </article>
  )
}
