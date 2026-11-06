import { Check, Minus, X } from 'lucide-react'

export type BarisKesiapan = { kode: string; nama: string; porsi: number; cek: { label: string; ok: boolean | null; ket: string }[] }

/** Kartu skor kesiapan per SEU: daftar cek yang biasa ditanyakan auditor untuk setiap SEU. */
export function KesiapanSeu({ baris }: { baris: BarisKesiapan[] }) {
  if (!baris.length) return null
  const kolom = baris[0].cek.map((c) => c.label)
  return (
    <div className="card">
      <div className="table-wrap">
        <table className="tbl tk-tabel">
          <thead><tr><th>SEU</th>{kolom.map((k) => <th key={k} className="tk-kol">{k}</th>)}<th className="num">Kesiapan</th></tr></thead>
          <tbody>
            {baris.map((b) => {
              const dinilai = b.cek.filter((c) => c.ok !== null)
              const skor = dinilai.length ? Math.round((dinilai.filter((c) => c.ok).length / dinilai.length) * 100) : 0
              return (
                <tr key={b.kode}>
                  <td><b>{b.kode}</b><span className="upd">{b.nama} · {b.porsi.toFixed(0)}% energi</span></td>
                  {b.cek.map((c) => (
                    <td key={c.label} className="tk-sel" title={c.ket}>
                      <span className={`tk-ikon ${c.ok === null ? 'na' : c.ok ? 'ok' : 'belum'}`}>
                        {c.ok === null ? <Minus aria-hidden="true" /> : c.ok ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}
                      </span>
                      <span className="sr-only">{c.label}: {c.ok === null ? 'belum berlaku' : c.ok ? 'terpenuhi' : 'belum'}. {c.ket}</span>
                    </td>
                  ))}
                  <td className="num">
                    <div className="tk-skor"><b className="tnum">{skor}%</b>
                      <span className="tk-bar"><i style={{ width: `${skor}%` }} className={skor >= 80 ? 'ok' : skor >= 50 ? 'sedang' : 'rendah'} /></span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="sumber">Arahkan kursor ke tiap sel untuk keterangannya. Tanda — berarti belum berlaku, misalnya EnPI belum punya data karena baseline menunggu bacaan meter; tidak dihitung dalam skor.</p>
    </div>
  )
}
