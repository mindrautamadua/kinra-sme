import { Activity, CalendarClock, ClipboardCheck, SearchCheck, Target, TriangleAlert } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SectionHead } from '@/components/SectionHead'
import { Tile } from '@/components/Tile'
import { ambilDeviasi, ambilDokumen, ambilKegiatan, ambilKinerja, ambilRiwayatSimulasi, ambilSasaran, ambilSeu, ambilTemuan } from '@/lib/data'
import { boleh } from '@/lib/akses'
import { deteksiDeviasi, gabungDeviasi, terbuka as deviasiTerbuka } from '@/lib/deviasi'
import { pilihEnpiUtama, ringkas } from '@/lib/enpi'
import { angka, hariIni, persen, selisihHari, tanggal } from '@/lib/format'
import { DAFTAR_PERIKSA_MR, FUNGSI_MR, type KodeFungsi, SIKAP_AUDIT, SK_MR, TANYA_MR } from '@/lib/ruang-mr'
import { penggunaSaya } from '@/lib/sesi'
import { kesiapan, siapAudit, tonggakDari } from '@/lib/status'
import { SimulasiAudit } from '../tanya-jawab/SimulasiAudit'
import { DaftarPeriksa, LatihanMr } from './LatihanMr'

export const dynamic = 'force-dynamic'

const UNIT_MR = 2 // unit "Steering Committee / MR" di bank soal audit internal

