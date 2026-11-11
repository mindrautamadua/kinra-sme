import html, sys, os, datetime as dt
sys.path.insert(0, os.path.dirname(__file__))
from data import ITEMS, KLAUSUL, NILAI, AWAL, KEMAJUAN, PERISTIWA

FONT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'app', 'fonts'))
e = html.escape
LBL = {"T": "Terpenuhi", "S": "Sebagian", "B": "Belum"}
PRI = {"K": "Kritis", "M": "Menengah", "R": "Rendah"}
BLN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"]
D = lambda s: dt.date(int(s[:4]), int(s[5:7]), int(s[8:]))
tgl = lambda s: f"{int(s[8:])} {BLN[int(s[5:7]) - 1]}"
fmt = lambda v: f"{v:.0f}"

items = [dict(zip(["k", "judul", "syarat", "kondisi", "st", "gap", "risiko", "aksi", "pic", "tenggat", "pri"], r)) for r in ITEMS]
for i in items: i["st0"], i["awal"] = AWAL[i["k"]]
utama = lambda k: k.split('.')[0]
skor = lambda xs, f: sum(NILAI[x[f]] for x in xs) / len(xs)
klausul = []
for no, nama in KLAUSUL:
    xs = [i for i in items if utama(i["k"]) == no]
    klausul.append(dict(no=no, nama=nama, awal=skor(xs, "st0"), kini=skor(xs, "st"), n=len(xs)))
total0, total = skor(items, "st0"), skor(items, "st")
hit = lambda f, s: sum(i[f] == s for i in items)
kritis = sorted([i for i in items if i["pri"] == "K"], key=lambda i: [int(x) for x in i["k"].split('.')])
gaps = sorted([i for i in items if i["st"] != "T"], key=lambda i: ("KMR".index(i["pri"]), [int(x) for x in i["k"].split('.')]))
naik = sum(i["st"] != i["st0"] for i in items)

# ---------- Grafik 1: dumbbell kondisi awal → kini per klausul ----------
def grafik_klausul():
    W, x0, bw, rh, y0 = 660, 180, 400, 32, 70
    H = y0 + rh * len(klausul) + 34
    X = lambda v: x0 + bw * v / 100
    s = [f'<svg viewBox="0 0 {W} {H}" class="chart" role="img" aria-label="Skor pemenuhan per klausul, awal dan kini">',
         f'<text x="0" y="18" class="ct">Enam dari tujuh klausul naik; klausul 10 belum bergerak dan klausul 9 baru 50%</text>',
         f'<text x="0" y="36" class="cs">Skor pemenuhan per klausul, %. Titik kosong: 20 Okt 2026 · titik penuh: 11 Nov 2026</text>']
    for t in (0, 25, 50, 75, 100):
        s.append(f'<line x1="{X(t)}" x2="{X(t)}" y1="{y0-8}" y2="{H-30}" class="grid"/><text x="{X(t)}" y="{H-14}" class="ax" text-anchor="middle">{t}</text>')
    s.append(f'<line x1="{X(80)}" x2="{X(80)}" y1="{y0-14}" y2="{H-30}" class="ref"/><text x="{X(80)+4}" y="{y0-16}" class="refl">ambang siap Stage 2: 80%</text>')
    for n, k in enumerate(klausul):
        y = y0 + n * rh + 10
        kelas = "low" if k["kini"] < 60 else ("mid" if k["kini"] < 80 else "ok")
        s.append(f'<text x="0" y="{y+4}" class="lab"><tspan class="labno">{k["no"]}</tspan>  {e(k["nama"])}</text>')
        s.append(f'<line x1="{X(k["awal"]):.1f}" x2="{X(k["kini"]):.1f}" y1="{y}" y2="{y}" class="db-line {kelas}"/>')
        s.append(f'<circle cx="{X(k["awal"]):.1f}" cy="{y}" r="5" class="db-awal"/>')
        s.append(f'<circle cx="{X(k["kini"]):.1f}" cy="{y}" r="6" class="db-kini {kelas}"/>')
        s.append(f'<text x="{X(k["kini"])+11:.1f}" y="{y+4}" class="val">{fmt(k["kini"])}%</text>')
        if k["awal"] > 0:
            s.append(f'<text x="{X(k["awal"])-9:.1f}" y="{y+4}" class="mini" text-anchor="end">{fmt(k["awal"])}</text>')
    s.append('</svg>')
    return ''.join(s)

