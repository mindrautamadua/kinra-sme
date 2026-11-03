"""Bangun templat formulir aplikasi dari berkas asli di folder `formulir/`.

Jalankan dari akar repo:  python3 -I scripts/impor_formulir.py
Hasil: lib/formulir/templat/<kode>.json (satu berkas per formulir).

Struktur templat sinkron dengan tipe `Templat` di lib/formulir/tipe.ts.
Jalankan ulang setiap kali berkas sumber di `formulir/` direvisi.
"""
import glob
import json
import os
import re
import sys
import zipfile
from xml.etree import ElementTree as ET

import openpyxl

AKAR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SUMBER = os.path.join(AKAR, 'formulir')
KELUAR = os.path.join(AKAR, 'lib', 'formulir', 'templat')

W = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
LABEL_KEPALA = ('Nomor Dokumen', 'Revisi', 'Tanggal Berlaku', 'Bagian', 'Sub Bagian', 'Lokasi Penyimpanan', 'Divisi', 'Departemen')
TTD_SOP = [
    {'peran': 'Disiapkan oleh', 'jabatan': 'Dokumen Kontrol'},
    {'peran': 'Ditinjau oleh', 'jabatan': 'Management Representative'},
    {'peran': 'Disetujui oleh', 'jabatan': 'Direktur'},
]
KOTAK = ('☐', '☑', '☒', '□', '■')


def bersih(s):
    s = (s or '').replace(' ', ' ').replace('\t', ' ')
    s = re.sub(r'[ ]{2,}', ' ', s).strip()
    # sel yang hanya berisi garis isian dianggap kosong
    return '' if re.fullmatch(r'[_\s./:;-]*', s) and '_' in s else s


# ---------------------------------------------------------------------------
# DOCX
# ---------------------------------------------------------------------------

def teks_p(p):
    """Teks paragraf tanpa isi kotak teks (txbxContent) yang tertanam."""
    out = []
    for el in p.iter():
        if el.tag == W + 't':
            out.append(el.text or '')
        elif el.tag == W + 'tab':
            out.append(' ')
        elif el.tag == W + 'br':
            out.append('\n')
    return bersih(''.join(out))


def judul_p(p, t):
    ppr = p.find(W + 'pPr')
    gaya = ppr.find(W + 'pStyle').get(W + 'val') if ppr is not None and ppr.find(W + 'pStyle') is not None else ''
    if re.search(r'heading|judul|title', gaya, re.I):
        return True
    if ppr is not None and ppr.find(W + 'numPr') is not None:
        return False
    runs = [r for r in p.findall(W + 'r') if ''.join(x.text or '' for x in r.iter(W + 't')).strip()]
    tebal = runs and all(r.find(W + 'rPr') is not None and r.find(W + 'rPr').find(W + 'b') is not None
                         and r.find(W + 'rPr').find(W + 'b').get(W + 'val') not in ('0', 'false') for r in runs)
    return bool(tebal) and len(t) < 160 and not t.endswith('.')


def sel(tc):
    teks = '\n'.join(x for x in (teks_p(p) for p in tc.findall('.//' + W + 'p')) if x)
    tcpr = tc.find(W + 'tcPr')
    span, lanjut = 1, False
    if tcpr is not None:
        g = tcpr.find(W + 'gridSpan')
        if g is not None:
            span = int(g.get(W + 'val'))
        v = tcpr.find(W + 'vMerge')
        lanjut = v is not None and v.get(W + 'val') in (None, 'continue')
    return bersih(teks), span, lanjut


def baris_tabel(tbl):
    rows = []
    for tr in tbl.findall(W + 'tr'):
        r = []
        for tc in tr.findall(W + 'tc'):
            t, span, lanjut = sel(tc)
            r.append('' if lanjut else t)
            r.extend([None] * (span - 1))  # None = bagian dari sel gabungan horizontal
        rows.append(r)
    return rows


def pecah_tabel(rows):
    """Satu tabel Word kadang memuat dua tabel (mis. lembar LCC): pecah saat muncul baris kepala baru
    yang jumlah selnya berbeda dan seluruh selnya terisi."""
    hasil, kini = [], []
    for r in rows:
        nyata = [x for x in r if x is not None]
        if kini and len(nyata) >= 3 and all(nyata) and len(nyata) != len([x for x in kini[-1] if x is not None]) \
                and len(nyata) != len([x for x in kini[0] if x is not None]):
            hasil.append(kini)
            kini = []
        kini.append(r)
    hasil.append(kini)
    return hasil


