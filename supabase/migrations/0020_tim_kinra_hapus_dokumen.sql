-- Tim KINRA boleh menghapus item lembar Kesiapan Audit (sebelumnya hanya admin).
-- Konsultan dan pembaca tetap tidak bisa menghapus. Berkas evidence & objek Storage yang ikut terhapus
-- sudah boleh dihapus Tim KINRA sejak 0010, jadi cukup policy delete dokumen_audit.
-- Sinkron dengan 'dokumen.hapus' di lib/akses.ts. Jalankan setelah 0019. Aman diulang.

drop policy if exists hapus on dokumen_audit;
create policy hapus on dokumen_audit for delete to anon, authenticated
  using ((select peran_sesi()) = any ('{admin,tim_kinra}'::text[]));
