'use client'

import { Search, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { simpanDeviasi } from '@/app/actions'
import { Chip } from '@/components/Chip'
import { useBoleh } from '@/components/Peran'
import { BATAS_HARI_TANGGAPAN, type DeviasiTerdeteksi, LABEL_JENIS, LABEL_KATEGORI } from '@/lib/deviasi'
import { angka, BULAN_PANJANG, tanggal } from '@/lib/format'
import type { KodeChip } from '@/lib/status'
import type { Deviasi } from '@/lib/types'

type Baris = { d: DeviasiTerdeteksi; r: Deviasi | null; umur: number }

const CHIP: Record<Deviasi['status'], KodeChip> = { Diselidiki: 'info', Ditanggapi: 'warn', Ditutup: 'good', 'Bukan deviasi': 'na' }
const tutup = (r: Deviasi | null) => !!r && (r.status === 'Ditutup' || r.status === 'Bukan deviasi')

export function DaftarDeviasi({ baris, sisa, aksi }: { baris: Baris[]; sisa: Deviasi[]; aksi: { kode: string; uraian: string }[] }) {
  const router = useRouter()
  const bisa = useBoleh()
  const dlg = useRef<HTMLDialogElement>(null)
  const [edit, setEdit] = useState<Baris | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [semua, setSemua] = useState(false)
  const [menunggu, mulai] = useTransition()

  const buka = baris.filter((b) => !tutup(b.r))
  const tampil = semua ? baris : buka
  const telat = buka.filter((b) => !b.r && b.umur > BATAS_HARI_TANGGAPAN).length

  function pilih(b: Baris) { setEdit(b); setGalat(null); dlg.current?.showModal() }
  const angkaDev = (v: number | null, s: string) => (v === null ? '–' : `${angka(v, s === 'TJ' ? 2 : 0)} ${s}`)

  return (
    <div className="card">
      <div className="toolbar">
        <div className="seg" role="group" aria-label="Saring deviasi">
          <button type="button" aria-pressed={!semua} onClick={() => setSemua(false)}>Terbuka<span className="n">{buka.length}</span></button>
          <button type="button" aria-pressed={semua} onClick={() => setSemua(true)}>Semua<span className="n">{baris.length}</span></button>
        </div>
        {telat > 0 && <Chip kode="crit" label={`${telat} lewat ${BATAS_HARI_TANGGAPAN} hari tanpa tanggapan`} />}
      </div>
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Bulan</th><th>EnPI</th><th>Jenis</th><th className="num">Aktual · harapan</th><th className="num">Selisih</th><th>Status</th><th>PIC · tenggat</th><th /></tr></thead>
          <tbody>
            {tampil.length === 0 && <tr className="kosong"><td colSpan={8}>{baris.length ? 'Semua deviasi sudah ditutup.' : 'Tidak ada deviasi signifikan terdeteksi pada EnPI lingkup KINRA.'}</td></tr>}
            {tampil.map((b) => (
              <tr key={b.d.kunci} className={!b.r && b.umur > BATAS_HARI_TANGGAPAN ? 'lewat' : undefined}>
                <td className="kode">{BULAN_PANJANG[b.d.bulan - 1]} {b.d.tahun}</td>
                <td><b>{b.d.enpi_kode}</b><span className="upd">{b.d.enpi_nama}</span></td>
                <td className="small">{LABEL_JENIS[b.d.jenis]}<span className="upd">{b.d.ambang}</span></td>
                <td className="num">{angkaDev(b.d.aktual, b.d.satuan)}<span className="upd">{angkaDev(b.d.harapan, b.d.satuan)}</span></td>
                <td className="num">
                  {b.d.arah === 'data' ? <span className="muted">data hilang</span>
                    : <b className={b.d.arah === 'boros' ? 'txt-bad' : 'txt-good'}>{b.d.selisih_persen !== null ? `${b.d.selisih_persen > 0 ? '+' : ''}${angka(b.d.selisih_persen, 1)}%` : '–'}</b>}
                  <span className="upd">{b.d.arah === 'boros' ? 'lebih boros' : b.d.arah === 'hemat' ? 'lebih hemat' : ''}</span>
                </td>
                <td>
                  {b.r ? <Chip kode={CHIP[b.r.status]} label={b.r.status} /> : <Chip kode={b.umur > BATAS_HARI_TANGGAPAN ? 'crit' : 'warn'} label="Belum diselidiki" />}
                  {b.r?.kategori && <span className="upd">{LABEL_KATEGORI[b.r.kategori]}</span>}
                  {!b.r && <span className="upd">{b.umur} hari sejak akhir bulan</span>}
                </td>
                <td className="small">{b.r?.pic ?? '–'}<span className="upd">{tanggal(b.r?.tenggat ?? null)}</span></td>
                <td>{bisa('deviasi.ubah') && (
                  <button type="button" className="btn kecil" onClick={() => pilih(b)}>
                    {b.r ? 'Ubah' : <><Search aria-hidden="true" />Selidiki</>}
                  </button>
                )}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sisa.length > 0 && (
        <p className="muted small" style={{ marginTop: 10 }}>
          {sisa.length} catatan penyelidikan tidak lagi terdeteksi oleh aturan (mis. data sudah dikoreksi): {sisa.map((r) => `${r.enpi_kode} ${BULAN_PANJANG[r.bulan - 1]} ${r.tahun} (${r.status})`).join(', ')}.
        </p>
      )}
      <p className="sumber">
        Deviasi signifikan: selisih bulanan melebihi maks(2 × RMSE model, 10%), atau 3 bulan berturut-turut di atas harapan, atau data hilang.
        Hanya EnPI lingkup KINRA. Deviasi ke arah hemat juga diselidiki karena bisa menandakan meter atau data yang salah. Menutup deviasi dilakukan admin atau konsultan.
      </p>

      <dialog ref={dlg} className="panel" onClose={(e) => { if (e.target === e.currentTarget) setEdit(null) }}>
        {edit && (
          <form className="card" key={edit.d.kunci} action={(f) => mulai(async () => {
            const asal = edit.r ? null : {
              enpi_kode: edit.d.enpi_kode, tahun: edit.d.tahun, bulan: edit.d.bulan, jenis: edit.d.jenis, arah: edit.d.arah,
              aktual: edit.d.aktual, harapan: edit.d.harapan, selisih_persen: edit.d.selisih_persen,
            }
            const h = await simpanDeviasi(edit.r?.id ?? null, asal, f)
            if (!h.ok) return setGalat(h.pesan)
            dlg.current?.close(); router.refresh()
          })}>
            <div className="row">
              <div>
                <span className="eyebrow">{edit.d.enpi_kode} · {BULAN_PANJANG[edit.d.bulan - 1]} {edit.d.tahun} · {LABEL_JENIS[edit.d.jenis]}</span>
                <h3>{edit.r ? 'Penyelidikan deviasi' : 'Mulai selidiki deviasi'}</h3>
                <p className="muted small">
                  {edit.d.arah === 'data' ? 'Data bulan ini tidak lengkap.' : `Aktual ${angkaDev(edit.d.aktual, edit.d.satuan)} dibanding harapan ${angkaDev(edit.d.harapan, edit.d.satuan)} (${edit.d.selisih_persen !== null ? `${edit.d.selisih_persen > 0 ? '+' : ''}${angka(edit.d.selisih_persen, 1)}%` : '–'}).`}
                  {edit.r?.dibuka_oleh && ` Dibuka oleh ${edit.r.dibuka_oleh}.`}
                </p>
              </div>
              <button type="button" className="btn btn-ikon" aria-label="Tutup" onClick={() => dlg.current?.close()}><X aria-hidden="true" /></button>
            </div>
            <div className="form-grid">
              <label className="field"><span>Status</span>
                <select name="status" defaultValue={edit.r?.status ?? 'Diselidiki'}>
                  <option value="Diselidiki">Diselidiki</option>
                  <option value="Ditanggapi">Ditanggapi</option>
                  <option value="Ditutup" disabled={!bisa('deviasi.tutup')}>Ditutup (terverifikasi)</option>
                  <option value="Bukan deviasi" disabled={!bisa('deviasi.tutup')}>Bukan deviasi</option>
                </select>
              </label>
              <label className="field"><span>Kategori penyebab</span>
                <select name="kategori" defaultValue={edit.r?.kategori ?? ''}>
                  <option value="">Belum diketahui</option>
                  {Object.entries(LABEL_KATEGORI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </label>
              <label className="field full"><span>Uraian penyebab</span><textarea name="penyebab" defaultValue={edit.r?.penyebab ?? ''} placeholder="Apa yang terjadi? Data apa yang diperiksa (log operasi, tagihan, foto meter)?" /></label>
              <label className="field full"><span>Tindakan / tanggapan</span><textarea name="tindakan" defaultValue={edit.r?.tindakan ?? ''} placeholder="Koreksi, perbaikan, penyesuaian operasi, atau alasan tidak perlu tindakan" /></label>
              <label className="field"><span>PIC</span><input name="pic" defaultValue={edit.r?.pic ?? ''} /></label>
              <label className="field"><span>Tenggat</span><input type="date" name="tenggat" defaultValue={edit.r?.tenggat ?? ''} /></label>
              <label className="field full"><span>Rencana aksi terkait (opsional)</span>
                <select name="aksi_kode" defaultValue={edit.r?.aksi_kode ?? ''}>
                  <option value="">–</option>
                  {aksi.map((a) => <option key={a.kode} value={a.kode}>{a.kode} · {a.uraian.slice(0, 70)}</option>)}
                </select>
              </label>
            </div>
            {edit.r?.diverifikasi_oleh && <p className="muted small" style={{ marginTop: 10 }}>Diverifikasi {edit.r.diverifikasi_oleh}.</p>}
            {galat && <p className="pesan galat" role="alert" style={{ marginTop: 12 }}>{galat}</p>}
            <div className="toolbar" style={{ marginTop: 16, marginBottom: 0 }}>
              <button className="btn utama" type="submit" disabled={menunggu}>{menunggu ? 'Menyimpan…' : 'Simpan'}</button>
            </div>
          </form>
        )}
      </dialog>
    </div>
  )
}