def susun_tabel(rows, id_):
    lebar = max(len(r) for r in rows)
    rows = [r + [''] * (lebar - len(r)) for r in rows]
    h, data = rows[0], rows[1:]
    mulai = [i for i in range(lebar) if h[i] is not None]
    ujung = {s: (mulai[j + 1] if j + 1 < len(mulai) else lebar) for j, s in enumerate(mulai)}
    kolom = [(s, ujung[s], h[s] or f'Kolom {j + 1}') for j, s in enumerate(mulai)]
    # baris kedua sebagai sub-kepala (mis. "Hak Akses" → "hak melihat" / "hak merubah")
    if data:
        sub = data[0]
        ganda = {i for s in mulai if ujung[s] - s > 1 for i in range(s, ujung[s])}
        if ganda and any(sub[i] for i in ganda) and not any(sub[i] for i in range(lebar) if i not in ganda):
            baru = []
            for s, e, lab in kolom:
                if e - s > 1:
                    t = [i for i in range(s, e) if sub[i] is not None]
                    for j, i in enumerate(t):
                        baru.append((i, t[j + 1] if j + 1 < len(t) else e, f'{lab} – {sub[i]}' if sub[i] else lab))
                else:
                    baru.append((s, e, lab))
            kolom, data = baru, data[1:]
    baris = [['\n'.join(x for x in r[s:e] if x) for s, e, _ in kolom] for r in data]
    hasil = []
    for j, (_, _, lab) in enumerate(kolom):
        nilai = [b[j] for b in baris]
        k = {'label': lab}
        isi = [v.strip() for v in nilai if v.strip()]
        if lab.strip().lower() in ('ya', 'tidak') or (isi and all(v in KOTAK + ('X', 'x', '✓', 'V') for v in isi)):
            k['jenis'] = 'cek'
            for b in baris:
                b[j] = 'ya' if b[j].strip() in ('☑', '☒', '■', 'X', 'x', '✓', 'V') else ''
        else:
            opsi = [re.fullmatch(r'☐\s*([^☐]+?)\s*☐\s*([^☐]+?)', v) for v in isi]
            if isi and all(opsi):
                k['jenis'] = 'pilihan'
                k['opsi'] = [opsi[0].group(1), opsi[0].group(2)]
                for b in baris:
                    b[j] = ''
        hasil.append(k)
    return {'jenis': 'tabel', 'id': id_, 'kolom': hasil, 'baris': baris}


def kepala_docx(rows):
    out = []
    for r in rows:
        r = [x for x in r if x is not None]
        if len(r) >= 2 and r[0] in LABEL_KEPALA:
            nilai = r[-1].lstrip(': ').strip()
            out.append({'label': {'Divisi': 'Bagian', 'Departemen': 'Sub Bagian'}.get(r[0], r[0]), 'nilai': nilai})
    return out


def docx(path):
    body = ET.fromstring(zipfile.ZipFile(path).read('word/document.xml')).find(W + 'body')
    judul, sub, kepala, blok = None, None, [], []
    n = {'t': 0, 'p': 0}

    def nid(k):
        n[k] += 1
        return f'{k}{n[k]}'

    for el in body:
        if el.tag == W + 'p':
            t = teks_p(el)
            if not t or t.startswith('Ditinjau oleh') or 'Disiapkan oleh:' in t:
                continue
            if judul is None:
                judul = t
                continue
            if sub is None and not blok and not kepala:
                sub = t
                continue
            if t[0] in KOTAK:
                blok.append({'jenis': 'cek', 'id': nid('p'), 'teks': t[1:].strip(), 'nilai': 'ya' if t[0] in ('☑', '☒', '■') else ''})
            elif judul_p(el, t):
                blok.append({'jenis': 'judul', 'teks': t})
            else:
                blok.append({'jenis': 'teks', 'id': nid('p'), 'teks': t})
        elif el.tag == W + 'tbl':
            rows = [r for r in baris_tabel(el) if any(x for x in r if x)]
            if not rows:
                continue
            if rows[0][0] == 'Nomor Dokumen' and not kepala:
                kepala = kepala_docx(rows)
                continue
            if len(rows) == 1 and len([x for x in rows[0] if x is not None]) == 1:
                blok.append({'jenis': 'teks', 'id': nid('p'), 'teks': rows[0][0]})
                continue
            for bagian in pecah_tabel(rows):
                blok.append(susun_tabel(bagian, nid('t')))
    return judul, sub, kepala, blok


