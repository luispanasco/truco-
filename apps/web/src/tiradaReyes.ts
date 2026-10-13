import type { LugarPublico } from '@truco/shared'

// El plan de tiempos está en @truco/shared: el servidor también lo usa, para no arrancar el
// reloj del primer turno mientras la mesa todavía muestra la tirada.
export { MOVER_REYES_MS, pasoReyes, planReyes, VUELO_REYES_MS, type PlanReyes } from '@truco/shared'

/**
 * Dónde quedó cada uno después de la tirada: el asiento nuevo de cada asiento viejo. Se
 * reconoce a cada uno por su apodo (y su avatar, si se conoce la sala de antes); entre iguales,
 * se prefiere que no se haya movido.
 */
export function asientosDespuesDeReyes(
  apodos: readonly string[],
  antes: readonly LugarPublico[] | null,
  ahora: readonly LugarPublico[],
): number[] {
  const n = apodos.length
  const libres = new Set(ahora.map((l) => l.asiento))
  const nuevo: number[] = Array.from({ length: n }, () => -1)
  const mismo = (a: number, l: LugarPublico) =>
    l.apodo === apodos[a] && (!antes?.[a] || (antes[a]!.avatar ?? null) === (l.avatar ?? null))
  // Primero los que no se movieron; después los demás, al primer lugar libre que coincida.
  for (let a = 0; a < n; a++) {
    const l = ahora[a]
    if (l && mismo(a, l)) {
      nuevo[a] = a
      libres.delete(a)
    }
  }
  for (let a = 0; a < n; a++) {
    if (nuevo[a] !== -1) continue
    const l = ahora.find((x) => libres.has(x.asiento) && mismo(a, x)) ?? ahora.find((x) => libres.has(x.asiento) && x.apodo === apodos[a])
    const b = l?.asiento ?? (libres.has(a) ? a : [...libres][0]!)
    nuevo[a] = b
    libres.delete(b)
  }
  return nuevo
}
