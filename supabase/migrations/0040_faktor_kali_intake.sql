-- Konfirmasi faktor kali meter oleh Bagian M/E (7 Nov 2026): WTP (KINRA-MTR-005) ×200, intake WTP 1 (KINRA-MTR-008) ×1.
-- Nilai faktor kali intake sudah 1 sejak migrasi 0039; migrasi ini hanya menghapus tanda "belum dikonfirmasi".
-- Jalankan setelah 0039. Aman diulang.

update meter_energi set
  faktor_kali = 1,
  catatan = 'Faktor kali ×1 (konfirmasi Bagian M/E, 7 Nov 2026). S.d. Okt 2026 kWh intake digabung dalam angka WTP (KINRA-MTR-005); mulai Nov 2026 dicatat terpisah.',
  diubah_at = now()
where kode = 'KINRA-MTR-008';

update meter_energi set faktor_kali = 200, diubah_at = now()
where kode = 'KINRA-MTR-005' and faktor_kali <> 200;
