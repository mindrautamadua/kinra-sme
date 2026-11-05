'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ubahStatusDokumen } from '@/app/actions'
import { Chip } from '@/components/Chip'
import { PILIHAN_STATUS, STATUS_DOKUMEN } from '@/lib/status'
import type { Dokumen, StatusDokumen } from '@/lib/types'

/** Sel "Status" di lembar Kesiapan: Belum ada / Draft / Final. Tersimpan langsung saat dipilih. */
export function StatusDokumenSel({ d, bisaUbah }: { d: Dokumen; bisaUbah: boolean }) {
  const router = useRouter()
  const [nilai, setNilai] = useState<StatusDokumen>(d.status)
  const [galat, setGalat] = useState<string | null>(null)
  const [sibuk, mulai] = useTransition()
  const info = STATUS_DOKUMEN[d.status] ?? STATUS_DOKUMEN.belum

  if (!bisaUbah) return <Chip kode={info.chip} label={info.label} />

  // Status lama (Review/Disetujui) tetap muncul sebagai pilihan agar tidak tertimpa tanpa sengaja
  const pilihan = PILIHAN_STATUS.includes(d.status) ? PILIHAN_STATUS : [...PILIHAN_STATUS, d.status]

  function ganti(s: StatusDokumen) {
    const lama = nilai
    setNilai(s); setGalat(null)
    mulai(async () => {
      const h = await ubahStatusDokumen(d.id, s)
      if (!h.ok) { setNilai(lama); setGalat(h.pesan); return }
      router.refresh()
    })
  }

  return (
    <>
      <select className={`ks-status s-${nilai}`} value={nilai} disabled={sibuk} onChange={(e) => ganti(e.target.value as StatusDokumen)}
        aria-label={`Status ${d.kode}`}>
        {pilihan.map((s) => <option key={s} value={s}>{STATUS_DOKUMEN[s].label}</option>)}
      </select>
      {galat && <span className="upd txt-bad" role="alert">{galat}</span>}
    </>
  )
}
