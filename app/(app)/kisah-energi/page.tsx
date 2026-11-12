import Image from 'next/image'
import type { ReactNode } from 'react'
import { TombolCetak } from '@/components/TombolCetak'
import { ambilAsetMeter, ambilDeviasi, ambilDokumen, ambilIsu, ambilKegiatan, ambilKinerja, ambilParameter, ambilPeluang, ambilSasaran, ambilSeu, ambilTemuan } from '@/lib/data'
import { ceritakan, periodeBulan } from '@/lib/dekomposisi'
import { LABEL_METODE } from '@/lib/enpi'
import { angka, BULAN_PANJANG, energiListrik, hariIni, persen, tanggal, waktu } from '@/lib/format'
import { susunKisah, type BatasPr, type Kisah, type Pr } from '@/lib/kisah-energi'
import { rupiahRingkas, susunKonversi } from '@/lib/konversi'
import { AMBANG_RISIKO } from '@/lib/status'

export const dynamic = 'force-dynamic'

export async function generateMetadata() {
  return { title: `Kisah Energi KINRA - ${tanggal(hariIni(), 'panjang')}` }
}

// ── Format kecil ─────────────────────────────────────────────────
const juta = (kwh: number | null | undefined, d = 2) => (kwh === null || kwh === undefined ? '–' : `${angka(kwh / 1e6, d)} juta kWh`)
const ubah = (a: number, b: number) => (a ? ((b - a) / a) * 100 : null)
const tandaPersen = (v: number | null, d = 0) => (v === null ? '–' : `${v >= 0 ? '+' : '−'}${angka(Math.abs(v), d)}%`)
const naikTurun = (v: number | null) => (v === null ? 'berubah' : v >= 0 ? 'naik' : 'turun')
const mwh = (v: number) => `${v >= 0 ? '+' : '−'}${angka(Math.abs(v) / 1000, 1)} MWh`
const rentangBulan = (b: number[]) => (!b.length ? '–' : b.length === 1 ? BULAN_PANJANG[b[0] - 1] : `${BULAN_PANJANG[b[0] - 1]}–${BULAN_PANJANG[b.at(-1)! - 1]}`)
const pendek = (kode: string) => kode.replace('KINRA-', '')

// ── Komponen buku ────────────────────────────────────────────────
const JUDUL_KOTAK = { kira: 'Kata KIRA', auditor: 'Yang biasa ditanya auditor', bukti: 'Bukti yang ditunjukkan', pr: 'Pekerjaan rumah', latihan: 'Latihan dengan KIRA' } as const
function Kotak({ jenis, children }: { jenis: keyof typeof JUDUL_KOTAK; children: ReactNode }) {
  return <aside className={`kb-kotak ${jenis}`}><span className="kb-kotak-judul">{JUDUL_KOTAK[jenis]}</span>{children}</aside>
}

function Tanya({ q, children }: { q: ReactNode; children: ReactNode }) {
  return <div className="kb-tanya"><p><b>Auditor:</b> {q}</p><p><b>Anda:</b> {children}</p></div>
}

function DaftarPr({ items, kosong }: { items: Pr[]; kosong?: string }) {
  if (!items.length) return <Kotak jenis="pr"><p className="kb-beres">{kosong ?? 'Tidak ada pekerjaan rumah yang terdeteksi dari data untuk bab ini.'}</p></Kotak>
  return (
    <Kotak jenis="pr">
      <ul className="kb-cek">{items.map((p) => <li key={p.teks}>{p.prioritas && <b>Prioritas: </b>}{p.teks}</li>)}</ul>
    </Kotak>
  )
}

function Bab({ no, eyebrow, judul, acuan, children }: { no: string; eyebrow: string; judul: string; acuan: string; children: ReactNode }) {
  return (
    <section className="kb-bab">
      <header className="kb-bab-kepala">
        <span className="kb-bab-no">{no}</span>
        <span className="lp-eyebrow">{eyebrow}</span>
        <h2>{judul}</h2>
        <p>{acuan}</p>
      </header>
      {children}
    </section>
  )
}

function Kolom({ data }: { data: { label: string; nilai: number }[] }) {
  const maks = Math.max(...data.map((d) => d.nilai), 1)
  return (
    <div className="kb-kolom" role="img" aria-label={data.map((d) => `${d.label}: ${angka(d.nilai / 1e6, 2)} juta kWh`).join(', ')}>
      {data.map((d, i) => (
        <div key={d.label} className={i === data.length - 1 ? 'kini' : undefined}>
          <b className="tnum">{angka(d.nilai / 1e6, 2)}</b>
          <i style={{ height: `${(d.nilai / maks) * 100}%` }} />
          <span>{d.label}</span>
        </div>
      ))}
    </div>
  )
}

function Pareto({ k }: { k: Kisah }) {
  const maks = Math.max(...k.pareto.map((p) => p.porsi), 1)
  return (
    <div className="kb-hbar">
      {k.pareto.map((p) => (
        <div key={p.kode} className={p.seu ? 'seu' : undefined}>
          <span>{p.nama}{p.seu && <small> ({p.seu})</small>}</span>
          <i style={{ width: `${(p.porsi / maks) * 100}%` }} />
          <b className="tnum">{p.porsi < 0.1 ? '<0,1%' : persen(p.porsi)} · {angka(p.kwh)}</b>
        </div>
      ))}
    </div>
  )
}

function Jembatan({ k }: { k: Kisah }) {
  const d = k.dekKini!
  const delta = d.totalB - d.totalA
  const maks = Math.max(...d.komponen.map((x) => Math.abs(x.nilai)), Math.abs(delta), 1)
  const baris = [...d.komponen.map((x) => ({ label: x.label, nilai: x.nilai, jenis: x.nilai < 0 && x.jenis === 'kinerja' ? 'hemat' : x.jenis })), { label: 'Perubahan total', nilai: delta, jenis: 'total' }]
  return (
    <div className="kb-jembatan">
      {baris.map((b) => (
        <div key={b.label} className={b.jenis}>
          <span>{b.label}</span>
          <span className="kb-jb-sumbu"><i style={{ width: `${(Math.abs(b.nilai) / maks) * 50}%`, left: b.nilai >= 0 ? '50%' : `${50 - (Math.abs(b.nilai) / maks) * 50}%` }} /></span>
          <b className="tnum">{mwh(b.nilai)}</b>
        </div>
      ))}
    </div>
  )
}

const NAMA_BATAS: Record<BatasPr, string> = { s1: 'TÜV Stage 1', tm: 'Tinjauan Manajemen', s2: 'TÜV Stage 2' }

