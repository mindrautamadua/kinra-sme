'use client'

import type { HasilTahap } from '@/lib/alur-wtp'
import { Fm, KerangkaAlur, Kwh, Pompa } from '../alur-wtp/KerangkaAlur'

const POSISI_NOMOR: Record<number, [number, number]> = {
  1: [1112, 284], 2: [842, 226], 3: [622, 326], 4: [407, 326], 5: [192, 326], 6: [196, 140], 7: [180, 60], 8: [40, 404],
}

const LAPISAN = [['listrik', 'Meter listrik', 'var(--warn)'], ['fm', 'Data volume', 'var(--brand)'], ['nomor', 'Nomor tahap', 'var(--ink)']] as const

/** Aerator mekanis: batang ke bawah dengan impeler di permukaan, digambar seperti simbol di gambar sumber. */
function Aerator({ x, y }: { x: number; y: number }) {
  return (
    <g className="aw-aerator" transform={`translate(${x},${y})`}>
      <rect x="-9" y="-14" width="18" height="24" rx="2" /><path d="M0,-6 V18 M-7,18 H7" />
    </g>
  )
}

function Kolam({ x, y, w, h, nama, sub, aerator }: { x: number; y: number; w: number; h: number; nama: string; sub: string; aerator: [number, number][] }) {
  return (
    <>
      <rect className="aw-kotak baku" x={x} y={y} width={w} height={h} rx="16" />
      {aerator.map(([ax, ay]) => <Aerator key={`${ax}-${ay}`} x={x + ax} y={y + ay} />)}
      <text className="aw-lbl" x={x + w / 2} y={y + h / 2 + 4} textAnchor="middle">{nama}</text>
      <text className="aw-sub" x={x + w / 2} y={y + h / 2 + 20} textAnchor="middle">{sub}</text>
    </>
  )
}

