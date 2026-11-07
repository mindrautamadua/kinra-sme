# Catatan Tindak Lanjut SMEn KINRA

Dibuat 6 November 2026. Centang setiap butir yang sudah selesai.

## 1. Migrasi database yang perlu dijalankan

Jalankan di SQL Editor Supabase sesuai urutan. Semua migrasi aman dijalankan ulang.

- [x] `0018_catatan_kesiapan.sql`: kolom posisi draf dan keterangan di lembar Kesiapan
- [x] `0019_status_final_tim_kinra.sql`: Tim KINRA boleh mengubah status menjadi Final
- [x] `0020_tim_kinra_hapus_dokumen.sql`: Tim KINRA boleh menghapus item dokumen
- [x] `0021_tim_kinra_tambah_dokumen.sql`: Tim KINRA boleh menambah dokumen
- [x] `0022_aset_meter.sql`: tabel aset, meter energi, dan bacaan stand meter, beserta data awal 40 aset dan 7 meter
- [x] `0023_variabel_distribusi_air.sql`: data distribusi air WTP I Januari 2024 s.d. Oktober 2026 dan EnPI-03
- [x] `0024_variabel_tenant.sql`: jumlah tenant beroperasi per bulan
- [x] `0025_enpi_utama.sql`: penanda EnPI utama; EnPI-01 diubah menjadi EnPI BBM kendaraan
- [x] `0026_lingkup_kinra.sql`: pemisahan lingkup KINRA dan kawasan; EnPI-04 (listrik pemakaian sendiri) dan EnPI-05 (intensitas energi WTP)
- [x] `0027_tinjauan_energi_seu.sql`: tabel tinjauan energi dan register SEU; data awal SEU-01 WTP dan SEU-02 WWTP (status Kandidat)
- [x] `0028_deviasi.sql`: register deviasi signifikan kinerja energi (klausul 9.1)
- [x] `0029_simulasi_audit.sql`: riwayat simulasi audit bersama KIRA
- [x] `0030_parameter_energi.sql`: tarif listrik dan faktor emisi untuk tampilan rupiah dan CO₂
- [ ] `0031_berkas_sah.sql`: penanda versi sah per berkas evidence; skor kesiapan menjadi "siap audit" (Final + berkas sah)
- [ ] `0032_isi_sah_final.sql`: tandai otomatis berkas versi sah untuk item yang sudah Final (PDF bila ada, selain itu semua berkas)
- [ ] `0033_potret_kesiapan.sql`: potret skor harian untuk pembanding di laporan kesiapan
- [ ] `0034_kegiatan_keterkaitan.sql`: keterkaitan kegiatan pendampingan dengan klausul/dokumen serta kendala & tindak lanjut (PICA)
- [ ] `0035_kwh_tagihan_meter.sql`: kolom kWh tagihan pada bacaan meter, kWh bulanan 7 meter aset Jan 2024 – Okt 2026 (Graha Apr 2025 dikoreksi), BBM bensin, Dexlite 2024 dan Okt 2026, baseline EnPI-04 Jan–Des 2025, EnPI-06 (WWTP) dan EnPI-09 (bensin). Perlu kode aplikasi terbaru (kolom `kwh_tagihan`).
- [ ] **Cek urutan migrasi.** Bila EnPI-03 muncul di kelompok "Lingkup SMEn KINRA" di halaman Kinerja, jalankan ulang `0026_lingkup_kinra.sql`.

Migrasi 0018–0030 sudah dijalankan di Supabase (6 November 2026). File 0027–0030 dan perubahan aplikasi terkait belum di-commit ke repositori.

## 2. Pengumpulan data rutin

