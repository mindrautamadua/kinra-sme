-- OPSIONAL. Evidence kini hanya di OneDrive, sehingga tabel `berkas` dan bucket `smen-dokumen` tidak dipakai lagi.
-- Jalankan hanya bila yakin; tabel yang di-drop tidak bisa dikembalikan.

drop policy if exists smen_baca on storage.objects;
drop policy if exists smen_unggah on storage.objects;
drop policy if exists smen_ubah on storage.objects;
drop policy if exists smen_hapus on storage.objects;

-- Bucket hanya bisa dihapus bila kosong. Bila masih ada objek, kosongkan dulu lewat Supabase Studio > Storage.
delete from storage.buckets where id = 'smen-dokumen'
  and not exists (select 1 from storage.objects where bucket_id = 'smen-dokumen');

drop table if exists berkas;
