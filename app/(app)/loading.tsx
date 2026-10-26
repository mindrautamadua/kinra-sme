// Kerangka halaman saat data server dimuat (semua halaman force-dynamic)
export default function Memuat() {
  return (
    <section aria-busy="true" aria-label="Memuat halaman">
      <div className="section-head">
        <div className="kerangka" style={{ width: 160, height: 11 }} />
        <div className="kerangka" style={{ width: '62%', height: 40 }} />
        <div className="kerangka" style={{ width: '44%', height: 14 }} />
      </div>
      <div className="tiles">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="tile">
            <div className="tile-head"><div className="kerangka" style={{ width: 30, height: 30, borderRadius: 9 }} /><div className="kerangka" style={{ width: '50%', height: 12 }} /></div>
            <div className="kerangka" style={{ width: '45%', height: 34 }} />
            <div className="kerangka" style={{ width: '70%', height: 12, marginTop: 10 }} />
          </div>
        ))}
      </div>
      <div className="card" style={{ marginTop: 16 }}>
        <div className="kerangka" style={{ width: 220, height: 16, marginBottom: 18 }} />
        <div className="kerangka" style={{ height: 260 }} />
      </div>
    </section>
  )
}
