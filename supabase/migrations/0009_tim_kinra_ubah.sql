-- Tim KINRA boleh mengubah data yang sudah diinput: variabel relevan, EnPI & baseline (EnB), dan sasaran energi.
-- Menambah definisi baru tetap admin & konsultan; menghapus tetap admin.
-- Persetujuan dokumen (Disetujui/Final) dan penutupan temuan tetap admin & konsultan (trigger di 0006).
-- Jalankan setelah 0007. Aman diulang. Sinkron dengan lib/akses.ts.

do $$
declare t text;
        syarat text := '(select peran_sesi()) = any (''{admin,konsultan,tim_kinra}''::text[])';
begin
  foreach t in array array['variabel_relevan', 'enpi', 'sasaran'] loop
    execute format('drop policy if exists ubah on %I', t);
    execute format('create policy ubah on %I for update to anon, authenticated using (%s) with check (%s)', t, syarat, syarat);
  end loop;
end $$;