# ---------------------------------------------------------------------------
# XLSX
# ---------------------------------------------------------------------------

def nilai_xl(v):
    if v is None:
        return ''
    if isinstance(v, float) and v.is_integer():
        v = int(v)
    if hasattr(v, 'strftime'):
        return v.strftime('%Y-%m-%d')
    return bersih(str(v))


def kepala_xl(ws, sampai):
    out = []
    for r in range(1, sampai):
        lab = nilai_xl(ws.cell(r, 1).value) or nilai_xl(ws.cell(r, 2).value)
        val = ''
        for c in range(2, 6):
            v = nilai_xl(ws.cell(r, c).value)
            if v.startswith(':'):
                val = v[1:].strip()
                break
        if lab and val:
            out.append({'label': lab.strip(), 'nilai': val})
    return out


def baris_xl(ws, mulai, kolom, kunci):
    out = []
    for r in range(mulai, ws.max_row + 1):
        b = [nilai_xl(ws.cell(r, c).value) for c in kolom]
        if not b[kunci]:
            continue
        out.append(b)
    return out


def nama_varian(f):
    m = re.search(r'-\s*([^-]+?)(\s+Rev\.?\s*\w+)?\.xlsx$', os.path.basename(f))
    return m.group(1).replace(' ok', '').strip() if m else os.path.basename(f)


def urut_varian(f):
    return int(os.path.basename(f).split('.')[0])


def risiko():
    berkas = sorted(glob.glob(os.path.join(SUMBER, '6.1*', '001_Formulir Risiko*', '*.xlsx')), key=urut_varian)
    wb = openpyxl.load_workbook(berkas[0], data_only=True)
    ws = wb.worksheets[0]
    label = [nilai_xl(ws.cell(13, c).value) for c in range(1, 22)]
    kolom = [{'label': x.title() if x.isupper() else x} for x in label]
    for i in (5, 6, 12, 13):
        kolom[i]['jenis'] = 'angka'
    kolom[7] = {'label': 'Risiko Awal – Nilai Risiko (D × K)', 'jenis': 'rumus', 'rumus': {'op': 'kali', 'kolom': [5, 6]}}
    kolom[14] = {'label': 'Risiko Residual – Nilai Risiko (D × K)', 'jenis': 'rumus', 'rumus': {'op': 'kali', 'kolom': [12, 13]}}
    pr = wb['Prioritas dan Tindakan']
    prio = [[nilai_xl(pr.cell(r, c).value) for c in range(1, 6)] for r in range(2, pr.max_row + 1)]
    prio = [r for r in prio if any(r)]
    varian = []
    for f in berkas:
        w = openpyxl.load_workbook(f, data_only=True).worksheets[0]
        kp = {k['label']: k['nilai'] for k in kepala_xl(w, 13)}
        varian.append({'nama': nama_varian(f), 'kepala': {'Bagian': kp.get('Bagian', ''), 'Sub Bagian': kp.get('Sub Bagian', '')},
                       'tabel': {'t1': baris_xl(w, 14, range(1, 22), 0)}})
    return {
        'judul': 'Manajemen Risiko Sistem Manajemen Energi',
        'subjudul': 'Formulir Risiko Keberhasilan SMEn – PT Kawasan Industri Nusantara (KINRA)',
        'kepala': kepala_xl(ws, 13),
        'blok': [
            {'jenis': 'judul', 'teks': 'Register risiko keberhasilan SMEn'},
            {'jenis': 'teks', 'id': 'p1', 'teks': 'Nilai risiko = dampak × kemungkinan (skala 1–5). P4 Rendah 1–4, P3 Menengah 5–9, P2 Tinggi 10–14, P1 Tertinggi 15–25.'},
            {'jenis': 'tabel', 'id': 't1', 'kolom': kolom, 'baris': varian[0]['tabel']['t1']},
            {'jenis': 'judul', 'teks': 'Prioritas risiko dan respons minimum'},
            {'jenis': 'tabel', 'id': 't2', 'kolom': [{'label': x} for x in prio[0]], 'baris': prio[1:]},
        ],
        'varian': varian,
        'sumber': os.path.relpath(os.path.dirname(berkas[0]), SUMBER),
    }


