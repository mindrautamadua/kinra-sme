/**
 * Data halaman "Aliran Energi": diagram Sankey per bulan untuk dua tampilan.
 *
 *  - kawasan : sumber listrik kawasan (PLN, PLTBG, PLTS) → Kawasan → Tenant & lainnya / KINRA
 *  - kinra   : sumber energi lingkup KINRA (listrik meter aset, BBM) → aset & pengguna → SEU / bukan SEU
 *
 * Satu periode = satu bulan yang punya bacaan meter KINRA, ditambah satu periode gabungan
 * "rata-rata 12 bulan lengkap terakhir" (kunci -1). BBM dikonversi ke kWh setara (KWH_PER_LITER),
 * sama dengan halaman Cerita Energi, agar semua pita memakai satuan yang sama.
 */
import { konsumsiBacaan } from './enpi'
import { KWH_PER_LITER, type Konversi, nilaiEnergi } from './konversi'
import type { Aset, EnergiBulanan, MeterEnergi, PembacaanMeter, Seu, SumberEnergi } from './types'

export type TampilanAliran = 'kawasan' | 'kinra'
export type JenisSimpul = 'sumber' | 'pusat' | 'luar' | 'kinra' | 'pengguna' | 'seu' | 'nonseu'

export type SimpulAliran = {
  id: string
  label: string
  kolom: number
  /** Nama token warna CSS tanpa `--`, mis. 's1' */
  warna: string
  jenis: JenisSimpul
  ket?: string
  href?: string
  /** Pengguna: kode SEU yang mencakupnya. SEU: status register. */
  seu?: string
  status?: string
}

export type TautanAliran = { dari: string; ke: string; kwh: number }
export type NilaiSimpul = { kwh: number; rupiah: number; kg: number }

export type PeriodeAliran = {
  /** tahun*12 + bulan-1; -1 untuk rata-rata 12 bulan lengkap terakhir */
  kunci: number
  label: string
  ringkas: string
  meterTerbaca: number
  /** Ada data listrik kawasan (PLN) untuk bulan ini */
  kawasanAda: boolean
  tautan: Record<TampilanAliran, TautanAliran[]>
  nilai: Record<string, NilaiSimpul>
}

export type DataAliran = {
  simpul: Record<TampilanAliran, SimpulAliran[]>
  periode: PeriodeAliran[]
  meterTotal: number
  /** Indeks periode awal: bulan lengkap terakhir */
  awal: number
}

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
const BULAN_PANJANG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
const kunci = (t: number, b: number) => t * 12 + b - 1

const LISTRIK_KAWASAN: Record<string, { label: string; warna: string }> = {
  pln: { label: 'PLN', warna: 's3' }, pltbg: { label: 'PLTBG (biogas)', warna: 'good' }, plts: { label: 'PLTS (surya)', warna: 'jingga' },
}
const BBM: Record<string, { sumber: string; pengguna: string }> = {
  dexlite: { sumber: 'Dexlite', pengguna: 'Kendaraan & alat berat' },
  dexlite_genset: { sumber: 'Dexlite genset', pengguna: 'Genset IPAB & IPAL' },
  bensin: { sumber: 'Bensin', pengguna: 'Kendaraan bensin' },
}

/** Nama ringkas aset yang paling sering muncul agar label diagram tidak terlalu panjang. */
const NAMA_RINGKAS: Record<string, string> = { 'KINRA-AST-005': 'WTP (air bersih)', 'KINRA-AST-019': 'WWTP (air limbah)' }

