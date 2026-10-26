'use client'

import { Save, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { hapusDokumen, simpanDokumen } from '@/app/actions'
import { useBoleh } from '@/components/Peran'
import { KELOMPOK, STATUS, URUTAN_STATUS } from '@/lib/status'
import type { Dokumen, Klausul } from '@/lib/types'

export function FormDokumen({ dokumen, klausul }: { dokumen: Dokumen | null; klausul: Klausul[] }) {
  const router = useRouter()
  const bisa = useBoleh()
  const [pesan, setPesan] = useState<{ ok: boolean; teks: string } | null>(null)
  const [menunggu, mulai] = useTransition()
  const d = dokumen
  const bisaUbah = bisa(d ? 'dokumen.ubah' : 'dokumen.tambah')

  return (
    <form
      action={(f) => mulai(async () => {
        const h = await simpanDokumen(d?.id ?? null, f)
        if (!h.ok) return setPesan({ ok: false, teks: h.pesan })
        setPesan({ ok: true, teks: 'Tersimpan.' })
        if (!d && h.id) router.replace(`/dokumen/${h.id}`)
        else router.refresh()
      })}
    >
      <fieldset disabled={!bisaUbah} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <div className="form-grid">
        <label className="field"><span>Kode</span><input name="kode" required defaultValue={d?.kode ?? ''} placeholder="mis. R-9.2-03" /></label>
        <label className="field"><span>Klausul</span>
          <select name="klausul_kode" required defaultValue={d?.klausul_kode ?? '4.1'}>
            {klausul.map((k) => <option key={k.kode} value={k.kode}>{k.kode === 'P' ? 'Persiapan' : k.kode} · {k.judul}</option>)}
          </select>
        </label>
        <label className="field full"><span>Nama dokumen / rekaman</span><input name="nama" required defaultValue={d?.nama ?? ''} /></label>
        <label className="field"><span>Kelompok</span>
          <select name="kelompok" defaultValue={d?.kelompok ?? 'rekaman'}>
            {Object.entries(KELOMPOK).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
        <label className="field"><span>Status</span>
          <select name="status" defaultValue={d?.status ?? 'belum'}>
            {URUTAN_STATUS.map((s) => <option key={s} value={s} disabled={(s === 'disetujui' || s === 'final') && !bisa('dokumen.setujui')}>{STATUS[s].label}</option>)}
          </select>
        </label>
        <label className="field"><span>Nomor dokumen</span><input name="nomor_dokumen" defaultValue={d?.nomor_dokumen ?? ''} placeholder="mis. 001/SOP-003/KINRA/SMEn/X/2026" /></label>
        <label className="field"><span>PIC</span><input name="pic" defaultValue={d?.pic ?? ''} /></label>
        <label className="field"><span>Tenggat</span><input type="date" name="tenggat" defaultValue={d?.tenggat ?? ''} /></label>
        <label className="field"><span>Tanggal diterima</span><input type="date" name="tanggal_terima" defaultValue={d?.tanggal_terima ?? ''} /></label>
        <label className="field full"><span>Tautan evidence (OneDrive)</span><input type="url" name="link_eksternal" defaultValue={d?.link_eksternal ?? ''} placeholder="Tempel tautan berbagi OneDrive, mis. https://1drv.ms/…" /></label>
        <label className="field full"><span>Keterangan</span><textarea name="keterangan" defaultValue={d?.keterangan ?? ''} /></label>
      </div>
      </fieldset>
      {!bisaUbah && <p className="pesan" style={{ marginTop: 16 }}>Peran Anda hanya dapat melihat dokumen ini.</p>}
      <div className="toolbar" style={{ marginTop: 16, marginBottom: 0 }}>
        {bisaUbah && <button className="btn utama" type="submit" disabled={menunggu}><Save aria-hidden="true" /> {menunggu ? 'Menyimpan…' : 'Simpan'}</button>}
        {pesan && <span className={pesan.ok ? 'txt-good small' : 'txt-bad small'} role="status">{pesan.teks}</span>}
        <span style={{ flex: 1 }} />
        {d && bisa('dokumen.hapus') && (
          <button type="button" className="btn bahaya" disabled={menunggu} onClick={() => {
            if (!confirm(`Hapus dokumen ${d.kode}? Berkas di OneDrive tidak ikut terhapus.`)) return
            mulai(async () => {
              const h = await hapusDokumen(d.id)
              if (h.ok) router.replace('/kesiapan')
              else setPesan({ ok: false, teks: h.pesan })
            })
          }}><Trash2 aria-hidden="true" /> Hapus</button>
        )}
      </div>
    </form>
  )
}
