-- Rapikan sasaran energi dan rencana aksi (ISO 50001 6.2) setelah review konsultan, 8 Nov 2026.
--
-- Struktur akhir: satu sasaran per EnPI lingkup KINRA, setiap aksi terhubung ke sasarannya.
--   ENPI-04 Listrik KINRA         : optimasi AC gedung, LED PJU (verifikasi terpisah)
--   ENPI-05 Intensitas WTP 1      : selidiki deviasi Feb–Jun 2026, set point tekanan, submeter WTP, pompa intake
--   ENPI-06 Listrik WWTP          : flow meter influent + submeter blower, kontrol DO
--   ENPI-01 BBM (Dexlite)         : selidiki kenaikan BBM 2026 (sasaran Draft sampai penyebab diketahui)
--
-- Prinsip:
--   * Data yang sudah ada TIDAK ditimpa (kode, PIC, tanggal, status, target hasil keputusan tim tetap).
--     Hanya kolom kosong yang diisi, EnPI yang hilang dipasang, dan tahun target yang sudah lewat (< 2027) diperbarui.
--   * Aksi dari usulan VSD lama (VSD sudah termasuk baseline 2025) diubah menjadi aksi set point tekanan.
--   * Sasaran ganda (EnPI atau uraian sama) digabung: aksinya dipindah ke sasaran pertama, duplikat dihapus.
--   * Aksi ganda (usulan sama) tidak dihapus, tetapi diberi status Batal dengan keterangan.
--   * Aksi usulan yang belum ada dibuat dengan kode RA berikutnya, ditandai [usulan:kunci] agar dikenali halaman Sasaran.
-- Jalankan setelah 0040. Aman diulang.

-- Catatan: tanpa temp table, karena SQL Editor Supabase tidak menjamin satu sesi untuk seluruh script.
do $$
declare
  sp record; utama bigint; target_sasaran bigint; kode_baru text; tag text; cocok text;