# ---------- Grafik 2: ketersediaan dokumen ----------
def grafik_dokumen():
    W, H, x0, x1, yb, ht = 660, 210, 40, 640, 168, 110
    d0, d1 = D("2026-10-18"), D("2026-11-12")
    X = lambda s: x0 + (D(s) - d0).days / (d1 - d0).days * (x1 - x0)
    Y = lambda v: yb - ht * v / 100
    s = [f'<svg viewBox="0 0 {W} {H}" class="chart" role="img" aria-label="Ketersediaan dokumen SMEn">',
         '<text x="0" y="18" class="ct">Ketersediaan dokumen SMEn naik dari nol menjadi 95,6% dalam 21 hari</text>',
         '<text x="0" y="36" class="cs">% item daftar dokumen berstatus tersedia, menurut rekaman bertanggal</text>']
    for t in (0, 50, 100):
        s.append(f'<line x1="{x0}" x2="{x1}" y1="{Y(t)}" y2="{Y(t)}" class="grid"/><text x="{x0-6}" y="{Y(t)+3}" class="ax" text-anchor="end">{t}</text>')
    pts = [(X(d), Y(0 if b == 0 else a / b * 100)) for d, _, a, b, _ in KEMAJUAN]
    s.append('<polyline points="' + ' '.join(f'{x:.1f},{y:.1f}' for x, y in pts) + '" class="prog"/>')
    for (d, nama, a, b, ket), (x, y) in zip(KEMAJUAN, pts):
        p = 0 if b == 0 else a / b * 100
        s.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="5" class="prog-dot"/>')
        lab = "0 dokumen" if b == 0 else f"{a}/{b} = {p:.1f}%".replace('.', ',')
        anchor = "end" if x > 560 else "start"
        dx = -10 if anchor == "end" else 10
        s.append(f'<text x="{x+dx:.1f}" y="{y-10:.1f}" class="val" text-anchor="{anchor}">{lab}</text>')
        s.append(f'<text x="{x:.1f}" y="{yb+16}" class="mini" text-anchor="middle">{tgl(d)} · {e(nama)}</text>')
    s.append('</svg>')
    return ''.join(s)

# ---------- Peta status ----------
def peta_status(f):
    rows = []
    for no, nama in KLAUSUL:
        xs = [i for i in items if utama(i["k"]) == no]
        rows.append(f'<div class="hm-row"><div class="hm-k">{no}</div><div class="hm-cells">' + ''.join(
            f'<div class="hm-c st-{i[f]}"><b>{i["k"]}</b><span>{e(i["judul"])}</span></div>' for i in xs) + '</div></div>')
    return '<div class="hm">' + ''.join(rows) + '</div>'

# ---------- Grafik 3: peta jalan ----------
def peta_jalan():
    d0, d1 = D("2026-11-09"), D("2026-12-14")
    W, x0, x1 = 680, 220, 660
    X = lambda d: x0 + (d - d0).days / (d1 - d0).days * (x1 - x0)
    rows = [
        ("Tutup siklus audit internal", "2026-11-11", "2026-11-14", "Laporan, rekap, PTP (9.2, 10.1)", False),
        ("Tinjauan manajemen", "2026-11-13", "2026-11-13", "Target kuantitatif, kriteria EnB, sumber daya", False),
        ("Akurasi meter & penetapan SEU", "2026-11-12", "2026-11-18", "Kalibrasi 8 meter, SEU, peluang (6.3, 6.6)", False),
        ("Batas, kompetensi, deviasi", "2026-11-12", "2026-11-19", "4.3, 7.2, 9.1.1", False),
        ("Audit Stage 1 TÜV", "2026-11-20", "2026-11-20", "Kesiapan dokumen dan sistem", True),
        ("Tutup temuan Stage 1", "2026-11-21", "2026-12-05", "Ditambah 8.1, 8.3, bukti peningkatan 10.2", False),
        ("Audit Stage 2 TÜV", "2026-12-10", "2026-12-11", "Penerapan dan efektivitas", True),
    ]
    rh, y0 = 36, 72
    H = y0 + rh * len(rows) + 10
    s = [f'<svg viewBox="0 0 {W} {H}" class="chart" role="img" aria-label="Peta jalan penutupan gap">',
         '<text x="0" y="18" class="ct">Lima gap kritis ditutup sebelum Stage 1 pada 20 November</text>',
         '<text x="0" y="36" class="cs">Peta jalan 9 November – 14 Desember 2026</text>']
    d = d0
    while d <= d1:
        if d.weekday() == 0:
            s.append(f'<line x1="{X(d):.1f}" x2="{X(d):.1f}" y1="{y0-12}" y2="{H-8}" class="grid"/><text x="{X(d):.1f}" y="{y0-18}" class="ax" text-anchor="middle">{d.day} {BLN[d.month-1]}</text>')
        d += dt.timedelta(days=1)
    for g in ("2026-11-20", "2026-12-10"):
        s.append(f'<line x1="{X(D(g)):.1f}" x2="{X(D(g)):.1f}" y1="{y0-8}" y2="{H-8}" class="ref"/>')
    for n, (nama, a, b, ket, gate) in enumerate(rows):
        y = y0 + n * rh
        s.append(f'<text x="0" y="{y+12}" class="lab{" bold" if gate else ""}">{e(nama)}</text><text x="0" y="{y+26}" class="mini">{e(ket)}</text>')
        if a == b:
            cx = X(D(a)); s.append(f'<path d="M{cx:.1f} {y+1}l8 8l-8 8l-8 -8z" class="{"gate" if gate else "ms"}"/>')
        else:
            s.append(f'<rect x="{X(D(a)):.1f}" y="{y+3}" width="{X(D(b))-X(D(a))+4:.1f}" height="13" rx="6.5" class="{"span gate-span" if gate else "span"}"/>')
        txt = tgl(a) + ("" if a == b else f" – {tgl(b)}")
        kanan = X(D(b)) < 590
        s.append(f'<text x="{(X(D(b))+14 if kanan else X(D(a))-12):.1f}" y="{y+14}" class="mini" text-anchor="{"start" if kanan else "end"}">{txt}</text>')
    s.append('</svg>')
    return ''.join(s)