def sasaran_bagian():
    berkas = sorted(glob.glob(os.path.join(SUMBER, '6.2*', '001_Formulir Sasaran*', '*.xlsx')), key=urut_varian)
    ws = openpyxl.load_workbook(berkas[0], data_only=True).worksheets[0]
    kolom = [{'label': x} for x in ('No', 'Aktivitas', 'Aspek Energi', 'Tujuan', 'Target', 'Program', 'Pencapaian', 'Batas Waktu', 'PIC')]
    varian = []
    for f in berkas:
        w = openpyxl.load_workbook(f, data_only=True).worksheets[0]
        rows = baris_xl(w, 15, range(1, 9), 1)
        rows = [r[:6] + [''] + r[6:] for r in rows]
        kp = {k['label']: k['nilai'] for k in kepala_xl(w, 14)}
        bag = kp.get('Bagian') or kp.get('Bagian & Sub Bagian', '')
        varian.append({'nama': nama_varian(f), 'kepala': {'Bagian': bag, 'Sub Bagian': kp.get('Sub Bagian') or bag}, 'tabel': {'t1': rows}})
    kepala = []
    for k in kepala_xl(ws, 14):
        if k['label'] == 'Bagian & Sub Bagian':
            kepala += [{'label': 'Bagian', 'nilai': k['nilai']}, {'label': 'Sub Bagian', 'nilai': k['nilai']}]
        else:
            kepala.append(k)
    for k in kepala:
        if k['label'] == 'Periode':
            k['nilai'] = ''
    kepala.append({'label': 'Tanggal Pencapaian', 'nilai': ''})
    return {
        'judul': 'Form Objective dan Target Sistem Manajemen Energi',
        'subjudul': 'Sasaran & target per bagian beserta pencapaian bulanan',
        'kepala': kepala,
        'blok': [
            {'jenis': 'teks', 'id': 'p1', 'teks': 'Isi kolom Pencapaian setiap bulan (Tercapai / Belum tercapai / keterangan progres). Buat isian baru per periode pemantauan.'},
            {'jenis': 'tabel', 'id': 't1', 'kolom': kolom, 'baris': varian[0]['tabel']['t1']},
        ],
        'varian': varian,
        'ttd': [{'peran': 'Disiapkan oleh', 'jabatan': 'PIC Bagian'}, {'peran': 'Ditinjau oleh', 'jabatan': 'Management Representative'}],
        'sumber': os.path.relpath(os.path.dirname(berkas[0]), SUMBER),
    }


def peluang_xl():
    f = glob.glob(os.path.join(SUMBER, '6.2*', '005_*.xlsx'))[0]
    ws = openpyxl.load_workbook(f, data_only=True).worksheets[0]
    peta = [  # (kolom sumber, label, jenis)
        (1, 'No', None), (2, 'Nama peluang peningkatan kinerja energi', None), (3, 'Deskripsi peluang', None),
        (4, 'Terkait SEU', None), (5, 'Bagian dari sasaran energi', None), (6, 'Penanggung jawab', None),
        (7, 'Tanggal identifikasi', None), (8, 'Perkiraan penghematan listrik (kWh/tahun)', 'angka'),
        (13, 'Perkiraan penghematan energi lain (sebutkan)', None), (16, 'Perkiraan pengurangan emisi (ton CO₂)', 'angka'),
        (20, 'Kriteria 1 (1–10)', 'angka'), (21, 'Kriteria 2 (1–10)', 'angka'), (22, 'Kriteria 3 (1–10)', 'angka'), (23, 'Kriteria 4 (1–10)', 'angka'),
        (24, 'Skor peluang', 'rumus'), (25, 'Perkiraan biaya implementasi (Rp)', 'angka'), (26, 'Tingkat prioritas', None),
        (27, 'Status implementasi', None), (28, 'Tanggal selesai implementasi', None), (29, 'Penghematan aktual listrik (kWh/tahun)', 'angka'),
        (37, 'Manfaat non-energi aktual', None), (41, 'Biaya implementasi aktual (Rp)', 'angka'),
    ]
    kolom = []
    for _, lab, j in peta:
        k = {'label': lab}
        if j:
            k['jenis'] = j
        kolom.append(k)
    kolom[14]['rumus'] = {'op': 'jumlah', 'kolom': [10, 11, 12, 13]}
    rows = baris_xl(ws, 15, [c for c, _, _ in peta], 1)
    for r in rows:
        if r[6] == '0':
            r[6] = ''
    return {
        'judul': 'Peluang Peningkatan Kinerja Energi',
        'subjudul': 'Register peluang dengan perkiraan dan realisasi penghematan',
        'kepala': kepala_xl(ws, 12),
        'blok': [
            {'jenis': 'teks', 'id': 'p1', 'teks': 'Skor peluang = jumlah skor kriteria 1–4 (masing-masing 1–10). Tetapkan kriteria (mis. potensi penghematan, ROI, kemudahan, risiko) sebelum menilai.'},
            {'jenis': 'tabel', 'id': 't1', 'kolom': kolom, 'baris': rows},
        ],
        'sumber': os.path.relpath(f, SUMBER),
    }


