-- Register peluang disinkronkan dari berkas formulir yang diupload (tombol "Sinkron dari formulir" di halaman Register):
-- gabungan Formulir Peluang Peningkatan Kinerja Energi 002/SOP-007 (docx) dan 005/SOP-008 (xlsx).
-- Kolom tambahan menampung isian formulir; `kunci` (nama peluang yang dinormalkan) menjadi pengenal tetap
-- agar sinkron berikutnya memperbarui baris yang sama tanpa memutus tautan rencana_aksi.peluang_kode.
-- Aman diulang.

alter table peluang add column if not exists deskripsi text;
alter table peluang add column if not exists seu_terkait text;
alter table peluang add column if not exists sasaran_teks text;
alter table peluang add column if not exists tanggal_identifikasi date;
alter table peluang add column if not exists sumber text;
alter table peluang add column if not exists kunci text;
create unique index if not exists peluang_kunci_uk on peluang (kunci) where kunci is not null;

notify pgrst, 'reload schema';
