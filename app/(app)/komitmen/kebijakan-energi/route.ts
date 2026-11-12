import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { penggunaSaya } from '@/lib/sesi'

/**
 * Kebijakan SMEn bertanda tangan (No. 001/PO/KINRA/SMEn/X/2026). Disajikan lewat rute ini, bukan dari folder public,
 * supaya pindaian tanda tangan dan stempel hanya bisa dibuka pengguna yang sudah login.
 * `?unduh=pdf` mengunduh PDF asli; tanpa parameter mengembalikan gambar JPG untuk ditampilkan di halaman.
 */
export async function GET(req: Request) {
  if (!(await penggunaSaya())) return new Response('Sesi berakhir. Silakan masuk kembali.', { status: 401 })
  const pdf = new URL(req.url).searchParams.get('unduh') === 'pdf'
  const isi = await readFile(path.join(process.cwd(), 'aset-privat', pdf ? 'kebijakan-energi.pdf' : 'kebijakan-energi.jpg'))
  return new Response(new Uint8Array(isi), {
    headers: {
      'Content-Type': pdf ? 'application/pdf' : 'image/jpeg',
      'Cache-Control': 'private, max-age=3600',
      ...(pdf ? { 'Content-Disposition': 'attachment; filename="Kebijakan SMEn PT KINRA No.001-PO-KINRA-SMEn-X-2026.pdf"' } : {}),
    },
  })
}