export function DiagramWwtp({ tahap }: { tahap: HasilTahap[] }) {
  const n = (no: number) => tahap.find((t) => t.no === no)
  const jumlahAerator = (no: number) => n(no)?.pompa.filter((p) => /aerator/i.test(p.nama)).length ?? 0
  return (
    <KerangkaAlur tahap={tahap} posisiNomor={POSISI_NOMOR} viewBox="0 0 1300 620" awal={3} lapisan={LAPISAN}
      label="Diagram alir WWTP IPAL I: air limbah tenant masuk influent chamber, dipompa ke ekualisasi, lalu tiga kolam aerasi, clarifier dengan lumpur balik ke Aerasi I dan lumpur buang ke sludge drying bed, kolam indikator, lalu ke sungai."
      legenda={<>
        <span><i className="aw-garis baku" />Air limbah</span>
        <span><i className="aw-garis olah" />Effluent (air olahan)</span>
        <span><i className="aw-garis lumpur" />Lumpur / kimia / nutrisi</span>
        <span><b>Kotak kuning</b> meter kWh; seluruh IPAL I satu meter (MTR-004), belum ada submeter</span>
        <span>Simbol aerator mengikuti gambar sumber; jumlah per kolam dari register</span>
      </>}>
      <defs>
        {(['baku', 'olah', 'lumpur'] as const).map((j) => (
          <marker key={j} id={`aw-panah-${j}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" className={`aw-isi-${j}`} />
          </marker>
        ))}
      </defs>

      {/* Badan air, kolam indikator, clarifier */}
      <path className="aw-pipa olah" d="M250,45 V14" markerEnd="url(#aw-panah-olah)" />
      <text className="aw-lbl kecil" x="268" y="22">Badan air penerima (sungai)</text>
      <rect className="aw-kotak olah" x="170" y="45" width="160" height="50" rx="22" />
      <text className="aw-lbl" x="250" y="75" textAnchor="middle">Kolam Indikator</text>
      <path className="aw-pipa olah" d="M250,128 V98" markerEnd="url(#aw-panah-olah)" />
      <rect className="aw-isi-olah" x="244" y="106" width="12" height="12" />
      <text className="aw-kcl" x="236" y="116" textAnchor="end">titik koordinat</text>
      <Fm x={262} y={114} label="OUT" />
      <text className="aw-kcl" x="300" y="118">effluent</text>

      <circle className="aw-kotak olah" cx="250" cy="192" r="62" />
      <rect className="aw-dosing" x="182" y="187" width="136" height="9" rx="2" />
      <path className="aw-pipa olah tipis" d="M222,236 L296,172" />
      <text className="aw-lbl" x="246" y="168" textAnchor="middle">Clarifier</text>
      <text className="aw-sub" x="250" y="222" textAnchor="middle">+ vario motor</text>
      <path className="aw-pipa baku" d="M250,300 V256" markerEnd="url(#aw-panah-baku)" />

      {/* RAS dan WAS */}
      <path className="aw-lumpur" d="M306,218 H350" />
      <Pompa x={362} y={205} jenis="olah" /><Pompa x={362} y={235} jenis="olah" />
      <path className="aw-lumpur" d="M383,205 H700 V296" markerEnd="url(#aw-panah-lumpur)" />
      <text className="aw-kcl" x="470" y="198">Return Activated Sludge (RAS) ke Aerasi I</text>
      <path className="aw-lumpur" d="M362,246 V262 H82 V412" markerEnd="url(#aw-panah-lumpur)" />
      <text className="aw-kcl" x="96" y="278">Wasted Activated Sludge (WAS)</text>
      <rect className="aw-kotak baku" x="14" y="414" width="136" height="70" rx="4" />
      <text className="aw-lbl kecil" x="82" y="446" textAnchor="middle">Sludge Drying Bed</text>
      <text className="aw-sub" x="82" y="462" textAnchor="middle">pengering lumpur</text>

      {/* Tiga kolam aerasi */}
      <Kolam x={170} y={300} w={200} h={220} nama="Aerasi III" sub={`${jumlahAerator(5)} aerator`} aerator={[[40, 50], [160, 90], [40, 170]]} />
      <Kolam x={385} y={300} w={200} h={220} nama="Aerasi II" sub={`${jumlahAerator(4)} aerator`} aerator={[[40, 50], [160, 90], [40, 170]]} />
      <Kolam x={600} y={300} w={200} h={220} nama="Aerasi I" sub={`${jumlahAerator(3)} aerator`} aerator={[[40, 50], [160, 90], [40, 170]]} />
      {[[600, 360], [600, 470], [385, 360], [385, 470]].map(([x, y]) => (
        <path key={`${x}-${y}`} className="aw-pipa baku tipis" d={`M${x + 6},${y} H${x - 13}`} markerEnd="url(#aw-panah-baku)" />
      ))}
      <text className="aw-kcl" x="592" y="292" textAnchor="middle">lubang aliran antar sekat</text>

      {/* Ekualisasi */}
      <Kolam x={820} y={210} w={220} h={310} nama="Ekualisasi" sub={`${jumlahAerator(2)} aerator pengaduk`} aerator={[[45, 50], [180, 50], [180, 170], [180, 260]]} />
      <Pompa x={860} y={400} jenis="baku" /><Pompa x={860} y={430} jenis="baku" /><Pompa x={860} y={460} jenis="baku" />
      <path className="aw-pipa baku" d="M850,430 H804" markerEnd="url(#aw-panah-baku)" />
      <text className="aw-kcl" x="842" y="490">pompa transfer</text>
      <path className="aw-lumpur" d="M985,160 V206" markerEnd="url(#aw-panah-lumpur)" />
      <text className="aw-kcl" x="985" y="152" textAnchor="middle">injeksi kimia</text>

      {/* Influent chamber */}
      <rect className="aw-kotak baku" x="1100" y="270" width="150" height="230" rx="8" />
      <text className="aw-lbl" x="1175" y="262" textAnchor="middle">Influent Chamber</text>
      <text className="aw-kcl" x="1175" y="314" textAnchor="middle">bak penampung</text>
      <path className="aw-sekat" d="M1100,380 H1250 M1100,396 H1250" />
      <text className="aw-kcl" x="1175" y="414" textAnchor="middle">bak kontrol (oil trap)</text>
      <path className="aw-pipa baku tipis" d="M1130,430 V480 M1175,430 V480 M1220,430 V480" />
      <text className="aw-kcl" x="1175" y="494" textAnchor="middle">gate &amp; fine screen</text>
      <Pompa x={1072} y={320} jenis="baku" /><Pompa x={1072} y={348} jenis="baku" /><Pompa x={1072} y={376} jenis="baku" />
      <path className="aw-pipa baku" d="M1100,348 H1086 M1062,348 H1044" markerEnd="url(#aw-panah-baku)" />
      <path className="aw-pipa baku" d="M1290,580 H1265 V504" markerEnd="url(#aw-panah-baku)" />
      <Fm x={1206} y={580} label="IN" />
      <text className="aw-kcl" x="1288" y="600" textAnchor="end">air limbah tenant (influent)</text>

      {/* Nutrisi dan sirkulasi di bawah kolam aerasi */}
      <path className="aw-lumpur" d="M270,548 H700 M270,548 V524 M485,548 V524 M700,548 V524" />
      <text className="aw-kcl" x="485" y="562" textAnchor="middle">injeksi nutrisi</text>
      <Pompa x={210} y={585} jenis="baku" /><Pompa x={244} y={585} jenis="baku" />
      <path className="aw-pipa baku tipis" d="M210,520 V574 M266,585 H760 V524" markerEnd="url(#aw-panah-baku)" />
      <text className="aw-kcl" x="520" y="602" textAnchor="middle">pompa sirkulasi ke kolam aerasi</text>

      {/* Meter listrik */}
      <g className="aw-lap aw-l-listrik">
        <Kwh x={1082} y={186} label="MTR-004 · seluruh IPAL I" pasti w={168} />
      </g>
    </KerangkaAlur>
  )
}