- [ ] **Bacaan stand meter bulanan.** Mulai November 2026, isi stand awal dan stand akhir ketujuh meter setiap bulan di halaman Aset & Meter. PIC yang diusulkan: Bagian M/E. Data ini satu-satunya sumber EnPI-04 dan EnPI-05, dan baseline keduanya baru terbentuk setelah 12 bulan (November 2026 s.d. Oktober 2027).
- [ ] **Distribusi air dan jumlah tenant bulanan.** Tambahkan setiap bulan di halaman Kinerja Energi, bagian Variabel relevan, mulai November 2026.
- [ ] **Stand meter dari sheet "Layout Data Energi".** Tentukan bulan pembacaannya, lalu masukkan sebagai bacaan pertama.

## 3. Konfirmasi ke Bagian M/E

- [ ] **Cakupan meter WTP.** Apakah meter WTP (KINRA-MTR-005, No. 250392323) melayani WTP I saja, atau juga WTP II (BTM)? Jawabannya menentukan pembagi pada EnPI-05 (kWh/m³).
- [ ] **PLTBG dan PLTS.** Siapa pemiliknya, siapa pemakainya, dan apakah termasuk lingkup SMEn KINRA? Untuk sementara keduanya dicatat sebagai pasokan kawasan.
- [ ] **Data PLTBG September 2026.** Nilainya 245 ribu kWh, sekitar 75% di bawah bulan-bulan lain (0,6–1,0 juta kWh). Pastikan apakah datanya belum lengkap atau pembangkit sedang gangguan atau perawatan.
- [ ] **Meter air baku WTP.** Apakah ada meter air baku atau produksi WTP? Saat ini yang tercatat hanya distribusi, sehingga kehilangan air tidak diketahui.
- [ ] **Ruang Boiler Tank Farm (895 m²).** Siapa pemilik dan operatornya, apa bahan bakarnya, dan berapa konsumsinya per bulan? Bila dioperasikan KINRA, boiler ini berpotensi menjadi SEU ketiga.
- [ ] **Kolom "PLTS" di sheet air 2026.** Pastikan apakah itu unit KINRA atau tenant. Saat ini kolom tersebut tidak dihitung sebagai tenant.

## 4. Perbaikan data aset dan meter

- [ ] **Bea Cukai.** Pastikan meter Bea Cukai 1 melayani Pos sisi timur dan Bea Cukai 2 melayani sisi barat. Saat ini tautannya disimpulkan dari kemiripan angka kWh.
- [ ] **Gudang limbah 8x6 m.** Periksa apakah aset no. 3 (96 m²) dan no. 21 (48 m²) adalah bangunan yang sama.
- [ ] **Data aset kosong atau janggal.** Lengkapi luas WTP, jumlah ruangan Kantor PLTBS (tercatat 0), dan luas Gardu Pengukuran PLN (tercatat 0).
- [ ] **Salah ketik nama aset.** Perbaiki "Pusat Inovasi Kelapa Sawi" dan "PT Sheel Oil".
- [ ] **Kolom register meter yang masih kosong.** Lengkapi akurasi atau kelas, tanggal kalibrasi atau verifikasi terakhir dan berikutnya, PIC area, PIC data, dan bukti pendukung (klausul 7.1.5 dan 9.1).

## 5. Rencana submeter SEU (rencana pengumpulan data energi, klausul 6.6 dan 9.1)

Titik di bawah adalah rancangan umum. Cocokkan dulu dengan diagram satu garis (single line diagram) dan panel MCC di lapangan sebelum pengadaan. Setiap meter yang terpasang didaftarkan di halaman Aset & Meter (dengan faktor kali dan jadwal kalibrasi), lalu ditambahkan ke SEU terkait di halaman Tinjauan Energi & SEU.

**Spesifikasi umum:** power meter multifungsi kelas 0,5S atau 1, dipasang dengan CT di panel. Meter mencatat kWh, kW, dan faktor daya, dan sebaiknya punya port komunikasi Modbus untuk pencatatan otomatis (AMR). Motor besar yang menjadi kandidat VSD diukur per motor, bukan per panel.

### 5.1 WTP (SEU-01, meter utama KINRA-MTR-005)

