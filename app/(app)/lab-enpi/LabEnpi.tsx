'use client'

import { useMemo, useState } from 'react'
import { Grafik } from '@/components/charts/Grafik'
import type { SpekGrafik } from '@/components/charts/options'
import { AMBANG_DEVIASI, LABEL_JENIS } from '@/lib/deviasi'
import { AMBANG, cusum, modelLayak, pasangan, ringkas } from '@/lib/enpi'
import { angka } from '@/lib/format'
import { enpiLab, jalankan, type JenisGangguan, KET_GANGGUAN, LABEL_GANGGUAN, PRESET_BASELINE, sisipkanGangguan } from '@/lib/lab-enpi'
import type { MeterEnergi, MetodeEnpi, PembacaanMeter, VariabelBulanan, VariabelRelevan } from '@/lib/types'

type Data = { meter: MeterEnergi[]; bacaan: PembacaanMeter[]; variabel: VariabelRelevan[]; dataVariabel: VariabelBulanan[] }

const bulat = (v: number | null, d = 0) => (v === null ? null : Math.round(v * 10 ** d) / 10 ** d)
const persenTanda = (p: number | null) => (p === null ? '–' : `${p >= 0 ? '+' : '−'}${angka(Math.abs(p), 1)}%`)

export function LabEnpi({ data }: { data: Data }) {
  const adaWtp1 = data.dataVariabel.some((d) => d.variabel_kode === 'air_wtp1')
  const adaMeter = data.meter.length > 0 && data.bacaan.length > 0
  if (!adaMeter) return <div className="card"><p className="muted">Data meter WTP I belum tersedia. Jalankan migrasi 0035 (kWh tagihan meter aset) terlebih dahulu.</p></div>
  return (
    <div className="lab">
      <Eksperimen data={data} adaWtp1={adaWtp1} />
      <LatihanDeviasi data={data} adaWtp1={adaWtp1} />
    </div>
  )
}

