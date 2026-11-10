import { SectionHead } from '@/components/SectionHead'
import { ambilDaftarBerkas, ambilDokumen, ambilKlausul, ambilTemuan } from '@/lib/data'
import { DEPENDENSI } from '@/lib/dependensi'
import { hariIni, tanggal } from '@/lib/format'
import { adaBukti, siapAudit } from '@/lib/status'
import { RuangAuditor, type KlausulAuditor } from './RuangAuditor'

export const dynamic = 'force-dynamic'

export default async function Auditor() {
  const [dokumen, klausul, berkas, temuan] = await Promise.all([ambilDokumen(), ambilKlausul(), ambilDaftarBerkas(), ambilTemuan()])
  const kodeAda = new Set(dokumen.map((d) => d.kode))
  const masukan = (kode: string) => DEPENDENSI.filter(([a, b]) => b === kode && kodeAda.has(a)).map(([a]) => a)

  const data: KlausulAuditor[] = klausul.map((k) => {
    const ds = dokumen
      .filter((d) => d.klausul_kode === k.kode)
      .sort((a, b) => Number(!!b.wajib_iso) - Number(!!a.wajib_iso) || a.kode.localeCompare(b.kode))
      .map((d) => ({
        id: d.id, kode: d.kode, nama: d.nama, kelompok: d.kelompok, nomor: d.nomor_dokumen, pic: d.pic, keterangan: d.keterangan,
        wajib: !!d.wajib_iso, bukti: adaBukti(d), siap: siapAudit(d), masukan: masukan(d.kode),
        berkas: berkas.filter((b) => b.dokumen_id === d.id).sort((a, b) => Number(!!b.sah) - Number(!!a.sah)).map((b) => ({ id: b.id, nama: b.nama_file, mime: b.mime, ukuran: b.ukuran, at: b.diunggah_at, oleh: b.diunggah_oleh, sah: !!b.sah })),
      }))
    const tm = temuan.filter((t) => t.klausul_kode === k.kode && t.status !== 'Tertutup')
    return { kode: k.kode, judul: k.judul, induk: k.induk, dokumen: ds, temuanBuka: tm.map((t) => ({ nomor: t.nomor, kategori: t.kategori, uraian: t.uraian })) }
  }).filter((k) => k.dokumen.length > 0)

  const semua = data.flatMap((k) => k.dokumen)
  const wajib = semua.filter((d) => d.wajib)

  return (
    <section>
      <SectionHead hero eyebrow={`Ruang auditor · per ${tanggal(hariIni(), 'panjang')}`}
        judul={<>{wajib.filter((d) => d.siap).length} dari {wajib.length} informasi terdokumentasi wajib sudah Final dengan berkas sah</>}>
        <p className="muted">
          Halaman hanya-baca untuk auditor internal dan auditor lembaga sertifikasi. Pilih klausul di kiri, lalu buka berkas evidence langsung di aplikasi.
          Dokumen wajib ISO 50001:2018 ditampilkan paling atas. Total {semua.length} dokumen: {semua.filter((d) => d.siap).length} Final dengan berkas sah, {semua.filter((d) => d.bukti && !d.siap).length} masih draf/belum sah.
        </p>
      </SectionHead>
      <RuangAuditor klausul={data} />
    </section>
  )
}
