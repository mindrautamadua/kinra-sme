import { Activity, BookOpen, Bot, CalendarRange, CircleCheck, ClipboardCheck, FolderOpen, Gauge, KeyRound, LayoutDashboard, Minus, SearchCheck, ShieldAlert, Target, Users } from 'lucide-react'
import Link from 'next/link'
import { Chip } from '@/components/Chip'
import { SectionHead } from '@/components/SectionHead'
import { AKSES, type Aksi, boleh, DAFTAR_PERAN, LABEL_AKSI, LABEL_PERAN, type Peran } from '@/lib/akses'
import { tanggal } from '@/lib/format'
import { penggunaSaya } from '@/lib/sesi'
import { GLOSARIUM } from '@/lib/glosarium'
import { FOLDER_BUKTI, STATUS, TONGGAK, URUTAN_STATUS } from '@/lib/status'

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
  { href: '/kesiapan', ikon: ClipboardCheck, nama: 'Kesiapan Audit', klausul: 'Klausul 4–10', isi: 'Lembar monitoring semua dokumen dan rekaman yang akan diperiksa auditor: status, PIC, tenggat, tautan evidence, unduh CSV.' },
  { href: '/energi', ikon: Gauge, nama: 'Data Energi', klausul: 'Klausul 6.3', isi: 'Input konsumsi bulanan per sumber (PLN, PLTBG, PLTS, BBM), aliran energi, peta panas, dan tren antar tahun dalam Terajoule.' },
  { href: '/kinerja', ikon: Activity, nama: 'Kinerja Energi', klausul: 'Klausul 6.4 & 6.5', isi: 'EnPI dan baseline energi (EnB): aktual vs harapan, CUSUM, uji kelayakan model, input variabel relevan bulanan.' },
  { href: '/sasaran', ikon: Target, nama: 'Sasaran & Aksi', klausul: 'Klausul 6.2', isi: 'Sasaran dan target energi yang terhubung ke EnPI, rencana aksi beserta PIC, tenggat, dan penghematan terverifikasi.' },
  { href: '/register', ikon: ShieldAlert, nama: 'Isu & Peluang', klausul: 'Klausul 4.1, 6.1', isi: 'Register isu internal/eksternal dengan matriks risiko 5×5 dan daftar peluang peningkatan kinerja energi.' },
  { href: '/temuan', ikon: SearchCheck, nama: 'Temuan Audit', klausul: 'Klausul 9.2 & 10.1', isi: 'Catatan temuan Internal Audit dan TÜV beserta tindakan perbaikan sampai tertutup.' },
  { href: '/timeline', ikon: CalendarRange, nama: 'Timeline', klausul: 'Pendampingan', isi: 'Gantt kegiatan pendampingan SMEn Rev.3 dan penanda kegiatan yang sudah selesai.' },
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
  const saya = await penggunaSaya()
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
          {MODUL.map((m, i) => (
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
          <div className="insight positif"><span className="area">Satu sumber kebenaran</span><h3>Tidak ada lagi versi file berbeda</h3><p>Semua tim melihat status dan angka yang sama secara langsung. Setiap perubahan status tercatat siapa dan kapan.</p></div>
          <div className="insight"><span className="area">Siap diperiksa auditor</span><h3>Bukti tersusun per klausul</h3><p>Setiap dokumen terhubung ke klausul ISO 50001 dan tautan evidence OneDrive, sehingga mudah ditunjukkan saat audit.</p></div>
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
            { p: 'pembaca', ket: 'Direksi, auditor, atau tamu: melihat semua halaman dan mengunduh CSV tanpa mengubah data.' },
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
                { t: 'Setiap hari kerja', isi: 'Perbarui status dokumen yang sedang dikerjakan dan tempel tautan evidence begitu berkas diunggah ke OneDrive.' },
                { t: 'Setiap minggu', isi: 'Cek halaman Ringkasan: dokumen terlambat, klausul terlemah, beban PIC. Tandai kegiatan timeline yang selesai.' },
                { t: 'Awal bulan (maks. tgl 10)', isi: 'Input konsumsi energi bulan lalu dari tagihan/meter dan data variabel relevan, lalu cek EnPI di halaman Kinerja.' },
                { t: 'Setiap triwulan', isi: 'Tinjau register isu & peluang, progres sasaran dan rencana aksi.' },
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
            <p className="muted small">Timeline Pendampingan SMEn Rev.3</p>
            <div className="list" style={{ marginTop: 10 }}>
              {[...TONGGAK].sort((a, b) => a.tanggal.localeCompare(b.tanggal)).map((t) => (
                <div key={t.kode}>
                  <span className="mono small" style={{ width: 104 }}>{tanggal(t.tanggal)}</span>
                  <span className="grow"><b>{t.nama}</b></span>
                </div>
              ))}
            </div>
            <p className="muted small" style={{ marginTop: 12 }}>Target: semua dokumen berstatus Disetujui atau Final dan bertaut evidence sebelum Internal Audit. Hitung mundur selalu tampil di bilah atas.</p>
            <Link className="btn kecil" href="/timeline" style={{ marginTop: 12 }}>Lihat timeline lengkap</Link>
          </div>
        </div>
      </section>

      <section id="dimana" className="pd-bagian">
        <SectionHead no="W5" eyebrow="Where · Di mana" judul="Data di aplikasi, berkas bukti di OneDrive" />
        <div className="grid-2">
          <div className="card">
            <div className="row"><div><h3>Aplikasi (database SMEn)</h3><p className="muted small">Bisa dibuka dari browser laptop maupun ponsel</p></div></div>
            <p className="ink-2 small">Menyimpan status dokumen, data energi, variabel, EnPI, sasaran, register, temuan, dan riwayat perubahan. Akses wajib login; sesi berlaku 12 jam.</p>
          </div>
          <div className="card">
            <div className="row"><div><h3>OneDrive (berkas evidence)</h3><p className="muted small">Satu-satunya tempat menyimpan file bukti</p></div>
              <a className="btn kecil" href={FOLDER_BUKTI} target="_blank" rel="noreferrer"><FolderOpen aria-hidden="true" />Folder evidence</a>
            </div>
            <p className="ink-2 small">Aplikasi tidak menyimpan file, hanya tautan. Unggah berkas ke folder SMEn di OneDrive, lalu tempel tautannya pada halaman dokumen.</p>
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
                  ['Mengubah status dokumen atau mengisi tautan evidence', '/kesiapan', 'Kesiapan Audit → klik nama dokumen'],
                  ['Mengisi konsumsi listrik/BBM bulanan', '/energi', 'Data Energi → tabel input'],
                  ['Mengisi data variabel relevan, mengubah EnPI atau baseline', '/kinerja', 'Kinerja Energi'],
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

        <div className="card pd-alur" style={{ marginBottom: 16 }}>
          <h3>Alur status dokumen</h3>
          <p className="muted small">Bobot tiap status membentuk skor kesiapan berbobot</p>
          <div className="pd-alur-baris">
            {URUTAN_STATUS.map((s, i) => (
              <div key={s} className={`pd-alur-item st-${STATUS[s].chip}`} style={{ '--i': i } as React.CSSProperties}>
                <Chip kode={STATUS[s].chip} label={STATUS[s].label} />
                <b className="tnum">{Math.round(STATUS[s].bobot * 100)}</b>
                <span className="muted small">{s === 'belum' ? 'Belum disusun' : s === 'draft' ? 'Sedang disusun' : s === 'review' ? 'Diperiksa konsultan' : s === 'disetujui' ? 'Disahkan, siap diaudit' : 'Final dan diterapkan'}</span>
              </div>
            ))}
          </div>
          <p className="sumber">Disetujui dan Final hanya dapat dipilih oleh admin atau konsultan.</p>
        </div>

        <div className="pd-cara-grid">
          <Langkah judul="Masuk pertama kali" peran="Semua peran" href="/ganti-sandi?dari=menu" langkah={[
            'Buka alamat aplikasi, masukkan email dan sandi sementara dari admin.',
            'Aplikasi meminta sandi baru; buat sandi yang hanya Anda ketahui.',
            'Sesi berakhir otomatis setelah 12 jam. Keluar lewat ikon pintu di bilah atas bila memakai komputer bersama.',
          ]} />
          <Langkah judul="Memperbarui status & evidence dokumen" peran="Tim KINRA, konsultan, admin" href="/kesiapan" langkah={[
            'Buka Kesiapan Audit. Saring dengan tahap status, kartu peringatan, klausul, atau kotak cari.',
            'Ubah status langsung dari dropdown di tabel; skor ikut berubah dan riwayatnya tercatat.',
            'Unggah berkas ke folder OneDrive, pilih Bagikan → Salin tautan.',
            'Klik nama dokumen, tempel tautan di kolom “Tautan evidence (OneDrive)”, lalu simpan.',
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
