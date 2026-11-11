'use client'

import { ArrowRight, Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'
import { hapusAksi, hapusSasaran, hubungkanAksi, simpanAksi, simpanSasaran, ubahStatusAksi } from '@/app/actions'
import { Grafik } from '@/components/charts/Grafik'
import { Chip } from '@/components/Chip'
import { useBoleh } from '@/components/Peran'
import { angka, tanggal } from '@/lib/format'
import { rupiahRingkas, tonCo2 } from '@/lib/konversi'
import { CHIP_PROYEKSI, LABEL_PROYEKSI, type ProyeksiSasaran } from '@/lib/proyeksi-sasaran'
import type { KodeChip } from '@/lib/status'
import type { RencanaAksi, Sasaran, StatusAksi, StatusSasaran } from '@/lib/types'
import { tagUsulan, type UsulanAksi, type UsulanSasaran } from '@/lib/usulan-sasaran'

export type Capaian = {
  enpi: string
  satuan: string
  bulan: number
  perbaikan: number | null
  hemat: number
  persenTarget: number | null
  galat: string | null
  proyeksi: ProyeksiSasaran | null
  /** Rupiah dari energi yang masih harus dihemat agar target tercapai */
  rupiahKurang: number | null
}

type PeluangRingkas = { kode: string; uraian: string; status: string; estimasi_kwh: number | null; pemilik: string | null }

const STATUS_S: StatusSasaran[] = ['Draft', 'Aktif', 'Tercapai', 'Tidak tercapai']
const STATUS_A: StatusAksi[] = ['Rencana', 'Berjalan', 'Selesai', 'Ditunda', 'Batal']
const CHIP_S: Record<StatusSasaran, KodeChip> = { Draft: 'na', Aktif: 'info', Tercapai: 'good', 'Tidak tercapai': 'crit' }
const CHIP_A: Record<StatusAksi, KodeChip> = { Rencana: 'na', Berjalan: 'info', Selesai: 'good', Ditunda: 'warn', Batal: 'na' }

const kodeBerikut = (prefiks: string, daftar: { kode: string }[]) =>
  `${prefiks}-${String(Math.max(0, ...daftar.map((x) => Number(x.kode.replace(/\D/g, '')) || 0)) + 1).padStart(2, '0')}`

export function DaftarSasaran({ sasaran, aksi, capaian, enpi, peluang, kini, tarif, ef, usulanS = [], usulanA = [] }: {
  tarif: number; ef: number; usulanS?: UsulanSasaran[]; usulanA?: UsulanAksi[]
  sasaran: Sasaran[]; aksi: RencanaAksi[]; capaian: Record<number, Capaian>
  enpi: { kode: string; nama: string }[]; peluang: PeluangRingkas[]; kini: string
}) {
  const router = useRouter()
  const bisa = useBoleh()
  const dlgS = useRef<HTMLDialogElement>(null)
  const dlgA = useRef<HTMLDialogElement>(null)
  const [editS, setEditS] = useState<Partial<Sasaran> | null>(null)
  const [editA, setEditA] = useState<Partial<RencanaAksi> | null>(null)
  const [galat, setGalat] = useState<string | null>(null)
  const [menunggu, mulai] = useTransition()

  const tanpaSasaran = aksi.filter((a) => a.sasaran_id === null || !sasaran.some((s) => s.id === a.sasaran_id))
  // Sasaran per bagian dari Formulir Objective dan Target (6.2) ditampilkan sebagai tabel; sasaran lain (EnPI) sebagai kartu
  const sasaranBagian = sasaran.filter((s) => s.bagian)
  const sasaranKartu = sasaran.filter((s) => !s.bagian)
  const grupBagian = [...new Set(sasaranBagian.map((s) => s.bagian!))].map((b) => ({ bagian: b, daftar: sasaranBagian.filter((s) => s.bagian === b) }))
  const perBagian = sasaranBagian.find((s) => s.pencapaian_per)?.pencapaian_per ?? null
  const sudahJadiAksi = new Set(aksi.map((a) => a.peluang_kode).filter(Boolean))
  const peluangSiap = peluang.filter((p) => (p.status === 'Disetujui' || p.status === 'Berjalan') && !sudahJadiAksi.has(p.kode))
  const hidup = aksi.filter((a) => a.status !== 'Batal')
  const estimasi = hidup.reduce((t, a) => t + (a.estimasi_hemat_kwh ?? 0), 0)
  const terverifikasi = aksi.reduce((t, a) => t + (a.hemat_terverifikasi_kwh ?? 0), 0)
  const lewat = (a: RencanaAksi) => !!a.tenggat && a.tenggat < kini && a.status !== 'Selesai' && a.status !== 'Batal'

  // Nomor buka form: bagian dari key agar form selalu dipasang ulang dengan isian terbaru (input memakai defaultValue)
  const [nomorBuka, setNomorBuka] = useState(0)
  function bukaS(s: Partial<Sasaran> | null) { setEditS(s); setNomorBuka((n) => n + 1); setGalat(null); dlgS.current?.showModal() }
  const [usulanAktif, setUsulanAktif] = useState<string | null>(null)
  function bukaA(a: Partial<RencanaAksi> | null, kunci: string | null = null) { setEditA(a ?? {}); setUsulanAktif(kunci); setNomorBuka((n) => n + 1); setGalat(null); dlgA.current?.showModal() }
  const sisaS = usulanS.filter((u) => !u.dipakai)
  const sisaA = usulanA.filter((u) => !u.dipakai)
  const jumlahDipakai = usulanS.length + usulanA.length - sisaS.length - sisaA.length
  // Usulan yang belum digunakan tampil lebih dulu
  const urut = <T extends { dipakai: string | null }>(d: T[]) => [...d.filter((u) => !u.dipakai), ...d.filter((u) => u.dipakai)]
  const tandaDipakai = (kode: string, jenis: 'sasaran' | 'aksi') => (
    <a className="ss-dipakai" href={`#${jenis}-${kode}`} title={`Lihat ${kode}`}><Check aria-hidden="true" />Sudah digunakan · {kode}</a>
  )
  // Aksi tanpa sasaran yang berasal dari usulan: cari sasaran dengan EnPI usulan tersebut
  const pasanganOtomatis = tanpaSasaran.flatMap((a) => {
    const u = usulanA.find((x) => [x.kunci, ...(x.alias ?? [])].some((k) => a.catatan?.includes(tagUsulan(k))) || x.uraian.toLowerCase() === a.uraian.trim().toLowerCase())
    const s = u?.enpi ? sasaran.find((x) => x.enpi_kode === u.enpi && x.status !== 'Tidak tercapai') : undefined
    return s ? [{ id: a.id, sasaran_id: s.id, aksi: a.kode, sasaran: s.kode }] : []
  })
  const hubungkanOtomatis = () => mulai(async () => {
    const h = await hubungkanAksi(pasanganOtomatis.map(({ id, sasaran_id }) => ({ id, sasaran_id })))
    if (!h.ok) alert(h.pesan)
    router.refresh()
  })
  // Usulan dikelompokkan per sasaran (EnPI yang sama); aksi tanpa sasaran usulan masuk kelompok terakhir
  const grupUsulan = [
    ...usulanS.map((s) => ({ s, aksi: urut(usulanA.filter((a) => a.enpi === s.enpi_kode)) })),
    { s: null, aksi: urut(usulanA.filter((a) => !usulanS.some((s) => s.enpi_kode === a.enpi))) },
  ].filter((g) => g.s || g.aksi.length)
  const kartuAksi = (u: UsulanAksi) => (
    <div key={u.kunci} className={`ss-kartu a${u.dipakai ? ' dipakai' : ''}`}>
      {u.dipakai && tandaDipakai(u.dipakai, 'aksi')}
      <span className="eyebrow">Aksi{u.peluang_kode ? ` · dari ${u.peluang_kode}` : ''}{u.estimasi_hemat_kwh ? ` · ±${angka(u.estimasi_hemat_kwh)} kWh/thn · ±${rupiahRingkas(u.estimasi_hemat_kwh * tarif)}` : ''}</span>
      <b>{u.uraian}</b>
      <span className="muted small">{u.alasan} Tenggat {tanggal(u.tenggat)}.</span>
      {!u.dipakai && bisa('aksi.ubah') && <button type="button" className="btn kecil" onClick={() => bukaA({
        uraian: u.uraian, peluang_kode: u.peluang_kode, pic: u.pic, sumber_daya: u.sumber_daya, mulai: u.mulai, tenggat: u.tenggat,
        estimasi_hemat_kwh: u.estimasi_hemat_kwh, metode_verifikasi: u.metode_verifikasi, catatan: u.catatan, status: 'Rencana',
        sasaran_id: sasaran.find((x) => x.enpi_kode === u.enpi)?.id ?? null,
      }, u.kunci)}><Plus aria-hidden="true" />Gunakan</button>}
    </div>
  )
  const ubahStatus = (a: RencanaAksi, status: StatusAksi) => mulai(async () => { const h = await ubahStatusAksi(a.id, status); if (!h.ok) alert(h.pesan); router.refresh() })

  const tabelAksi = (daftar: RencanaAksi[]) => (
      <div className="table-wrap">
        <table className="tbl">
          <thead><tr><th>Kode</th><th>Aksi</th><th>PIC · tenggat</th><th className="num">Estimasi</th><th className="num">Terverifikasi</th><th>Status</th><th /></tr></thead>
          <tbody>
            {daftar.length === 0 && <tr className="kosong"><td colSpan={7}>Belum ada rencana aksi.</td></tr>}
            {daftar.map((a) => (
              <tr key={a.id} id={`aksi-${a.kode}`} className={lewat(a) ? 'lewat' : undefined}>
                <td className="kode">{a.kode}{a.peluang_kode && <span className="upd">dari {a.peluang_kode}</span>}</td>
                <td style={{ maxWidth: 360 }}>{a.uraian}
                  {a.deskripsi && <span className="upd">{a.deskripsi}</span>}
                  {a.seu_terkait && <span className="upd">SEU: {a.seu_terkait}</span>}
                  {a.sasaran_teks && <span className="upd">Sasaran: {a.sasaran_teks}</span>}
                  {a.sumber && a.catatan && <span className="upd">Keterangan: {a.catatan}</span>}
                  {a.sumber_daya && <span className="upd">Sumber daya: {a.sumber_daya}</span>}
                  {a.metode_verifikasi && <span className="upd">Verifikasi: {a.metode_verifikasi}</span>}
                </td>
                <td className="small">{a.pic ?? '–'}<span className={`upd ${lewat(a) ? 'txt-bad' : ''}`}>{tanggal(a.tenggat)}</span></td>
                <td className="num">{a.estimasi_hemat_kwh !== null ? `${angka(a.estimasi_hemat_kwh)} kWh` : '–'}</td>
                <td className="num">{a.hemat_terverifikasi_kwh !== null ? <><b className="txt-good">{angka(a.hemat_terverifikasi_kwh)} kWh</b><span className="upd">{tanggal(a.tanggal_verifikasi)}</span></> : '–'}</td>
                <td>
                  <Chip kode={CHIP_A[a.status]} label={a.status} />
                  {bisa('aksi.ubah') && (
                    <label style={{ display: 'block', marginTop: 4 }}><span className="sr-only">Ubah status {a.kode}</span>
                      <select className="inline" value={a.status} onChange={(e) => ubahStatus(a, e.target.value as StatusAksi)}>
                        {STATUS_A.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </label>
                  )}
                </td>
                <td>{bisa('aksi.ubah') && <button type="button" className="btn btn-ikon" aria-label={`Ubah ${a.kode}`} onClick={() => bukaA(a)}><Pencil aria-hidden="true" /></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
  )

  return (
    <>
      {(sisaS.length > 0 || sisaA.length > 0) && (bisa('sasaran.tambah') || bisa('aksi.ubah')) && (
        <div className="card ss-usulan">
          <div className="row">
            <div>
              <span className="eyebrow">Usulan dari data aplikasi · tinjau sebelum disimpan</span>
              <h3>{sisaS.length} sasaran dan {sisaA.length} rencana aksi siap dipakai{jumlahDipakai > 0 && <span className="muted"> · {jumlahDipakai} sudah digunakan</span>}</h3>
              <p className="muted small">Disusun dari SEU, EnPI lingkup KINRA, peluang, rencana submeter, dan deviasi. Klik Gunakan untuk membuka form yang sudah terisi; ubah target dan estimasi sesuai keputusan tim.</p>
            </div>
          </div>
          {grupUsulan.map(({ s: u, aksi: daftarA }) => (
            <section key={u?.enpi_kode ?? 'lain'} className="ss-grup">
              <h4 className="ss-grup-judul">
                {u ? <>Sasaran {u.enpi_kode} <span className="muted">· {daftarA.length} rencana aksi</span></> : <>Aksi lain <span className="muted">· belum ada usulan sasaran untuk EnPI-nya</span></>}
              </h4>
              <div className="ss-usulan-grid">
                {u && (
                  <div className={`ss-kartu s${u.dipakai ? ' dipakai' : ''}`}>
                    {u.dipakai && tandaDipakai(u.dipakai, 'sasaran')}
                    <span className="eyebrow">Sasaran · {u.enpi_kode} · target {u.target_persen}% pada {u.tahun_target}</span>
                    <b>{u.uraian}</b>
                    <span className="muted small">{u.alasan}</span>
                    {!u.dipakai && bisa('sasaran.tambah') && <button type="button" className="btn kecil" onClick={() => bukaS({ uraian: u.uraian, enpi_kode: u.enpi_kode, target_persen: u.target_persen, tahun_target: u.tahun_target, pic: u.pic, catatan: u.catatan, status: 'Aktif' })}><Plus aria-hidden="true" />Gunakan</button>}
                  </div>
                )}
                {daftarA.map(kartuAksi)}
                {u && daftarA.length === 0 && <p className="muted small">Belum ada usulan aksi untuk sasaran ini; tambahkan aksi sendiri setelah sasaran disimpan.</p>}
              </div>
            </section>
          ))}
        </div>
      )}

      {(sasaran.length > 0 || aksi.length > 0) && (
        <>
      <div className="tiles" style={{ marginBottom: 16 }}>
        <div className="tile"><div className="tile-head"><span className="label">Sasaran aktif</span></div>
          <div className="nilai tnum">{sasaran.filter((s) => s.status === 'Aktif').length}<small>dari {sasaran.length}</small></div>
          <div className="meta">{sasaran.filter((s) => s.status === 'Tercapai').length} tercapai</div></div>
        <div className="tile"><div className="tile-head"><span className="label">Rencana aksi</span></div>
          <div className="nilai tnum">{hidup.filter((a) => a.status === 'Selesai').length}<small>selesai dari {hidup.length}</small></div>
          <div className="meta">{hidup.filter((a) => a.status === 'Berjalan').length} berjalan · {aksi.filter(lewat).length} lewat tenggat</div></div>
        <div className="tile"><div className="tile-head"><span className="label">Estimasi penghematan</span></div>
          <div className="nilai tnum">{angka(estimasi / 1000, 1)}<small>MWh/tahun</small></div>
          <div className="meta">±{rupiahRingkas(estimasi * tarif)}/tahun · {tonCo2(estimasi * ef)}/tahun</div></div>
        <div className="tile"><div className="tile-head"><span className="label">Penghematan terverifikasi</span>{estimasi > 0 && <Chip capaian={(terverifikasi / estimasi) * 100} />}</div>
          <div className="nilai tnum">{angka(terverifikasi / 1000, 1)}<small>MWh</small></div>
          <div className="meta">{rupiahRingkas(terverifikasi * tarif)} · {estimasi > 0 ? `${angka((terverifikasi / estimasi) * 100, 0)}% dari estimasi` : 'Belum ada estimasi'}</div></div>
      </div>
        </>
      )}

      <div className="toolbar">
        <span style={{ flex: 1 }} />
        {bisa('aksi.ubah') && <button type="button" className="btn" onClick={() => bukaA(null)}><Plus aria-hidden="true" /><span className="teks">Tambah aksi</span></button>}
        {bisa('sasaran.tambah') && <button type="button" className="btn utama" onClick={() => bukaS(null)}><Plus aria-hidden="true" /><span className="teks">Tambah sasaran</span></button>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {sasaran.length === 0 && (
          <div className="card"><p className="muted">Belum ada sasaran. Contoh: &ldquo;Menurunkan konsumsi listrik kawasan ternormalisasi 3% pada 2026 dibanding baseline 2025&rdquo; dengan EnPI-02 dan target 3%.</p></div>
        )}
        {grupBagian.length > 0 && (
          <div className="card" id="sasaran-bagian">
            <div className="row">
              <div>
                <span className="eyebrow">Formulir Objective dan Target Manajemen · 001/SOP-008/KINRA/SMEn/X/2026</span>
                <h3>Sasaran & target per bagian · {sasaranBagian.length} sasaran di {grupBagian.length} bagian</h3>
                <p className="muted small">{sasaranBagian.filter((s) => s.status === 'Tercapai').length} tercapai{perBagian ? ` menurut lembar pencapaian per ${tanggal(perBagian)}` : ''}. Sasaran ini berupa target perilaku dan kepatuhan, belum terhubung ke EnPI.</p>
              </div>
            </div>
            <div className="table-wrap">
              <table className="tbl">
                <thead><tr><th>Kode</th><th>Aktivitas · tujuan</th><th>Target</th><th>Program</th><th>Batas · PIC</th><th>Pencapaian</th><th /></tr></thead>
                {grupBagian.map((g) => (
                  <tbody key={g.bagian}>
                    <tr className="ss-sub"><th colSpan={7}>{g.bagian} <span className="muted">· {g.daftar.length} sasaran</span></th></tr>
                    {g.daftar.map((s) => (
                      <tr key={s.id} id={`sasaran-${s.kode}`}>
                        <td className="kode">{s.kode}</td>
                        <td style={{ maxWidth: 300 }}><b>{s.aktivitas ?? s.uraian}</b>{s.aktivitas && <span className="upd">{s.uraian}</span>}{s.aspek && <span className="upd">Aspek: {s.aspek}</span>}</td>
                        <td className="small" style={{ maxWidth: 260 }}>{s.target_teks ?? '–'}</td>
                        <td className="small" style={{ maxWidth: 260 }}>{s.program ?? '–'}</td>
                        <td className="small">{s.batas_waktu ?? '–'}<span className="upd">{s.pic ?? '–'}</span></td>
                        <td><Chip kode={s.status === 'Tercapai' ? 'good' : CHIP_S[s.status]} label={s.pencapaian ?? s.status} /></td>
                        <td>{bisa('sasaran.ubah') && <button type="button" className="btn btn-ikon" aria-label={`Ubah ${s.kode}`} onClick={() => bukaS(s)}><Pencil aria-hidden="true" /></button>}</td>
                      </tr>
                    ))}
                  </tbody>
                ))}
              </table>
            </div>
          </div>
        )}
        {sasaranKartu.map((s) => {
          const c = capaian[s.id]
          const daftar = aksi.filter((a) => a.sasaran_id === s.id)
          return (
            <div key={s.id} id={`sasaran-${s.kode}`} className="card">
              <div className="row">
                <div>
                  <span className="eyebrow">{s.kode}{s.pic && ` · PIC ${s.pic}`}</span>
                  <h3>{s.uraian}</h3>
                  <p className="muted small">
                    {s.enpi_kode && s.target_persen !== null
                      ? `Target: perbaikan ${angka(s.target_persen, 1)}% pada ${s.enpi_kode}${c ? ` (${c.enpi})` : ''}, tahun ${s.tahun_target}`
                      : 'Belum terhubung ke EnPI dengan target terukur'}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Chip kode={CHIP_S[s.status]} label={s.status} />
                  {bisa('sasaran.ubah') && <button type="button" className="btn btn-ikon" aria-label={`Ubah ${s.kode}`} onClick={() => bukaS(s)}><Pencil aria-hidden="true" /></button>}
                </div>
              </div>

              {c && (
                <div style={{ marginBottom: 16 }}>
                  {c.galat ? <p className="pesan galat">{c.galat}</p> : c.bulan === 0 ? (
                    <p className="pesan">Belum ada data {s.tahun_target} setelah periode baseline untuk {s.enpi_kode}.</p>
                  ) : (
                    <>
                      <div className="mini-stats" style={{ justifyContent: 'flex-start', marginBottom: 8 }}>
                        <div style={{ alignItems: 'flex-start' }}><span>Perbaikan {s.tahun_target}</span><b className={`tnum ${(c.perbaikan ?? 0) >= 0 ? 'txt-good' : 'txt-bad'}`}>{c.perbaikan === null ? '–' : `${c.perbaikan < 0 ? '−' : ''}${angka(Math.abs(c.perbaikan), 1)}%`}</b></div>
                        <div style={{ alignItems: 'flex-start' }}><span>Target</span><b className="tnum">{angka(s.target_persen, 1)}%</b></div>
                        <div style={{ alignItems: 'flex-start' }}><span>Hemat ({c.satuan})</span><b className="tnum">{angka(c.hemat, c.satuan === 'TJ' ? 2 : 0)}</b></div>
                        <div style={{ alignItems: 'flex-start' }}><span>Data</span><b className="tnum">{c.bulan} bulan</b></div>
                        {c.persenTarget !== null && <Chip capaian={c.persenTarget} />}
                      </div>
                      {c.persenTarget !== null && (
                        <div className="pg" role="img" aria-label={`Capaian ${Math.round(c.persenTarget)}% dari target`}>
                          <div className={`track${c.persenTarget >= 100 ? ' over' : ''}`}><b style={{ width: `${Math.min(100, Math.max(0, c.persenTarget))}%` }} /></div>
                        </div>
                      )}
                    </>
                  )}
                  {c.proyeksi && s.status === 'Aktif' && <BlokProyeksi p={c.proyeksi} rupiah={c.rupiahKurang} kode={s.kode} />}
                </div>
              )}

              {tabelAksi(daftar)}
              {bisa('aksi.ubah') && (
                <div className="toolbar" style={{ marginTop: 12, marginBottom: 0 }}>
                  <button type="button" className="btn kecil" onClick={() => bukaA({ sasaran_id: s.id })}><Plus aria-hidden="true" />Aksi untuk {s.kode}</button>
                </div>
              )}
            </div>
          )
        })}

        {tanpaSasaran.length > 0 && (
          <div className="card">
            <div className="row">
              <div><h3>Aksi belum terhubung ke sasaran</h3><p className="muted small">Hubungkan agar kontribusinya terhadap target terlihat.{pasanganOtomatis.length > 0 && ` Dari usulan: ${pasanganOtomatis.map((p) => `${p.aksi} → ${p.sasaran}`).join(', ')}.`}</p></div>
              {pasanganOtomatis.length > 0 && bisa('aksi.ubah') && (
                <button type="button" className="btn kecil" disabled={menunggu} onClick={hubungkanOtomatis}>Hubungkan {pasanganOtomatis.length} aksi ke sasarannya</button>
              )}
            </div>
            {tabelAksi(tanpaSasaran)}
          </div>
        )}

        {peluangSiap.length > 0 && (
          <div className="card">
            <div className="row"><div><h3>Peluang disetujui yang belum punya rencana aksi</h3><p className="muted small">Dari register peluang peningkatan kinerja energi (6.1).</p></div></div>
            <div className="list">
              {peluangSiap.map((p) => (
                <div key={p.kode}>
                  <span className="kode mono small">{p.kode}</span>
                  <div className="grow"><b>{p.uraian}</b><span className="muted small">{p.pemilik ?? 'Tanpa pemilik'}{p.estimasi_kwh !== null && ` · estimasi ${angka(p.estimasi_kwh)} kWh/tahun`}</span></div>
                  {bisa('aksi.ubah') && (
                    <button type="button" className="btn kecil" onClick={() => bukaA({ peluang_kode: p.kode, uraian: p.uraian, pic: p.pemilik, estimasi_hemat_kwh: p.estimasi_kwh })}>
                      Jadikan aksi<ArrowRight aria-hidden="true" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <dialog ref={dlgS} className="panel" onClose={() => setEditS(null)}>
        <form className="card" key={`${editS?.id ?? 'baru'}-${nomorBuka}`} action={(f) => mulai(async () => {
          const h = await simpanSasaran(editS?.id ?? null, f)
          if (!h.ok) return setGalat(h.pesan)
          dlgS.current?.close(); router.refresh()
        })}>
          <div className="row"><h3>{editS?.id ? `Ubah ${editS.kode}` : editS?.uraian ? 'Sasaran baru dari usulan' : 'Sasaran baru'}</h3><button type="button" className="btn btn-ikon" aria-label="Tutup" onClick={() => dlgS.current?.close()}><X aria-hidden="true" /></button></div>
          <div className="form-grid">
            <label className="field"><span>Kode</span><input name="kode" required defaultValue={editS?.kode ?? kodeBerikut('S', sasaran)} /></label>
            <label className="field"><span>Status</span><select name="status" defaultValue={editS?.status ?? 'Aktif'}>{STATUS_S.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label className="field full"><span>{editS?.bagian ? 'Tujuan' : 'Sasaran energi'}</span><textarea name="uraian" required defaultValue={editS?.uraian ?? ''} placeholder="mis. Menurunkan intensitas energi WTP" /></label>
            <label className="field"><span>Bagian</span><input name="bagian" defaultValue={editS?.bagian ?? ''} placeholder="Kosongkan untuk sasaran kinerja energi" /></label>
            <label className="field"><span>Aktivitas</span><input name="aktivitas" defaultValue={editS?.aktivitas ?? ''} /></label>
            <label className="field full"><span>Target (kalimat)</span><textarea name="target_teks" defaultValue={editS?.target_teks ?? ''} placeholder="Untuk sasaran tanpa EnPI, mis. 100% personel mengikuti sosialisasi" /></label>
            <label className="field full"><span>Program</span><textarea name="program" defaultValue={editS?.program ?? ''} /></label>
            <label className="field"><span>Batas waktu</span><input name="batas_waktu" defaultValue={editS?.batas_waktu ?? ''} placeholder="mis. Desember 2026" /></label>
            <label className="field"><span>Pencapaian</span><input name="pencapaian" defaultValue={editS?.pencapaian ?? ''} placeholder="mis. Belum tercapai" /></label>
            <label className="field full"><span>EnPI pengukur</span>
              <select name="enpi_kode" defaultValue={editS?.enpi_kode ?? ''}>
                <option value="">Belum ditentukan</option>
                {enpi.map((e) => <option key={e.kode} value={e.kode}>{e.kode} · {e.nama}</option>)}
              </select>
            </label>
            <label className="field"><span>Target perbaikan (%)</span><input type="number" name="target_persen" min={0} max={100} step="any" defaultValue={editS?.target_persen ?? ''} /></label>
            <label className="field"><span>Tahun target</span><input type="number" name="tahun_target" min={2024} max={2035} defaultValue={editS?.tahun_target ?? new Date().getFullYear()} /></label>
            <label className="field full"><span>PIC</span><input name="pic" defaultValue={editS?.pic ?? ''} /></label>
            <label className="field full"><span>Catatan</span><textarea name="catatan" defaultValue={editS?.catatan ?? ''} placeholder="Keterkaitan dengan kebijakan energi, persyaratan hukum, SEU" /></label>
          </div>
          {galat && <p className="pesan galat" role="alert" style={{ marginTop: 12 }}>{galat}</p>}
          <div className="toolbar" style={{ marginTop: 16, marginBottom: 0 }}>
            <button className="btn utama" type="submit" disabled={menunggu}>{menunggu ? 'Menyimpan…' : 'Simpan'}</button>
            <span style={{ flex: 1 }} />
            {editS?.id && bisa('sasaran.hapus') && (
              <button type="button" className="btn" onClick={() => {
                if (!confirm(`Hapus sasaran ${editS.kode}? Rencana aksinya tetap ada tanpa sasaran.`)) return
                mulai(async () => { const h = await hapusSasaran(editS.id!); if (!h.ok) return setGalat(h.pesan); dlgS.current?.close(); router.refresh() })
              }}><Trash2 aria-hidden="true" /><span className="teks">Hapus</span></button>
            )}
          </div>
        </form>
      </dialog>

      <dialog ref={dlgA} className="panel" onClose={() => setEditA(null)}>
        <form className="card" key={`${editA?.id ?? 'baru'}-${nomorBuka}`} action={(f) => mulai(async () => {
          const h = await simpanAksi(editA?.id ?? null, f)
          if (!h.ok) return setGalat(h.pesan)
          dlgA.current?.close(); router.refresh()
        })}>
          <div className="row"><h3>{editA?.id ? `Ubah ${editA.kode}` : 'Rencana aksi baru'}</h3><button type="button" className="btn btn-ikon" aria-label="Tutup" onClick={() => dlgA.current?.close()}><X aria-hidden="true" /></button></div>
          <div className="form-grid">
            <label className="field"><span>Kode</span><input name="kode" required defaultValue={editA?.kode ?? kodeBerikut('RA', aksi)} /></label>
            <label className="field"><span>Status</span><select name="status" defaultValue={editA?.status ?? 'Rencana'}>{STATUS_A.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label className="field full"><span>Uraian aksi</span><textarea name="uraian" required defaultValue={editA?.uraian ?? ''} /></label>
            <label className="field full"><span>Deskripsi</span><textarea name="deskripsi" defaultValue={editA?.deskripsi ?? ''} /></label>
            <label className="field"><span>Terkait SEU</span><input name="seu_terkait" defaultValue={editA?.seu_terkait ?? ''} /></label>
            <label className="field"><span>Bagian dari sasaran energi</span><input name="sasaran_teks" defaultValue={editA?.sasaran_teks ?? ''} /></label>
            <label className="field"><span>Sasaran</span>
              <select name="sasaran_id" defaultValue={editA?.sasaran_id ?? ''}>
                <option value="">Tanpa sasaran</option>
                {sasaran.map((s) => <option key={s.id} value={s.id}>{s.kode} · {s.uraian.slice(0, 60)}</option>)}
              </select>
            </label>
            <label className="field"><span>Asal peluang</span>
              <select name="peluang_kode" defaultValue={editA?.peluang_kode ?? ''}>
                <option value="">–</option>
                {peluang.map((p) => <option key={p.kode} value={p.kode}>{p.kode} · {p.uraian.slice(0, 60)}</option>)}
              </select>
            </label>
            <label className="field"><span>PIC</span><input name="pic" defaultValue={editA?.pic ?? ''} /></label>
            <label className="field"><span>Sumber daya</span><input name="sumber_daya" defaultValue={editA?.sumber_daya ?? ''} placeholder="Anggaran, personel, alat" /></label>
            <label className="field"><span>Mulai</span><input type="date" name="mulai" defaultValue={editA?.mulai ?? ''} /></label>
            <label className="field"><span>Tenggat</span><input type="date" name="tenggat" defaultValue={editA?.tenggat ?? ''} /></label>
            <label className="field"><span>Estimasi hemat (kWh/tahun)</span><input type="number" name="estimasi_hemat_kwh" min={0} step="any" defaultValue={editA?.estimasi_hemat_kwh ?? ''} /></label>
            <label className="field"><span>Metode verifikasi hasil</span><input name="metode_verifikasi" defaultValue={editA?.metode_verifikasi ?? ''} placeholder="mis. bandingkan EnPI WTP 3 bulan sebelum/sesudah" /></label>
            <label className="field"><span>Hemat terverifikasi (kWh)</span><input type="number" name="hemat_terverifikasi_kwh" step="any" defaultValue={editA?.hemat_terverifikasi_kwh ?? ''} /></label>
            <label className="field"><span>Tanggal verifikasi</span><input type="date" name="tanggal_verifikasi" defaultValue={editA?.tanggal_verifikasi ?? ''} /></label>
            <label className="field full"><span>Catatan</span><textarea name="catatan" defaultValue={editA?.catatan ?? ''} /></label>
            {usulanAktif && <input type="hidden" name="usulan" value={usulanAktif} />}
          </div>
          {galat && <p className="pesan galat" role="alert" style={{ marginTop: 12 }}>{galat}</p>}
          <div className="toolbar" style={{ marginTop: 16, marginBottom: 0 }}>
            <button className="btn utama" type="submit" disabled={menunggu}>{menunggu ? 'Menyimpan…' : 'Simpan'}</button>
            <span style={{ flex: 1 }} />
            {editA?.id && bisa('sasaran.hapus') && (
              <button type="button" className="btn" onClick={() => {
                if (!confirm(`Hapus rencana aksi ${editA.kode}?`)) return
                mulai(async () => { const h = await hapusAksi(editA.id!); if (!h.ok) return setGalat(h.pesan); dlgA.current?.close(); router.refresh() })
              }}><Trash2 aria-hidden="true" /><span className="teks">Hapus</span></button>
            )}
          </div>
        </form>
      </dialog>
    </>
  )
}

const pct = (v: number | null) => (v === null ? '–' : `${v < 0 ? '−' : ''}${angka(Math.abs(v), 1)}%`)

/** Proyeksi capaian sasaran sampai akhir tahun target. */
function BlokProyeksi({ p, rupiah, kode }: { p: ProyeksiSasaran; rupiah: number | null; kode: string }) {
  const berjalan = p.bulanData > 0 && p.bulanSisa > 0
  return (
    <div className="ss-proyeksi">
      <div className="row" style={{ alignItems: 'center' }}>
        <span className="eyebrow">Proyeksi akhir {p.tahun}</span>
        <Chip kode={CHIP_PROYEKSI[p.status]} label={LABEL_PROYEKSI[p.status]} />
      </div>
      <p className="small" style={{ margin: '6px 0 10px' }}>{p.kalimat}</p>
      {berjalan && (
        <div className="mini-stats" style={{ justifyContent: 'flex-start', marginBottom: 8 }}>
          <div style={{ alignItems: 'flex-start' }}><span>Proyeksi Des</span><b className={`tnum ${(p.proyeksi ?? 0) >= p.target ? 'txt-good' : 'txt-bad'}`}>{pct(p.proyeksi)}</b></div>
          {p.rentang && <div style={{ alignItems: 'flex-start' }}><span>Rentang</span><b className="tnum">{pct(p.rentang[0])} s.d. {pct(p.rentang[1])}</b></div>}
          {p.dibutuhkan !== null && p.status !== 'di_jalur' && <div style={{ alignItems: 'flex-start' }}><span>Butuh/bulan sisa</span><b className="tnum">{p.dibutuhkan > 100 ? '> 100%' : pct(p.dibutuhkan)}</b></div>}
          {!!p.hematKurang && <div style={{ alignItems: 'flex-start' }}><span>Kurang hemat</span><b className="tnum">{angka(p.hematKurang, p.satuan === 'TJ' ? 2 : 0)} {p.satuan}{rupiah ? ` · ${rupiahRingkas(rupiah)}` : ''}</b></div>}
        </div>
      )}
      {p.bulanData > 0 && (
        <Grafik tinggi={200} label={`${kode}: perbaikan kumulatif ${p.tahun} ${pct(p.perbaikanYtd)}, proyeksi akhir tahun ${pct(p.proyeksi)}, target ${pct(p.target)}`} spek={{
          jenis: 'garis', kategori: p.grafik.kategori, satuan: '%',
          seri: [
            { nama: 'Perbaikan kumulatif', data: p.grafik.aktual, warna: 's1' },
            ...(berjalan ? [{ nama: 'Proyeksi laju 3 bulan', data: p.grafik.proyeksi, warna: 's1' as const, putus: true }] : []),
            { nama: 'Target', data: p.grafik.target, warna: 'jingga', putus: true },
          ],
        }} />
      )}
    </div>
  )
}
