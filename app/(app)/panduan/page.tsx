import { Droplets, Activity, BadgeCheck, ShieldCheck, BookA, BookOpen, Clapperboard, Fan, FlaskConical, MessagesSquare, Bot, CalendarRange, CircleCheck, ClipboardCheck, FileText, Gauge, KeyRound, LayoutDashboard, Minus, Network, ScanSearch, SearchCheck, ShieldAlert, Target, Users, Building2, Crosshair, Map as IkonPeta, Presentation } from 'lucide-react'
import { FITUR_FORMULIR } from '@/lib/fitur'
import Link from 'next/link'
import { Chip } from '@/components/Chip'
import { SectionHead } from '@/components/SectionHead'
import { AKSES, type Aksi, boleh, DAFTAR_PERAN, LABEL_AKSI, LABEL_PERAN, type Peran } from '@/lib/akses'
import { tanggal } from '@/lib/format'
import { penggunaSaya } from '@/lib/sesi'
import { GLOSARIUM } from '@/lib/glosarium'
import { ambilKegiatan } from '@/lib/data'
import { tonggakDari } from '@/lib/status'

const BAB = [
  { id: 'apa', h: 'What', judul: 'Apa', ket: 'isi aplikasi' },
  { id: 'mengapa', h: 'Why', judul: 'Mengapa', ket: 'tujuan & manfaat' },
  { id: 'siapa', h: 'Who', judul: 'Siapa', ket: 'peran & hak akses' },
  { id: 'kapan', h: 'When', judul: 'Kapan', ket: 'jadwal & rutinitas' },
  { id: 'dimana', h: 'Where', judul: 'Di mana', ket: 'letak data & menu' },
  { id: 'bagaimana', h: 'How', judul: 'Bagaimana', ket: 'langkah kerja' },
]

