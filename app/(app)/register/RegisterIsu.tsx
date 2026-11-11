'use client'

import { Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { hapusIsu, simpanIsu } from '@/app/actions'
import { Chip } from '@/components/Chip'
import { useBoleh } from '@/components/Peran'
import { AMBANG_RISIKO, tingkatRisiko } from '@/lib/status'
import type { Isu } from '@/lib/types'

export function RegisterIsu({ isu }: { isu: Isu[] }) {
  const router = useRouter()
  const bisa = useBoleh()
  const dlg = useRef<HTMLDialogElement>(null)
  const [edit, setEdit] = useState<Isu | null>(null)
  const [filter, setFilter] = useState<'' | 'Risiko' | 'Peluang'>('')
  const [status, setStatus] = useState<'' | 'tanpa-tindakan' | 'belum-evaluasi'>('')
  const [cari, setCari] = useState('')
  const [sel, setSel] = useState<[number, number] | null>(null)
  const [sorot, setSorot] = useState<number | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [menunggu, mulai] = useTransition()

  // Label ringkas: R1.. untuk risiko (skor tertinggi dulu), O1.. untuk peluang
  const label = new Map<number, string>()
  ;[...isu].filter((i) => i.jenis === 'Risiko').sort((a, b) => b.skor - a.skor || a.id - b.id).forEach((i, n) => label.set(i.id, `R${n + 1}`))
  ;[...isu].filter((i) => i.jenis === 'Peluang').sort((a, b) => b.skor - a.skor || a.id - b.id).forEach((i, n) => label.set(i.id, `O${n + 1}`))

  const risiko = isu.filter((i) => i.jenis === 'Risiko')
  const diPeta = isu.filter((i) => !filter || i.jenis === filter)
  const q = cari.trim().toLowerCase()
  const tampil = isu
    .filter((i) => (!filter || i.jenis === filter)
      && (!sel || (i.dampak === sel[0] && i.kemungkinan === sel[1]))
      && (status !== 'tanpa-tindakan' || !i.tindakan)
      && (status !== 'belum-evaluasi' || !i.evaluasi)
      && (!q || [i.uraian, i.proses, i.bagian, i.tindakan, i.pic, i.asal].some((v) => v?.toLowerCase().includes(q))))
    .sort((a, b) => b.skor - a.skor)
  const prioritas = [...risiko].sort((a, b) => b.skor - a.skor).slice(0, 5)
  const pct = (n: number) => (isu.length ? (n / isu.length) * 100 : 0)
  const kelengkapan = [
    { label: 'Punya tindakan', n: isu.filter((i) => i.tindakan).length },
    { label: 'Efektivitas dievaluasi', n: isu.filter((i) => i.evaluasi).length },
    { label: 'Punya PIC', n: isu.filter((i) => i.pic).length },
  ]
  // Catatan analis: pola yang biasanya ditanyakan auditor
  const catatan: { kode: 'crit' | 'warn' | 'info'; teks: string }[] = []
  const pola = new Map<string, number>()
  for (const i of risiko) pola.set(`${i.dampak}×${i.kemungkinan}`, (pola.get(`${i.dampak}×${i.kemungkinan}`) ?? 0) + 1)
  const [polaUtama, nPola] = [...pola.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['', 0]
  if (risiko.length >= 5 && nPola / risiko.length >= 0.6) catatan.push({ kode: 'crit', teks: `${nPola} dari ${risiko.length} risiko dinilai sama (${polaUtama}). Penilaian yang seragam menandakan risiko belum dinilai satu per satu; auditor dapat menanyakan dasar penilaiannya. Nilai ulang dampak dan kemungkinan bersama pemilik risiko.` })
  const tanpaTindakan = isu.filter((i) => !i.tindakan).length
  if (tanpaTindakan) catatan.push({ kode: 'warn', teks: `${tanpaTindakan} isu belum punya tindakan. Klausul 6.1 meminta tindakan untuk menangani risiko dan peluang, terintegrasi ke proses SMEn.` })
  const tanpaEvaluasi = isu.filter((i) => i.tindakan && !i.evaluasi).length
  if (tanpaEvaluasi) catatan.push({ kode: 'warn', teks: `${tanpaEvaluasi} isu sudah punya tindakan tetapi belum ada cara mengevaluasi efektivitasnya.` })
  const eksternal = isu.filter((i) => i.asal === 'Eksternal').length
  if (isu.length && eksternal / isu.length < 0.25) catatan.push({ kode: 'info', teks: `Hanya ${eksternal} isu eksternal. Pertimbangkan regulasi konservasi energi, tarif, pasokan PLTBG/PLTS, dan kebutuhan tenant (klausul 4.1–4.2).` })
  if (!risiko.some((i) => i.skor >= AMBANG_RISIKO.tinggi) && risiko.length) catatan.push({ kode: 'info', teks: 'Tidak ada risiko tinggi atau ekstrem. Pastikan ini hasil penilaian nyata, misalnya risiko SEU belum ditetapkan atau EnPI belum punya data menjelang audit.' })
  const tanpaResidual = risiko.filter((i) => i.skor >= AMBANG_RISIKO.tinggi && i.skor_residual == null).length
  if (tanpaResidual && risiko.some((i) => i.skor_residual != null)) catatan.push({ kode: 'warn', teks: `${tanpaResidual} risiko tinggi/ekstrem belum punya nilai risiko residual. Kriteria risiko meminta rencana penurunan untuk skor ≥ ${AMBANG_RISIKO.tinggi}.` })

  const zona = (d: number, k: number) => (d * k >= AMBANG_RISIKO.ekstrem ? 'z-ekstrem' : d * k >= AMBANG_RISIKO.tinggi ? 'z-tinggi' : d * k >= AMBANG_RISIKO.sedang ? 'z-sedang' : 'z-rendah')

  function buka(i: Isu | null) { setEdit(i); setGalat(null); dlg.current?.showModal() }
  function pilihTitik(i: Isu) {
    setSorot(i.id)
    document.getElementById(`isu-${i.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <>
      {catatan.length > 0 && (
        <div className="card rg-catatan">
          <span className="eyebrow">Catatan analis · terdeteksi otomatis</span>
          <ul>{catatan.map((c) => <li key={c.teks} className={c.kode}>{c.teks}</li>)}</ul>
        </div>
      )}
      <div className="rg-atas">
        <div className="card">
          <div className="row">
            <h3>Peta risiko</h3>
            <div className="seg" role="group" aria-label="Jenis isu">
              {(['', 'Risiko', 'Peluang'] as const).map((j) => <button key={j} type="button" aria-pressed={filter === j} onClick={() => setFilter(j)}>{j || 'Semua'}<span className="n">{j ? isu.filter((i) => i.jenis === j).length : isu.length}</span></button>)}
            </div>
          </div>
          <div className="rg-matriks" role="grid" aria-label="Matriks dampak terhadap kemungkinan">
            <span className="rg-sumbu-y" aria-hidden="true">Dampak →</span>
            {[5, 4, 3, 2, 1].map((d) => (
              <div key={d} className="rg-baris" role="row">
                <span className="rg-ax">{d}</span>
                {[1, 2, 3, 4, 5].map((k) => {
                  const isi = diPeta.filter((i) => i.dampak === d && i.kemungkinan === k)
                  const aktif = sel?.[0] === d && sel?.[1] === k
                  return (
                    <div key={k} role="gridcell" className={`rg-sel ${zona(d, k)}${aktif ? ' aktif' : ''}`}
                      onClick={() => setSel(aktif ? null : [d, k])} title={`Dampak ${d} × kemungkinan ${k} = ${d * k}`}>
                      <span className="rg-skor">{d * k}</span>
                      <span className="rg-titik-wrap">
                        {isi.map((i) => (
                          <button key={i.id} type="button" className={`rg-titik ${i.jenis === 'Peluang' ? 'peluang' : ''}${sorot === i.id ? ' sorot' : ''}`}
                            aria-label={`${label.get(i.id)}: ${i.uraian}`} title={`${label.get(i.id)} · ${i.uraian}`}
                            onClick={(e) => { e.stopPropagation(); pilihTitik(i) }}>{label.get(i.id)}</button>
                        ))}
                      </span>
                    </div>
                  )
                })}
              </div>
            ))}
            <div className="rg-baris rg-bawah" aria-hidden="true"><span className="rg-ax" />{[1, 2, 3, 4, 5].map((k) => <span key={k} className="rg-ax">{k}</span>)}</div>
            <span className="rg-sumbu-x" aria-hidden="true">Kemungkinan →</span>
          </div>
          <div className="rg-legenda"><span><i className="rg-dot" />Risiko</span><span><i className="rg-dot peluang" />Peluang</span><span><i className="rg-zona z-rendah" />Rendah</span><span><i className="rg-zona z-sedang" />Sedang</span><span><i className="rg-zona z-tinggi" />Tinggi</span><span><i className="rg-zona z-ekstrem" />Ekstrem</span></div>
        </div>

        <div className="rg-kanan">
          <div className="card">
            <h3>Prioritas penanganan</h3>
            <p className="muted small">Lima risiko dengan skor tertinggi beserta kesiapan penanganannya.</p>
            <ol className="rg-prioritas">
              {prioritas.map((i) => {
                const t = tingkatRisiko(i.skor)
                return (
                  <li key={i.id}>
                    <button type="button" onClick={() => pilihTitik(i)}>
                      <span className={`rg-lencana ${t.chip}`}>{label.get(i.id)}</span>
                      <span className="rg-prio-isi">
                        <b>{i.proses ?? i.uraian}</b>
                        <span className="muted small">Skor {i.skor}{i.skor_residual != null ? ` → residual ${i.skor_residual}` : ''} · {i.bagian ?? i.asal}</span>
                      </span>
                      <span className="rg-prio-status">
                        {!i.tindakan ? <Chip kode="crit" label="Tanpa tindakan" /> : !i.evaluasi ? <Chip kode="warn" label="Belum dievaluasi" /> : <Chip kode="good" label="Siklus lengkap" />}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>
          <div className="card">
            <h3>Kelengkapan siklus klausul 6.1</h3>
            <p className="muted small">Auditor menanyakan tindakan dan bagaimana efektivitasnya dievaluasi, bukan hanya daftar risiko.</p>
            <div className="rg-lengkap">
              {kelengkapan.map((k) => (
                <div key={k.label}>
                  <div className="row"><span className="small">{k.label}</span><b className="tnum small">{k.n}/{isu.length}</b></div>
                  <div className="pg" style={{ marginTop: 4 }}><div className="track"><b className={pct(k.n) >= 100 ? 'bg-good' : pct(k.n) >= 60 ? '' : 'bg-warn'} style={{ width: `${pct(k.n)}%` }} /></div></div>
                </div>
              ))}
            </div>
            <p className="muted small" style={{ marginTop: 10 }}>{isu.filter((i) => i.asal === 'Internal').length} isu internal · {isu.filter((i) => i.asal === 'Eksternal').length} isu eksternal</p>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="toolbar">
          <label className="cari"><Search aria-hidden="true" /><span className="sr-only">Cari isu</span>
            <input type="search" placeholder="Cari isu, tindakan, PIC…" value={cari} onChange={(e) => setCari(e.target.value)} /></label>
          <div className="seg" role="group" aria-label="Status penanganan">
            <button type="button" aria-pressed={status === ''} onClick={() => setStatus('')}>Semua</button>
            <button type="button" aria-pressed={status === 'tanpa-tindakan'} onClick={() => setStatus('tanpa-tindakan')}>Tanpa tindakan<span className="n">{isu.filter((i) => !i.tindakan).length}</span></button>
            <button type="button" aria-pressed={status === 'belum-evaluasi'} onClick={() => setStatus('belum-evaluasi')}>Belum dievaluasi<span className="n">{isu.filter((i) => !i.evaluasi).length}</span></button>
          </div>
          {sel && <button type="button" className="btn kecil" onClick={() => setSel(null)}><X aria-hidden="true" /> Sel {sel[0]}×{sel[1]}</button>}
          <span style={{ flex: 1 }} />
          {bisa('register.ubah') && <button type="button" className="btn utama" onClick={() => buka(null)}><Plus aria-hidden="true" /><span className="teks">Tambah isu</span></button>}
        </div>
        <div className="table-wrap tall">
          <table className="tbl">
            <thead><tr><th>#</th><th>Isu</th><th className="num" title="Awal → residual">D×K</th><th>Tingkat</th><th>Tindakan & evaluasi</th><th /></tr></thead>
            <tbody>
              {tampil.length === 0 && <tr className="kosong"><td colSpan={6}>Tidak ada isu yang cocok.</td></tr>}
              {tampil.map((i) => {
                const t = tingkatRisiko(i.skor)
                return (
                  <tr key={i.id} id={`isu-${i.id}`} className={sorot === i.id ? 'rg-sorot' : undefined}>
                    <td><span className={`rg-lencana ${i.jenis === 'Peluang' ? 'info' : t.chip}`}>{label.get(i.id)}</span></td>
                    <td style={{ maxWidth: 340 }}>{i.proses && <b style={{ display: 'block' }}>{i.proses}</b>}{i.uraian}<span className="upd">{[i.bagian, i.asal, i.jenis, i.pic].filter(Boolean).join(' · ')}</span></td>
                    <td className="num">{i.dampak}×{i.kemungkinan}<span className="upd">{i.skor}</span>{i.skor_residual != null && <span className="upd" title="Risiko residual setelah pengendalian">→ {i.dampak_residual}×{i.kemungkinan_residual} = {i.skor_residual}</span>}</td>
                    <td>{i.jenis === 'Risiko' ? <Chip kode={t.chip} label={t.label} /> : <Chip kode="info" label="Peluang" />}</td>
                    <td className="small" style={{ maxWidth: 380 }}>
                      {i.tindakan ?? <span className="txt-bad">Belum ada tindakan</span>}
                      <span className="upd">Evaluasi: {i.evaluasi ?? <span className="txt-bad">belum</span>}</span>
                      {i.target && <span className="upd">Target: {i.target}</span>}
                    </td>
                    <td>{bisa('register.ubah') && <button type="button" className="btn btn-ikon" aria-label={`Ubah isu ${label.get(i.id)}`} onClick={() => buka(i)}><Pencil aria-hidden="true" /></button>}</td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot><tr><td colSpan={6}>{tampil.length} dari {isu.length} isu · urut skor tertinggi</td></tr></tfoot>
          </table>
        </div>
      </div>

      <dialog ref={dlg} className="panel" onClose={() => setEdit(null)}>
        <form className="card" key={edit?.id ?? 'baru'} action={(f) => mulai(async () => {
          const h = await simpanIsu(edit?.id ?? null, f)
          if (!h.ok) return setGalat(h.pesan)
          dlg.current?.close(); router.refresh()
        })}>
          <div className="row"><h3>{edit ? 'Ubah isu' : 'Isu baru'}</h3><button type="button" className="btn btn-ikon" aria-label="Tutup" onClick={() => dlg.current?.close()}><X aria-hidden="true" /></button></div>
          <div className="form-grid">
            <label className="field"><span>Asal</span><select name="asal" defaultValue={edit?.asal ?? 'Internal'}><option>Internal</option><option>Eksternal</option></select></label>
            <label className="field"><span>Jenis</span><select name="jenis" defaultValue={edit?.jenis ?? 'Risiko'}><option>Risiko</option><option>Peluang</option></select></label>
            <label className="field"><span>Bagian</span><input name="bagian" placeholder="mis. Korporasi" defaultValue={edit?.bagian ?? ''} /></label>
            <label className="field"><span>Proses</span><input name="proses" defaultValue={edit?.proses ?? ''} /></label>
            <label className="field full"><span>Isu / risiko yang diidentifikasi</span><textarea name="uraian" required defaultValue={edit?.uraian ?? ''} /></label>
            <label className="field"><span>Dampak awal (1–5)</span><input type="number" name="dampak" min={1} max={5} required defaultValue={edit?.dampak ?? 3} /></label>
            <label className="field"><span>Kemungkinan awal (1–5)</span><input type="number" name="kemungkinan" min={1} max={5} required defaultValue={edit?.kemungkinan ?? 2} /></label>
            <label className="field"><span>Dampak residual (1–5)</span><input type="number" name="dampak_residual" min={1} max={5} defaultValue={edit?.dampak_residual ?? ''} /></label>
            <label className="field"><span>Kemungkinan residual (1–5)</span><input type="number" name="kemungkinan_residual" min={1} max={5} defaultValue={edit?.kemungkinan_residual ?? ''} /></label>
            <label className="field full"><span>Tindakan</span><textarea name="tindakan" defaultValue={edit?.tindakan ?? ''} /></label>
            <label className="field full"><span>Evaluasi efektivitas</span><textarea name="evaluasi" defaultValue={edit?.evaluasi ?? ''} /></label>
            <label className="field"><span>PIC</span><input name="pic" defaultValue={edit?.pic ?? ''} /></label>
            <label className="field"><span>Target penyelesaian</span><input name="target" defaultValue={edit?.target ?? ''} /></label>
          </div>
          {galat && <p className="pesan galat" role="alert" style={{ marginTop: 12 }}>{galat}</p>}
          <div className="toolbar" style={{ marginTop: 16, marginBottom: 0 }}>
            <button className="btn utama" type="submit" disabled={menunggu}>{menunggu ? 'Menyimpan…' : 'Simpan'}</button>
            <span style={{ flex: 1 }} />
            {edit && bisa('register.hapus') && <button type="button" className="btn bahaya" disabled={menunggu} onClick={() => {
              if (!confirm('Hapus isu ini?')) return
              mulai(async () => { const h = await hapusIsu(edit.id); if (!h.ok) return setGalat(h.pesan); dlg.current?.close(); router.refresh() })
            }}><Trash2 aria-hidden="true" /> Hapus</button>}
          </div>
        </form>
      </dialog>
    </>
  )
}
