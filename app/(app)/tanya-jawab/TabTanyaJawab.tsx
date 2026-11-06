'use client'

import { type ReactNode, useState } from 'react'

/** Tab "Bank soal" dan "Simulasi bersama KIRA" di halaman Tanya Jawab Audit. */
export function TabTanyaJawab({ bank, simulasi }: { bank: ReactNode; simulasi: ReactNode }) {
  const [tab, setTab] = useState<'bank' | 'simulasi'>('bank')
  return (
    <>
      <div className="toolbar">
        <div className="seg" role="tablist" aria-label="Mode tanya jawab">
          <button type="button" role="tab" aria-selected={tab === 'bank'} onClick={() => setTab('bank')}>Bank soal</button>
          <button type="button" role="tab" aria-selected={tab === 'simulasi'} onClick={() => setTab('simulasi')}>Simulasi bersama KIRA</button>
        </div>
      </div>
      <div hidden={tab !== 'bank'}>{bank}</div>
      <div hidden={tab !== 'simulasi'}>{simulasi}</div>
    </>
  )
}
