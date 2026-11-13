import { ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { TombolCetak } from '@/components/TombolCetak'
import { AKSES, type Aksi, boleh, DAFTAR_PERAN, HALAMAN_AUDITOR, KET_PERAN, LABEL_AKSI, LABEL_PERAN, type Peran } from '@/lib/akses'
import { hariIni, tanggal } from '@/lib/format'
import { penggunaSaya } from '@/lib/sesi'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Matriks Hak Akses Peran SMEn' }

const ORG = 'PT Kawasan Industri Nusantara (KINRA)'
const LABEL_HALAMAN: Record<(typeof HALAMAN_AUDITOR)[number], string> = { '/kesiapan': 'Kesiapan Audit', '/dokumen': 'detail dokumen & evidence', '/komitmen': 'Komitmen & Kebijakan' }

/** Lembar cetak A4 matriks hak akses per peran. Dibaca langsung dari lib/akses.ts, jadi selalu sesuai aturan yang berlaku. */
export default async function CetakHakAkses() {
  const saya = await penggunaSaya()
  if (!saya || !boleh(saya.peran, 'pengguna.kelola')) notFound()
  const kini = hariIni()
  const nomor = `KINRA/SMEn/HAK/${kini.replaceAll('-', '')}`
  const halamanAuditor = HALAMAN_AUDITOR.map((h) => LABEL_HALAMAN[h]).join(' · ')

  return (
    <section className="cetak">
      <div className="toolbar tanpa-cetak">
        <Link href="/pengguna" className="btn kecil"><ArrowLeft aria-hidden="true" /> Kembali ke Pengguna</Link>
        <span className="muted small">Lembar A4 tegak. Di dialog cetak pilih “Simpan sebagai PDF”, aktifkan “Grafik latar belakang”, dan matikan “Header dan footer”.</span>
        <span style={{ flex: 1 }} />
        <TombolCetak />
      </div>

      <article className="lp lp-akses">
        <div className="lp-sampul-atas">
          <span className="lp-logo"><Image src="/logo-kinra.png" alt="KINRA Sei Mangkei" width={900} height={325} priority /></span>
          <span className="lp-klasifikasi">Terbatas · Internal</span>
        </div>
        <div style={{ margin: '7mm 0 2mm' }}>
          <span className="lp-eyebrow">ISO 50001:2018 · Aplikasi SMEn KINRA</span>
          <h1 className="lp-akses-judul">Matriks Hak Akses Peran Pengguna</h1>
          <p className="lp-akses-meta">{ORG} · Nomor {nomor} · Per {tanggal(kini, 'panjang')}</p>
        </div>

        <section className="lp-bagian">
          <header className="lp-bagian-kepala"><span className="lp-no">1</span><h2>Peran pengguna</h2></header>
          <table className="lp-tbl">
            <thead><tr><th scope="col" style={{ width: '18%' }}>Peran</th><th scope="col">Uraian</th><th scope="col" style={{ width: '26%' }}>Halaman yang dapat dibuka</th></tr></thead>
            <tbody>
              {DAFTAR_PERAN.map((p) => (
                <tr key={p}>
                  <th scope="row">{LABEL_PERAN[p]}</th>
                  <td>{KET_PERAN[p]}</td>
                  <td>{p === 'auditor' ? halamanAuditor : p === 'admin' ? 'Semua halaman, termasuk Pengguna' : 'Semua halaman kecuali Pengguna'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="lp-bagian">
          <header className="lp-bagian-kepala"><span className="lp-no">2</span><h2>Matriks tindakan per peran</h2></header>
          <table className="lp-tbl lp-matriks-akses">
            <thead>
              <tr><th scope="col">Tindakan</th>{DAFTAR_PERAN.map((p) => <th key={p} scope="col">{LABEL_PERAN[p]}</th>)}</tr>
            </thead>
            <tbody>
              {(Object.keys(AKSES) as Aksi[]).map((a) => (
                <tr key={a}>
                  <td>{LABEL_AKSI[a]}</td>
                  {DAFTAR_PERAN.map((p) => (AKSES[a] as Peran[]).includes(p)
                    ? <td key={p} className="ya" aria-label="boleh">✓</td>
                    : <td key={p} className="tidak" aria-label="tidak">–</td>)}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="lp-distribusi">
            ✓ = boleh, – = tidak. Hak akses ditegakkan di database (RLS & trigger), bukan hanya di tampilan.
            Pembatasan halaman untuk peran Auditor ditegakkan di server aplikasi.
          </p>
        </section>

        <section className="lp-bagian">
          <header className="lp-bagian-kepala"><span className="lp-no">3</span><h2>Pengesahan</h2></header>
          <table className="lp-tbl lp-pengesahan">
            <thead><tr><th scope="col">Peran</th><th scope="col">Nama</th><th scope="col">Jabatan</th><th scope="col">Tanda tangan</th><th scope="col">Tanggal</th></tr></thead>
            <tbody>
              {['Disusun', 'Ditinjau', 'Disetujui'].map((p) => <tr key={p}><th scope="row">{p}</th><td /><td /><td /><td /></tr>)}
            </tbody>
          </table>
        </section>
      </article>
    </section>
  )
}
