/**
 * PRNG determinístico (mulberry32). El estado es un entero de 32 bits que vive
 * dentro del estado de la partida, así una partida se reproduce con la semilla
 * más la lista de acciones.
 */
export function normalizarSemilla(semilla: number): number {
  return semilla >>> 0
}

/** Devuelve un número en [0, 1) y el nuevo estado del generador. */
export function siguienteAleatorio(rng: number): [number, number] {
  const a = (rng + 0x6d2b79f5) >>> 0
  let t = a
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return [((t ^ (t >>> 14)) >>> 0) / 4294967296, a]
}

/** Mezcla Fisher-Yates. No modifica el arreglo recibido. */
export function barajar<T>(items: readonly T[], rng: number): { resultado: T[]; rng: number } {
  const resultado = [...items]
  let estado = rng
  for (let i = resultado.length - 1; i > 0; i--) {
    const [r, nuevo] = siguienteAleatorio(estado)
    estado = nuevo
    const j = Math.floor(r * (i + 1))
    const tmp = resultado[i] as T
    resultado[i] = resultado[j] as T
    resultado[j] = tmp
  }
  return { resultado, rng: estado }
}
