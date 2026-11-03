import { nilaiRumus } from '@/lib/formulir/isi'
import type { IsiFormulir, Templat } from '@/lib/formulir/tipe'
import { tanggal } from '@/lib/format'

/** Tampilan baca formulir (untuk cetak / PDF dan isian yang terkunci). */
export function LembarFormulir({ t, isi, persetujuan }: {
  t: Templat
  isi: IsiFormulir
  persetujuan?: { diajukan?: string | null; disetujui?: string | null }
}) {
  return (
    <article className="lembar">
      <header className="lembar-kop">
        <div className="lembar-judul">
          <span className="eyebrow">PT Kawasan Industri Nusantara (KINRA) · ISO 50001:2018</span>
          <h1>{t.judul}</h1>
          {t.subjudul && <p className="muted">{t.subjudul}</p>}
        </div>
        <dl className="lembar-kepala">
          {t.kepala.map((k) => (
            <div key={k.label}><dt>{k.label}</dt><dd>{isi.kepala[k.label] || '–'}</dd></div>
          ))}
        </dl>
      </header>

      {t.blok.map((b, i) => {
        if (b.jenis === 'judul') return <h2 key={i} className="lembar-h">{b.teks}</h2>
        if (b.jenis === 'teks') return isi.teks[b.id] ? <p key={b.id} className="lembar-p">{isi.teks[b.id]}</p> : null
        if (b.jenis === 'cek') return <p key={b.id} className="lembar-p"><span aria-hidden="true">{isi.teks[b.id] ? '☑' : '☐'}</span> {b.teks}</p>
        if (b.jenis === 'isian') return (
          <div key={b.id} className="lembar-isian"><span>{b.label}</span><p>{isi.teks[b.id] || '–'}</p></div>
        )
        const rows = isi.tabel[b.id] ?? []
        return (
          <table key={b.id} className="lembar-tbl">
            <thead><tr>{b.kolom.map((k, j) => <th key={j} scope="col">{k.label}</th>)}</tr></thead>
            <tbody>
              {rows.length === 0 && <tr><td colSpan={b.kolom.length} className="muted">Belum ada baris.</td></tr>}
              {rows.map((r, ri) => (
                <tr key={ri}>
                  {b.kolom.map((k, j) => (
                    <td key={j} className={k.jenis === 'cek' || k.jenis === 'angka' || k.jenis === 'rumus' ? 'tengah' : undefined}>
                      {k.jenis === 'cek' ? (r[j] ? '✓' : '') : k.jenis === 'rumus' ? nilaiRumus(k, r) : r[j]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )
      })}

      <footer className="lembar-ttd" style={{ '--n': t.ttd.length } as React.CSSProperties}>
        {t.ttd.map((x, i) => (
          <div key={i}>
            <span>{x.peran}</span>
            <b>{isi.ttd[i]?.nama || ' '}</b>
            <span className="muted">{x.jabatan}</span>
            <span className="muted small">{isi.ttd[i]?.tanggal ? tanggal(isi.ttd[i].tanggal, 'panjang') : 'Tanggal: ……………'}</span>
          </div>
        ))}
      </footer>
      {persetujuan && (persetujuan.diajukan || persetujuan.disetujui) && (
        <p className="lembar-jejak muted small">
          {persetujuan.diajukan && <>Diajukan: {persetujuan.diajukan}. </>}
          {persetujuan.disetujui && <>Disetujui di aplikasi: {persetujuan.disetujui}.</>}
        </p>
      )}
    </article>
  )
}
