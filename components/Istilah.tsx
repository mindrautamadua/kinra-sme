import { GLOSARIUM } from '@/lib/glosarium'

/**
 * Istilah teknis bergaris titik-titik; arahkan kursor atau fokus untuk melihat artinya dari glosarium.
 * Tanpa JavaScript (CSS :hover/:focus-within), sehingga dapat dipakai di komponen server maupun client.
 */
export function Istilah({ kata, children }: { kata: string; children?: React.ReactNode }) {
  const i = GLOSARIUM.find((g) => g.istilah.toLowerCase() === kata.toLowerCase())
  if (!i) return <>{children ?? kata}</>
  return (
    <span className="istilah" tabIndex={0}>
      {children ?? kata}
      <span className="istilah-arti" role="tooltip">
        <b>{i.istilah}</b>{i.asli && <i> · {i.asli}</i>}
        <span>{i.arti}</span>
        {i.klausul && <small>Klausul {i.klausul}</small>}
      </span>
    </span>
  )
}
