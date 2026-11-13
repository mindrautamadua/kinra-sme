-- Konsultan mendapat semua hak Tim KINRA atas data dan dokumen. Jalankan setelah 0077. Aman diulang.
-- Sinkron dengan lib/akses.ts: 'dokumen.hapus', 'energi.ubah', 'aset.hapus', 'bukti.unggah', 'formulir.hapus'.
-- Hak khusus konsultan (setujui dokumen, tetapkan SEU, tutup temuan, dst.) tidak berubah.
-- Menu Ruang MR & Ruang Manajemen Risiko & TI tetap hanya admin & Tim KINRA (bukan hak data/dokumen).

-- 1) Hapus item Kesiapan Audit (sebelumnya 0020)
drop policy if exists hapus on dokumen_audit;
create policy hapus on dokumen_audit for delete to anon, authenticated
  using ((select peran_sesi()) = any ('{admin,konsultan,tim_kinra}'::text[]));

-- 2) Input data energi bulanan & variabel relevan bulanan (sebelumnya 0006, 0007)
do $$
declare t text;
begin
  foreach t in array array['energi_bulanan', 'variabel_bulanan'] loop
    execute format('drop policy if exists tambah on %I', t);
    execute format('create policy tambah on %I for insert to anon, authenticated with check ((select peran_sesi()) = any (''{admin,konsultan,tim_kinra}''::text[]))', t);
    execute format('drop policy if exists ubah on %I', t);
    execute format('create policy ubah on %I for update to anon, authenticated using ((select peran_sesi()) = any (''{admin,konsultan,tim_kinra}''::text[])) with check ((select peran_sesi()) = any (''{admin,konsultan,tim_kinra}''::text[]))', t);
    execute format('drop policy if exists hapus on %I', t);
    execute format('create policy hapus on %I for delete to anon, authenticated using ((select peran_sesi()) = any (''{admin,konsultan,tim_kinra}''::text[]))', t);
  end loop;
end $$;

-- 3) Pompa & jam operasi pompa: tambah/ubah (sebelumnya 0044; hapus tetap admin)
do $$
declare t text;
begin
  foreach t in array array['pompa', 'jam_operasi_pompa'] loop
    execute format('drop policy if exists tambah on %I', t);
    execute format('create policy tambah on %I for insert to anon, authenticated with check ((select peran_sesi()) = any (''{admin,konsultan,tim_kinra}''::text[]))', t);
    execute format('drop policy if exists ubah on %I', t);
    execute format('create policy ubah on %I for update to anon, authenticated using ((select peran_sesi()) = any (''{admin,konsultan,tim_kinra}''::text[])) with check ((select peran_sesi()) = any (''{admin,konsultan,tim_kinra}''::text[]))', t);
  end loop;
end $$;

-- 4) Hapus aset, meter & bacaan stand (sebelumnya 0022)
do $$
declare t text;
begin
  foreach t in array array['aset', 'meter_energi', 'pembacaan_meter'] loop
    execute format('drop policy if exists hapus on %I', t);
    execute format('create policy hapus on %I for delete to anon, authenticated using ((select peran_sesi()) = any (''{admin,konsultan,tim_kinra}''::text[]))', t);
  end loop;
end $$;

-- 5) Hapus isian formulir yang belum disetujui (sebelumnya 0045)
drop policy if exists hapus on formulir_isian;
create policy hapus on formulir_isian for delete to anon, authenticated
  using ((select peran_sesi()) = 'admin' or ((select peran_sesi()) = any ('{konsultan,tim_kinra}'::text[]) and status <> 'disetujui'));

-- 6) Bukti pelaksanaan sasaran & rencana aksi: unggah/ubah (sebelumnya 0051; hapus tetap admin)
drop policy if exists tambah on berkas;
create policy tambah on berkas for insert to anon, authenticated
  with check ((select peran_sesi()) = any ('{admin,konsultan,tim_kinra}'::text[]));

drop policy if exists ubah on berkas;
create policy ubah on berkas for update to anon, authenticated
  using ((select peran_sesi()) = any ('{admin,konsultan,tim_kinra}'::text[]))
  with check ((select peran_sesi()) = any ('{admin,konsultan,tim_kinra}'::text[]));

drop policy if exists evidence_unggah on storage.objects;
create policy evidence_unggah on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'smen-evidence' and (select peran_sesi()) = any ('{admin,konsultan,tim_kinra}'::text[]));
