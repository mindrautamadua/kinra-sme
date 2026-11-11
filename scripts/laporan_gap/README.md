# Laporan Gap Analysis dan Penutupan Gap (GA-01)

Generator PDF laporan gap ISO 50001:2018 untuk rekaman GA-01 di Kesiapan Audit.

- `data.py`: penilaian 27 sub-klausul (kondisi kini), kondisi awal 20 Okt 2026 (`AWAL`), kemajuan dokumen, dan peristiwa.
  Kondisi awal direkonstruksi dari rekaman bertanggal: Checklist Monev (20 Okt), Timeline Rev.3 (19 Okt),
  register awal aplikasi (26 Okt). Jangan ubah kondisi awal tanpa bukti bertanggal baru.
- `isi.html`, `gaya.css`: teks dan tata letak. `build.py` menghitung skor dan menggambar grafik.

Membuat ulang (untuk Revisi 1 setelah audit internal dan RTM, Revisi 2 setelah Stage 1):

```sh
python3 scripts/laporan_gap/build.py /tmp/laporan.html
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --no-pdf-header-footer \
  --allow-file-access-from-files --print-to-pdf=/tmp/laporan.pdf /tmp/laporan.html
node scripts/unggah_rekaman.mjs GA-01 /tmp/laporan.pdf
```