begin
  -- -------------------------------------------------------------------------
  -- 1. Sasaran: pasang EnPI, isi kolom kosong, gabung duplikat, buat yang belum ada
  -- -------------------------------------------------------------------------
  for sp in
    select * from (values
        ('ENPI-05', 'Menurunkan intensitas energi WTP 1 (kWh per m³ air diolah)',
         '{"Menurunkan intensitas energi WTP (kWh per m³ air terdistribusi)"}'::text[], 5::numeric, 2027, 'Bagian M/E', 'Aktif',
         'SEU-01. VSD pompa distribusi sudah termasuk baseline 2025; dicapai melalui set point tekanan, penjadwalan pompa, pompa intake, dan standardisasi pola operasi efisien Feb–Jun 2026.', 1),
        ('ENPI-06', 'Menurunkan konsumsi listrik WWTP dengan mutu effluent tetap memenuhi baku mutu',
         '{}', 5, 2027, 'Bagian M/E', 'Aktif',
         'SEU-02. EnPI masih absolut; tinjau ulang target setelah debit influent tersedia dan EnPI diganti ke kWh/m³ air limbah diolah.', 2),
        ('ENPI-04', 'Menurunkan konsumsi listrik pemakaian sendiri KINRA dibanding baseline',
         '{}', 3, 2027, 'Manajer Energi', 'Aktif',
         'Sasaran organisasi. WTP dan WWTP (SEU-01, SEU-02) menyerap sekitar 90% listrik KINRA, sehingga capaian ditentukan oleh aksi di kedua SEU. Estimasi aksi tekanan pompa dan AC gedung ≈ 2,5%; sisanya dari SOP hasil penyelidikan deviasi WTP.', 3),
        ('ENPI-01', 'Mengendalikan konsumsi BBM kendaraan operasional',
         '{}', 5, 2027, 'Bagian Umum / Pengelola Kendaraan', 'Draft',
         'Draft: konsumsi 2026 jauh di atas baseline 2025. Tetapkan target final setelah penyebab kenaikan diketahui (aksi selidiki BBM). EnPI-01 hanya Dexlite; bensin dipantau lewat EnPI-09.', 4)
    ) as t(enpi_kode, uraian, uraian_lama, target_persen, tahun_target, pic, status_baru, catatan, urutan)
    order by urutan
  loop
    if not exists (select 1 from enpi where kode = sp.enpi_kode) then continue; end if;

    -- Sasaran pertama yang cocok: EnPI sama, atau uraian sama (termasuk yang tersimpan tanpa EnPI)
    select id into utama from sasaran s
    where s.enpi_kode = sp.enpi_kode
       or (s.enpi_kode is null and lower(trim(s.uraian)) in (select lower(x) from unnest(array_append(sp.uraian_lama, sp.uraian)) x))
    order by (s.enpi_kode = sp.enpi_kode) desc nulls last, s.id
    limit 1;

    if utama is null then
      select 'S-' || lpad((coalesce(max(nullif(regexp_replace(kode, '\D', '', 'g'), '')::int), 0) + 1)::text, 2, '0')
        into kode_baru from sasaran;
      insert into sasaran (kode, uraian, enpi_kode, target_persen, tahun_target, pic, status, catatan)
      values (kode_baru, sp.uraian, sp.enpi_kode, sp.target_persen, sp.tahun_target, sp.pic, sp.status_baru, sp.catatan);
    else
      update sasaran set
        enpi_kode     = sp.enpi_kode,
        uraian        = case when lower(trim(uraian)) in (select lower(x) from unnest(sp.uraian_lama) x) then sp.uraian else uraian end,
        target_persen = coalesce(target_persen, sp.target_persen),
        tahun_target  = case when tahun_target is null or tahun_target < sp.tahun_target then sp.tahun_target else tahun_target end,
        pic           = coalesce(nullif(pic, ''), sp.pic),
        catatan       = coalesce(nullif(catatan, ''), sp.catatan),
        diubah_at     = now()
      where id = utama;

      -- Duplikat: pindahkan aksinya ke sasaran utama, lalu hapus
      update rencana_aksi set sasaran_id = utama, diubah_at = now()
      where sasaran_id in (
        select id from sasaran s where s.id <> utama and (s.enpi_kode = sp.enpi_kode
          or (s.enpi_kode is null and lower(trim(s.uraian)) in (select lower(x) from unnest(array_append(sp.uraian_lama, sp.uraian)) x))));
      delete from sasaran s where s.id <> utama and (s.enpi_kode = sp.enpi_kode
        or (s.enpi_kode is null and lower(trim(s.uraian)) in (select lower(x) from unnest(array_append(sp.uraian_lama, sp.uraian)) x)));
    end if;
  end loop;

  -- -------------------------------------------------------------------------
  -- 2. Aksi: hubungkan ke sasaran, isi kolom kosong, ubah usulan VSD lama, tandai duplikat, buat yang belum ada
  -- -------------------------------------------------------------------------
  for sp in
    select * from (values
        ('deviasi-wtp-2026', '{}'::text[],
         'Selidiki penurunan intensitas WTP 1 Feb–Jun 2026 dan bakukan pola operasi efisiennya dalam SOP', '{}'::text[],
         'ENPI-05', 'P-03', 'Manajer Energi',
         'Log operasi pompa (jam operasi, frekuensi VSD, tekanan header), data air baku dan tagihan BTM',
         '2026-11-09'::date, '2026-12-31'::date, null::numeric,
         'Penyebab tercatat di register deviasi; bila operasional, kWh/m³ WTP 1 (EnPI-05) setelah SOP berlaku dibanding baseline',
         'Intensitas turun sekitar 13% lalu kembali ke level baseline Agu–Okt 2026. Bila penyebabnya pola operasi, ini peluang hemat tanpa investasi. Prioritas 1.', 1),
        ('tekanan-pompa-wtp', '{vsd-pompa-wtp}',
         'Optimasi set point tekanan header dan penjadwalan pompa distribusi WTP 1 (VSD terpasang)',
         '{"Kajian dan uji coba pengaturan tekanan serta VSD pompa distribusi WTP"}',
         'ENPI-05', 'P-03', 'Bagian M/E',
         'Data tekanan titik kritis jaringan dan debit per jam, setelan VSD, operator WTP',
         '2026-12-01', '2027-05-31', 98044,
         'Bandingkan kWh/m³ WTP 1 (EnPI-05) 3 bulan sebelum dan sesudah, dinormalisasi volume air; tekanan titik kritis tetap memenuhi layanan',
         'Tiga VSD pompa distribusi (2022, Jan 2024, Agu 2025) sudah bagian baseline 2025; penghematan hanya dari menurunkan set point tekanan dan pola operasi. Estimasi awal 5% konsumsi WTP; perbarui setelah kajian. Calon bukti peningkatan kinerja energi utama untuk audit.', 2),
        ('submeter-wtp', '{}',
         'Pasang submeter tahap 1 WTP: pompa distribusi, pompa intake, flow meter air baku, pengukur tekanan header', '{}',
         'ENPI-05', 'P-04', 'Bagian M/E',
         'Anggaran pengadaan power meter kelas 0,5S/1 + CT, teknisi listrik',
         '2026-11-16', '2027-01-31', null,
         'Bacaan submeter bulanan tercatat dan terekonsiliasi dengan meter utama WTP',
         'Prasyarat EnPI per proses (lihat rencana submeter di Tinjauan Energi).', 3),
        ('pompa-intake-wtp', '{}',
         'Kajian efisiensi pompa intake (air baku) WTP 1 dan kelayakan kontrol kecepatan', '{}',
         'ENPI-05', 'P-03', 'Bagian M/E',
         'Bacaan meter intake KINRA-MTR-008, uji debit-tekanan pompa, kalkulator Pompa VSD',
         '2027-02-01', '2027-04-30', null,
         'kWh intake (KINRA-MTR-008) per m³ air baku sebelum dan sesudah tindakan',
         'Mulai setelah faktor kali meter intake dikonfirmasi dan tersedia minimal 3 bulan bacaan terpisah (Nov 2026–Jan 2027). Pompa intake belum ber-VSD.', 4),
        ('flowmeter-influent-wwtp', '{}',
         'Pasang flow meter influent dan submeter blower WWTP', '{}',
         'ENPI-06', 'P-04', 'Bagian M/E',
         'Flow meter influent, power meter kelas 0,5S/1 + CT untuk panel blower, teknisi listrik',
         '2026-11-16', '2027-02-28', null,
         'Debit influent dan kWh blower tercatat bulanan dan terekonsiliasi dengan meter utama WWTP (KINRA-MTR-004)',
         'Prasyarat mengganti ENPI-06 dari absolut ke kWh/m³ air limbah diolah dan membuktikan hasil kontrol DO.', 5),
        ('kontrol-do-wwtp', '{}',
         'Kontrol aerasi berbasis oksigen terlarut (DO) pada blower WWTP', '{}',
         'ENPI-06', 'P-03', 'Bagian M/E',
         'Sensor DO, kontrol blower (VSD/on-off bertahap), submeter blower',
         '2027-03-01', '2027-08-31', 197176,
         'Bandingkan kWh blower per m³ air limbah diolah sebelum dan sesudah, dengan mutu effluent tetap memenuhi baku mutu',
         'Mulai setelah flow meter influent dan submeter blower terpasang. Estimasi awal 10% konsumsi WWTP; perbarui setelah kajian dan sebelum pengajuan investasi.', 6),
        ('selidiki-bbm', '{}',
         'Selidiki kenaikan konsumsi BBM 2026 dan catat konsumsi per kendaraan', '{}',
         'ENPI-01', null, 'Bagian Umum / Pengelola Kendaraan',
         'Log BBM per kendaraan, km/jam operasi',
         '2026-11-09', '2026-12-31', null,
         'Konsumsi BBM per kendaraan per bulan dibanding baseline 2025; penyebab tercatat di register deviasi',
         'Menutup deviasi signifikan EnPI-01 (klausul 9.1). Cakup Dexlite (EnPI-01) dan bensin (EnPI-09).', 7),
        ('optimasi-ac-gedung', '{}',
         'Optimasi jadwal operasi dan set point AC di Bangunan Kantor Kawasan dan Pusat Inovasi', '{}',
         'ENPI-04', 'P-01', 'Bagian Umum / Pengelola Gedung',
         'Jadwal operasi, termometer ruang, sosialisasi penghuni',
         '2026-12-01', '2027-03-31', 19872,
         'Bandingkan kWh gedung per bulan sebelum dan sesudah pada jam operasi yang sama',
         'Estimasi awal 10% konsumsi kedua gedung. Program pendukung tanpa investasi.', 8)
    ) as t(kunci, alias, uraian, uraian_lama, enpi_kode, peluang_kode, pic, sumber_daya, mulai, tenggat,
           estimasi_hemat_kwh, metode_verifikasi, catatan, urutan)
    order by urutan
  loop
    tag := '[usulan:' || sp.kunci || ']';
    select id into target_sasaran from sasaran where enpi_kode = sp.enpi_kode order by id limit 1;

    -- Aksi yang cocok: bertag kunci atau alias, atau uraiannya sama dengan uraian usulan (lama/baru)
    cocok := format($f$
      (exists (select 1 from unnest(%L::text[]) k where coalesce(a.catatan, '') like '%%[usulan:' || k || ']%%')
       or lower(trim(a.uraian)) in (select lower(x) from unnest(%L::text[]) x))
      and a.status <> 'Batal'$f$, array_prepend(sp.kunci, sp.alias), array_append(sp.uraian_lama, sp.uraian));
    execute 'select a.id from rencana_aksi a where ' || cocok || ' order by a.id limit 1' into utama;

    if utama is null then
      select 'RA-' || lpad((coalesce(max(nullif(regexp_replace(kode, '\D', '', 'g'), '')::int), 0) + 1)::text, 2, '0')
        into kode_baru from rencana_aksi where kode ~ '^RA-\d+$';
      insert into rencana_aksi (kode, sasaran_id, peluang_kode, uraian, pic, sumber_daya, mulai, tenggat,
                                estimasi_hemat_kwh, metode_verifikasi, status, catatan)
      values (kode_baru, target_sasaran, (select kode from peluang where kode = sp.peluang_kode), sp.uraian, sp.pic,
              sp.sumber_daya, sp.mulai, sp.tenggat, sp.estimasi_hemat_kwh, sp.metode_verifikasi, 'Rencana',
              sp.catatan || ' ' || tag);
    else
      update rencana_aksi a set
        sasaran_id         = coalesce(target_sasaran, a.sasaran_id),
        -- Usulan lama (uraian/kunci lama) diganti isi baru; aksi tim yang lain hanya diisi kolom kosongnya
        uraian             = case when lower(trim(a.uraian)) in (select lower(x) from unnest(sp.uraian_lama) x)
                                    or (coalesce(a.catatan, '') not like '%' || tag || '%' and exists (select 1 from unnest(sp.alias) k where coalesce(a.catatan, '') like '%[usulan:' || k || ']%'))
                                  then sp.uraian else a.uraian end,
        estimasi_hemat_kwh = case when exists (select 1 from unnest(sp.alias) k where coalesce(a.catatan, '') like '%[usulan:' || k || ']%')
                                  then sp.estimasi_hemat_kwh else coalesce(a.estimasi_hemat_kwh, sp.estimasi_hemat_kwh) end,
        peluang_kode       = coalesce(a.peluang_kode, (select kode from peluang where kode = sp.peluang_kode)),
        pic                = coalesce(nullif(a.pic, ''), sp.pic),
        sumber_daya        = coalesce(nullif(a.sumber_daya, ''), sp.sumber_daya),
        mulai              = coalesce(a.mulai, sp.mulai),
        tenggat            = coalesce(a.tenggat, sp.tenggat),
        metode_verifikasi  = coalesce(nullif(a.metode_verifikasi, ''), sp.metode_verifikasi),
        catatan            = case when coalesce(a.catatan, '') like '%' || tag || '%' then a.catatan
                                  else concat_ws(' ', nullif(a.catatan, ''), sp.catatan, tag) end,
        diubah_at          = now()
      where a.id = utama;

      -- Duplikat usulan yang sama: Batal, bukan dihapus (mungkin sudah punya data verifikasi)
      execute format($f$
        update rencana_aksi a set status = 'Batal', diubah_at = now(),
          catatan = concat_ws(' ', 'Duplikat dari ' || (select kode from rencana_aksi where id = %s) || ' (dirapikan 0041).', nullif(a.catatan, ''))
        where a.id <> %s and %s$f$, utama, utama, cocok);
    end if;
  end loop;