chip = lambda st: f'<span class="chip st-{st}">{LBL[st]}</span>'
pchip = lambda p: f'<span class="pri p-{p}">{PRI[p]}</span>' if p else ''

detail = ''.join(f'''<tr>
<td class="kk">{i['k']}<br><span class="kj">{e(i['judul'])}</span></td>
<td>{e(i['syarat'])}</td>
<td>{chip(i['st0'])}<br>{e(i['awal'])}</td>
<td>{chip(i['st'])}{(' ' + pchip(i['pri'])) if i['pri'] else ''}<br>{e(i['kondisi'])}</td></tr>''' for i in items)

aksi = ''.join(f'''<tr><td class="kk">{i['k']}</td><td>{pchip(i['pri'])}</td><td><b>{e(i['gap'])}</b><br><span class="muted">{e(i['risiko'])}</span></td>
<td>{e(i['aksi'])}</td><td>{e(i['pic'])}</td><td class="nw">{e(i['tenggat'])}</td></tr>''' for i in gaps)

top5 = ''.join(f'<li><b>{i["k"]} {e(i["judul"])}.</b> {e(i["gap"])} <span class="muted">Tenggat {e(i["tenggat"])} · {e(i["pic"])}.</span></li>' for i in kritis)
peristiwa = ''.join(f'<tr><td class="nw">{tgl(d)} 2026</td><td>{e(t)}</td><td>{"Rencana" if D(d) > D("2026-11-11") else "Terlaksana"}</td></tr>' for d, t in PERISTIWA)

css = open(os.path.join(os.path.dirname(__file__), 'gaya.css')).read().replace('{FONT}', FONT)
tpl = open(os.path.join(os.path.dirname(__file__), 'isi.html')).read()
ganti = {
 '{CSS}': css, '{TOTAL0}': fmt(total0), '{TOTAL}': fmt(total), '{NI}': str(len(items)), '{NAIK}': str(naik),
 '{NT}': str(hit("st", "T")), '{NS}': str(hit("st", "S")), '{NB}': str(hit("st", "B")),
 '{NT0}': str(hit("st0", "T")), '{NS0}': str(hit("st0", "S")), '{NB0}': str(hit("st0", "B")),
 '{NK}': str(len(kritis)), '{NGAP}': str(len(gaps)), '{TOP5}': top5,
 '{G_KLAUSUL}': grafik_klausul(), '{G_DOKUMEN}': grafik_dokumen(), '{PETA0}': peta_status("st0"), '{PETA}': peta_status("st"),
 '{JALAN}': peta_jalan(), '{DETAIL}': detail, '{AKSI}': aksi, '{PERISTIWA}': peristiwa,
}
out = tpl
for k, v in ganti.items(): out = out.replace(k, v)
assert '{' not in out.split('<style>')[0] and not any(k in out for k in ganti), 'placeholder tersisa'
open(sys.argv[1], 'w').write(out)
print('awal', round(total0, 1), 'kini', round(total, 1), [(k["no"], round(k["awal"]), round(k["kini"])) for k in klausul])
