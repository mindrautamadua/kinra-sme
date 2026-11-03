'use client'

import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { buatIsian } from '@/app/actions'
import { useBoleh } from '@/components/Peran'

export function BuatIsian({ kode, varian, adaPeriode, sumber }: {
  kode: string
  varian: string[]
  adaPeriode: boolean
  sumber: { id: string; judul: string }[]
}) {
  const router = useRouter()
  const bisa = useBoleh()
  const [galat, setGalat] = useState<string | null>(null)
  const [menunggu, mulai] = useTransition()

  if (!bisa('formulir.isi')) return <p className="pesan">Peran Anda hanya dapat melihat isian formulir.</p>

  return (
    <form action={(f) => mulai(async () => {
      setGalat(null)
      const h = await buatIsian(kode, f)
      if (!h.ok) return setGalat(h.pesan)
      router.push(`/formulir/isian/${h.id}`)
    })}>
      <div className="form-grid">
        {varian.length > 0 && (
          <label className="field full"><span>Bagian</span>
            <select name="varian" required defaultValue="">
              <option value="" disabled>Pilih bagian…</option>
              {varian.map((v) => <option key={v}>{v}</option>)}
            </select>
          </label>
        )}
        <label className="field full"><span>Periode {adaPeriode ? '' : '(opsional)'}</span>
          <input name="periode" required={adaPeriode} placeholder={adaPeriode ? 'mis. November 2026' : 'mis. 2026 atau Triwulan IV 2026'} />
        </label>
        <label className="field full"><span>Judul isian (opsional)</span>
          <input name="judul" placeholder="Otomatis: nama formulir · bagian · periode" />
        </label>
        {sumber.length > 0 && (
          <label className="field full"><span>Mulai dari</span>
            <select name="salin" defaultValue="">
              <option value="">Isi contoh dari formulir asli</option>
              {sumber.map((s) => <option key={s.id} value={s.id}>Salinan: {s.judul}</option>)}
            </select>
          </label>
        )}
      </div>
      {galat && <p className="pesan" role="alert" style={{ marginTop: 12 }}>{galat}</p>}
      <div className="toolbar" style={{ marginTop: 16, marginBottom: 0 }}>
        <button className="btn utama" type="submit" disabled={menunggu}><Plus aria-hidden="true" /> {menunggu ? 'Membuat…' : 'Buat isian'}</button>
      </div>
    </form>
  )
}
