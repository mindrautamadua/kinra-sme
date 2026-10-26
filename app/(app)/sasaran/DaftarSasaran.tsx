'use client'

import { ArrowRight, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { hapusAksi, hapusSasaran, simpanAksi, simpanSasaran, ubahStatusAksi } from '@/app/actions'
import { Chip } from '@/components/Chip'
import { useBoleh } from '@/components/Peran'
import { angka, tanggal } from '@/lib/format'
import type { KodeChip } from '@/lib/status'
import type { RencanaAksi, Sasaran, StatusAksi, StatusSasaran } from '@/lib/types'

export type Capaian = {
  enpi: string
  satuan: string
  bulan: number
  perbaikan: number | null
  hemat: number
  persenTarget: number | null
  galat: string | null
}

type PeluangRingkas = { kode: string; uraian: string; status: string; estimasi_kwh: number | null; pemilik: string | null }

const STATUS_S: StatusSasaran[] = ['Draft', 'Aktif', 'Tercapai', 'Tidak tercapai']
const STATUS_A: StatusAksi[] = ['Rencana', 'Berjalan', 'Selesai', 'Ditunda', 'Batal']
const CHIP_S: Record<StatusSasaran, KodeChip> = { Draft: 'na', Aktif: 'info', Tercapai: 'good', 'Tidak tercapai': 'crit' }
const CHIP_A: Record<StatusAksi, KodeChip> = { Rencana: 'na', Berjalan: 'info', Selesai: 'good', Ditunda: 'warn', Batal: 'na' }

const kodeBerikut = (prefiks: string, daftar: { kode: string }[]) =>
  `${prefiks}-${String(Math.max(0, ...daftar.map((x) => Number(x.kode.replace(/\D/g, '')) || 0)) + 1).padStart(2, '0')}`

export function DaftarSasaran({ sasaran, aksi, capaian, enpi, peluang, kini }: {
  sasaran: Sasaran[]; aksi: RencanaAksi[]; capaian: Record<number, Capaian>
  enpi: { kode: string; nama: string }[]; peluang: PeluangRingkas[]; kini: string
}) {
  const router = useRouter()
  const bisa = useBoleh()
  const dlgS = useRef<HTMLDialogElement>(null)
  const dlgA = useRef<HTMLDialogElement>(null)
  const [editS, setEditS] = useState<Sasaran | null>(null)
  const [editA, setEditA] = useState<Partial<RencanaAksi> | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [menunggu, mulai] = useTransition()

  const tanpaSasaran = aksi.filter((a) => a.sasaran_id === null || !sasaran.some((s) => s.id === a.sasaran_id))
  const sudahJadiAksi = new Set(aksi.map((a) => a.peluang_kode).filter(Boolean))
  const peluangSiap = peluang.filter((p) => (p.status === 'Disetujui' || p.status === 'Berjalan') && !sudahJadiAksi.has(p.kode))
  const hidup = aksi.filter((a) => a.status !== 'Batal')
  const estimasi = hidup.reduce((t, a) => t + (a.estimasi_hemat_kwh ?? 0), 0)
  const terverifikasi = aksi.reduce((t, a) => t + (a.hemat_terverifikasi_kwh ?? 0), 0)
  const lewat = (a: RencanaAksi) => !!a.tenggat && a.tenggat < kini && a.status !== 'Selesai' && a.status !== 'Batal'

  function bukaS(s: Sasaran | null) { setEditS(s); setGalat(null); dlgS.current?.showModal() }
  function bukaA(a: Partial<RencanaAksi> | null) { setEditA(a ?? {}); setGalat(null); dlgA.current?.showModal() }
  const ubahStatus = (a: RencanaAksi, status: StatusAksi) => mulai(async () => { const h = await ubahStatusAksi(a.id, status); if (!h.ok) alert(h.pesan); router.refresh() })

  const tabelAksi = (daftar: RencanaAksi[]) => (
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Kode</th><th>Aksi</th><th>PIC · tenggat</th><th className="num">Estimasi</th><th className="num">Terverifikasi</th><th>Status</th><th /></tr></thead>
          <tbody>
            {daftar.length === 0 && <tr className="kosong"><td colSpan={7}>Belum ada rencana aksi.</td></tr>}
            {daftar.map((a) => (
              <tr key={a.id} className={lewat(a) ? 'lewat' : undefined}>
                <td className="kode">{a.kode}{a.peluang_kode && <span className="upd">dari {a.peluang_kode}</span>}</td>
                <td style={{ maxWidth: 360 }}>{a.uraian}
                  {a.sumber_daya && <span className="upd">Sumber daya: {a.sumber_daya}</span>}
                  {a.metode_verifikasi && <span className="upd">Verifikasi: {a.metode_verifikasi}</span>}
                </td>
                <td className="small">{a.pic ?? '–'}<span className={`upd ${lewat(a) ? 'txt-bad' : ''}`}>{tanggal(a.tenggat)}</span></td>
                <td className="num">{a.estimasi_hemat_kwh !== null ? `${angka(a.estimasi_hemat_kwh)} kWh` : '–'}</td>
                <td className="num">{a.hemat_terverifikasi_kwh !== null ? <><b className="txt-good">{angka(a.hemat_terverifikasi_kwh)} kWh</b><span className="upd">{tanggal(a.tanggal_verifikasi)}</span></> : '–'}</td>
                <td>
                  <Chip kode={CHIP_A[a.status]} label={a.status} />
                  {bisa('aksi.ubah') && (
                    <label style={{ display: 'block', marginTop: 4 }}><span className="sr-only">Ubah status {a.kode}</span>
                      <select className="inline" value={a.status} onChange={(e) => ubahStatus(a, e.target.value as StatusAksi)}>
                        {STATUS_A.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </label>
                  )}
                </td>
                <td>{bisa('aksi.ubah') && <button type="button" className="btn btn-ikon" aria-label={`Ubah ${a.kode}`} onClick={() => bukaA(a)}><Pencil aria-hidden="true" /></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
  )

  return (
    <>
      <div className="tiles" style={{ marginBottom: 16 }}>
        <div className="tile"><div className="tile-head"><span className="label">Sasaran aktif</span></div>
          <div className="nilai tnum">{sasaran.filter((s) => s.status === 'Aktif').length}<small>dari {sasaran.length}</small></div>
          <div className="meta">{sasaran.filter((s) => s.status === 'Tercapai').length} tercapai</div></div>
        <div className="tile"><div className="tile-head"><span className="label">Rencana aksi</span></div>
          <div className="nilai tnum">{hidup.filter((a) => a.status === 'Selesai').length}<small>selesai dari {hidup.length}</small></div>
          <div className="meta">{hidup.filter((a) => a.status === 'Berjalan').length} berjalan · {aksi.filter(lewat).length} lewat tenggat</div></div>
        <div className="tile"><div className="tile-head"><span className="label">Estimasi penghematan</span></div>
          <div className="nilai tnum">{angka(estimasi / 1000, 1)}<small>MWh/tahun</small></div>
          <div className="meta">Dari rencana aksi yang tidak dibatalkan</div></div>
        <div className="tile"><div className="tile-head"><span className="label">Penghematan terverifikasi</span>{estimasi > 0 && <Chip capaian={(terverifikasi / estimasi) * 100} />}</div>
          <div className="nilai tnum">{angka(terverifikasi / 1000, 1)}<small>MWh</small></div>
          <div className="meta">{estimasi > 0 ? `${angka((terverifikasi / estimasi) * 100, 0)}% dari estimasi` : 'Belum ada estimasi'}</div></div>
      </div>

      <div className="toolbar">
        <span style={{ flex: 1 }} />
        {bisa('aksi.ubah') && <button type="button" className="btn" onClick={() => bukaA(null)}><Plus aria-hidden="true" /><span className="teks">Tambah aksi</span></button>}
        {bisa('sasaran.tambah') && <button type="button" className="btn utama" onClick={() => bukaS(null)}><Plus aria-hidden="true" /><span className="teks">Tambah sasaran</span></button>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {sasaran.length === 0 && (
          <div className="card"><p className="muted">Belum ada sasaran. Contoh: &ldquo;Menurunkan konsumsi listrik kawasan ternormalisasi 3% pada 2026 dibanding baseline 2025&rdquo; dengan EnPI-02 dan target 3%.</p></div>
        )}
        {sasaran.map((s) => {
          const c = capaian[s.id]
          const daftar = aksi.filter((a) => a.sasaran_id === s.id)
          return (
            <div key={s.id} className="card">
              <div className="row">
                <div>
                  <span className="eyebrow">{s.kode}{s.pic && ` · PIC ${s.pic}`}</span>
                  <h3>{s.uraian}</h3>
                  <p className="muted small">
                    {s.enpi_kode && s.target_persen !== null
                      ? `Target: perbaikan ${angka(s.target_persen, 1)}% pada ${s.enpi_kode}${c ? ` (${c.enpi})` : ''}, tahun ${s.tahun_target}`
                      : 'Belum terhubung ke EnPI dengan target terukur'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Chip kode={CHIP_S[s.status]} label={s.status} />
                  {bisa('sasaran.ubah') && <button type="button" className="btn btn-ikon" aria-label={`Ubah ${s.kode}`} onClick={() => bukaS(s)}><Pencil aria-hidden="true" /></button>}
                </div>
              </div>

              {c && (
                <div style={{ marginBottom: 16 }}>
                  {c.galat ? <p className="pesan galat">{c.galat}</p> : c.bulan === 0 ? (
                    <p className="pesan">Belum ada data {s.tahun_target} setelah periode baseline untuk {s.enpi_kode}.</p>
                  ) : (
                    <>
                      <div className="mini-stats" style={{ justifyContent: 'flex-start', marginBottom: 8 }}>
                        <div style={{ alignItems: 'flex-start' }}><span>Perbaikan {s.tahun_target}</span><b className={`tnum ${(c.perbaikan ?? 0) >= 0 ? 'txt-good' : 'txt-bad'}`}>{c.perbaikan === null ? '–' : `${c.perbaikan < 0 ? '−' : ''}${angka(Math.abs(c.perbaikan), 1)}%`}</b></div>
                        <div style={{ alignItems: 'flex-start' }}><span>Target</span><b className="tnum">{angka(s.target_persen, 1)}%</b></div>
                        <div style={{ alignItems: 'flex-start' }}><span>Hemat ({c.satuan})</span><b className="tnum">{angka(c.hemat, c.satuan === 'TJ' ? 2 : 0)}</b></div>
                        <div style={{ alignItems: 'flex-start' }}><span>Data</span><b className="tnum">{c.bulan} bulan</b></div>
                        {c.persenTarget !== null && <Chip capaian={c.persenTarget} />}
                      </div>
                      {c.persenTarget !== null && (
                        <div className="pg" role="img" aria-label={`Capaian ${Math.round(c.persenTarget)}% dari target`}>
                          <div className={`track${c.persenTarget >= 100 ? ' over' : ''}`}><b style={{ width: `${Math.min(100, Math.max(0, c.persenTarget))}%` }} /></div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {tabelAksi(daftar)}
              {bisa('aksi.ubah') && (
                <div className="toolbar" style={{ marginTop: 12, marginBottom: 0 }}>
                  <button type="button" className="btn kecil" onClick={() => bukaA({ sasaran_id: s.id })}><Plus aria-hidden="true" />Aksi untuk {s.kode}</button>
                </div>
              )}
            </div>
          )
        })}

        {tanpaSasaran.length > 0 && (
          <div className="card">
            <div className="row"><div><h3>Aksi belum terhubung ke sasaran</h3><p className="muted small">Hubungkan agar kontribusinya terhadap target terlihat.</p></div></div>
            {tabelAksi(tanpaSasaran)}
          </div>
        )}

        {peluangSiap.length > 0 && (
          <div className="card">
            <div className="row"><div><h3>Peluang disetujui yang belum punya rencana aksi</h3><p className="muted small">Dari register peluang peningkatan kinerja energi (6.1).</p></div></div>
            <div className="list">
              {peluangSiap.map((p) => (
                <div key={p.kode}>
                  <span className="kode mono small">{p.kode}</span>
                  <div className="grow"><b>{p.uraian}</b><span className="muted small">{p.pemilik ?? 'Tanpa pemilik'}{p.estimasi_kwh !== null && ` · estimasi ${angka(p.estimasi_kwh)} kWh/tahun`}</span></div>
                  {bisa('aksi.ubah') && (
                    <button type="button" className="btn kecil" onClick={() => bukaA({ peluang_kode: p.kode, uraian: p.uraian, pic: p.pemilik, estimasi_hemat_kwh: p.estimasi_kwh })}>
                      Jadikan aksi<ArrowRight aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <dialog ref={dlgS} className="panel" onClose={() => setEditS(null)}>
        <form className="card" key={editS?.id ?? 'baru'} action={(f) => mulai(async () => {
          const h = await simpanSasaran(editS?.id ?? null, f)
          if (!h.ok) return setGalat(h.pesan)
          dlgS.current?.close(); router.refresh()
        })}>
          <div className="row"><h3>{editS ? `Ubah ${editS.kode}` : 'Sasaran baru'}</h3><button type="button" className="btn btn-ikon" aria-label="Tutup" onClick={() => dlgS.current?.close()}><X aria-hidden="true" /></button></div>
          <div className="form-grid">
            <label className="field"><span>Kode</span><input name="kode" required defaultValue={editS?.kode ?? kodeBerikut('S', sasaran)} /></label>
            <label className="field"><span>Status</span><select name="status" defaultValue={editS?.status ?? 'Aktif'}>{STATUS_S.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label className="field full"><span>Sasaran energi</span><textarea name="uraian" required defaultValue={editS?.uraian ?? ''} placeholder="mis. Menurunkan intensitas energi WTP" /></label>
            <label className="field full"><span>EnPI pengukur</span>
              <select name="enpi_kode" defaultValue={editS?.enpi_kode ?? ''}>
                <option value="">Belum ditentukan</option>
                {enpi.map((e) => <option key={e.kode} value={e.kode}>{e.kode} · {e.nama}</option>)}
              </select>
            </label>
            <label className="field"><span>Target perbaikan (%)</span><input type="number" name="target_persen" min={0} max={100} step="any" defaultValue={editS?.target_persen ?? ''} /></label>
            <label className="field"><span>Tahun target</span><input type="number" name="tahun_target" min={2024} max={2035} defaultValue={editS?.tahun_target ?? new Date().getFullYear()} /></label>
            <label className="field full"><span>PIC</span><input name="pic" defaultValue={editS?.pic ?? ''} /></label>
            <label className="field full"><span>Catatan</span><textarea name="catatan" defaultValue={editS?.catatan ?? ''} placeholder="Keterkaitan dengan kebijakan energi, persyaratan hukum, SEU" /></label>
          </div>
          {galat && <p className="pesan galat" role="alert" style={{ marginTop: 12 }}>{galat}</p>}
          <div className="toolbar" style={{ marginTop: 16, marginBottom: 0 }}>
            <button className="btn utama" type="submit" disabled={menunggu}>{menunggu ? 'Menyimpan…' : 'Simpan'}</button>
            <span style={{ flex: 1 }} />
            {editS && bisa('sasaran.hapus') && (
              <button type="button" className="btn" onClick={() => {
                if (!confirm(`Hapus sasaran ${editS.kode}? Rencana aksinya tetap ada tanpa sasaran.`)) return
                mulai(async () => { const h = await hapusSasaran(editS.id); if (!h.ok) return setGalat(h.pesan); dlgS.current?.close(); router.refresh() })
              }}><Trash2 aria-hidden="true" /><span className="teks">Hapus</span></button>
            )}
          </div>
        </form>
      </dialog>

      <dialog ref={dlgA} className="panel" onClose={() => setEditA(null)}>
        <form className="card" key={editA?.id ?? `baru-${editA?.sasaran_id ?? ''}-${editA?.peluang_kode ?? ''}`} action={(f) => mulai(async () => {
          const h = await simpanAksi(editA?.id ?? null, f)
          if (!h.ok) return setGalat(h.pesan)
          dlgA.current?.close(); router.refresh()
        })}>
          <div className="row"><h3>{editA?.id ? `Ubah ${editA.kode}` : 'Rencana aksi baru'}</h3><button type="button" className="btn btn-ikon" aria-label="Tutup" onClick={() => dlgA.current?.close()}><X aria-hidden="true" /></button></div>
          <div className="form-grid">
            <label className="field"><span>Kode</span><input name="kode" required defaultValue={editA?.kode ?? kodeBerikut('RA', aksi)} /></label>
            <label className="field"><span>Status</span><select name="status" defaultValue={editA?.status ?? 'Rencana'}>{STATUS_A.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label className="field full"><span>Uraian aksi</span><textarea name="uraian" required defaultValue={editA?.uraian ?? ''} /></label>
            <label className="field"><span>Sasaran</span>
              <select name="sasaran_id" defaultValue={editA?.sasaran_id ?? ''}>
                <option value="">Tanpa sasaran</option>
                {sasaran.map((s) => <option key={s.id} value={s.id}>{s.kode} · {s.uraian.slice(0, 60)}</option>)}
              </select>
            </label>
            <label className="field"><span>Asal peluang</span>
              <select name="peluang_kode" defaultValue={editA?.peluang_kode ?? ''}>
                <option value="">–</option>
                {peluang.map((p) => <option key={p.kode} value={p.kode}>{p.kode} · {p.uraian.slice(0, 60)}</option>)}
              </select>
            </label>
            <label className="field"><span>PIC</span><input name="pic" defaultValue={editA?.pic ?? ''} /></label>
            <label className="field"><span>Sumber daya</span><input name="sumber_daya" defaultValue={editA?.sumber_daya ?? ''} placeholder="Anggaran, personel, alat" /></label>
            <label className="field"><span>Mulai</span><input type="date" name="mulai" defaultValue={editA?.mulai ?? ''} /></label>
            <label className="field"><span>Tenggat</span><input type="date" name="tenggat" defaultValue={editA?.tenggat ?? ''} /></label>
            <label className="field"><span>Estimasi hemat (kWh/tahun)</span><input type="number" name="estimasi_hemat_kwh" min={0} step="any" defaultValue={editA?.estimasi_hemat_kwh ?? ''} /></label>
            <label className="field"><span>Metode verifikasi hasil</span><input name="metode_verifikasi" defaultValue={editA?.metode_verifikasi ?? ''} placeholder="mis. bandingkan EnPI WTP 3 bulan sebelum/sesudah" /></label>
            <label className="field"><span>Hemat terverifikasi (kWh)</span><input type="number" name="hemat_terverifikasi_kwh" step="any" defaultValue={editA?.hemat_terverifikasi_kwh ?? ''} /></label>
            <label className="field"><span>Tanggal verifikasi</span><input type="date" name="tanggal_verifikasi" defaultValue={editA?.tanggal_verifikasi ?? ''} /></label>
            <label className="field full"><span>Catatan</span><textarea name="catatan" defaultValue={editA?.catatan ?? ''} /></label>
          </div>
          {galat && <p className="pesan galat" role="alert" style={{ marginTop: 12 }}>{galat}</p>}
          <div className="toolbar" style={{ marginTop: 16, marginBottom: 0 }}>
            <button className="btn utama" type="submit" disabled={menunggu}>{menunggu ? 'Menyimpan…' : 'Simpan'}</button>
            <span style={{ flex: 1 }} />
            {editA?.id && bisa('sasaran.hapus') && (
              <button type="button" className="btn" onClick={() => {
                if (!confirm(`Hapus rencana aksi ${editA.kode}?`)) return
                mulai(async () => { const h = await hapusAksi(editA.id!); if (!h.ok) return setGalat(h.pesan); dlgA.current?.close(); router.refresh() })
              }}><Trash2 aria-hidden="true" /><span className="teks">Hapus</span></button>
            )}
          </div>
        </form>
      </dialog>
    </>
  )
}
