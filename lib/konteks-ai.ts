import 'server-only'
import { ambilDokumen, ambilIsu, ambilKegiatan, ambilKinerja, ambilKlausul, ambilPeluang, ambilSasaran, ambilTemuan, rekapEnergi } from './data'
import { LABEL_METODE, ringkas } from './enpi'
import { angka, hariIni, persen, tanggal } from './format'
import { kesiapan, STATUS, terlambat, tingkatRisiko, TONGGAK } from './status'

/** Ringkasan data dashboard dalam teks ringkas untuk instruksi sistem chatbot. Dibaca dengan sesi pengguna (RLS berlaku). */
export async function konteksDashboard(): Promise<string> {
  const [dokumen, klausul, temuan, kegiatan, isu, peluang, { sasaran, aksi }, kinerja] = await Promise.all([
    ambilDokumen(), ambilKlausul(), ambilTemuan(), ambilKegiatan(), ambilIsu(), ambilPeluang(), ambilSasaran(), ambilKinerja(),
  ])
  const kini = hariIni()
  const b: string[] = [`Tanggal hari ini: ${tanggal(kini, 'panjang')}.`]

  b.push('\n## Tonggak audit')
  for (const t of TONGGAK) b.push(`- ${t.nama}: ${tanggal(t.tanggal, 'panjang')}`)

  const siap = dokumen.filter((d) => d.status === 'final' || d.status === 'disetujui').length
  b.push(`\n## Kesiapan dokumen\nSkor berbobot ${persen(kesiapan(dokumen))}; ${siap} dari ${dokumen.length} dokumen final/disetujui.`)
  for (const k of klausul) {
    const ds = dokumen.filter((d) => d.klausul_kode === k.kode)
    if (ds.length) b.push(`- Klausul ${k.kode} ${k.judul}: ${persen(kesiapan(ds))} (${ds.length} dokumen)`)
  }
  b.push('\nDokumen belum final/disetujui (kode | nama | status | PIC | tenggat | evidence):')
  for (const d of dokumen.filter((d) => d.status !== 'final' && d.status !== 'disetujui')) {
    b.push(`- ${d.kode} | ${d.nama} | ${STATUS[d.status].label}${terlambat(d, kini) ? ' (TERLAMBAT)' : ''} | ${d.pic ?? '–'} | ${tanggal(d.tenggat)} | ${d.link_eksternal ? 'ada' : 'belum'}`)
  }

  const { tahun, tj } = rekapEnergi(kinerja.sumber, kinerja.energi)
  b.push('\n## Konsumsi energi (TJ per tahun)')
  for (const t of tahun) {
    const bln = Math.max(0, ...kinerja.energi.filter((d) => d.tahun === t).map((d) => d.bulan))
    const rinci = kinerja.sumber.map((s) => `${s.nama} ${angka(tj((d) => d.tahun === t && d.sumber_kode === s.kode), 3)}`).join(', ')
    b.push(`- ${t} (s.d. bulan ${bln}): total ${angka(tj((d) => d.tahun === t), 3)} TJ; ${rinci}`)
  }
  b.push(`Sumber energi: ${kinerja.sumber.map((s) => `${s.nama} (${s.satuan}, ${s.terbarukan ? 'terbarukan' : 'tak terbarukan'})`).join('; ')}.`)

  b.push('\n## EnPI')
  for (const h of kinerja.hasil) {
    const r = ringkas(h.laporan)
    const model = h.model ? `R² ${angka(h.model.r2, 3)}, CV(RMSE) ${persen(h.model.cvrmse)}` : (h.galat ?? 'model belum terbentuk')
    b.push(`- ${h.enpi.kode} ${h.enpi.nama} [${LABEL_METODE[h.enpi.metode]}], baseline ${tanggal(h.enpi.baseline_mulai)}–${tanggal(h.enpi.baseline_selesai)}: ${model}; ${r.bulan} bulan pelaporan, perbaikan ${persen(r.perbaikan)}, hemat ${angka(r.hemat, 2)} ${h.satuan}`)
  }

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

  return b.join('\n')
}
