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
- [ ] `0027_tinjauan_energi_seu.sql`: tabel tinjauan energi dan register SEU; data awal SEU-01 WTP dan SEU-02 WWTP (status Kandidat)
- [ ] **Cek urutan migrasi.** Bila EnPI-03 muncul di kelompok "Lingkup SMEn KINRA" di halaman Kinerja, jalankan ulang `0026_lingkup_kinra.sql`.

Migrasi 0018–0026 sudah dijalankan di Supabase (6 November 2026). File 0027 belum di-commit ke repositori.

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

## 5. Keputusan Tim SMEn dan konsultan

- [ ] **Baseline baru.** Kondisi tenant 2026 jauh berbeda dari 2025. Selama baseline masih 2025, EnPI-02 akan selalu terbaca boros dan EnPI-03 selalu ekstrapolasi. Putuskan penyesuaian baseline sesuai klausul 6.5.
- [ ] **Sasaran energi.** Pindahkan sasaran yang memakai EnPI-02 atau EnPI-03 (lingkup kawasan, termasuk tenant) ke EnPI-04 atau EnPI-05 (lingkup KINRA).
- [ ] **Penetapan SEU.** SEU-01 (WTP, sekitar 51% energi KINRA) dan SEU-02 (WWTP, sekitar 42%) sudah ada di register sebagai Kandidat. Tetapkan dalam rapat Tim Energi, lalu admin atau konsultan mengubah statusnya menjadi Ditetapkan di halaman Tinjauan Energi & SEU dan menyetujui catatan tinjauan energi.
- [ ] **Variabel relevan WWTP.** Tentukan variabel relevan untuk SEU-02, misalnya debit air limbah masuk, beserta sumber datanya.
- [ ] **Strategi EnPI menghadapi audit.** Jadwal audit internal (5–24 November 2026), TÜV Stage 1 (20 November 2026), dan Stage 2 (10–11 Desember 2026) lebih cepat dari baseline EnPI-04/05 (Oktober 2027). Putuskan bersama konsultan: rekonstruksi baseline sementara dari tagihan PLN per sambungan aset KINRA bila tagihannya terpisah, atau tunjukkan rencana pengukuran beserta bacaan meter yang sudah berjalan sebagai bukti.
- [ ] **Variabel relevan untuk EnPI BBM.** Tentukan variabel relevan EnPI-01, misalnya jam operasi atau km tempuh kendaraan, agar EnPI itu bisa dinormalisasi.
- [ ] **Peta batas EnMS.** Lengkapi dokumen Ruang Lingkup & Batasan (F-4.3-01) dengan daftar aset, peta batas, dan diagram meter dari halaman Aset & Meter.
- [ ] **Hak hapus dokumen.** Hapus dokumen di Kesiapan saat ini diizinkan untuk Admin dan Tim KINRA. Putuskan apakah Admin tetap diberi hak ini.

## 6. Keputusan yang sudah diambil (6 November 2026)

- **Kriteria SEU.** Porsi konsumsi ≥ 10%, **atau** termasuk kelompok teratas yang membentuk 80% konsumsi, **atau** ditetapkan karena potensi perbaikan atau persyaratan hukum. Ambang dapat diubah di catatan tinjauan energi.
- **Wewenang SEU.** Penetapan dan pencabutan SEU serta persetujuan tinjauan energi hanya oleh Admin dan Konsultan. Tim KINRA mengusulkan kandidat dan mengisi detail.
- **BBM kendaraan.** Dihitung sebagai satu pengguna energi di Pareto (dikonversi ke kWh setara, sekitar 2,5% energi KINRA). Belum memenuhi kriteria SEU.
- **Peta SMEn.** Dibuat sebagai halaman sendiri (menu kedua, setelah Ringkasan) ditambah strip 12 langkah di bagian atas Ringkasan.

## 7. Usulan fitur yang belum diputuskan

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
