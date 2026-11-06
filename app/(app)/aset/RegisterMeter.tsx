'use client'

import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { hapusMeter, simpanMeter } from '@/app/actions'
import { Chip } from '@/components/Chip'
import { useBoleh } from '@/components/Peran'
import { angka, hariIni, tanggal } from '@/lib/format'
import type { Aset, MeterEnergi, SumberEnergi } from '@/lib/types'
import { KonfirmasiHapus } from './KonfirmasiHapus'

const kodeBerikut = (daftar: { kode: string }[]) =>
  `KINRA-MTR-${String(Math.max(0, ...daftar.map((x) => Number(x.kode.replace(/\D/g, '')) || 0)) + 1).padStart(3, '0')}`

export function RegisterMeter({ meter, aset, sumber, jumlahBacaan }: {
  meter: MeterEnergi[]; aset: Aset[]; sumber: SumberEnergi[]; jumlahBacaan: Record<string, number>
}) {
  const router = useRouter()
  const bisa = useBoleh()
  const dlg = useRef<HTMLDialogElement>(null)
  const [edit, setEdit] = useState<MeterEnergi | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [hapus, setHapus] = useState<MeterEnergi | null>(null)
  const [menunggu, mulai] = useTransition()
  const kini = hariIni()
  const namaAset = (k: string | null) => aset.find((a) => a.kode === k)?.nama ?? null

  function buka(m: MeterEnergi | null) { setEdit(m); setGalat(null); dlg.current?.showModal() }

  return (
    <>
      <div className="toolbar">
        <span className="muted small" style={{ flex: 1 }}>{meter.length} meter terdaftar · {meter.filter((m) => !m.kalibrasi_terakhir).length} belum ada data kalibrasi/verifikasi</span>
        {bisa('aset.ubah') && <button type="button" className="btn utama" onClick={() => buka(null)}><Plus aria-hidden="true" /><span className="teks">Tambah meter</span></button>}
      </div>
      <div className="card">
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Kode</th><th>No. meter · jenis</th><th>Lokasi · aset</th><th className="num">Faktor</th><th>Akurasi</th><th>Pencatatan</th><th>Kalibrasi berikutnya</th><th /></tr></thead>
            <tbody>
              {meter.length === 0 && <tr className="kosong"><td colSpan={8}>Belum ada meter.</td></tr>}
              {meter.map((m) => {
                const lewat = !!m.kalibrasi_berikutnya && m.kalibrasi_berikutnya < kini
                return (
                  <tr key={m.kode} className={lewat ? 'lewat' : undefined}>
                    <td className="kode">{m.kode}<span className="upd">{sumber.find((s) => s.kode === m.sumber_kode)?.nama ?? m.sumber_kode ?? '–'}</span></td>
                    <td><span className="mono">{m.no_meter ?? '–'}</span><span className="upd">{m.jenis ?? 'Jenis belum diisi'}</span></td>
                    <td>{m.lokasi ?? '–'}<span className="upd">{namaAset(m.aset_kode) ?? 'Belum ditautkan ke aset'}</span></td>
                    <td className="num">×{angka(m.faktor_kali, 2)}</td>
                    <td className="small">{m.kelas_akurasi ?? '–'}</td>
                    <td className="small">{m.frekuensi_pencatatan ?? '–'}<span className="upd">{m.metode_pengiriman ?? ''}</span></td>
                    <td className="small">
                      {m.kalibrasi_berikutnya ? <span className={lewat ? 'txt-bad' : undefined}>{tanggal(m.kalibrasi_berikutnya)}</span> : <Chip kode="na" label="Belum diisi" />}
                      {m.kalibrasi_terakhir && <span className="upd">Terakhir {tanggal(m.kalibrasi_terakhir)}</span>}
                    </td>
                    <td>
                      <div className="ks-aksi-baris">
                        {bisa('aset.ubah') && <button type="button" className="btn btn-ikon" aria-label={`Ubah ${m.kode}`} onClick={() => buka(m)}><Pencil aria-hidden="true" /></button>}
                        {bisa('aset.hapus') && <button type="button" className="btn btn-ikon" aria-label={`Hapus ${m.kode}`} onClick={() => setHapus(m)}><Trash2 aria-hidden="true" /></button>}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="sumber">Faktor kali = rasio CT/PT; konsumsi bulanan dihitung dari selisih stand × faktor ini. Baris bergaris merah = jadwal kalibrasi/verifikasi sudah lewat (klausul 9.1).</p>
      </div>

      <dialog ref={dlg} className="panel" onClose={(e) => { if (e.target === e.currentTarget) setEdit(null) }}>
        <form className="card" key={edit?.kode ?? 'baru'} action={(f) => mulai(async () => {
          const h = await simpanMeter(edit?.kode ?? null, f)
          if (!h.ok) return setGalat(h.pesan)
          dlg.current?.close(); router.refresh()
        })}>
          <div className="row"><h3>{edit ? `Ubah ${edit.kode}` : 'Meter baru'}</h3><button type="button" className="btn btn-ikon" aria-label="Tutup" onClick={() => dlg.current?.close()}><X aria-hidden="true" /></button></div>
          <div className="form-grid">
            <label className="field"><span>Kode meter</span><input name="kode" required defaultValue={edit?.kode ?? kodeBerikut(meter)} /></label>
            <label className="field"><span>No. urut</span><input type="number" name="no_urut" min={0} defaultValue={edit?.no_urut ?? meter.length + 1} /></label>
            <label className="field"><span>No. meter/gauge</span><input name="no_meter" defaultValue={edit?.no_meter ?? ''} /></label>
            <label className="field"><span>Jenis/tipe alat ukur</span><input name="jenis" defaultValue={edit?.jenis ?? ''} placeholder="mis. Edmi MK10E" /></label>
            <label className="field"><span>Sumber energi</span>
              <select name="sumber_kode" defaultValue={edit?.sumber_kode ?? 'pln'}>
                <option value="">–</option>
                {sumber.map((s) => <option key={s.kode} value={s.kode}>{s.nama}</option>)}
              </select>
            </label>
            <label className="field"><span>Satuan</span><input name="satuan" defaultValue={edit?.satuan ?? 'kWh'} /></label>
            <label className="field"><span>Lokasi meter</span><input name="lokasi" defaultValue={edit?.lokasi ?? ''} /></label>
            <label className="field"><span>Gedung/area yang dilayani</span><input name="area_dilayani" defaultValue={edit?.area_dilayani ?? ''} /></label>
            <label className="field full"><span>Aset yang diukur</span>
              <select name="aset_kode" defaultValue={edit?.aset_kode ?? ''}>
                <option value="">Belum ditautkan</option>
                {aset.map((a) => <option key={a.kode} value={a.kode}>{a.kode} · {a.nama}</option>)}
              </select>
            </label>
            <label className="field full"><span>Beban/peralatan yang diukur</span><input name="beban_diukur" defaultValue={edit?.beban_diukur ?? ''} /></label>
            <label className="field"><span>Faktor kali (CT/PT)</span><input type="number" name="faktor_kali" min={0} step="any" required defaultValue={edit?.faktor_kali ?? 1} /></label>
            <label className="field"><span>Akurasi/kelas</span><input name="kelas_akurasi" defaultValue={edit?.kelas_akurasi ?? ''} placeholder="mis. 0,5 S, 3 phasa" /></label>
            <label className="field"><span>Kapasitas/range</span><input name="kapasitas" defaultValue={edit?.kapasitas ?? ''} /></label>
            <label className="field"><span>Status meter</span><input name="status" defaultValue={edit?.status ?? ''} placeholder="mis. Berfungsi baik" /></label>
            <label className="field"><span>PIC area</span><input name="pic_area" defaultValue={edit?.pic_area ?? ''} /></label>
            <label className="field"><span>PIC meter/data</span><input name="pic_data" defaultValue={edit?.pic_data ?? ''} /></label>
            <label className="field"><span>Interval pembacaan</span><input name="interval_pembacaan" defaultValue={edit?.interval_pembacaan ?? ''} /></label>
            <label className="field"><span>Frekuensi pencatatan</span><input name="frekuensi_pencatatan" defaultValue={edit?.frekuensi_pencatatan ?? 'Bulanan'} /></label>
            <label className="field"><span>Kalibrasi/verifikasi terakhir</span><input type="date" name="kalibrasi_terakhir" defaultValue={edit?.kalibrasi_terakhir ?? ''} /></label>
            <label className="field"><span>Kalibrasi/verifikasi berikutnya</span><input type="date" name="kalibrasi_berikutnya" defaultValue={edit?.kalibrasi_berikutnya ?? ''} /></label>
            <label className="field"><span>Metode pengiriman data</span><input name="metode_pengiriman" defaultValue={edit?.metode_pengiriman ?? 'Manual'} placeholder="Manual / AMR / AMI" /></label>
            <label className="field"><span>Lokasi penyimpanan data</span><input name="penyimpanan_data" defaultValue={edit?.penyimpanan_data ?? ''} /></label>
            <label className="field full"><span>Kandidat SEU terkait</span><input name="kandidat_seu" defaultValue={edit?.kandidat_seu ?? ''} /></label>
            <label className="field full"><span>Bukti pendukung</span><input name="bukti_pendukung" defaultValue={edit?.bukti_pendukung ?? ''} placeholder="Foto meter, tagihan, log pembacaan" /></label>
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
          judul: `Hapus meter ${hapus.kode}?`,
          poin: [
            `Meter ${hapus.no_meter ?? hapus.kode} (${hapus.lokasi ?? 'tanpa lokasi'}) hilang dari register meter.`,
            (jumlahBacaan[hapus.kode] ?? 0) > 0 ? `${jumlahBacaan[hapus.kode]} bacaan stand bulanan meter ini ikut terhapus.` : 'Belum ada bacaan stand untuk meter ini.',
          ],
          hapus: () => hapusMeter(hapus.kode),
        }} />
    </>
  )
}