# ---------------------------------------------------------------------------
# Formulir dengan tata letak khusus (kop di dalam tabel)
# ---------------------------------------------------------------------------

def tabel_docx(path):
    body = ET.fromstring(zipfile.ZipFile(path).read('word/document.xml')).find(W + 'body')
    return [[[x for x in r if x is not None] for r in baris_tabel(t)] for t in body.iter(W + 'tbl')]


def setelah(s, kunci):
    i = s.find(kunci)
    return s[i + len(kunci):].lstrip(' :').strip() if i >= 0 else ''


def program_audit():
    f = glob.glob(os.path.join(SUMBER, '9.2*', '9.2 Audit*', '02-*.docx'))[0]
    rows = tabel_docx(f)[0]
    flat = ['\n'.join(r) for r in rows]
    cari = lambda k: next((setelah(x, k) for x in flat if k in x), '')
    i0 = next(i for i, r in enumerate(rows) if r and r[0] == 'No.')
    bulan = rows[i0][3:]
    data = []
    for r in rows[i0 + 1:]:
        if not r or not r[0].isdigit():
            break
        data.append(r[:3] + ['ya' if x.strip().upper() == 'X' else '' for x in r[3:3 + len(bulan)]])
    koord = cari('Koordinator Audit')
    return {
        'judul': 'Formulir Program Audit Internal',
        'subjudul': 'Sistem Manajemen Energi (SMEn) – ISO 50001:2018',
        'kepala': [{'label': 'No. Formulir', 'nilai': cari('No. Formulir')}, {'label': 'Tanggal', 'nilai': cari('Tanggal')},
                   {'label': 'Revisi', 'nilai': cari('Revisi')}, {'label': 'Tahun', 'nilai': cari('Tahun')}],
        'blok': [
            {'jenis': 'isian', 'id': 'kriteria', 'label': 'Kriteria audit', 'teks': cari('Kriteria Audit')},
            {'jenis': 'isian', 'id': 'tujuan', 'label': 'Tujuan', 'teks': cari('Tujuan'), 'panjang': True},
            {'jenis': 'isian', 'id': 'fokus', 'label': 'Fokus area', 'teks': cari('Fokus Area')},
            {'jenis': 'isian', 'id': 'organisasi', 'label': 'Organisasi auditor', 'teks': cari('Organisasi Auditor')},
            {'jenis': 'isian', 'id': 'koordinator', 'label': 'Koordinator audit', 'teks': koord.split('\n')[0]},
            {'jenis': 'isian', 'id': 'auditor', 'label': 'Para auditor', 'teks': cari('Para Auditor')},
            {'jenis': 'judul', 'teks': 'Rencana pelaksanaan audit (centang bulan pelaksanaan)'},
            {'jenis': 'tabel', 'id': 't1', 'kolom': [{'label': 'No.'}, {'label': 'Proses/Fungsi yang Diaudit'}, {'label': 'Klausul'}]
             + [{'label': b, 'jenis': 'cek'} for b in bulan], 'baris': data},
        ],
        'ttd': [{'peran': 'Disusun oleh', 'jabatan': 'Lead Auditor'}, {'peran': 'Disahkan oleh', 'jabatan': 'Management Representative'}],
        'sumber': os.path.relpath(f, SUMBER),
    }


