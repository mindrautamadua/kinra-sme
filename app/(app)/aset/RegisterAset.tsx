'use client'

import { Pencil, Plus, Search, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState, useTransition } from 'react'
import { hapusAset, simpanAset } from '@/app/actions'
import { useBoleh } from '@/components/Peran'
import { angka } from '@/lib/format'
import type { Aset, MeterEnergi } from '@/lib/types'
import { KonfirmasiHapus } from './KonfirmasiHapus'

const kodeBerikut = (daftar: { kode: string }[]) =>
  `KINRA-AST-${String(Math.max(0, ...daftar.map((x) => Number(x.kode.replace(/\D/g, '')) || 0)) + 1).padStart(3, '0')}`

const rupiah = (v: number | null) => (v === null ? '–' : `Rp${angka(v, 0)}`)

export function RegisterAset({ aset, meter }: { aset: Aset[]; meter: MeterEnergi[] }) {
  const router = useRouter()
  const bisa = useBoleh()
  const dlg = useRef<HTMLDialogElement>(null)
  const [edit, setEdit] = useState<Aset | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [hapus, setHapus] = useState<Aset | null>(null)
  const [cari, setCari] = useState('')
  const [saring, setSaring] = useState<'' | 'meter' | 'tanpa'>('')
  const [menunggu, mulai] = useTransition()

  const meterAset = (k: string) => meter.filter((m) => m.aset_kode === k)
  const daftarArea = useMemo(() => [...new Set(aset.map((a) => a.area).filter((a): a is string => !!a))], [aset])
  const tampil = aset.filter((a) => {
    const q = cari.trim().toLowerCase()
    if (q && ![a.kode, a.nama, a.area, a.fungsi, a.pic].some((v) => v?.toLowerCase().includes(q))) return false
    if (saring === 'meter') return meterAset(a.kode).length > 0
    if (saring === 'tanpa') return meterAset(a.kode).length === 0
    return true
  })
  const jumlahBermeter = aset.filter((a) => meterAset(a.kode).length > 0).length

  function buka(a: Aset | null) { setEdit(a); setGalat(null); dlg.current?.showModal() }

  return (
    <>
      <div className="toolbar">
        <label className="cari">
          <Search aria-hidden="true" />
          <span className="sr-only">Cari aset</span>
          <input type="search" placeholder="Cari kode, nama, area, fungsi…" value={cari} onChange={(e) => setCari(e.target.value)} />
        </label>
        <div className="seg" role="group" aria-label="Saring meter">
          <button type="button" aria-pressed={saring === ''} onClick={() => setSaring('')}>Semua<span className="n">{aset.length}</span></button>
          <button type="button" aria-pressed={saring === 'meter'} onClick={() => setSaring('meter')}>Bermeter<span className="n">{jumlahBermeter}</span></button>
          <button type="button" aria-pressed={saring === 'tanpa'} onClick={() => setSaring('tanpa')}>Tanpa meter<span className="n">{aset.length - jumlahBermeter}</span></button>
        </div>
        <span style={{ flex: 1 }} />
        {bisa('aset.ubah') && <button type="button" className="btn utama" onClick={() => buka(null)}><Plus aria-hidden="true" /><span className="teks">Tambah aset</span></button>}
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Kode</th><th>Aset</th><th className="num">Luas</th><th className="num">Lantai · ruang</th><th>Dibangun</th><th className="num">Luas ber-AC</th><th className="num">Energi/bulan</th><th>Meter</th><th /></tr></thead>
            <tbody>
              {tampil.length === 0 && <tr className="kosong"><td colSpan={9}>Tidak ada aset yang cocok.</td></tr>}
              {tampil.map((a) => {
                const ms = meterAset(a.kode)
                return (
                  <tr key={a.kode}>
                    <td className="kode">{a.kode}</td>
                    <td style={{ maxWidth: 340 }}>
                      <b>{a.nama}</b>{a.area && <span className="upd">Area {a.area}</span>}
                      {a.fungsi && <span className="upd">{a.fungsi}</span>}
                    </td>
                    <td className="num">{a.luas_m2 !== null ? `${angka(a.luas_m2, 2)} m²` : '–'}</td>
                    <td className="num">{a.jumlah_lantai ?? '–'} · {a.jumlah_ruangan ?? '–'}</td>
                    <td className="small">{a.tahun_bangun ?? '–'}{a.kondisi && <span className="upd">{a.kondisi}</span>}</td>
                    <td className="num">{a.luas_ac_m2 ? `${angka(a.luas_ac_m2, 2)} m²` : '–'}</td>
                    <td className="num">{a.kwh_bulan !== null ? `${angka(a.kwh_bulan, 1)} kWh` : '–'}
                      {a.biaya_bulan !== null && <span className="upd">{rupiah(a.biaya_bulan)}</span>}
                      {a.jam_operasi && <span className="upd">{a.jam_operasi}</span>}
                    </td>
                    <td className="small">{ms.length ? ms.map((m) => <span key={m.kode} className="mono" style={{ display: 'block' }}>{m.no_meter ?? m.kode}</span>) : <span className="muted">–</span>}</td>
                    <td>
                      <div className="ks-aksi-baris">
                        {bisa('aset.ubah') && <button type="button" className="btn btn-ikon" aria-label={`Ubah ${a.kode}`} onClick={() => buka(a)}><Pencil aria-hidden="true" /></button>}
                        {bisa('aset.hapus') && <button type="button" className="btn btn-ikon" aria-label={`Hapus ${a.kode}`} onClick={() => setHapus(a)}><Trash2 aria-hidden="true" /></button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="sumber">Sumber: Daftar Aset dan Meter Energi (Bagian M/E). Energi/bulan adalah data inventaris awal; konsumsi aktual bulanan ada di bacaan stand meter di atas.</p>
      </div>

      <datalist id="area-aset">{daftarArea.map((a) => <option key={a} value={a} />)}</datalist>
      <dialog ref={dlg} className="panel" onClose={(e) => { if (e.target === e.currentTarget) setEdit(null) }}>
        <form className="card" key={edit?.kode ?? 'baru'} action={(f) => mulai(async () => {
          const h = await simpanAset(edit?.kode ?? null, f)
          if (!h.ok) return setGalat(h.pesan)
          dlg.current?.close(); router.refresh()
        })}>
          <div className="row"><h3>{edit ? `Ubah ${edit.kode}` : 'Aset baru'}</h3><button type="button" className="btn btn-ikon" aria-label="Tutup" onClick={() => dlg.current?.close()}><X aria-hidden="true" /></button></div>
          <div className="form-grid">
            <label className="field"><span>Kode aset</span><input name="kode" required defaultValue={edit?.kode ?? kodeBerikut(aset)} /></label>
            <label className="field"><span>No. urut</span><input type="number" name="no_urut" min={0} defaultValue={edit?.no_urut ?? aset.length + 1} /></label>
            <label className="field full"><span>Nama aset</span><input name="nama" required defaultValue={edit?.nama ?? ''} /></label>
            <label className="field"><span>Area induk</span><input name="area" list="area-aset" defaultValue={edit?.area ?? ''} placeholder="mis. Tank Farm" /></label>
            <label className="field"><span>Kondisi bangunan</span><input name="kondisi" defaultValue={edit?.kondisi ?? 'Baik'} /></label>
            <label className="field"><span>Luas total bangunan (m²)</span><input type="number" name="luas_m2" min={0} step="any" defaultValue={edit?.luas_m2 ?? ''} /></label>
            <label className="field"><span>Luas area ber-AC (m²)</span><input type="number" name="luas_ac_m2" min={0} step="any" defaultValue={edit?.luas_ac_m2 ?? ''} /></label>
            <label className="field"><span>Jumlah lantai</span><input type="number" name="jumlah_lantai" min={0} defaultValue={edit?.jumlah_lantai ?? ''} /></label>
            <label className="field"><span>Jumlah ruangan</span><input type="number" name="jumlah_ruangan" min={0} defaultValue={edit?.jumlah_ruangan ?? ''} /></label>
            <label className="field"><span>Tahun bangun</span><input type="number" name="tahun_bangun" min={1950} max={2100} defaultValue={edit?.tahun_bangun ?? ''} /></label>
            <label className="field"><span>Tanggal bangun</span><input name="tanggal_bangun" defaultValue={edit?.tanggal_bangun ?? ''} placeholder="YYYY-MM-DD atau YYYY-MM" /></label>
            <label className="field full"><span>Fungsi ruang</span><textarea name="fungsi" defaultValue={edit?.fungsi ?? ''} /></label>
            <label className="field"><span>Konsumsi listrik (kWh/bulan)</span><input type="number" name="kwh_bulan" min={0} step="any" defaultValue={edit?.kwh_bulan ?? ''} /></label>
            <label className="field"><span>Biaya listrik (Rp/bulan)</span><input type="number" name="biaya_bulan" min={0} step="any" defaultValue={edit?.biaya_bulan ?? ''} /></label>
            <label className="field"><span>Jam operasi</span><input name="jam_operasi" defaultValue={edit?.jam_operasi ?? ''} placeholder="mis. 8 jam/hari" /></label>
            <label className="field"><span>PIC</span><input name="pic" defaultValue={edit?.pic ?? 'Bagian M/E'} /></label>
            <label className="field full"><span>Catatan</span><textarea name="catatan" defaultValue={edit?.catatan ?? ''} /></label>
          </div>
          {galat && <p className="pesan galat" role="alert" style={{ marginTop: 12 }}>{galat}</p>}
          <div className="toolbar" style={{ marginTop: 16, marginBottom: 0 }}>
            <button className="btn utama" type="submit" disabled={menunggu}>{menunggu ? 'Menyimpan…' : 'Simpan'}</button>
          </div>
        </form>
      </dialog>

      <KonfirmasiHapus onTutup={() => setHapus(null)} onSelesai={() => router.refresh()}
        target={hapus && {
          judul: `Hapus aset “${hapus.nama}”?`,
          poin: [
            `Aset ${hapus.kode} hilang dari register aset.`,
            meterAset(hapus.kode).length > 0
              ? `${meterAset(hapus.kode).length} meter yang tertaut tetap ada, tetapi tanpa tautan aset.`
              : 'Tidak ada meter yang tertaut ke aset ini.',
          ],
          hapus: () => hapusAset(hapus.kode),
        }} />
    </>
  )
}
