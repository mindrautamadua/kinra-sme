# PRD: Sistem Informasi Manajemen Energi (SMEn) KINRA, versi baru

| | |
|---|---|
| Produk | Dashboard Sistem Manajemen Energi ISO 50001:2018 |
| Organisasi | PT Kawasan Industri Nusantara (KINRA), KEK Sei Mangkei |
| Dokumen | Product Requirements Document untuk dibangun ulang oleh AI coding agent |
| Acuan | Aplikasi yang berjalan saat ini (repo `dashboard-sistem-manajemen-energi`, commit `1e74c5e`, 2 Nov 2026) |
| Bahasa antarmuka | Bahasa Indonesia (`<html lang="id">`, format angka dan tanggal `id-ID`) |

---

## 0. Cara memakai dokumen ini

Dokumen ini adalah spesifikasi lengkap untuk membangun ulang aplikasi SMEn KINRA dengan fungsi yang **setara** dengan versi yang berjalan sekarang. Bila sebuah perilaku tertulis di sini, bangun persis seperti itu. Bila ada bagian yang tidak tertulis, ikuti pola terdekat di dokumen ini, jangan menambah fitur baru.

Aturan untuk agent:

1. **Paritas dulu, perbaikan kemudian.** Semua yang ada di bagian 3 sampai 11 wajib ada. Perbaikan di bagian 14 dikerjakan hanya bila disebut "wajib" di sana.
2. **Teks antarmuka memakai bahasa Indonesia** seperti yang dikutip di dokumen ini. Kutipan dalam tanda petik adalah label persis.
3. **Database adalah penjaga akses utama.** Pemeriksaan peran di UI hanya untuk menampilkan atau menyembunyikan tombol. Setiap aturan akses wajib ditegakkan juga di database (RLS dan trigger) dan di server action.
4. **Jangan menyimpan rahasia di kode.** Kunci API hanya dari environment variable.
5. **Migrasi database berupa file SQL bernomor** yang dijalankan admin di Supabase SQL Editor, aman diulang (`if not exists`, `or replace`, `on conflict`).
6. Ikuti urutan pengerjaan di bagian 15 dan periksa kriteria penerimaan di bagian 13 sebelum menyatakan selesai.

---

## 1. Ringkasan produk

SMEn KINRA adalah aplikasi web internal untuk mempersiapkan dan menjalankan sertifikasi ISO 50001:2018 di kawasan KEK Sei Mangkei. Satu aplikasi menggantikan spreadsheet checklist, folder bukti, dan rekap energi yang tersebar.

Aplikasi ini menjawab lima pertanyaan:

1. **Seberapa siap kita diaudit?** Skor kesiapan dokumen per klausul, dokumen terlambat, dan proyeksi sampai tanggal audit.
2. **Di mana buktinya?** Setiap dokumen punya berkas evidence yang diunggah dan bisa dilihat langsung di aplikasi.
3. **Bagaimana konsumsi energi kita?** Data energi bulanan per sumber, tren, bauran energi terbarukan.
4. **Apakah kinerja energi membaik?** EnPI dan baseline energi (EnB) yang dinormalisasi dengan variabel relevan, uji kelayakan model, CUSUM.
5. **Apa yang harus ditindaklanjuti?** Sasaran dan rencana aksi, isu dan peluang, temuan audit, timeline pendampingan.

### Tonggak yang menjadi acuan

| Kode | Nama | Tanggal |
|---|---|---|
| ia | Internal Audit | 2026-11-05 |
| s1 | TÜV Stage 1 | 2026-11-20 |
| tm | Tinjauan Manajemen | 2026-11-24 |
| s2 | TÜV Stage 2 | 2026-12-10 |

---

## 2. Tujuan dan batasan

### Tujuan

- Satu sumber kebenaran untuk status dokumen audit, evidence, data energi, dan tindak lanjut SMEn.
- Auditor bisa ditunjukkan bukti per klausul langsung dari aplikasi, tanpa membuka penyimpanan lain.
- Kinerja energi diukur dengan metode yang sesuai ISO 50006 (normalisasi, uji R² dan CV(RMSE)).
- Akses berbasis peran yang ditegakkan di database.
- Dapat dipakai di laptop dan ponsel, tema terang dan gelap.

### Di luar lingkup

- Supabase Auth (login memakai tabel sendiri, lihat bagian 6).
- Integrasi OneDrive atau Google Drive. Evidence hanya lewat unggahan ke aplikasi.
- Notifikasi email, WhatsApp, atau push.
- Multi-organisasi atau multi-kawasan.
- Aplikasi mobile native.
- Pembacaan meter otomatis (IoT). Data energi diinput manual per bulan.

---

## 3. Pengguna, peran, dan hak akses

### Peran

| Kode | Label | Ringkasan |
|---|---|---|
| `admin` | Admin | Semua tindakan, termasuk menghapus data dan mengelola pengguna. |
| `konsultan` | Konsultan | Mendefinisikan EnPI, baseline, dan variabel; mengelola sasaran; menambah dan menyetujui dokumen; mencatat dan menutup temuan; mengisi isu/peluang; menandai kegiatan. |
| `tim_kinra` | Tim KINRA | Melengkapi dokumen dan evidence; input data energi dan variabel; mengubah EnPI, baseline, variabel, dan sasaran yang sudah ada; mengelola rencana aksi; menindaklanjuti temuan; mengisi isu/peluang; menandai kegiatan. |
| `pembaca` | Pembaca | Melihat semua halaman dan mengunduh CSV. Tidak bisa mengubah data, kecuali sandinya sendiri. |

Semua peran yang login boleh **membaca** semua data operasional.

### Matriks tindakan (sumber kebenaran di kode: satu modul `akses`)

`SEMUA` = admin, konsultan, tim_kinra.

| Kunci aksi | Peran | Label (tampil di Panduan dan Pengguna) |
|---|---|---|
| `dokumen.tambah` | admin, konsultan | Tambah dokumen |
| `dokumen.ubah` | SEMUA | Ubah dokumen & evidence |
| `dokumen.setujui` | admin, konsultan | Setujui dokumen (Disetujui/Final) |
| `dokumen.hapus` | admin | Hapus dokumen |
| `energi.ubah` | admin, tim_kinra | Input data energi & variabel relevan |
| `enpi.tambah` | admin, konsultan | Tambah EnPI & variabel relevan |
| `enpi.ubah` | SEMUA | Ubah EnPI, baseline & variabel |
| `enpi.hapus` | admin | Hapus EnPI & variabel |
| `sasaran.tambah` | admin, konsultan | Tambah sasaran energi |
| `sasaran.ubah` | SEMUA | Ubah sasaran energi |
| `aksi.ubah` | SEMUA | Isi rencana aksi (termasuk menambah aksi) |
| `sasaran.hapus` | admin | Hapus sasaran & aksi |
| `kegiatan.ubah` | SEMUA | Tandai kegiatan timeline |
| `register.ubah` | SEMUA | Isi isu & peluang |
| `register.hapus` | admin | Hapus isu |
| `temuan.tambah` | admin, konsultan | Catat temuan |
| `temuan.ubah` | SEMUA | Tindak lanjut temuan |
| `temuan.tutup` | admin, konsultan | Tutup temuan |
| `temuan.hapus` | admin | Hapus temuan |
| `pengguna.kelola` | admin | Kelola pengguna |

Fungsi `boleh(peran, aksi)` mengembalikan true bila peran tidak null dan tercantum. Dipakai di server (komponen dan action) dan di klien (lewat context peran).

---

## 4. Teknologi dan arsitektur

### Stack (pertahankan, kecuali ada alasan kuat)

| Bagian | Pilihan | Versi acuan |
|---|---|---|
| Framework | Next.js App Router, React Server Components, Server Actions | next 16.4.1, react 19.2.0 |
| Bahasa | TypeScript strict | 5.9.3 |
| Database, storage | Supabase (Postgres, PostgREST, Storage) di custom domain | @supabase/supabase-js 2.110.0 |
| Grafik | Apache ECharts, impor modular | echarts 6.0.0 |
| Ikon | lucide-react | 1.50.0 |
| AI | Google Gemini lewat REST streaming | model default `gemini-2.5-flash` |
| Package manager | pnpm | |

Tidak memakai library UI (Tailwind, shadcn, dll.). Styling dengan satu file CSS global berbasis token (lihat bagian 10).

### Environment variable

| Nama | Wajib | Keterangan |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ya | URL Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ya | Publishable key. Dipakai server dan browser (unggah ke signed URL). |
| `GEMINI_API_KEY` | tidak | Bila kosong, chatbot menjawab galat 500 yang jelas. |
| `GEMINI_MODEL` | tidak | Default `gemini-2.5-flash`. |

Tidak ada service-role key. Semua akses database memakai publishable key ditambah header sesi, sehingga RLS selalu berlaku.

### Pola arsitektur

- **Klien Supabase server** dibuat per request dengan header `x-sesi: <token>` yang diambil dari cookie `kinra_sesi`. RLS membaca peran dari header ini.
- **Pembacaan data** dilakukan di server component. Halaman bersifat dinamis (tidak di-cache), kecuali Glosarium yang statis.
- **Penulisan data** lewat server action. Setiap action:
  1. memeriksa sesi dan hak akses (`cekAkses(aksi)`), mengembalikan `{ ok: false, pesan }` bila ditolak;
  2. memvalidasi input dan menormalkan teks (trim, kosong menjadi null, angka menerima koma desimal);
  3. menulis ke database (RLS tetap menjaga);
  4. me-revalidate halaman terkait;
  5. mengembalikan `{ ok: true }` atau `{ ok: false, pesan }`.
- **Middleware/proxy**: bila cookie sesi tidak ada, arahkan ke `/masuk?lanjut=<path+query>` (tanpa `lanjut` bila path `/`). Kecualikan `/masuk`, aset statis, dan gambar. Keabsahan token diperiksa di layout dan RLS.
- **Toleransi migrasi belum lengkap**: galat PostgREST `PGRST205` (tabel belum ada) dibaca sebagai daftar kosong; `PGRST200` (relasi belum ada) jatuh ke query tanpa relasi. Layout menampilkan panduan migrasi bila tabel inti belum ada.

---

## 5. Model data

Semua nama tabel dan kolom memakai bahasa Indonesia seperti di bawah. Ekstensi: `pgcrypto`.

### Enum

- `status_dokumen`: `belum`, `draft`, `review`, `disetujui`, `final`
- `kelompok_dokumen`: `persiapan`, `manual`, `sop`, `formulir`, `rekaman`

### Referensi

**klausul**: `kode` text PK (mis. `4.1`, `P` untuk persiapan awal), `induk` text not null (`4`…`10`, `P`), `judul` text not null, `urutan` int not null.

