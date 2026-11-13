-- Lembar penyelidikan deviasi EnPI (klausul 9.1.1) yang diisi PIC lewat tautan khusus tanpa login.
--
-- Setiap lembar punya token acak (64 karakter hex). Siapa pun yang memegang tautan /f/<token> dapat membaca
-- lembar itu dan menyimpan jawabannya, tetapi tidak dapat membaca lembar lain atau tabel lain:
--   * tabel lembar_penyelidikan hanya dapat dibaca/diubah lewat RLS oleh admin, konsultan, dan Tim KINRA;
--   * akses tanpa login hanya lewat dua fungsi security definer: lembar_publik() dan simpan_jawaban_lembar().
-- Jawaban dikunci setelah lembar berstatus 'Ditinjau' (dibuka kembali oleh peninjau bila perlu).
--
-- Isi awal: 5 lembar dari hipotesis deviasi Jan–Okt 2026 vs Jan–Okt 2025 (Data Konsumsi Energi 004/SOP-008 Rev.1,
-- data aplikasi per 13 Nov 2026), sesuai observasi audit internal AI-009.
-- Jalankan setelah 0074. Aman diulang (lembar berkode sama tidak ditimpa).

create table if not exists lembar_penyelidikan (
  id                bigint generated always as identity primary key,
  kode              text not null unique,
  enpi_kode         text references enpi(kode) on delete set null on update cascade,
  judul             text not null,
  ringkasan         text,                         -- data yang memicu penyelidikan
  hipotesis         text,                         -- dugaan awal Tim SMEn (ditampilkan ke PIC)
  pic_bagian        text not null,
  pic_nama          text,
  tenggat           date,
  pertanyaan        jsonb not null default '[]',  -- [{id, teks, petunjuk?, jenis: teks|pilihan|tanggal|angka, opsi?[]}]
  jawaban           jsonb not null default '{}',  -- {id: {nilai, keterangan?}}
  dijawab_nama      text,
  dijawab_jabatan   text,
  dijawab_at        timestamptz,
  status            text not null default 'Belum diisi' check (status in ('Belum diisi', 'Draf', 'Dijawab', 'Ditinjau')),
  catatan_tinjauan  text,
  ditinjau_oleh     text,
  ditinjau_at       timestamptz,
  token             text not null unique check (length(token) >= 32),
  aktif             boolean not null default true,
  dibuat_at         timestamptz not null default now(),
  diubah_at         timestamptz not null default now()
);

create or replace function cek_lembar_penyelidikan() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'Ditinjau' then
      new.ditinjau_oleh := coalesce(nama_sesi(), new.ditinjau_oleh);
      new.ditinjau_at := now();
    elsif old.status = 'Ditinjau' then
      new.ditinjau_oleh := null;
      new.ditinjau_at := null;
    end if;
  end if;
  new.diubah_at := now();
  return new;
end $$;

drop trigger if exists cek_lembar_penyelidikan on lembar_penyelidikan;
create trigger cek_lembar_penyelidikan before insert or update on lembar_penyelidikan
  for each row execute function cek_lembar_penyelidikan();

alter table lembar_penyelidikan enable row level security;
drop policy if exists baca on lembar_penyelidikan;
create policy baca on lembar_penyelidikan for select to anon, authenticated
  using ((select peran_sesi()) = any ('{admin,konsultan,tim_kinra}'::text[]));
drop policy if exists tambah on lembar_penyelidikan;
create policy tambah on lembar_penyelidikan for insert to anon, authenticated
  with check ((select peran_sesi()) = any ('{admin,konsultan,tim_kinra}'::text[]));
drop policy if exists ubah on lembar_penyelidikan;
create policy ubah on lembar_penyelidikan for update to anon, authenticated
  using ((select peran_sesi()) = any ('{admin,konsultan,tim_kinra}'::text[]))
  with check ((select peran_sesi()) = any ('{admin,konsultan,tim_kinra}'::text[]));
drop policy if exists hapus on lembar_penyelidikan;
create policy hapus on lembar_penyelidikan for delete to anon, authenticated
  using ((select peran_sesi()) = 'admin');

-- ---------- Akses tanpa login (hanya dengan token) ----------