def rencana_audit():
    f = glob.glob(os.path.join(SUMBER, '9.2*', '9.2 Audit*', '04-*.docx'))[0]
    tb = tabel_docx(f)
    kop = ['\n'.join(r) for r in tb[0]]
    isi = tb[1]
    i0 = next(i for i, r in enumerate(isi) if r and r[0] == 'No.')
    auditor = isi[i0][6:-1]
    data = []
    for r in isi[i0 + 1:]:
        if not r or not r[0].isdigit():
            continue
        tim = [auditor[j] for j, x in enumerate(r[6:6 + len(auditor)]) if x.strip().upper() == 'X']
        data.append(r[:6] + [', '.join(tim)])
    atas = '\n'.join(isi[0])
    nilai_kop = lambda k: next((x.split('\n')[-1].lstrip(': ') for x in kop if k in x), '')
    return {
        'judul': 'Rencana (Jadwal) Audit Internal',
        'subjudul': 'Sistem Manajemen Energi – SMEn',
        'kepala': [{'label': 'No. Formulir', 'nilai': next((r[-1] for r in tb[0] if 'No. Formulir' in r), '')},
                   {'label': 'Revisi', 'nilai': next((r[-1] for r in tb[0] if 'Revisi' in r), '')},
                   {'label': 'Tanggal', 'nilai': next((r[-1] for r in tb[0] if 'Tanggal' in r), '')}],
        'blok': [
            {'jenis': 'isian', 'id': 'standar', 'label': 'Sistem manajemen energi', 'teks': 'ISO 50001:2018'},
            {'jenis': 'isian', 'id': 'tanggal', 'label': 'Tanggal audit', 'teks': setelah(atas, 'Tanggal Audit').split('\n')[0]},
            {'jenis': 'isian', 'id': 'koordinator', 'label': 'Koordinator audit', 'teks': setelah(atas, 'Koordinator Audit').split('\n')[0]},
            {'jenis': 'isian', 'id': 'auditor', 'label': 'Para auditor', 'teks': setelah(atas, 'Para Auditor')},
            {'jenis': 'tabel', 'id': 't1', 'kolom': [{'label': x} for x in ('No.', 'Fungsi/Proses yang Diaudit', 'Klausul pada Kriteria Audit', 'Auditee', 'Tanggal', 'Jam', 'Auditor')],
             'baris': data},
        ],
        'ttd': [{'peran': 'Disusun oleh', 'jabatan': 'Lead Auditor'}, {'peran': 'Disahkan oleh', 'jabatan': 'Management Representative'}],
        'sumber': os.path.relpath(f, SUMBER),
    }


def notulen_rtm():
    f = glob.glob(os.path.join(SUMBER, '9.3*', 'Notulen*.docx'))[0]
    tb = tabel_docx(f)
    isi = tb[1]
    flat = ['\n'.join(r) for r in isi]
    cari = lambda k: next((setelah(x, k).split('\n')[0] if k not in ('Agenda',) else setelah(x, k) for x in flat if k in x), '')
    i0 = next(i for i, r in enumerate(isi) if r and r[0] == 'No.')
    data = [r[:4] for r in isi[i0 + 1:] if r and r[0].isdigit()]
    tanggal = next((x for x in isi if x and x[0].startswith('Tanggal')), ['', ''])
    waktu = next((x for x in isi if x and x[0].startswith('Waktu')), ['', ''])
    return {
        'judul': 'Notulen Rapat Tinjauan Manajemen',
        'subjudul': 'Sistem Manajemen Energi – PT Kawasan Industri Nusantara (KINRA)',
        'kepala': [{'label': 'No. Form', 'nilai': next((r[-1] for r in tb[0] if 'No. Form' in r), '')},
                   {'label': 'Revisi', 'nilai': next((r[-1] for r in tb[0] if 'Revisi' in r), '')},
                   {'label': 'Tanggal', 'nilai': next((r[-1] for r in tb[0] if 'Tanggal' in r), '')}],
        'blok': [
            {'jenis': 'isian', 'id': 'aktivitas', 'label': 'Aktivitas', 'teks': cari('Aktifitas')},
            {'jenis': 'isian', 'id': 'agenda', 'label': 'Agenda', 'teks': cari('Agenda'), 'panjang': True},
            {'jenis': 'isian', 'id': 'tanggal', 'label': 'Tanggal rapat', 'teks': setelah(tanggal[0], 'Tanggal')},
            {'jenis': 'isian', 'id': 'tempat', 'label': 'Tempat', 'teks': setelah(tanggal[-1], 'Tempat')},
            {'jenis': 'isian', 'id': 'waktu', 'label': 'Waktu', 'teks': setelah(waktu[0], 'Waktu')},
            {'jenis': 'isian', 'id': 'hadir', 'label': 'Dihadiri oleh', 'teks': '(Lihat daftar hadir)'},
            {'jenis': 'isian', 'id': 'distribusi', 'label': 'Distribusi ke', 'teks': cari('Distribusi Ke')},
            {'jenis': 'tabel', 'id': 't1', 'kolom': [{'label': 'No.'}, {'label': 'Uraian'}, {'label': 'PIC'}, {'label': 'Keterangan'}], 'baris': data},
        ],
        'ttd': [{'peran': 'Dibuat oleh', 'jabatan': 'Koordinator SMEn'}, {'peran': 'Disetujui oleh', 'jabatan': 'Management Representative'}],
        'sumber': os.path.relpath(f, SUMBER),
    }