| Tahap | Titik ukur | Jenis | Kegunaan |
|---|---|---|---|
| Sudah ada | Meter utama WTP | kWh | Total WTP; dasar EnPI-05 |
| 1 | Panel pompa distribusi (high-lift ke jaringan kawasan) | kWh | Biasanya beban terbesar; bergantung pada volume air dan tekanan jaringan |
| 1 | Panel pompa air baku / intake | kWh | Beban terbesar kedua; bergantung pada volume air baku dan muka air sumber |
| 1 | Flow meter air baku masuk | m³ | kWh/m³ pompa intake; kehilangan air (air baku dikurangi air terdistribusi) |
| 1 | Pengukur tekanan header distribusi | bar | Tekanan berlebih adalah sumber pemborosan pompa paling umum |
| 2 | Pompa backwash dan blower filter | kWh | Beban sesekali tetapi besar; frekuensi dan efisiensi pencucian filter |
| 2 | Beban proses: mixer, flokulator, pompa dosing, scraper clarifier | kWh | Relatif tetap; mendeteksi alat menyala di luar jadwal |
| 2 | Flow meter air backwash (opsional) | m³ | Porsi air terbuang saat pencucian |
| 3 | Penunjang: kantor, laboratorium, penerangan, AC | kWh | Memisahkan beban bangunan agar EnPI proses bersih |

**Indikator yang dimungkinkan:**
- kWh per m³ air terdistribusi (EnPI-05)
- kWh per m³ per tahap pompa
- efisiensi pompa wire-to-water, dihitung dari flow, tekanan, dan kW
- persentase kehilangan air

- [ ] Konfirmasi konfigurasi pompa WTP: jumlah unit, daya motor, dan apakah sudah memakai VSD.
- [ ] Konfirmasi apakah WTP II (BTM) dilayani panel atau meter yang sama dengan WTP I.
- [ ] Pengadaan dan pemasangan submeter tahap 1, sebelum audit Stage 2 bila memungkinkan.
- [ ] Pengadaan submeter tahap 2 dan 3, dijadwalkan dalam rencana aksi dan anggaran.

### 5.2 WWTP (SEU-02, meter utama KINRA-MTR-004)

| Tahap | Titik ukur | Jenis | Kegunaan |
|---|---|---|---|
| Sudah ada | Meter utama WWTP | kWh | Total WWTP; dasar EnPI WWTP yang akan dibentuk |
| 1 | Panel blower / aerator kolam aerasi | kWh | Pada pengolahan biologis, aerasi umumnya beban terbesar dan sumber penghematan utama |
| 1 | Flow meter air limbah masuk (influent) | m³ | Variabel relevan utama: kWh per m³ air limbah diolah |
| 1 | Sensor oksigen terlarut (DO) di kolam aerasi | mg/L | Aerasi berlebih (DO terlalu tinggi) adalah pemborosan paling umum; dasar kontrol blower otomatis |
| 2 | Pompa influent / lift station dan equalisasi | kWh | Beban kedua; bergantung pada debit masuk |
| 2 | Pompa lumpur balik dan lumpur buang (RAS/WAS) | kWh | Beban kontinu; sering bisa dioptimalkan jadwalnya |
| 2 | Pengolahan lumpur: dewatering (belt/screw press), pompa lumpur | kWh | Bergantung pada volume lumpur |
| 2 | Data beban organik dari laboratorium (COD/BOD masuk dan keluar) | kg | Indikator kWh per kg COD tersisihkan, lebih adil bila kualitas limbah tenant berubah |
| 3 | Mixer, pompa dosing kimia, penunjang (kantor WWTP, laboratorium, penerangan) | kWh | Beban relatif tetap; memisahkan beban bangunan |

**Indikator yang dimungkinkan:**
- kWh per m³ air limbah diolah (calon EnPI SEU-02)
- kWh per kg COD tersisihkan
- kWh blower per m³ udara
- profil DO terhadap kebutuhan