create or replace function lembar_publik(p_token text) returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'kode', l.kode, 'enpi_kode', l.enpi_kode, 'enpi_nama', e.nama, 'judul', l.judul,
    'ringkasan', l.ringkasan, 'hipotesis', l.hipotesis, 'pic_bagian', l.pic_bagian, 'pic_nama', l.pic_nama,
    'tenggat', l.tenggat, 'pertanyaan', l.pertanyaan, 'jawaban', l.jawaban, 'status', l.status,
    'dijawab_nama', l.dijawab_nama, 'dijawab_jabatan', l.dijawab_jabatan, 'dijawab_at', l.dijawab_at,
    'catatan_tinjauan', l.catatan_tinjauan)
  from lembar_penyelidikan l
  left join enpi e on e.kode = l.enpi_kode
  where p_token is not null and length(p_token) >= 32 and l.token = p_token and l.aktif
$$;

create or replace function simpan_jawaban_lembar(p_token text, p_jawaban jsonb, p_nama text, p_jabatan text, p_kirim boolean)
returns text
language plpgsql security definer set search_path = public as $$
declare
  l lembar_penyelidikan%rowtype;
begin
  if p_token is null or length(p_token) < 32 then raise exception 'Tautan tidak valid' using errcode = '22023'; end if;
  select * into l from lembar_penyelidikan where token = p_token and aktif for update;
  if not found then raise exception 'Tautan tidak valid atau sudah tidak aktif' using errcode = '22023'; end if;
  if l.status = 'Ditinjau' then raise exception 'Lembar sudah ditinjau dan dikunci. Hubungi Koordinator SMEn bila perlu mengubah jawaban.' using errcode = '42501'; end if;
  if p_jawaban is null or jsonb_typeof(p_jawaban) <> 'object' then raise exception 'Format jawaban tidak valid' using errcode = '22023'; end if;
  if pg_column_size(p_jawaban) > 200000 then raise exception 'Jawaban terlalu panjang' using errcode = '22023'; end if;
  if p_kirim and coalesce(btrim(p_nama), '') = '' then raise exception 'Isi nama pengisi sebelum mengirim' using errcode = '22023'; end if;

  update lembar_penyelidikan set
    jawaban = p_jawaban,
    dijawab_nama = nullif(left(btrim(coalesce(p_nama, '')), 120), ''),
    dijawab_jabatan = nullif(left(btrim(coalesce(p_jabatan, '')), 120), ''),
    dijawab_at = case when p_kirim then now() else dijawab_at end,
    status = case when p_kirim then 'Dijawab' when status = 'Dijawab' then 'Dijawab' else 'Draf' end
  where id = l.id;
  return case when p_kirim then 'Dijawab' when l.status = 'Dijawab' then 'Dijawab' else 'Draf' end;
end $$;

revoke all on function lembar_publik(text) from public;
revoke all on function simpan_jawaban_lembar(text, jsonb, text, text, boolean) from public;
grant execute on function lembar_publik(text) to anon, authenticated;
grant execute on function simpan_jawaban_lembar(text, jsonb, text, text, boolean) to anon, authenticated;

-- ---------- Isi awal: 5 lembar ----------

insert into lembar_penyelidikan (kode, enpi_kode, judul, ringkasan, hipotesis, pic_bagian, tenggat, pertanyaan, token)
select v.kode, (select kode from enpi where kode = v.enpi), v.judul, v.ringkasan, v.hipotesis, v.pic, '2026-11-19'::date, v.tanya::jsonb,
       replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
