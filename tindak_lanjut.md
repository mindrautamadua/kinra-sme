# Catatan Tindak Lanjut SMEn KINRA

Dibuat 6 November 2026. Centang setiap butir yang sudah selesai.

## 1. Migrasi database yang perlu dijalankan

Jalankan di SQL Editor Supabase sesuai urutan. Semua migrasi aman dijalankan ulang.

- [ ] `0018_catatan_kesiapan.sql`: kolom posisi draf dan keterangan di lembar Kesiapan
- [ ] `0019_status_final_tim_kinra.sql`: Tim KINRA boleh mengubah status menjadi Final
- [ ] `0020_tim_kinra_hapus_dokumen.sql`: Tim KINRA boleh menghapus item dokumen
- [ ] `0021_tim_kinra_tambah_dokumen.sql`: Tim KINRA boleh menambah dokumen
- [ ] `0022_aset_meter.sql`: tabel aset, meter energi, dan bacaan stand meter, beserta data awal 40 aset dan 7 meter
- [ ] `0023_variabel_distribusi_air.sql`: data distribusi air WTP I Januari 2024 s.d. Oktober 2026 dan EnPI-03
- [ ] `0024_variabel_tenant.sql`: jumlah tenant beroperasi per bulan
- [x] `0025_enpi_utama.sql`: penanda EnPI utama; EnPI-01 diubah menjadi EnPI BBM kendaraan
- [x] `0026_lingkup_kinra.sql`: pemisahan lingkup KINRA dan kawasan; EnPI-04 (listrik pemakaian sendiri) dan EnPI-05 (intensitas energi WTP)

Migrasi 0025 dan 0026 sudah dijalankan di Supabase (6 November 2026), tetapi file-nya belum di-commit ke repositori.

## 2. Pengumpulan data rutin

- [ ] **Bacaan stand meter bulanan.** Mulai November 2026, isi stand awal dan stand akhir ketujuh meter setiap bulan di halaman Aset & Meter. PIC yang diusulkan: Bagian M/E. Data ini satu-satunya sumber EnPI-04 dan EnPI-05, dan baseline keduanya baru terbentuk setelah 12 bulan (November 2026 s.d. Oktober 2027).
- [ ] **Distribusi air dan jumlah tenant bulanan.** Tambahkan setiap bulan di halaman Kinerja Energi, bagian Variabel relevan, mulai November 2026.
- [ ] **Stand meter dari sheet "Layout Data Energi".** Tentukan bulan pembacaannya, lalu masukkan sebagai bacaan pertama.

## 3. Konfirmasi ke Bagian M/E

- [ ] **Cakupan meter WTP.** Apakah meter WTP (KINRA-MTR-005, No. 250392323) melayani WTP I saja, atau juga WTP II (BTM)? Jawabannya menentukan pembagi pada EnPI-05 (kWh/m³).
- [ ] **PLTBG dan PLTS.** Siapa pemiliknya, siapa pemakainya, dan apakah termasuk lingkup SMEn KINRA? Untuk sementara keduanya dicatat sebagai pasokan kawasan.
- [ ] **Data PLTBG September 2026.** Nilainya 245 ribu kWh, sekitar 75% di bawah bulan-bulan lain (0,6–1,0 juta kWh). Pastikan apakah datanya belum lengkap atau pembangkit sedang gangguan atau perawatan.
- [ ] **Meter air baku WTP.** Apakah ada meter air baku atau produksi WTP? Saat ini yang tercatat hanya distribusi, sehingga kehilangan air tidak diketahui.
- [ ] **Kolom "PLTS" di sheet air 2026.** Pastikan apakah itu unit KINRA atau tenant. Saat ini kolom tersebut tidak dihitung sebagai tenant.

## 4. Perbaikan data aset dan meter

- [ ] **Bea Cukai.** Pastikan meter Bea Cukai 1 melayani Pos sisi timur dan Bea Cukai 2 melayani sisi barat. Saat ini tautannya disimpulkan dari kemiripan angka kWh.
- [ ] **Gudang limbah 8x6 m.** Periksa apakah aset no. 3 (96 m²) dan no. 21 (48 m²) adalah bangunan yang sama.
- [ ] **Data aset kosong atau janggal.** Lengkapi luas WTP, jumlah ruangan Kantor PLTBS (tercatat 0), dan luas Gardu Pengukuran PLN (tercatat 0).
- [ ] **Salah ketik nama aset.** Perbaiki "Pusat Inovasi Kelapa Sawi" dan "PT Sheel Oil".
- [ ] **Kolom register meter yang masih kosong.** Lengkapi akurasi atau kelas, tanggal kalibrasi atau verifikasi terakhir dan berikutnya, PIC area, PIC data, dan bukti pendukung (klausul 7.1.5 dan 9.1).

## 5. Keputusan Tim SMEn dan konsultan

- [ ] **Baseline baru.** Kondisi tenant 2026 jauh berbeda dari 2025. Selama baseline masih 2025, EnPI-02 akan selalu terbaca boros dan EnPI-03 selalu ekstrapolasi. Putuskan penyesuaian baseline sesuai klausul 6.5.
- [ ] **Sasaran energi.** Pindahkan sasaran yang memakai EnPI-02 atau EnPI-03 (lingkup kawasan, termasuk tenant) ke EnPI-04 atau EnPI-05 (lingkup KINRA).
- [ ] **Penetapan SEU.** WTP dan WWTP adalah calon SEU, karena keduanya pengguna listrik terbesar di antara aset KINRA (sekitar 210 ribu dan 172 ribu kWh per bulan).
- [ ] **Variabel relevan untuk EnPI BBM.** Tentukan variabel relevan EnPI-01, misalnya jam operasi atau km tempuh kendaraan, agar EnPI itu bisa dinormalisasi.
- [ ] **Peta batas EnMS.** Lengkapi dokumen Ruang Lingkup & Batasan (F-4.3-01) dengan daftar aset, peta batas, dan diagram meter dari halaman Aset & Meter.
- [ ] **Hak hapus dokumen.** Hapus dokumen di Kesiapan saat ini diizinkan untuk Admin dan Tim KINRA. Putuskan apakah Admin tetap diberi hak ini.

## 6. Usulan fitur yang belum diputuskan

Usulan berikut berasal dari materi Sosialisasi Kebijakan, Manual dan SOP:

- [ ] Pustaka SOP
- [ ] Register KPI
- [ ] Modul sosialisasi dengan kuis
- [ ] Pemilik dokumen per SOP
- [ ] Register risiko per unit kerja
- [ ] **Penomoran SOP.** Tetapkan penomoran SOP resmi: penomoran di materi sosialisasi berbeda dengan penomoran di aplikasi untuk SOP 3–13.
