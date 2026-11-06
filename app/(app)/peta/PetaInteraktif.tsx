'use client'

import { ArrowRight, MessageCircle } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Chip } from '@/components/Chip'
import { type Fase, LABEL_STATUS, type StatusTahap, type Tahap } from '@/lib/peta-smen'
import type { KodeChip } from '@/lib/status'

const CHIP: Record<StatusTahap, KodeChip> = { selesai: 'good', berjalan: 'info', menunggu: 'warn', belum: 'crit' }
const FASE: { fase: Fase; judul: string; ket: string }[] = [
  { fase: 'Plan', judul: 'Rencanakan', ket: 'Pahami energi Anda dan tetapkan target' },
  { fase: 'Do', judul: 'Lakukan', ket: 'Jalankan dengan orang yang kompeten' },
  { fase: 'Check', judul: 'Periksa', ket: 'Ukur dan audit' },
  { fase: 'Act', judul: 'Perbaiki', ket: 'Direksi memutuskan, siklus berulang' },
]

export function PetaInteraktif({ tahap, awal }: { tahap: Tahap[]; awal: number }) {
  const [pilih, setPilih] = useState(awal)
  const t = tahap.find((x) => x.no === pilih) ?? tahap[0]
  const nama = (n: number) => tahap.find((x) => x.no === n)?.nama ?? ''
  const tanya = () => window.dispatchEvent(new CustomEvent('kira:tanya', {
    detail: `Jelaskan tahap "${t.nama}" (klausul ${t.klausul}) ISO 50001 dengan bahasa sederhana untuk orang awam, kondisi KINRA saat ini, dan apa yang harus kami lakukan berikutnya.`,
  }))

  return (
    <div className="pt-wrap">
      <div className="pt-fase-grid">
        {FASE.map((f) => (
          <div key={f.fase} className={`pt-fase f-${f.fase.toLowerCase()}`}>
            <div className="pt-fase-kepala"><span className="eyebrow">{f.fase}</span><b>{f.judul}</b><span className="muted small">{f.ket}</span></div>
            <ol className="pt-tahap">
              {tahap.filter((x) => x.fase === f.fase).map((x) => (
                <li key={x.no}>
                  <button type="button" aria-pressed={x.no === pilih} onClick={() => setPilih(x.no)} className={`pt-node s-${x.status}`}>
                    <span className="pt-no">{x.no}</span>
                    <span className="pt-nama">{x.nama}</span>
                    <Chip kode={CHIP[x.status]} label={LABEL_STATUS[x.status]} />
                  </button>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

      <article className="card pt-panel" aria-live="polite">
        <div className="row">
          <div>
            <span className="eyebrow">Tahap {t.no} · {t.fase} · klausul {t.klausul}</span>
            <h3>{t.nama}</h3>
          </div>
          <Chip kode={CHIP[t.status]} label={LABEL_STATUS[t.status]} />
        </div>
        <dl className="pt-isi">
          <div><dt>Artinya</dt><dd>{t.artinya}</dd></div>
          <div><dt>Di KINRA sekarang</dt><dd>{t.diKinra}</dd></div>
          <div><dt>Auditor akan bertanya</dt><dd>&ldquo;{t.auditor}&rdquo;</dd></div>
          {t.langkah && <div><dt>Langkah berikutnya</dt><dd><b>{t.langkah}</b></dd></div>}
          {(t.tergantung.length > 0 || t.memengaruhi.length > 0) && (
            <div><dt>Keterkaitan</dt><dd className="pt-kait">
              {t.tergantung.length > 0 && <span>Bergantung pada: {t.tergantung.map((n) => <button key={n} type="button" className="pt-tautan" onClick={() => setPilih(n)}>{n} {nama(n)}</button>)}</span>}
              {t.memengaruhi.length > 0 && <span>Memengaruhi: {t.memengaruhi.map((n) => <button key={n} type="button" className="pt-tautan" onClick={() => setPilih(n)}>{n} {nama(n)}</button>)}</span>}
            </dd></div>
          )}
        </dl>
        <div className="toolbar" style={{ marginTop: 14, marginBottom: 0 }}>
          <Link className="btn utama" href={t.href}><span className="teks">Buka halaman terkait</span><ArrowRight aria-hidden="true" /></Link>
          <button type="button" className="btn" onClick={tanya}><MessageCircle aria-hidden="true" /><span className="teks">Tanya KIRA tentang tahap ini</span></button>
        </div>
      </article>
    </div>
  )
}