export default async function RuangMr() {
  const [dokumen, temuan, kegiatan, kinerja, { sasaran, aksi }, { seu }, register, riwayat, saya] = await Promise.all([
    ambilDokumen(), ambilTemuan(), ambilKegiatan(), ambilKinerja(), ambilSasaran(), ambilSeu(), ambilDeviasi(), ambilRiwayatSimulasi(), penggunaSaya(),
  ])
  if (!saya || !boleh(saya.peran, 'ruangmr.lihat')) notFound()
  const kini = hariIni()

  // Kesiapan dokumen
  const wajib = dokumen.filter((d) => d.wajib_iso)
  const skor = kesiapan(dokumen)
  const dokKlausul = (awalan: string[]) => dokumen.filter((d) => awalan.some((a) => d.klausul_kode.startsWith(a)))
  const belumSiap = (awalan: string[]) => dokKlausul(awalan).filter((d) => !siapAudit(d))

  // Kinerja energi
  const utama = pilihEnpiUtama(kinerja.hasil)
  const ru = utama ? ringkas(utama.laporan) : null
  const deviasiBuka = gabungDeviasi(deteksiDeviasi(kinerja.hasil), register).baris.filter((b) => deviasiTerbuka(b.r))
  const seuTetap = seu.filter((s) => s.status === 'Ditetapkan')
  const meterLewatKalibrasi = kinerja.meter.filter((m) => m.kalibrasi_berikutnya && m.kalibrasi_berikutnya < kini)

  // Sasaran & aksi
  const sasaranAktif = sasaran.filter((s) => s.status === 'Aktif')
  const sasaranTercapai = sasaran.filter((s) => s.status === 'Tercapai')
  const aksiJalan = aksi.filter((a) => a.status !== 'Batal')
  const aksiSelesai = aksiJalan.filter((a) => a.status === 'Selesai')
  const aksiTelat = aksiJalan.filter((a) => a.status !== 'Selesai' && a.tenggat && a.tenggat < kini)
  const hematVerif = aksi.reduce((n, a) => n + (a.hemat_terverifikasi_kwh ?? 0), 0)

  // Temuan
  const temuanBuka = temuan.filter((t) => t.status !== 'Tertutup')
  const temuanTelat = temuanBuka.filter((t) => t.tenggat && t.tenggat < kini)
  const temuanMayor = temuanBuka.filter((t) => t.kategori === 'Mayor')

  // Hambatan (PICA di timeline)
  const kendalaBuka = kegiatan.filter((k) => k.kendala && k.status !== 'selesai')

  // Tonggak audit
  const tonggak = tonggakDari(kegiatan)
  const tg = (kode: string) => tonggak.find((t) => t.kode === kode)
  const tm = tg('tm'), ia = tg('ia'), s1 = tg('s1'), s2 = tg('s2')
  const berikut = tonggak.find((t) => t.tanggal >= kini)
  const jadwal = (t: typeof tm) => (t ? `${tanggal(t.tanggal)}${t.tanggal >= kini ? ` (${selisihHari(t.tanggal, kini)} hari lagi)` : ' (sudah lewat)'}` : 'belum dijadwalkan')

  const sebut = (ds: { kode: string }[], maks = 4) => ds.slice(0, maks).map((d) => d.kode).join(', ') + (ds.length > maks ? `, +${ds.length - maks} lainnya` : '')

  /** Fakta hidup per fungsi: kalimat yang bisa langsung dipakai saat menjawab. */
  const fakta: Record<KodeFungsi, string[]> = {
    arah: [
      `${dokumen.filter(siapAudit).length} dari ${dokumen.length} dokumen siap audit (${persen(skor, 0)}); dokumen wajib ISO: ${wajib.filter(siapAudit).length} dari ${wajib.length}.`,
      belumSiap(['4', '5']).length
        ? `Dokumen klausul 4–5 yang belum Final dengan berkas sah: ${sebut(belumSiap(['4', '5']))}.`
        : 'Semua dokumen klausul 4–5 sudah Final dengan berkas sah.',
    ],
    sasaran: [
      `${sasaran.length} sasaran: ${sasaranAktif.length} aktif, ${sasaranTercapai.length} tercapai.`,
      utama && ru?.perbaikan != null
        ? `EnPI utama ${utama.enpi.kode} (${utama.enpi.nama}): ${ru.perbaikan >= 0 ? 'lebih efisien' : 'lebih boros'} ${persen(Math.abs(ru.perbaikan))} dari baseline selama ${ru.bulan} bulan pelaporan.`
        : 'EnPI utama belum punya data pelaporan. Ini akan ditanyakan auditor.',
      `${aksiSelesai.length} dari ${aksiJalan.length} rencana aksi selesai; penghematan terverifikasi ${angka(hematVerif)} kWh.`,
    ],
    hambatan: [
      aksiTelat.length ? `${aksiTelat.length} rencana aksi melewati tenggat: ${sebut(aksiTelat)}.` : 'Tidak ada rencana aksi yang melewati tenggat.',
      kendalaBuka.length ? `${kendalaBuka.length} kendala (PICA) di timeline belum tuntas, mis. "${kendalaBuka[0].kendala}".` : 'Tidak ada kendala PICA terbuka di timeline.',
    ],
    rekomendasi: [
      `Tinjauan manajemen: ${jadwal(tm)}.`,
      belumSiap(['9.3']).length ? `Dokumen 9.3 belum Final dengan berkas sah: ${sebut(belumSiap(['9.3']))}.` : 'Dokumen 9.3 sudah Final dengan berkas sah.',
    ],
    audit: [
      `Audit internal: ${jadwal(ia)}.`,
      `${temuanBuka.length} temuan belum tertutup (${temuanMayor.length} mayor), ${temuanTelat.length} melewati tenggat.`,
    ],
    kinerja: [
      `${deviasiBuka.length} deviasi signifikan kinerja energi belum ditutup.`,
      `${seuTetap.length} SEU ditetapkan${seuTetap.length ? `: ${seuTetap.map((s) => s.nama).join(', ')}` : ''}.`,
      meterLewatKalibrasi.length ? `${meterLewatKalibrasi.length} meter melewati jadwal kalibrasi.` : 'Tidak ada meter yang melewati jadwal kalibrasi.',
    ],
    celah: [
      'Butir celah ini berasal dari pembacaan SK, bukan dari data. Tutup dengan lampiran wewenang atau revisi SK (Diktum Kesembilan).',
    ],
  }

  return (
    <section>
      <SectionHead hero eyebrow={<>Ruang MR · persiapan audit eksternal · per {tanggal(kini, 'panjang')}</>}
        judul={<>{TANYA_MR.length} pertanyaan auditor untuk MR, disusun dari <span className="ks-sorot">6 fungsi Anda di SK</span></>}>
        <p className="muted">
          Bahan belajar khusus {SK_MR.peranTim}. Setiap pertanyaan dipetakan ke fungsi MR pada SK {SK_MR.nomor} dan klausul ISO 50001:2018,
          lengkap dengan contoh jawaban, bukti yang harus ditunjukkan, dan kesalahan yang perlu dihindari. Jawaban adalah respons yang diharapkan:
          cocokkan dengan kondisi aktual dan dokumen terkendali sebelum audit.
        </p>
      </SectionHead>

      <div className="mr-sk card">
        <div>
          <span className="eyebrow">Dasar penugasan · SK {SK_MR.nomor} · {SK_MR.tanggal}</span>
          <blockquote>{SK_MR.uraian}</blockquote>
        </div>
        <dl>
          <div><dt>Jabatan</dt><dd>{SK_MR.jabatan}</dd></div>
          <div><dt>Melapor ke</dt><dd>{SK_MR.atasan}</dd></div>
          <div><dt>Mengoordinasikan</dt><dd>{SK_MR.bawahan}</dd></div>
        </dl>
      </div>

      <SectionHead no="01" eyebrow="Angka hari ini · dari data aplikasi" judul="Angka yang harus Anda hafal sebelum auditor datang">
        <p className="muted">Auditor hampir pasti menanyakan angka-angka ini kepada MR. Angka ikut berubah ketika data diperbarui.</p>
      </SectionHead>
      <div className="tiles t3 mr-tiles">
        <Tile ikon={ClipboardCheck} label="Dokumen siap audit" nilai={persen(skor, 0)} meta={`${wajib.filter(siapAudit).length}/${wajib.length} dokumen wajib ISO siap`} progres={skor} />
        <Tile ikon={Activity} label={utama ? `EnPI utama ${utama.enpi.kode}` : 'EnPI utama'}
          nilai={ru?.perbaikan != null ? `${ru.perbaikan >= 0 ? '+' : '−'}${angka(Math.abs(ru.perbaikan), 1)}%` : '–'}
          meta={ru?.perbaikan != null ? `${ru.perbaikan >= 0 ? 'lebih efisien' : 'lebih boros'} dari baseline · ${ru.bulan} bulan` : 'Belum ada data pelaporan'} />
        <Tile ikon={Target} label="Sasaran tercapai" nilai={`${sasaranTercapai.length}/${sasaran.length}`} meta={`${aksiSelesai.length}/${aksiJalan.length} aksi selesai · ${aksiTelat.length} lewat tenggat`} />
        <Tile ikon={SearchCheck} label="Temuan belum tertutup" nilai={temuanBuka.length} meta={`${temuanMayor.length} mayor · ${temuanTelat.length} lewat tenggat`} />
        <Tile ikon={TriangleAlert} label="Deviasi kinerja terbuka" nilai={deviasiBuka.length} meta={`${seuTetap.length} SEU ditetapkan · ${meterLewatKalibrasi.length} meter lewat kalibrasi`} />
        <Tile ikon={CalendarClock} label={berikut ? `Berikutnya: ${berikut.nama}` : 'Tonggak audit'}
          nilai={berikut ? selisihHari(berikut.tanggal, kini) : '–'} satuan={berikut ? 'hari' : undefined}
          meta={[ia && `IA ${tanggal(ia.tanggal)}`, tm && `TM ${tanggal(tm.tanggal)}`, s1 && `S1 ${tanggal(s1.tanggal)}`, s2 && `S2 ${tanggal(s2.tanggal)}`].filter(Boolean).join(' · ') || 'Atur tanggal di Timeline'} />
      </div>

      <SectionHead no="02" eyebrow="Bank soal MR · per fungsi di SK" judul="Latihan menjawab pertanyaan auditor">
        <p className="muted">
          Pilih fungsi, coba jawab dulu dengan suara keras, lalu buka contoh jawaban. Tandai &ldquo;Sudah kuasai&rdquo; atau &ldquo;Perlu latihan&rdquo;:
          tanda tersimpan di peramban ini saja. Kotak &ldquo;Fakta hari ini&rdquo; berisi angka nyata untuk menguatkan jawaban.
        </p>
      </SectionHead>
      <LatihanMr fungsi={FUNGSI_MR} tanya={TANYA_MR} fakta={fakta} />

      <SectionHead no="03" eyebrow="Simulasi bersama KIRA · unit Steering Committee / MR" judul="Diuji auditor tiruan, dinilai 0–3">
        <p className="muted">KIRA mengajukan pertanyaan dari materi audit unit MR dan dari celah nyata di data, menilai jawaban Anda, lalu memprediksi temuan.</p>
      </SectionHead>
      <SimulasiAudit riwayat={riwayat.filter((r) => r.unit_no === UNIT_MR)} bolehSimpan={boleh(saya?.peran, 'simulasi.simpan')} unitAwal={UNIT_MR} />

      <SectionHead no="04" eyebrow="Saat audit berlangsung" judul="Sikap MR di depan auditor" />
      <div className="mr-sikap">
        {SIKAP_AUDIT.map((s, i) => (
          <div key={s.judul} className="card"><span className="mono">{String(i + 1).padStart(2, '0')}</span><b>{s.judul}</b><p className="muted small">{s.isi}</p></div>
        ))}
      </div>

      <SectionHead no="05" eyebrow="Daftar periksa pribadi" judul="Sebelum hari audit, pastikan semua ini beres">
        <p className="muted">Centang tersimpan di peramban ini saja. Untuk status dokumen resmi, gunakan <Link href="/kesiapan">Kesiapan Audit</Link>.</p>
      </SectionHead>
      <DaftarPeriksa butir={DAFTAR_PERIKSA_MR} />

      <p className="sumber">Sumber: SK Direktur PT KINRA No. {SK_MR.nomor} ({SK_MR.tanggal}), ISO 50001:2018, ISO 50003:2021, dan materi audit internal SMEn KINRA 2026. Angka dihitung otomatis dari data aplikasi.</p>
    </section>
  )
}