- [ ] Konfirmasi jenis proses WWTP (lumpur aktif, aerasi permukaan, atau difuser) beserta jumlah dan daya blower/aerator.
- [ ] Pastikan ada flow meter influent dan data COD/BOD rutin dari laboratorium. Bila sudah ada, daftarkan debit air limbah sebagai variabel relevan SEU-02 dan bentuk EnPI WWTP.
- [ ] Pengadaan dan pemasangan submeter blower/aerator dan sensor DO (tahap 1).
- [ ] Pengadaan submeter tahap 2 dan 3, dijadwalkan dalam rencana aksi dan anggaran.

### 5.3 Untuk audit

- [ ] Tuangkan kedua tabel di atas ke dokumen Rencana Pengumpulan Data Energi (klausul 6.6), lengkap dengan PIC, tanggal target per tahap, dan frekuensi pembacaan. Auditor menerima rencana yang jelas walaupun meter belum semua terpasang.

## 6. Keputusan Tim SMEn dan konsultan

- [ ] **Periksa pemetaan kegiatan.** Pemetaan awal kegiatan pendampingan ke klausul dan dokumen (migrasi 0034) adalah usulan dari nama kegiatan. Konsultan memeriksa dan mengoreksinya di halaman Timeline (tombol tautan pada tiap kegiatan), serta mengisi kendala dan tindak lanjut untuk kegiatan yang bermasalah.

- [ ] **Tandai berkas versi sah dan sahkan dokumen.** Skor kesiapan kini dihitung dari dokumen berstatus Final yang punya berkas bertanda versi sah, sehingga angkanya akan turun dibanding skor lama (yang hanya menghitung ada berkas). Untuk setiap item: tandai PDF yang sudah disahkan/ditandatangani (atau rekaman yang lengkap) sebagai versi sah, lalu ubah status menjadi Final. Prioritaskan dokumen wajib ISO sebelum TÜV Stage 1 (20 November 2026). Komunikasikan ke tim bahwa penurunan angka adalah perubahan cara hitung, bukan kemunduran.

- [ ] **Nilai ulang skor risiko.** Seluruh 18 risiko di register dinilai sama (dampak 3 × kemungkinan 2 = 6, rendah). Penilaian seragam mudah dipertanyakan auditor (klausul 6.1). Nilai ulang bersama pemilik risiko, termasuk risiko baru menjelang audit (SEU belum ditetapkan, EnPI lingkup KINRA belum punya data).
- [ ] **Nilai peluang peningkatan.** Isi skor energi, skor ROI, dan estimasi kWh untuk P-01 s.d. P-10 agar muncul di matriks prioritas; mulai dari yang terkait SEU (P-03 pompa, P-04 submeter).

- [ ] **Verifikasi parameter rupiah dan CO₂** (halaman Data Energi, bagian 03): faktor emisi listrik grid Sumatera dari KESDM, harga Dexlite dari tagihan pemasok, dan faktor emisi solar. Saat ini berstatus Asumsi; tarif listrik Rp1.122,08/kWh berasal dari data inventaris.

- [ ] **Deviasi BBM 2026.** EnPI-01 (BBM kendaraan) memunculkan 9 deviasi bulanan ke arah boros (+20% s.d. +82% terhadap bulan yang sama 2025) dan 1 deviasi tren. Selidiki penyebabnya (penambahan armada, jam operasi, pencatatan) di halaman Kinerja Energi sebelum audit internal.
- [ ] **Latihan simulasi audit.** Setiap unit auditee menjalankan minimal satu simulasi Stage 2 bersama KIRA sebelum TÜV Stage 1 (20 November 2026), dimulai dari Manajemen Puncak, MR, dan Manajer Energi.

