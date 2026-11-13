-- Jejak pengubah keterangan Kesiapan Audit. Jalankan setelah 0079. Aman diulang.
--
-- Latar: trigger 0018 mengisi catatan_oleh dari nama_sesi(). Perubahan lewat SQL Editor tidak punya sesi login,
-- sehingga catatan_oleh kosong (dulu tampil "Seseorang"). Migrasi ini:
--   1) Mengisi pengubah keterangan yang ditulis migrasi 0074 dengan orang yang menjalankannya: Pindi.
--   2) Membuat trigger membaca nama pengubah dari pengaturan sesi `app.pengubah` bila tidak ada pengguna login.
--
-- Aturan untuk migrasi berikutnya yang mengubah posisi_draf/keterangan dokumen_audit lewat SQL Editor,
-- tulis di baris paling atas (di dalam transaksi yang sama):
--   set local app.pengubah = 'Nama Pengguna';
-- Tanpa baris itu nama pengubah tetap kosong dan aplikasi tidak menampilkan baris pengubah.

-- 1) Isi pengubah untuk keterangan dari migrasi 0074.
--    Hanya baris yang pengubahnya kosong dan isinya masih persis teks 0074; keterangan yang sudah diubah lewat aplikasi tidak disentuh.
--    Kolom posisi_draf/keterangan tidak berubah, jadi trigger tidak menimpa catatan_oleh/catatan_at.
update dokumen_audit set catatan_oleh = 'Pindi'
where catatan_oleh is null
  and catatan_at is not null
  and (
    (keterangan = 'Rev.1, berlaku 13 Nov 2026 (BA 001/BA/KINRA/SMEn/XI/2026)'
     and kode in ('F-4.3-01', 'F-6.3-01', 'F-6.4-01', 'F-6.6-01', 'F-6.2-04', 'SOP-005', 'T.E', 'F-6.2-02', 'F-6.2-01', 'F-6.1-01',
                  'R-8.1-01', 'R-8.2-01', 'F-8.1-01', 'R-9.1-01', 'R-10.2-01', 'R-6.5-01', 'R-7.2-01', 'S.K . 7.2', 'R-7.3-01',
                  'A.D 6.1', 'R-6.3-01', 'PA-06', 'PA-07', 'PA-08', 'PA-10', 'PA-12', 'PA-13', 'F-6.2-03'))
    or (keterangan = 'Audit internal dilaksanakan 10, 12, 13 Nov 2026 (Lead Auditor Lidwina Vidya); temuan AI-001 s.d. AI-013. Unggah laporan/checklist hasil audit.'
        and kode in ('R-9.2-02', 'R-9.2-04', 'R-9.2-06'))
    or (keterangan = 'Rekapitulasi Temuan dan Tindakan Korektif Audit Internal 10, 12, 13 Nov 2026 (AI-001 s.d. AI-013).'
        and kode = 'R-10.1-01')
  );

-- 2) Trigger: pengguna login lebih dulu, lalu `app.pengubah` untuk perubahan lewat SQL Editor.
create or replace function cap_catatan_dokumen() returns trigger
language plpgsql set search_path = public as $$
declare
  pengubah text := coalesce(nama_sesi(), nullif(trim(current_setting('app.pengubah', true)), ''));
begin
  if tg_op = 'INSERT' then
    if new.posisi_draf is not null or new.keterangan is not null then
      new.catatan_at := now();
      new.catatan_oleh := pengubah;
    end if;
  elsif new.posisi_draf is distinct from old.posisi_draf or new.keterangan is distinct from old.keterangan then
    new.catatan_at := now();
    new.catatan_oleh := pengubah;
  end if;
  return new;
end $$;

-- Periksa hasil: baris keterangan yang masih tanpa pengubah (dari migrasi lain, bila ada)
-- select kode, keterangan, catatan_at from dokumen_audit where catatan_at is not null and catatan_oleh is null order by kode;