# ---------------------------------------------------------------------------
# Daftar formulir
# ---------------------------------------------------------------------------

DOCX = [
    # kode, klausul, pola berkas
    ('isu-internal-eksternal', ['4.1', '6.1'], '4.1*/001_*ok.docx'),
    ('pihak-berkepentingan', ['4.2'], '4.2*/002_*.docx'),
    ('ruang-lingkup', ['4.3'], '4.3*/001_Ruang*.docx'),
    ('komitmen-manajemen', ['5.1'], '5.1*/001_ Formulir Komitmen*.docx'),
    ('kebijakan-energi', ['5.2'], '5.2*/001_ Formulir Kebijakan*.docx'),
    ('peluang-peningkatan', ['6.1'], '6.1*/002_*.docx'),
    ('tujuan-target-energi', ['6.2'], '6.2*/002_*.docx'),
    ('rencana-tindakan', ['6.2'], '6.2*/003_*.docx'),
    ('penggunaan-energi-signifikan', ['6.3'], '6.3*/001_*.docx'),
    ('enpi-baseline', ['6.4', '6.5'], '6.4*/002_*.docx'),
    ('pengumpulan-data-energi', ['6.5', '6.6'], '6.6*/001_*.docx'),
    ('kompetensi-pelatihan', ['7.2'], '7.2*/001_*.docx'),
    ('kesadaran-komunikasi', ['7.3', '7.4'], '7.3*/001_*.docx'),
    ('log-komunikasi-eksternal', ['7.4'], '7.4*/002_*.docx'),
    ('rekaman-komunikasi-eksternal', ['7.4'], '7.4*/003_*.docx'),
    ('informasi-terdokumentasi', ['7.5'], '7.5.1*/001_*.docx'),
    ('pengendalian-operasional', ['8.1'], '8.1*/001_*.docx'),
    ('pertimbangan-desain', ['8.2'], '8.2*/001_*.docx'),
    ('pertimbangan-pengadaan', ['8.3'], '8.3*/001_*.docx'),
    ('pemantauan-pengukuran', ['9.1'], '9.1 Pemantauan*/001_*.docx'),
    ('peningkatan-berkelanjutan', ['10.2'], '10.2*/001_*.docx'),
]

KHUSUS = [
    ('risiko-keberhasilan', ['6.1'], risiko),
    ('sasaran-target-bagian', ['6.2'], sasaran_bagian),
    ('register-peluang', ['6.2'], peluang_xl),
    ('program-audit-internal', ['9.2'], program_audit),
    ('rencana-audit-internal', ['9.2'], rencana_audit),
    ('notulen-rtm', ['9.3'], notulen_rtm),
]

TAUTAN = {
    'isu-internal-eksternal': {'href': '/register', 'label': 'Register Isu & Peluang'},
    'register-peluang': {'href': '/register', 'label': 'Register Isu & Peluang'},
    'peluang-peningkatan': {'href': '/register', 'label': 'Register Isu & Peluang'},
    'tujuan-target-energi': {'href': '/sasaran', 'label': 'Sasaran & Aksi'},
    'rencana-tindakan': {'href': '/sasaran', 'label': 'Sasaran & Aksi'},
    'enpi-baseline': {'href': '/kinerja', 'label': 'Kinerja Energi'},
    'pengumpulan-data-energi': {'href': '/energi', 'label': 'Data Energi'},
    'pemantauan-pengukuran': {'href': '/kinerja', 'label': 'Kinerja Energi'},
}


