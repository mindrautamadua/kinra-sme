-- Riwayat simulasi audit bersama KIRA (halaman Tanya Jawab Audit, tab Simulasi).
-- Terpisah dari tabel temuan agar temuan latihan tidak bercampur dengan temuan audit sungguhan.
--
-- Hak akses: semua peran yang login boleh berlatih dan menyimpan hasil; admin & konsultan melihat
-- semua riwayat, peran lain hanya riwayatnya sendiri; hapus admin. Pencatat diisi dari sesi.
--
-- Jalankan setelah 0006. Aman diulang.

create table if not exists simulasi_audit (
  id         bigint generated always as identity primary key,
  unit_no    int not null,
  unit_nama  text not null,
  mode       text not null check (mode in ('stage1', 'stage2')),
  jumlah     int not null check (jumlah between 1 and 30),
  skor       int not null check (skor >= 0),
  skor_maks  int not null check (skor_maks > 0),
  prediksi   jsonb not null default '[]'::jsonb,   -- [{kategori, klausul, uraian}]
  jawaban    jsonb not null default '[]'::jsonb,   -- [{tanya, sumber, klausul, jawaban, skor, alasan, bukti}]
  oleh       text,
  peran      text,
  dibuat_at  timestamptz not null default now()
);

create index if not exists simulasi_audit_oleh_idx on simulasi_audit (oleh, dibuat_at desc);

create or replace function cap_simulasi_audit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.oleh := coalesce(nama_sesi(), new.oleh);
  new.peran := coalesce(peran_sesi(), new.peran);
  new.dibuat_at := now();
  return new;
end $$;

drop trigger if exists cap_simulasi_audit on simulasi_audit;
create trigger cap_simulasi_audit before insert on simulasi_audit
  for each row execute function cap_simulasi_audit();

alter table simulasi_audit enable row level security;
drop policy if exists baca on simulasi_audit;
create policy baca on simulasi_audit for select to anon, authenticated
  using ((select peran_sesi()) in ('admin', 'konsultan') or oleh = (select nama_sesi()));
drop policy if exists tambah on simulasi_audit;
create policy tambah on simulasi_audit for insert to anon, authenticated with check ((select peran_sesi()) is not null);
drop policy if exists hapus on simulasi_audit;
create policy hapus on simulasi_audit for delete to anon, authenticated using ((select peran_sesi()) = 'admin');