export default async function KisahEnergi() {
  const [{ aset, meter, bacaan }, kinerja, { seu, tinjauan }, { sasaran, aksi }, isu, peluang, temuan, deviasi, dokumen, kegiatan, param] = await Promise.all([
    ambilAsetMeter(), ambilKinerja(), ambilSeu(), ambilSasaran(), ambilIsu(), ambilPeluang(), ambilTemuan(), ambilDeviasi(), ambilDokumen(), ambilKegiatan(), ambilParameter(),
  ])
  const kini = hariIni()
  const kv = susunKonversi(param)
  const k = susunKisah({
    aset, meter, bacaan, sumber: kinerja.sumber, energi: kinerja.energi, dataVariabel: kinerja.dataVariabel, enpi: kinerja.enpi, hasil: kinerja.hasil,
    seu, tinjauan, sasaran, aksi, isu, peluang, temuan, deviasi, dokumen, kegiatan, kv, kini,
  })
  const dicetak = waktu(new Date().toISOString())
  const tp = k.tahunPenuh, tk = k.tahunKini
  const ytdKini = k.ytd.at(-1), ytdLalu = k.ytd.at(-2), ytdDua = k.ytd.at(-3)
  const ubahYtd = ytdKini && ytdLalu ? ubah(ytdLalu.kwh, ytdKini.kwh) : null
  const dexlite = k.bbm.find((b) => b.kode === 'dexlite'), bensin = k.bbm.find((b) => b.kode === 'bensin')
  const porsiKinra = k.kawasanPenuh && k.kwhPenuh ? (k.kwhPenuh / k.kawasanPenuh) * 100 : null
  const s1 = k.tg('s1'), s2 = k.tg('s2'), tm = k.tg('tm'), ia = k.tg('ia')
  const tglTg = (t: { tanggal: string } | null) => (t ? tanggal(t.tanggal, 'panjang') : 'jadwal belum diisi')
  const seuUtama = k.seuAktif[0], seuDua = k.seuAktif[1]
  const utama = k.utama
  const kinKini = k.kinerjaKini[0], kinLalu = k.kinerjaLalu[0]
  const d = k.dekKini
  const deltaDek = d ? d.totalB - d.totalA : 0
  const teratas = k.pareto.slice(0, k.nTeratas)
  const nMeter = k.meterBatas.length
  const namaBatas = k.meterBatas.map((m) => m.nama).join(', ')
  const risikoSkorSama = k.risiko.length > 1 && k.skorRisiko.length === 1

  // Pekerjaan rumah per tonggak: tonggak yang sudah lewat digabung ke tonggak berikutnya
  const urutBatas: BatasPr[] = ['s1', 'tm', 's2']
  const lewat = (b: BatasPr) => { const t = k.tg(b); return !!t && t.tanggal < kini }
  const batasEfektif = (b: BatasPr): BatasPr | 'segera' => { const i = urutBatas.indexOf(b); return urutBatas.slice(i).find((x) => !lewat(x)) ?? 'segera' }
  const semuaPr = Object.values(k.pr).flat()
  const grupPr = ([...urutBatas, 'segera'] as const).map((g) => ({ g, items: semuaPr.filter((p) => batasEfektif(p.batas) === g).sort((a, b) => Number(!!b.prioritas) - Number(!!a.prioritas)) })).filter((x) => x.items.length)

  return (
    <section className="cetak">
      <div className="toolbar tanpa-cetak kb-toolbar">
        <div>
          <b>Kisah Energi KINRA</b>
          <p className="muted small">Panduan bercerita ISO 50001:2018 yang disusun ulang dari data aplikasi setiap kali dibuka. Posisi data: {dicetak} WIB. Untuk mengunduh, tekan tombol di kanan lalu pilih “Simpan sebagai PDF”, aktifkan “Grafik latar belakang”, dan matikan “Header dan footer”.</p>
        </div>
        <span style={{ flex: 1 }} />
        <TombolCetak label="Unduh PDF" />
      </div>

      <article className="lp kb">
        {/* ── Sampul ─────────────────────────────────────────── */}
        <div className="kb-sampul">
          <div className="lp-sampul-atas">
            <span className="lp-logo"><Image src="/logo-kinra.png" alt="KINRA Sei Mangkei" width={900} height={325} priority /></span>
            <span className="lp-eyebrow">Panduan bercerita · ISO 50001:2018</span>
          </div>
          <div className="kb-sampul-judul">
            <h1>Kisah Energi<br />KINRA</h1>
            <p>Memahami Sistem Manajemen Energi lewat data kita sendiri, supaya Anda tenang menjawab auditor.</p>
          </div>
          <dl className="lp-kontrol">
            <div><dt>Organisasi</dt><dd>PT Kawasan Industri Nusantara · KEK Sei Mangkei</dd></div>
            <div><dt>Untuk</dt><dd>Tim SMEn, auditee, dan pimpinan</dd></div>
            <div><dt>Posisi data</dt><dd>{dicetak} WIB</dd></div>
            <div><dt>Sumber</dt><dd>Dibangkitkan langsung dari aplikasi Dashboard SMEn</dd></div>
          </dl>
        </div>

        {/* ── 00 Cara membaca ─────────────────────────────────── */}
        <Bab no="00" eyebrow="Sebelum mulai" judul="Cara membaca buku ini" acuan="Empat kotak, satu peta perjalanan">
          <p className="lp-lead">Bayangkan Anda baru ditunjuk masuk Tim SMEn. Di meja Anda ada tumpukan dokumen bertuliskan “ISO 50001:2018”, penuh istilah seperti EnPI, EnB, SEU, dan PDCA.{s1 && s1.tanggal >= kini ? ` Auditor TÜV datang untuk Stage 1 pada ${tglTg(s1)}.` : ''}</p>
          <p className="lp-p">Kabar baiknya: Anda tidak perlu menghafal standar. Auditor tidak menguji hafalan. Auditor ingin melihat bahwa KINRA tahu ke mana energinya pergi, punya rencana untuk menghematnya, menjalankan rencana itu, dan bisa membuktikannya.</p>
          <p className="lp-p">Buku ini menuntun Anda lewat cerita. Pemandunya KIRA, asisten di aplikasi Dashboard SMEn. Setiap bab mengikuti satu bagian standar dan memakai angka KINRA yang sebenarnya, diambil dari aplikasi saat buku ini dibuka.</p>
          <div className="kb-empat">
            <Kotak jenis="kira"><p>Penjelasan istilah dengan bahasa sehari-hari.</p></Kotak>
            <Kotak jenis="auditor"><p>Contoh pertanyaan dan cara menjawabnya.</p></Kotak>
            <Kotak jenis="bukti"><p>Dokumen atau menu aplikasi yang dibuka saat ditanya.</p></Kotak>
            <Kotak jenis="pr"><p>Hal yang masih kurang menurut data aplikasi dan perlu dibereskan sebelum audit.</p></Kotak>
          </div>
          {k.tonggak.length > 0 && (
            <>
              <h3 className="lp-h3">Di mana kita sekarang</h3>
              <ol className="kb-jalur">
                {k.tonggak.map((t) => (
                  <li key={t.kode} className={t.tanggal < kini ? 'lewat' : undefined}><b>{t.nama}</b><span>{tanggal(t.tanggal, 'panjang')}</span></li>
                ))}
              </ol>
            </>
          )}
          <h3 className="lp-h3">Isi</h3>
          <ol className="kb-isi">
            {[
              ['01', 'Tagihan yang membuat kita berhenti sejenak', 'Apa itu ISO 50001 · PDCA'], ['02', 'Menggambar pagar rumah', 'Klausul 4'], ['03', 'Janji dari pimpinan', 'Klausul 5'],
              ['04', 'Mencari si pemakan listrik', 'Klausul 6.3 · SEU'], ['05', 'Penggaris dan titik nol', 'Klausul 6.4, 6.5 · EnPI, EnB'], ['06', 'Janji yang bisa diukur', 'Klausul 6.1, 6.2'],
              ['07', 'Buku harian meter', 'Klausul 6.6, 7.1, 9.1'], ['08', 'Orang-orang di balik pompa', 'Klausul 7, 8'], ['09', 'Bercermin', 'Klausul 9'],
              ['10', 'Saat ada yang salah', 'Klausul 10'], ['11', 'Hari H: menghadapi auditor', 'Stage 1 & Stage 2'], ['L', 'Lampiran', 'Peta bukti, pekerjaan rumah, kamus mini, kartu saku'],
            ].map(([n, j, a]) => <li key={n}><b>{n}</b><span>{j}</span><small>{a}</small></li>)}
          </ol>
        </Bab>

        {/* ── 01 Tagihan ──────────────────────────────────────── */}
        <Bab no="01" eyebrow="Bab satu" judul="Tagihan yang membuat kita berhenti sejenak" acuan="Apa itu ISO 50001 · siklus PDCA">
          {tp !== null && k.kwhPenuh !== null ? (
            <p className="lp-lead">Sepanjang {tp}, {nMeter} meter listrik milik KINRA mencatat {angka(k.kwhPenuh)} kWh. Dengan tarif Rp{angka(kv.tarifListrik, 2)} per kWh, itu sekitar {rupiahRingkas(k.rupiahPenuh)} setahun, hanya untuk listrik yang dipakai KINRA sendiri, belum termasuk tenant.</p>
          ) : <p className="lp-lead">Belum ada tahun dengan bacaan meter lengkap 12 bulan. Lengkapi bacaan di menu Aset & Meter.</p>}
          {ytdKini && ytdLalu && tk !== null && tk !== tp && (
            <p className="lp-p">Lalu datang {tk}. Dari {rentangBulan(k.bulanKini)} saja, meter sudah mencatat {juta(ytdKini.kwh)}, {naikTurun(ubahYtd)} sekitar {angka(Math.abs(ubahYtd ?? 0))}% dibanding periode yang sama tahun lalu.
              {dexlite && dexlite.lalu > 0 && <> BBM Dexlite untuk kendaraan dan peralatan {naikTurun(ubah(dexlite.lalu, dexlite.kini))} dari {angka(dexlite.lalu)} liter menjadi {angka(dexlite.kini)} liter.</>}
            </p>
          )}
          <p className="lp-p">Pertanyaan yang wajar muncul: “Apakah perubahan ini wajar? Karena tenant bertambah dan air yang diolah makin banyak? Atau ada pemborosan?” Tanpa sistem, kita hanya bisa menebak. ISO 50001 ada untuk menjawab pertanyaan seperti itu dengan data. (Jawabannya ada di Bab 5.)</p>
          {k.ytd.length > 1 && (
            <figure className="kb-fig">
              <figcaption><b>Listrik pemakaian sendiri KINRA, {rentangBulan(k.bulanKini)}</b><span>Jumlah {k.meterKwh.length} meter aset KINRA, juta kWh</span></figcaption>
              <Kolom data={k.ytd.map((y) => ({ label: String(y.tahun), nilai: y.kwh }))} />
              <p className="lp-catatan">Sumber: bacaan meter (kWh) di menu Aset & Meter.{ytdDua && ytdLalu ? ` ${tandaPersen(ubah(ytdDua.kwh, ytdLalu.kwh))} (${ytdDua.tahun}→${ytdLalu.tahun})` : ''}{ytdLalu && ytdKini ? `${ytdDua ? ' dan' : ''} ${tandaPersen(ubahYtd)} (${ytdLalu.tahun}→${ytdKini.tahun}).` : ''}</p>
            </figure>
          )}
          <Kotak jenis="kira"><p>ISO 50001 adalah standar internasional tentang cara mengelola energi secara teratur. Ia tidak menyuruh Anda membeli alat tertentu dan tidak menetapkan angka hemat. Ia meminta satu kebiasaan: tahu, rencanakan, kerjakan, periksa, perbaiki, lalu ulangi terus. Sertifikat diberikan bila kebiasaan itu terbukti berjalan.</p></Kotak>
          <h3 className="lp-h3">Satu siklus yang terus berputar: PDCA</h3>
          <p className="lp-p">Seluruh isi standar, dari klausul 4 sampai 10, sebenarnya hanya empat langkah ini. Ingat urutannya dan Anda tidak akan tersesat saat auditor melompat dari satu topik ke topik lain.</p>
          <div className="kb-pdca">
            <div><b>Plan · Rencanakan</b><p>Klausul 4–6. Tentukan batas sistem, kebijakan, pemakan energi terbesar (SEU), alat ukurnya (EnPI), titik nol (EnB), dan sasaran.</p></div>
            <div><b>Do · Kerjakan</b><p>Klausul 7–8. Siapkan orang, kompetensi, komunikasi, dokumen; jalankan operasi SEU sesuai aturan; perhatikan energi saat mendesain dan membeli.</p></div>
            <div><b>Check · Periksa</b><p>Klausul 9. Pantau EnPI tiap bulan, cek kepatuhan regulasi, lakukan audit internal, dan bahas hasilnya di tinjauan manajemen.</p></div>
            <div><b>Act · Perbaiki</b><p>Klausul 10. Tangani ketidaksesuaian sampai akar masalah, lalu tingkatkan kinerja energi terus-menerus.</p></div>
          </div>
          <Kotak jenis="auditor">
            <Tanya q="Mengapa KINRA menerapkan ISO 50001?">Listrik KINRA sendiri sekitar {juta(k.kwhPenuh, 1)} atau {rupiahRingkas(k.rupiahPenuh)} per tahun{ubahYtd !== null && ubahYtd > 0 ? ' dan terus naik' : ''}. Kami ingin tahu penyebabnya, mengendalikannya, dan membuktikan perbaikannya dengan data, sejalan dengan kebijakan energi perusahaan.</Tanya>
          </Kotak>
        </Bab>

        {/* ── 02 Batas ─────────────────────────────────────────── */}
        <Bab no="02" eyebrow="Bab dua" judul="Menggambar pagar rumah" acuan="Klausul 4 · Konteks organisasi, pihak berkepentingan, ruang lingkup & batas">
          <p className="lp-lead">Hari pertama, KIRA mengajak Anda naik ke atap Graha dan memandang kawasan. “Semua ini listriknya lewat jaringan kawasan,” katanya. “Tapi tidak semuanya urusan kita.”</p>
          {k.kawasanPenuh > 0 && porsiKinra !== null && (
            <p className="lp-p">Tahun {tp}, listrik yang mengalir di kawasan Sei Mangkei (PLN, PLTBG, PLTS) sekitar {juta(k.kawasanPenuh, 1)}. Sebagian besar dipakai tenant di pabrik mereka sendiri. Listrik yang benar-benar dipakai KINRA untuk {namaBatas} hanya {juta(k.kwhPenuh)}, kira-kira {angka(porsiKinra)}% dari total.</p>
          )}
          <p className="lp-p">“Kalau kita mengaku bertanggung jawab atas seluruh listrik kawasan,” lanjut KIRA, “kita akan dinilai atas mesin yang tidak bisa kita sentuh. Jadi kita gambar pagarnya dulu.”</p>
          {k.kawasanPenuh > 0 && (
            <div className="lp-kpi kb-kpi3">
              <div><span>Listrik kawasan {tp}</span><b>{juta(k.kawasanPenuh, 1)}</b><small>PLN + PLTBG + PLTS, termasuk tenant</small></div>
              <div><span>Pemakaian sendiri KINRA {tp}</span><b>{juta(k.kwhPenuh)}</b><small>dari {nMeter} meter aset</small></div>
              <div><span>Porsi KINRA</span><b>±{angka(porsiKinra ?? 0)}%</b><small>dari listrik kawasan</small></div>
            </div>
          )}
          <Kotak jenis="kira"><p>Ruang lingkup menjawab “kegiatan apa yang diatur sistem ini”. Batas menjawab “di mana pagarnya”: gedung, instalasi, dan meter mana yang termasuk. Di aplikasi, EnPI dikelompokkan menjadi Lingkup SMEn KINRA (yang kita kendalikan) dan Kawasan (sekadar dipantau).</p></Kotak>
          <h3 className="lp-h3">Yang lain di klausul 4</h3>
          <ul className="lp-poin">
            <li><b>Isu internal dan eksternal (4.1).</b> Hal yang bisa membantu atau menghambat sistem energi, misalnya pertumbuhan tenant, harga BBM, atau keterbatasan submeter. Ada {k.nIsu} isu di register Isu & Peluang.</li>
            <li><b>Pihak berkepentingan (4.2).</b> Siapa yang peduli pada energi KINRA dan apa yang mereka minta: pemegang saham, Kementerian ESDM, PLN, tenant, Bea Cukai, karyawan. Termasuk daftar persyaratan hukum terkait energi.</li>
            <li><b>Sistem manajemen energi (4.4).</b> Manual SMEn dan proses bisnis yang menunjukkan bagaimana semua klausul saling terhubung.</li>
          </ul>
          <Kotak jenis="auditor">
            <Tanya q="Apa batas SMEn KINRA? Apakah tenant termasuk?">Batasnya adalah aset yang dioperasikan KINRA dan diukur {nMeter} meter: {namaBatas}. Tenant di luar batas karena kami tidak mengendalikan peralatannya. Data kawasan tetap kami pantau sebagai informasi.</Tanya>
            <Tanya q="Bagaimana dengan pembangkit di kawasan (PLTBG, PLTS)?">Dicatat sebagai pasokan kawasan. Bila ada aset yang terbukti dioperasikan KINRA, batas dan tinjauan energi kami perbarui.</Tanya>
          </Kotak>
          <Kotak jenis="bukti"><p>Formulir Ruang Lingkup & Batasan SMEn (F-4.3-01), Formulir Isu Internal Eksternal, Formulir Pihak Berkepentingan. Aplikasi: Aset & Meter, Isu & Peluang, Peta SMEn.</p><p className="kb-status">Dokumen klausul 4: {k.k4.siap} dari {k.k4.n} siap audit, {k.k4.bukti} sudah ada evidence.</p></Kotak>
          <DaftarPr items={k.pr.b2} />
        </Bab>

        {/* ── 03 Pimpinan ──────────────────────────────────────── */}
        <Bab no="03" eyebrow="Bab tiga" judul="Janji dari pimpinan" acuan="Klausul 5 · Kepemimpinan, kebijakan energi, peran & wewenang">
          <p className="lp-lead">“Kenapa auditor selalu ingin bertemu Direksi?” tanya Anda. KIRA tersenyum. “Karena sistem ini akan mati kalau hanya dikerjakan staf. Pompa tidak akan diganti tanpa anggaran. Operator tidak akan mengubah jadwal tanpa perintah. Auditor ingin melihat bahwa pimpinan bukan sekadar menandatangani, tetapi ikut menyetir.”</p>
          <h3 className="lp-h3">Tiga hal yang harus terlihat</h3>
          <ol className="lp-poin">
            <li><b>Komitmen nyata (5.1).</b> Pimpinan hadir di kickoff, menyetujui sumber daya, memimpin tinjauan manajemen{tm ? ` (${tglTg(tm)})` : ''}, dan memastikan energi masuk ke rencana bisnis.</li>
            <li><b>Kebijakan energi (5.2).</b> Ditandatangani pimpinan puncak. Isinya janji perbaikan kinerja energi, ketersediaan informasi dan sumber daya, kepatuhan hukum, serta dukungan pengadaan dan desain yang hemat energi. Kebijakan harus dikomunikasikan ke seluruh karyawan.</li>
            <li><b>Peran yang jelas (5.3).</b> SK Tim SMEn dan Internal Auditor serta struktur organisasi. Ada Manajer Energi, Tim Energi, dan pemilik tiap SEU.</li>
          </ol>
          <Kotak jenis="kira"><p>Tidak semua orang harus hafal kebijakan energi kata per kata. Yang penting setiap orang bisa menjawab dengan bahasanya sendiri: “Perusahaan ingin memakai energi seefisien mungkin, dan tugas saya adalah …”</p></Kotak>
          <Kotak jenis="auditor">
            <Tanya q="(kepada Direksi) Bagaimana Bapak/Ibu memastikan SMEn mendapat sumber daya?">Kami membentuk Tim SMEn lewat SK, menyetujui anggaran aksi{k.aksiUnggulan ? ` seperti ${k.aksiUnggulan.uraian.charAt(0).toLowerCase()}${k.aksiUnggulan.uraian.slice(1)}` : ''}, dan meninjau kinerja energi di rapat tinjauan manajemen.</Tanya>
            <Tanya q="(kepada karyawan) Anda tahu kebijakan energi perusahaan?">Ya, intinya perusahaan berkomitmen terus memperbaiki pemakaian energi. Di bagian saya, itu berarti … (sebutkan contoh: mematikan AC saat ruang kosong, melaporkan pompa yang berjalan di luar jadwal).</Tanya>
            <Tanya q="Siapa yang berwenang menetapkan SEU?">Penetapan dan pencabutan SEU serta persetujuan tinjauan energi dilakukan Admin dan Konsultan berdasarkan rapat Tim Energi. Tim KINRA mengusulkan dan melengkapi datanya.</Tanya>
          </Kotak>
          <Kotak jenis="bukti"><p>Kebijakan energi bertanda tangan, SK Tim SMEn, struktur organisasi, Formulir Komitmen Manajemen, daftar hadir dan foto sosialisasi kebijakan. Aplikasi: Ringkasan Direksi.</p><p className="kb-status">Dokumen klausul 5: {k.k5.siap} dari {k.k5.n} siap audit, {k.k5.bukti} sudah ada evidence.</p></Kotak>
          <DaftarPr items={k.pr.b3} />
        </Bab>

        {/* ── 04 SEU ───────────────────────────────────────────── */}
        <Bab no="04" eyebrow="Bab empat" judul="Mencari si pemakan listrik" acuan="Klausul 6.3 · Tinjauan energi dan penggunaan energi signifikan (SEU)">
          <p className="lp-lead">KIRA membuka data {nMeter} meter tahun {tp ?? '–'} dan mengurutkannya dari yang terbesar. Polanya langsung terlihat. Gedung kantor yang terasa “boros” karena AC-nya ternyata kecil. Raksasanya justru ada di instalasi air.</p>
          {teratas.length > 0 && <p className="lp-p">“{teratas.length} meter teratas menyumbang {angka(teratas.at(-1)!.kumulatif)}% listrik KINRA,” kata KIRA. “Kalau kita mau hemat, di situlah medan perangnya.”</p>}
          {k.pareto.length > 0 && (
            <figure className="kb-fig">
              <figcaption><b>Siapa memakai listrik KINRA? ({tp})</b><span>kWh per meter, Januari–Desember {tp}. Total {angka(k.kwhPenuh)} kWh. Warna tosca = bagian dari SEU.</span></figcaption>
              <Pareto k={k} />
            </figure>
          )}
          <Kotak jenis="kira">
            <p>SEU (Significant Energy Use) adalah pemakai energi yang paling besar porsinya atau paling besar peluang hematnya. Ibarat rumah tangga, SEU itu AC dan kulkas, bukan lampu kamar mandi. Standar meminta kita memusatkan perhatian, kontrol, dan pelatihan pada SEU.</p>
            <p>Tinjauan energi adalah “pemeriksaan kesehatan” energi: dari mana energi datang, dipakai untuk apa, berapa banyak, apa yang memengaruhinya, dan di mana peluang hematnya.</p>
          </Kotak>
          <h3 className="lp-h3">Aturan main</h3>
          <p className="lp-p">Suatu pemakai energi menjadi SEU bila porsinya ≥ {angka(k.ambangPersen)}%, atau termasuk kelompok teratas yang membentuk {angka(k.ambangKumulatif)}% konsumsi, atau ditetapkan karena potensi perbaikan atau persyaratan hukum.</p>
          <table className="lp-tbl lp-rapat">
            <thead><tr><th>Kode</th><th>Nama</th><th>Meter</th><th className="angka">Porsi {tp}</th><th>Alasan</th><th>Status</th></tr></thead>
            <tbody>
              {k.seuAktif.map((s) => <tr key={s.kode}><th>{s.kode}</th><td>{s.nama}</td><td className="mono">{s.meterLabel || '–'}</td><td className="angka">±{angka(s.porsi)}%</td><td>{s.alasan ?? '–'}</td><td>{s.status}</td></tr>)}
              {k.porsiBbm !== null && k.porsiBbm > 0 && <tr><th>–</th><td>BBM kendaraan & genset</td><td>–</td><td className="angka">±{angka(k.porsiBbm, 1)}%</td><td>Porsi energi setara kWh. Dipantau lewat EnPI BBM.</td><td>Dipantau</td></tr>}
            </tbody>
          </table>
          <Kotak jenis="auditor">
            <Tanya q="Bagaimana Anda menentukan SEU?">Dari data kWh meter {tp} kami urutkan pemakai terbesar (Pareto). {k.seuAktif.map((s) => s.kode).join(' dan ')} melewati ambang {angka(k.ambangPersen)}% dan bersama membentuk sekitar {angka(k.seuAktif.reduce((t, s) => t + s.porsi, 0))}% konsumsi. Kriterianya tercatat di dokumen tinjauan energi.</Tanya>
            {seuUtama && <Tanya q={`Apa variabel yang memengaruhi ${seuUtama.kode}?`}>{seuUtama.variabel_kode.length ? `${utama?.variabel.map((v) => v.nama).join(', ') || seuUtama.variabel_kode.join(', ')}. Makin banyak air yang diolah, makin lama pompa bekerja. Variabel ini dicatat bulanan.` : 'Variabel relevannya sedang kami tetapkan.'}</Tanya>}
          </Kotak>
          <Kotak jenis="bukti"><p>Aplikasi: Tinjauan Energi & SEU (Pareto, kriteria, register SEU), Data Energi, Simulasi Pompa & VSD. Dokumen: Formulir SEU, Prosedur Tinjauan Energi.</p><p className="kb-status">Tinjauan energi terbaru: {k.seuAktif.length ? `${k.seuAktif.filter((s) => s.status === 'Ditetapkan').length} dari ${k.seuAktif.length} SEU ditetapkan` : 'belum ada SEU'}.</p></Kotak>
          <DaftarPr items={k.pr.b4} />
        </Bab>

        {/* ── 05 EnPI ──────────────────────────────────────────── */}
        <Bab no="05" eyebrow="Bab lima" judul="Penggaris dan titik nol" acuan="Klausul 6.4 dan 6.5 · Indikator kinerja energi (EnPI) dan baseline energi (EnB)">
          <p className="lp-lead">“Listrik WTP naik. Berarti kita boros?” tanya Anda. “Belum tentu,” jawab KIRA. “Bayangkan dua bulan. Bulan pertama WTP mengolah sedikit air, bulan kedua dua kali lebih banyak. Tentu listriknya naik. Itu bukan boros, itu karena kerjanya lebih banyak. Maka kita tidak menilai kWh-nya saja, tetapi kWh per meter kubik air.”</p>
          <p className="lp-p">“Seperti mobil,” lanjutnya. “Bensin yang habis tidak bilang apa-apa sebelum kita tahu berapa kilometer yang ditempuh. Yang penting liter per kilometer.”</p>
          <Kotak jenis="kira">
            <p><b>EnPI</b> (Energy Performance Indicator) adalah penggaris kinerja energi, misalnya kWh per m³ air. <b>EnB</b> (Energy Baseline) adalah titik nol: kinerja pada periode acuan sebelum perbaikan.</p>
            <p><b>Variabel relevan</b> adalah faktor yang memengaruhi konsumsi secara wajar, misalnya volume air, jam operasi, atau jumlah tenant. <b>Normalisasi</b> berarti membandingkan secara adil: kinerja tahun ini dibandingkan baseline setelah variabel relevan disamakan.</p>
          </Kotak>
          <h3 className="lp-h3">Penggaris yang dipakai KINRA</h3>
          <table className="lp-tbl lp-rapat">
            <thead><tr><th>Kode</th><th>Apa yang diukur</th><th>Cara hitung</th><th>Baseline</th><th>Catatan</th></tr></thead>
            <tbody>
              {k.enpiKinra.map((h) => {
                const bm = h.enpi.baseline_mulai.slice(0, 4), bs = h.enpi.baseline_selesai.slice(0, 4)
                return (
                  <tr key={h.enpi.kode}>
                    <th>{h.enpi.kode}{h.enpi.kode === utama?.enpi.kode && <><br /><span className="lp-bintang">EnPI utama</span></>}</th>
                    <td>{h.enpi.nama}</td>
                    <td>{LABEL_METODE[h.enpi.metode]}{h.variabel.length ? ` · ${h.variabel.map((v) => v.nama).join(', ')}` : ''}</td>
                    <td>{bm === bs ? bm : `${bm}–${bs}`}</td>
                    <td>{h.enpi.catatan ?? h.galat ?? '–'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {k.enpiKawasan.length > 0 && <p className="lp-catatan">{k.enpiKawasan.join(' dan ')} (lingkup kawasan, termasuk tenant) hanya dipantau dan tidak dipakai untuk sasaran KINRA.</p>}

          <h3 className="lp-h3">Kisah kecil tentang data yang lengkap</h3>
          <p className="lp-p">Awal November 2026, aplikasi menandai EnPI-05 “hemat” lima bulan berturut-turut dengan penurunan 12,6% sampai 14,8% dibanding baseline. Tim sempat senang. Lalu Bagian M/E mengonfirmasi bahwa meter intake WTP I ternyata terpisah dari meter WTP. Setelah kWh intake ikut dihitung, penurunannya tinggal 3,4% sampai 6,5%, di bawah ambang deviasi, dan statusnya diubah menjadi “Bukan deviasi”.</p>
          <p className="lp-p">“Ini justru cerita bagus untuk auditor,” kata KIRA. “Kita tidak menyembunyikan koreksi. Kita menunjukkan bahwa data diperiksa, kesalahan ditemukan, dan keputusan diperbarui. Itulah sistem yang hidup.”</p>

          {d && d.bulan.length > 0 && (
            <>
              <h3 className="lp-h3">{naikTurun(ubah(d.totalA, d.totalB)) === 'naik' ? 'Naik' : 'Turun'} {angka(Math.abs(ubah(d.totalA, d.totalB) ?? 0))}%: apa sebabnya?</h3>
              <p className="lp-p">Direksi bertanya: “Listrik kita {periodeBulan(d.bulan)} {d.tahunB} {naikTurun(deltaDek)} {angka(Math.abs(deltaDek) / 1000)} MWh. Siapa yang boros?” KIRA membuka bagian “Mengapa konsumsi listrik berubah?” di halaman Kinerja Energi dan memecah perubahan itu menjadi penyebab-penyebabnya, seperti membedah struk belanja.</p>
              <p className="lp-p">{ceritakan(d, energiListrik)}</p>
              <figure className="kb-fig">
                <figcaption><b>Jembatan perubahan listrik KINRA, {periodeBulan(d.bulan)} {d.tahunA} → {d.tahunB}</b><span>Batang ke kanan menambah konsumsi, ke kiri mengurangi. Jumlah semua penyebab = selisih meter.</span></figcaption>
                <Jembatan k={k} />
                <p className="lp-catatan">Abu-abu = kondisi operasi (wajar) · hijau = kinerja hemat · merah = kinerja boros · kuning = belum ternormalisasi. Sumber: Kinerja Energi.{d.peringatan.length ? ` ${d.peringatan.join(' ')}` : ''}</p>
              </figure>
              <Kotak jenis="kira">
                <p>Cara bacanya: kondisi operasi adalah bagian perubahan yang wajar karena pekerjaan bertambah atau berkurang. Kinerja adalah sisanya setelah dinormalisasi, dan inilah yang menunjukkan efisiensi sebenarnya.</p>
                {kinLalu && k.dekLalu && k.dekLalu.bulan.length > 0 && kinLalu.persen !== null && Math.abs(kinLalu.persen) >= 0.5 && <p>Tahun sebelumnya ({k.dekLalu.tahunA}→{k.dekLalu.tahunB}), kinerja {kinLalu.seu} {kinLalu.nilai <= 0 ? 'lebih efisien' : 'lebih boros'}{kinLalu.persen !== null ? ` sekitar ${angka(Math.abs(kinLalu.persen))}%` : ''}. Jujurlah tentang keduanya. Auditor menghargai organisasi yang tahu kapan ia membaik dan kapan memburuk.</p>}
              </Kotak>
            </>
          )}
          <Kotak jenis="auditor">
            <Tanya q={`Mengapa memilih ${utama ? utama.enpi.baseline_mulai.slice(0, 4) : 'tahun itu'} sebagai baseline?`}>{utama?.enpi.alasan_baseline ?? 'Tahun penuh terakhir sebelum SMEn diterapkan dengan data kWh lengkap untuk semua meter aset.'}</Tanya>
            <Tanya q="Kapan baseline harus disesuaikan?">Bila EnPI tidak lagi mencerminkan kinerja, misalnya ada perubahan besar pada faktor statis (aset atau meter baru, perubahan lingkup), atau metode normalisasi berubah. Setiap penyesuaian kami catat sesuai prosedur EnB.</Tanya>
            {utama && <Tanya q="Apa EnPI utama KINRA dan mengapa?">{utama.enpi.kode}, {utama.enpi.nama.charAt(0).toLowerCase()}{utama.enpi.nama.slice(1)}.{seuUtama ? ` ${seuUtama.kode} adalah SEU terbesar (sekitar ${angka(seuUtama.porsi)}% listrik KINRA)` : ''}{utama.enpi.metode !== 'absolut' ? ', dan EnPI ini sudah dinormalisasi terhadap variabel relevan sehingga mencerminkan efisiensi, bukan sekadar besarnya beban.' : '.'}</Tanya>}
            {kinKini && d && (
              <Tanya q="Apa bukti kinerja energi KINRA membaik?">Listrik {periodeBulan(d.bulan)} {d.tahunB} {naikTurun(deltaDek)} {angka(Math.abs(ubah(d.totalA, d.totalB) ?? 0))}%, {kinKini.kondisi !== 0 ? `dan ${angka(Math.abs(kinKini.kondisi) / 1000)} MWh di antaranya karena ${kinKini.variabel ?? 'variabel relevan'} ${kinKini.ubahVar !== null ? `${naikTurun(kinKini.ubahVar)} ${angka(Math.abs(kinKini.ubahVar))}%` : 'berubah'}` : ''}. Setelah dinormalisasi, {kinKini.seu} {kinKini.nilai <= 0 ? 'lebih efisien' : 'lebih boros'} sekitar {angka(Math.abs(kinKini.nilai) / 1000)} MWh{kinKini.persen !== null ? ` (±${angka(Math.abs(kinKini.persen))}%)` : ''} dibanding {d.tahunA}{kinKini.nilai <= 0 ? `, setara ±${rupiahRingkas(Math.abs(kinKini.nilai) * kv.tarifListrik)}` : ''}.{d.peringatan.some((p) => p.includes('ekstrapolasi')) ? ' Ini perkiraan karena sebagian volume di atas rentang baseline, dan akan kami konfirmasi dengan data bulan berikutnya.' : ''}</Tanya>
            )}
          </Kotak>
          <Kotak jenis="bukti"><p>Aplikasi: Kinerja Energi (bagian “Mengapa konsumsi listrik berubah?”, aktual vs harapan, CUSUM, R² dan CV(RMSE), register deviasi), Laboratorium EnPI. Dokumen: Formulir EnPI & Baseline, Prosedur EnPI dan EnB.</p></Kotak>
          <DaftarPr items={k.pr.b5} />
        </Bab>

        {/* ── 06 Sasaran ───────────────────────────────────────── */}
        <Bab no="06" eyebrow="Bab enam" judul="Janji yang bisa diukur" acuan="Klausul 6.1 dan 6.2 · Risiko & peluang, sasaran, target, rencana aksi">
          <p className="lp-lead">Setelah tahu siapa pemakan listriknya dan punya penggarisnya, saatnya berjanji. KIRA mengingatkan: “Janji yang baik itu bisa dicek. ‘Kita akan berhemat’ itu bukan sasaran. ‘Turunkan kWh per m³ air WTP I sebesar 5% pada 2027’ itu baru sasaran.”</p>
          <h3 className="lp-h3">{k.sasaran.length} sasaran energi KINRA</h3>
          <table className="lp-tbl lp-rapat">
            <thead><tr><th>{k.sasaran.some((s) => s.bagian) ? 'Bagian · kode' : 'EnPI'}</th><th>Sasaran</th><th>Target</th><th>Batas</th><th>Status</th></tr></thead>
            <tbody>{k.sasaran.map((s) => <tr key={s.id}><th>{s.bagian ? <>{s.bagian}<br /><span className="mono">{s.kode}</span></> : (s.enpi_kode ?? s.kode)}</th><td>{s.aktivitas ?? s.uraian}</td><td>{s.target_teks ?? (s.target_persen !== null ? `${angka(s.target_persen, 1)}% (${s.enpi_kode})` : '–')}</td><td>{s.batas_waktu ?? s.tahun_target ?? '–'}</td><td>{s.pencapaian ?? s.status}</td></tr>)}</tbody>
          </table>
          {k.aksiUnggulan && (
            <>
              <h3 className="lp-h3">Contoh rencana aksi: {k.aksiUnggulan.kode}</h3>
              <p className="lp-p">{k.aksiUnggulan.uraian}</p>
              <div className="lp-kpi kb-kpi3">
                <div><span>Estimasi hemat</span><b>±{angka(k.aksiUnggulan.estimasi_hemat_kwh)}</b><small>kWh per tahun</small></div>
                <div><span>Setara</span><b>±{rupiahRingkas((k.aksiUnggulan.estimasi_hemat_kwh ?? 0) * kv.tarifListrik)}</b><small>per tahun</small></div>
                <div><span>Jadwal · status</span><b className="kb-kecil">{tanggal(k.aksiUnggulan.mulai)} – {tanggal(k.aksiUnggulan.tenggat)}</b><small>{k.aksiUnggulan.status}{k.aksiUnggulan.hemat_terverifikasi_kwh ? ` · terverifikasi ${angka(k.aksiUnggulan.hemat_terverifikasi_kwh)} kWh` : ''}</small></div>
              </div>
              {k.aksiUnggulan.metode_verifikasi && <p className="lp-p"><b>Cara membuktikan hematnya (verifikasi):</b> {k.aksiUnggulan.metode_verifikasi}</p>}
            </>
          )}
          <Kotak jenis="kira"><p>Risiko adalah hal yang bisa menggagalkan sistem energi, misalnya data meter tidak lengkap atau SEU belum ditetapkan. Peluang adalah kesempatan berhemat, misalnya optimasi pompa atau submeter. Keduanya dinilai (kemungkinan × dampak), lalu yang penting diberi tindakan.</p></Kotak>
          <p className="lp-p">KINRA punya {k.risiko.length} risiko ({k.risiko.filter((r) => r.skor >= AMBANG_RISIKO.ekstrem).length} ekstrem, {k.risiko.filter((r) => r.skor >= AMBANG_RISIKO.tinggi && r.skor < AMBANG_RISIKO.ekstrem).length} tinggi menurut kriteria risiko formulir 6.1) dan {k.isuPeluang.length} peluang di register isu, serta {k.peluang.length} peluang penghematan{k.peluang.length ? ` (${k.peluang[0].kode} s.d. ${k.peluang.at(-1)!.kode})` : ''}.{k.hematTerverifikasi > 0 ? ` Penghematan terverifikasi dari aksi yang selesai: ${angka(k.hematTerverifikasi)} kWh.` : ''}</p>
          <Kotak jenis="auditor">
            <Tanya q="Bagaimana sasaran ini dipantau?">Setiap sasaran terhubung ke satu EnPI di aplikasi. Capaiannya terlihat tiap bulan di halaman Sasaran & Aksi, dan rencana aksinya punya PIC, sumber daya, tenggat, serta metode verifikasi.</Tanya>
            {risikoSkorSama && <Tanya q="Mengapa semua risiko bernilai sama?">(Jangan sampai pertanyaan ini muncul. Lihat pekerjaan rumah di bawah.)</Tanya>}
          </Kotak>
          <Kotak jenis="bukti"><p>Aplikasi: Sasaran & Aksi, Isu & Peluang. Dokumen: Formulir Tujuan & Target Energi dan Rencana Tindakan, Formulir Risiko, Formulir Peluang.</p></Kotak>
          <DaftarPr items={k.pr.b6} />
        </Bab>

        {/* ── 07 Meter ─────────────────────────────────────────── */}
        <Bab no="07" eyebrow="Bab tujuh" judul="Buku harian meter" acuan="Klausul 6.6, 7.1, 9.1 · Rencana pengumpulan data, alat ukur, kalibrasi">
          <p className="lp-lead">Semua cerita sebelumnya bergantung pada satu hal sederhana: angka di meter. Kalau angkanya salah, EnPI salah, sasaran salah, dan keputusan pun salah.</p>
          <p className="lp-p">KIRA menunjukkan contoh. Di lembar kerja, kWh Graha April 2025 sempat tertulis 120.328,8, sepuluh kali lipat dari biasanya. Ternyata salah ketik; angka sebenarnya 12.328,8. “Itulah gunanya rencana pengumpulan data,” kata KIRA. “Siapa membaca, kapan, dengan alat apa, dan siapa yang memeriksa.”</p>
          <h3 className="lp-h3">{k.meterKwh.length} meter KINRA</h3>
          <table className="lp-tbl lp-rapat">
            <thead><tr><th>Kode</th><th>Lokasi</th><th>Jenis/merek</th><th className="angka">Faktor kali</th><th>Kelas akurasi</th><th>Kalibrasi terakhir</th><th>PIC data</th></tr></thead>
            <tbody>{k.meterKwh.map((m) => {
              const p = k.pareto.find((x) => x.kode === m.kode)
              return <tr key={m.kode}><th className="mono">{pendek(m.kode)}</th><td>{p?.nama ?? m.lokasi ?? '–'}{p?.seu ? ` (${p.seu})` : ''}</td><td>{m.jenis ?? '–'}</td><td className="angka">×{angka(m.faktor_kali)}</td><td className={m.kelas_akurasi ? undefined : 'buruk'}>{m.kelas_akurasi || 'Kosong'}</td><td className={m.kalibrasi_terakhir ? undefined : 'buruk'}>{m.kalibrasi_terakhir ? tanggal(m.kalibrasi_terakhir) : 'Kosong'}</td><td className={m.pic_data ? undefined : 'buruk'}>{m.pic_data || 'Kosong'}</td></tr>
            })}</tbody>
          </table>
          {k.bulanTerakhirLengkap && <p className="lp-catatan">Bacaan lengkap terakhir untuk semua meter: {BULAN_PANJANG[k.bulanTerakhirLengkap.bulan - 1]} {k.bulanTerakhirLengkap.tahun}.</p>}
          <Kotak jenis="kira">
            <p><b>Faktor kali</b> adalah pengali angka di layar meter untuk mendapat kWh sebenarnya, karena meter besar mengukur lewat trafo arus (CT). Faktor ×200 artinya selisih 10 di layar = 2.000 kWh. Salah faktor kali = salah semua angka sesudahnya.</p>
            <p><b>Kalibrasi</b> adalah pemeriksaan bahwa meter masih mengukur dengan benar, dibuktikan sertifikat yang masih berlaku.</p>
          </Kotak>
          <h3 className="lp-h3">Rencana: dari satu meter per instalasi ke submeter per peralatan</h3>
          <p className="lp-p">Saat ini satu meter mengukur seluruh WTP atau WWTP, sehingga kita tahu totalnya tetapi tidak tahu pompa mana yang boros. Rencana submeter bertahap: panel pompa distribusi dan air baku, flow meter, dan pengukur tekanan header di WTP; panel blower/aerator, flow meter influent, dan sensor oksigen terlarut di WWTP; lalu pompa backwash, pompa lumpur, dan beban penunjang. Auditor menerima rencana yang jelas walaupun belum semua meter terpasang, asalkan ada PIC, tanggal target, dan frekuensi pembacaan.</p>
          <Kotak jenis="auditor">
            <Tanya q="Bagaimana Anda memastikan data meter akurat?">Pembacaan bulanan dicatat di aplikasi dengan faktor kali yang sudah dikonfirmasi M/E. Angka yang janggal kami telusuri ke sumbernya, seperti koreksi Graha April 2025. Jadwal kalibrasi meter tercatat di register meter.</Tanya>
            <Tanya q="Tunjukkan sertifikat kalibrasi meter WTP.">(Siapkan sertifikatnya. Bila meter milik PLN, siapkan bukti dari PLN atau berita acara tera.)</Tanya>
          </Kotak>
          <Kotak jenis="bukti"><p>Aplikasi: Aset & Meter (register meter, bacaan bulanan). Dokumen: Formulir Aset dan Meter Energi, Formulir Pengumpulan & Analisis Data Energi, lembar “Pelacak Konsumsi Energi”.</p></Kotak>
          <DaftarPr items={k.pr.b7} />
        </Bab>

        {/* ── 08 Orang ─────────────────────────────────────────── */}
        <Bab no="08" eyebrow="Bab delapan" judul="Orang-orang di balik pompa" acuan="Klausul 7 dan 8 · Kompetensi, kepedulian, komunikasi, dokumen, operasi, desain, pengadaan">
          <p className="lp-lead">Pukul dua dini hari, WTP tetap menyala. Yang menentukan apakah pompa berjalan efisien malam itu bukan Direksi, bukan konsultan, tetapi operator yang sedang bertugas.</p>
          <p className="lp-p">“Karena itu,” kata KIRA, “auditor hampir selalu turun ke lapangan dan bertanya langsung ke operator. Mereka ingin tahu: apakah orang yang memegang SEU tahu apa yang penting bagi energi?”</p>
          <h3 className="lp-h3">Klausul 7: menyiapkan orang dan dokumen</h3>
          <table className="lp-tbl lp-rapat">
            <thead><tr><th>Klausul</th><th>Artinya bagi KINRA</th></tr></thead>
            <tbody>
              <tr><th>7.1 Sumber daya</th><td>Ada anggaran, orang, dan alat (termasuk meter) untuk menjalankan SMEn.</td></tr>
              <tr><th>7.2 Kompetensi</th><td>Orang yang pekerjaannya memengaruhi SEU (operator WTP, teknisi pompa, operator WWTP, Kasubag M/E) terlatih dan punya buktinya. Internal auditor bersertifikat pelatihan.</td></tr>
              <tr><th>7.3 Kepedulian</th><td>Setiap orang tahu kebijakan energi, perannya, dan akibatnya bila tidak mengikuti aturan.</td></tr>
              <tr><th>7.4 Komunikasi</th><td>Jelas apa yang dikomunikasikan, kapan, kepada siapa, dan oleh siapa. Ada saluran bagi karyawan untuk memberi usulan hemat energi.</td></tr>
              <tr><th>7.5 Informasi terdokumentasi</th><td>Dokumen bernomor, berversi, disetujui, dan mudah ditemukan. Di aplikasi, dokumen dihitung “siap audit” hanya bila berstatus Final dan berkasnya ditandai versi sah.</td></tr>
            </tbody>
          </table>
          <h3 className="lp-h3">Klausul 8: menjalankan dengan benar</h3>
          <ul className="lp-poin">
            <li><b>8.1 Pengendalian operasi.</b> Untuk tiap SEU, tetapkan parameter kritis, batas toleransi, dan tindakan saat terjadi penyimpangan. Di WTP: tekanan header distribusi dan jadwal pompa. Di WWTP: kadar oksigen terlarut, karena aerasi berlebih menghamburkan listrik. Sertakan jadwal pemeliharaan preventif.</li>
            <li><b>8.2 Desain.</b> Setiap proyek baru atau renovasi mempertimbangkan efisiensi energi sejak gambar kerja.</li>
            <li><b>8.3 Pengadaan.</b> Pembelian peralatan yang memakai energi besar mempertimbangkan efisiensinya, misalnya motor kelas IE3/IE4 atau lampu LED, dan pemasok diberi tahu bahwa efisiensi menjadi kriteria.</li>
          </ul>
          <Kotak jenis="auditor">
            <Tanya q="(kepada operator WTP) Apa yang Anda lakukan bila tekanan distribusi di atas batas?">Saya cek di lembar kendali operasi, lalu … (sebutkan tindakan sesuai SOP: menurunkan set point VSD, mematikan pompa cadangan, melapor ke Kasubag M/E).</Tanya>
            <Tanya q="Pelatihan apa yang sudah Anda ikuti terkait energi?">Sebutkan pelatihan yang pernah diikuti dan tunjukkan daftar hadir atau sertifikatnya.</Tanya>
            <Tanya q="Ketika membeli pompa baru, apakah efisiensi energi dipertimbangkan?">Ya, sesuai Formulir Pertimbangan Energi dalam Pengadaan. Spesifikasi teknis mencantumkan kelas efisiensi motor.</Tanya>
          </Kotak>
          <Kotak jenis="bukti"><p>Formulir Kompetensi & Pelatihan, Formulir Kesadaran dan Komunikasi, Log Komunikasi Eksternal, Daftar Induk Dokumen, Formulir Perencanaan Pengendalian Operasional, Formulir Pertimbangan Energi dalam Desain dan Pengadaan. Aplikasi: Kesiapan Audit, Peta Evidence.</p><p className="kb-status">Klausul 7: {k.k7.siap}/{k.k7.n} dokumen siap audit · Klausul 8: {k.k8.siap}/{k.k8.n} · Dokumen wajib ISO: {k.wajib.length - k.wajibBelumSiap.length}/{k.wajib.length} siap.</p></Kotak>
          <DaftarPr items={k.pr.b8} />
        </Bab>

        {/* ── 09 Bercermin ─────────────────────────────────────── */}
        <Bab no="09" eyebrow="Bab sembilan" judul="Bercermin" acuan="Klausul 9 · Pemantauan, evaluasi kepatuhan, audit internal, tinjauan manajemen">
          <p className="lp-lead">Setiap awal bulan, KIRA menjalankan ritual yang sama: memasukkan angka meter dan BBM, lalu membandingkan EnPI dengan harapannya. Bila ada yang melenceng terlalu jauh, aplikasi mencatatnya sebagai deviasi yang harus diselidiki.</p>
          {dexlite && dexlite.lalu > 0 && tk !== null && (
            <p className="lp-p">Satu catatan yang perlu diperhatikan: BBM Dexlite. Total {rentangBulan(k.bulanKini)} {naikTurun(ubah(dexlite.lalu, dexlite.kini))} dari {angka(dexlite.lalu)} liter ({tk - 1}) menjadi {angka(dexlite.kini)} liter ({tk}), sekitar {tandaPersen(ubah(dexlite.lalu, dexlite.kini))}.{bensin && bensin.lalu > 0 ? ` Bensin ${naikTurun(ubah(bensin.lalu, bensin.kini))} dari ${angka(bensin.lalu)} menjadi ${angka(bensin.kini)} liter${bensin.bulanKini < k.bulanKini.length ? ` (data ${tk} baru ${bensin.bulanKini} bulan)` : ''}.` : ''}</p>
          )}
          {k.devBukaPerEnpi.length > 0
            ? <p className="lp-p">Register deviasi saat ini mencatat {k.devBuka.length} deviasi yang belum ditutup: {k.devBukaPerEnpi.map((x) => `${x.enpi} (${x.n})`).join(', ')}. “Auditor lebih menghargai deviasi yang diselidiki daripada data yang terlihat sempurna tanpa penjelasan,” kata KIRA.</p>
            : <p className="lp-p">Saat ini tidak ada deviasi terbuka di register. “Pertahankan,” kata KIRA, “tetapi tetap periksa setiap bulan.”</p>}
          <h3 className="lp-h3">Empat cermin di klausul 9</h3>
          <ol className="lp-poin">
            <li><b>Pemantauan dan analisis (9.1).</b> EnPI dihitung bulanan, dibandingkan baseline, deviasi signifikan diselidiki dan dicatat penyebab serta tindakannya.</li>
            <li><b>Evaluasi kepatuhan (9.1.2).</b> Secara berkala periksa apakah KINRA mematuhi peraturan energi yang berlaku. Catat statusnya: patuh atau belum, bukti, dan tindak lanjut.</li>
            <li><b>Audit internal (9.2).</b> Tim internal auditor memeriksa seluruh klausul 4–10 sebelum auditor eksternal datang.{ia ? ` Jadwal: ${tglTg(ia)}.` : ''}</li>
            <li><b>Tinjauan manajemen (9.3).</b> Pimpinan duduk bersama{tm ? ` pada ${tglTg(tm)}` : ''} membahas status aksi sebelumnya, perubahan isu dan risiko, kinerja EnPI terhadap target, hasil audit internal, kepatuhan regulasi, dan peluang perbaikan. Keluarannya keputusan: sumber daya, perubahan sasaran, atau tindakan baru.</li>
          </ol>
          <Kotak jenis="kira"><p>Audit internal bukan untuk mencari kesalahan orang. Ia “gladi resik” agar kekurangan ditemukan oleh kita sendiri, bukan oleh TÜV. Temuan audit internal yang ditindaklanjuti dengan baik justru menjadi bukti bahwa sistem bekerja.</p></Kotak>
          <Kotak jenis="auditor">
            {k.devBukaPerEnpi[0] && <Tanya q={`Ada deviasi ${k.devBukaPerEnpi[0].enpi}. Apa yang sudah dilakukan?`}>Deviasinya tercatat di register deviasi dan sedang kami selidiki penyebabnya. Tindakan dan PIC-nya tercatat di halaman Kinerja Energi.</Tanya>}
            <Tanya q="Tunjukkan hasil evaluasi kepatuhan regulasi.">Tunjukkan Formulir Evaluasi Kepatuhan beserta daftar persyaratan hukumnya.</Tanya>
            <Tanya q="Apa keputusan tinjauan manajemen terakhir?">Tunjukkan notulen RTM yang memuat semua input dan output wajib.</Tanya>
          </Kotak>
          <Kotak jenis="bukti"><p>Aplikasi: Kinerja Energi (register deviasi), Temuan Audit, Timeline. Dokumen: Program dan Rencana Audit Internal, laporan audit internal, notulen dan presentasi Tinjauan Manajemen.</p></Kotak>
          <DaftarPr items={k.pr.b9} />
        </Bab>

        {/* ── 10 Temuan ────────────────────────────────────────── */}
        <Bab no="10" eyebrow="Bab sepuluh" judul="Saat ada yang salah" acuan="Klausul 10 · Ketidaksesuaian, tindakan korektif, peningkatan berkelanjutan">
          <p className="lp-lead">Audit internal menemukan sesuatu: misalnya register meter belum mencantumkan tanggal kalibrasi. Anda panik. KIRA menenangkan: “Temuan itu normal. Yang dinilai auditor adalah apa yang kita lakukan sesudahnya.”</p>
          {k.temuan.length > 0 && <p className="lp-p">Sejauh ini tercatat {k.temuan.length} temuan ({k.temuanKategori.filter((x) => x.n).map((x) => `${x.k} ${x.n}`).join(', ')}), {k.temuanBuka.length} di antaranya belum tertutup.</p>}
          <h3 className="lp-h3">Lima langkah menangani temuan</h3>
          <table className="lp-tbl lp-rapat">
            <thead><tr><th>#</th><th>Langkah</th><th>Contoh: tanggal kalibrasi meter kosong</th></tr></thead>
            <tbody>
              <tr><th>1</th><td>Perbaiki segera (koreksi)</td><td>Kumpulkan sertifikat kalibrasi yang ada dan isi kolom register.</td></tr>
              <tr><th>2</th><td>Cari akar masalah</td><td>Tanya “mengapa” berulang kali: belum ada prosedur kalibrasi dan belum ada PIC data meter.</td></tr>
              <tr><th>3</th><td>Tindakan korektif</td><td>Tetapkan PIC, buat jadwal kalibrasi tahunan, tambahkan pengingat.</td></tr>
              <tr><th>4</th><td>Periksa efektivitas</td><td>Cek bulan berikutnya: apakah semua meter sudah terjadwal dan bukti tersedia?</td></tr>
              <tr><th>5</th><td>Catat dan tutup</td><td>Tutup di formulir PTPP dan halaman Temuan Audit (Terbuka → Tertutup).</td></tr>
            </tbody>
          </table>
          <Kotak jenis="kira">
            <p><b>Mayor:</b> sebuah persyaratan tidak dijalankan sama sekali atau sistem gagal di satu bagian. Ini bisa menunda sertifikat. <b>Minor:</b> sebagian kecil belum sesuai, sistem tetap berjalan. <b>Observasi/OFI:</b> saran perbaikan, bukan kesalahan. Usahakan temuan mayor ditutup paling lama 30 hari.</p>
            <p><b>Peningkatan berkelanjutan (10.2)</b> berarti kinerja energi harus membaik dari waktu ke waktu dan bisa dibuktikan, misalnya penghematan terverifikasi dari rencana aksi.</p>
          </Kotak>
          <Kotak jenis="auditor">
            <Tanya q="Tunjukkan satu temuan audit internal dan bagaimana ditutup.">Buka halaman Temuan Audit, pilih satu temuan, tunjukkan akar masalah, tindakan, bukti, dan tanggal penutupan.</Tanya>
            <Tanya q="Apa bukti kinerja energi KINRA membaik?">Tunjukkan {utama?.enpi.kode ?? 'EnPI utama'} dibanding baseline, dan penghematan terverifikasi dari rencana aksi yang selesai.</Tanya>
          </Kotak>
          <DaftarPr items={k.pr.b10} />
        </Bab>

        {/* ── 11 Hari H ────────────────────────────────────────── */}
        <Bab no="11" eyebrow="Bab sebelas" judul="Hari H: menghadapi auditor" acuan={`${s1?.nama ?? 'TÜV Stage 1'} (${tglTg(s1)}) dan ${s2?.nama ?? 'TÜV Stage 2'} (${tglTg(s2)})`}>
          <p className="lp-lead">Malam sebelum audit, Anda membuka aplikasi sekali lagi. KIRA berkata: “Auditor itu bukan polisi. Ia tamu yang ingin dibuktikan bahwa cerita kita benar. Ceritakan apa adanya, lalu tunjukkan buktinya.”</p>
          <div className="lp-dua">
            <div className="kb-stage"><span className="lp-eyebrow">Stage 1 · {tglTg(s1)}</span><p>Auditor memeriksa kesiapan: dokumen wajib, lingkup dan batas, tinjauan energi, SEU, EnPI, EnB, sasaran, rencana audit internal dan RTM. Hasilnya daftar hal yang harus diperbaiki sebelum Stage 2.</p></div>
            <div className="kb-stage"><span className="lp-eyebrow">Stage 2 · {tglTg(s2)}</span><p>Auditor memeriksa penerapan: wawancara pimpinan sampai operator, kunjungan ke WTP dan WWTP, rekaman terisi, temuan audit internal, hasil RTM. Bila lolos, sertifikat berlaku 3 tahun dengan audit pengawasan tiap tahun.</p></div>
          </div>
          <h3 className="lp-h3">Tujuh aturan emas saat diwawancara</h3>
          <ol className="lp-poin">
            <li><b>Dengarkan sampai selesai.</b> Jawab hanya yang ditanya, singkat dan jelas.</li>
            <li><b>Jujur.</b> “Itu belum selesai, rencananya …” jauh lebih baik daripada mengarang.</li>
            <li><b>Tunjukkan, jangan hanya bercerita.</b> Setiap jawaban sebaiknya diikuti dokumen atau layar aplikasi.</li>
            <li><b>Tidak tahu?</b> Katakan “boleh saya cek dulu” atau “itu ditangani Bagian X”. Jangan menebak.</li>
            <li><b>Bicara tentang pekerjaan Anda sendiri.</b> Jelaskan apa yang Anda kerjakan dan kaitannya dengan energi.</li>
            <li><b>Jangan berdebat.</b> Bila tidak setuju dengan temuan, jelaskan dengan bukti secara tenang.</li>
            <li><b>Catat.</b> Pendamping mencatat pertanyaan dan permintaan bukti agar bisa ditindaklanjuti.</li>
          </ol>
          <h3 className="lp-h3">Siapa ditanya apa</h3>
          <table className="lp-tbl lp-rapat">
            <thead><tr><th>Peran</th><th>Topik yang hampir pasti ditanya</th><th>Siapkan</th></tr></thead>
            <tbody>
              <tr><th>Direksi / pimpinan puncak</th><td>Alasan menerapkan SMEn, kebijakan energi, sumber daya, hasil RTM</td><td>Kebijakan bertanda tangan, notulen RTM, Ringkasan Direksi</td></tr>
              <tr><th>MR / Manajer Energi</th><td>Lingkup, tinjauan energi, SEU, EnPI, EnB, sasaran, deviasi</td><td>Tinjauan Energi & SEU, Kinerja Energi, Sasaran & Aksi</td></tr>
              <tr><th>Bagian M/E, operator WTP/WWTP</th><td>Parameter kritis, tindakan saat menyimpang, pembacaan meter, pelatihan</td><td>Lembar kendali operasi, register meter, daftar hadir pelatihan</td></tr>
              <tr><th>Pengadaan / proyek</th><td>Kriteria energi saat membeli atau mendesain</td><td>Formulir pertimbangan energi, contoh spesifikasi</td></tr>
              <tr><th>Bagian Umum</th><td>Pemakaian BBM kendaraan dan penyebab perubahannya</td><td>Data BBM, hasil penyelidikan deviasi</td></tr>
              <tr><th>Pengendali dokumen</th><td>Penomoran, versi, persetujuan, distribusi dokumen</td><td>Daftar Induk Dokumen, Kesiapan Audit</td></tr>
            </tbody>
          </table>
          <Kotak jenis="latihan"><p>Buka menu Tanya Jawab Audit atau tombol Tanya KIRA untuk simulasi wawancara. KIRA akan berperan sebagai auditor dan bertanya sesuai data terbaru. Targetnya: setiap unit auditee berlatih minimal sekali sebelum {s1 && s1.tanggal >= kini ? tglTg(s1) : tglTg(s2)}.</p></Kotak>
        </Bab>

        {/* ── Lampiran A ───────────────────────────────────────── */}
        <Bab no="A" eyebrow="Lampiran" judul="Peta bukti per klausul" acuan="Saat auditor menyebut nomor klausul, buka baris ini">
          <table className="lp-tbl lp-rapat">
            <thead><tr><th>Klausul</th><th>Pertanyaan intinya</th><th>Dokumen / rekaman</th><th>Menu aplikasi</th></tr></thead>
            <tbody>
              {[
                ['4.1–4.2', 'Apa konteks dan siapa yang berkepentingan?', 'Formulir isu, pihak berkepentingan, daftar persyaratan hukum', 'Isu & Peluang'],
                ['4.3', 'Di mana pagarnya?', 'F-4.3-01 Ruang Lingkup & Batasan', 'Aset & Meter, Peta SMEn'],
                ['5.1–5.3', 'Apakah pimpinan terlibat dan peran jelas?', 'Kebijakan energi, SK Tim SMEn, struktur organisasi, komitmen manajemen', 'Ringkasan Direksi'],
                ['6.1', 'Apa risiko dan peluangnya?', 'Formulir risiko, formulir peluang', 'Isu & Peluang'],
                ['6.2', 'Apa janjinya dan bagaimana dicapai?', 'Formulir tujuan, target, rencana tindakan', 'Sasaran & Aksi'],
                ['6.3', 'Ke mana energi pergi?', 'Laporan tinjauan energi, formulir SEU', 'Tinjauan Energi & SEU'],
                ['6.4–6.5', 'Apa penggaris dan titik nolnya? Apakah kinerja membaik?', 'Formulir EnPI & baseline, catatan penyesuaian', 'Kinerja Energi, Lab EnPI'],
                ['6.6', 'Data apa dikumpulkan, oleh siapa?', 'Rencana pengumpulan data, jadwal kalibrasi', 'Aset & Meter, Data Energi'],
                ['7.1–7.4', 'Apakah orang siap dan paham?', 'Formulir kompetensi, pelatihan, kesadaran, komunikasi', 'Kesiapan Audit'],
                ['7.5', 'Apakah dokumen terkendali?', 'Daftar Induk Dokumen, log distribusi dan perubahan', 'Kesiapan Audit, Peta Evidence'],
                ['8.1–8.3', 'Apakah SEU dioperasikan dengan benar?', 'Pengendalian operasional, desain, pengadaan', 'Simulasi Pompa & VSD'],
                ['9.1', 'Bagaimana kinerja dipantau?', 'Pemantauan kinerja, register deviasi', 'Kinerja Energi'],
                ['9.1.2', 'Apakah patuh regulasi?', 'Formulir evaluasi kepatuhan', '–'],
                ['9.2', 'Apakah sudah memeriksa diri?', 'Program, rencana, checklist, laporan audit internal', 'Temuan Audit, Timeline'],
                ['9.3', 'Apa keputusan pimpinan?', 'Notulen dan presentasi RTM', 'Ringkasan Direksi'],
                ['10.1–10.2', 'Bagaimana kesalahan diperbaiki?', 'PTPP, logbook PTPP, formulir peningkatan', 'Temuan Audit, Sasaran & Aksi'],
              ].map(([a, b, c, dd]) => <tr key={a}><th>{a}</th><td>{b}</td><td>{c}</td><td>{dd}</td></tr>)}
            </tbody>
          </table>
          <p className="lp-catatan">Menu Ruang Auditor di aplikasi merangkum bukti per klausul untuk ditunjukkan langsung kepada auditor dengan akun Pembaca.</p>
        </Bab>

        {/* ── Lampiran B ───────────────────────────────────────── */}
        <Bab no="B" eyebrow="Lampiran" judul="Daftar pekerjaan rumah sebelum audit" acuan={`Dihitung otomatis dari data aplikasi per ${dicetak} WIB`}>
          {grupPr.length ? grupPr.map(({ g, items }) => (
            <div key={g} className="kb-grup-pr">
              <h3 className="lp-h3">{g === 'segera' ? 'Segera' : `Sebelum ${NAMA_BATAS[g]}${k.tg(g) ? ` (${tanggal(k.tg(g)!.tanggal, 'panjang')})` : ''}`}</h3>
              <ul className="kb-cek">{items.map((p) => <li key={p.teks}>{p.prioritas && <b>Prioritas: </b>}{p.teks}</li>)}</ul>
            </div>
          )) : <p className="lp-p">Tidak ada pekerjaan rumah yang terdeteksi dari data. Tetap periksa hal yang tidak tercatat di aplikasi, seperti sosialisasi kebijakan dan latihan wawancara.</p>}
          <p className="lp-catatan">Daftar ini hanya memuat hal yang dapat diperiksa dari data aplikasi (status SEU, register meter, skor risiko, evidence dokumen, deviasi, temuan, sasaran, rencana aksi). Hal yang tidak tercatat di aplikasi tetap perlu dicek dengan checklist sertifikasi.</p>
        </Bab>

        {/* ── Lampiran C ───────────────────────────────────────── */}
        <Bab no="C" eyebrow="Lampiran" judul="Kamus mini dan kartu saku" acuan="Istilah dengan bahasa sehari-hari">
          <table className="lp-tbl lp-rapat">
            <thead><tr><th>Istilah</th><th>Artinya dengan bahasa sehari-hari</th></tr></thead>
            <tbody>
              {[
                ['SMEn / EnMS', 'Sistem Manajemen Energi: cara teratur mengelola energi, dari rencana sampai perbaikan.'],
                ['PDCA', 'Plan-Do-Check-Act: rencanakan, kerjakan, periksa, perbaiki. Diulang terus.'],
                ['Tinjauan energi', 'Pemeriksaan kesehatan energi: sumber, pemakai, jumlah, faktor penyebab, peluang hemat.'],
                ['SEU', `Pemakai energi yang signifikan. Di KINRA: ${k.seuAktif.map((s) => s.nama.replace(/\s*\(.*\)/, '')).join(' dan ') || '–'}.`],
                ['EnPI', 'Penggaris kinerja energi, misalnya kWh per m³ air.'],
                ['EnB / baseline', `Titik nol pembanding. KINRA memakai ${utama ? utama.enpi.baseline_mulai.slice(0, 4) : 'tahun acuan'}.`],
                ['Variabel relevan', 'Faktor yang wajar memengaruhi konsumsi: volume air, jam operasi, km tempuh.'],
                ['Faktor statis', 'Hal yang biasanya tetap tetapi bila berubah memengaruhi energi: jumlah gedung, kapasitas instalasi, lingkup.'],
                ['Normalisasi', 'Menyamakan kondisi agar perbandingan adil.'],
                ['Deviasi', 'Kinerja yang melenceng jauh dari harapan dan wajib diselidiki.'],
                ['CUSUM', 'Jumlah kumulatif selisih aktual dan harapan. Garis turun berarti hemat, naik berarti boros.'],
                ['Faktor kali', 'Pengali angka di layar meter untuk mendapat kWh sebenarnya.'],
                ['VSD', 'Pengatur kecepatan motor pompa agar putaran mengikuti kebutuhan, bukan selalu penuh.'],
                ['M&V', 'Pengukuran dan verifikasi: cara membuktikan bahwa penghematan benar terjadi.'],
                ['PTPP', 'Permintaan Tindakan Perbaikan dan Pencegahan: formulir menangani temuan sampai akar masalah.'],
                ['RTM', 'Rapat Tinjauan Manajemen: pimpinan meninjau dan memutuskan arah SMEn.'],
                ['Mayor / minor / OFI', 'Tingkat temuan: berat, ringan, atau sekadar saran.'],
              ].map(([a, b]) => <tr key={a}><th>{a}</th><td>{b}</td></tr>)}
            </tbody>
          </table>
          <div className="kb-saku">
            <span className="lp-eyebrow">Kartu saku · gunting dan simpan</span>
            <div className="lp-dua">
              <div>
                <b>Cerita KINRA dalam 5 kalimat</b>
                <ol>
                  <li>Batas SMEn: aset KINRA dengan {nMeter} meter, tenant di luar.</li>
                  <li>Listrik KINRA {tp ?? '–'}: {juta(k.kwhPenuh)} (±{rupiahRingkas(k.rupiahPenuh)}).</li>
                  <li>SEU: {k.seuAktif.map((s) => `${s.kode} ±${angka(s.porsi)}%`).join(' dan ') || '–'}.</li>
                  <li>EnPI utama: {utama ? `${utama.enpi.kode}, ${utama.enpi.nama.charAt(0).toLowerCase()}${utama.enpi.nama.slice(1)}` : '–'}. Baseline {utama?.enpi.baseline_mulai.slice(0, 4) ?? '–'}.{kinKini && d ? ` Listrik ${d.tahunB} ${tandaPersen(ubah(d.totalA, d.totalB))}, kinerja ${kinKini.seu} ${kinKini.nilai <= 0 ? 'lebih efisien' : 'lebih boros'}${kinKini.persen !== null ? ` ±${angka(Math.abs(kinKini.persen))}%` : ''}.` : ''}</li>
                  <li>Aksi nyata: {k.aksiUnggulan ? `${k.aksiUnggulan.uraian}, ±${angka(k.aksiUnggulan.estimasi_hemat_kwh)} kWh/tahun` : 'rencana aksi sedang disusun'}.</li>
                </ol>
              </div>
              <div>
                <b>Saat ditanya auditor</b>
                <ul>
                  <li>Dengar sampai selesai, jawab yang ditanya.</li>
                  <li>Jujur: “belum, rencananya …”</li>
                  <li>Tunjukkan bukti, bukan hanya cerita.</li>
                  <li>“Boleh saya cek dulu” lebih baik daripada menebak.</li>
                  <li>Tenang. Temuan adalah bahan perbaikan.</li>
                </ul>
              </div>
            </div>
          </div>
          <p className="lp-catatan">Disusun otomatis dari data Dashboard SMEn KINRA per {dicetak} WIB. Angka energi dari kWh bacaan meter aset; rupiah memakai tarif Rp{angka(kv.tarifListrik, 2)}/kWh. Buku ini panduan belajar, bukan pengganti teks standar SNI ISO 50001:2018 maupun prosedur resmi KINRA.</p>
        </Bab>
      </article>
    </section>
  )
}
