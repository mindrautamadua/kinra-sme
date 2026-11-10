import Link from 'next/link'
import { Chip } from '@/components/Chip'
import { ceritakan, periodeBulan, type Dekomposisi, type JenisKomponen } from '@/lib/dekomposisi'
import { BULAN, energiListrik } from '@/lib/format'
import { rupiahRingkas } from '@/lib/konversi'

const KELAS: Record<JenisKomponen, string> = { kondisi: 'kondisi', kinerja: 'kinerja', absolut: 'absolut', struktur: 'struktur', lain: 'lain' }
const tanda = (v: number) => `${v >= 0 ? '+' : '−'}${energiListrik(Math.abs(v))}`

/**
 * Jembatan perubahan energi: setiap baris adalah satu penyebab, batang bergerak dari posisi kumulatif sebelumnya.
 * Sumbu = selisih terhadap tahun pembanding (mulai 0), bukan total, agar batang kecil tetap terbaca tanpa memotong sumbu.
 */
export function Waterfall({ d, pasangan, tarif }: { d: Dekomposisi; pasangan: { a: number; b: number }[]; tarif: number }) {
  const delta = d.totalB - d.totalA
  let kum = 0
  const baris = d.komponen.map((k) => {
    const dari = kum
    kum += k.nilai
    return { ...k, dari, ke: kum }
  })
  const titik = [0, delta, ...baris.flatMap((b) => [b.dari, b.ke])]
  const min = Math.min(...titik), maks = Math.max(...titik)
  const rentang = maks - min || 1
  const pos = (v: number) => ((v - min) / rentang) * 100
  const nol = pos(0)

  return (
    <div className="card wf">
      <div className="row" style={{ marginBottom: 12, alignItems: 'flex-start' }}>
        <div>
          <h3>Jembatan perubahan listrik KINRA, {periodeBulan(d.bulan)} {d.tahunA} → {d.tahunB}</h3>
          <p className="muted small">Lingkup {d.meterLingkup.length} meter aset KINRA · {d.bulan.length} bulan dibandingkan · batang ke kanan = menambah konsumsi, ke kiri = mengurangi</p>
        </div>
        {pasangan.length > 1 && (
          <nav className="seg en-tahun" aria-label="Tahun yang dibandingkan">
            {pasangan.map((p) => (
              <Link key={p.b} href={`/kinerja?banding=${p.a}-${p.b}#mengapa`} aria-current={p.a === d.tahunA && p.b === d.tahunB ? 'true' : undefined}>{p.a}→{p.b}</Link>
            ))}
          </nav>
        )}
      </div>

      {!d.bulan.length ? <p className="pesan">Belum ada bulan dengan data lengkap di kedua tahun.</p> : (
        <>
          <p className="wf-cerita">{ceritakan(d, energiListrik)}</p>

          <div className="wf-total">
            <div><span>{d.tahunA}</span><b className="tnum">{energiListrik(d.totalA)}</b></div>
            <div><span>{d.tahunB}</span><b className="tnum">{energiListrik(d.totalB)}</b></div>
            <div><span>Perubahan</span><b className={`tnum ${delta > 0 ? 'txt-bad' : 'txt-good'}`}>{tanda(delta)} <small>({delta >= 0 ? '+' : '−'}{Math.abs((delta / d.totalA) * 100).toFixed(1).replace('.', ',')}%)</small></b></div>
          </div>

          <div className="wf-grafik" role="table" aria-label="Rincian penyebab perubahan konsumsi listrik">
            {baris.map((b, i) => {
              const kiri = Math.min(pos(b.dari), pos(b.ke))
              const lebar = Math.max(Math.abs(pos(b.ke) - pos(b.dari)), 0.4)
              const arah = b.jenis === 'kinerja' ? (b.nilai <= 0 ? 'hemat' : 'boros') : ''
              return (
                <div key={b.label} className="wf-baris" role="row" style={{ '--i': i } as React.CSSProperties}>
                  <div className="wf-label" role="cell">
                    <b>{b.label}</b>
                    <span className="muted small">{b.ket}</span>
                  </div>
                  <div className="wf-plot" role="cell" aria-hidden="true">
                    <u style={{ left: `${nol}%` }} />
                    <i className={`${KELAS[b.jenis]} ${arah}`} style={{ left: `${kiri}%`, width: `${lebar}%` }} title={`${b.label}: ${tanda(b.nilai)}`} />
                    {i > 0 && <s style={{ left: `${pos(b.dari)}%` }} />}
                  </div>
                  <div className="wf-nilai tnum" role="cell">
                    <b>{tanda(b.nilai)}</b>
                    {b.jenis === 'kinerja' && <Chip kode={b.nilai <= 0 ? 'good' : 'crit'} label={`${b.nilai <= 0 ? 'Hemat' : 'Boros'} ${rupiahRingkas(Math.abs(b.nilai) * tarif)}`} />}
                    {b.jenis === 'kondisi' && <Chip kode="info" label="Beban operasi" />}
                    {b.jenis === 'absolut' && <Chip kode="warn" label="Belum dinilai" />}
                  </div>
                </div>
              )
            })}
            <div className="wf-baris wf-akhir" role="row">
              <div className="wf-label" role="cell"><b>Perubahan total</b><span className="muted small">Jumlah semua penyebab di atas = selisih meter {d.tahunB} − {d.tahunA}</span></div>
              <div className="wf-plot" role="cell" aria-hidden="true">
                <u style={{ left: `${nol}%` }} />
                <i className="total" style={{ left: `${Math.min(nol, pos(delta))}%`, width: `${Math.max(Math.abs(pos(delta) - nol), 0.4)}%` }} />
              </div>
              <div className="wf-nilai tnum" role="cell"><b>{tanda(delta)}</b></div>
            </div>
          </div>

          <div className="wf-legenda muted small" aria-hidden="true">
            <span><i className="kondisi" />Kondisi operasi (wajar)</span>
            <span><i className="kinerja hemat" />Kinerja hemat</span>
            <span><i className="kinerja boros" />Kinerja boros</span>
            <span><i className="absolut" />Belum ternormalisasi</span>
            <span><i className="lain" />Lain-lain / meter baru</span>
          </div>

          {d.segmen.some((s) => s.ternormalisasi) && (
            <div className="wf-tabel-wrap"><table className="wf-tabel small">
              <thead><tr><th>SEU</th><th>EnPI</th><th className="n">Variabel {d.tahunA}</th><th className="n">Variabel {d.tahunB}</th><th className="n">Intensitas {d.tahunA}</th><th className="n">Intensitas {d.tahunB}</th></tr></thead>
              <tbody>
                {d.segmen.filter((s) => s.ternormalisasi && s.variabelA && s.variabelB).map((s) => {
                  const v = s.hasil.variabel[0]
                  const sat = `kWh/${v?.satuan ?? ''}`
                  return (
                    <tr key={s.seu.kode}>
                      <td>{s.seu.kode}</td><td>{s.hasil.enpi.kode}</td>
                      <td className="n">{Math.round(s.variabelA!).toLocaleString('id-ID')} {v?.satuan}</td>
                      <td className="n">{Math.round(s.variabelB!).toLocaleString('id-ID')} {v?.satuan}</td>
                      <td className="n">{(s.aktualA / s.variabelA!).toLocaleString('id-ID', { maximumFractionDigits: 3 })} {sat}</td>
                      <td className="n">{(s.aktualB / s.variabelB!).toLocaleString('id-ID', { maximumFractionDigits: 3 })} {sat}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table></div>
          )}
        </>
      )}

      {(d.keluar.length > 0 || d.peringatan.length > 0) && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {d.keluar.map((k) => <p key={k.bulan} className="muted small">• {BULAN[k.bulan - 1]} tidak dibandingkan: {k.alasan}.</p>)}
          {d.peringatan.map((p) => <p key={p} className="muted small">• {p}</p>)}
        </div>
      )}
    </div>
  )
}
