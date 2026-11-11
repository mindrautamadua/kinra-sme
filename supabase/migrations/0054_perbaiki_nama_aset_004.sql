-- Perbaiki salah ketik nama aset KINRA-AST-004: "Pusat Inovasi Kelapa Sawi" menjadi "Pusat Inovasi Kelapa Sawit".
-- Jalankan setelah 0053. Aman diulang.

update aset
set nama = 'Pusat Inovasi Kelapa Sawit'
where kode = 'KINRA-AST-004' and nama = 'Pusat Inovasi Kelapa Sawi';
