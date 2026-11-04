-- R-4.4-01 "Statement of Applicability (SOA)" bukan dokumen ISO 50001 (istilah ISO 27001).
-- Menurut konsultan dokumen yang dimaksud adalah Gap Analysis, yang sudah tercatat sebagai GA-01 (Persiapan).
-- Migrasi ini menggabungkan R-4.4-01 ke GA-01 tanpa kehilangan berkas evidence atau tautan temuan,
-- lalu menghapus R-4.4-01. Klausul 4.4 tetap terisi oleh MK-01 Manual SMEn.
--
-- Jalankan setelah 0016. Aman diulang: tidak melakukan apa pun bila R-4.4-01 sudah tidak ada.

do $$
declare
  lama uuid;
  baru uuid;
begin
  select id into lama from dokumen_audit where kode = 'R-4.4-01';
  if lama is null then return; end if;

  select id into baru from dokumen_audit where kode = 'GA-01';

  if baru is null then
    -- GA-01 belum ada (migrasi 0013 belum dijalankan): cukup ubah R-4.4-01 menjadi GA-01
    update dokumen_audit
    set kode = 'GA-01', kelompok = 'persiapan', klausul_kode = 'P',
        nama = 'Laporan gap analysis awal (dokumen eksisting vs persyaratan ISO 50001)',
        keterangan = concat_ws(' · ', nullif(keterangan, ''), 'Sebelumnya tercatat sebagai R-4.4-01 (SOA)')
    where id = lama;
    return;
  end if;

  -- Lengkapi isian GA-01 yang masih kosong dari R-4.4-01
  update dokumen_audit g
  set pic            = coalesce(g.pic, r.pic),
      tenggat        = coalesce(g.tenggat, r.tenggat),
      tanggal_terima = coalesce(g.tanggal_terima, r.tanggal_terima),
      nomor_dokumen  = coalesce(g.nomor_dokumen, r.nomor_dokumen),
      keterangan     = concat_ws(' · ', nullif(g.keterangan, ''), 'Digabung dari R-4.4-01 (sebelumnya SOA)')
  from dokumen_audit r
  where g.id = baru and r.id = lama;

  -- Pindahkan berkas evidence dan tautan temuan (path Storage tidak bergantung pada dokumen)
  update berkas set dokumen_id = baru where dokumen_id = lama;
  update temuan set dokumen_id = baru where dokumen_id = lama;

  delete from dokumen_audit where id = lama;
end $$;
