-- Konsultan & Tim KINRA boleh menghapus data kerja SMEn (sebelumnya hanya admin). Jalankan setelah 0078. Aman diulang.
-- Sinkron dengan lib/akses.ts: 'temuan.hapus', 'register.hapus', 'seu.hapus', 'enpi.hapus', 'sasaran.hapus', 'bukti.hapus'.
-- Tetap khusus admin: pengguna, klausul, sumber energi, parameter (tarif & faktor emisi), kegiatan timeline,
-- deviasi, lembar penyelidikan, riwayat simulasi, potret kesiapan, pompa, dan sinkron register dari formulir.

do $$
declare t text;
begin
  foreach t in array array[
    'temuan',                         -- temuan audit
    'isu', 'peluang',                 -- register isu & peluang
    'seu', 'tinjauan_energi',         -- SEU & tinjauan energi
    'enpi', 'variabel_relevan',       -- EnPI & variabel relevan
    'sasaran', 'rencana_aksi',        -- sasaran & rencana aksi
    'berkas'                          -- semua berkas, termasuk bukti pelaksanaan sasaran & aksi
  ] loop
    execute format('drop policy if exists hapus on %I', t);
    execute format('create policy hapus on %I for delete to anon, authenticated using ((select peran_sesi()) = any (''{admin,konsultan,tim_kinra}''::text[]))', t);
  end loop;
end $$;

-- Objek Storage bukti pelaksanaan (awalan 'pelaksanaan/') ikut boleh dihapus; sebelumnya 0051 membatasi ke admin.
drop policy if exists evidence_hapus on storage.objects;
create policy evidence_hapus on storage.objects for delete to anon, authenticated
  using (bucket_id = 'smen-evidence' and (select peran_sesi()) = any ('{admin,konsultan,tim_kinra}'::text[]));