**sumber_energi**: `kode` text PK, `nama` not null, `satuan` not null, `faktor_tj` numeric not null (pengali 1 satuan ke Terajoule), `terbarukan` bool default false, `urutan` int not null, `catatan` text.

### Kesiapan audit

**dokumen_audit**

| Kolom | Tipe | Aturan |
|---|---|---|
| id | uuid PK | default `gen_random_uuid()` |
| kode | text | not null, unique |
| kelompok | kelompok_dokumen | not null |
| klausul_kode | text | not null, FK klausul |
| nama | text | not null |
| nomor_dokumen, pic, keterangan | text | |
| status | status_dokumen | not null, default `belum` |
| tenggat, tanggal_terima | date | |
| sumber_files | text[] | default `{}` (referensi berkas sumber seed) |
| dibuat_at, diubah_at | timestamptz | default now() |

Index: `klausul_kode`, `status`. Trigger `sentuh_diubah_at` (BEFORE UPDATE). Kolom lama `link_eksternal` **tidak dibuat** di versi baru.

**riwayat_status**: `id` bigint identity PK, `dokumen_id` FK dokumen_audit ON DELETE CASCADE, `dari` status_dokumen null, `ke` not null, `catatan` text, `at` timestamptz default now(), `oleh` text. Index `(dokumen_id, at desc)`. Diisi otomatis oleh trigger, tidak ditulis langsung oleh aplikasi.

**berkas** (evidence)

| Kolom | Tipe | Aturan |
|---|---|---|
| id | uuid PK | |
| dokumen_id | uuid | FK dokumen_audit ON DELETE SET NULL |
| path | text | unique not null, format `<dokumen_id>/<uuid>-<nama-aman>` |
| nama_file | text | not null (nama asli) |
| folder | text | not null default `Evidence` |
| mime | text | |
| ukuran | bigint | byte |
| diunggah_oleh | text | diisi trigger dari sesi |
| diunggah_at | timestamptz | default now() |

Index `dokumen_id`.

### Energi dan kinerja

**energi_bulanan**: `tahun` int (2020–2035), `bulan` int (1–12), `sumber_kode` FK sumber_energi, `nilai` numeric not null ≥ 0, `catatan`, `diubah_at`. PK `(tahun, bulan, sumber_kode)`.

**variabel_relevan**: `kode` text PK (`^[a-z0-9_]+$`), `nama` not null, `satuan` not null, `keterangan`, `urutan` int default 0.

**variabel_bulanan**: `tahun`, `bulan` (rentang sama), `variabel_kode` FK variabel_relevan ON DELETE CASCADE ON UPDATE CASCADE, `nilai` numeric not null (boleh negatif), `diubah_at`. PK `(tahun, bulan, variabel_kode)`.

**enpi**

| Kolom | Tipe | Aturan |
|---|---|---|
| kode | text PK | `^[A-Z0-9-]+$` |
| nama | text | not null |
| sumber_kode | text[] | not null, minimal 1 |
| metode | text | `absolut`, `rasio`, `regresi` |
| variabel_kode | text[] | default `{}` |
| baseline_mulai, baseline_selesai | date | not null, selesai ≥ mulai (disimpan sebagai tanggal 1) |
| alasan_baseline, catatan | text | |
| aktif | bool | default true |
| urutan | int | default 0 |
| diubah_at | timestamptz | |

Check tambahan: `metode='absolut' or cardinality(variabel_kode) > 0`; `metode<>'rasio' or cardinality(variabel_kode) = 1`.

**sasaran**: `id` bigint identity PK, `kode` unique not null, `uraian` not null, `enpi_kode` FK enpi ON DELETE SET NULL ON UPDATE CASCADE, `target_persen` numeric 0–100, `tahun_target` int 2024–2035, `pic`, `status` default `Aktif` check (`Draft`, `Aktif`, `Tercapai`, `Tidak tercapai`), `catatan`, `diubah_at`.

**rencana_aksi**: `id` bigint identity PK, `kode` unique not null, `sasaran_id` FK sasaran ON DELETE SET NULL, `peluang_kode` FK peluang ON DELETE SET NULL ON UPDATE CASCADE, `uraian` not null, `pic`, `sumber_daya`, `mulai` date, `tenggat` date, `estimasi_hemat_kwh` numeric ≥ 0, `metode_verifikasi`, `status` default `Rencana` check (`Rencana`, `Berjalan`, `Selesai`, `Ditunda`, `Batal`), `hemat_terverifikasi_kwh` numeric, `tanggal_verifikasi` date, `catatan`, `diubah_at`.

### Timeline

**kegiatan**: `no` int PK, `nama` not null, `fasilitator`, `metode`, `peserta`, `sesi` jsonb not null default `[]` berbentuk `[{ "tanggal": "YYYY-MM-DD", "jam": "10 - 11" }]`, `status` text default `belum` check (`belum`, `berjalan`, `selesai`), `selesai_at` timestamptz, `catatan` text.

### Register

**isu**: `id` bigint identity PK, `asal` (`Internal`, `Eksternal`), `jenis` (`Risiko`, `Peluang`), `uraian` not null, `dampak` int 1–5, `kemungkinan` int 1–5, `skor` int GENERATED ALWAYS AS (dampak × kemungkinan) STORED, `tindakan`, `evaluasi`, `pic`, `diubah_at`.

**peluang**: `kode` text PK (`P-01`), `uraian` not null, `variabel`, `metode`, `pemilik`, `skor_energi` int 1–5, `skor_roi` int 1–5, `prioritas` numeric GENERATED AS ((skor_energi + skor_roi) / 2.0) STORED, `estimasi_kwh` numeric, `status` text default `Belum dinilai` (nilai: Belum dinilai, Dinilai, Disetujui, Berjalan, Selesai, Ditunda, Ditolak), `diubah_at`.

**temuan**: `id` uuid PK, `nomor` unique not null (`AI-001`), `jenis_audit` (`Internal`, `TÜV Stage 1`, `TÜV Stage 2`), `tanggal` date default current_date, `klausul_kode` FK klausul null, `kategori` (`Mayor`, `Minor`, `Observasi`, `OFI`), `uraian` not null, `bukti`, `auditor`, `auditee`, `akar_masalah`, `tindakan`, `pic`, `tenggat` date, `status` default `Terbuka` (`Terbuka`, `Proses`, `Verifikasi`, `Tertutup`), `dokumen_id` FK dokumen_audit ON DELETE SET NULL, `dibuat_at`, `diubah_at`. Index `status`.

### Pengguna dan sesi

**pengguna**: `id` uuid PK, `email` unique not null (huruf kecil, check), `nama` not null, `peran` check (admin, konsultan, tim_kinra, pembaca), `sandi_hash` not null, `aktif` bool default true, `wajib_ganti_sandi` bool default true, `gagal_masuk` int default 0, `terkunci_sampai` timestamptz, `terakhir_masuk` timestamptz, `dibuat_at`.

**sesi**: `token` text PK, `pengguna_id` FK pengguna ON DELETE CASCADE, `dibuat_at`, `kedaluwarsa` default now() + 12 jam. Index `pengguna_id`.

Kedua tabel: RLS aktif tanpa policy, semua hak dicabut dari anon/authenticated. Hanya bisa disentuh lewat fungsi SECURITY DEFINER.

### Trigger

| Trigger | Tabel | Perilaku |
|---|---|---|
| `sentuh_diubah_at` | dokumen_audit, BEFORE UPDATE | `diubah_at = now()`. Tabel lain mengisi `diubah_at` dari aplikasi. |
| `catat_perubahan_status` | dokumen_audit, AFTER INSERT/UPDATE | Saat insert, atau saat status berubah: tambah baris riwayat_status (`dari` = status lama atau null, `ke` = status baru, `oleh` = `nama_sesi()`). |
| `cek_persetujuan_dokumen` | dokumen_audit, BEFORE INSERT/UPDATE | Bila status baru `disetujui`/`final` dan berubah, request datang lewat API, dan peran bukan admin/konsultan: tolak dengan "Hanya admin atau konsultan yang dapat mengubah status menjadi Disetujui/Final" (errcode 42501). |
| `cek_penutupan_temuan` | temuan, BEFORE INSERT/UPDATE | Sama untuk status `Tertutup`: "Hanya admin atau konsultan yang dapat menutup temuan". |
| `isi_pengunggah` | berkas, BEFORE INSERT | `diunggah_oleh = coalesce(nama_sesi(), new.diunggah_oleh)`. |

---

## 6. Autentikasi, sesi, dan keamanan

### Login berbasis tabel (bukan Supabase Auth)

Fungsi database (SECURITY DEFINER, `search_path` dikunci):

| Fungsi | Perilaku |
|---|---|
| `token_sesi()` | Membaca header `x-sesi` dari `current_setting('request.headers')`. |
| `pengguna_sesi()` | Baris pengguna dari sesi yang belum kedaluwarsa dan pengguna aktif. Tidak di-grant ke klien. |
| `peran_sesi()`, `nama_sesi()` | Peran dan nama dari sesi. Dipakai policy RLS. |
| `saya()` | id, email, nama, peran, wajib_ganti_sandi untuk sesi saat ini. |
| `masuk(email, sandi)` → jsonb | Lihat aturan di bawah. Mengembalikan `{token}` atau `{galat}`, tidak melempar exception (agar penghitung gagal tetap tersimpan). |
| `keluar()` | Menghapus sesi saat ini. |
| `ganti_sandi(lama, baru)` | Wajib sesi valid ("Sesi tidak valid"). Sandi lama harus cocok ("Sandi lama salah"). Sandi baru minimal 8 karakter. Set `wajib_ganti_sandi=false`, hapus sesi lain milik pengguna (sesi saat ini tetap). |
| `daftar_pengguna()` | Admin saja. id, email, nama, peran, aktif, terakhir_masuk, terkunci_sampai, urut peran lalu nama. |
| `tambah_pengguna(email, nama, peran, sandi)` | Admin saja. Sandi minimal 8. Email di-lowercase dan trim. `wajib_ganti_sandi=true`. |
| `ubah_pengguna(id, nama, peran, aktif)` | Admin saja. Tidak boleh menurunkan peran atau menonaktifkan diri sendiri. Menonaktifkan menghapus semua sesinya. |
| `atur_ulang_sandi(id, sandi)` | Admin saja. Sandi minimal 8. Set `wajib_ganti_sandi=true`, reset penghitung gagal dan kunci, hapus semua sesinya. |

Aturan `masuk`:

- Hash sandi: bcrypt (`crypt(sandi, gen_salt('bf'))`).
- Token sesi: 32 byte acak dalam hex (64 karakter). Masa berlaku tetap 12 jam (tidak bergeser).
- Setiap pemanggilan menghapus sesi yang sudah kedaluwarsa.
- Email tidak dikenal atau nonaktif: "Email atau sandi salah." Penghitung tidak berubah.
- Bila `terkunci_sampai > now()`: tolak dengan "Akun terkunci karena 5 kali salah sandi. Coba lagi setelah pukul HH.MI WIB." (jam zona Asia/Jakarta), walaupun sandi benar.
- Sandi salah: `gagal_masuk + 1`. Bila ≥ 5, kunci 15 menit.
- Berhasil: reset penghitung dan kunci, isi `terakhir_masuk`, kembalikan token.