// ---------------------------------------------------------------- 1. Metode, variabel, baseline
function Eksperimen({ data, adaWtp1 }: { data: Data; adaWtp1: boolean }) {
  const [metode, setMetode] = useState<MetodeEnpi>('absolut')
  const [variabel, setVariabel] = useState<'air_olahan' | 'air_wtp1'>('air_olahan')
  const [kodeBase, setKodeBase] = useState('2025')
  const baseline = PRESET_BASELINE.find((b) => b.kode === kodeBase)!
  const { hasil: h } = useMemo(() => jalankan(enpiLab({ metode, variabel, baseline }), data), [metode, variabel, baseline, data])
  const r = ringkas(h.laporan)
  const m = h.model
  const semua = [...h.baseline, ...h.laporan]

  const spek = useMemo<SpekGrafik>(() => ({
    jenis: 'garis', satuan: 'kWh', kategori: semua.map((t) => t.label),
    seri: [
      { nama: 'Aktual', warna: 's1', data: semua.map((t) => bulat(t.aktual)) },
      { nama: 'Harapan (baseline)', warna: 's3', putus: true, data: semua.map((t) => bulat(t.harapan)) },
    ],
  }), [h]) // eslint-disable-line react-hooks/exhaustive-deps

  const putusan = h.galat ? { cls: '', teks: h.galat }
    : h.ekstrapolasi > 0 ? { cls: 'buruk', teks: `Penghematan belum dapat diklaim: ${h.ekstrapolasi} bulan pelaporan di luar rentang baseline` }
    : r.perbaikan === null ? { cls: '', teks: 'Belum ada bulan pelaporan yang dapat dibandingkan' }
    : { cls: r.perbaikan >= 0 ? 'baik' : 'buruk', teks: `${r.perbaikan >= 0 ? 'Lebih efisien' : 'Lebih boros'} ${angka(Math.abs(r.perbaikan), 1)}% dibanding baseline` }

  const catatan: string[] = []
  if (metode === 'absolut') catatan.push('Metode absolut membandingkan kWh dengan bulan yang sama di baseline tanpa melihat volume air. Kenaikan air yang dipompa ikut terbaca sebagai boros, dan penghematan dari VSD bisa tertutup.')
  if (metode !== 'absolut' && variabel === 'air_olahan') catatan.push('Distribusi total memuat air WTP II (BTM) yang dibeli dari pihak ketiga. Energinya tidak tercatat di meter WTP I, sehingga pembaginya terlalu besar dan muncul penghematan semu. Ini kesalahan yang paling mudah dibantah auditor.')
  if (metode !== 'absolut' && variabel === 'air_wtp1') catatan.push('Air WTP I tanpa BTM menyamakan pembilang dan penyebut: keduanya hanya WTP I. Nov 2025 – Jan 2026 tidak dibandingkan karena air BTM periode itu tertagih sekaligus di Jan 2026.')
  if (kodeBase === '2025') catatan.push('Baseline Jan–Des 2025 adalah baseline ENPI-05. Nov–Des 2025 tidak punya data air WTP I, sehingga model dibentuk dari 10 bulan, di bawah 12 bulan yang disarankan ISO 50006. Ketiga VSD (2022, Jan 2024, Agu 2025) sudah beroperasi dan menjadi bagian kondisi baseline.')
  if (kodeBase === '2024') catatan.push('Baseline 2024 dibentuk saat volume air jauh lebih kecil. Kondisi operasi 2026 sangat berbeda, sehingga perbandingan banyak berupa ekstrapolasi.')
  if (kodeBase === '2024-2025') catatan.push('Menggabungkan dua tahun menambah titik data, tetapi intensitas 2024 (±0,56 kWh/m³) lebih rendah dari 2025 (±0,67). Bila kondisi kedua tahun berbeda, model gabungan justru kurang mewakili; lihat CV(RMSE).')
  if (metode === 'regresi' && h.ekstrapolasi > 0) catatan.push('Regresi hanya sahih di dalam rentang variabel baseline. Volume air 2026 lebih tinggi dari baseline, jadi garis harapan diperpanjang ke luar data (ekstrapolasi).')

  return (
    <div className="card lab-blok">
      <div className="lab-judul"><span className="eyebrow">Eksperimen 1</span><h2>Satu data, tiga kesimpulan</h2>
        <p className="muted">Data kWh WTP I sama untuk semua pilihan. Yang berubah hanya cara menghitung harapan. Coba urutan ini: absolut, lalu rasio dengan distribusi total, lalu rasio dengan air WTP I.</p></div>

      <div className="lab-kendali">
        <div><span className="lab-lbl">Metode</span>
          <nav className="seg" aria-label="Metode EnPI">
            {(['absolut', 'rasio', 'regresi'] as MetodeEnpi[]).map((x) => <button key={x} type="button" aria-pressed={metode === x} onClick={() => setMetode(x)}>{x === 'absolut' ? 'Absolut' : x === 'rasio' ? 'Rasio kWh/m³' : 'Regresi'}</button>)}
          </nav></div>
        <div><span className="lab-lbl">Variabel relevan</span>
          <nav className="seg" aria-label="Variabel relevan">
            <button type="button" disabled={metode === 'absolut'} aria-pressed={metode !== 'absolut' && variabel === 'air_olahan'} onClick={() => setVariabel('air_olahan')}>Distribusi total (termasuk BTM)</button>
            <button type="button" disabled={metode === 'absolut' || !adaWtp1} aria-pressed={metode !== 'absolut' && variabel === 'air_wtp1'} onClick={() => setVariabel('air_wtp1')} title={adaWtp1 ? undefined : 'Jalankan migrasi 0038 untuk variabel air WTP I'}>Air WTP I (tanpa BTM)</button>
          </nav>
          {!adaWtp1 && <span className="muted small">Variabel air WTP I belum ada: jalankan migrasi 0038.</span>}</div>
        <div><span className="lab-lbl">Periode baseline</span>
          <nav className="seg" aria-label="Periode baseline">
            {PRESET_BASELINE.map((b) => <button key={b.kode} type="button" aria-pressed={kodeBase === b.kode} onClick={() => setKodeBase(b.kode)} title={b.ket}>{b.label}</button>)}
          </nav>
          <span className="muted small">{baseline.ket}</span></div>
      </div>

      <p className={`lab-putusan ${putusan.cls}`}>{putusan.teks}</p>
      <div className="lab-angka">
        <div><span>Perbaikan</span><b className="tnum">{persenTanda(r.perbaikan)}</b></div>
        <div><span>{r.hemat >= 0 ? 'Penghematan' : 'Kelebihan'}</span><b className="tnum">{r.bulan ? angka(Math.abs(r.hemat), 0) : '–'}<small>kWh</small></b></div>
        <div><span>Bulan dibandingkan</span><b className="tnum">{r.bulan}</b></div>
        <div><span>Di luar rentang</span><b className="tnum">{h.ekstrapolasi}<small>bulan</small></b></div>
        <div><span>R²</span><b className="tnum">{m?.r2 != null ? angka(m.r2, 2) : '–'}</b></div>
        <div><span>CV(RMSE)</span><b className="tnum">{m?.cvrmse != null ? `${angka(m.cvrmse, 1)}%` : '–'}</b></div>
      </div>
      {metode !== 'absolut' && m && <p className="muted small">Model {modelLayak(m) ? 'memenuhi' : 'belum memenuhi'} ambang ISO 50006 (R² ≥ {angka(AMBANG.r2, 2)}, CV(RMSE) ≤ {AMBANG.cvrmse}%, n ≥ {AMBANG.nMin}). Baseline {m.n} bulan.</p>}

      {!h.galat && <Grafik tinggi={280} label="Konsumsi listrik WTP I aktual dibanding harapan baseline" spek={spek} />}

      <div className="lab-catatan">
        {catatan.map((c) => <p key={c}>{c}</p>)}
        {h.peringatan.filter((p) => !p.startsWith('Metode absolut')).map((p) => <p key={p} className="muted small">• {p}</p>)}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------- 2. CUSUM dan deteksi deviasi
function LatihanDeviasi({ data, adaWtp1 }: { data: Data; adaWtp1: boolean }) {
  const variabel = adaWtp1 ? 'air_wtp1' : 'air_olahan'
  const enpi = useMemo(() => enpiLab({ metode: 'rasio', variabel, baseline: PRESET_BASELINE[0] }), [variabel])
  const asli = useMemo(() => jalankan(enpi, data), [enpi, data])
  const bulanLapor = asli.hasil.laporan.filter((t) => t.aktual !== null && t.harapan !== null)
  const [jenis, setJenis] = useState<JenisGangguan>('bypass')
  const [besar, setBesar] = useState(0.12)
  const [mulaiIdx, setMulaiIdx] = useState(() => Math.max(0, bulanLapor.length - 4))
  const mulai = bulanLapor[Math.min(mulaiIdx, bulanLapor.length - 1)]

  const uji = useMemo(() => {
    if (!mulai || jenis === 'tidak') return asli
    return jalankan(enpi, { ...data, bacaan: sisipkanGangguan(data.bacaan, data.meter, jenis, mulai, besar) })
  }, [asli, enpi, data, jenis, mulai, besar])

  const kunciAsli = new Set(asli.deviasi.map((d) => d.kunci))
  const baru = jenis === 'tidak' ? [] : uji.deviasi.filter((d) => !kunciAsli.has(d.kunci) && d.arah === 'boros')
  const urutBaru = [...baru].sort((a, b) => a.tahun * 12 + a.bulan - (b.tahun * 12 + b.bulan))
  const pertama = urutBaru[0]
  const jeda = pertama && mulai ? pertama.tahun * 12 + pertama.bulan - (mulai.tahun * 12 + mulai.bulan) : null

  const spek = useMemo<SpekGrafik>(() => {
    const lap = uji.hasil.laporan
    return {
      jenis: 'garis', satuan: 'kWh', kategori: lap.map((t) => t.label),
      seri: [
        { nama: 'CUSUM data asli', warna: 's3', putus: true, data: cusum(asli.hasil.laporan).map((v) => bulat(v)) },
        ...(jenis === 'tidak' ? [] : [{ nama: `CUSUM dengan ${LABEL_GANGGUAN[jenis].toLowerCase()}`, warna: 'merah' as const, data: cusum(lap).map((v) => bulat(v)) }]),
      ],
    }
  }, [uji, asli, jenis])

  const daftar = (jenis === 'tidak' ? asli.deviasi : uji.deviasi).slice().sort((a, b) => a.tahun * 12 + a.bulan - (b.tahun * 12 + b.bulan))

  return (
    <div className="card lab-blok">
      <div className="lab-judul"><span className="eyebrow">Eksperimen 2</span><h2>Seberapa cepat pemborosan ketahuan?</h2>
        <p className="muted">Memakai EnPI rasio WTP I dengan baseline Jan–Des 2025 (sama dengan ENPI-05). Suntikkan gangguan buatan pada kWh, lalu lihat kapan CUSUM berbelok dan kapan aplikasi mencatat deviasi. Aturan deteksi sama dengan register deviasi: bulanan bila selisih melebihi maks(2 × RMSE, {AMBANG_DEVIASI.persen}%), tren bila {AMBANG_DEVIASI.trenBulan} bulan berturut-turut di atas harapan.</p></div>

      <div className="lab-kendali">
        <div><span className="lab-lbl">Gangguan</span>
          <nav className="seg" aria-label="Jenis gangguan">
            {(Object.keys(LABEL_GANGGUAN) as JenisGangguan[]).map((g) => <button key={g} type="button" aria-pressed={jenis === g} onClick={() => setJenis(g)}>{LABEL_GANGGUAN[g]}</button>)}
          </nav>
          <span className="muted small">{KET_GANGGUAN[jenis]}</span></div>
        {jenis !== 'tidak' && (
          <>
            <div className="pv-ctl"><label htmlFor="lab-mulai">Mulai bulan <output className="tnum">{mulai?.label ?? '–'}</output></label>
              <input id="lab-mulai" type="range" min={0} max={Math.max(0, bulanLapor.length - 1)} step={1} value={Math.min(mulaiIdx, bulanLapor.length - 1)} onChange={(e) => setMulaiIdx(Number(e.target.value))} /></div>
            <div className="pv-ctl"><label htmlFor="lab-besar">Besar gangguan <output className="tnum">+{Math.round(besar * 100)}% kWh</output></label>
              <input id="lab-besar" type="range" min={3} max={30} step={1} value={Math.round(besar * 100)} onChange={(e) => setBesar(Number(e.target.value) / 100)} /></div>
          </>
        )}
      </div>

      {jenis !== 'tidak' && (
        <p className={`lab-putusan ${pertama ? 'baik' : 'buruk'}`}>
          {pertama ? `Terdeteksi di ${pertama.label} (${LABEL_JENIS[pertama.jenis].toLowerCase()}), ${jeda === 0 ? 'pada bulan yang sama' : `${jeda} bulan setelah gangguan mulai`}.`
            : `Tidak terdeteksi sampai akhir data. Gangguan +${Math.round(besar * 100)}% tersembunyi di bawah ambang deteksi; CUSUM tetap menunjukkan arahnya.`}
        </p>
      )}

      <Grafik tinggi={260} label="CUSUM selisih kumulatif aktual dikurangi harapan" spek={spek} />
      <p className="muted small">CUSUM = jumlah kumulatif (aktual − harapan). Garis turun = hemat berkelanjutan; garis berbelok naik = kinerja memburuk, cari penyebabnya.</p>

      <div className="table-wrap" style={{ marginTop: 10 }}>
        <table className="tbl">
          <thead><tr><th>Bulan</th><th>Jenis</th><th>Arah</th><th className="num">Selisih</th><th>Asal</th></tr></thead>
          <tbody>
            {daftar.length === 0 && <tr><td colSpan={5} className="muted">Tidak ada deviasi terdeteksi.</td></tr>}
            {daftar.map((d) => (
              <tr key={d.kunci}><td>{d.label}</td><td>{LABEL_JENIS[d.jenis]}</td><td className={d.arah === 'boros' ? 'txt-bad' : d.arah === 'hemat' ? 'txt-good' : ''}>{d.arah}</td>
                <td className="num">{d.selisih_persen === null ? '–' : persenTanda(d.selisih_persen)}</td><td className="muted">{kunciAsli.has(d.kunci) ? 'data asli' : 'akibat gangguan'}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="lab-catatan">
        <p><b>Yang perlu dilatih:</b> deviasi bulanan hanya menangkap lonjakan besar. Pemborosan kecil yang terus-menerus (kebocoran, VSD di-bypass) sering lolos dari ambang bulanan, tetapi terlihat sebagai CUSUM yang terus naik dan tertangkap aturan tren setelah {AMBANG_DEVIASI.trenBulan} bulan. Karena itu CUSUM perlu dibaca setiap bulan, bukan menunggu deviasi muncul.</p>
        {pasangan(asli.hasil.laporan).length > 0 && <p className="muted small">Data asli: {pasangan(asli.hasil.laporan).length} bulan pelaporan. Penurunan kWh/m³ pada Feb–Jun 2026 tercatat sebagai deviasi ke arah hemat yang penyebabnya sedang diselidiki (bukan efek VSD baru); Agu–Okt 2026 kembali mendekati baseline.</p>}
      </div>
    </div>
  )
}