- [ ] **Baseline baru.** Kondisi tenant 2026 jauh berbeda dari 2025. Selama baseline masih 2025, EnPI-02 akan selalu terbaca boros dan EnPI-03 selalu ekstrapolasi. Putuskan penyesuaian baseline sesuai klausul 6.5.
- [ ] **Sasaran energi.** Pindahkan sasaran yang memakai EnPI-02 atau EnPI-03 (lingkup kawasan, termasuk tenant) ke EnPI-04 atau EnPI-05 (lingkup KINRA).
- [ ] **Penetapan SEU.** SEU-01 (WTP, sekitar 51% energi KINRA) dan SEU-02 (WWTP, sekitar 42%) sudah ada di register sebagai Kandidat. Tetapkan dalam rapat Tim Energi, lalu admin atau konsultan mengubah statusnya menjadi Ditetapkan di halaman Tinjauan Energi & SEU dan menyetujui catatan tinjauan energi.
- [ ] **Variabel relevan WWTP.** Tentukan variabel relevan untuk SEU-02, misalnya debit air limbah masuk, beserta sumber datanya.
- [ ] **Strategi EnPI menghadapi audit.** Jadwal audit internal (5–24 November 2026), TÜV Stage 1 (20 November 2026), dan Stage 2 (10–11 Desember 2026) lebih cepat dari baseline EnPI-04/05 (Oktober 2027). Putuskan bersama konsultan: rekonstruksi baseline sementara dari tagihan PLN per sambungan aset KINRA bila tagihannya terpisah, atau tunjukkan rencana pengukuran beserta bacaan meter yang sudah berjalan sebagai bukti.
- [ ] **Variabel relevan untuk EnPI BBM.** Tentukan variabel relevan EnPI-01, misalnya jam operasi atau km tempuh kendaraan, agar EnPI itu bisa dinormalisasi.
- [ ] **Peta batas EnMS.** Lengkapi dokumen Ruang Lingkup & Batasan (F-4.3-01) dengan daftar aset, peta batas, dan diagram meter dari halaman Aset & Meter.
- [ ] **Hak hapus dokumen.** Hapus dokumen di Kesiapan saat ini diizinkan untuk Admin dan Tim KINRA. Putuskan apakah Admin tetap diberi hak ini.

## 7. Keputusan yang sudah diambil (6 November 2026)

- **Kriteria SEU.** Porsi konsumsi ≥ 10%, **atau** termasuk kelompok teratas yang membentuk 80% konsumsi, **atau** ditetapkan karena potensi perbaikan atau persyaratan hukum. Ambang dapat diubah di catatan tinjauan energi.
- **Wewenang SEU.** Penetapan dan pencabutan SEU serta persetujuan tinjauan energi hanya oleh Admin dan Konsultan. Tim KINRA mengusulkan kandidat dan mengisi detail.
- **BBM kendaraan.** Dihitung sebagai satu pengguna energi di Pareto (dikonversi ke kWh setara, sekitar 2,5% energi KINRA). Belum memenuhi kriteria SEU.
- **Peta SMEn.** Dibuat sebagai halaman sendiri (menu kedua, setelah Ringkasan) ditambah strip 12 langkah di bagian atas Ringkasan.

## 8. Usulan fitur yang belum diputuskan

- [ ] Rupiah dan emisi CO₂ pada halaman Energi, Kinerja, dan Sasaran
- [ ] Penjelasan istilah langsung di tempat (arahkan kursor ke istilah teknis) dan kalimat "artinya…" pada kartu angka
- [ ] Modul pengendalian operasional dan pemeliharaan SEU (klausul 8.1)
- [ ] Matriks kompetensi personel SEU (klausul 7.2–7.3)
- [ ] Register persyaratan hukum dan status kepatuhannya
- [ ] Paket masukan tinjauan manajemen otomatis (klausul 9.3)

Usulan berikut berasal dari materi Sosialisasi Kebijakan, Manual dan SOP:

- [ ] Pustaka SOP
- [ ] Register KPI
- [ ] Modul sosialisasi dengan kuis
- [ ] Pemilik dokumen per SOP
- [ ] Register risiko per unit kerja
- [ ] **Penomoran SOP.** Tetapkan penomoran SOP resmi: penomoran di materi sosialisasi berbeda dengan penomoran di aplikasi untuk SOP 3–13.
