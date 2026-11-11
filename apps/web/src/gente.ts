import { useEffect, useState } from 'react'
import { direccionApi } from './cuenta/cuenta'

/** Cuánta gente hay online: buscando partida (en la cola pública) y jugando. */
export interface Gente {
  buscando: number
  jugando: number
}

/** Cada cuánto se vuelve a preguntar mientras se ve. */
const CADA_MS = 15_000

/**
 * La gente online, para mostrarla antes de buscar partida. null mientras no se sabe (o sin
 * conexión): entonces no se muestra nada. Pregunta solo mientras `activa`.
 */
export function useGente(activa = true): Gente | null {
  const [gente, setGente] = useState<Gente | null>(null)
  useEffect(() => {
    if (!activa) return
    let vigente = true
    const pedir = () =>
      fetch(`${direccionApi()}/gente`)
        .then((r) => (r.ok ? (r.json() as Promise<Gente>) : null))
        .then((g) => vigente && setGente(g && typeof g.buscando === 'number' ? g : null))
        .catch(() => vigente && setGente(null))
    void pedir()
    const t = setInterval(pedir, CADA_MS)
    return () => {
      vigente = false
      clearInterval(t)
    }
  }, [activa])
  return gente
}

/** "3 buscando partida · 12 jugando", para debajo del botón. */
export function textoGente(g: Gente): string {
  const buscando = g.buscando === 0 ? 'Nadie buscando ahora' : g.buscando === 1 ? '1 buscando partida' : `${g.buscando} buscando partida`
  return g.jugando > 0 ? `${buscando} · ${g.jugando} jugando` : buscando
}