const MODUL = [
  { href: '/', ikon: LayoutDashboard, nama: 'Ringkasan', klausul: 'Gambaran besar', isi: 'Skor kesiapan, tren & proyeksi menuju audit, insight prioritas, beban PIC, aktivitas terbaru, dan cuplikan kinerja energi.' },
  { href: '/direksi', ikon: Presentation, nama: 'Ringkasan Direksi', klausul: 'Klausul 5.1, 7.4, 9.3', isi: 'Satu halaman siap cetak untuk direksi: angka kunci (termasuk rupiah dan CO₂), perubahan terbesar bulan ini, keputusan yang dibutuhkan, dan status menuju sertifikasi.' },
  { href: '/peta', ikon: IkonPeta, nama: 'Peta SMEn', klausul: 'Klausul 4–10', isi: 'Mulai di sini bila baru mengenal SMEn: 12 langkah siklus PDCA dengan penjelasan awam, kondisi KINRA saat ini, pertanyaan auditor, dan langkah berikutnya.' },
  { href: '/kesiapan', ikon: ClipboardCheck, nama: 'Kesiapan Audit', klausul: 'Klausul 4–10', isi: 'Lembar monitoring semua dokumen dan rekaman yang akan diperiksa auditor: PIC, tenggat, berkas evidence, penanda versi sah, status Final, unduh CSV. Skor kesiapan = dokumen Final yang punya berkas versi sah.' },
  { href: '/dependensi', ikon: Network, nama: 'Peta Evidence', klausul: 'Klausul 4–10', isi: 'Diagram hubungan antardokumen: dokumen mana yang menjadi masukan bagi dokumen lain, status evidence masing-masing, dan dokumen yang tertahan karena masukannya belum lengkap.' },
  { href: '/auditor', ikon: ScanSearch, nama: 'Ruang Auditor', klausul: 'Klausul 9.2 · Stage 1', isi: 'Tampilan hanya-baca per klausul untuk auditor internal dan TÜV: dokumen wajib di atas, berkas evidence langsung dibuka, temuan terbuka, dan dokumen yang menjadi dasarnya.' },
  ...(FITUR_FORMULIR ? [{ href: '/formulir', ikon: FileText, nama: 'Formulir', klausul: 'Klausul 4–10', isi: 'Semua formulir SMEn diisi langsung di aplikasi: buat isian, isi tabel, ajukan, setujui, lalu cetak atau simpan sebagai PDF.' }] : []),
  { href: '/tanya-jawab', ikon: MessagesSquare, nama: 'Tanya Jawab Audit', klausul: 'Klausul 4–10', isi: '65 contoh pertanyaan auditor internal per unit kerja, lengkap dengan jawaban, bukti objektif, dan indikator. Jawaban disembunyikan untuk latihan.' },
  { href: '/ruang-mr', ikon: BadgeCheck, nama: 'Ruang MR', klausul: 'Klausul 5.3, 9.2, 9.3, 10.1', isi: 'Bahan persiapan audit eksternal khusus MR/Steering Committee: pertanyaan auditor per fungsi MR di SK Tim SMEn, contoh jawaban, bukti, kesalahan yang dihindari, angka hidup yang harus dihafal, simulasi bersama KIRA, dan daftar periksa pribadi.' },
  { href: '/ruang-mrti', ikon: ShieldCheck, nama: 'Ruang Manajemen Risiko & TI', klausul: 'Klausul 4.1, 6.1, 6.6, 7.5', isi: 'Bahan persiapan audit untuk Bagian Manajemen Risiko & TI sebagai auditee: pertanyaan auditor tentang risiko, data energi, sistem informasi, dan dokumen digital, dengan contoh jawaban, angka hidup bagian, simulasi bersama KIRA, dan daftar periksa.' },
  { href: '/energi', ikon: Gauge, nama: 'Data Energi', klausul: 'Klausul 6.3', isi: 'Input konsumsi bulanan per sumber (PLN, PLTBG, PLTS, BBM), aliran energi, peta panas, dan tren antar tahun dalam Terajoule.' },
  { href: '/aset', ikon: Building2, nama: 'Aset & Meter', klausul: 'Klausul 6.3, 6.6, 9.1', isi: 'Register aset gedung/fasilitas dan sembilan meter energi KINRA, bacaan stand bulanan dengan faktor kali (mis. WTP ×200), jadwal kalibrasi meter, serta pemeriksaan otomatis kualitas data bacaan (bulan kosong, stand janggal, konsumsi di luar pola).' },
  { href: '/tinjauan', ikon: Crosshair, nama: 'Tinjauan Energi & SEU', klausul: 'Klausul 6.3', isi: 'Pareto pengguna energi KINRA, kandidat dan register SEU beserta alasan, variabel, EnPI, PIC, dan personel; kualitas data dan catatan tinjauan berkala. Penetapan SEU dan persetujuan tinjauan hanya oleh admin atau konsultan.' },
  { href: '/alur-wtp', ikon: Droplets, nama: 'Alur Proses WTP', klausul: 'Klausul 6.3, 6.6', isi: 'Gambar alir WTP KEK Sei Mangkei per tahap (intake, settling pit, lamella, clarifier, filter, reservoir, distribusi, hydrant, jalur PKS), dipetakan ke register pompa, jam operasi, meter kWh, dan water meter, beserta pertanyaan terbuka untuk Bagian M/E.' },
  { href: '/kinerja', ikon: Activity, nama: 'Kinerja Energi', klausul: 'Klausul 6.4 & 6.5', isi: 'EnPI dan baseline energi (EnB): aktual vs harapan, CUSUM, uji kelayakan model, input variabel relevan bulanan, dan register deviasi signifikan beserta penyelidikannya (klausul 9.1).' },
  { href: '/sasaran', ikon: Target, nama: 'Sasaran & Aksi', klausul: 'Klausul 6.2', isi: 'Satu sasaran per EnPI lingkup KINRA (bukan EnPI kawasan yang memuat tenant). Setiap rencana aksi terhubung ke sasarannya, lengkap dengan PIC, tenggat, dan penghematan terverifikasi.' },
  { href: '/register', ikon: ShieldAlert, nama: 'Isu & Peluang', klausul: 'Klausul 4.1, 6.1', isi: 'Register isu internal/eksternal dengan matriks risiko 5×5 dan daftar peluang peningkatan kinerja energi.' },
  { href: '/temuan', ikon: SearchCheck, nama: 'Temuan Audit', klausul: 'Klausul 9.2 & 10.1', isi: 'Catatan temuan Internal Audit dan TÜV beserta tindakan perbaikan sampai tertutup.' },
  { href: '/timeline', ikon: CalendarRange, nama: 'Timeline', klausul: 'Pendampingan', isi: 'Gantt kegiatan pendampingan SMEn Rev.3, penanda kegiatan selesai, tautan kegiatan ke klausul/dokumen, serta kendala dan tindak lanjut (PICA).' },
  { href: '/lab-enpi', ikon: FlaskConical, nama: 'Laboratorium EnPI', klausul: 'Klausul 6.4 & 6.5', isi: 'Eksperimen dengan data nyata WTP I: bandingkan metode, variabel, dan baseline EnPI, lalu suntikkan gangguan untuk berlatih membaca CUSUM dan deviasi. Tidak ada data yang diubah.' },
  { href: '/pompa-vsd', ikon: Fan, nama: 'Simulasi Pompa & VSD', klausul: 'Klausul 6.1, 6.2', isi: 'Bandingkan dua cara mengurangi debit pompa WTP: menutup katup pada 50 Hz atau menurunkan putaran dengan VSD, beserta dampaknya pada kW. Dipakai untuk menilai peluang dan rencana aksi.' },
  { href: '/cerita-energi', ikon: Clapperboard, nama: 'Cerita Energi KINRA', klausul: 'Klausul 7.3, 7.4', isi: 'Tayangan singkat ke mana energi KINRA mengalir dan proporsi pemakaiannya, untuk sosialisasi karyawan, layar lobi, dan pembuka rapat. Angka ikut terbarui dari data meter.' },
  { href: '/glosarium', ikon: BookA, nama: 'Glosarium', klausul: 'Istilah', isi: 'Arti istilah ISO 50001 dan singkatan yang dipakai di aplikasi, masing-masing dengan tautan ke halaman terkait.' },
]

