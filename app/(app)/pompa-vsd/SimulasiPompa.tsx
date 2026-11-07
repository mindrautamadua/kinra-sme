'use client'

import { useEffect, useRef, useState } from 'react'
import type * as T3 from 'three'
import { angka } from '@/lib/format'
import { dayaKatup, dayaVsd, kondisiPompa, type ModePompa, POMPA_WTP1 } from '@/lib/pompa'

type Target = { n: number; q: number; katup: number; mode: ModePompa }

export function SimulasiPompa({ tarif }: { tarif: number }) {
  const [mode, setMode] = useState<ModePompa>('vsd')
  const [q, setQ] = useState(0.75)
  const [hs, setHs] = useState(0.2)
  const [gagal3d, setGagal3d] = useState(false)
  const panggung = useRef<HTMLDivElement>(null)
  const target = useRef<Target>({ n: 1, q: 0.75, katup: 1, mode: 'vsd' })

  const k = kondisiPompa(mode, q, hs)
  target.current = { n: k.n, q, katup: k.katup, mode }
  const pk = dayaKatup(q), pv = dayaVsd(q, hs), selisih = pk - pv

  useEffect(() => {
    let batal = false
    let bersihkan: (() => void) | undefined
    ;(async () => {
      try {
        const THREE = await import('three')
        const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')
        if (batal || !panggung.current) return
        bersihkan = bangunAdegan(THREE, OrbitControls, panggung.current, target)
      } catch {
        if (!batal) setGagal3d(true)
      }
    })()
    return () => { batal = true; bersihkan?.() }
  }, [])

  return (
    <div className="pv-utama">
      <div className="pv-panggung" ref={panggung}>
        <span className="pv-tag pv-mode">{mode === 'vsd' ? 'Mode VSD' : 'Mode katup · VSD di-bypass'}</span>
        <span className="pv-tag pv-petunjuk">Seret untuk memutar · gulir untuk zoom</span>
        {gagal3d && <p className="pv-gagal muted">Tampilan 3D tidak dapat dimuat di perangkat ini. Panel kendali dan grafik tetap berfungsi.</p>}
      </div>

      <div className="card pv-panel">
        <nav className="seg pv-seg" aria-label="Cara mengatur debit">
          <button type="button" aria-pressed={mode === 'katup'} onClick={() => setMode('katup')}>Katup ditutup sebagian</button>
          <button type="button" aria-pressed={mode === 'vsd'} onClick={() => setMode('vsd')}>VSD</button>
        </nav>
        <div className="pv-ctl">
          <label htmlFor="pv-q">Kebutuhan debit <output className="tnum">{Math.round(q * 100)}%</output></label>
          <input id="pv-q" type="range" min={40} max={100} step={1} value={Math.round(q * 100)} onChange={(e) => setQ(Number(e.target.value) / 100)} />
          <span className="muted small">{angka(q * POMPA_WTP1.debitM3Jam, 0)} m³/jam dari kapasitas {POMPA_WTP1.debitM3Jam} m³/jam per pompa</span>
        </div>
        <div className="pv-ctl">
          <label htmlFor="pv-hs">Head statis jaringan <output className="tnum">{Math.round(hs * 100)}%</output></label>
          <input id="pv-hs" type="range" min={0} max={60} step={5} value={Math.round(hs * 100)} onChange={(e) => setHs(Number(e.target.value) / 100)} />
          <span className="muted small">Porsi tekanan yang tetap dibutuhkan walau debit kecil (beda ketinggian, tekanan minimum di ujung jaringan).</span>
        </div>
        <div className="pv-angka">
          <div><span>Frekuensi</span><b className="tnum">{angka(k.hz, 1)}<small>Hz</small></b></div>
          <div><span>Putaran motor</span><b className="tnum">{angka(k.rpm, 0)}<small>rpm</small></b></div>
          <div><span>Bukaan katup</span><b className="tnum">{angka(k.katup * 100, 0)}<small>% terbuka</small></b></div>
          <div><span>Daya motor</span><b className="tnum">{angka(k.kw, 1)}<small>kW</small></b></div>
        </div>
        <div className={`pv-hemat ${selisih > 0.5 ? '' : 'nol'}`}>
          {selisih > 0.5 ? (
            <>
              <b>VSD lebih hemat {angka(selisih, 1)} kW ({angka((selisih / pk) * 100, 0)}%) dibanding katup</b>
              <span>Setara ±{angka(selisih * 24, 0)} kWh/hari atau ±Rp{angka((selisih * 24 * tarif) / 1e6, 2)} juta/hari per pompa bila kondisi ini berlangsung 24 jam.</span>
            </>
          ) : (
            <>
              <b>Pada debit penuh, VSD dan katup hampir sama</b>
              <span>Putaran tidak bisa diturunkan saat pompa harus bekerja penuh, sehingga VSD hampir tidak menghemat.</span>
            </>
          )}
        </div>
      </div>

      <div className="card pv-grafik">
        <h3>Daya motor pada setiap debit</h3>
        <p className="muted small">Satu pompa {POMPA_WTP1.dayaKw} kW. Titik menunjukkan kondisi yang dipilih.</p>
        <div className="pv-legenda"><span><i style={{ background: 'var(--s2)' }} />Katup ditutup sebagian (50 Hz)</span><span><i style={{ background: 'var(--s1)' }} />VSD</span><span><i className="putus" />Hukum afinitas murni (head statis 0)</span></div>
        <Kurva q={q} hs={hs} mode={mode} />
      </div>

      <div className="card pv-tabel">
        <h3>Hukum afinitas</h3>
        <p className="muted small">Pompa sentrifugal, efisiensi dianggap tetap.</p>
        <div className="table-wrap">
          <table className="tbl">
            <thead><tr><th>Putaran</th><th className="num">Debit</th><th className="num">Tekanan</th><th className="num">Daya</th></tr></thead>
            <tbody>
              {[1, 0.9, 0.8, 0.7].map((n) => (
                <tr key={n}><td>{angka(n * 100, 0)}% · {angka(n * 50, 0)} Hz</td><td className="num">{angka(n * 100, 0)}%</td><td className="num">{angka(n * n * 100, 0)}%</td><td className="num">{angka(n ** 3 * 100, 0)}%</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted small">Debit sebanding putaran, tekanan sebanding kuadratnya, daya sebanding pangkat tiganya.</p>
      </div>
    </div>
  )
}

function Kurva({ q, hs, mode }: { q: number; hs: number; mode: ModePompa }) {
  const W = 560, H = 300, L = 46, R = 14, T = 16, B = 40
  const x = (v: number) => L + ((v - 0.4) / 0.6) * (W - L - R)
  const y = (p: number) => T + (1 - p / 80) * (H - T - B)
  const garis = (f: (v: number) => number) => Array.from({ length: 61 }, (_, i) => 0.4 + i / 100).map((v, i) => `${i ? 'L' : 'M'}${x(v).toFixed(1)},${y(f(v)).toFixed(1)}`).join('')
  const a = dayaKatup(q), v = dayaVsd(q, hs)
  return (
    <svg className="pv-svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Daya katup ${angka(a, 1)} kW dan VSD ${angka(v, 1)} kW pada debit ${Math.round(q * 100)}%`}>
      {[0, 20, 40, 60, 80].map((p) => (
        <g key={p}><line x1={L} x2={W - R} y1={y(p)} y2={y(p)} stroke="var(--line-2)" /><text x={L - 8} y={y(p) + 4} textAnchor="end">{p}</text></g>
      ))}
      {[40, 50, 60, 70, 80, 90, 100].map((p) => <text key={p} x={x(p / 100)} y={H - B + 18} textAnchor="middle">{p}%</text>)}
      <text x={L - 8} y={T - 4} textAnchor="end" className="lab">kW</text>
      <text x={(L + W - R) / 2} y={H - 6} textAnchor="middle" className="lab">Debit (% kapasitas pompa)</text>
      <path d={garis((t) => dayaVsd(t, 0))} fill="none" stroke="var(--muted)" strokeWidth={1.5} strokeDasharray="4 4" />
      <path d={garis(dayaKatup)} fill="none" stroke="var(--s2)" strokeWidth={2.5} />
      <path d={garis((t) => dayaVsd(t, hs))} fill="none" stroke="var(--s1)" strokeWidth={2.5} />
      <line x1={x(q)} x2={x(q)} y1={y(a)} y2={y(v)} stroke="var(--good)" strokeWidth={2} />
      <circle cx={x(q)} cy={y(a)} r={mode === 'katup' ? 7 : 5} fill="var(--s2)" stroke="var(--surface)" strokeWidth={2} />
      <circle cx={x(q)} cy={y(v)} r={mode === 'vsd' ? 7 : 5} fill="var(--s1)" stroke="var(--surface)" strokeWidth={2} />
    </svg>
  )
}

/** Adegan 3D pompa sentrifugal + motor + katup + lemari VSD. Mengembalikan fungsi pembersih. */
function bangunAdegan(THREE: typeof import('three'), OrbitControls: typeof import('three/examples/jsm/controls/OrbitControls.js').OrbitControls,
  wadah: HTMLDivElement, target: React.RefObject<Target>) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  wadah.prepend(renderer.domElement)
  const sc = new THREE.Scene()
  const cam = new THREE.PerspectiveCamera(38, 16 / 11, 0.1, 100)
  cam.position.set(7.5, 5.2, 9.5)
  const ctl = new OrbitControls(cam, renderer.domElement)
  ctl.target.set(0.6, 1.1, 0); ctl.enableDamping = true; ctl.minDistance = 6; ctl.maxDistance = 22; ctl.maxPolarAngle = Math.PI * 0.49
  sc.add(new THREE.HemisphereLight(0xffffff, 0x8899aa, 2.4))
  const sun = new THREE.DirectionalLight(0xffffff, 2.2); sun.position.set(5, 9, 6); sc.add(sun)

  const M = (c: number, o: { m?: number; r?: number; t?: number } = {}) =>
    new THREE.MeshStandardMaterial({ color: c, metalness: o.m ?? 0.35, roughness: o.r ?? 0.5, transparent: o.t !== undefined, opacity: o.t ?? 1 })
  const tosca = M(0x00797e), baja = M(0x8a9ca0, { m: 0.6, r: 0.35 }), gelap = M(0x24363a, { m: 0.4 }), pipa = M(0x5f7c84, { m: 0.5, r: 0.4 }), kuning = M(0xfcaf17, { m: 0.3 })
  const add = <T extends T3.Object3D>(o: T, pos?: [number, number, number], rot?: [number, number, number], ke: T3.Object3D = sc) => {
    if (pos) o.position.set(...pos); if (rot) o.rotation.set(...rot); ke.add(o); return o
  }
  const mesh = (g: T3.BufferGeometry, m: T3.Material) => new THREE.Mesh(g, m)

  // Lantai dan skid
  add(mesh(new THREE.CylinderGeometry(7, 7, 0.05, 64), M(0xb9c9cb, { m: 0, r: 0.9, t: 0.5 })), [0.5, -0.03, 0])
  add(mesh(new THREE.BoxGeometry(5.4, 0.25, 1.8), gelap), [0.4, 0.12, 0])

  // Motor dengan sirip pendingin
  const motor = add(new THREE.Group(), [1.7, 1.05, 0])
  add(mesh(new THREE.CylinderGeometry(0.62, 0.62, 2.0, 40), tosca), undefined, [0, 0, Math.PI / 2], motor)
  for (let i = -0.85; i <= 0.86; i += 0.17) add(mesh(new THREE.TorusGeometry(0.64, 0.035, 8, 40), tosca), [i, 0, 0], [0, Math.PI / 2, 0], motor)
  add(mesh(new THREE.CylinderGeometry(0.5, 0.62, 0.3, 40), gelap), [1.15, 0, 0], [0, 0, Math.PI / 2], motor)
  add(mesh(new THREE.BoxGeometry(0.5, 0.32, 0.45), gelap), [0.1, 0.72, 0], undefined, motor)
  add(mesh(new THREE.BoxGeometry(1.7, 0.4, 1.1), gelap), [0, -0.62, 0], undefined, motor)

  // Poros + kopling
  const poros = add(new THREE.Group(), [0.3, 1.05, 0])
  add(mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.2, 16), baja), undefined, [0, 0, Math.PI / 2], poros)
  add(mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.3, 6), kuning), undefined, [0, 0, Math.PI / 2], poros)

  // Rumah pompa transparan + impeller
  const kaca = M(0x7fa8ad, { m: 0.2, r: 0.25, t: 0.3 })
  add(mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.55, 48, 1, true), kaca), [-0.6, 1.05, 0], [0, 0, Math.PI / 2])
  add(mesh(new THREE.CircleGeometry(1.0, 48), M(0x7fa8ad, { m: 0.2, r: 0.25, t: 0.2 })), [-0.33, 1.05, 0], [0, Math.PI / 2, 0])
  add(mesh(new THREE.TorusGeometry(1.0, 0.05, 8, 48), baja), [-0.33, 1.05, 0], [0, Math.PI / 2, 0])
  add(mesh(new THREE.TorusGeometry(1.0, 0.05, 8, 48), baja), [-0.87, 1.05, 0], [0, Math.PI / 2, 0])
  add(mesh(new THREE.BoxGeometry(0.6, 0.9, 0.5), gelap), [-0.6, 0.38, 0])
  const imp = add(new THREE.Group(), [-0.6, 1.05, 0])
  add(mesh(new THREE.CylinderGeometry(0.78, 0.78, 0.06, 40), baja), undefined, [0, 0, Math.PI / 2], imp)
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2
    add(mesh(new THREE.BoxGeometry(0.34, 0.62, 0.05), kuning), [0.05, Math.cos(a) * 0.42, Math.sin(a) * 0.42], [-a + 0.5, 0, 0], imp)
  }
  add(mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.4, 20), baja), undefined, [0, 0, Math.PI / 2], imp)

  // Pipa hisap dan tekan
  const tabung = (pts: [number, number, number][]) => {
    const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)), false, 'catmullrom', 0.02)
    add(mesh(new THREE.TubeGeometry(c, 120, 0.22, 20, false), pipa)); return c
  }
  const cHisap = tabung([[-4.4, 1.05, 0], [-2.6, 1.05, 0], [-1.6, 1.05, 0], [-0.95, 1.05, 0]])
  const cTekan = tabung([[-0.6, 1.95, 0], [-0.6, 2.9, 0], [-0.5, 3.35, 0], [0.3, 3.45, 0], [2.8, 3.45, 0], [4.6, 3.45, 0]])
  add(mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.12, 24), baja), [-2.6, 1.05, 0], [0, 0, Math.PI / 2])
  add(mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.12, 24), baja), [-0.6, 2.6, 0])
  add(mesh(new THREE.BoxGeometry(1.4, 1.8, 1.8), M(0x9fb8bb, { m: 0.1, r: 0.6, t: 0.4 })), [-5.0, 0.9, 0])
  add(mesh(new THREE.BoxGeometry(1.32, 1.2, 1.72), M(0x32a3dc, { m: 0, r: 0.2, t: 0.55 })), [-5.0, 0.62, 0])

  // Katup di pipa tekan
  const katup = add(new THREE.Group(), [1.6, 3.45, 0])
  add(mesh(new THREE.BoxGeometry(0.55, 0.7, 0.62), M(0xe0700f, { m: 0.3 })), undefined, undefined, katup)
  const batang = add(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.9, 12), baja), [0, 0.75, 0], undefined, katup)
  const roda = add(mesh(new THREE.TorusGeometry(0.32, 0.05, 8, 28), M(0xc4320a, { m: 0.3 })), [0, 1.2, 0], [Math.PI / 2, 0, 0], katup)

  // Lemari VSD dengan layar frekuensi
  const vsd = add(new THREE.Group(), [4.3, 0, -1.9])
  add(mesh(new THREE.BoxGeometry(1.2, 2.3, 0.7), M(0xdfe6e7, { m: 0.2, r: 0.6 })), [0, 1.15, 0], undefined, vsd)
  const layarCv = document.createElement('canvas'); layarCv.width = 256; layarCv.height = 128
  const layarTx = new THREE.CanvasTexture(layarCv); layarTx.colorSpace = THREE.SRGBColorSpace
  add(mesh(new THREE.PlaneGeometry(0.8, 0.4), new THREE.MeshBasicMaterial({ map: layarTx })), [0, 1.65, 0.36], undefined, vsd)
  add(mesh(new THREE.SphereGeometry(0.06, 12, 12), new THREE.MeshBasicMaterial({ color: 0x1baf7a })), [-0.35, 1.25, 0.36], undefined, vsd)
  const kabel = new THREE.CatmullRomCurve3([new THREE.Vector3(4.3, 0.05, -1.55), new THREE.Vector3(3.2, 0.05, -1.2), new THREE.Vector3(1.8, 0.05, -0.9), new THREE.Vector3(1.8, 1.7, -0.25)])
  add(mesh(new THREE.TubeGeometry(kabel, 60, 0.045, 8, false), M(0x1b2b2e, { m: 0.1, r: 0.8 })))

  // Partikel air
  const jalur = new THREE.CatmullRomCurve3([...cHisap.getSpacedPoints(40), ...cTekan.getSpacedPoints(80)])
  const NP = 90
  const gp = new THREE.SphereGeometry(0.075, 10, 10), mp = new THREE.MeshBasicMaterial({ color: 0x32a3dc })
  const partikel = Array.from({ length: NP }, (_, i) => ({ m: add(mesh(gp, mp)), t: i / NP, j: (Math.random() - 0.5) * 0.16, k: (Math.random() - 0.5) * 0.16, i }))

  const cur = { n: target.current.n, q: target.current.q, katup: target.current.katup }
  let sudut = 0, last = performance.now(), layarT = 1, raf = 0
  const tulisLayar = () => {
    const c = layarCv.getContext('2d')!
    c.fillStyle = '#062226'; c.fillRect(0, 0, 256, 128)
    c.fillStyle = target.current.mode === 'vsd' ? '#3cc2c6' : '#f08a33'
    c.font = '600 22px monospace'; c.fillText(target.current.mode === 'vsd' ? 'VSD RUN' : 'BYPASS', 16, 34)
    c.font = '700 52px monospace'; c.fillText((50 * cur.n).toFixed(1), 16, 96)
    c.font = '600 24px monospace'; c.fillText('Hz', 186, 96)
    layarTx.needsUpdate = true
  }
  const ukur = () => {
    const w = wadah.clientWidth, h = wadah.clientHeight
    if (!w || !h) return
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix()
  }
  const ro = new ResizeObserver(ukur); ro.observe(wadah); ukur()
  const loop = (now: number) => {
    // Cap waktu rAF bisa lebih awal dari performance.now() saat adegan dibuat: jaga dt tetap 0–0,05 s
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now
    const t = target.current, f = 1 - Math.pow(0.02, dt)
    cur.n += (t.n - cur.n) * f; cur.q += (t.q - cur.q) * f; cur.katup += (t.katup - cur.katup) * f
    const laju = reduce ? 0.08 : 1
    sudut += cur.n * 9 * dt * laju
    imp.rotation.x = sudut; poros.rotation.x = sudut
    batang.position.y = 0.45 + cur.katup * 0.3; roda.position.y = 0.9 + cur.katup * 0.3; roda.rotation.z = cur.katup * 6
    const v = cur.q * 0.16 * dt * laju
    for (const p of partikel) {
      p.t = (((p.t + v) % 1) + 1) % 1
      const pos = jalur.getPointAt(p.t)
      p.m.position.set(pos.x, pos.y + p.j, pos.z + p.k)
      p.m.visible = p.i / NP < 0.35 + cur.q * 0.65
    }
    if ((layarT += dt) > 0.12) { layarT = 0; tulisLayar() }
    ctl.update(); renderer.render(sc, cam)
    raf = requestAnimationFrame(loop)
  }
  raf = requestAnimationFrame(loop)

  return () => {
    cancelAnimationFrame(raf); ro.disconnect(); ctl.dispose()
    sc.traverse((o) => {
      const m = o as T3.Mesh
      m.geometry?.dispose()
      const mat = m.material as T3.Material | T3.Material[] | undefined
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose()); else mat?.dispose()
    })
    layarTx.dispose(); renderer.dispose(); renderer.domElement.remove()
  }
}
