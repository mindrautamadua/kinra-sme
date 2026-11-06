import 'server-only'
import { ambilAsetMeter, ambilDeviasi, ambilDokumen, ambilParameter, ambilIsu, ambilSeu, ambilKegiatan, ambilKinerja, ambilKlausul, ambilPeluang, ambilSasaran, ambilTemuan, rekapEnergi } from './data'
import { LABEL_METODE, ringkas } from './enpi'
import { angka, hariIni, persen, tanggal } from './format'
import { penggunaEnergi } from './tinjauan'
import { susunKonversi } from './konversi'
import { deteksiDeviasi, gabungDeviasi, terbuka as deviasiTerbuka } from './deviasi'
import { adaBukti, kesiapan, terlambat, tingkatRisiko, tonggakDari } from './status'
import { LANGKAH_TINDAK_LANJUT, SUMBER_TANYA_JAWAB, UNIT_AUDIT, URUTAN_PEMERIKSAAN } from './tanya-jawab'

/** Ringkasan data dashboard dalam teks ringkas untuk instruksi sistem chatbot. Dibaca dengan sesi pengguna (RLS berlaku). */
/** `tanyaJawab`: sertakan materi tanya jawab audit (~9 ribu token). Chat teks hanya menyertakannya bila pertanyaan relevan. */
export async function konteksDashboard({ tanyaJawab = true }: { tanyaJawab?: boolean } = {}): Promise<string> {
  const [dokumen, klausul, temuan, kegiatan, isu, peluang, { sasaran, aksi }, kinerja, { seu, tinjauan }, { aset }, registerDeviasi, param] = await Promise.all([
    ambilDokumen(), ambilKlausul(), ambilTemuan(), ambilKegiatan(), ambilIsu(), ambilPeluang(), ambilSasaran(), ambilKinerja(), ambilSeu(), ambilAsetMeter(), ambilDeviasi(), ambilParameter(),
  ])
  const kini = hariIni()
  const b: string[] = [`Tanggal hari ini: ${tanggal(kini, 'panjang')}.`]

  b.push('\n## Tonggak audit')
  for (const t of tonggakDari(kegiatan)) b.push(`- ${t.nama}: ${tanggal(t.tanggal, 'panjang')}`)

  const siap = dokumen.filter(adaBukti).length
  b.push(`\n## Kesiapan dokumen\nSkor ${persen(kesiapan(dokumen))} = persentase dokumen yang sudah punya evidence (berkas terunggah di Kesiapan Audit; isian formulir tidak dihitung); ${siap} dari ${dokumen.length} dokumen ada evidence. Status Draft/Final per dokumen hanya informasi posisi, tidak memengaruhi skor.`)
  for (const k of klausul) {
    const ds = dokumen.filter((d) => d.klausul_kode === k.kode)
    if (ds.length) b.push(`- Klausul ${k.kode} ${k.judul}: ${persen(kesiapan(ds))} (${ds.length} dokumen)`)
  }
  b.push('\nDokumen belum ada evidence (kode | nama | PIC | tenggat):')
  for (const d of dokumen.filter((d) => !adaBukti(d))) {
    b.push(`- ${d.kode} | ${d.nama}${terlambat(d, kini) ? ' (TERLAMBAT)' : ''} | ${d.pic ?? '–'} | ${tanggal(d.tenggat)}`)
  }

  const { tahun, tj } = rekapEnergi(kinerja.sumber, kinerja.energi)
  b.push('\n## Konsumsi energi (TJ per tahun)')
  for (const t of tahun) {
    const bln = Math.max(0, ...kinerja.energi.filter((d) => d.tahun === t).map((d) => d.bulan))
    const rinci = kinerja.sumber.map((s) => `${s.nama} ${angka(tj((d) => d.tahun === t && d.sumber_kode === s.kode), 3)}`).join(', ')
    b.push(`- ${t} (s.d. bulan ${bln}): total ${angka(tj((d) => d.tahun === t), 3)} TJ; ${rinci}`)
  }
  b.push(`Sumber energi: ${kinerja.sumber.map((s) => `${s.nama} (${s.satuan}, ${s.terbarukan ? 'terbarukan' : 'tak terbarukan'})`).join('; ')}.`)

  const pareto = penggunaEnergi({ aset, meter: kinerja.meter, bacaan: kinerja.bacaan, sumber: kinerja.sumber, energi: kinerja.energi, seu,
    ambangPersen: tinjauan?.ambang_persen ?? 10, ambangKumulatif: tinjauan?.ambang_kumulatif ?? 80 })
  b.push(`\n## Tinjauan energi & SEU (lingkup KINRA, tanpa tenant)\nEnergi KINRA ±${angka(pareto.total, 0)} kWh setara/bulan; ${persen(pareto.porsiMeter, 0)} terukur meter, sisanya perkiraan inventaris/data BBM. ${pareto.tanpaData.length} aset belum punya data energi. Tinjauan ${tinjauan ? `${tanggal(tinjauan.periode_mulai)}–${tanggal(tinjauan.periode_selesai)} status ${tinjauan.status}` : 'belum dicatat'}.`)
  for (const p of pareto.daftar) b.push(`- ${p.nama}: ${persen(p.porsi)} (${p.dasar})${p.seu ? ` → ${p.seu.kode} ${p.seu.status}` : p.kandidat ? ' → kandidat SEU, belum di register' : ''}`)
  for (const x of seu) b.push(`- ${x.kode} ${x.nama} [${x.status}] EnPI ${x.enpi_kode ?? '–'}, PIC ${x.pic ?? '–'}, personel ${x.personel ?? '–'}`)

  const kv = susunKonversi(param)
  b.push(`\n## Konversi rupiah & emisi\nTarif listrik Rp${angka(kv.tarifListrik, 2)}/kWh; faktor emisi listrik ${angka(kv.efListrik, 2)} kg CO2/kWh; Dexlite Rp${angka(kv.hargaDexlite, 0)}/liter, ${angka(kv.efDexlite, 2)} kg CO2/liter.${kv.asumsi.length ? ` Masih asumsi (sebutkan bila mengutip): ${kv.asumsi.join(', ')}.` : ''}`)
  b.push('\n## EnPI')
  b.push('Batas lingkup: data PLN di energi bulanan adalah total kawasan TERMASUK listrik tenant (di luar lingkup SMEn). Kinerja SMEn KINRA hanya diklaim dari EnPI lingkup KINRA (bacaan meter aset KINRA, BBM kendaraan). EnPI lingkup kawasan hanya konteks.')
  for (const h of kinerja.hasil) {
    const r = ringkas(h.laporan)
    const model = h.model ? `R² ${angka(h.model.r2, 3)}, CV(RMSE) ${persen(h.model.cvrmse)}` : (h.galat ?? 'model belum terbentuk')
    b.push(`- ${h.enpi.kode} ${h.enpi.nama} [${LABEL_METODE[h.enpi.metode]}], baseline ${tanggal(h.enpi.baseline_mulai)}–${tanggal(h.enpi.baseline_selesai)}: ${model}; ${r.bulan} bulan pelaporan, perbaikan ${persen(r.perbaikan)}, hemat ${angka(r.hemat, 2)} ${h.satuan}${h.enpi.utama ? '; EnPI UTAMA' : ''}; lingkup ${(h.enpi.lingkup ?? 'kinra') === 'kinra' ? 'KINRA' : 'kawasan termasuk tenant'}${h.enpi.aktif ? '' : '; NONAKTIF'}${h.ekstrapolasi ? `; PERINGATAN: ${h.ekstrapolasi} bulan pelaporan di luar rentang baseline, harapan = ekstrapolasi, penghematan belum boleh diklaim` : ''}`)
  }

  const dev = gabungDeviasi(deteksiDeviasi(kinerja.hasil), registerDeviasi).baris
  b.push(`\n## Deviasi signifikan kinerja energi (klausul 9.1, lingkup KINRA)\n${dev.filter((x) => deviasiTerbuka(x.r)).length} terbuka dari ${dev.length} terdeteksi. Aturan: selisih bulanan > maks(2×RMSE, 10%), 3 bulan berturut-turut boros, atau data hilang.`)
  for (const x of dev.slice(0, 12)) b.push(`- ${x.d.enpi_kode} ${x.d.label} [${x.d.jenis}, ${x.d.arah}] selisih ${persen(x.d.selisih_persen)}: ${x.r ? `${x.r.status}${x.r.penyebab ? `, penyebab: ${x.r.penyebab}` : ''}` : 'BELUM DISELIDIKI'}`)

  b.push('\n## Sasaran & rencana aksi')
  for (const s of sasaran) b.push(`- ${s.kode} ${s.uraian} | EnPI ${s.enpi_kode ?? '–'} | target ${persen(s.target_persen)} ${s.tahun_target ?? ''} | ${s.status}`)
  for (const a of aksi) b.push(`- Aksi ${a.kode} ${a.uraian} | ${a.status} | PIC ${a.pic ?? '–'} | tenggat ${tanggal(a.tenggat)} | estimasi ${angka(a.estimasi_hemat_kwh)} kWh, terverifikasi ${angka(a.hemat_terverifikasi_kwh)} kWh`)

  const buka = temuan.filter((t) => t.status !== 'Tertutup')
  b.push(`\n## Temuan audit (${temuan.length} tercatat, ${buka.length} belum tertutup)`)
  for (const t of buka) b.push(`- ${t.nomor} ${t.jenis_audit} ${t.kategori} klausul ${t.klausul_kode ?? '–'}: ${t.uraian} | ${t.status} | PIC ${t.pic ?? '–'} | tenggat ${tanggal(t.tenggat)}`)

  b.push('\n## Isu (risiko/peluang)')
  for (const i of isu) b.push(`- #${i.id} ${i.asal} ${i.jenis}, skor ${i.skor} (${tingkatRisiko(i.skor).label}): ${i.uraian}`)

  b.push('\n## Peluang peningkatan')
  for (const p of peluang) b.push(`- ${p.kode} ${p.uraian} | prioritas ${angka(p.prioritas, 2)} | estimasi ${angka(p.estimasi_kwh)} kWh | ${p.status}`)

  b.push('\n## Kegiatan pendampingan')
  for (const k of kegiatan) b.push(`- ${k.no}. ${k.nama} | ${k.status ?? '–'} | sesi: ${k.sesi.map((s) => tanggal(s.tanggal)).join(', ') || '–'}`)

  if (tanyaJawab) b.push('\n' + konteksTanyaJawab())

  return b.join('\n')
}

