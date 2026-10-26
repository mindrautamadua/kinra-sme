# Dashboard SMEn PT KINRA

Dashboard Sistem Manajemen Energi ISO 50001:2018 untuk PT Kawasan Industri Nusantara (KEK Sei Mangkei). Tujuannya: memantau kesiapan dokumen audit, data energi, register risiko/peluang, temuan audit, dan jadwal pendampingan dalam satu aplikasi.

Stack: Next.js 16 (App Router) + Supabase (Postgres). Evidence di OneDrive. UI mengikuti `panduan-ui-ux-kinra.md`.

## Menjalankan

```bash
pnpm install
pnpm dev            # http://localhost:3000
```

`.env.local` berisi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Asisten AI (opsional) memakai Gemini: isi `GEMINI_API_KEY` (dari Google AI Studio) di `.env.local`. Model bawaan `gemini-2.5-flash`, bisa diganti lewat `GEMINI_MODEL`. Kunci hanya dipakai di server dan tidak dikirim ke browser.

## Database

Jalankan di Supabase SQL Editor sesuai urutan nomor (semua aman diulang):

1. `supabase/migrations/0001_skema.sql`: tabel, view `kesiapan_klausul`, trigger riwayat status, RLS.
2. `0002_seed.sql`: data awal dari folder `sumber-data` (27 klausul, 79 dokumen, data energi 2024–2026, timeline Rev.3, 23 isu, 10 peluang). Menjalankan ulang tidak menimpa status, PIC, atau tenggat yang sudah diubah dari aplikasi.
3. `0003`–`0006`: evidence OneDrive, status kegiatan, login & peran.
4. `0007_kinerja_energi.sql`: variabel relevan, EnPI/EnB, sasaran, rencana aksi (+ RLS). Membuat 2 EnPI awal (metode absolut, baseline 2025) dan 2 variabel usulan tanpa data.
5. `0008_peran_pembaca.sql`: menambah peran `pembaca` (hanya lihat).
6. `0009_tim_kinra_ubah.sql`: Tim KINRA boleh mengubah variabel relevan, EnPI & baseline, dan sasaran.

## Evidence

Satu kanal: semua berkas bukti disimpan di folder OneDrive SMEn (`FOLDER_BUKTI` di `lib/status.ts`). Aplikasi hanya menyimpan tautan OneDrive per dokumen (kolom `link_eksternal`). Dokumen tanpa tautan ditandai "belum" di lembar kesiapan.

Cara mengisi: unggah berkas ke OneDrive → Bagikan → Salin tautan → tempel di kolom *Tautan evidence (OneDrive)* pada halaman dokumen.

## Halaman

| Rute | Isi |
|---|---|
| `/` | Ringkasan: skor kesiapan, matriks per klausul, tenggat terdekat, sesi berikutnya, energi |
| `/kesiapan` | Lembar monitoring kesiapan audit: filter, ubah status langsung, unduh CSV |
| `/dokumen/[id]` | Detail dokumen, tautan evidence OneDrive, riwayat status, temuan terkait |
| `/energi` | Grafik dan input data energi bulanan (kWh, liter → TJ) |
| `/kinerja` | EnPI & baseline energi (EnB): konsumsi aktual vs harapan ternormalisasi, CUSUM, validitas model (R², CV(RMSE)), input variabel relevan bulanan, definisi EnPI |
| `/sasaran` | Sasaran & target energi terhubung ke EnPI, rencana aksi, penghematan terverifikasi, peluang disetujui yang belum punya aksi |
| `/register` | Isu internal/eksternal (matriks 5×5) dan peluang peningkatan |
| `/temuan` | Temuan audit internal & TÜV, alur Terbuka → Tertutup |
| `/timeline` | Gantt dan status kegiatan (tandai selesai) |
| `/panduan` | Panduan pengguna 5W1H; matriks hak akses dibaca langsung dari `lib/akses.ts` |
| `/pengguna` | Kelola akun dan peran (admin) |
| `/masuk`, `/ganti-sandi` | Login dan ganti sandi |

