import { SectionHead } from '@/components/SectionHead'
import { ambilKegiatan } from '@/lib/data'
import { BULAN, hariIni, tanggal } from '@/lib/format'
import { keadaan, KEADAAN } from '@/lib/kegiatan'
import { DaftarKegiatan } from './DaftarKegiatan'

export const dynamic = 'force-dynamic'

const hari = (s: string) => Math.round(new Date(`${s}T00:00:00Z`).getTime() / 86_400_000)

export default async function Timeline() {
  const kegiatan = await ambilKegiatan()
  const kini = hariIni()
  const adaStatus = kegiatan.some((k) => k.status !== undefined)
  const semua = kegiatan.flatMap((k) => k.sesi.map((s) => s.tanggal)).sort()
  const awal = semua[0] ?? kini
  const akhir = semua.at(-1) ?? kini
  const a = hari(awal), rentang = Math.max(1, hari(akhir) + 1 - a)
  const pos = (s: string) => ((hari(s) - a) / rentang) * 100
  const bulanSkala = [...new Set(semua.map((s) => s.slice(0, 7)))]

  const hitung = (x: string) => kegiatan.filter((k) => keadaan(k, kini) === x).length
  const selesai = hitung('selesai')
  const pctSelesai = kegiatan.length ? (selesai / kegiatan.length) * 100 : 0

  return (
    <>
      <section>
        <SectionHead eyebrow="Timeline pendampingan ISO 50001 Rev.3"
          judul={`${selesai} dari ${kegiatan.length} kegiatan selesai, ${hitung('belum')} belum dikerjakan`}>
          <p className="muted">
            {hitung('berjalan')} sedang berjalan{hitung('konfirmasi') > 0 && <>, <b className="txt-bad">{hitung('konfirmasi')} perlu konfirmasi</b> (tanggal sudah lewat tetapi belum ditandai selesai)</>}.
            Sertifikasi TÜV Stage 2 pada {tanggal('2026-12-10', 'panjang')}.
          </p>
        </SectionHead>

        <div className="card">
          <div className="row">
            <div><h3>Progres kegiatan</h3><p className="muted small">Berdasarkan status yang ditandai Tim Inti</p></div>
            <div className="mini-stats">
              {(['selesai', 'berjalan', 'konfirmasi', 'belum'] as const).map((s) => (
                <div key={s}><span>{KEADAAN[s].label}</span><b className="tnum">{hitung(s)}</b></div>
              ))}
            </div>
          </div>
          <div className="stackbar" role="img" aria-label={`${selesai} selesai, ${hitung('berjalan')} berjalan, ${hitung('konfirmasi')} perlu konfirmasi, ${hitung('belum')} belum dikerjakan`}>
            {(['selesai', 'berjalan', 'konfirmasi', 'belum'] as const).map((s) => hitung(s) > 0 && (
              <span key={s} className={`bg-${KEADAAN[s].chip}`} style={{ width: `${(hitung(s) / kegiatan.length) * 100}%` }} />
            ))}
          </div>
          <div className="legend">
            {(['selesai', 'berjalan', 'konfirmasi', 'belum'] as const).map((s) => <span key={s}><i className={`bg-${KEADAAN[s].chip}`} />{KEADAAN[s].label}</span>)}
            <span style={{ marginLeft: 'auto' }} className="tnum"><b>{Math.round(pctSelesai)}%</b>&nbsp;selesai</span>
          </div>
        </div>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="table-wrap">
            <div className="gantt" role="img" aria-label={`Gantt ${kegiatan.length} kegiatan dari ${tanggal(awal)} sampai ${tanggal(akhir)}`}>
              <div className="g-row"><span /><div className="g-skala">{bulanSkala.map((b) => <span key={b}>{BULAN[Number(b.slice(5)) - 1]} {b.slice(0, 4)}</span>)}</div></div>
              {kegiatan.map((k, ki) => {
                const st = keadaan(k, kini)
                return (
                  <div key={k.no} className={`g-row g-${st}`}>
                    <span className="g-nama">
                      <span className="mono muted small">{String(k.no).padStart(2, '0')}</span><span>{k.nama}</span>
                    </span>
                    <div className="g-lajur">
                      {k.sesi.map((s, i) => <b key={i} className={`bg-${KEADAAN[st].chip}`} style={{ left: `${pos(s.tanggal)}%`, width: `${100 / rentang}%`, '--i': ki } as React.CSSProperties} title={`${tanggal(s.tanggal)} · ${s.jam}`} />)}
                      {kini >= awal && kini <= akhir && <span className="g-kini" style={{ left: `${pos(kini)}%` }} />}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <p className="sumber">Warna batang mengikuti status: hijau selesai, biru berjalan, merah perlu konfirmasi, abu-abu belum dikerjakan. Garis tosca = hari ini. Sumber: Timeline Pendampingan SMEn Rev.3 (19 Okt 2026).</p>
        </div>
      </section>

      <section>
        <SectionHead no="01" eyebrow="Daftar kegiatan" judul="Tandai kegiatan yang sudah dikerjakan">
          <p className="muted">Klik <b>Tandai selesai</b> setelah kegiatan benar-benar terlaksana. Tanggal yang sudah lewat tidak otomatis dianggap selesai.</p>
        </SectionHead>
        {!adaStatus && (
          <p className="pesan" style={{ marginBottom: 16 }}>
            Status di bawah masih diperkirakan dari tanggal. Jalankan <span className="mono">supabase/migrations/0005_status_kegiatan.sql</span> di SQL Editor agar status bisa ditandai dan tersimpan.
          </p>
        )}
        <DaftarKegiatan kegiatan={kegiatan} kini={kini} bisaUbah={adaStatus} />
      </section>
    </>
  )
}
