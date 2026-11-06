import { ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { TombolCetak } from '@/components/TombolCetak'
import { ambilAsetMeter, ambilDeviasi, ambilDokumen, ambilIsu, ambilKegiatan, ambilKinerja, ambilKlausul, ambilParameter, ambilRiwayatSimulasi, ambilSasaran, ambilSeu, ambilTemuan, catatPotret } from '@/lib/data'
import { deteksiDeviasi, gabungDeviasi, terbuka as deviasiTerbuka } from '@/lib/deviasi'
import { nilaiEnergi, rupiahRingkas, susunKonversi, tonCo2 } from '@/lib/konversi'
import { penggunaEnergi } from '@/lib/tinjauan'
import { AMBANG, LABEL_METODE } from '@/lib/enpi'
import { angka, hariIni, persen, selisihHari, tanggal, waktu } from '@/lib/format'
import { AMBANG_RAG, KLAUSUL_KRITIS, LABEL_RAG, type Rag, susunLaporan } from '@/lib/laporan'
import { penggunaSaya } from '@/lib/sesi'
import { adaBukti, grupStatus, INDUK_KLAUSUL, kemajuan, siapAudit, terlambat } from '@/lib/status'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Laporan Kesiapan Audit ISO 50001' }

const ORG = 'PT Kawasan Industri Nusantara (KINRA)'
const HASIL_GERBANG = { lulus: { label: 'Lulus', rag: 'hijau' }, parsial: { label: 'Parsial', rag: 'kuning' }, gagal: { label: 'Belum', rag: 'merah' } } as const
const RAG_PUTUSAN = { siap: 'hijau', bersyarat: 'kuning', belum: 'merah' } as const
const RAG_TINGKAT = { Kritis: 'merah', Tinggi: 'kuning', Sedang: 'netral' } as const

function Tanda({ rag, children }: { rag: Rag | 'netral'; children: React.ReactNode }) {
  return <span className={`lp-tanda ${rag}`}><i aria-hidden="true" />{children}</span>
}

function Batang({ p, rag }: { p: number; rag: Rag | null }) {
  return (
    <span className="lp-batang" aria-hidden="true">
      <i className={rag ?? 'netral'} style={{ width: `${Math.max(0, Math.min(100, p))}%` }} />
      <b style={{ left: `${AMBANG_RAG.hijau}%` }} />
    </span>
  )
}

function Cincin({ p, rag }: { p: number; rag: Rag }) {
  return (
    <svg className={`lp-cincin ${rag}`} viewBox="0 0 120 120" role="img" aria-label={`Skor kesiapan ${Math.round(p)} persen`}>
      <circle cx="60" cy="60" r="50" pathLength={100} className="trk" />
      <circle cx="60" cy="60" r="50" pathLength={100} className="isi" style={{ strokeDasharray: `${p} 100` }} />
      <text x="60" y="60" textAnchor="middle" dominantBaseline="central">{Math.round(p)}<tspan dy="-12" fontSize="14">%</tspan></text>
    </svg>
  )
}

function Bagian({ no, judul, acuan, children, baru, pesan }: { no: string; judul: string; acuan?: string; children: React.ReactNode; baru?: boolean; pesan?: string }) {
  return (
    <section className={`lp-bagian${baru ? ' lp-baru' : ''}`}>
      <header className="lp-bagian-kepala">
        <span className="lp-no">{no}</span>
        <h2>{judul}</h2>
        {acuan && <span className="lp-acuan">{acuan}</span>}
      </header>
      {pesan && <p className="lp-pesan">{pesan}</p>}
      {children}
    </section>
  )
}

export default async function CetakKesiapan() {
  const [dokumen, klausul, temuan, isu, kegiatan, kinerja, { sasaran, aksi }, saya, { seu, tinjauan }, { aset }, register, param, simulasi] = await Promise.all([
    ambilDokumen(), ambilKlausul(), ambilTemuan(), ambilIsu(), ambilKegiatan(), ambilKinerja(), ambilSasaran(), penggunaSaya(),
    ambilSeu(), ambilAsetMeter(), ambilDeviasi(), ambilParameter(), ambilRiwayatSimulasi(),
  ])
  const kini = hariIni()
  const L = susunLaporan({ dokumen, klausul, temuan, isu, kegiatan, hasil: kinerja.hasil, sasaran, aksi, kini })
  const kv = susunKonversi(param)
  const lulusGerbang = L.gerbang.filter((g) => g.hasil === 'lulus').length
  // Potret harian untuk pembanding; potret sebelumnya = hari terakhir sebelum hari ini
  const sebelum = await catatPotret({ tanggal: kini, skor: L.skor, kemajuan: kemajuan(dokumen), n_siap: L.nSiap, n_bukti: L.nBukti, jumlah: L.jumlah, gerbang_lulus: lulusGerbang, gerbang_total: L.gerbang.length }).catch(() => null)
  const selisihSkor = sebelum ? L.skor - sebelum.skor : null

  // Tinjauan energi, SEU, deviasi (lingkup KINRA)
  const pakai = penggunaEnergi({ aset, meter: kinerja.meter, bacaan: kinerja.bacaan, sumber: kinerja.sumber, energi: kinerja.energi, seu, ambangPersen: tinjauan?.ambang_persen ?? 10, ambangKumulatif: tinjauan?.ambang_kumulatif ?? 80 })
  const nilaiP = (id: string, kwh: number) => nilaiEnergi(kv, id === 'sumber:dexlite' ? kwh / 10 : kwh, id === 'sumber:dexlite' ? 'liter' : 'kWh')
  const biayaKinra = pakai.daftar.reduce((t, p) => { const n = nilaiP(p.id, p.kwh); return { rupiah: t.rupiah + n.rupiah, kgCo2: t.kgCo2 + n.kgCo2 } }, { rupiah: 0, kgCo2: 0 })
  const porsiSeu = (kode: string) => pakai.daftar.filter((p) => p.seu?.kode === kode).reduce((t, p) => t + p.porsi, 0)
  const seuAktif = seu.filter((x) => x.status !== 'Dicabut')
  const seuTetap = seu.filter((x) => x.status === 'Ditetapkan')
  const dev = gabungDeviasi(deteksiDeviasi(kinerja.hasil), register).baris
  const devBuka = dev.filter((x) => deviasiTerbuka(x.r))
  // Simulasi audit: hasil terakhir per unit
  const simTerakhir = [...new Map([...simulasi].reverse().map((x) => [x.unit_no, x])).values()].sort((a, b) => a.unit_no - b.unit_no)
  const nomor = `KINRA/SMEn/LKA/${kini.replaceAll('-', '')}`
  const dicetak = waktu(new Date().toISOString())
  const hariS1 = selisihHari(L.stage1.tanggal, new Date(`${kini}T00:00:00`))
  const judulKlausul = Object.fromEntries(klausul.map((k) => [k.kode, k.judul]))
  const ragPutusan = RAG_PUTUSAN[L.putusan.kode]
  const lulus = L.gerbang.filter((g) => g.hasil === 'lulus').length

  return (
    <section className="cetak">
      <div className="toolbar tanpa-cetak">
        <Link href="/kesiapan" className="btn kecil"><ArrowLeft aria-hidden="true" /> Kembali ke Kesiapan Audit</Link>
        <span className="muted small">Lembar A4 tegak. Di dialog cetak pilih “Simpan sebagai PDF”, aktifkan “Grafik latar belakang”, dan matikan “Header dan footer”.</span>
        <span style={{ flex: 1 }} />
        <TombolCetak />
      </div>

      <article className="lp" data-nomor={nomor}>
        {/* ── Sampul ─────────────────────────────────────────────── */}
        <div className="lp-sampul">
          <div className="lp-sampul-atas">
            <span className="lp-logo"><Image src="/logo-kinra.png" alt="KINRA Sei Mangkei" width={900} height={325} priority /></span>
            <span className="lp-klasifikasi">Terbatas · Internal</span>
          </div>
          <div className="lp-sampul-judul">
            <span className="lp-eyebrow">ISO 50001:2018 · Sistem Manajemen Energi</span>
            <h1>Laporan Penilaian Kesiapan Audit Sertifikasi</h1>
            <p>{ORG} · Kawasan Ekonomi Khusus Sei Mangkei</p>
          </div>
          <div className={`lp-sampul-putusan ${ragPutusan}`}>
            <Cincin p={L.skor} rag={L.ragSkor} />
            <div>
              <span className="lp-eyebrow">Opini kesiapan</span>
              <b>{L.putusan.label}</b>
              <p>{L.putusan.ringkas}</p>
            </div>
          </div>
          <dl className="lp-kontrol">
            <div><dt>Nomor laporan</dt><dd className="mono">{nomor}</dd></div>
            <div><dt>Revisi</dt><dd>00</dd></div>
            <div><dt>Tanggal posisi data</dt><dd>{tanggal(kini, 'panjang')}</dd></div>
            <div><dt>Audit yang dituju</dt><dd>{L.stage1.nama} ({tanggal(L.stage1.tanggal, 'panjang')}) dan {L.stage2.nama} ({tanggal(L.stage2.tanggal, 'panjang')})</dd></div>
            <div><dt>Ruang lingkup penilaian</dt><dd>{L.jumlah} dokumen dan rekaman pada klausul 4–10, {L.temuan.total} temuan audit, {L.enpi.aktif.length} EnPI, {sasaran.length} sasaran energi</dd></div>
            <div><dt>Dibangkitkan oleh</dt><dd>{saya?.nama ?? '–'} · {dicetak} WIB</dd></div>
          </dl>
          <table className="lp-tbl lp-pengesahan">
            <thead><tr><th scope="col">Peran</th><th scope="col">Nama</th><th scope="col">Jabatan</th><th scope="col">Tanda tangan</th><th scope="col">Tanggal</th></tr></thead>
            <tbody>
              {['Disusun', 'Ditinjau', 'Disetujui'].map((p) => <tr key={p}><th scope="row">{p}</th><td /><td /><td /><td /></tr>)}
            </tbody>
          </table>
          <p className="lp-distribusi"><b>Distribusi:</b> Direksi · Wakil Manajemen / Steering Committee · Manajer Energi · Tim Energi KINRA · Konsultan pendamping</p>
        </div>

        {/* ── 1. Ringkasan eksekutif ─────────────────────────────── */}
        <Bagian no="1" judul="Ringkasan eksekutif" baru
          pesan={L.nBukti - L.nSiap > L.jumlah - L.nBukti
            ? `Hambatan utama bukan ketersediaan dokumen, melainkan pengesahan: ${L.nBukti - L.nSiap} dokumen sudah ada berkasnya tetapi belum Final/sah.`
            : `Hambatan utama adalah ketersediaan evidence: ${L.jumlah - L.nBukti} dokumen belum memiliki berkas.`}>
          <p className="lp-lead">
            Per {tanggal(kini, 'panjang')}, skor siap audit sistem manajemen energi KINRA adalah <b>{persen(L.skor)}</b>{' '}
            ({LABEL_RAG[L.ragSkor].toLowerCase()}): {L.nSiap} dari {L.jumlah} dokumen berstatus Final dengan berkas versi sah.
            {L.nBukti > L.nSiap && <> Sebanyak {L.nBukti - L.nSiap} dokumen lain sudah memiliki berkas tetapi belum disahkan.</>}{' '}
            {lulus} dari {L.gerbang.length} gerbang kesiapan terpenuhi.{' '}
            {hariS1 > 0 ? <>{L.stage1.nama} dijadwalkan {hariS1} hari lagi.</> : hariS1 === 0 ? <>{L.stage1.nama} berlangsung hari ini.</> : <>{L.stage1.nama} telah lewat {-hariS1} hari.</>}{' '}
            Opini kesiapan: <b>{L.putusan.label.toLowerCase()}</b>.
            {sebelum && selisihSkor !== null && <> Sejak potret {tanggal(sebelum.tanggal)}, skor siap audit {Math.abs(selisihSkor) < 0.05 ? 'tidak berubah' : `${selisihSkor > 0 ? 'naik' : 'turun'} ${angka(Math.abs(selisihSkor), 1)} poin`} ({sebelum.n_siap} → {L.nSiap} dokumen siap).</>}
          </p>

          <div className="lp-kpi">
            <div><span>Skor siap audit</span><b>{persen(L.skor)}</b><small>Final + berkas sah · target ≥ {AMBANG_RAG.hijau}%</small></div>
            <div><span>Belum disahkan</span><b className={L.nBukti - L.nSiap ? 'buruk' : undefined}>{L.nBukti - L.nSiap}</b><small>ada berkas, belum final/sah</small></div>
            <div><span>Tanpa evidence</span><b className={L.jumlah - L.nBukti ? 'buruk' : undefined}>{L.jumlah - L.nBukti}</b><small>dokumen perlu dilengkapi</small></div>
            <div><span>Lewat tenggat</span><b className={L.nLewat ? 'buruk' : undefined}>{L.nLewat}</b><small>dokumen tanpa evidence</small></div>
            <div><span>NC mayor terbuka</span><b className={L.temuan.mayorTerbuka.length ? 'buruk' : undefined}>{L.temuan.mayorTerbuka.length}</b><small>{L.temuan.minorTerbuka.length} minor terbuka</small></div>
            <div><span>EnPI lingkup KINRA valid</span><b>{L.enpi.valid.length}<em>/{L.enpi.aktif.length}</em></b><small>berdata, tanpa ekstrapolasi</small></div>
          </div>

          <h3 className="lp-h3">Peta kesiapan per klausul</h3>
          <div className="lp-peta" role="img" aria-label={`Kesiapan per klausul: ${L.perKlausul.filter((k) => k.jumlah).map((k) => `${k.kode} ${Math.round(k.skor)}%`).join(', ')}`}>
            {L.perKlausul.map((k) => (
              <div key={k.kode} className={`lp-peta-sel ${k.rag ?? 'kosong'}`}>
                <b>{k.kode}{k.kritis && '★'}</b>
                <span className="lp-peta-bar">{k.jumlah > 0 && <><i className="siap" style={{ width: `${(k.siap / k.jumlah) * 100}%` }} /><i className="proses" style={{ width: `${((k.bukti - k.siap) / k.jumlah) * 100}%` }} /></>}</span>
                <small>{k.jumlah ? `${k.siap}/${k.jumlah}` : '–'}</small>
              </div>
            ))}
          </div>
          <p className="lp-catatan">Hijau: siap audit · kuning: ada berkas belum final/sah · kosong: belum ada evidence. ★ informasi terdokumentasi wajib. Warna sel mengikuti penilaian klausul.</p>

          <div className="lp-dua">
            <div>
              <h3 className="lp-h3">Sebaran kesiapan dokumen</h3>
              <div className="lp-tumpuk" role="img" aria-label={L.sebaranBukti.map((x) => `${x.label} ${x.n}`).join(', ')}>
                {L.sebaranBukti.filter((x) => x.n).map((x) => <i key={x.s} className={`st-${x.s}`} style={{ flexGrow: x.n }} />)}
              </div>
              <ul className="lp-legenda">
                {L.sebaranBukti.map((x) => <li key={x.s}><i className={`st-${x.s}`} />{x.label}<b>{x.n}</b></li>)}
              </ul>
              <h3 className="lp-h3">Kesiapan per bab standar</h3>
              <table className="lp-mini">
                <tbody>
                  {L.perInduk.map((b) => (
                    <tr key={b.kode}>
                      <th scope="row">{b.kode}. {b.nama}</th>
                      <td><Batang p={b.skor} rag={b.jumlah ? (b.skor >= AMBANG_RAG.hijau ? 'hijau' : b.skor >= AMBANG_RAG.kuning ? 'kuning' : 'merah') : null} /></td>
                      <td className="angka">{b.jumlah ? persen(b.skor, 0) : '–'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div>
              <h3 className="lp-h3">Hal yang memerlukan perhatian manajemen</h3>
              <ol className="lp-poin">
                {L.temuan.mayorTerbuka.length > 0 && <li><b>{L.temuan.mayorTerbuka.length} ketidaksesuaian mayor terbuka.</b> Satu mayor terbuka saat Stage 2 menahan rekomendasi sertifikasi.</li>}
                {L.gerbang.filter((g) => g.hasil === 'gagal').slice(0, 3).map((g) => <li key={g.kriteria}><b>{g.kriteria} ({g.acuan}) belum memadai.</b> {g.bukti}.</li>)}
                {L.nBukti > L.nSiap && <li><b>{L.nBukti - L.nSiap} dokumen sudah ada berkas tetapi belum disahkan.</b> Draf atau dokumen tanpa versi sah belum dihitung siap: auditor memeriksa informasi terdokumentasi yang terkendali (Kl. 7.5).</li>}
                {L.nBukti < L.jumlah && <li><b>{L.jumlah - L.nBukti} dokumen tanpa evidence.</b> Dokumen tanpa berkas bernilai nol dalam skor karena auditor menilai bukti, bukan klaim.</li>}
                {L.nLewat > 0 && <li><b>{L.nLewat} dokumen lewat tenggat.</b> Beban terbesar pada {L.bebanPic.filter((b) => b.lewat).slice(0, 3).map((b) => b.pic).join(', ') || '–'}.</li>}
                {L.terlemah.length > 0 && <li><b>Klausul terlemah:</b> {L.terlemah.map((k) => `${k.kode} (${Math.round(k.skor)}%)`).join(', ')}.</li>}
                {L.tanpaDokumen.length > 0 && <li><b>{L.tanpaDokumen.length} klausul belum dipetakan ke dokumen:</b> {L.tanpaDokumen.map((k) => k.kode).join(', ')}.</li>}
              </ol>
            </div>
          </div>
        </Bagian>

        {/* ── 2. Gerbang kesiapan ────────────────────────────────── */}
        <Bagian no="2" judul="Gerbang kesiapan audit" acuan="Informasi terdokumentasi wajib ISO 50001:2018"
          pesan={`${lulusGerbang} dari ${L.gerbang.length} gerbang lulus; ${L.gerbang.filter((g) => g.hasil === 'gagal').length} gerbang belum lulus berpotensi menjadi temuan mayor pada ${L.stage1.nama}.`}>
          <p className="lp-p">Gerbang adalah syarat minimum yang lazim diperiksa lembaga sertifikasi pada Stage 1. Satu gerbang berstatus “Belum” berpotensi menjadi temuan mayor atau menunda Stage 2.</p>
          <table className="lp-tbl">
            <thead><tr><th scope="col" style={{ width: '4%' }}>#</th><th scope="col">Kriteria</th><th scope="col" style={{ width: '16%' }}>Acuan</th><th scope="col" style={{ width: '36%' }}>Bukti penilaian</th><th scope="col" style={{ width: '12%' }}>Hasil</th></tr></thead>
            <tbody>
              {L.gerbang.map((g, i) => (
                <tr key={g.kriteria}>
                  <td className="angka">{i + 1}</td><td>{g.kriteria}</td><td>{g.acuan}</td><td className="kecil">{g.bukti}</td>
                  <td><Tanda rag={HASIL_GERBANG[g.hasil].rag}>{HASIL_GERBANG[g.hasil].label}</Tanda></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Bagian>

        {/* ── 3. Kesiapan per klausul ────────────────────────────── */}
        <Bagian no="3" judul="Kesiapan per klausul" acuan="Klausul 4–10" baru
          pesan={L.terlemah.length ? `Klausul terlemah ${L.terlemah.map((k) => `${k.kode} (${Math.round(k.skor)}%)`).join(', ')}: prioritaskan pengesahan dokumen pada klausul ini.` : undefined}>
          <table className="lp-tbl">
            <thead>
              <tr>
                <th scope="col" style={{ width: '7%' }}>Klausul</th><th scope="col">Persyaratan</th>
                <th scope="col" className="angka" style={{ width: '7%' }}>Dok.</th>
                <th scope="col" className="angka" style={{ width: '9%' }}>Siap / ber-evidence</th><th scope="col" className="angka" style={{ width: '7%' }}>Lewat</th>
                <th scope="col" style={{ width: '20%' }}>Skor</th><th scope="col" style={{ width: '13%' }}>Penilaian</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(INDUK_KLAUSUL).filter(([k]) => k !== 'P').map(([induk, nama]) => (
                <Baris key={induk} induk={induk} nama={nama} rows={L.perKlausul.filter((k) => k.kode.split('.')[0] === induk)} />
              ))}
            </tbody>
          </table>
          <p className="lp-catatan">★ Klausul dengan informasi terdokumentasi wajib (gerbang Stage 1). Garis tegak pada batang menandai ambang memadai {AMBANG_RAG.hijau}%.</p>
        </Bagian>

        {/* ── 4. Register kesenjangan ────────────────────────────── */}
        <Bagian no="4" judul="Register kesenjangan" acuan={`${L.gap.length} butir`} baru
          pesan={`${L.gap.filter((g) => g.tingkat === 'Kritis').length} kesenjangan kritis dan ${L.gap.filter((g) => g.tingkat === 'Tinggi').length} tinggi harus ditutup sebelum ${L.stage1.nama} (${tanggal(L.stage1.tanggal)}).`}>
          <p className="lp-p">
            Semua dokumen yang belum siap audit: tanpa evidence, evidence masih draf, atau Final tanpa berkas versi sah. Diurutkan menurut tingkat kesenjangan lalu tenggat.{' '}
            <b>Kritis</b>: dokumen wajib ISO 50001 tanpa evidence. <b>Tinggi</b>: dokumen wajib yang belum disahkan, atau lewat tenggat. <b>Sedang</b>: lainnya.
          </p>
          {L.gap.length === 0 ? <p className="lp-p"><b>Tidak ada kesenjangan.</b> Semua dokumen berstatus Final dengan berkas versi sah.</p> : (
            <table className="lp-tbl">
              <thead><tr><th scope="col" style={{ width: '10%' }}>Tingkat</th><th scope="col" style={{ width: '9%' }}>Kode</th><th scope="col">Dokumen</th><th scope="col" style={{ width: '7%' }}>Kl.</th><th scope="col" style={{ width: '13%' }}>PIC</th><th scope="col" style={{ width: '11%' }}>Tenggat</th><th scope="col" style={{ width: '20%' }}>Kesenjangan</th></tr></thead>
              <tbody>
                {L.gap.map(({ d, tingkat, alasan }) => (
                  <tr key={d.id}>
                    <td><Tanda rag={RAG_TINGKAT[tingkat]}>{tingkat}</Tanda></td>
                    <td className="mono kecil">{d.kode}</td><td>{d.nama}</td><td>{d.klausul_kode}</td><td className="kecil">{d.pic ?? '–'}</td>
                    <td className={`kecil${terlambat(d, kini) ? ' buruk' : ''}`}>{tanggal(d.tenggat)}</td><td className="kecil">{alasan.join(' · ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {L.bebanPic.length > 0 && <>
            <h3 className="lp-h3">Beban penyelesaian per PIC</h3>
            <table className="lp-tbl">
              <thead><tr><th scope="col">PIC</th><th scope="col" className="angka">Total dokumen</th><th scope="col" className="angka">Belum siap</th><th scope="col" className="angka">Tanpa evidence</th><th scope="col" className="angka">Lewat tenggat</th></tr></thead>
              <tbody>{L.bebanPic.map((b) => <tr key={b.pic}><td>{b.pic}</td><td className="angka">{b.total}</td><td className="angka">{b.belumSiap}</td><td className="angka">{b.tanpaBukti}</td><td className={`angka${b.lewat ? ' buruk' : ''}`}>{b.lewat}</td></tr>)}</tbody>
            </table>
          </>}
        </Bagian>

        {/* ── 5. Temuan audit ────────────────────────────────────── */}
        <Bagian no="5" judul="Temuan audit dan kesiapan auditee" acuan="Kl. 7.3 · 9.2 · 10.1" baru
          pesan={L.temuan.mayorTerbuka.length ? `${L.temuan.mayorTerbuka.length} ketidaksesuaian mayor terbuka menahan rekomendasi sertifikasi.` : simTerakhir.length ? `Tidak ada mayor terbuka; ${simTerakhir.filter((x) => x.skor / x.skor_maks < 0.67).length} dari ${simTerakhir.length} unit yang berlatih masih di bawah 67% pada simulasi audit.` : 'Tidak ada ketidaksesuaian mayor terbuka. Belum ada unit yang menjalani simulasi audit.'}>
          <div className="lp-dua">
            <table className="lp-tbl">
              <thead><tr><th scope="col">Kategori</th><th scope="col" className="angka">Terbuka</th><th scope="col" className="angka">Proses</th><th scope="col" className="angka">Verifikasi</th><th scope="col" className="angka">Tertutup</th></tr></thead>
              <tbody>{L.temuan.matriks.map((r) => <tr key={r.kat}><th scope="row">{r.kat}</th><td className="angka">{r.Terbuka}</td><td className="angka">{r.Proses}</td><td className="angka">{r.Verifikasi}</td><td className="angka">{r.Tertutup}</td></tr>)}</tbody>
            </table>
            <p className="lp-p">
              {L.temuan.total} temuan tercatat, {L.temuan.terbuka.length} belum tertutup{L.temuan.temuanLewat.length ? `, ${L.temuan.temuanLewat.length} di antaranya lewat tenggat koreksi` : ''}.
              Lembaga sertifikasi mensyaratkan seluruh ketidaksesuaian mayor tertutup dan diverifikasi efektif sebelum rekomendasi sertifikat; ketidaksesuaian minor cukup dengan rencana koreksi yang diterima.
            </p>
          </div>
          {L.temuan.terbuka.length > 0 && (
            <table className="lp-tbl">
              <thead><tr><th scope="col" style={{ width: '10%' }}>Nomor</th><th scope="col" style={{ width: '10%' }}>Kategori</th><th scope="col" style={{ width: '7%' }}>Kl.</th><th scope="col">Uraian</th><th scope="col" style={{ width: '13%' }}>PIC</th><th scope="col" style={{ width: '11%' }}>Tenggat</th><th scope="col" style={{ width: '10%' }}>Status</th></tr></thead>
              <tbody>
                {L.temuan.terbuka.map((t) => (
                  <tr key={t.id}>
                    <td className="mono kecil">{t.nomor}</td>
                    <td><Tanda rag={t.kategori === 'Mayor' ? 'merah' : t.kategori === 'Minor' ? 'kuning' : 'netral'}>{t.kategori}</Tanda></td>
                    <td>{t.klausul_kode ?? '–'}</td><td className="kecil">{t.uraian}</td><td className="kecil">{t.pic ?? '–'}</td>
                    <td className={`kecil${t.tenggat && t.tenggat < kini ? ' buruk' : ''}`}>{tanggal(t.tenggat)}</td><td className="kecil">{t.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <h3 className="lp-h3">Kesiapan auditee: hasil simulasi audit terakhir per unit</h3>
          {simTerakhir.length === 0 ? <p className="lp-p kecil">Belum ada simulasi audit tersimpan. Disarankan setiap unit auditee berlatih minimal satu kali sebelum {L.stage1.nama}.</p> : (
            <table className="lp-tbl">
              <thead><tr><th scope="col">Unit</th><th scope="col" style={{ width: '14%' }}>Tahap</th><th scope="col" style={{ width: '14%' }}>Tanggal</th><th scope="col" className="angka" style={{ width: '10%' }}>Skor</th><th scope="col" style={{ width: '30%' }}>Prediksi temuan</th></tr></thead>
              <tbody>
                {simTerakhir.map((x) => {
                  const pr = Math.round((x.skor / x.skor_maks) * 100)
                  return (
                    <tr key={x.id}>
                      <td>{x.unit_nama}</td><td className="kecil">{x.mode === 'stage1' ? 'Stage 1' : 'Stage 2'}</td><td className="kecil">{tanggal(x.dibuat_at)}</td>
                      <td className={`angka${pr < 40 ? ' buruk' : ''}`}>{pr}%</td>
                      <td className="kecil">{x.prediksi.length ? x.prediksi.map((p) => `${p.kategori} ${p.klausul}`).join(', ') : 'Tidak ada'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          <p className="lp-p kecil">{simTerakhir.length} dari 13 unit auditee sudah berlatih. Prediksi temuan simulasi adalah alat latihan, bukan keputusan auditor.</p>
        </Bagian>

        {/* ── 6. Kinerja energi ──────────────────────────────────── */}
        <Bagian no="6" judul="Tinjauan energi, SEU, kinerja energi, dan sasaran" acuan="Kl. 6.2 · 6.3 · 6.4 · 6.5 · 9.1" baru
          pesan={`${pakai.daftar.slice(0, 2).map((p) => p.nama).join(' dan ')} menyerap ${persen(pakai.daftar.slice(0, 2).reduce((t, p) => t + p.porsi, 0), 0)} energi KINRA; ${seuTetap.length ? `${seuTetap.length} SEU sudah ditetapkan` : 'SEU belum ditetapkan resmi'}, ${L.enpi.valid.length} dari ${L.enpi.aktif.length} EnPI lingkup KINRA valid${devBuka.length ? `, dan ${devBuka.length} deviasi signifikan belum ditutup` : ''}.`}>
          <h3 className="lp-h3">Tinjauan energi dan SEU (lingkup KINRA, tanpa tenant)</h3>
          <p className="lp-p">
            Energi KINRA ±{angka(pakai.total / 1000, 0)} MWh setara per bulan (±{rupiahRingkas(biayaKinra.rupiah)} dan {tonCo2(biayaKinra.kgCo2)} per bulan);
            {' '}{persen(pakai.porsiMeter, 0)} terukur meter, sisanya perkiraan inventaris. {pakai.tanpaData.length} dari {aset.length} aset belum memiliki data energi.
            {kv.asumsi.length > 0 && <> Rupiah dan CO₂ memakai parameter yang sebagian masih asumsi ({kv.asumsi.join(', ')}).</>}
          </p>
          <table className="lp-tbl">
            <thead><tr><th scope="col">Pengguna energi</th><th scope="col" className="angka" style={{ width: '12%' }}>Porsi</th><th scope="col" className="angka" style={{ width: '16%' }}>Biaya/bulan</th><th scope="col" style={{ width: '16%' }}>Dasar data</th><th scope="col" style={{ width: '18%' }}>Status SEU</th></tr></thead>
            <tbody>
              {pakai.daftar.slice(0, 6).map((p) => (
                <tr key={p.id}>
                  <td>{p.nama}</td><td className="angka">{persen(p.porsi)}</td><td className="angka">{rupiahRingkas(nilaiP(p.id, p.kwh).rupiah)}</td>
                  <td className="kecil">{p.dasar === 'meter' ? 'Bacaan meter' : p.dasar === 'inventaris' ? 'Perkiraan inventaris' : 'Data BBM'}</td>
                  <td>{p.seu ? <Tanda rag={p.seu.status === 'Ditetapkan' ? 'hijau' : 'kuning'}>{p.seu.kode} · {p.seu.status}</Tanda> : p.kandidat ? <Tanda rag="merah">Kandidat, belum di register</Tanda> : <span className="kecil">–</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {seuAktif.length > 0 && (
            <p className="lp-p kecil">
              Register SEU: {seuAktif.map((x) => `${x.kode} ${x.nama} (${persen(porsiSeu(x.kode), 0)}, ${x.status}${x.enpi_kode ? `, ${x.enpi_kode}` : ', tanpa EnPI'}${x.personel ? '' : ', personel belum dicatat'})`).join('; ')}.
              {' '}Tinjauan energi {tinjauan ? (tinjauan.status === 'Disetujui' ? `disetujui ${tinjauan.disetujui_oleh ?? ''}` : 'masih draft') : 'belum dicatat'}.
            </p>
          )}
          <h3 className="lp-h3">Deviasi signifikan kinerja energi (Kl. 9.1)</h3>
          <p className="lp-p">
            {dev.length
              ? <>{dev.length} deviasi terdeteksi pada EnPI lingkup KINRA; <b>{devBuka.length} belum ditutup</b>{devBuka.filter((x) => !x.r).length ? `, ${devBuka.filter((x) => !x.r).length} di antaranya belum diselidiki` : ''}. Contoh: {devBuka.slice(0, 3).map((x) => `${x.d.enpi_kode} ${x.d.label} (${x.d.selisih_persen !== null ? `${x.d.selisih_persen > 0 ? '+' : ''}${angka(x.d.selisih_persen, 0)}%` : 'data hilang'})`).join(', ')}.</>
              : 'Tidak ada deviasi signifikan terdeteksi pada EnPI lingkup KINRA.'}
          </p>
          <h3 className="lp-h3">EnPI dan sasaran</h3>
          <p className="lp-p">Penilaian hanya atas EnPI lingkup KINRA (aset dan fasilitas dalam kendali KINRA). Data listrik PLN kawasan mencakup tenant sehingga EnPI kawasan tidak dipakai untuk mengklaim peningkatan kinerja SMEn.</p>
          {L.enpi.aktif.length === 0 ? <p className="lp-p">Belum ada EnPI lingkup KINRA aktif. Ini kesenjangan material: ISO 50001 mensyaratkan EnPI dan EnB untuk menunjukkan peningkatan kinerja energi.</p> : (
            <table className="lp-tbl">
              <thead><tr><th scope="col" style={{ width: '9%' }}>Kode</th><th scope="col">EnPI</th><th scope="col" style={{ width: '18%' }}>Metode</th><th scope="col" style={{ width: '16%' }}>Baseline</th><th scope="col" className="angka" style={{ width: '7%' }}>R²</th><th scope="col" className="angka" style={{ width: '10%' }}>CV(RMSE)</th><th scope="col" style={{ width: '12%' }}>Validitas</th></tr></thead>
              <tbody>
                {L.enpi.aktif.map((h) => {
                  const st = L.enpi.status(h)
                  return (
                    <tr key={h.enpi.kode}>
                      <td className="mono kecil">{h.enpi.kode}</td><td>{h.enpi.nama}{h.galat && <div className="kecil buruk">{h.galat}</div>}</td>
                      <td className="kecil">{LABEL_METODE[h.enpi.metode]}</td><td className="kecil">{tanggal(h.enpi.baseline_mulai)} – {tanggal(h.enpi.baseline_selesai)}</td>
                      <td className="angka">{h.model?.r2 == null ? '–' : angka(h.model.r2, 2)}</td><td className="angka">{h.model?.cvrmse == null ? '–' : persen(h.model.cvrmse)}</td>
                      <td><Tanda rag={st.ok ? 'hijau' : 'merah'}>{st.ok ? 'Valid' : 'Belum valid'}</Tanda><div className="kecil">{st.ket}</div></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
          {L.enpi.kawasan.length > 0 && (
            <p className="lp-p kecil">Konteks kawasan (tidak dinilai): {L.enpi.kawasan.map((h) => `${h.enpi.kode} ${h.enpi.nama}${h.ekstrapolasi ? ' (ekstrapolasi)' : ''}`).join('; ')}.</p>
          )}
          {sasaran.length > 0 && (
            <table className="lp-tbl">
              <thead><tr><th scope="col" style={{ width: '9%' }}>Kode</th><th scope="col">Sasaran energi</th><th scope="col" className="angka" style={{ width: '9%' }}>Target</th><th scope="col" style={{ width: '8%' }}>Tahun</th><th scope="col" style={{ width: '13%' }}>PIC</th><th scope="col" className="angka" style={{ width: '11%' }}>Aksi selesai</th><th scope="col" style={{ width: '12%' }}>Status</th></tr></thead>
              <tbody>
                {sasaran.map((s) => {
                  const a = aksi.filter((x) => x.sasaran_id === s.id)
                  return (
                    <tr key={s.id}>
                      <td className="mono kecil">{s.kode}</td><td>{s.uraian}</td><td className="angka">{s.target_persen == null ? '–' : persen(s.target_persen)}</td>
                      <td>{s.tahun_target ?? '–'}</td><td className="kecil">{s.pic ?? '–'}</td>
                      <td className={`angka${a.length ? '' : ' buruk'}`}>{a.length ? `${a.filter((x) => x.status === 'Selesai').length}/${a.length}` : 'Tanpa aksi'}</td><td className="kecil">{s.status}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Bagian>

        {/* ── 7. Risiko & jadwal ─────────────────────────────────── */}
        <Bagian no="7" judul="Risiko utama dan jadwal sertifikasi" acuan="Kl. 6.1" baru
          pesan={`${L.stage1.nama} ${hariS1 > 0 ? `${hariS1} hari lagi` : hariS1 === 0 ? 'hari ini' : 'telah lewat'}; ${L.risikoUtama.filter((r) => r.skor >= 15).length ? `${L.risikoUtama.filter((r) => r.skor >= 15).length} risiko tinggi perlu dipantau` : 'tidak ada risiko berskor tinggi di register, pastikan penilaian risiko mutakhir'}.`}>
          <div className="lp-dua">
            <div>
              <h3 className="lp-h3">Lima risiko SMEn tertinggi</h3>
              {L.risikoUtama.length === 0 ? <p className="lp-p">Register risiko belum terisi.</p> : (
                <table className="lp-tbl">
                  <thead><tr><th scope="col">Risiko</th><th scope="col" className="angka">Skor</th><th scope="col">PIC</th></tr></thead>
                  <tbody>{L.risikoUtama.map((r) => <tr key={r.id}><td className="kecil">{r.uraian}</td><td className={`angka${r.skor >= 15 ? ' buruk' : ''}`}>{r.skor}</td><td className="kecil">{r.pic ?? '–'}</td></tr>)}</tbody>
                </table>
              )}
            </div>
            <div>
              <h3 className="lp-h3">Tonggak menuju sertifikasi</h3>
              <ol className="lp-garis">
                {L.tonggak.map((t) => {
                  const h = selisihHari(t.tanggal, new Date(`${kini}T00:00:00`))
                  return (
                    <li key={t.kode} className={h < 0 ? 'lewat' : undefined}>
                      <b>{t.nama}</b><span>{tanggal(t.tanggal, 'panjang')}</span>
                      <small>{h === 0 ? 'Hari ini' : h > 0 ? `${h} hari lagi` : `${-h} hari lalu`}</small>
                    </li>
                  )
                })}
              </ol>
              <p className="lp-p kecil">Program pendampingan: {L.program.selesai} dari {L.program.total} kegiatan selesai{L.program.konfirmasi ? `, ${L.program.konfirmasi} perlu konfirmasi` : ''}.</p>
            </div>
          </div>
        </Bagian>

        {/* ── 8. Rekomendasi ─────────────────────────────────────── */}
        <Bagian no="8" judul="Rekomendasi dan rencana tindak"
          pesan={`${L.rekomendasi.filter((r) => r.prioritas === 'P1').length} tindakan P1 harus selesai paling lambat ${tanggal(L.rekomendasi.find((r) => r.prioritas === 'P1')?.batas ?? L.stage1.tanggal)}.`}>
          <p className="lp-p"><b>P1</b> wajib selesai sebelum {L.stage1.nama}; <b>P2</b> menurunkan risiko temuan; <b>P3</b> memperkuat kesiapan wawancara dan bukti penerapan.</p>
          <table className="lp-tbl">
            <thead><tr><th scope="col" style={{ width: '4%' }}>#</th><th scope="col" style={{ width: '7%' }}>Prioritas</th><th scope="col">Tindakan</th><th scope="col" style={{ width: '11%' }}>Acuan</th><th scope="col" style={{ width: '17%' }}>Penanggung jawab</th><th scope="col" style={{ width: '12%' }}>Batas waktu</th></tr></thead>
            <tbody>
              {L.rekomendasi.map((r, i) => (
                <tr key={i}>
                  <td className="angka">{i + 1}</td><td><Tanda rag={r.prioritas === 'P1' ? 'merah' : r.prioritas === 'P2' ? 'kuning' : 'netral'}>{r.prioritas}</Tanda></td>
                  <td className="kecil">{r.tindakan}</td><td className="kecil">{r.acuan}</td><td className="kecil">{r.pemilik}</td><td className="kecil">{tanggal(r.batas)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Bagian>

        {/* ── Lampiran A ─────────────────────────────────────────── */}
        <Bagian no="A" judul="Lampiran A · Register dokumen audit" acuan={`${dokumen.length} dokumen`} baru>
          <table className="lp-tbl lp-rapat">
            <thead><tr><th scope="col" style={{ width: '6%' }}>Kl.</th><th scope="col" style={{ width: '9%' }}>Kode</th><th scope="col">Dokumen</th><th scope="col" style={{ width: '13%' }}>No. dokumen</th><th scope="col" style={{ width: '12%' }}>PIC</th><th scope="col" className="angka" style={{ width: '12%' }}>Evidence</th><th scope="col" style={{ width: '10%' }}>Tenggat</th></tr></thead>
            <tbody>
              {[...dokumen].sort((a, b) => (klausul.find((k) => k.kode === a.klausul_kode)?.urutan ?? 0) - (klausul.find((k) => k.kode === b.klausul_kode)?.urutan ?? 0) || a.kode.localeCompare(b.kode)).map((d) => (
                <tr key={d.id}>
                  <td title={judulKlausul[d.klausul_kode]}>{d.klausul_kode}</td><td className="mono">{d.kode}{d.wajib_iso && <span className="lp-bintang" title="Informasi terdokumentasi wajib ISO 50001"> ★</span>}</td><td>{d.nama}</td>
                  <td className="mono">{d.nomor_dokumen ?? '–'}</td><td>{d.pic ?? '–'}</td>
                  <td className={`angka${siapAudit(d) ? '' : ' buruk'}`}>{adaBukti(d) ? `${d.jumlah_berkas} berkas${(d.jumlah_sah ?? 0) ? ` · ${d.jumlah_sah} sah` : ''}` : 'Tidak ada'}{adaBukti(d) && !siapAudit(d) && <div className="kecil">{grupStatus(d.status) === 'final' ? 'tanpa berkas sah' : 'belum Final'}</div>}</td>
                  <td className={terlambat(d, kini) ? 'buruk' : undefined}>{tanggal(d.tenggat)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="lp-catatan">★ Informasi terdokumentasi yang disyaratkan langsung oleh ISO 50001:2018.</p>
        </Bagian>

        {/* ── Lampiran B ─────────────────────────────────────────── */}
        <Bagian no="B" judul="Lampiran B · Metodologi, definisi, dan batasan" baru>
          <h3 className="lp-h3">Metode penilaian</h3>
          <p className="lp-p">
            Skor kesiapan (siap audit) adalah persentase dokumen dan rekaman yang akan diperiksa auditor yang berstatus <b>Final</b>
            dan memiliki minimal satu berkas bertanda <b>versi sah</b> (dokumen yang disahkan/ditandatangani, atau rekaman yang lengkap).
            Dokumen yang baru berupa draf atau belum memiliki berkas versi sah bernilai 0, karena auditor memeriksa informasi terdokumentasi yang terkendali (Kl. 7.5).
            Kemajuan evidence (berkas apa pun, termasuk draf) dilaporkan terpisah sebagai indikator proses. Dokumen tanpa evidence bernilai 0,
            karena auditor menilai bukti objektif yang dapat diperiksa.
            Skor klausul dan bab dihitung dengan cara yang sama atas dokumen yang dipetakan ke klausul tersebut.
          </p>
          <table className="lp-tbl">
            <thead><tr><th scope="col" style={{ width: '22%' }}>Penilaian</th><th scope="col">Kriteria</th></tr></thead>
            <tbody>
              <tr><td><Tanda rag="hijau">{LABEL_RAG.hijau}</Tanda></td><td>Skor ≥ {AMBANG_RAG.hijau}%</td></tr>
              <tr><td><Tanda rag="kuning">{LABEL_RAG.kuning}</Tanda></td><td>Skor {AMBANG_RAG.kuning}% sampai &lt; {AMBANG_RAG.hijau}%</td></tr>
              <tr><td><Tanda rag="merah">{LABEL_RAG.merah}</Tanda></td><td>Skor &lt; {AMBANG_RAG.kuning}%</td></tr>
            </tbody>
          </table>
          <table className="lp-tbl">
            <thead><tr><th scope="col" style={{ width: '22%' }}>Opini kesiapan</th><th scope="col">Syarat</th></tr></thead>
            <tbody>
              <tr><td><Tanda rag="hijau">Siap</Tanda></td><td>Skor ≥ {AMBANG_RAG.hijau}%, tidak ada NC mayor terbuka, dan tidak ada gerbang berstatus “Belum”.</td></tr>
              <tr><td><Tanda rag="kuning">Siap bersyarat</Tanda></td><td>Skor ≥ {AMBANG_RAG.kuning}% dan tidak ada NC mayor terbuka; gerbang yang belum lulus wajib ditutup sebelum Stage 1.</td></tr>
              <tr><td><Tanda rag="merah">Belum siap</Tanda></td><td>Selain kondisi di atas.</td></tr>
            </tbody>
          </table>
          <h3 className="lp-h3">Gerbang klausul wajib</h3>
          <p className="lp-p kecil">{Object.entries(KLAUSUL_KRITIS).map(([k, v]) => `${k} ${v}`).join(' · ')}. Gerbang lulus bila skor klausul ≥ {AMBANG_RAG.hijau}%, parsial bila ≥ 50%. Validitas EnPI regresi mengikuti ISO 50006 dan ASHRAE Guideline 14 (R² ≥ {AMBANG.r2}, CV(RMSE) ≤ {AMBANG.cvrmse}%, minimal {AMBANG.nMin} titik data bulanan).</p>
          <h3 className="lp-h3">Batasan</h3>
          <p className="lp-p kecil">
            Laporan ini dibangkitkan otomatis dari data aplikasi SMEn KINRA pada {dicetak} WIB dan mencerminkan kondisi register pada saat itu.
            Penilaian bersifat internal dan tidak menggantikan audit internal, tinjauan manajemen, maupun keputusan lembaga sertifikasi.
            Status Final dan penanda versi sah ditetapkan pengguna aplikasi; kecukupan isi dokumen tidak dinilai otomatis dan diverifikasi melalui audit internal.
            Penilaian EnPI hanya mencakup EnPI lingkup KINRA; EnPI berlingkup kawasan (termasuk listrik tenant) ditampilkan sebagai konteks dan tidak menjadi dasar klaim kinerja.
          </p>
        </Bagian>

        <footer className="lp-akhir">
          <span>{nomor} · Rev. 00</span>
          <span>— Akhir laporan —</span>
          <span>{ORG}</span>
        </footer>
      </article>
    </section>
  )
}

function Baris({ induk, nama, rows }: { induk: string; nama: string; rows: ReturnType<typeof susunLaporan>['perKlausul'] }) {
  return (
    <>
      <tr className="lp-sub"><th colSpan={7} scope="rowgroup">{induk}. {nama}</th></tr>
      {rows.map((k) => (
        <tr key={k.kode}>
          <td>{k.kode}{k.kritis && <span className="lp-bintang" title="Informasi terdokumentasi wajib"> ★</span>}</td>
          <td>{k.judul}</td>
          <td className="angka">{k.jumlah}</td>
          <td className={`angka${k.jumlah && k.siap < k.jumlah ? ' buruk' : ''}`}>{k.jumlah ? `${k.siap} / ${k.bukti}` : '–'}</td>
          <td className={`angka${k.lewat ? ' buruk' : ''}`}>{k.lewat}</td>
          <td><span className="lp-skor"><Batang p={k.skor} rag={k.rag} /><b>{k.jumlah ? `${Math.round(k.skor)}%` : '–'}</b></span></td>
          <td>{k.rag ? <Tanda rag={k.rag}>{LABEL_RAG[k.rag]}</Tanda> : <Tanda rag="merah">Belum dipetakan</Tanda>}</td>
        </tr>
      ))}
    </>
  )
}