### Cookie

| Cookie | Isi | Atribut |
|---|---|---|
| `kinra_sesi` | token sesi | httpOnly, sameSite lax, secure di produksi, path `/`, maxAge 12 jam |
| `kinra_tema` | `light` atau `dark` | 1 tahun, dibaca server agar tidak berkedip |
| `kinra_sidebar` | `ciut` atau `lebar` | 1 tahun, dibaca server |

### Alur

- `/masuk`: form email dan sandi. Sukses: set cookie, redirect ke `lanjut` bila diawali `/` dan bukan `//`, selain itu ke `/`.
- Layout aplikasi: bila `saya()` kosong, redirect `/masuk`. Bila `wajib_ganti_sandi`, redirect `/ganti-sandi`.
- Keluar: panggil `keluar()`, hapus cookie, redirect `/masuk`.

### RLS (kondisi akhir)

Semua policy untuk `anon, authenticated`. Baca: `(select peran_sesi()) is not null`. Tulis: `(select peran_sesi()) = any('{…}')`. Operasi tanpa policy ditolak.

| Tabel | Baca | Insert | Update | Delete |
|---|---|---|---|---|
| klausul | login | admin | admin | admin |
| sumber_energi | login | admin | admin | admin |
| dokumen_audit | login | admin, konsultan | SEMUA (+ trigger persetujuan) | admin |
| riwayat_status | login | SEMUA (lewat trigger) | – | – |
| berkas | login | SEMUA | – | SEMUA |
| energi_bulanan | login | admin, tim_kinra | admin, tim_kinra | admin, tim_kinra |
| variabel_relevan | login | admin, konsultan | SEMUA | admin |
| variabel_bulanan | login | admin, tim_kinra | admin, tim_kinra | admin, tim_kinra |
| enpi | login | admin, konsultan | SEMUA | admin |
| sasaran | login | admin, konsultan | SEMUA | admin |
| rencana_aksi | login | SEMUA | SEMUA | admin |
| kegiatan | login | admin | SEMUA | admin |
| isu | login | SEMUA | SEMUA | admin |
| peluang | login | SEMUA | SEMUA | admin |
| temuan | login | admin, konsultan | SEMUA (+ trigger penutupan) | admin |
| pengguna, sesi | – | – | – | – (fungsi saja) |

### Storage evidence

- Bucket `smen-evidence`, **privat**, batas 50 MB (52.428.800 byte) per berkas.
- Policy `storage.objects`: baca untuk semua yang login; insert dan delete untuk SEMUA. Tidak ada update (unggah selalu `x-upsert: false`).
- Storage meneruskan header request ke Postgres, sehingga `peran_sesi()` juga berlaku di storage. **Uji ini di awal** (lihat bagian 13); bila Storage di server tidak meneruskan header, pakai service-role key di server saja dan tetap periksa hak akses di server action.
- Berkas hanya dibuka lewat signed URL yang dibuat server, berlaku 1 jam.

---

## 7. Logika bisnis

### Status dokumen dan kesiapan

| Status | Label | Chip | Bobot |
|---|---|---|---|
| belum | Belum ada | crit | 0 |
| draft | Draft | serious | 0,25 |
| review | Review | warn | 0,5 |
| disetujui | Disetujui | info | 0,85 |
| final | Final | good | 1 |

Kelompok: persiapan "Persiapan awal", manual "Manual & kebijakan", sop "SOP", formulir "Formulir", rekaman "Rekaman/bukti".

Induk klausul: P Persiapan, 4 Konteks organisasi, 5 Kepemimpinan, 6 Perencanaan, 7 Dukungan, 8 Operasi, 9 Evaluasi kinerja, 10 Peningkatan.

- `jumlah_berkas` dokumen = jumlah baris `berkas` miliknya (ambil lewat embed PostgREST `berkas(count)`).
- `adaBukti(d)` = `jumlah_berkas > 0`.
- `nilaiKesiapan(d)` = `adaBukti(d) ? bobot(status) : 0`. **Dokumen tanpa berkas evidence bernilai 0 walaupun statusnya Final.**
- `kesiapan(daftar)` = rata-rata `nilaiKesiapan` × 100, atau 0 bila daftar kosong.
- `terlambat(d, hariIni)` = `tenggat` ada, `tenggat < hariIni`, dan status bukan final/disetujui.
- "Siap" = status final atau disetujui.

**Tren kesiapan** (`trenKesiapan(dokumen, riwayat, hari[])`): untuk setiap hari, rekonstruksi status setiap dokumen dari riwayat (tanggal WIB = UTC + 7 jam). Dokumen tanpa riwayat memakai status sekarang. Dokumen yang riwayat pertamanya `dari = null` dan dibuat setelah hari itu tidak dihitung. Keberadaan berkas memakai kondisi sekarang (tanggal unggah tidak direkonstruksi).

### Ambang dan chip lain

- `chipCapaian(p)`: ≥ 100 good, ≥ 90 warn, ≥ 75 serious, selain itu crit.
- `tingkatRisiko(skor)`: ≥ 15 "Tinggi"/crit, ≥ 8 "Sedang"/warn, selain itu "Rendah"/good.
- Status temuan: Terbuka crit, Proses warn, Verifikasi info, Tertutup good.
- Kategori temuan: Mayor crit, Minor serious, Observasi warn, OFI info.
- Status sasaran: Draft na, Aktif info, Tercapai good, Tidak tercapai crit.
- Status aksi: Rencana na, Berjalan info, Selesai good, Ditunda warn, Batal na.
- Status peluang: Selesai good; Berjalan/Disetujui info; Ditolak/Ditunda na; Dinilai warn; Belum dinilai serious.

### Energi

- Konversi ke TJ: `nilai × faktor_tj` sumbernya.
- `rekapEnergi` menyediakan daftar tahun dan fungsi `tj(filter)` = Σ nilai × faktor.

### Mesin EnPI (`hitungEnpi`)

Ambang kelayakan (ISO 50006, ASHRAE Guideline 14): `R² ≥ 0,75`, `CV(RMSE) ≤ 15%`, `n ≥ 12` bulan.

1. **Kunci bulan** = `tahun × 12 + (bulan − 1)`. Label "Jan 25".
2. **Satuan**: bila semua sumber dalam lingkup bersatuan sama, pakai satuan itu (faktor 1). Selain itu satuan `TJ` dengan `faktor_tj`.
3. **Energi bulanan aktual**: dihitung hanya bila **setiap** sumber dalam lingkup punya nilai di bulan itu; selain itu null.
4. **Periode**: baseline = bulan `baseline_mulai` sampai `baseline_selesai` (inklusif). Pelaporan = bulan sesudah baseline sampai bulan terakhir yang punya data energi lingkup.
5. **x** = nilai tiap variabel relevan bulan itu (null bila kosong). Data latih = bulan baseline dengan aktual dan semua x terisi.
6. **Galat dan peringatan umum**: variabel tidak ditemukan (galat untuk non-absolut); sumber lingkup tidak ditemukan (peringatan); "N bulan baseline tanpa data energi lengkap" (peringatan).
7. **Absolut**: harapan = aktual baseline pada bulan kalender yang sama (bila beberapa tahun baseline, tahun terakhir menang), atau rata-rata baseline. Peringatan bila baseline < 12 bulan kalender, dan peringatan tetap bahwa metode ini tidak menormalisasi. Tidak ada R², CV, atau peringatan n.
8. **Rasio**: butuh ≥ 3 bulan latih. `k = Σaktual / Σx` (galat bila Σx = 0). Harapan = `k × x`. Statistik dengan jumlah parameter 1.
9. **Regresi**: p = jumlah variabel + 1, butuh ≥ p + 2 bulan latih. OLS dengan persamaan normal `XᵀX·b = Xᵀy` (kolom intersep), diselesaikan eliminasi Gauss dengan pivot parsial. Pivot < 1e-12 = singular, galat "…tidak bervariasi atau saling berkorelasi sempurna". Harapan = `b0 + Σ bi·xi`.
10. **Statistik**: `R² = 1 − SSres/SStot` (null bila SStot = 0). `CV(RMSE) = √(SSres/(n − p)) / rata-rata × 100` (null bila n − p ≤ 0 atau rata-rata 0).
11. **Peringatan model**: n < 12; R² < 0,75; CV > 15%; jumlah bulan pelaporan yang punya aktual tetapi tidak punya harapan.
12. **Ringkasan** (`ringkas`) atas bulan yang punya aktual dan harapan: jumlah bulan, Σaktual, Σharapan, `hemat = H − A`, `perbaikan = (H − A) / H × 100` (positif = lebih efisien).
13. **CUSUM** = jumlah berjalan `(aktual − harapan)`, null bila salah satu kosong.
14. **Rumus tampilan**: rasio "E = k satuan/satuanVar × Var"; regresi "E = b0 ± |bi| × Var …".
15. Label metode: absolut "Absolut (vs bulan sama baseline)", rasio "Rasio intensitas", regresi "Regresi linier".
16. `layak(model)` = model ada, R² null atau ≥ 0,75, CV null atau ≤ 15, n ≥ 12.

### Sasaran

- Capaian dihitung bila sasaran punya EnPI dan `tahun_target`: `ringkas` atas bulan pelaporan di tahun target, lalu `persenTarget = perbaikan / target_persen × 100`.
- "On track" = persenTarget ≥ 100.
- Penghematan terverifikasi = Σ `hemat_terverifikasi_kwh` / Σ `estimasi_hemat_kwh` (aksi berstatus Batal tidak dihitung) × 100.

### Kegiatan timeline

- `statusDariTanggal`: tanpa sesi atau sesi pertama > hari ini = belum; sesi terakhir < hari ini = selesai; selain itu berjalan. Dipakai bila kolom status belum ada.
- `keadaan`: status tersimpan, tetapi bila bukan selesai dan sesi terakhir < hari ini = **konfirmasi**.
- Label: selesai "Selesai"/good, berjalan "Sedang berjalan"/info, belum "Belum dikerjakan"/na, konfirmasi "Perlu konfirmasi"/crit.

### Format

Semua angka memakai `Intl` `id-ID`. Null atau NaN ditampilkan "–".

