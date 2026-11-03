import 'server-only'
import { ambilIsu, ambilKinerja, ambilPeluang, ambilSasaran, ambilVariabel } from '@/lib/data'
import { LABEL_METODE, rumus } from '@/lib/enpi'
import { angka } from '@/lib/format'
import { tingkatRisiko } from '@/lib/status'
import { TABEL_TERTAUT } from './tautan'

const s = (v: unknown) => (v === null || v === undefined ? '' : String(v))
const kwh = (v: number | null) => (v === null ? '' : angka(v))

/**
 * Baris tabel tertaut untuk satu templat, dibangun dari data terstruktur aplikasi.
 * Mengembalikan objek kosong bila templat tidak punya tabel tertaut.
 */
export async function tabelDariData(kode: string): Promise<Record<string, string[][]>> {
  if (!TABEL_TERTAUT[kode]) return {}

  if (kode === 'isu-internal-eksternal') {
    const isu = await ambilIsu()
    return {
      t1: isu.map((i) => [i.asal, i.jenis, i.uraian, s(i.dampak), s(i.kemungkinan), tingkatRisiko(i.skor).label, s(i.tindakan), s(i.evaluasi)]),
    }
  }

  if (kode === 'peluang-peningkatan') {
    const peluang = await ambilPeluang()
    return {
      t2: peluang.map((p) => [
        p.kode, p.uraian, s(p.variabel), s(p.metode), s(p.pemilik),
        [p.skor_energi !== null && `Skor energi: ${p.skor_energi}`, p.skor_roi !== null && `ROI: ${p.skor_roi}`, p.prioritas !== null && `prioritas: ${angka(p.prioritas, 1)}`].filter(Boolean).join('; '),
        p.status,
      ]),
    }
  }

  if (kode === 'register-peluang') {
    const [peluang, { sasaran, aksi }] = await Promise.all([ambilPeluang(), ambilSasaran()])
    return {
      t1: peluang.map((p, i) => {
        const terkait = aksi.filter((a) => a.peluang_kode === p.kode)
        const sas = sasaran.find((x) => terkait.some((a) => a.sasaran_id === x.id))
        const hemat = terkait.reduce((t, a) => t + (a.hemat_terverifikasi_kwh ?? 0), 0)
        const selesai = terkait.map((a) => a.tanggal_verifikasi).filter(Boolean).sort().at(-1)
        // 22 kolom: lihat lib/formulir/templat/register-peluang.json
        return [
          String(i + 1), p.uraian, s(p.metode), s(p.variabel), s(sas?.uraian), s(p.pemilik), '',
          kwh(p.estimasi_kwh), '', '', '', '', '', '', '', '',
          p.prioritas === null ? '' : angka(p.prioritas, 1), p.status, s(selesai), hemat ? kwh(hemat) : '', '', '',
        ]
      }),
    }
  }

  if (kode === 'tujuan-target-energi') {
    const [{ sasaran, aksi }, { enpi }] = await Promise.all([ambilSasaran(), ambilKinerja()])
    return {
      t4: sasaran.map((x, i) => {
        const e = enpi.find((v) => v.kode === x.enpi_kode)
        return [
          String(i + 1), e ? `${e.kode} ${e.nama}` : '',
          [x.uraian, x.target_persen !== null && `turun ${angka(x.target_persen, 1)}% dari baseline`].filter(Boolean).join('; '),
          e ? `${e.baseline_mulai} s.d. ${e.baseline_selesai}` : '',
          s(x.tahun_target), s(x.pic),
        ]
      }),
      t9: aksi.map((a) => [
        `${a.kode} ${a.uraian}`,
        a.estimasi_hemat_kwh !== null ? `Estimasi hemat ${kwh(a.estimasi_hemat_kwh)} kWh/tahun` : '',
        s(a.pic),
        [a.tenggat, a.status].filter(Boolean).join(' · '),
      ]),
    }
  }

  if (kode === 'enpi-baseline') {
    const { sumber, hasil } = await ambilKinerja()
    const namaSumber = (k: string[]) => k.map((x) => sumber.find((v) => v.kode === x)?.nama ?? x).join(', ')
    return {
      t2: hasil.map((h) => [
        `${h.enpi.kode} ${h.enpi.nama}`,
        `${h.satuan} · ${LABEL_METODE[h.enpi.metode]}`,
        s(h.enpi.catatan),
        [`Konsumsi ${namaSumber(h.enpi.sumber_kode)}`, h.variabel.length ? `variabel: ${h.variabel.map((v) => v.nama).join(', ')}` : ''].filter(Boolean).join('; '),
      ]),
      t4: hasil.map((h) => {
        const total = h.baseline.reduce((t, x) => t + (x.aktual ?? 0), 0)
        return [
          `${h.enpi.kode} ${h.enpi.nama}`,
          `${h.enpi.baseline_mulai} s.d. ${h.enpi.baseline_selesai}${h.enpi.alasan_baseline ? ` (${h.enpi.alasan_baseline})` : ''}`,
          rumus(h, (v) => angka(v, 2)) ?? `${angka(total)} ${h.satuan} selama ${h.baseline.length} bulan`,
          h.variabel.length ? h.variabel.map((v) => `${v.nama} (${v.satuan})`).join(', ') : 'Tanpa normalisasi',
          `Data bulanan ${namaSumber(h.enpi.sumber_kode)} di aplikasi SMEn${h.model?.r2 != null ? `; R² ${angka(h.model.r2, 2)}` : ''}`,
          '',
        ]
      }),
    }
  }

  if (kode === 'pengumpulan-data-energi') {
    const { variabel } = await ambilVariabel()
    return {
      t3: variabel.map((v) => [`${v.nama} (${v.satuan})`, s(v.keterangan), 'Input bulanan di halaman Kinerja Energi'])
    }
  }

  return {}
}
