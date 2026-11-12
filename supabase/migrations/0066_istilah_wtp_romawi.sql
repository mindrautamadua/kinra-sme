-- Konvensi istilah (keputusan pengguna, 12 Nov 2026):
--   * WTP dan WWTP sebagai istilah utama; padanan sumber IPAB (air bersih) dan IPAL (air limbah).
--   * Penomoran Romawi mengikuti sheet sumber dan register pompa: WTP I, WTP II (BTM), IPAB I, IPAL I.
-- Migrasi ini mengubah teks yang tersimpan di database ("WTP 1" -> "WTP I", "WTP 2" -> "WTP II"),
-- lalu memperjelas nama variabel air_olahan yang sejak 2026 ikut memuat air WTP II (BTM).
-- Kode (air_wtp1, KINRA-MTR-005, dst.) tidak diubah. Frasa seperti "WTP 3 bulan" tidak tersentuh.
-- Jalankan setelah 0065. Aman diulang.

do $$
declare r record;
begin
  for r in
    select c.table_name, c.column_name
    from information_schema.columns c
    where c.table_schema = 'public'
      and c.table_name = any (array['variabel_relevan', 'enpi', 'seu', 'meter_energi', 'pembacaan_meter', 'deviasi',
                                    'rencana_aksi', 'sasaran', 'peluang', 'isu', 'tinjauan_energi', 'pompa', 'aset'])
      and c.data_type in ('text', 'character varying')
  loop
    execute format(
      'update %I set %I = regexp_replace(regexp_replace(%I, %L, %L, %L), %L, %L, %L) where %I ~ %L',
      r.table_name, r.column_name, r.column_name,
      '\mWTP 1(?![0-9])(?! ?bulan)', 'WTP I', 'g',
      '\mWTP 2(?![0-9])(?! ?bulan)', 'WTP II', 'g',
      r.column_name, '\mWTP [12](?![0-9])');
  end loop;
end $$;

update variabel_relevan set
  nama = 'Distribusi air bersih total (WTP I + BTM)',
  keterangan = 'Total distribusi air bersih kawasan per bulan (tenant + unit sendiri + kontraktor), realisasi terukur. Sejak suplai WTP II (BTM, pihak ketiga) berjalan, angka ini memuat air BTM yang energinya di luar lingkup KINRA. Untuk EnPI WTP I gunakan air_wtp1.'
where kode = 'air_olahan';