- `angka(v, desimal=0)`, `persen(v, desimal=1)` "x%", `delta(v)` "+x%" atau "−x%" (tanda minus Unicode).
- `energiListrik`: ≥ 1e6 kWh → "x,xx GWh"; ≥ 1e3 → "x,x MWh"; selain itu kWh.
- `tanggal(v, 'pendek'|'panjang')` → "5 Nov 2026" / "5 November 2026". `waktu` → "5 Nov 2026 14.05".
- Bulan: Jan Feb Mar Apr Mei Jun Jul Agu Sep Okt Nov Des.
- **Zona waktu** (wajib di versi baru): semua perhitungan "hari ini", tenggat, dan tanggal memakai WIB (Asia/Jakarta), baik di server maupun klien.

---

## 8. Fitur per halaman

### 8.1 Kerangka aplikasi

**Sidebar** (lebar 248 px, ciut 72 px, disembunyikan ≤ 1100 px):

- Blok merek berlatar tosca: motif tiga lingkaran (jingga, merah, biru), logo `/logo-kinra.png` di atas pil putih, subjudul "Sistem Manajemen Energi".
- Navigasi bernomor (01, 02, …), urutan:

| No | Rute | Label | Ikon lucide |
|---|---|---|---|
| 01 | `/` | Ringkasan | LayoutDashboard |
| 02 | `/kesiapan` | Kesiapan Audit | ClipboardCheck |
| 03 | `/energi` | Data Energi | Gauge |
| 04 | `/kinerja` | Kinerja Energi | Activity |
| 05 | `/sasaran` | Sasaran & Aksi | Target |
| 06 | `/register` | Isu & Peluang | ShieldAlert |
| 07 | `/temuan` | Temuan Audit | SearchCheck |
| 08 | `/timeline` | Timeline | CalendarRange |
| 09 | `/panduan` | Panduan | BookOpen |
| 10 | `/glosarium` | Glosarium | BookA |
| 11 | `/pengguna` | Pengguna | Users (hanya `pengguna.kelola`) |

- Item aktif: `aria-current="page"`, garis kiri 3 px warna brand. `/kesiapan` juga aktif di `/dokumen/*`.
- Kartu kecil di bawah: "Standar", **ISO 50001:2018**, "KEK Sei Mangkei · Sertifikasi 2026".
- Tombol ciutkan ("Ciutkan menu"/"Lebarkan menu"), simpan di cookie. Saat ciut, label tetap terbaca screen reader dan `title` jadi tooltip.
- Di ≤ 1100 px: strip navigasi horizontal (pil teks yang bisa digeser) di bawah topbar.

**Topbar** (sticky, blur): tombol sidebar, breadcrumb "SMEn / **{menu aktif}**", hitung mundur ke tonggak terdekat ("{nama}: **N hari lagi**" atau "hari ini", titik berdenyut, tidak tampil bila semua tonggak lewat), nama pengguna dan chip peran, ikon kunci ke `/ganti-sandi?dari=menu`, tombol keluar, pengganti tema.

**Status khusus**:

- Database belum siap (query tabel klausul gagal): kartu "Database SMEn belum siap" dengan pesan Supabase dan tiga langkah (buka SQL Editor, jalankan migrasi berurutan, muat ulang). Chatbot tidak dirender.
- Loading: kerangka shimmer (`aria-busy`).
- Galat: bila pesan menunjukkan tabel belum ada, "Database belum disiapkan" dan instruksi migrasi; selain itu "Data gagal dimuat" dan pesan. Tombol "Coba lagi".
- 404: "Halaman tidak ditemukan", tombol "Kembali ke ringkasan".

**Dekorasi**: garis gradien 2 px di atas layar (merah → jingga → biru → tosca), "aurora" berupa tiga lingkaran blur yang bergerak pelan. Bagian di bawah layar muncul dengan animasi saat di-scroll (dimatikan bila reduced motion).

### 8.2 Login dan ganti sandi

**Layout auth**: dua kolom (satu kolom ≤ 900 px). Panel kiri tosca dengan tiga lingkaran (jingga 360 px, merah 240 px, biru 170 px), logo, judul "Sistem Manajemen Energi ISO 50001:2018", paragraf "Monitoring kesiapan audit, data energi, dan tindak lanjut temuan PT Kawasan Industri Nusantara, KEK Sei Mangkei."

**`/masuk`**: eyebrow "Masuk", judul "Dashboard SMEn", catatan "Gunakan akun yang diberikan admin SMEn." Field Email (autofocus) dan Sandi. Tombol "Masuk" ("Memeriksa…" saat proses). Footer "Lupa sandi? Hubungi admin SMEn untuk mengatur ulang." Galat: "Isi email dan sandi.", "Login belum disiapkan: jalankan migrasi …", pesan dari fungsi `masuk`, atau "Gagal masuk."

**`/ganti-sandi`**: eyebrow "Akun · {nama}", judul "Ganti sandi". Subjudul saat wajib: "Sandi Anda masih sandi sementara. Buat sandi baru sebelum melanjutkan." Selain itu: "Minimal 8 karakter. Sesi di perangkat lain akan diakhiri." Field "Sandi saat ini", "Sandi baru", "Ulangi sandi baru". Galat: "Isi semua kolom.", "Konfirmasi sandi baru tidak sama.", "Sandi baru minimal 8 karakter.", pesan database. Tombol "Simpan sandi baru". Link "Batal, kembali ke dashboard" hanya bila tidak wajib.

### 8.3 Ringkasan (`/`)

Hanya baca.

1. **Hero**: "Kesiapan dokumen **{skor}**: {siap} dari {N} dokumen siap diaudit". Penjelasan bobot dan kalimat "Dokumen tanpa berkas evidence dihitung 0." Bila ada tonggak berikutnya: "{nama} dijadwalkan {tanggal}, {h} hari lagi." Tombol "Buka lembar kesiapan".
2. **Kartu skor**: cincin luar bersegmen per status (panjang sebanding jumlah), cincin dalam = skor (gradien biru ke brand), angka skor beranimasi, "{siap} dari {N} siap audit". Legenda 5 status dan jumlah dokumen per kelompok.
3. **Kartu jalur**: "Menuju {tonggak}", "N hari lagi", tanggal, dan bila skor < 100: "perlu **+X poin/hari** agar 100% tepat waktu" dengan `X = (100 − skor) / hariTersisa`. Garis waktu relatif hari ini dan tonggak mendatang.
4. **Tren dan proyeksi**: jendela 30 hari terakhir (atau sejak riwayat pertama). Titik terakhir = skor sekarang. `laju = (skor − tren[akhir − jendela]) / jendela` dengan `jendela = min(14, hari − 1)`. Hari menuju 100% = `ceil((100 − skor) / laju)` bila laju > 0. Grafik garis: "Aktual", "Proyeksi laju sekarang" (putus-putus), "Jalur ideal ke {tonggak}" (jingga putus-putus). Footer jumlah perubahan status 7 hari dan berapa yang naik tahap.
5. **Enam kartu insight** (masing-masing link):
   - Proyeksi: tanggal 100% atau "Mandek"/"Tuntas"; kritis bila tidak terkejar.
   - Quick win: "+{naik} poin", `naik = nReview × (0,85 − 0,5) / N × 100`, nReview = dokumen Review yang sudah punya berkas. Link `/kesiapan?status=review`.
   - Klausul terlemah: skor terendah dan dua berikutnya. Link `/kesiapan?klausul=X`.
   - Beban PIC terberat: urut jumlah terlambat lalu sisa; PIC kosong = "PIC belum ditetapkan".
   - Evidence: jumlah dokumen tanpa berkas.
   - Temuan audit: jumlah terbuka, mayor.
6. **Beban per PIC**: 8 PIC teratas, bar bertumpuk per status, "sisa/n · X lewat".
7. **Aktivitas terbaru**: 7 perubahan status terakhir (panah naik/turun, "kode · oleh · waktu", chip dari → ke), link ke dokumen.
8. **Per klausul**: heatmap ubin per klausul berwarna sesuai %, "kode | n dok", judul, "p% · x terlambat", link ke kesiapan tersaring.
9. **Agenda**: dokumen jatuh tempo ≤ 10 hari (termasuk yang sudah lewat, maks 8) dan 6 sesi pendampingan berikutnya ("Pukul {jam} WIB", chip "Hari ini").
10. **Kinerja energi**: konsumsi Jan sampai bulan terakhir data PLN tahun berjalan dibanding periode sama tahun lalu (TJ dan delta). Grafik batang bertumpuk TJ per tahun per sumber. Tile: TJ periode, pangsa terbarukan, "Perbaikan EnPI vs baseline" (EnPI aktif tanpa galat dengan data pelaporan, mengutamakan rasio/regresi).

### 8.4 Kesiapan Audit (`/kesiapan`)

Parameter `?klausul=` dan `?status=` mengisi saringan awal.

- **Hero**: "Kesiapan {%}: **{n} final**, {n} terlambat, {n} belum ada evidence". Tombol "Tambah dokumen" (`dokumen.tambah`).
- **Panel** (angka beranimasi, ikut berubah langsung saat status diganti):
  - "Kesiapan berbobot" dan bar status; pipeline 5 tombol status (toggle saringan) berisi jumlah dan persen.
  - Tiga kartu peringatan: "Lewat tenggat" (toggle saringan), "Tanpa evidence" (toggle saringan), "Jatuh tempo 7 hari" (statis).
  - Strip "Kesiapan per klausul": tombol per klausul dengan cincin mini, badge terlambat, persen; toggle saringan klausul.
- **Tabel "Lembar monitoring"**:
  - Saringan: kelompok (segmented, dengan jumlah), cari (kode, nama, PIC, nomor, keterangan), klausul, status, "Hanya terlambat", "Tanpa evidence", "Hapus semua saringan".
  - Urutan: urutan klausul lalu kode, dikelompokkan per klausul dengan baris judul ("Klausul X · judul", bar mini, "kesiapan N%" dihitung dari semua dokumen klausul itu).
  - Kolom: **Kode**; **Dokumen / rekaman** (link ke detail, sub-baris kelompok · nomor · keterangan); **PIC**; **Status** (select inline berwarna chip bila `dokumen.ubah`; Disetujui/Final nonaktif tanpa `dokumen.setujui`; titik tahapan 4 langkah); **Tenggat** (tanggal dan "lewat N hari"/"hari ini"/"N hari lagi"); **Evidence**.
  - **Kolom Evidence hanya untuk melihat**: bila ada berkas, tombol "Lihat" atau "Lihat (n)" yang memuat signed URL lewat server action lalu membuka penampil berkas di halaman ini juga ("Memuat…" saat proses). Bila tidak ada berkas, teks merah "belum ada". Unggah tidak dilakukan dari tabel.
  - Ganti status bersifat optimistis; bila gagal, kembalikan dan tampilkan "Status {kode} gagal disimpan: {pesan}".
  - Baris terlambat diberi garis merah di kiri.
  - Footer: "{n} dari {N} dokumen · kesiapan tampilan ini {%} · Sumber: …".
  - **Unduh CSV** (baris tersaring, UTF-8 BOM, semua nilai dikutip): nama `kesiapan-audit-smen-{YYYY-MM-DD}.csv`, kolom `Kode, Klausul, Kelompok, Nama, Nomor dokumen, PIC, Status, Tenggat, Berkas evidence, Keterangan`.

