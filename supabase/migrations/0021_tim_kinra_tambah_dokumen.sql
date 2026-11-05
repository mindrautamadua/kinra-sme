-- Tim KINRA boleh menambah item lembar Kesiapan Audit (sebelumnya admin & konsultan).
-- Penanda "wajib ISO 50001" tetap ditetapkan admin & konsultan (dijaga di aplikasi lewat 'dokumen.wajib').
-- Sinkron dengan 'dokumen.tambah' di lib/akses.ts. Jalankan setelah 0020. Aman diulang.

drop policy if exists tambah on dokumen_audit;
create policy tambah on dokumen_audit for insert to anon, authenticated
  with check ((select peran_sesi()) = any ('{admin,konsultan,tim_kinra}'::text[]));
