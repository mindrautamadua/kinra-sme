-- Tim KINRA boleh menghapus isian formulir (sebelumnya hanya admin).
-- Sinkron dengan 'formulir.hapus' di lib/akses.ts. Jalankan setelah 0013. Aman diulang.

drop policy if exists hapus on formulir_isian;
create policy hapus on formulir_isian for delete to anon, authenticated
  using ((select peran_sesi()) = any ('{admin,tim_kinra}'::text[]));
