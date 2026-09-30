import { useEffect, useRef, useState } from 'react'

/** En los últimos segundos el reloj se pone en rojo. */
export const SEGUNDOS_APURO = 10
const TICK_MS = 250

/**
 * Cuánto le queda al turno (solo online: `venceEn` en ms desde epoch). Devuelve también
 * la fracción que queda, contra lo que había cuando se vio el turno por primera vez.
 */
export function useRestante(venceEn: number | null): { ms: number; fraccion: number } | null {
  const [ahora, setAhora] = useState(() => Date.now())
  const total = useRef<{ venceEn: number; ms: number } | null>(null)

  useEffect(() => {
    if (venceEn === null) return
    setAhora(Date.now())
    const t = setInterval(() => setAhora(Date.now()), TICK_MS)
    return () => clearInterval(t)
  }, [venceEn])

  if (venceEn === null) return null
  if (total.current?.venceEn !== venceEn) total.current = { venceEn, ms: Math.max(1, venceEn - Date.now()) }
  const ms = Math.max(0, venceEn - ahora)
  return { ms, fraccion: Math.min(1, ms / total.current.ms) }
}

export const segundos = (ms: number) => Math.ceil(ms / 1000)

/** Anillo del turno que se va vaciando. Reemplaza al anillo que gira cuando hay tiempo límite. */
export function AnilloReloj({ venceEn }: { venceEn: number }) {
  const r = useRestante(venceEn)
  if (!r) return null
  const apurado = segundos(r.ms) <= SEGUNDOS_APURO
  return (
    <svg className={`anillo-reloj${apurado ? ' apurado' : ''}`} viewBox="0 0 40 40" aria-hidden="true">
      <circle className="anillo-reloj-fondo" cx="20" cy="20" r="18" pathLength={100} />
      <circle className="anillo-reloj-resto" cx="20" cy="20" r="18" pathLength={100} strokeDasharray={`${r.fraccion * 100} 100`} />
    </svg>
  )
}

/** "Te quedan N s", junto al nombre de quien tiene que jugar. */
export function RelojPropio({ venceEn }: { venceEn: number }) {
  const r = useRestante(venceEn)
  if (!r) return null
  const s = segundos(r.ms)
  return (
    <span className={`te-toca reloj-propio${s <= SEGUNDOS_APURO ? ' apurado' : ''}`} role="timer">
      Te quedan {s} s
    </span>
  )
}