### 8.5 Detail dokumen (`/dokumen/[id]`, `/dokumen/baru`)

- `baru`: 404 tanpa `dokumen.tambah`. Judul "Tambah dokumen atau rekaman audit".
- `id` harus UUID, selain itu 404.
- Kepala: tombol kembali ke kesiapan (tersaring klausul), eyebrow "{kode} · Klausul X judul", judul nama, chip status dan kelompok.

**Kolom kiri**

1. **Kartu Evidence** ("Klik berkas untuk melihatnya langsung di aplikasi", chip "{n} berkas" atau "Belum ada evidence"):
   - Daftar berkas: ikon jenis, nama, "ukuran · waktu · pengunggah". Klik membuka penampil. Tombol unduh. Tombol hapus (`dokumen.ubah`) dengan konfirmasi "Hapus berkas {nama}? Berkas akan terhapus permanen dari penyimpanan aplikasi."
   - Kosong: "Belum ada berkas evidence yang diunggah."
   - **Zona unggah** (`dokumen.ubah`): seret-lepas atau pilih berkas, **banyak berkas sekaligus**. Teks "Seret berkas ke sini atau pilih berkas"; saat berjalan "Mengunggah {n} berkas… tambah lagi". Petunjuk "PDF, gambar, Word/Excel/PowerPoint, video · maks. 50 MB per berkas". Berkas bisa ditambah saat antrean masih berjalan.
   - **Antrean unggah dengan animasi** (lihat 8.5.1).
   - Bila tabel berkas belum ada: "Unggah berkas belum aktif. Jalankan migrasi …"
2. **Riwayat status**: 20 terakhir, "waktu · {dari} → **{ke}**" atau "Dibuat sebagai **{ke}**", "· oleh".
3. **Temuan audit terkait** (bila ada): nomor, uraian, chip kategori dan status, link `/temuan#{nomor}`.

**Kolom kanan: "Detail dokumen"**

| Field | Tipe | Aturan |
|---|---|---|
| Kode | text | wajib, placeholder "mis. R-9.2-03" |
| Klausul | select | wajib, default 4.1, opsi "kode · judul" (P = Persiapan) |
| Nama dokumen / rekaman | text | wajib |
| Kelompok | select | default rekaman |
| Status | select | default belum; Disetujui/Final nonaktif tanpa `dokumen.setujui` |
| Nomor dokumen | text | placeholder "mis. 001/SOP-003/KINRA/SMEn/X/2026" |
| PIC | text | |
| Tenggat, Tanggal diterima | date | |
| Keterangan | textarea | |

- Tanpa hak ubah: form nonaktif dan pesan "Peran Anda hanya dapat melihat dokumen ini."
- "Simpan" → "Tersimpan."; dokumen baru dialihkan ke halaman detailnya.
- "Hapus" (`dokumen.hapus`): konfirmasi "Hapus dokumen {kode}? Semua berkas evidence-nya ikut terhapus." Server menghapus dokumen, objek storage, dan baris berkas. Sukses → `/kesiapan`.
- Footer "Terakhir diubah {waktu}".

#### 8.5.1 Alur unggah evidence

1. Klien memeriksa ukuran (> 50 MB langsung gagal "Melebihi batas 50 MB").
2. Server action `siapkanUnggah(dokumenId, nama, ukuran)`: cek `dokumen.ubah`, buat path `<dokumenId>/<uuid>-<namaAman>`, buat signed upload URL (klien server dengan sesi, sehingga policy storage berlaku). `namaAman`: normalisasi NFKD, ganti karakter selain `[\w.-]` dengan `_`, rapatkan `_` berulang, ambil 120 karakter terakhir, fallback `berkas`.
3. Klien mengunggah **langsung ke Storage** (tidak lewat server Next) dengan XHR `PUT {SUPABASE_URL}/storage/v1/object/upload/sign/smen-evidence/{path}?token=…`, header `apikey`, `Authorization: Bearer <publishable key>`, `x-upsert: false`, body FormData (`cacheControl=3600`, berkas di field bernama kosong). Progres dari `upload.onprogress`.
4. Server action `catatBerkas(dokumenId, {path, nama_file, mime, ukuran})`: path wajib diawali `dokumenId/`, insert baris berkas.
5. Refresh daftar.

Berkas diproses satu per satu (antrean berantai). Tampilan per berkas:

| Tahap | Teks | Visual |
|---|---|---|
| antre | "Menunggu giliran" | baris agak pudar, ikon diam |
| siapkan | "Menyiapkan…" | ikon berputar, bar 4% berkilau |
| unggah | "Mengunggah 3,2 MB dari 8,0 MB" dan persen | bar sesuai persen, berkilau |
| simpan | "Menyimpan…" | bar 100% berkilau |
| sukses | "Berhasil diunggah" | baris hijau, centang muncul dengan animasi, memudar lalu hilang setelah 4 detik; berkas baru di daftar disorot hijau sebentar |
| gagal | "Gagal: {alasan}" | baris merah, goyang singkat, tombol "Coba lagi" dan "Buang" |

Ringkasan di atas antrean (`aria-live="polite"`): "Memproses n berkas · n berhasil · n gagal" atau "Selesai · …". Kegagalan satu berkas tidak menghentikan berkas lain. Pesan galat: pesan JSON dari Storage, "HTTP {kode}", atau "Koneksi terputus".

#### 8.5.2 Penampil berkas (komponen bersama)

Dipakai di halaman dokumen dan tabel kesiapan.

- Dialog modal native layar hampir penuh (lebar maks 1100 px, tinggi viewport − 48 px; layar penuh di ≤ 640 px).
- Kepala: ikon jenis, nama berkas, "{judul dokumen} · i dari n · ukuran", tombol sebelumnya/berikutnya (juga panah keyboard), "Buka di tab baru", "Unduh" (signed URL + `&download=nama`), "Tutup" (fokus awal). Esc menutup.
- Pratinjau menurut jenis (mime atau ekstensi):

