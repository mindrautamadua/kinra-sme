-- Perbaiki kolom sumber sasaran dari 0048: nomor dokumen tidak terbaca sehingga tertulis 'NONE'.
-- Semua 10 Formulir Objective dan Target (KINRA) bernomor 001/SOP-008/KINRA/SMEn/X/2026. Aman diulang.
update sasaran
set sumber = replace(sumber, 'Formulir Sasaran 6.2 NONE · ', 'Formulir Sasaran 6.2 001/SOP-008/KINRA/SMEn/X/2026 · '),
    diubah_at = now()
where sumber like 'Formulir Sasaran 6.2 NONE · %';

-- Sumber risiko dari 0046/0047 tertulis 'SMEN' (huruf besar); nomor asli formulir memakai 'SMEn'.
update isu
set sumber = replace(sumber, '/KINRA/SMEN/', '/KINRA/SMEn/'),
    diubah_at = now()
where sumber like 'Formulir Risiko 6.1 %/KINRA/SMEN/%';
