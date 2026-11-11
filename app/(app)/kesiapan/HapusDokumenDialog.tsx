'use client'

import { AlertTriangle, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'
import { hapusDokumen } from '@/app/actions'
import { cocokKata, KetikKonfirmasi } from '@/components/KetikKonfirmasi'
import type { Dokumen } from '@/lib/types'

/** Modal konfirmasi hapus satu item lembar Kesiapan. `d` null = tertutup. Pengguna harus mengetik kode item. */
export function HapusDokumenDialog({ d, onTutup, onSelesai }: { d: Dokumen | null; onTutup: () => void; onSelesai?: () => void }) {
  const router = useRouter()
  const dlg = useRef<HTMLDialogElement>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [sibuk, mulai] = useTransition()
  const [ketik, setKetik] = useState('')
  const cocok = !!d && cocokKata(ketik, d.kode)

  useEffect(() => {
    const el = dlg.current
    if (!el) return
    if (d && !el.open) { setGalat(null); setKetik(''); el.showModal() }
    if (!d && el.open) el.close()
  }, [d])

  function hapus() {
    if (!d || !cocok) return
    mulai(async () => {
      const h = await hapusDokumen(d.id)
      if (!h.ok) { setGalat(h.pesan); return }
      onTutup()
      if (onSelesai) onSelesai(); else router.refresh()
    })
  }

  const berkas = d?.jumlah_berkas ?? 0
  return (
    <dialog ref={dlg} className="panel ks-hapus" aria-labelledby="judul-hapus-dok"
      onCancel={(e) => { if (sibuk) e.preventDefault() }}
      onClose={(e) => { if (e.target === e.currentTarget) onTutup() }}>
      {d && (
        <div className="card">
          <div className="row">
            <div>
              <span className="eyebrow">{d.kode} · Hapus item</span>
              <h3 id="judul-hapus-dok">Hapus “{d.nama}”?</h3>
            </div>
            <button type="button" className="btn btn-ikon" aria-label="Tutup" disabled={sibuk} onClick={() => dlg.current?.close()}><X aria-hidden="true" /></button>
          </div>
          <div className="pesan galat ks-hapus-peringatan">
            <AlertTriangle aria-hidden="true" />
            <div>
              <b>Tindakan ini tidak dapat dibatalkan.</b>
              <ul>
                <li>Item {d.kode} hilang dari lembar Kesiapan dan skor kesiapan klausul {d.klausul_kode === 'P' ? 'Persiapan' : d.klausul_kode}.</li>
                {berkas > 0
                  ? <li><b>{berkas} berkas evidence</b> ikut terhapus permanen dari penyimpanan.</li>
                  : <li>Belum ada berkas evidence yang terunggah.</li>}
                <li>Riwayat status, posisi draf, dan keterangan ikut terhapus. Temuan audit yang tertaut tetap ada, tanpa tautan dokumen.</li>
              </ul>
            </div>
          </div>
          <KetikKonfirmasi kata={d.kode} nilai={ketik} onUbah={setKetik} onKirim={hapus} disabled={sibuk} />
          {galat && <p className="pesan galat small" role="alert">{galat}</p>}
          <div className="ks-catatan-aksi">
            <button type="button" className="btn" disabled={sibuk} onClick={() => dlg.current?.close()} autoFocus>Batal</button>
            <button type="button" className="btn hapus-tegas" disabled={sibuk || !cocok} onClick={hapus}>
              <Trash2 aria-hidden="true" /> {sibuk ? 'Menghapus…' : 'Hapus permanen'}
            </button>
          </div>
        </div>
      )}
    </dialog>
  )
}
