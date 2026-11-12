import { Database, FileCheck2, Gauge, SearchCheck, ShieldAlert, Target } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { SectionHead } from '@/components/SectionHead'
import { Tile } from '@/components/Tile'
import { ambilAsetMeter, ambilDokumen, ambilIsu, ambilPeluang, ambilRiwayatSimulasi, ambilSasaran, ambilTemuan } from '@/lib/data'
import { boleh } from '@/lib/akses'
import { adaBacaan } from '@/lib/enpi'
import { BULAN_PANJANG, hariIni, persen, tanggal } from '@/lib/format'
import { periksaKualitasMeter } from '@/lib/kualitas-meter'
import { SIKAP_AUDIT } from '@/lib/ruang-mr'
import { BAGIAN_MRTI, DAFTAR_PERIKSA_MRTI, KELOMPOK_MRTI, TANYA_MRTI } from '@/lib/ruang-mrti'
import { penggunaSaya } from '@/lib/sesi'
import { AMBANG_RISIKO, siapAudit } from '@/lib/status'
import { DaftarPeriksa, LatihanMr } from '../ruang-mr/LatihanMr'
import { SimulasiAudit } from '../tanya-jawab/SimulasiAudit'

export const dynamic = 'force-dynamic'

const KUNCI = 'ruang-mrti'

