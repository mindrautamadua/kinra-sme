/**
 * Data untuk halaman "Ke Mana Energi KINRA Pergi?": konsumsi energi lingkup KINRA 12 bulan terakhir
 * yang datanya lengkap, dari bacaan meter aset (kWh) dan BBM (liter → kWh setara).
 */
import { konsumsiBacaan } from './enpi'
import { KWH_PER_LITER, type Konversi, nilaiEnergi } from './konversi'
import type { Aset, EnergiBulanan, MeterEnergi, PembacaanMeter, VariabelBulanan } from './types'

export type BagianEnergi = { id: string; nama: string; kwh: number; porsi: number; kelompok: 'air' | 'gedung' | 'bbm' }

export type CeritaEnergi = {
  periode: { mulai: string; selesai: string; bulan: number }
  totalKwh: number
  rupiah: number
  tonCo2: number
  bagian: BagianEnergi[]
  wtp: { kwh: number; m3: number | null; kwhPerM3: number | null; bulanAir: number } | null
  wwtp: { kwhBulan: number } | null
}

const kunci = (t: number, b: number) => t * 12 + b - 1
const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const label = (k: number) => `${BULAN[k % 12]} ${Math.floor(k / 12)}`

const NAMA_ASET: Record<string, string> = { 'KINRA-MTR-005': 'Pengolahan air bersih (WTP 1 + intake)', 'KINRA-MTR-004': 'Pengolahan air limbah (WWTP)' }
/** Meter intake (terpisah sejak migrasi 0043) digabung ke bagian WTP 1. */
const WTP = 'KINRA-MTR-005', INTAKE = 'KINRA-MTR-008'

export function susunCerita(o: { meter: MeterEnergi[]; bacaan: PembacaanMeter[]; aset: Aset[]; energi: EnergiBulanan[]; dataVariabel: VariabelBulanan[]; kv: Konversi }): CeritaEnergi | null {
  const meterKwh = o.meter.filter((m) => m.satuan.toLowerCase() === 'kwh')
  if (!meterKwh.length) return null
  // Bulan terakhir yang semua meter kWh terbaca
  const perBulan = new Map<number, Map<string, number>>()
  for (const b of o.bacaan) {
    const m = meterKwh.find((x) => x.kode === b.meter_kode)
    const v = m && konsumsiBacaan(b, m)
    if (v === null || v === undefined) continue
    const k = kunci(b.tahun, b.bulan)
    if (!perBulan.has(k)) perBulan.set(k, new Map())
    perBulan.get(k)!.set(b.meter_kode, v)
  }
  const lengkap = [...perBulan.entries()].filter(([, mp]) => mp.size >= meterKwh.length).map(([k]) => k).sort((a, b) => a - b)
  if (!lengkap.length) return null
  const akhir = lengkap.at(-1)!
  const jendela = lengkap.filter((k) => k > akhir - 12)

  // Intake dijumlahkan ke WTP 1 per bulan
  for (const mp of perBulan.values()) if (mp.has(INTAKE) && mp.has(WTP)) { mp.set(WTP, mp.get(WTP)! + mp.get(INTAKE)!); mp.delete(INTAKE) }
  const perMeter = new Map<string, number>()
  for (const k of jendela) for (const [kode, v] of perBulan.get(k)!) perMeter.set(kode, (perMeter.get(kode) ?? 0) + v)

  const bagianMentah: Omit<BagianEnergi, 'porsi'>[] = meterKwh.filter((m) => m.kode !== INTAKE).map((m) => {
    const aset = o.aset.find((a) => a.kode === m.aset_kode)
    return { id: m.kode, nama: NAMA_ASET[m.kode] ?? aset?.nama ?? m.lokasi ?? m.kode, kwh: perMeter.get(m.kode) ?? 0, kelompok: m.kode === 'KINRA-MTR-005' || m.kode === 'KINRA-MTR-004' ? 'air' : 'gedung' }
  })
  let rupiah = 0, kg = 0
  for (const m of meterKwh) { const n = nilaiEnergi(o.kv, perMeter.get(m.kode) ?? 0, 'kWh'); rupiah += n.rupiah; kg += n.kgCo2 }
  for (const [kode, nama] of [['dexlite', 'BBM Dexlite kendaraan & alat berat'], ['dexlite_genset', 'BBM Dexlite genset IPAB & IPAL'], ['bensin', 'BBM bensin kendaraan']] as const) {
    const liter = o.energi.filter((d) => d.sumber_kode === kode && jendela.includes(kunci(d.tahun, d.bulan))).reduce((s, d) => s + d.nilai, 0)
    if (!liter) continue
    bagianMentah.push({ id: kode, nama, kwh: liter * KWH_PER_LITER[kode], kelompok: 'bbm' })
    const n = nilaiEnergi(o.kv, liter, 'liter', kode); rupiah += n.rupiah; kg += n.kgCo2
  }
  // Gedung kecil digabung agar cerita fokus
  const gedung = bagianMentah.filter((b) => b.kelompok === 'gedung')
  const sisa = bagianMentah.filter((b) => b.kelompok !== 'gedung')
  if (gedung.length) sisa.push({ id: 'gedung', nama: 'Gedung kantor & fasilitas', kwh: gedung.reduce((s, b) => s + b.kwh, 0), kelompok: 'gedung' })
  const total = sisa.reduce((s, b) => s + b.kwh, 0)
  const bagian = sisa.map((b) => ({ ...b, porsi: total ? (b.kwh / total) * 100 : 0 })).sort((a, b) => b.kwh - a.kwh)

  // Intensitas WTP 1: hanya bulan yang punya data air WTP 1 (tanpa air BTM)
  const air = new Map(o.dataVariabel.filter((d) => d.variabel_kode === 'air_wtp1').map((d) => [kunci(d.tahun, d.bulan), d.nilai]))
  const kWtp = jendela.filter((k) => air.has(k) && perBulan.get(k)!.has('KINRA-MTR-005'))
  const wtpKwh = perMeter.get('KINRA-MTR-005')
  const wtp = wtpKwh === undefined ? null : {
    kwh: wtpKwh,
    m3: kWtp.length ? kWtp.reduce((s, k) => s + air.get(k)!, 0) : null,
    kwhPerM3: kWtp.length ? kWtp.reduce((s, k) => s + perBulan.get(k)!.get('KINRA-MTR-005')!, 0) / kWtp.reduce((s, k) => s + air.get(k)!, 0) : null,
    bulanAir: kWtp.length,
  }
  const wwtpKwh = perMeter.get('KINRA-MTR-004')
  return {
    periode: { mulai: label(jendela[0]), selesai: label(akhir), bulan: jendela.length },
    totalKwh: total, rupiah, tonCo2: kg / 1000, bagian, wtp,
    wwtp: wwtpKwh === undefined ? null : { kwhBulan: wwtpKwh / jendela.length },
  }
}