from (values
('PD-01', 'ENPI-04', 'Listrik pemakaian sendiri KINRA (9 meter) naik 20,3%',
 'Jan–Okt 2026: 4.979.583 kWh, naik 839.820 kWh (+20,3%) dibanding Jan–Okt 2025 (4.139.763 kWh). Penyumbang: WTP I (MTR-005 + MTR-008) +780.103 kWh atau 93% dari kenaikan; Tank Farm (MTR-009) +39.459 kWh (+41%); WWTP (MTR-004) +36.824 kWh (+2%); Graha −10.826 kWh dan Pusat Inovasi −7.950 kWh. Air baku WTP I naik 44% (2.489.237 → 3.585.434 m³) dan tonase Tank Farm naik 45%. Tenant beroperasi 15 → 22.',
 'Kenaikan didorong pertambahan volume air dan tonase, bukan pemborosan: per m³ air baku, listrik WTP I justru turun 5,8% (0,879 → 0,828 kWh/m³). ENPI-04 adalah kWh absolut tanpa normalisasi, sehingga target −3% (≤ 5.013.164 kWh pada 2027) sulit dicapai bila kawasan terus tumbuh (laju 2026 sekitar 5,98 GWh/tahun).',
 'Manajer Energi · Bagian M/E',
 $j$[
  {"id":"q1","teks":"Apakah kenaikan air baku WTP I sebesar 44% sesuai dengan kondisi lapangan?","jenis":"pilihan","opsi":["Ya, sesuai","Tidak sesuai","Tidak tahu"],"petunjuk":"Bila tidak sesuai, jelaskan angka yang menurut Anda benar."},
  {"id":"q2","teks":"Apa penyebab utama kenaikan kebutuhan air pada 2026?","jenis":"teks","petunjuk":"Misalnya tenant baru (sebutkan), pemakaian internal, kebocoran jaringan, kontraktor proyek."},
  {"id":"q3","teks":"Apakah ada beban listrik baru atau perubahan operasi di WTP I sejak Januari 2026?","jenis":"teks","petunjuk":"Pompa tambahan, jam operasi lebih panjang, perubahan tekanan jaringan, peralatan baru."},
  {"id":"q4","teks":"Listrik Tank Farm naik 41% dan tonase pemompaan naik 45%. Apakah ada perubahan operasi lain di Tank Farm?","jenis":"teks","petunjuk":"Misalnya ruang boiler, pemanas, pompa transfer, penerangan, atau jam operasi."},
  {"id":"q5","teks":"Listrik Graha turun 8% dan Pusat Inovasi turun 20%. Apakah ada tindakan hemat energi yang disengaja?","jenis":"teks","petunjuk":"Sebutkan tindakan dan bulan mulai, atau tulis 'tidak ada' bila karena berkurangnya kegiatan."},
  {"id":"q6","teks":"Menurut Anda, apakah target ENPI-04 turun 3% (kWh absolut) pada 2027 realistis?","jenis":"pilihan","opsi":["Realistis","Perlu dinormalisasi terhadap volume air/tonase","Perlu diganti dengan EnPI lain","Tidak tahu"],"petunjuk":"Jelaskan alasan Anda di kolom keterangan."}
 ]$j$),
('PD-02', 'ENPI-05', 'Intensitas pompa intake WTP I melonjak sejak Juli 2025',
 'Intensitas intake (kWh MTR-008 per m³ air baku) stabil 0,16–0,20 sepanjang 2024 sampai Juni 2025, lalu naik ke 0,22–0,30 sejak Juli 2025. Setelah pompa PMP-IPAB-04 diganti dari 110 kW ke 37 kW pada Oktober 2026, intensitas turun ke 0,182. Bacaan MTR-008 Oktober 2026 = 62.088 kWh. Selisih air baku terhadap air diolah WTP I melebar dari sekitar 1% (2025) menjadi 12% (Oktober 2026).',
 'Pola operasi pompa intake berubah sekitar pertengahan 2025 (misalnya pompa 110 kW lebih sering dipakai atau air sungai mulai dipompa langsung ke settling pit). Penggantian pompa Oktober 2026 mengembalikan intensitas ke level sebelum Juli 2025. Selisih air baku dan air diolah yang melebar dapat berasal dari kehilangan air atau dari cara menghitung pengurang air BTM.',
 'Bagian M/E · Pengawas WTP I (IPAB I)',
 $j$[
  {"id":"q1","teks":"Apa yang berubah pada operasi pompa intake sekitar Juni–Agustus 2025?","jenis":"teks","petunjuk":"Pompa yang dipakai, jumlah pompa menyala bersamaan, sumber air (sungai/kolam), kerusakan, atau perubahan level air sungai."},
  {"id":"q2","teks":"Sejak kapan air Sungai Bah Tongguran dipompa langsung ke settling pit (tidak lagi lewat kolam Water Intake)?","jenis":"tanggal","petunjuk":"Perkiraan tanggal juga boleh; jelaskan di keterangan bila tidak pasti."},
  {"id":"q3","teks":"Pompa intake mana yang biasanya menyala bersamaan, dan berapa jam per hari?","jenis":"teks","petunjuk":"PMP-IPAB-01 (37 kW), -02 (37 kW), -03 (22 kW), -04 (dulu 110 kW, kini 37 kW)."},
  {"id":"q4","teks":"Tanggal penggantian pompa PMP-IPAB-04 dari 110 kW ke 37 kW?","jenis":"tanggal"},
  {"id":"q5","teks":"Apakah pompa 110 kW lama masih terpasang sebagai cadangan?","jenis":"pilihan","opsi":["Ya, masih terpasang dan bisa dioperasikan","Tidak, sudah dilepas","Tidak tahu"]},
  {"id":"q6","teks":"Dengan pompa 37 kW, MTR-008 Oktober 2026 masih 62.088 kWh. Pompa atau beban lain apa yang ikut tercatat di meter ini?","jenis":"teks"},
  {"id":"q7","teks":"Selisih air baku dan air diolah WTP I melebar sampai 12% (Oktober 2026). Apa penyebabnya?","jenis":"pilihan","opsi":["Backwash atau pengurasan lebih sering","Kebocoran di instalasi","Pembacaan water meter","Cara menghitung pengurang air BTM","Lainnya"],"petunjuk":"Jelaskan di keterangan."},
  {"id":"q8","teks":"Bagaimana volume air diolah WTP I dipisahkan dari air WTP II (BTM): diukur dengan meter tersendiri atau dihitung?","jenis":"teks"}
 ]$j$),
('PD-03', 'ENPI-06', 'Inlet IPAL I naik 54% sementara listrik WWTP hampir tetap',
 'Inlet IPAL I Jan–Okt 2026 = 1.437.857 m³, naik 53,8% dari 934.643 m³ (Jan–Okt 2025). Kenaikan terjadi seperti anak tangga pada Februari 2026 (Januari 95.272 m³ → Februari 148.727 m³) lalu bertahan. Listrik WWTP (MTR-004) hanya naik 2,2%, sehingga ENPI-06 turun dari baseline 1,841 ke sekitar 1,10 kWh/m³. Angka outlet setiap bulan sama dengan inlet × 0,9996.',
 'Perubahan ENPI-06 kemungkinan efek data, bukan efisiensi: cara mencatat atau mengestimasi inlet berubah pada Februari 2026, dan outlet tampaknya dihitung dari inlet. Listrik WWTP didominasi blower yang menyala tetap, sehingga rasio kWh/m³ turun dengan sendirinya saat inlet naik.',
 'Bagian M/E · Operator IPAL I',
 $j$[
  {"id":"q1","teks":"Bagaimana volume inlet IPAL I dicatat setiap bulan?","jenis":"pilihan","opsi":["Flow meter inlet","Estimasi dari pemakaian air tenant","Estimasi dari kapasitas/jam operasi pompa","Lainnya"],"petunjuk":"Jelaskan cara menghitungnya dan siapa yang mencatat."},
  {"id":"q2","teks":"Apa yang berubah pada Februari 2026 sehingga inlet naik dari sekitar 95 ribu menjadi 149 ribu m³ per bulan?","jenis":"teks","petunjuk":"Tenant atau saluran baru, perubahan metode pencatatan, perbaikan meter, atau lainnya."},
  {"id":"q3","teks":"Apakah ada tenant atau saluran limbah baru yang dialirkan ke IPAL I sejak awal 2026? Sebutkan.","jenis":"teks"},
  {"id":"q4","teks":"Apakah volume outlet diukur terpisah atau dihitung dari inlet?","jenis":"pilihan","opsi":["Diukur dengan meter terpisah","Dihitung dari inlet","Tidak tahu"]},
  {"id":"q5","teks":"Berapa blower yang beroperasi dan bagaimana pola operasinya?","jenis":"teks","petunjuk":"Jumlah dan daya blower, 24 jam atau bergantian, diatur manual atau mengikuti DO."},
  {"id":"q6","teks":"Sejak IPAL II beroperasi (Juni 2026), apakah ada aliran yang dibagi antara IPAL I dan IPAL II? Bagaimana pencatatannya?","jenis":"teks"},
  {"id":"q7","teks":"Apakah mutu effluent IPAL I memenuhi baku mutu sepanjang 2026?","jenis":"pilihan","opsi":["Ya, seluruh bulan","Ada bulan yang tidak memenuhi","Tidak tahu"],"petunjuk":"Bila ada yang tidak memenuhi, sebutkan bulan dan parameternya."}
 ]$j$),
('PD-04', 'ENPI-01', 'BBM kendaraan dan peralatan naik 53% sejak Januari 2026',
 'Dexlite kendaraan dan peralatan Jan–Okt 2026 = 11.193 L, naik 53,5% dari 7.294 L (Jan–Okt 2025). Kenaikan terjadi seperti anak tangga mulai Januari 2026 (rata-rata sekitar 730 → 1.120 L per bulan) lalu stabil. Bensin kendaraan operasional naik 33,7% (6.083 → 8.131 L). Target ENPI-01 2027: ≤ 8.349,30 L (baseline 2025: 8.788,74 L).',
 'Pola anak tangga biasanya berarti ada tambahan unit atau peralatan, atau perubahan cara pencatatan (unit yang dulu tidak tercatat kini ikut masuk), bukan pemborosan bertahap. Tanpa data km atau jam operasi per unit, deviasi belum bisa dinormalisasi.',
 'Bagian Umum · Pengelola Kendaraan',
 $j$[
  {"id":"q1","teks":"Apakah ada kendaraan atau alat berat baru (atau sewaan) yang mulai beroperasi antara Oktober 2025 dan Januari 2026?","jenis":"teks","petunjuk":"Sebutkan unit, jenis BBM, dan bulan mulai beroperasi."},
  {"id":"q2","teks":"Apakah cara pencatatan BBM berubah mulai Januari 2026?","jenis":"pilihan","opsi":["Ya, berubah","Tidak berubah","Tidak tahu"],"petunjuk":"Misalnya sistem voucher/kartu baru, unit yang dicatat bertambah, atau pembelian langsung kini ikut dicatat."},
  {"id":"q3","teks":"Apakah tersedia data pemakaian BBM per unit beserta km atau jam operasinya?","jenis":"pilihan","opsi":["Ya, per unit per bulan","Sebagian","Tidak ada"],"petunjuk":"Bila ada, sebutkan lokasi berkasnya agar dapat diunggah sebagai bukti."},
  {"id":"q4","teks":"Kegiatan operasional apa yang bertambah pada 2026?","jenis":"teks","petunjuk":"Misalnya penyapuan jalan, patroli, latihan atau tugas damkar, pekerjaan proyek, perawatan PJU dengan sky lift."},
  {"id":"q5","teks":"Apa penyebab kenaikan bensin 34%?","jenis":"teks"},
  {"id":"q6","teks":"Menurut Anda, apakah target ENPI-01 ≤ 8.349 L pada 2027 realistis?","jenis":"pilihan","opsi":["Realistis","Perlu dinormalisasi terhadap jumlah unit atau jam operasi","Perlu diubah","Tidak tahu"],"petunjuk":"Jelaskan alasan Anda di keterangan."}
 ]$j$),
('PD-05', 'ENPI-01', 'BBM genset IPAB I dan IPAL I naik 160%',
 'Dexlite genset IPAB I + IPAL I Jan–Okt 2026 = 7.078 L, naik 160% dari 2.721 L (Jan–Okt 2025). Lonjakan terjadi di kedua plant pada bulan yang sama: Maret (800 + 445 L), Mei (1.187 + 1.460 L), Juni (668 + 535 L), dan Agustus (460 + 882 L).',
 'Genset di dua plant yang menyala bersamaan menunjukkan gangguan atau pemadaman pasokan listrik kawasan, bukan inefisiensi operasi. Bila terbukti, penyebabnya faktor eksternal dan dicatat sebagai variabel (jam padam).',
 'Bagian M/E',
 $j$[
  {"id":"q1","teks":"Apakah terjadi gangguan atau pemadaman pasokan listrik pada Maret, Mei, Juni, dan Agustus 2026? Berapa lama?","jenis":"teks","petunjuk":"Sebutkan tanggal dan durasi bila tercatat."},
  {"id":"q2","teks":"Apakah tersedia log pemadaman PLN atau hour meter genset?","jenis":"pilihan","opsi":["Ya, keduanya","Hanya log pemadaman","Hanya hour meter genset","Tidak ada"]},
  {"id":"q3","teks":"Berapa jam operasi genset IPAB I dan IPAL I pada bulan-bulan tersebut?","jenis":"teks"},
  {"id":"q4","teks":"Apakah genset juga dijalankan untuk uji rutin atau pemeliharaan? Bagaimana jadwalnya?","jenis":"teks"},
  {"id":"q5","teks":"Apakah ada sebab lain, misalnya pengisian tangki genset dicatat sekaligus di satu bulan?","jenis":"teks"}
 ]$j$)
) as v(kode, enpi, judul, ringkasan, hipotesis, pic, tanya)
where not exists (select 1 from lembar_penyelidikan l where l.kode = v.kode);
