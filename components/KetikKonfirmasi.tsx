'use client'

/**
 * Kolom konfirmasi hapus: tombol hapus baru aktif setelah pengguna mengetik `kata` persis (huruf besar/kecil diabaikan,
 * spasi di tepi diabaikan). Mencegah item terhapus karena salah klik.
 */
export const cocokKata = (nilai: string, kata: string) => nilai.trim().toUpperCase() === kata.trim().toUpperCase()

export function KetikKonfirmasi({ kata, nilai, onUbah, onKirim, disabled }: {
  kata: string; nilai: string; onUbah: (v: string) => void; onKirim: () => void; disabled?: boolean
}) {
  return (
    <label className="field ketik-konfirmasi">
      <span>Ketik <b className="mono">{kata}</b> untuk mengonfirmasi</span>
      <input value={nilai} onChange={(e) => onUbah(e.target.value)} disabled={disabled}
        autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false} placeholder={kata}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (cocokKata(nilai, kata)) onKirim() } }} />
    </label>
  )
}