## Login & peran

Login memakai tabel `pengguna` di Supabase (bukan Supabase Auth); sandi di-hash bcrypt. Fungsi `masuk()` memberi token sesi 12 jam yang disimpan di cookie httpOnly `kinra_sesi`. Setiap request ke Supabase membawa token di header `x-sesi`, dan policy RLS membaca peran dari token itu. Tanpa token sah, publishable key tidak bisa membaca atau menulis data.

| Peran | Hak utama |
|---|---|
| Admin | Semua tindakan, termasuk hapus data dan kelola pengguna (`/pengguna`) |
| Konsultan | Definisikan EnPI, baseline & variabel relevan, kelola sasaran, tambah dokumen, setujui dokumen (Disetujui/Final), catat & tutup temuan, isi isu/peluang, tandai kegiatan |
| Tim KINRA | Lengkapi dokumen & tautan evidence, input data energi & variabel relevan, ubah EnPI/baseline, variabel relevan & sasaran yang sudah ada, kelola rencana aksi, tindak lanjut temuan, isi isu/peluang, tandai kegiatan |
| Pembaca | Hanya melihat semua halaman dan mengunduh CSV; tidak bisa mengubah data apa pun (cocok untuk direksi, auditor, atau tamu). Tetap bisa ganti sandi sendiri |

Matriks lengkap ada di `lib/akses.ts` dan harus sinkron dengan policy di `0006_login_peran.sql`.

Admin awal dibuat oleh migrasi 0006: `admin@kinra.co.id` dengan sandi sementara `GantiSandi#2026`. Aplikasi memaksa ganti sandi saat login pertama. Akun terkunci 15 menit setelah 5 kali salah sandi.

## Asisten AI

Tombol bulat di kanan bawah membuka chat Gemini. Route `app/api/chat/route.ts` memeriksa sesi, lalu `lib/konteks-ai.ts` menyusun ringkasan data dashboard (kesiapan, energi, EnPI, sasaran, temuan, isu, peluang, kegiatan) yang dibaca dengan token sesi pengguna sehingga RLS tetap berlaku. Ringkasan itu dikirim ke Gemini sebagai instruksi sistem setiap pertanyaan. Asisten hanya membaca; tidak bisa mengubah data. Percakapan tidak disimpan dan hilang saat halaman dimuat ulang.

## Asumsi data

- Faktor konversi BBM Dexlite 36 MJ/liter adalah asumsi nilai kalor diesel; verifikasi dengan data pemasok (ubah di tabel `sumber_energi`).
- Listrik PLN adalah jumlah semua sambungan PLN kawasan per bulan.
- Tenggat awal dokumen ditetapkan sebelum Internal Audit (4 Nov 2026) atau mengikuti jadwal Timeline Rev.3; sesuaikan di aplikasi.
- Status dokumen persiapan awal no. 6–9 diisi "Review" karena berkasnya sudah diterima tetapi kolom status di Checklist Monev masih kosong.

## Kinerja energi (EnPI & EnB)

Perhitungan di `lib/enpi.ts`, mengikuti ISO 50006:
- **Absolut**: konsumsi dibanding bulan kalender yang sama pada baseline. Tidak menormalisasi, hanya untuk titik awal.
- **Rasio**: konsumsi ÷ satu variabel; harapan = rasio baseline × variabel bulan berjalan.
- **Regresi**: OLS konsumsi terhadap satu atau lebih variabel pada periode baseline. Model dianggap layak bila n ≥ 12, R² ≥ 0,75, CV(RMSE) ≤ 15% (ASHRAE Guideline 14).

Perbaikan (%) = (Σ harapan − Σ aktual) ÷ Σ harapan pada bulan pelaporan (setelah baseline). CUSUM = Σ(aktual − harapan); menurun berarti hemat. Bulan dihitung hanya bila semua sumber dalam ruang lingkup EnPI dan semua variabelnya terisi.
