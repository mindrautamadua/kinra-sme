import { SectionHead } from '@/components/SectionHead'
import { Istilah } from '@/components/Istilah'
import { ambilKinerja } from '@/lib/data'
import { METER_WTP, METER_WTP_SEMUA } from '@/lib/lab-enpi'
import { LabEnpi } from './LabEnpi'

export const dynamic = 'force-dynamic'

export default async function Laboratorium() {
  const { meter, bacaan, variabel, dataVariabel } = await ambilKinerja()
  const kodeVar = ['air_olahan', 'air_wtp1']
  const data = {
    meter: meter.filter((m) => METER_WTP_SEMUA.includes(m.kode)),
    bacaan: bacaan.filter((b) => METER_WTP_SEMUA.includes(b.meter_kode)),
    variabel: variabel.filter((v) => kodeVar.includes(v.kode)),
    dataVariabel: dataVariabel.filter((d) => kodeVar.includes(d.variabel_kode)),
  }
  return (
    <section>
      <SectionHead hero eyebrow={<>Klausul 6.4, 6.5 & 9.1 · latihan <Istilah kata="EnPI" />, <Istilah kata="EnB" />, dan <Istilah kata="CUSUM" /></>} judul="Laboratorium EnPI">
        <p className="muted">Eksperimen di atas data nyata WTP I (meter {METER_WTP} dan intake) dengan mesin perhitungan yang sama dengan halaman Kinerja Energi. Ubah metode, variabel, dan baseline untuk melihat bagaimana kesimpulan kinerja bisa berubah, lalu suntikkan gangguan untuk melatih membaca CUSUM dan deviasi. Tidak ada data yang diubah.</p>
      </SectionHead>
      <LabEnpi data={data} />
    </section>
  )
}