end $$;

-- LED PJU: hubungkan ke sasaran organisasi. Meter PJU tidak termasuk ENPI-04, jadi verifikasi tetap terpisah.
update rencana_aksi set
  sasaran_id = coalesce(sasaran_id, (select id from sasaran where enpi_kode = 'ENPI-04' order by id limit 1)),
  catatan = case when coalesce(catatan, '') like '%Meter PJU tidak termasuk ENPI-04%' then catatan
    else concat_ws(' ', nullif(catatan, ''), 'Meter PJU tidak termasuk ENPI-04: penghematan diverifikasi dengan kWh meter panel PJU (metode di atas), tidak tercermin di capaian ENPI-04. Bila PJU tanggungan KINRA, tambahkan meternya ke ENPI-04 sebagai penyesuaian baseline (6.5).') end,
  diubah_at = now()
where kode = 'RA-LED-PJU'
  and (sasaran_id is null or coalesce(catatan, '') not like '%Meter PJU tidak termasuk ENPI-04%');

-- Deviasi ENPI-05 Feb–Jun 2026: tautkan ke aksi penyelidikannya
update deviasi set aksi_kode = (select kode from rencana_aksi where catatan like '%[usulan:deviasi-wtp-2026]%' and status <> 'Batal' order by id limit 1)
where enpi_kode = 'ENPI-05' and tahun = 2026 and bulan between 2 and 6 and arah = 'hemat' and aksi_kode is null;

-- ---------------------------------------------------------------------------
-- Ringkasan hasil
-- ---------------------------------------------------------------------------
select s.kode as sasaran, s.enpi_kode, s.target_persen, s.tahun_target, s.status,
       string_agg(a.kode || ' · ' || a.status, ', ' order by a.mulai nulls last) as aksi
from sasaran s left join rencana_aksi a on a.sasaran_id = s.id and a.status <> 'Batal'
group by s.id order by s.kode;