/** Seluruh materi tanya jawab audit internal (menu Tanya Jawab Audit) dalam format ringkas untuk KIRA. */
export function konteksTanyaJawab(): string {
  const b: string[] = [
    `## Materi tanya jawab audit internal (${SUMBER_TANYA_JAWAB})`,
    'Contoh pertanyaan auditor internal per unit kerja beserta jawaban yang diharapkan, bukti objektif, dan indikator. Jawaban adalah contoh, bukan pernyataan bahwa KINRA sudah memenuhi persyaratan. Rujukan klausul 8.4 di materi sumber sudah dikoreksi menjadi 8.3 (pengadaan).',
    `Urutan pemeriksaan: ${URUTAN_PEMERIKSAAN}`,
  ]
  for (const u of UNIT_AUDIT) {
    b.push(`\n### Unit ${u.no} ${u.nama} (${u.kelompok}; klausul ${u.klausul}) — ${u.ringkas}`)
    for (const t of u.tanya) {
      b.push(`U${u.no}Q${t.no} [${t.klausul.join(', ')}] ${t.tanya}\nJawaban: ${t.jawab.join(' ')}\nBukti: ${t.bukti} Indikator: ${t.indikator}`)
    }
  }
  b.push(`\nTindak lanjut hasil audit: ${LANGKAH_TINDAK_LANJUT.map((l, i) => `${i + 1}) ${l.judul}: ${l.isi}`).join(' ')}`)
  return b.join('\n')
}