| Jenis | Ekstensi | Tampilan |
|---|---|---|
| gambar | png, jpg, gif, webp, svg | `<img>` contain |
| pdf | pdf | iframe |
| video | mp4, webm, mov | `<video controls>` |
| audio | mp3, wav, m4a, ogg | `<audio controls>` |
| office | doc(x), xls(x), ppt(x) | iframe Office Online `https://view.officeapps.live.com/op/embed.aspx?src=<signed URL>` |
| teks | txt, csv, md, json, text/* | ambil isi, tampilkan di `<pre>` (maks 500.000 karakter) |
| lain | | "Pratinjau tidak tersedia untuk jenis berkas ini." dan tombol "Unduh berkas" |

- Tanpa URL: "Berkas tidak dapat dibuka. Muat ulang halaman lalu coba lagi."
- Ukuran: < 1 MB "N KB" (minimal 1), selain itu "x,x MB".

### 8.6 Data Energi (`/energi`)

Parameter `?tahun=` (default tahun terbaru). Warna dan ikon sumber: pln s3/Zap, pltbg s1/Leaf, plts jingga/Sun, dexlite s2/Flame. Sumber listrik = satuan kWh; selain itu BBM.

Variabel periode: `blnAkhir` = bulan terakhir berdata PLN tahun terpilih; `kwhTahun` = Σ kWh listrik setahun; `tjIni`/`tjLalu` = TJ Jan..blnAkhir tahun ini dan tahun lalu; `naik` = (tjIni − tjLalu) / tjLalu × 100; pangsa terbarukan = kWh terbarukan / kWh listrik × 100.

1. **Hero**: "{tahun}: **{kWh}** listrik dalam {blnAkhir} bulan, {delta} dibanding {tahun−1}". Pangsa terbarukan, rata-rata per bulan, "Konversi: 1 kWh = 3,6 × 10⁻⁶ TJ." Navigasi tahun.
2. **Aliran energi**: daftar sumber (kuantitas asli, TJ, pangsa) dengan kurva SVG ke hub "KEK Sei Mangkei" (tebal garis = 2 + pangsa/100 × 26, garis putus-putus bergerak). Hub: TJ beranimasi, chip delta vs tahun lalu, cincin mini persen listrik terbarukan. Catatan sumber data dan asumsi BBM 36 MJ/liter.
3. **Tiga insight**: puncak konsumsi; bulan terakhir vs bulan sama tahun lalu; bauran terbarukan naik/turun.
4. **Grafik**: batang bertumpuk "Listrik per bulan per sumber" (kWh) dengan total per sumber; donat "Bauran {tahun}" berdasarkan TJ.
5. **Tren antar tahun**: heatmap TJ bulanan (baris tahun × 12 bulan + Total, intensitas 15–100%), grafik garis TJ bulanan per tahun, grafik batang BBM per bulan per tahun (liter).
6. **Input data** (`energi.ubah`): tabel 12 bulan × sumber + "Total TJ" (dengan bar mini) dan baris total. Sel teks `inputMode=decimal`, simpan saat blur. Parsing: buang spasi, buang titik ribuan, koma → titik. Kosong = hapus. Tidak valid atau < 0 = border merah. Tidak berubah = tidak dikirim. Sukses = border hijau. Tanpa hak: read-only dan "Hanya admin dan Tim KINRA yang dapat mengubah data energi." Footer contoh format "3.470.845,34".

### 8.7 Kinerja Energi (`/kinerja`)

Klausul 6.4 dan 6.5. EnPI utama = EnPI aktif pertama yang punya model dan data pelaporan.

1. **Hero**: "{nama}: **lebih efisien|lebih boros X%** dibanding baseline" atau "Kinerja energi belum dapat dihitung". Penjelasan rumus perbaikan. Bila belum ada EnPI rasio/regresi: anjuran menambahkan.
2. **Kartu utama**: gauge setengah lingkaran ±30% (kiri boros, kanan efisien, jarum), nilai, penghematan atau kelebihan beranimasi, jumlah bulan pelaporan, sparkline hemat per bulan (batang naik = hemat, turun = boros).
3. **Uji kelayakan model**: tiga meter (R² dengan penanda 0,75; CV(RMSE) skala 30 dengan penanda 15; jumlah titik baseline skala 24 dengan penanda 12) dengan chip "Lolos"/"Belum"/"Tidak berlaku". Chip "Model layak" atau "Perlu ditinjau".
4. **Checklist**: EnPI aktif dipantau; ada EnPI ternormalisasi; model baseline layak; pelaporan terbandingkan.
5. **Papan skor**: kartu per EnPI aktif (link ke kartu detail).
6. **Kartu per EnPI**: metode, lingkup, baseline, variabel; mini-stat perbaikan, hemat, R², CV; sparkline hemat; grafik "Aktual vs harapan" (baseline + pelaporan); grafik CUSUM (biru bila nilai akhir ≤ 0, merah bila naik) dengan penjelasan; rumus, n, chip kelayakan, daftar peringatan. Bila galat, tampilkan galat saja.
7. **Variabel relevan** (`#variabel`): navigasi tahun; tabel input 12 bulan × variabel (pola sama dengan input energi, boleh negatif, `energi.ubah`); daftar variabel (kode, nama + keterangan, satuan, dipakai EnPI) dengan dialog tambah/ubah:
   - Kode (wajib, `[a-z0-9_]+`, read-only saat ubah), Satuan (wajib), Nama (wajib), Keterangan & sumber data, Urutan.
   - Hapus (`enpi.hapus`): "Hapus variabel {nama} beserta semua data bulanannya?"
8. **Definisi EnPI & EnB**: tabel (kode, nama + alasan baseline, lingkup "pln + pltbg", metode · variabel, baseline "YYYY-MM s.d. YYYY-MM", chip Aktif/Nonaktif) dan dialog:

| Field | Aturan |
|---|---|
| Kode | wajib, default `ENPI-NN` berikutnya, huruf besar, read-only saat ubah |
| Urutan tampil | angka |
| Nama EnPI | wajib |
| Ruang lingkup sumber energi | checkbox, minimal satu; default sumber kWh untuk EnPI baru |
| Metode | absolut / rasio / regresi, default regresi |
| Aktif dipantau | checkbox, default aktif |
| Variabel relevan | tampil bila bukan absolut; radio untuk rasio (tepat satu), checkbox untuk regresi (minimal satu) |
| Awal / akhir baseline | input bulan, wajib, default 2025-01 dan 2025-12, akhir ≥ awal |
| Alasan pemilihan / penyesuaian baseline | wajib diperbarui bila periode atau metode baseline diubah ("Periode atau metode baseline berubah: perbarui alasan baseline untuk mencatat penyesuaian (klausul 6.5).") |
| Catatan | |

Hapus (`enpi.hapus`): "Hapus {kode}? Sasaran yang terkait akan kehilangan tautan EnPI."

### 8.8 Sasaran & Aksi (`/sasaran`)

Klausul 6.2.

- **Judul**: "{aktif} sasaran aktif, {onTrack} dari {terukur} yang terukur sudah memenuhi target".
- **Empat tile**: Sasaran aktif; Rencana aksi (selesai dari yang tidak batal, berjalan, lewat tenggat); Estimasi penghematan (MWh/tahun dari aksi tidak batal); Penghematan terverifikasi (MWh dan chip capaian).
- Tombol "Tambah aksi" (`aksi.ubah`) dan "Tambah sasaran" (`sasaran.tambah`).
- **Kartu sasaran**: kode, PIC, uraian, target ("perbaikan X% pada {EnPI}, tahun Y" atau "Belum terhubung ke EnPI dengan target terukur"), chip status, blok capaian (perbaikan tahun target, target, hemat, jumlah bulan, chip capaian, bar progres), tabel aksi sasaran itu, tombol "Aksi untuk {kode}".
- **Tabel aksi**: kode (+ "dari {peluang}"), uraian + sumber daya + metode verifikasi, PIC · tenggat (merah bila lewat), estimasi kWh, terverifikasi kWh + tanggal, status (chip, atau select inline bila `aksi.ubah`), tombol ubah. Terlambat = tenggat < hari ini dan status bukan Selesai/Batal.
- **Aksi belum terhubung ke sasaran** dan **Peluang disetujui yang belum punya rencana aksi** (peluang Disetujui/Berjalan tanpa aksi; tombol "Jadikan aksi →" mengisi peluang, uraian, PIC = pemilik, estimasi).
- Kosong: contoh sasaran "Menurunkan konsumsi listrik kawasan ternormalisasi 3% pada 2026 dibanding baseline 2025".
- **Dialog sasaran**: Kode (wajib, default `S-NN`), Status, Sasaran energi (wajib), EnPI pengukur, Target perbaikan (%) 0–100, Tahun target 2024–2035 (default tahun ini), PIC, Catatan. Bila EnPI dipilih, target dan tahun wajib. Hapus (`sasaran.hapus`): "Hapus sasaran {kode}? Rencana aksinya tetap ada tanpa sasaran."
- **Dialog aksi**: Kode (wajib, default `RA-NN`), Status, Uraian (wajib), Sasaran, Asal peluang, PIC, Sumber daya, Mulai, Tenggat, Estimasi hemat (kWh/tahun) ≥ 0, Metode verifikasi, Hemat terverifikasi (kWh), Tanggal verifikasi (wajib bila hemat terverifikasi diisi), Catatan. Hapus (`sasaran.hapus`): "Hapus rencana aksi {kode}?"
- Kode duplikat: "Kode sasaran sudah dipakai." / "Kode aksi sudah dipakai."

### 8.9 Isu & Peluang (`/register`)

**Isu (klausul 4.1 dan 6.1)**

- Judul: "{risiko} risiko dan {peluang} peluang teridentifikasi, {tinggi} berisiko tinggi". Penjelasan skor dan sumber formulir.
- **Peta risiko 5×5**: baris dampak 5→1, kolom kemungkinan 1→5, isi = jumlah isu jenis Risiko di sel itu, intensitas warna = min(90, d·k/25 × 90)%. Klik sel = toggle saringan.
- **Tabel**: saringan Semua/Risiko/Peluang dan sel aktif. Kolom: isu (+ asal · jenis · PIC), D×K + skor, tingkat (chip risiko atau "Peluang"), tindakan + evaluasi, ubah. Urut skor menurun.
- **Dialog**: Asal, Jenis, Isu (wajib), Dampak 1–5 (wajib, default 3), Kemungkinan 1–5 (wajib, default 2), Tindakan, Evaluasi efektivitas, PIC. Hapus (`register.hapus`): "Hapus isu ini?"

**Peluang (klausul 6.1 dan 6.2)**

- Judul: "{dinilai} dari {N} peluang sudah dinilai prioritasnya". Prioritas = (skor energi + skor ROI) / 2.
- **Tabel** urut prioritas menurun (kosong di akhir): ID, peluang + variabel, pemilik, energi, ROI, prioritas (1 desimal), estimasi kWh, chip status, ubah.
- **Dialog**: ID (default `P-NN`, read-only saat ubah), Status, Peluang (wajib), Variabel/data terkait, Metode kajian, Pemilik, Estimasi hemat (kWh/tahun) ≥ 0, Skor potensi energi 1–5, Skor ROI 1–5. Tidak ada hapus.

### 8.10 Temuan Audit (`/temuan`)

Klausul 9.2 dan 10.1.

- Judul: "{terbuka} dari {N} temuan masih terbuka, {lewat} melewati tenggat". Alur "Terbuka → Proses → Verifikasi → Tertutup".
- **Empat tile per kategori** (mayor, minor, observasi, OFI): jumlah terbuka, total, tertutup.
- **Saringan**: jenis audit dan status (dengan jumlah).
- **Tabel** (setiap baris punya `id={nomor}` sebagai anchor): nomor + jenis · tanggal, klausul, uraian + tindakan + link dokumen bukti, chip kategori, PIC · tenggat (merah bila lewat), status (select inline bila `temuan.ubah`; Tertutup nonaktif tanpa `temuan.tutup`), ubah.
- **Dialog**: Jenis audit (default Internal), Nomor (wajib; default otomatis `{AI|S1|S2}-{urut 3 digit}` dan berubah mengikuti jenis), Tanggal (default hari ini), Klausul (tanpa P), Kategori (default Minor), Status, Uraian (wajib), Bukti objektif, Auditor, Auditee, Akar masalah, Tindakan perbaikan, PIC, Tenggat, Dokumen bukti perbaikan (pilih dokumen). Hapus (`temuan.hapus`): "Hapus temuan {nomor}?"

### 8.11 Timeline (`/timeline`)

- Judul: "{selesai} dari {N} kegiatan selesai, {belum} belum dikerjakan", dan "{k} perlu konfirmasi".
- **Progres kegiatan**: jumlah per keadaan, bar bertumpuk, "{%} selesai".
- **Gantt**: skala bulan, satu baris per kegiatan, blok per sesi berwarna keadaan (title "tanggal · jam"), garis hari ini.
- **Daftar kegiatan**: saringan per keadaan; grup berurutan konfirmasi, berjalan, belum, selesai. Item: "{no}. {nama}", rentang tanggal, jumlah sesi, metode, peserta, pil sesi (lewat ✓, hari ini, mendatang), "Ditandai selesai {waktu}".
- Tombol (hanya bila `kegiatan.ubah`): "Mulai" (belum → berjalan), "Tandai selesai", "Batalkan" (selesai → belum). Selesai mengisi `selesai_at`.

### 8.12 Glosarium (`/glosarium`)

Statis, tanpa peran. 51 istilah dalam 5 kategori: "Sistem & standar", "Kinerja energi", "Data & analisis", "Audit & perbaikan", "Aplikasi & organisasi". Setiap istilah: istilah, nama asli (opsional), arti, kategori, klausul (opsional), link ke halaman terkait (opsional).

UI: saringan kategori dengan jumlah, cari (istilah, asli, arti, klausul), "Hapus saringan", jumlah hasil, lompat A–Z, grup per huruf (urut `localeCompare 'id'`). Kosong: "Tidak ada istilah yang cocok dengan “{cari}”."

Isi istilah diambil dari modul glosarium versi sekarang; salin seluruhnya. Definisi "Evidence" dan "Skor kesiapan" harus menyebut berkas yang diunggah dan bahwa dokumen tanpa berkas dihitung 0.

### 8.13 Panduan (`/panduan`)

Hanya baca, berstruktur 5W1H:

- Hero "Memahami aplikasi **SMEn KINRA** dalam enam pertanyaan" dan navigasi bab (Apa, Mengapa, Siapa, Kapan, Di mana, Bagaimana).
- Kartu "Peran Anda": nama, peran, jumlah tindakan yang boleh dari 20, daftar label tindakan.
- **Apa**: kartu modul (Ringkasan sampai Timeline) dengan klausul dan deskripsi.
- **Mengapa**: enam manfaat ("Satu sumber kebenaran", "Siap diperiksa auditor", "Prioritas jelas", "Kinerja ternormalisasi", "Perbaikan berkelanjutan", "Akuntabel").
- **Siapa**: kartu peran (peran sendiri ditandai "· Anda") dan matriks hak akses dari modul akses.
- **Kapan**: rutinitas (setiap hari kerja, setiap minggu, awal bulan maks. tanggal 10, setiap triwulan, setelah audit maks. 1×24 jam) dan daftar tonggak.
- **Di mana**: kartu database dan evidence (unggah per dokumen, privat, maks 50 MB) dan tabel "Saya ingin… buka menu apa?".
- **Bagaimana**: alur status dokumen dengan bobot dan catatan bahwa Disetujui/Final hanya untuk admin/konsultan; kartu langkah: masuk pertama kali, memperbarui status & evidence (unggah dari halaman dokumen, lihat dari tabel), input data energi, variabel/EnPI/baseline, menindaklanjuti temuan, mengunduh laporan & bertanya ke asisten.
- Cuplikan 8 istilah inti dan link ke Glosarium.

### 8.14 Pengguna (`/pengguna`)

404 tanpa `pengguna.kelola`.

- Judul: "{n} pengguna aktif: {x} Admin, {y} Konsultan, {z} Tim KINRA, {w} Pembaca".
- **Tabel**: nama (+ "(Anda)", email), chip peran (admin warn, konsultan info, tim_kinra good, pembaca na), status ("Nonaktif", "Terkunci sementara", "Aktif"), terakhir masuk, tombol ubah dan atur ulang sandi.
- **Atur ulang sandi**: sandi acak 12 karakter dibuat di klien (tanpa 0, O, 1, l, I), konfirmasi "Atur ulang sandi {nama}? Sesi aktifnya akan diakhiri.", banner "Sandi sementara {nama} ({email}): {sandi} — sampaikan secara langsung; wajib diganti saat login."
- **Dialog**: Nama (wajib), Email (wajib, nonaktif saat ubah), Peran (default tim_kinra), Sandi sementara (baru saja; wajib, min 8, terisi acak), Aktif (ubah saja). Email duplikat: "Email sudah terdaftar."
- **Matriks hak akses** per peran dengan catatan "Ditegakkan di database (RLS & trigger), bukan hanya di tampilan."

---

## 9. Asisten AI

**UI** (tampil di semua halaman aplikasi bila database siap):

- Tombol bulat 52 px kanan bawah (ikon Bot, "Buka asisten AI").
- Panel 420 × 620 px (layar penuh di ≤ 640 px): judul "Asisten SMEn", sub "Gemini · membaca data dashboard", tombol "Hapus percakapan" dan "Tutup asisten".
- Kosong: "Tanyakan kesiapan dokumen, data energi, EnPI, temuan, atau hal umum ISO 50001." dan empat saran: "Dokumen mana yang lewat tenggat?", "Klausul apa yang paling lemah kesiapannya?", "Ringkas temuan audit yang masih terbuka", "Bagaimana tren konsumsi energi tahun ini?"
- Gelembung pesan teks biasa (`pre-wrap`, tanpa Markdown), indikator mengetik, auto-scroll, `aria-live`.
- Input: maks 4000 karakter, Enter kirim, Shift+Enter baris baru, Esc tutup. Saat streaming, tombol kirim menjadi "Hentikan jawaban".
- Catatan: "Jawaban AI bisa keliru. Periksa kembali sebelum dipakai sebagai bukti audit."
- Riwayat hanya di klien, hilang saat muat ulang.

**API** `POST /api/chat`:

- Body `{ pesan: [{ peran: 'user' | 'model', teks }] }`. Respons stream `text/plain; charset=utf-8`, `cache-control: no-store`.
- 401 "Sesi berakhir. Silakan masuk kembali." · 500 "GEMINI_API_KEY belum diisi …" · 400 "Pertanyaan kosong." · 502 "Gemini menolak permintaan: {msg}".
- Ambil 20 pesan terakhir, potong masing-masing 4000 karakter. Pesan terakhir wajib dari user.
- Panggil Gemini `models/{MODEL}:streamGenerateContent?alt=sse` dengan header `x-goog-api-key`, `temperature 0.3`, `maxOutputTokens 2048`. Batalkan bila klien membatalkan.
- **Instruksi sistem**: asisten SMEn KINRA, KEK Sei Mangkei; bahasa Indonesia, ringkas, teks biasa tanpa Markdown, daftar dengan "- "; pertanyaan data dijawab hanya dari data dashboard (bila tidak ada, katakan tidak ada, jangan mengarang angka); pengetahuan umum ISO 50001/50006 boleh dengan menyebut klausul. Tambahkan "Pengguna: {nama} ({peran})." dan blok "# DATA DASHBOARD".
- **Konteks** dibangun ulang setiap request dengan sesi pengguna (RLS berlaku): tanggal hari ini; tonggak; kesiapan total (dengan catatan bahwa dokumen tanpa berkas dihitung 0) dan per klausul; daftar dokumen belum siap "kode | nama | status (TERLAMBAT) | PIC | tenggat | evidence ada/belum"; TJ per tahun dan per sumber; setiap EnPI (metode, baseline, R², CV atau galat, bulan, perbaikan, hemat); sasaran dan aksi; temuan terbuka; isu dengan tingkat risiko; peluang; kegiatan.

---

## 10. Desain UI/UX

### Warna merek (tetap di kedua tema)

| Nama | Hex | Pemakaian |
|---|---|---|
| Hijau Tosca | `#008187` | warna institusi: blok merek, tombol utama, gelembung chat user. **Tidak dipakai di grafik.** |
| Merah | `#f15a22` | aksen, CUSUM memburuk |
| Jingga | `#fcaf17` | jalur ideal, insight perhatian |
| Biru | `#32a3dc` | aksen |
| Abu | `#4d4d4f` | |

Tombol utama: `linear-gradient(180deg, #0a959b, #008187)`.

### Token tema

Tema gelap adalah default `:root`; tema terang lewat `[data-theme="light"]` dan juga `@media (prefers-color-scheme: light)` untuk `:root:not([data-theme="dark"])`. Pilihan pengguna disimpan di cookie dan dipasang server di `<html data-theme>`.

| Token | Gelap | Terang |
|---|---|---|
| --page | #041214 | #eef3f3 |
| --surface / -2 / -3 | #0b1d20 / #10262a / #163135 | #ffffff / #f3f7f7 / #e4eded |
| --ink / --ink-2 / --muted | #eef6f6 / #c2d3d4 / #86a0a2 | #0f2629 / #34494c / #587073 |
| --brand | #3cc2c6 | #00797e |
| --good / --warn / --serious / --crit | #12b76a / #fab219 / #ec835a / #f04438 | #0e9258 / #b77b06 / #c95b2c / #d92d20 |
| --txt-good / --txt-bad | #6fd3a8 / #ff8a80 | #0b7a4a / #c4320a |
| --s1 / --s2 / --s3 (grafik) | #2a96d0 / #e0700f / #6f8385 | #2a96d0 / #e0700f / #7d8f91 |
| --heat-baik / --heat-netral / --heat-buruk | #2a96d0 / #2b3b3d / #f15a22 | netral #dfe7e7 |

### Tipografi dan bentuk

- Font: **Nunito Sans** (400–700) untuk UI dan angka; **IBM Plex Mono** (400–600) untuk eyebrow, kepala tabel, kode, angka tabel.
- Body 14 px (15 px mobile), line-height 1,55. Hero `clamp(32px, 3.6vw, 52px)`. h2 30 px (24 px mobile). h3 15 px. Eyebrow 11 px huruf besar, letter-spacing 0,16em. `.tnum` angka tabular.
- Radius: kartu 18 px, input/insight 12 px, tombol 10 px (tinggi 36, kecil 30), chip penuh.
- Kartu padding 22 px, jarak grid 16 px, konten maks 1400 px, jarak antar section 56 px.
- Easing `cubic-bezier(.2,.8,.2,1)`.

### Komponen

- Kartu dengan latar gradien, border gradien 1 px, bayangan lembut. Tile terangkat saat hover.
- Insight: strip kiri 3 px berwarna sesuai level (kritis, perhatian, positif, default).
- Tabel: kepala sticky mono huruf besar 10,5 px; angka rata kanan; sub-baris kecil; baris terlambat bergaris merah.
- Dialog form maks 720 px dengan backdrop blur.
- Kotak pesan `.pesan` (kuning) dan `.pesan.galat` (merah).
- Chip: ikon + teks + warna, selalu ketiganya. Makna: good = tercapai/final/tertutup/aktif; warn = review/proses/waspada; serious = draft/di bawah target/minor; crit = belum ada/terlambat/mayor/terbuka; info (biru) = disetujui/berjalan/verifikasi/OFI/peran; na (abu) = netral/nonaktif.

### Grafik (ECharts)

- Satu komponen pembungkus dengan spesifikasi: `batang` (kategori, seri, satuan, opsi horizontal), `garis`, `donat` (data, satuan, label tengah). Seri: nama, data, warna (s1/s2/s3/jingga/merah), putus-putus, tumpuk.
- Diinisialisasi saat masuk viewport, menyesuaikan ukuran, dan menggambar ulang saat tema berganti (warna dibaca dari CSS variable).
- Animasi 900 ms cubicOut; tooltip angka `id-ID` 2 desimal + satuan; legenda kanan atas (donat: bawah tengah); sumbu tanpa garis, label muted 11 px.
- Batang maks lebar 26 px; garis smooth 0,25, tidak menyambung null, titik 7 px.
- Konvensi: s1 = aktual/utama, s2 = pembanding, s3 = netral, jingga = jalur ideal, merah = CUSUM memburuk. Hindari pasangan merah-hijau di grafik.
- Pembungkus `role="img"` dengan `aria-label` berisi angka kunci.

### Gerak

- Hover 0,15–0,2 s; reveal 0,8 s; dialog "pop" 0,2 s; angka naik 900 ms; aurora 32–40 s; titik hitung mundur berdenyut 2,4 s.
- Animasi antrean unggah: denyut zona, kilau bar, putar ikon, centang meletup, goyang saat gagal, memudar saat sukses.
- `@media (prefers-reduced-motion: reduce)`: matikan semua animasi dan transisi. Komponen JS (angka naik, reveal) juga memeriksa preferensi ini.

### Responsif

| Lebar | Perubahan |
|---|---|
| ≤ 1280 px | tile 2 kolom |
| ≤ 1100 px | sidebar disembunyikan, strip navigasi mobile, grid 2 kolom jadi 1, insight 2 kolom |
| ≤ 900 px | halaman login satu kolom |
| ≤ 640 px | nama akun dan teks hitung mundur disembunyikan; tombol ikon 44 px; form, tile, insight 1 kolom; chat dan penampil berkas layar penuh |

### Aksesibilitas

- `:focus-visible` outline 2 px warna brand, offset 3 px.
- Semua tombol ikon punya `aria-label`; ikon dekoratif `aria-hidden`.
- Toggle memakai `aria-pressed`; navigasi `aria-current`.
- Galat form `role="alert"`; status simpan `role="status"`/`aria-live`.
- Angka beranimasi punya nilai akhir untuk screen reader.
- Kontras teks minimal WCAG AA di kedua tema.

---

## 11. Data awal (seed)

Seed dijalankan sebagai migrasi yang aman diulang. Ulang seed **tidak boleh menimpa** perubahan yang dibuat lewat aplikasi (status, PIC, tenggat dokumen tetap).

| Data | Isi |
|---|---|
| klausul | 27 baris: P (Persiapan awal, data pendukung) dan 4.1 sampai 10.2 sesuai ISO 50001:2018. `urutan` = kode tanpa titik (P = 0). |
| sumber_energi | pln "Listrik PLN" kWh 3,6e-6; pltbg "Listrik PLTBG (biogas)" kWh 3,6e-6 terbarukan; plts "Listrik PLTS (surya)" kWh 3,6e-6 terbarukan; dexlite "BBM Dexlite kendaraan operasional" liter 3,6e-5 (asumsi 36 MJ/liter). |
| energi_bulanan | 121 baris: 2024 (pln, pltbg, plts × 12), 2025 (4 sumber × 12), 2026 (listrik Jan–Sep, dexlite Jan–Okt). Ambil angka dari migrasi seed versi sekarang. |
| kegiatan | 14 kegiatan, 68 sesi, 16 Okt sampai 17 Des 2026 (Meeting Persiapan Awal, Kick Off, Persiapan Tim/Data, Training Pemahaman, Workshop Target/Program/Risiko, Training Internal Auditor, Sosialisasi Manual, Sosialisasi SOP, Implementasi SMEn, Internal Audit, Tinjauan Manajemen, TÜV Stage 1, TÜV Stage 2, Perbaikan Hasil Audit TÜV). |
| dokumen_audit | 79 dokumen: persiapan 11 (PA-01..11), manual 2 (MK-01..02), SOP 11 (SOP-002..012), formulir 38, rekaman 17. Status awal: final 5, review 4, draft 52, belum 18. Tenggat sebagian besar 2026-11-04. |
| isu | 23 isu (seed hanya bila tabel kosong). |
| peluang | 10 peluang P-01..P-10, status "Belum dinilai". |
| variabel_relevan | `tenant` (Tenant beroperasi, unit), `air_olahan` (Air olahan WTP, m³). |
| enpi | ENPI-01 "Total konsumsi energi kawasan" (4 sumber, absolut, baseline 2025, satuan TJ); ENPI-02 "Konsumsi listrik kawasan" (3 sumber listrik, absolut, baseline 2025, kWh). |
| pengguna | Satu admin `admin@kinra.co.id` ("Administrator SMEn") dengan sandi sementara dan `wajib_ganti_sandi = true`. Sandi sementara diberikan admin di luar repo, **jangan ditulis di kode atau dokumen**. |
| temuan | kosong |

Sumber angka seed yang lengkap: file migrasi `0002_seed.sql`, `0006_login_peran.sql`, dan `0007_kinerja_energi.sql` di repo versi sekarang. Salin datanya, bukan strukturnya.

---

## 12. Kebutuhan non-fungsional

| Aspek | Kebutuhan |
|---|---|
| Keamanan | Semua akses data lewat RLS dengan sesi. Bucket evidence privat. Tidak ada service-role key di klien. Redirect `lanjut` hanya ke path internal. Kunci akun setelah 5 kali salah sandi. |
| Kinerja | Halaman dirender server; grafik dimuat saat terlihat. Unggah berkas langsung ke Storage, tidak lewat server aplikasi. Query per halaman paralel. |
| Ketersediaan data | Aplikasi tetap tampil (dengan pesan migrasi) bila sebagian tabel belum dibuat. |
| Lokalisasi | Bahasa Indonesia, angka dan tanggal `id-ID`, zona waktu WIB. |
| Responsif | Bisa dipakai penuh di ponsel 360 px. |
| Aksesibilitas | WCAG 2.1 AA untuk kontras, fokus, label, dan gerak. |
| Audit trail | Setiap perubahan status dokumen tercatat (dari, ke, oleh, waktu). Setiap berkas mencatat pengunggah dan waktu. |
| Kualitas kode | TypeScript strict, `pnpm typecheck` dan `pnpm build` bersih. |

---

## 13. Kriteria penerimaan

Aplikasi dianggap selesai bila semua butir berikut lolos.

**Akses**

- [ ] Tanpa cookie, semua halaman mengarah ke `/masuk?lanjut=…`, dan setelah login kembali ke halaman asal.
- [ ] Login admin seed memaksa ganti sandi sebelum bisa membuka halaman lain.
- [ ] Lima kali salah sandi mengunci akun 15 menit dengan pesan jam WIB.
- [ ] Pembaca melihat semua halaman tetapi tidak melihat tombol ubah, dan permintaan tulis langsung ke API ditolak RLS.
- [ ] Tim KINRA tidak bisa memilih Disetujui/Final, dan bila dipaksa lewat API, trigger menolak.
- [ ] Halaman `/pengguna` 404 untuk selain admin.

**Kesiapan dan evidence**

- [ ] Dengan seed awal dan tanpa berkas, skor kesiapan 0%.
- [ ] Mengunggah satu berkas ke dokumen Final menaikkan skor sebesar 100/N poin.
- [ ] Unggah 5 berkas sekaligus: antrean menampilkan tiap tahap, persen bergerak, ringkasan sukses/gagal benar, berkas >50 MB gagal tanpa menghentikan yang lain, "Coba lagi" berhasil.
- [ ] Tombol "Lihat (n)" di tabel kesiapan membuka penampil tanpa pindah halaman; PDF, gambar, dan DOCX tampil.
- [ ] Pengguna yang tidak login tidak bisa membuka URL berkas tanpa signed URL yang berlaku.
- [ ] Menghapus dokumen menghapus berkas di Storage.
- [ ] Unduh CSV menghasilkan kolom persis seperti bagian 8.4 dan terbaca benar di Excel (BOM).
- [ ] Perubahan status tercatat di riwayat dan muncul di "Aktivitas terbaru".

**Energi dan kinerja**

- [ ] Total TJ per tahun sama dengan Σ nilai × faktor_tj dari seed.
- [ ] Input "3.470.845,34" tersimpan sebagai 3470845.34; sel kosong menghapus data.
- [ ] EnPI regresi dengan data sintetis yang diketahui (mis. y = 100 + 2x tanpa noise, 12 bulan) menghasilkan b0 = 100, b1 = 2, R² = 1.
- [ ] Mengubah periode baseline tanpa mengubah alasan ditolak dengan pesan klausul 6.5.
- [ ] CUSUM dan "Aktual vs harapan" tampil untuk EnPI dengan data pelaporan.

**Umum**

- [ ] Tema terang/gelap berganti tanpa berkedip saat muat ulang; grafik ikut berganti warna.
- [ ] Reduced motion mematikan semua animasi.
- [ ] Tampilan 360 px tidak memiliki scroll horizontal halaman.
- [ ] Chatbot menjawab dari data (mis. jumlah dokumen terlambat sesuai halaman Kesiapan) dan menampilkan galat jelas bila kunci API kosong.
- [ ] `pnpm typecheck` dan `pnpm build` tanpa galat.

---

## 14. Catatan perbedaan dan perbaikan untuk versi baru

Hal-hal yang ditemukan di versi sekarang. "Wajib" berarti harus dikerjakan di versi baru.

| No | Temuan di versi sekarang | Untuk versi baru |
|---|---|---|
| 1 | README masih menjelaskan evidence lewat link OneDrive. | **Wajib**: dokumentasi menjelaskan unggah ke Storage. |
| 2 | Kolom `dokumen_audit.link_eksternal` dan bucket lama `smen-dokumen` masih ada tetapi tidak dipakai. Struktur tabel `berkas` berbeda tergantung migrasi opsional 0004 dijalankan atau tidak. | **Wajib**: skema bersih tanpa kolom dan bucket lama. Buat skrip migrasi data dari database lama bila dipakai ulang. |
| 3 | View `kesiapan_klausul` tidak dipakai aplikasi. | Boleh dihapus. |
| 4 | Halaman Timeline menampilkan tombol ubah ke pembaca (ditolak di server). | **Wajib**: sembunyikan tombol tanpa `kegiatan.ubah`. |
| 5 | Sebagian perhitungan tanggal memakai zona waktu server/browser. | **Wajib**: semua "hari ini" dan tenggat memakai WIB. |
| 6 | Penghitung salah sandi tidak di-reset setelah kunci habis, sehingga setiap salah sandi berikutnya langsung mengunci lagi. | Pertahankan perilaku ini atau reset saat kunci habis; tuliskan pilihannya di README. |
| 7 | Tren kesiapan memakai kondisi berkas saat ini untuk hari-hari lalu. | Opsional: rekonstruksi dari `berkas.diunggah_at`. |
| 8 | Tidak ada pembatasan jenis berkas (mime). | Opsional: batasi ke PDF, gambar, Office, video, teks. |
| 9 | Chatbot tanpa pembatasan laju. | Opsional: batasi per pengguna (mis. 20 pertanyaan per 10 menit). |
| 10 | Panduan UI lama (`panduan-ui-ux-kinra.md`) menyebut fitur yang tidak ada (command palette ⌘K, ticker KPI, progress bar yang mengikuti scroll). | Ikuti bagian 10 dokumen ini, bukan panduan lama. |
| 11 | Tonggak audit ditulis langsung di kode. | Opsional: pindahkan ke tabel agar admin bisa mengubah. |
| 12 | Penampil Office mengirim signed URL ke layanan Microsoft. | Pertahankan, sebutkan di Panduan. |

---

## 15. Urutan pengerjaan yang disarankan

1. **Fondasi**: proyek Next.js, token CSS dan tema, font, layout auth dan aplikasi, komponen dasar (Chip, SectionHead, Tile, Grafik, dialog, kerangka loading, galat, 404).
2. **Database**: migrasi skema, fungsi sesi dan pengguna, trigger, RLS, bucket dan policy storage, seed. Uji policy storage dengan header `x-sesi` sebelum lanjut.
3. **Autentikasi**: proxy, login, ganti sandi, keluar, guard layout, modul akses dan context peran.
4. **Kesiapan audit**: halaman Kesiapan, detail dokumen, riwayat, unggah evidence dengan antrean, penampil berkas, CSV.
5. **Ringkasan**: skor, jalur, tren dan proyeksi, insight, PIC, aktivitas, heatmap klausul, agenda.
6. **Energi**: halaman Data Energi dan input.
7. **Kinerja**: mesin EnPI (dengan unit test untuk absolut, rasio, regresi, statistik, CUSUM), halaman Kinerja, variabel, definisi EnPI.
8. **Sasaran & Aksi**, **Isu & Peluang**, **Temuan**, **Timeline**.
9. **Pengguna**, **Panduan**, **Glosarium**.
10. **Asisten AI**.
11. **Pemeriksaan akhir**: kriteria penerimaan bagian 13, aksesibilitas, responsif, reduced motion, README (cara setup, env, urutan migrasi, catatan keamanan).
