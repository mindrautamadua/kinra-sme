import { SectionHead } from '@/components/SectionHead'
import { ambilDokumen, ambilKlausul } from '@/lib/data'
import { KODE_GRUP_75, masukGrup75 } from '@/lib/dependensi'
import { adaBukti } from '@/lib/status'
import { DiagramDependensi, type NodeDok } from './DiagramDependensi'

export const dynamic = 'force-dynamic'

export default async function Dependensi() {
  const [dokumen, klausul] = await Promise.all([ambilDokumen(), ambilKlausul()])
  const induk = Object.fromEntries(klausul.map((k) => [k.kode, k.induk]))

  const nodes: NodeDok[] = []
  const grup = dokumen.filter((d) => masukGrup75(d.kode))
  for (const d of dokumen) {
    if (masukGrup75(d.kode)) continue
    nodes.push({
      kode: d.kode, id: d.id, nama: d.nama, klausul: d.klausul_kode, kolom: d.klausul_kode === 'P' ? 'P' : (induk[d.klausul_kode] ?? d.klausul_kode.split('.')[0]),
      kelompok: d.kelompok, wajib: !!d.wajib_iso, bukti: adaBukti(d), pic: d.pic,
    })
  }
  if (grup.length) {
    nodes.push({
      kode: KODE_GRUP_75, id: null, nama: `${grup.length} formulir pengendalian dokumen (SOP 011/012)`, klausul: '7.5', kolom: '7',
      kelompok: 'formulir', wajib: false, bukti: grup.every(adaBukti), pic: null, anggota: grup.map((d) => ({ kode: d.kode, bukti: adaBukti(d) })),
    })
  }

  return (
    <section>
      <SectionHead hero eyebrow="Kesiapan audit ISO 50001:2018" judul="Peta dependensi evidence">
        <p className="muted">
          Setiap kotak adalah satu dokumen di lembar Kesiapan Audit; garis menunjukkan dokumen yang menjadi masukan bagi dokumen lain.
          Klik dokumen untuk melihat apa yang dibutuhkannya dan apa yang bergantung padanya. Titik di kanan kotak menunjukkan apakah evidence sudah diunggah.
        </p>
      </SectionHead>
      <DiagramDependensi nodes={nodes} judulKlausul={Object.fromEntries(klausul.map((k) => [k.kode, k.judul]))} urutanKlausul={klausul.map((k) => k.kode)} />
      <p className="sumber" style={{ marginTop: 16 }}>
        Hubungan antardokumen disusun dari logika persyaratan ISO 50001:2018 (Plan–Do–Check–Act) dan perlu ditinjau bersama konsultan.
        Dokumen baru di lembar Kesiapan Audit otomatis muncul di diagram, tetapi belum punya garis sampai hubungannya ditambahkan di <span className="mono">lib/dependensi.ts</span>.
      </p>
    </section>
  )
}
