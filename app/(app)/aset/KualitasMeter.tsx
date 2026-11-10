import { angka, BULAN_PANJANG, persen } from '@/lib/format'
import { AMBANG_KUALITAS, LABEL_STATUS, LABEL_TEMUAN, type periksaKualitasMeter, type StatusSel } from '@/lib/kualitas-meter'

type Hasil = ReturnType<typeof periksaKualitasMeter>

const URUT_LEGENDA: Exclude<StatusSel, 'luar'>[] = ['baik', 'isian', 'bergeser', 'anomali', 'masalah', 'kosong']

/** Heatmap kualitas data meter × bulan dan daftar temuan pemeriksaan otomatis. */
export function KualitasMeter({ hasil }: { hasil: Hasil }) {
  const { bulan, baris, temuan, ringkas } = hasil
  const awalTahun = new Set(bulan.map((b, i) => (b.bulan === 1 || i === 0 ? i : -1)).filter((i) => i >= 0))
  return (
    <>
      <div className="tiles">
        <div className="tile"><span className="label">Bulan-meter wajar</span>
          <div className="nilai tnum">{angka(ringkas.skor, 0)}<small>%</small></div>
          <div className="meta">{ringkas.baik} dari {ringkas.sel} bulan-meter{ringkas.isian ? ` · ${ringkas.isian} diisi 0` : ''}</div></div>
        <div className="tile"><span className="label">Bacaan janggal</span>
          <div className="nilai tnum">{ringkas.masalah}</div>
          <div className="meta">Stand mundur, tidak bersambung, atau beda dengan tagihan</div></div>
        <div className="tile"><span className="label">Di luar pola</span>
          <div className="nilai tnum">{ringkas.anomali}<small>bulan</small></div>
          <div className="meta">{ringkas.bergeser ? `${ringkas.bergeser} bulan lain masuk rangkaian pola berubah` : 'Skor z robust terhadap 12 bulan sebelumnya'}</div></div>
        <div className="tile"><span className="label">Bulan kosong</span>
          <div className="nilai tnum">{ringkas.kosong}</div>
          <div className="meta">{ringkas.dariStand} bulan-meter dari stand, sisanya kWh tagihan</div></div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Peta kualitas data {bulan.length} bulan terakhir</h3>
        <p className="muted small">Satu baris per meter, satu kotak per bulan. Arahkan kursor ke kotak untuk melihat kWh dan alasan penandaannya.</p>
        <div className="km-gulir">
          <table className="km-peta">
            <thead>
              <tr>
                <th scope="col">Meter</th>
                {bulan.map((b, i) => <th key={b.label} scope="col" className={awalTahun.has(i) ? 'km-tahun' : undefined}><span>{b.label.slice(0, 3)}</span>{awalTahun.has(i) && <small>{b.tahun}</small>}</th>)}
                <th scope="col" className="num">Wajar</th>
              </tr>
            </thead>
            <tbody>
              {baris.map((r) => (
                <tr key={r.meter.kode}>
                  <th scope="row"><span className="kode">{r.meter.kode.replace('KINRA-', '')}</span> {r.nama}</th>
                  {r.sel.map((s) => {
                    const judul = s.status === 'luar' ? `${s.label}: sebelum bacaan pertama` : `${s.label}: ${s.kwh !== null ? `${angka(s.kwh, 0)} kWh (${s.asal === 'stand' ? 'dari stand' : 'kWh tagihan'})` : 'tanpa data'} · ${LABEL_STATUS[s.status]}${s.ket.length ? ` · ${s.ket.join('; ')}` : ''}`
                    return <td key={s.label} className={`km-sel s-${s.status}`} title={judul}><span className="sr-only">{judul}</span></td>
                  })}
                  <td className="num tnum">{r.skor === null ? '–' : persen(r.skor, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pa-legenda">
          {URUT_LEGENDA.map((s) => <span key={s}><i className={`km-warna s-${s}`} />{LABEL_STATUS[s]}</span>)}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Temuan pemeriksaan otomatis</h3>
        <p className="muted small">
          Di luar pola: |skor z robust| &gt; {angka(AMBANG_KUALITAS.zRobust, 1)} dan selisih &gt; {AMBANG_KUALITAS.persenPola}% dari median {AMBANG_KUALITAS.riwayatMaks} bulan sebelumnya (minimal {AMBANG_KUALITAS.riwayatMin} bulan riwayat).
          {' '}{AMBANG_KUALITAS.bulanGeser} bulan atau lebih berturut-turut ke arah yang sama dicatat sekali sebagai pola berubah.
          {' '}Selisih tagihan diperiksa bila stand dan kWh tagihan sama-sama terisi (ambang {AMBANG_KUALITAS.persenTagihan}%).
          {' '}Temuan ini bahan penyelidikan, bukan kesimpulan: konfirmasi ke PIC data sebelum mengoreksi.
        </p>
        {temuan.length === 0 ? <p className="pesan">Tidak ada temuan dalam {bulan.length} bulan terakhir.</p> : (
          <div className="km-gulir">
            <table className="tbl">
              <thead><tr><th>Bulan</th><th>Meter</th><th>Temuan</th><th className="num">Nilai</th><th className="num">Pembanding</th><th>Keterangan</th></tr></thead>
              <tbody>
                {temuan.map((t) => (
                  <tr key={t.kunci}>
                    <td className="kode">{BULAN_PANJANG[t.bulan - 1].slice(0, 3)} {t.tahun}</td>
                    <td><span className="kode">{t.meter_kode.replace('KINRA-', '')}</span><span className="upd">{t.meter_nama}</span></td>
                    <td><span className={`chip ${t.tingkat === 'crit' ? 'crit' : t.tingkat === 'warn' ? 'warn' : 'info'}`}>{LABEL_TEMUAN[t.jenis]}</span></td>
                    <td className="num">{t.nilai === null ? '–' : angka(t.nilai, 0)}</td>
                    <td className="num">{t.pembanding === null ? '–' : angka(t.pembanding, 0)}{t.selisih_persen !== null && <span className="upd">{t.selisih_persen > 0 ? '+' : ''}{angka(t.selisih_persen, 0)}%</span>}</td>
                    <td className="small">{t.teks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )
}