const ISTILAH_INTI = ['SMEn', 'Evidence', 'EnPI', 'EnB', 'Variabel relevan', 'SEU', 'CUSUM', 'CV(RMSE)']

function Langkah({ judul, peran, langkah, href }: { judul: string; peran: string; langkah: string[]; href?: string }) {
  return (
    <div className="card pd-cara">
      <div className="row">
        <div><h3>{judul}</h3><p className="muted small">{peran}</p></div>
        {href && <Link className="btn kecil" href={href}>Buka</Link>}
      </div>
      <ol className="pd-langkah">{langkah.map((l) => <li key={l}>{l}</li>)}</ol>
    </div>
  )
}

export default async function Panduan() {
  const [saya, kegiatan] = await Promise.all([penggunaSaya(), ambilKegiatan()])
  const tonggak = tonggakDari(kegiatan)
  const peran = saya?.peran as Peran | undefined
  const bisa = (Object.keys(AKSES) as Aksi[]).filter((a) => boleh(peran, a))

  return (
    <>
      <section>
        <div className="ks-kepala">
          <SectionHead hero eyebrow="Panduan pengguna · 5W1H" judul={<>Memahami aplikasi <span className="ks-sorot">SMEn KINRA</span> dalam enam pertanyaan</>}>
            <p className="muted">Apa isi aplikasi ini, mengapa dipakai, siapa mengerjakan apa, kapan harus diisi, di mana datanya, dan bagaimana caranya. Baca berurutan atau lompat ke bagian yang Anda perlukan.</p>
          </SectionHead>
        </div>

        <nav className="pd-bab" aria-label="Bagian panduan">
          {BAB.map((b, i) => (
            <a key={b.id} href={`#${b.id}`} style={{ '--i': i } as React.CSSProperties}>
              <span className="pd-huruf" aria-hidden="true">{b.h[0]}</span>
              <span><b>{b.judul}</b><span className="muted small">{b.h} · {b.ket}</span></span>
            </a>
          ))}
        </nav>

        {saya && peran && (
          <div className="card pd-saya">
            <div className="row">
              <div>
                <span className="eyebrow">Peran Anda</span>
                <h3>{saya.nama} · {LABEL_PERAN[peran]}</h3>
                <p className="muted small">{bisa.length ? `Anda dapat melakukan ${bisa.length} dari ${Object.keys(AKSES).length} jenis tindakan berikut. Selebihnya hanya bisa dilihat.` : 'Anda dapat melihat semua halaman dan mengunduh CSV, tanpa mengubah data.'}</p>
              </div>
              <Chip kode="info" label={LABEL_PERAN[peran]} />
            </div>
            {bisa.length > 0 && <div className="pd-tag">{bisa.map((a) => <span key={a}><CircleCheck aria-hidden="true" />{LABEL_AKSI[a]}</span>)}</div>}
          </div>
        )}
      </section>

      <section id="apa" className="pd-bagian">
        <SectionHead no="W1" eyebrow="What · Apa" judul="Satu tempat untuk seluruh pekerjaan SMEn ISO 50001">
          <p className="muted">Dashboard Sistem Manajemen Energi PT Kawasan Industri Nusantara (KEK Sei Mangkei). Aplikasi ini menggantikan spreadsheet terpisah untuk monitoring dokumen, data energi, EnPI, sasaran, risiko, temuan, dan jadwal pendampingan.</p>
        </SectionHead>
        <div className="pd-modul">
          {MODUL.filter((m) => (m.href !== '/ruang-mr' || boleh(peran, 'ruangmr.lihat')) && (m.href !== '/ruang-mrti' || boleh(peran, 'ruangmrti.lihat'))).map((m, i) => (
            <Link key={m.href} href={m.href} className="pd-modul-item" style={{ '--i': i } as React.CSSProperties}>
              <span className="tile-ikon"><m.ikon aria-hidden="true" /></span>
              <span className="eyebrow">{m.klausul}</span>
              <b>{m.nama}</b>
              <span className="muted small">{m.isi}</span>
            </Link>
          ))}
        </div>
      </section>

      <section id="mengapa" className="pd-bagian">
        <SectionHead no="W2" eyebrow="Why · Mengapa" judul="Agar siap audit sertifikasi dan penghematan energi bisa dibuktikan" />
        <div className="insights">
          <div className="insight positif"><span className="area">Satu sumber kebenaran</span><h3>Tidak ada lagi versi file berbeda</h3><p>Semua tim melihat evidence dan angka yang sama secara langsung. Setiap unggahan tercatat siapa dan kapan.</p></div>
          <div className="insight"><span className="area">Siap diperiksa auditor</span><h3>Bukti tersusun per klausul</h3><p>Setiap dokumen terhubung ke klausul ISO 50001 dan berkas evidence yang bisa dibuka langsung di aplikasi, sehingga mudah ditunjukkan saat audit.</p></div>
          <div className="insight perhatian"><span className="area">Prioritas jelas</span><h3>Tahu apa yang harus dikerjakan</h3><p>Skor kesiapan, dokumen terlambat, klausul terlemah, dan proyeksi menunjukkan di mana tenaga paling dibutuhkan.</p></div>
          <div className="insight positif"><span className="area">Kinerja ternormalisasi</span><h3>Penghematan yang sah</h3><p>EnPI dibandingkan dengan baseline pada kondisi operasi yang sama, sehingga kenaikan beban tidak terbaca sebagai pemborosan.</p></div>
          <div className="insight"><span className="area">Perbaikan berkelanjutan</span><h3>Siklus PDCA tertutup</h3><p>Isu dan peluang menjadi sasaran, sasaran menjadi rencana aksi, temuan audit ditindaklanjuti sampai tertutup.</p></div>
          <div className="insight perhatian"><span className="area">Akuntabel</span><h3>Peran terpisah</h3><p>Yang menyusun dokumen tidak menyetujui sendiri. Persetujuan dan penutupan temuan dilakukan admin atau konsultan.</p></div>
        </div>
      </section>

      <section id="siapa" className="pd-bagian">
        <SectionHead no="W3" eyebrow="Who · Siapa" judul={`${DAFTAR_PERAN.length} peran dengan hak akses berbeda`}>
          <p className="muted">Akun dibuat oleh admin di menu Pengguna. Tabel di bawah dibaca langsung dari aturan akses aplikasi, jadi selalu sesuai dengan yang berlaku.</p>
        </SectionHead>
        <div className="pd-peran">
          {[
            { p: 'admin', ket: 'Pengelola aplikasi: semua tindakan, termasuk menghapus data dan mengelola akun pengguna.' },
            { p: 'konsultan', ket: 'Pendamping ISO 50001: menyusun EnPI dan sasaran baru, menyetujui dokumen, mencatat dan menutup temuan.' },
            { p: 'tim_kinra', ket: 'Pelaksana SMEn: melengkapi dokumen dan evidence, input data energi dan variabel, mengubah EnPI/baseline dan sasaran, menindaklanjuti temuan.' },
            { p: 'pembaca', ket: 'Akun bersama untuk seluruh bagian, direksi, atau auditor: melihat semua halaman dan mengunduh CSV tanpa mengubah data. Sandi diatur oleh admin dan tidak bisa diganti dari akun ini.' },
          ].map((x, i) => (
            <div key={x.p} className={`pd-peran-item${x.p === peran ? ' saya' : ''}`} style={{ '--i': i } as React.CSSProperties}>
              <Users aria-hidden="true" />
              <b>{LABEL_PERAN[x.p as Peran]}{x.p === peran && <span className="muted small"> · Anda</span>}</b>
              <span className="muted small">{x.ket}</span>
            </div>
          ))}
        </div>
        <div className="card" style={{ marginTop: 16 }}>
          <div className="table-wrap">
            <table className="tbl pd-matriks">
              <thead><tr><th>Tindakan</th>{DAFTAR_PERAN.map((p) => <th key={p} className={p === peran ? 'saya' : undefined}>{LABEL_PERAN[p]}</th>)}</tr></thead>
              <tbody>
                {(Object.keys(AKSES) as Aksi[]).map((a) => (
                  <tr key={a}>
                    <td>{LABEL_AKSI[a]}</td>
                    {DAFTAR_PERAN.map((p) => {
                      const ok = (AKSES[a] as Peran[]).includes(p)
                      return (
                        <td key={p} className={p === peran ? 'saya' : undefined}>
                          {ok ? <CircleCheck className="pd-ya" aria-label="boleh" /> : <Minus className="pd-tidak" aria-label="tidak" />}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="sumber">Semua peran yang login dapat melihat seluruh halaman. Aturan ini juga dikunci di database, jadi tidak bisa dilewati dari luar aplikasi.</p>
        </div>
      </section>

      <section id="kapan" className="pd-bagian">
        <SectionHead no="W4" eyebrow="When · Kapan" judul="Isi rutin sesuai frekuensi, kejar tonggak audit" />
        <div className="grid-2">
          <div className="card">
            <h3>Rutinitas</h3>
            <p className="muted small">Frekuensi yang disarankan agar data tetap mutakhir</p>
            <div className="tl" style={{ marginTop: 18 }}>
              {[
                { t: 'Setiap hari kerja', isi: 'Unggah berkas evidence di Kesiapan Audit begitu dokumen siap.' + (FITUR_FORMULIR ? ' Formulir yang diisi di aplikasi dicetak sebagai PDF lalu diunggah.' : '') },
                { t: 'Setiap minggu', isi: 'Cek halaman Ringkasan: dokumen terlambat, klausul terlemah, beban PIC. Tandai kegiatan timeline yang selesai.' },
                { t: 'Akhir/awal bulan', isi: 'Bagian M/E mencatat stand awal dan stand akhir kesembilan meter KINRA di Aset & Meter. Ini satu-satunya sumber EnPI-04, EnPI-05, dan EnPI-06; jangan dilewatkan.' },
                { t: 'Awal bulan (maks. tgl 10)', isi: 'Input konsumsi energi bulan lalu dari tagihan/meter dan data variabel relevan (air diolah WTP I, jumlah tenant), lalu cek EnPI di halaman Kinerja.' },
                { t: 'Setiap ada deviasi', isi: 'Bila Kinerja Energi menandai deviasi signifikan, selidiki penyebabnya, catat di register deviasi, dan tetapkan tindak lanjut sebelum bulan berikutnya (klausul 9.1).' },
                { t: 'Setiap triwulan', isi: 'Tinjau register isu & peluang, progres sasaran dan rencana aksi.' },
                { t: 'Sebelum audit', isi: 'Setiap unit auditee menjalankan minimal satu simulasi audit bersama KIRA, mulai dari Manajemen Puncak, MR, dan Manajer Energi.' },
                { t: 'Setelah audit', isi: 'Catat temuan dalam 1×24 jam, tetapkan PIC dan tenggat tindakan perbaikan.' },
              ].map((r, i, arr) => (
                <div key={r.t} className={`tl-item${i === 0 ? ' kini' : ''}`} style={i === arr.length - 1 ? { paddingBottom: 0 } : undefined}>
                  <span className="tgl">{r.t}</span>
                  <span className="titik"><i /></span>
                  <span className="isi small ink-2">{r.isi}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <h3>Tonggak sertifikasi</h3>
            <p className="muted small">Diambil dari jadwal di halaman Timeline</p>
            <div className="list" style={{ marginTop: 10 }}>
              {tonggak.map((t) => (
                <div key={t.kode}>
                  <span className="mono small" style={{ width: 104 }}>{tanggal(t.tanggal)}</span>
                  <span className="grow"><b>{t.nama}</b></span>
                </div>
              ))}
            </div>
            <p className="muted small" style={{ marginTop: 12 }}>Target: semua dokumen wajib ISO berstatus Final dan punya berkas versi sah sebelum TÜV Stage 1. Hitung mundur selalu tampil di bilah atas.</p>
            <Link className="btn kecil" href="/timeline" style={{ marginTop: 12 }}>Lihat timeline lengkap</Link>
          </div>
        </div>
      </section>

      <section id="dimana" className="pd-bagian">
        <SectionHead no="W5" eyebrow="Where · Di mana" judul="Data dan berkas bukti tersimpan di aplikasi" />
        <div className="grid-2">
          <div className="card">
            <div className="row"><div><h3>Aplikasi (database SMEn)</h3><p className="muted small">Bisa dibuka dari browser laptop maupun ponsel</p></div></div>
            <p className="ink-2 small">Menyimpan status dokumen, berkas evidence (maks. 50 MB per berkas, bisa dilihat langsung), data energi, variabel, EnPI, sasaran, register, temuan, dan riwayat perubahan. Akses wajib login; sesi berlaku 12 jam.</p>
          </div>
          <div className="card">
            <div className="row"><div><h3>Berkas evidence</h3><p className="muted small">Diunggah per dokumen, bisa banyak sekaligus</p></div></div>
            <p className="ink-2 small">Buka halaman dokumen, lalu seret beberapa berkas sekaligus ke kotak unggah. Berkas tersimpan privat dan hanya bisa dibuka pengguna yang login. Berkas di atas 50 MB perlu dikompres atau dipecah dulu.</p>
          </div>
        </div>
        <div className="card" style={{ marginTop: 16 }}>
          <h3>Saya ingin… buka menu apa?</h3>
          <div className="table-wrap" style={{ marginTop: 10 }}>
            <table className="tbl">
              <thead><tr><th>Kebutuhan</th><th>Menu</th></tr></thead>
              <tbody>
                {[
                  ['Melihat seberapa siap kita untuk audit', '/', 'Ringkasan'],
                  ['Mengunggah evidence dokumen', '/kesiapan', 'Kesiapan Audit → klik nama dokumen'],
                  ['Menandai berkas versi sah dan mengesahkan dokumen', '/kesiapan', 'Kesiapan Audit → panel berkas → status Final'],
                  ['Mencatat bacaan stand meter bulanan', '/aset', 'Aset & Meter → bacaan meter'],
                  ...(FITUR_FORMULIR ? [['Mengisi formulir SMEn (isu, SEU, kompetensi, notulen RTM, dll.)', '/formulir', 'Formulir → pilih formulir → Buat isian']] : []),
                  ['Mengisi konsumsi listrik/BBM bulanan', '/energi', 'Data Energi → tabel input'],
                  ['Mengisi data variabel relevan, mengubah EnPI atau baseline', '/kinerja', 'Kinerja Energi'],
                  ['Mencatat penyelidikan deviasi energi', '/kinerja', 'Kinerja Energi → deviasi'],
                  ['Menetapkan SEU dan menyetujui tinjauan energi', '/tinjauan', 'Tinjauan Energi & SEU'],
                  ['Memperbarui progres rencana aksi', '/sasaran', 'Sasaran & Aksi'],
                  ['Menambah atau menilai isu dan peluang', '/register', 'Isu & Peluang'],
                  ['Menindaklanjuti temuan audit', '/temuan', 'Temuan Audit'],
                  ['Menandai kegiatan pendampingan selesai', '/timeline', 'Timeline'],
                  ['Mencari arti istilah ISO 50001 atau singkatan', '/glosarium', 'Glosarium'],
                  ['Mengganti sandi', '/ganti-sandi?dari=menu', 'Ikon kunci di bilah atas'],
                ].map(([k, href, m]) => (
                  <tr key={k}><td>{k}</td><td><Link className="judul" href={href}>{m}</Link></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="bagaimana" className="pd-bagian">
        <SectionHead no="H" eyebrow="How · Bagaimana" judul="Langkah kerja yang paling sering dilakukan" />

        <div className="pd-cara-grid">
          <Langkah judul="Masuk pertama kali" peran="Semua peran" href="/ganti-sandi?dari=menu" langkah={[
            'Buka alamat aplikasi, masukkan email dan sandi sementara dari admin.',
            'Aplikasi meminta sandi baru; buat sandi yang hanya Anda ketahui. Akun pembaca bersama dilewati: sandinya tetap dari admin.',
            'Sesi berakhir otomatis setelah 12 jam. Keluar lewat ikon pintu di bilah atas bila memakai komputer bersama.',
          ]} />
          <Langkah judul="Melengkapi evidence dokumen" peran="Tim KINRA, konsultan, admin" href="/kesiapan" langkah={[
            'Buka Kesiapan Audit. Saring dengan kartu peringatan (mis. Tanpa evidence), klausul, atau kotak cari.',
            'Klik tombol Unggah (atau jumlah berkas) di kolom Evidence, lalu seret berkas ke kotak unggah atau klik untuk memilih berkas.',
            'Klik nama berkas untuk melihatnya langsung: PDF, gambar, video, dan Word/Excel/PowerPoint tampil di aplikasi.',
            'Tandai berkas yang sudah disahkan atau ditandatangani (atau rekaman yang lengkap) sebagai versi sah. Draf tetap boleh diunggah, tetapi tidak dihitung.',
            'Ubah status dokumen menjadi Final. Skor kesiapan hanya menghitung dokumen Final yang punya berkas versi sah, jadi dokumen yang baru punya berkas belum menaikkan skor.',
          ]} />
          <Langkah judul="Bacaan stand meter bulanan" peran="Bagian M/E, Tim KINRA" href="/aset" langkah={[
            'Buka Aset & Meter, pilih meter, lalu isi stand awal dan stand akhir bulan tersebut.',
            'Aplikasi mengalikan selisih stand dengan faktor kali meter (mis. WTP ×200, intake ×1). Periksa faktor kali sebelum mengisi.',
            'Bila angka janggal (terlalu besar, nol, atau turun), cek ulang di lapangan sebelum disimpan.',
            'Data meter KINRA menjadi dasar EnPI-04, EnPI-05, dan EnPI-06, jadi jangan ada bulan yang kosong.',
            'Setelah menyimpan, lihat bagian Kualitas data meter: kotak merah (bacaan janggal) atau kuning (di luar pola) perlu dikonfirmasi ke PIC data sebelum dipakai EnPI.',
          ]} />
          <Langkah judul="Input data energi bulanan" peran="Tim KINRA, admin" href="/energi" langkah={[
            'Buka Data Energi, pilih tahun di kanan atas.',
            'Ketik angka di sel bulan dan sumber yang sesuai, lalu tekan Tab. Bingkai hijau = tersimpan, merah = gagal.',
            'Gunakan format Indonesia: titik ribuan, koma desimal (mis. 3.470.845,34). Kosongkan sel untuk menghapus.',
            'Pakai angka tagihan atau meter aktual, bukan perkiraan.',
          ]} />
          <Langkah judul="Data variabel, EnPI & baseline" peran="Tim KINRA, konsultan, admin" href="/kinerja" langkah={[
            'Isi data variabel relevan per bulan di tabel “Data variabel”; caranya sama dengan input energi.',
            'Klik ikon pensil pada EnPI untuk mengubah ruang lingkup, metode, variabel, atau periode baseline.',
            'Bila periode atau metode baseline diubah, perbarui juga kolom alasan baseline; tanpa itu perubahan ditolak (klausul 6.5).',
            'Periksa uji kelayakan model: R², CV(RMSE), dan jumlah bulan baseline harus lolos ambang.',
            'Coba dulu metode atau variabel baru di Laboratorium EnPI untuk melihat dampaknya sebelum mengubah EnPI resmi.',
          ]} />
          <Langkah judul="Sasaran & rencana aksi" peran="Konsultan menyusun · Tim KINRA memperbarui progres" href="/sasaran" langkah={[
            'Setiap sasaran memakai satu EnPI lingkup KINRA (EnPI-04, 05, 06, atau 01), bukan EnPI kawasan.',
            'Setiap rencana aksi harus terhubung ke sasarannya dan punya PIC, tenggat, serta cara verifikasi hasil.',
            'Aksi yang ganda atau tidak dilanjutkan diberi status Batal beserta alasannya, bukan dihapus, agar jejaknya tetap ada untuk auditor.',
            'Catat penghematan hanya bila sudah diverifikasi dengan meter (mis. kWh meter panel PJU sebelum dan sesudah LED).',
          ]} />
          <Langkah judul="Menindaklanjuti temuan audit" peran="Konsultan mencatat & menutup · Tim KINRA menindaklanjuti" href="/temuan" langkah={[
            'Konsultan atau admin mencatat temuan beserta kategori (Mayor, Minor, Observasi, OFI), klausul, PIC, dan tenggat.',
            'PIC mengisi akar masalah dan tindakan perbaikan, lalu mengubah status ke Proses kemudian Verifikasi.',
            'Tautkan dokumen bukti perbaikan bila ada.',
            'Konsultan atau admin memverifikasi dan menutup temuan.',
          ]} />
          <Langkah judul="Mengunduh laporan & bertanya ke asisten" peran="Semua peran" langkah={[
            'Di Kesiapan Audit, klik “Unduh CSV” untuk mengekspor tampilan yang sedang disaring ke Excel.',
            'Klik tombol bulat di kanan bawah untuk membuka asisten AI. Tanyakan mis. “Dokumen apa yang terlambat di klausul 6?”.',
            'Jawaban asisten bersumber dari data aplikasi; tetap cek ulang sebelum dipakai untuk keputusan.',
            'Ganti tema terang/gelap lewat tombol di pojok kanan atas.',
          ]} />
        </div>
      </section>

      <section className="pd-bagian">
        <SectionHead eyebrow="Glosarium" judul="Istilah yang sering muncul" />
        <div className="card">
          <dl className="pd-istilah">
            {GLOSARIUM.filter((x) => ISTILAH_INTI.includes(x.istilah)).map((x) => <div key={x.istilah}><dt>{x.istilah}</dt><dd>{x.arti}</dd></div>)}
          </dl>
          <Link className="btn kecil" href="/glosarium" style={{ marginTop: 14 }}>Lihat {GLOSARIUM.length} istilah di Glosarium</Link>
        </div>
      </section>

      <footer className="footer muted small pd-kaki">
        <BookOpen size={14} aria-hidden="true" /> Butuh bantuan lebih lanjut? Hubungi admin aplikasi atau konsultan pendamping SMEn.
        <span className="pd-ikon-ket"><KeyRound size={13} aria-hidden="true" /> ganti sandi · <Bot size={13} aria-hidden="true" /> asisten AI</span>
      </footer>
    </>
  )
}
