import { SectionHead } from '@/components/SectionHead'
import { LANGKAH_TINDAK_LANJUT, SUMBER_TANYA_JAWAB, UNIT_AUDIT, URUTAN_PEMERIKSAAN } from '@/lib/tanya-jawab'
import { ambilRiwayatSimulasi } from '@/lib/data'
import { DaftarTanya } from './DaftarTanya'
import { SimulasiAudit } from './SimulasiAudit'
import { TabTanyaJawab } from './TabTanyaJawab'

export const dynamic = 'force-dynamic'

export default async function TanyaJawab() {
  const riwayat = await ambilRiwayatSimulasi()
  const jumlah = UNIT_AUDIT.reduce((n, u) => n + u.tanya.length, 0)
  return (
    <section>
      <SectionHead eyebrow="Audit internal · ISO 50001:2018" judul={`Tanya jawab audit: ${UNIT_AUDIT.length} unit, ${jumlah} pertanyaan`}>
        <p className="muted">
          Contoh pertanyaan auditor beserta jawaban, bukti objektif, dan indikator untuk persiapan auditor internal dan auditee.
          Jawaban adalah respons yang diharapkan, bukan pernyataan bahwa KINRA sudah memenuhi persyaratan: sesuaikan dengan kondisi aktual dan dokumen terkendali.
        </p>
      </SectionHead>

      <div className="tj-info">
        <div className="card">
          <span className="eyebrow">Kriteria</span>
          <p>ISO 50001:2018, fokus pada area PT KINRA. Audit internal adalah tahap <b>Check</b> dalam siklus PDCA.</p>
        </div>
        <div className="card">
          <span className="eyebrow">Urutan pemeriksaan</span>
          <p>{URUTAN_PEMERIKSAAN}</p>
        </div>
        <div className="card">
          <span className="eyebrow">Cara latihan</span>
          <p>Bank soal: jawaban disembunyikan, coba jawab dulu lalu cocokkan. Simulasi: KIRA berperan sebagai auditor, menilai jawaban Anda, dan memprediksi temuan dari celah nyata di data.</p>
        </div>
      </div>

      <TabTanyaJawab bank={<DaftarTanya />} simulasi={<SimulasiAudit riwayat={riwayat} />} />

      <div className="card tj-penutup">
        <span className="eyebrow">Check menuju Act · tindak lanjut hasil audit</span>
        <ol>
          {LANGKAH_TINDAK_LANJUT.map((l, i) => (
            <li key={l.judul}><span className="mono">{String(i + 1).padStart(2, '0')}</span><b>{l.judul}</b><p className="muted small">{l.isi}</p></li>
          ))}
        </ol>
        <p className="muted small">Gunakan menu Temuan Audit untuk menjaga ketertelusuran penanggung jawab, tenggat, bukti pelaksanaan, hasil verifikasi, dan keputusan penutupan.</p>
        <p className="muted small">Sumber: {SUMBER_TANYA_JAWAB}. Rujukan klausul 8.4 pada materi sumber dikoreksi menjadi 8.3 (pengadaan) sesuai ISO 50001:2018.</p>
      </div>
    </section>
  )
}