export function susunAliran(o: {
  sumber: SumberEnergi[]; energi: EnergiBulanan[]; aset: Aset[]; meter: MeterEnergi[]; bacaan: PembacaanMeter[]; seu: Seu[]; kv: Konversi
}): DataAliran | null {
  const meterKwh = o.meter.filter((m) => m.satuan.toLowerCase() === 'kwh')
  if (!meterKwh.length) return null
  const seuAktif = o.seu.filter((s) => s.status !== 'Dicabut').sort((a, b) => a.urutan - b.urutan || a.kode.localeCompare(b.kode))

  // Pengguna listrik = aset (meter digabung per aset, mis. intake WTP ke WTP 1); meter tanpa aset berdiri sendiri
  const idPengguna = (m: MeterEnergi) => (m.aset_kode ? `aset:${m.aset_kode}` : `meter:${m.kode}`)
  const penggunaListrik = new Map<string, { label: string; meter: string[]; aset: string | null }>()
  for (const m of meterKwh) {
    const id = idPengguna(m)
    const a = o.aset.find((x) => x.kode === m.aset_kode)
    const p = penggunaListrik.get(id) ?? { label: (m.aset_kode && NAMA_RINGKAS[m.aset_kode]) ?? a?.nama ?? m.area_dilayani ?? m.lokasi ?? m.kode, meter: [], aset: m.aset_kode }
    p.meter.push(m.kode)
    penggunaListrik.set(id, p)
  }
  const seuUntuk = (asetKode: string | null, meter: string[], sumberKode?: string) =>
    seuAktif.find((s) => (asetKode && s.aset_kode.includes(asetKode)) || meter.some((k) => s.meter_kode.includes(k)) || (sumberKode && s.sumber_kode.includes(sumberKode)))

  // Bacaan per bulan per meter
  const perBulan = new Map<number, Map<string, number>>()
  for (const b of o.bacaan) {
    const m = meterKwh.find((x) => x.kode === b.meter_kode)
    const v = m && konsumsiBacaan(b, m)
    if (v === null || v === undefined) continue
    const k = kunci(b.tahun, b.bulan)
    if (!perBulan.has(k)) perBulan.set(k, new Map())
    perBulan.get(k)!.set(b.meter_kode, Math.max(0, v))
  }
  const nilaiSumber = (k: number, kode: string) => o.energi.find((d) => kunci(d.tahun, d.bulan) === k && d.sumber_kode === kode)?.nilai ?? null
  const bbmAda = Object.keys(BBM).filter((kode) => o.energi.some((d) => d.sumber_kode === kode && d.nilai > 0))
  const listrikAda = o.sumber.filter((s) => s.satuan === 'kWh' && LISTRIK_KAWASAN[s.kode]).map((s) => s.kode)

  // ---------------------------------------------------------------- simpul
  const simpulKawasan: SimpulAliran[] = [
    ...listrikAda.map((kode) => ({ id: `kw:${kode}`, label: LISTRIK_KAWASAN[kode].label, kolom: 0, warna: LISTRIK_KAWASAN[kode].warna, jenis: 'sumber' as const, ket: o.sumber.find((s) => s.kode === kode)?.terbarukan ? 'terbarukan' : undefined })),
    { id: 'kw:kawasan', label: 'Kawasan KEK Sei Mangkei', kolom: 1, warna: 'ink-2', jenis: 'pusat' },
    { id: 'kw:tenant', label: 'Tenant & lainnya', kolom: 2, warna: 's3', jenis: 'luar', ket: 'di luar lingkup SMEn' },
    { id: 'kw:kinra', label: 'KINRA', kolom: 2, warna: 'brand', jenis: 'kinra', ket: 'lingkup SMEn · klik untuk memperbesar' },
  ]
  const urutSeu = (kode?: string) => (kode ? seuAktif.findIndex((s) => s.kode === kode) : seuAktif.length)
  const pengguna: SimpulAliran[] = [
    ...[...penggunaListrik.entries()].map(([id, p]) => ({ id, label: p.label, kolom: 1, warna: 's1', jenis: 'pengguna' as const, href: '/aset', seu: seuUntuk(p.aset, p.meter)?.kode, ket: `${p.meter.length} meter` })),
    ...bbmAda.map((kode) => ({ id: `bbm:${kode}`, label: BBM[kode].pengguna, kolom: 1, warna: 's2', jenis: 'pengguna' as const, href: '/energi', seu: seuUntuk(null, [], kode)?.kode, ket: BBM[kode].sumber })),
  ]
  const simpulKinra: SimpulAliran[] = [
    { id: 'src:listrik', label: 'Listrik (meter aset)', kolom: 0, warna: 's1', jenis: 'sumber' },
    ...bbmAda.map((kode) => ({ id: `src:${kode}`, label: BBM[kode].sumber, kolom: 0, warna: 's2', jenis: 'sumber' as const, ket: 'kWh setara' })),
    ...pengguna,
    ...seuAktif.map((s) => ({ id: `seu:${s.kode}`, label: `${s.kode} · ${s.nama.match(/\(([^)]+)\)/)?.[1] ?? s.nama}`, kolom: 2, warna: s.status === 'Ditetapkan' ? 'good' : 'warn', jenis: 'seu' as const, status: s.status, href: '/tinjauan', ket: `${s.status} · ${s.nama}` })),
    { id: 'nonseu', label: 'Bukan SEU', kolom: 2, warna: 's3', jenis: 'nonseu', ket: 'pengguna lain' },
  ]

  // ---------------------------------------------------------------- periode
  const rp = (kwh: number) => nilaiEnergi(o.kv, kwh, 'kWh')

  /** Susun satu periode dari kWh per pengguna listrik, liter BBM, dan kWh listrik kawasan. */
  const susun = (k: number, label: string, ringkas: string, meterTerbaca: number, listrikPengguna: Map<string, number>, literBbm: Map<string, number>, kawasan: Map<string, number> | null): PeriodeAliran => {
    const nilai: Record<string, NilaiSimpul> = {}
    const tambah = (id: string, kwh: number, n: { rupiah: number; kgCo2: number }) => {
      const r = nilai[id] ?? { kwh: 0, rupiah: 0, kg: 0 }
      nilai[id] = { kwh: r.kwh + kwh, rupiah: r.rupiah + n.rupiah, kg: r.kg + n.kgCo2 }
    }
    const kinra: TautanAliran[] = []
    let listrikKinra = 0
    for (const s of pengguna) {
      const tujuan = s.seu ? `seu:${s.seu}` : 'nonseu'
      if (s.id.startsWith('bbm:')) {
        const kode = s.id.slice(4)
        const l = literBbm.get(kode) ?? 0
        const kwh = l * (KWH_PER_LITER[kode] ?? 10)
        if (kwh <= 0) continue
        const n = nilaiEnergi(o.kv, l, 'liter', kode)
        tambah(`src:${kode}`, kwh, n); tambah(s.id, kwh, n); tambah(tujuan, kwh, n)
        kinra.push({ dari: `src:${kode}`, ke: s.id, kwh }, { dari: s.id, ke: tujuan, kwh })
      } else {
        const kwh = listrikPengguna.get(s.id) ?? 0
        if (kwh <= 0) continue
        const n = rp(kwh)
        listrikKinra += kwh
        tambah('src:listrik', kwh, n); tambah(s.id, kwh, n); tambah(tujuan, kwh, n)
        kinra.push({ dari: 'src:listrik', ke: s.id, kwh }, { dari: s.id, ke: tujuan, kwh })
      }
    }

    const kw: TautanAliran[] = []
    if (kawasan) {
      let total = 0
      for (const [kode, kwh] of kawasan) {
        if (kwh <= 0) continue
        total += kwh
        tambah(`kw:${kode}`, kwh, rp(kwh))
        kw.push({ dari: `kw:${kode}`, ke: 'kw:kawasan', kwh })
      }
      if (total > 0) {
        tambah('kw:kawasan', total, rp(total))
        const ke = Math.min(listrikKinra, total)
        tambah('kw:kinra', ke, rp(ke)); tambah('kw:tenant', total - ke, rp(total - ke))
        kw.push({ dari: 'kw:kawasan', ke: 'kw:tenant', kwh: total - ke }, { dari: 'kw:kawasan', ke: 'kw:kinra', kwh: ke })
      }
    }
    return { kunci: k, label, ringkas, meterTerbaca, kawasanAda: kw.length > 0, tautan: { kawasan: kw, kinra }, nilai }
  }

  const bulanList = [...perBulan.keys()].sort((a, b) => a - b)
  const periode: PeriodeAliran[] = []
  const lengkap: { lp: Map<string, number>; lb: Map<string, number>; kw: Map<string, number> | null }[] = []
  for (const k of bulanList) {
    const mp = perBulan.get(k)!
    const lp = new Map<string, number>()
    for (const [kode, v] of mp) {
      const id = idPengguna(meterKwh.find((m) => m.kode === kode)!)
      lp.set(id, (lp.get(id) ?? 0) + v)
    }
    const lb = new Map(bbmAda.map((kode) => [kode, nilaiSumber(k, kode) ?? 0]))
    const kwRaw = listrikAda.map((kode) => [kode, nilaiSumber(k, kode)] as const)
    const kw = nilaiSumber(k, 'pln') !== null ? new Map(kwRaw.map(([kode, v]) => [kode, v ?? 0])) : null
    const t = Math.floor(k / 12), b = k % 12
    periode.push(susun(k, `${BULAN_PANJANG[b]} ${t}`, `${BULAN[b]} ${String(t).slice(2)}`, mp.size, lp, lb, kw))
    if (mp.size >= meterKwh.length) lengkap.push({ lp, lb, kw })
  }
  if (!periode.length) return null

  // Rata-rata 12 bulan lengkap terakhir (semua meter terbaca)
  const jendela = lengkap.slice(-12)
  if (jendela.length) {
    const rata = (ambil: (x: (typeof jendela)[number]) => Map<string, number> | null) => {
      const hasil = new Map<string, number>()
      const ada = jendela.map(ambil).filter((m): m is Map<string, number> => !!m)
      for (const m of ada) for (const [id, v] of m) hasil.set(id, (hasil.get(id) ?? 0) + v / ada.length)
      return ada.length ? hasil : null
    }
    periode.push(susun(-1, `Rata-rata ${jendela.length} bulan lengkap terakhir`, `Rata-rata`, meterKwh.length, rata((x) => x.lp)!, rata((x) => x.lb) ?? new Map(), rata((x) => x.kw)))
  }

  const bulanan = periode.filter((p) => p.kunci >= 0)
  const awalBulan = [...bulanan].reverse().find((p) => p.meterTerbaca >= meterKwh.length) ?? bulanan.at(-1)!
  return { simpul: { kawasan: simpulKawasan, kinra: simpulKinra }, periode, meterTotal: meterKwh.length, awal: periode.indexOf(awalBulan) }
}