export default async function RuangMrti() {
  const saya = await penggunaSaya()
  if (!saya || !boleh(saya.peran, 'ruangmrti.lihat')) notFound()

  const [dokumen, isu, peluang, { sasaran, aksi }, temuan, { meter, bacaan }, riwayat] = await Promise.all([
    ambilDokumen(), ambilIsu(), ambilPeluang(), ambilSasaran(), ambilTemuan(), ambilAsetMeter(), ambilRiwayatSimulasi(),
  ])
  const kini = hariIni()
  const cocok = (s: string | null | undefined) => !!s && BAGIAN_MRTI.pola.test(s)

  // Risiko & peluang
  const risiko = isu.filter((i) => i.jenis === 'Risiko')
  const risikoTinggi = risiko.filter((i) => i.skor >= AMBANG_RISIKO.tinggi)
  const tinggiTanpaTindakan = risikoTinggi.filter((i) => !i.tindakan?.trim())
  const tinggiTanpaResidual = risikoTinggi.filter((i) => i.skor_residual == null)
  const isuBagian = isu.filter((i) => cocok(i.bagian) || cocok(i.pic))

  // Sasaran bagian
  const sasaranBagian = sasaran.filter((s) => cocok(s.bagian) || cocok(s.pic))
  const aksiBagian = aksi.filter((a) => cocok(a.pic) || sasaranBagian.some((s) => s.id === a.sasaran_id))

  // Data meter
  const [th, bl] = [Number(kini.slice(0, 4)), Number(kini.slice(5, 7))]
  const lalu = bl === 1 ? { tahun: th - 1, bulan: 12 } : { tahun: th, bulan: bl - 1 }
  const terbaca = meter.filter((m) => bacaan.some((b) => b.meter_kode === m.kode && b.tahun === lalu.tahun && b.bulan === lalu.bulan && adaBacaan(b)))
  const kalibrasiLewat = meter.filter((m) => m.kalibrasi_berikutnya && m.kalibrasi_berikutnya < kini)
  const kualitas = meter.length ? periksaKualitasMeter(meter, bacaan, lalu, 24) : null
  const temuanData = kualitas ? kualitas.temuan.filter((t) => t.tingkat !== 'info' && t.jenis !== 'kosong') : []

  // Dokumen
  const dokKlausul = (awalan: string[]) => dokumen.filter((d) => awalan.some((a) => d.klausul_kode.startsWith(a)))
  const dokInti = dokKlausul(['4.1', '4.2', '6.1', '6.6', '7.5'])
  const dokBelum = dokInti.filter((d) => !siapAudit(d))
  const dokPic = dokumen.filter((d) => cocok(d.pic))

  // Temuan untuk bagian
  const temuanBagian = temuan.filter((t) => cocok(t.auditee) || cocok(t.pic))
  const temuanBagianBuka = temuanBagian.filter((t) => t.status !== 'Tertutup')

  const sebut = (xs: string[], maks = 3) => xs.slice(0, maks).join(', ') + (xs.length > maks ? `, +${xs.length - maks} lainnya` : '')

  const fakta: Record<string, string[]> = {
    umum: [
      sasaranBagian.length
        ? `${sasaranBagian.length} sasaran tercatat untuk bagian ini: ${sebut(sasaranBagian.map((s) => s.kode))}; ${aksiBagian.filter((a) => a.status === 'Selesai').length} dari ${aksiBagian.length} aksi selesai.`
        : 'Belum ada sasaran yang dicatat atas nama bagian ini di Formulir Objective & Target. Siapkan jawabannya.',
      dokPic.length ? `${dokPic.length} dokumen SMEn ber-PIC bagian ini; ${dokPic.filter(siapAudit).length} siap audit.` : 'Tidak ada dokumen SMEn yang PIC-nya tercatat bagian ini.',
    ],
    risiko: [
      `${risiko.length} risiko di register: ${risikoTinggi.length} tinggi/ekstrem (skor ≥ ${AMBANG_RISIKO.tinggi}), ${tinggiTanpaTindakan.length} di antaranya tanpa tindakan, ${tinggiTanpaResidual.length} belum dinilai residual.`,
      `${peluang.length} peluang peningkatan kinerja energi tercatat${isuBagian.length ? `; ${isuBagian.length} isu ber-PIC bagian ini` : ''}.`,
    ],
    data: [
      `${terbaca.length} dari ${meter.length} meter sudah punya bacaan ${BULAN_PANJANG[lalu.bulan - 1]} ${lalu.tahun}.`,
      temuanData.length ? `${temuanData.length} temuan kualitas data meter dalam 24 bulan terakhir, terbaru: ${temuanData.at(-1)!.teks}` : 'Tidak ada temuan kualitas data meter berat dalam 24 bulan terakhir.',
      kalibrasiLewat.length ? `${kalibrasiLewat.length} meter melewati jadwal kalibrasi: ${sebut(kalibrasiLewat.map((m) => m.kode))}.` : 'Tidak ada meter yang melewati jadwal kalibrasi.',
    ],
    dokumen: [
      `${dokumen.filter(siapAudit).length} dari ${dokumen.length} dokumen Final dengan berkas versi sah.`,
      dokBelum.length ? `Dokumen klausul 4.1, 4.2, 6.1, 6.6, 7.5 yang belum siap: ${sebut(dokBelum.map((d) => d.kode), 4)}.` : 'Semua dokumen klausul 4.1, 4.2, 6.1, 6.6, 7.5 sudah siap audit.',
    ],
    operasi: ['Perangkat TI tidak dipantau langsung di aplikasi. Siapkan data beban ruang server/AC/UPS dari tinjauan energi atau pengukuran.'],
    perbaikan: [
      temuanBagian.length
        ? `${temuanBagian.length} temuan audit untuk bagian ini, ${temuanBagianBuka.length} belum tertutup${temuanBagianBuka.length ? `: ${sebut(temuanBagianBuka.map((t) => t.nomor))}` : ''}.`
        : 'Belum ada temuan audit yang tercatat untuk bagian ini.',
    ],
    celah: ['Pertanyaan ini muncul dari rangkap peran personel bagian di SK, bukan dari data aplikasi.'],
  }

  return (
    <section>
      <SectionHead hero eyebrow={<>Ruang auditee · {BAGIAN_MRTI.nama} · per {tanggal(kini, 'panjang')}</>}
        judul={<>{TANYA_MRTI.length} pertanyaan auditor untuk <span className="ks-sorot">Manajemen Risiko & TI</span> sebagai auditee</>}>
        <p className="muted">
          {BAGIAN_MRTI.ringkas} Jawaban adalah respons yang diharapkan: cocokkan dengan kondisi aktual dan dokumen terkendali sebelum audit.
        </p>
      </SectionHead>

      <div className="mr-sk card">
        <div>
          <span className="eyebrow">Unit audit {BAGIAN_MRTI.unitAudit} · klausul 4.1, 4.2, 6.1, 6.6, 7.5, 8.1, 9.1, 10.1</span>
          <blockquote>Risiko yang terpantau dan data energi yang aman, valid, serta tersedia untuk analisis.</blockquote>
        </div>
        <dl>
          {BAGIAN_MRTI.peranSk.map((p) => <div key={p.jabatan}><dt>{p.jabatan}</dt><dd>{p.peran}</dd></div>)}
          <div><dt>Dasar</dt><dd>SK No. KINRA/SKPTS/47/2026, Lampiran I &amp; II</dd></div>
        </dl>
      </div>

      <SectionHead no="01" eyebrow="Angka hari ini · dari data aplikasi" judul="Kondisi yang akan dilihat auditor di bagian Anda" />
      <div className="tiles t3 mr-tiles">
        <Tile ikon={ShieldAlert} label="Risiko tinggi/ekstrem" nilai={risikoTinggi.length} meta={`${tinggiTanpaTindakan.length} tanpa tindakan · ${tinggiTanpaResidual.length} tanpa residual`} />
        <Tile ikon={Target} label="Sasaran bagian" nilai={sasaranBagian.length} meta={`${aksiBagian.filter((a) => a.status === 'Selesai').length}/${aksiBagian.length} aksi selesai`} />
        <Tile ikon={Gauge} label="Meter terbaca bulan lalu" nilai={`${terbaca.length}/${meter.length}`} meta={`${kalibrasiLewat.length} meter lewat kalibrasi`}
          progres={meter.length ? (terbaca.length / meter.length) * 100 : 0} />
        <Tile ikon={Database} label="Temuan kualitas data" nilai={temuanData.length} meta="24 bulan terakhir · selain bulan kosong" />
        <Tile ikon={FileCheck2} label="Dokumen klausul inti siap" nilai={persen(dokInti.length ? ((dokInti.length - dokBelum.length) / dokInti.length) * 100 : 0, 0)}
          meta={`${dokInti.length - dokBelum.length}/${dokInti.length} dokumen 4.1, 4.2, 6.1, 6.6, 7.5`} />
        <Tile ikon={SearchCheck} label="Temuan audit bagian" nilai={temuanBagianBuka.length} meta={`belum tertutup dari ${temuanBagian.length} temuan`} />
      </div>

      <SectionHead no="02" eyebrow="Bank soal auditee · per kelompok" judul="Latihan menjawab pertanyaan auditor">
        <p className="muted">Coba jawab dulu, lalu buka contoh jawaban. Tanda &ldquo;Sudah kuasai&rdquo;/&ldquo;Perlu latihan&rdquo; tersimpan di peramban ini saja, terpisah dari Ruang MR.</p>
      </SectionHead>
      <LatihanMr fungsi={KELOMPOK_MRTI} tanya={TANYA_MRTI} fakta={fakta} kunci={KUNCI} />

      <SectionHead no="03" eyebrow="Simulasi bersama KIRA · unit Manajemen Risiko & TI" judul="Diuji auditor tiruan, dinilai 0–3">
        <p className="muted">KIRA mengajukan pertanyaan dari materi audit unit Manajemen Risiko & TI dan dari celah nyata di data, menilai jawaban, lalu memprediksi temuan.</p>
      </SectionHead>
      <SimulasiAudit riwayat={riwayat.filter((r) => r.unit_no === BAGIAN_MRTI.unitAudit)} bolehSimpan={boleh(saya.peran, 'simulasi.simpan')} unitAwal={BAGIAN_MRTI.unitAudit} />

      <SectionHead no="04" eyebrow="Saat audit berlangsung" judul="Sikap auditee di depan auditor" />
      <div className="mr-sikap">
        {SIKAP_AUDIT.map((s, i) => (
          <div key={s.judul} className="card"><span className="mono">{String(i + 1).padStart(2, '0')}</span><b>{s.judul}</b><p className="muted small">{s.isi}</p></div>
        ))}
      </div>

      <SectionHead no="05" eyebrow="Daftar periksa bagian" judul="Sebelum hari audit, pastikan semua ini beres">
        <p className="muted">Centang tersimpan di peramban ini saja. Register risiko ada di <Link href="/register">Isu &amp; Peluang</Link>, kualitas data meter di <Link href="/aset">Aset &amp; Meter</Link>.</p>
      </SectionHead>
      <DaftarPeriksa butir={DAFTAR_PERIKSA_MRTI} kunci={KUNCI} />

      <p className="sumber">Sumber: materi audit internal SMEn KINRA 2026 unit 9, SK Direktur PT KINRA No. KINRA/SKPTS/47/2026, ISO 50001:2018. Bagian dikenali dari kolom bagian/PIC/auditee yang memuat &ldquo;Risiko&rdquo; atau &ldquo;TI&rdquo;.</p>
    </section>
  )
}