JUDUL = {
    'isu-internal-eksternal': 'Identifikasi Isu Internal dan Eksternal',
    'pihak-berkepentingan': 'Kebutuhan Pihak Berkepentingan',
    'ruang-lingkup': 'Ruang Lingkup dan Batasan EnMS',
    'komitmen-manajemen': 'Komitmen Manajemen',
    'kebijakan-energi': 'Kebijakan Energi',
    'peluang-peningkatan': 'Peluang Peningkatan Kinerja Energi (Metode & Register)',
    'tujuan-target-energi': 'Tujuan dan Target Energi',
    'rencana-tindakan': 'Rencana Tindakan Peningkatan Berkelanjutan',
    'penggunaan-energi-signifikan': 'Penggunaan Energi Signifikan (SEU)',
    'enpi-baseline': 'Indikator Kinerja Energi (EnPI) dan Baseline Energi (EnB)',
    'pengumpulan-data-energi': 'Pengumpulan dan Analisis Data Energi',
    'kompetensi-pelatihan': 'Kompetensi dan Pelatihan',
    'kesadaran-komunikasi': 'Kesadaran dan Komunikasi',
    'log-komunikasi-eksternal': 'Log Komunikasi Eksternal SMEn',
    'rekaman-komunikasi-eksternal': 'Rekaman Komunikasi Eksternal EnMS',
    'informasi-terdokumentasi': 'Informasi Terdokumentasi (Daftar Induk Dokumen & Catatan)',
    'pengendalian-operasional': 'Pengendalian Operasional',
    'pertimbangan-desain': 'Pertimbangan Energi dalam Desain',
    'pertimbangan-pengadaan': 'Pertimbangan Energi dalam Pengadaan',
    'pemantauan-pengukuran': 'Pemantauan dan Pengukuran Kinerja Energi',
    'peningkatan-berkelanjutan': 'Peningkatan Berkelanjutan',
    'risiko-keberhasilan': 'Risiko Keberhasilan SMEn per Bagian',
    'sasaran-target-bagian': 'Objective dan Target per Bagian',
    'register-peluang': 'Register Peluang Peningkatan Kinerja (Estimasi & Realisasi)',
}


def nomor_dari(kepala):
    for k in kepala:
        if k['label'] in ('Nomor Dokumen', 'No. Formulir', 'No. Form'):
            return k['nilai']
    return ''


def rapikan_judul(s):
    return s.title() if s and s.isupper() else s


def main():
    os.makedirs(KELUAR, exist_ok=True)
    semua = []
    for kode, klausul, pola in DOCX:
        f = glob.glob(os.path.join(SUMBER, pola))
        if len(f) != 1:
            sys.exit(f'Pola {pola} cocok dengan {len(f)} berkas')
        judul, sub, kepala, blok = docx(f[0])
        if not kepala:
            kepala = [{'label': x, 'nilai': ''} for x in ('Nomor Dokumen', 'Revisi', 'Tanggal Berlaku', 'Bagian', 'Sub Bagian', 'Lokasi Penyimpanan')]
        semua.append({'kode': kode, 'klausul': klausul, 'judul': rapikan_judul(judul), 'subjudul': sub, 'kepala': kepala,
                      'blok': blok, 'ttd': TTD_SOP, 'sumber': os.path.relpath(f[0], SUMBER)})
    for kode, klausul, fn in KHUSUS:
        t = fn()
        t.setdefault('ttd', TTD_SOP)
        semua.append({'kode': kode, 'klausul': klausul, **t})
    for t in semua:
        t['nomor'] = nomor_dari(t['kepala'])
        t['judul'] = JUDUL.get(t['kode'], t['judul'])
        if t.get('subjudul') and t['subjudul'].isupper():
            t['subjudul'] = t['subjudul'].replace('SISTEM MANAJEMEN ENERGI', 'Sistem Manajemen Energi').replace('PT KAWASAN INDUSTRI NUSANTARA', 'PT Kawasan Industri Nusantara')
        if t['kode'] in TAUTAN:
            t['tautan'] = TAUTAN[t['kode']]
        with open(os.path.join(KELUAR, t['kode'] + '.json'), 'w', encoding='utf-8') as fh:
            json.dump(t, fh, ensure_ascii=False, indent=1)
        tabel = [b for b in t['blok'] if b['jenis'] == 'tabel']
        print(f"{t['kode']:32} {','.join(t['klausul']):8} blok={len(t['blok']):3} tabel={len(tabel):2} "
              f"varian={len(t.get('varian', []))} nomor={t['nomor']}")
    tulis_indeks(semua)


def kunci_klausul(t):
    return [int(x) for x in t['klausul'][0].split('.')]


def tulis_indeks(semua):
    urut = sorted(semua, key=lambda t: (kunci_klausul(t), t['nomor'], t['kode']))
    nama = lambda k: 't_' + k.replace('-', '_')
    baris = ['// Dibangkitkan oleh scripts/impor_formulir.py. Jangan diubah manual.',
             "import type { Templat } from '../tipe'"]
    baris += [f"import {nama(t['kode'])} from './{t['kode']}.json'" for t in urut]
    baris += ['', '/** Semua templat formulir, urut klausul. */',
              'export const TEMPLAT = [' + ', '.join(nama(t['kode']) for t in urut) + '] as unknown as Templat[]', '']
    with open(os.path.join(KELUAR, 'index.ts'), 'w', encoding='utf-8') as fh:
        fh.write('\n'.join(baris))


if __name__ == '__main__':
    main()
