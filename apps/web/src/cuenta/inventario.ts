import { useSyncExternalStore } from 'react'

/**
 * Lo que compraste en la tienda (ids de `CATALOGO_TIENDA`). Lo manda el servidor al entrar a la
 * cuenta y se recuerda en el navegador: así, al recargar, lo comprado sigue puesto aunque la
 * cuenta todavía no haya respondido. El que decide de verdad es el servidor, al entrar a una sala.
 */
const CLAVE = 'truco.inventario'

let actual: readonly string[] = leer()
let comoSet: ReadonlySet<string> = new Set(actual)
const oyentes = new Set<() => void>()

function leer(): string[] {
  try {
    const x = JSON.parse(localStorage.getItem(CLAVE) ?? '[]') as unknown
    return Array.isArray(x) ? x.filter((i): i is string => typeof i === 'string') : []
  } catch {
    return []
  }
}

export function inventarioGuardado(): ReadonlySet<string> {
  return comoSet
}

export function fijarInventario(ids: readonly string[]) {
  actual = [...ids]
  comoSet = new Set(actual)
  try {
    if (actual.length > 0) localStorage.setItem(CLAVE, JSON.stringify(actual))
    else localStorage.removeItem(CLAVE)
  } catch {
    // Sin almacenamiento, vale hasta recargar.
  }
  for (const o of oyentes) o()
}

/** El inventario, para las pantallas (se actualiza al comprar o al salir de la cuenta). */
export function useInventario(): ReadonlySet<string> {
  return useSyncExternalStore(
    (o) => {
      oyentes.add(o)
      return () => void oyentes.delete(o)
    },
    () => comoSet,
  )
}
