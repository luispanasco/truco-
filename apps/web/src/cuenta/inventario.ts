import { useSyncExternalStore } from 'react'

/**
 * Lo que compraste en la tienda (ids de `CATALOGO_TIENDA`). Lo manda el servidor al entrar a la
 * cuenta y se recuerda en el navegador: así, al recargar, lo comprado sigue puesto aunque la
 * cuenta todavía no haya respondido. El que decide de verdad es el servidor, al entrar a una sala.
 * Con lo comprado va si la cuenta es de un beta tester: puede usar todo lo de la tienda.
 */
const CLAVE = 'truco.inventario'
const CLAVE_BETA = 'truco.beta'

let actual: readonly string[] = leer()
let comoSet: ReadonlySet<string> = new Set(actual)
let beta = leerBeta()
const oyentes = new Set<() => void>()

function leer(): string[] {
  try {
    const x = JSON.parse(localStorage.getItem(CLAVE) ?? '[]') as unknown
    return Array.isArray(x) ? x.filter((i): i is string => typeof i === 'string') : []
  } catch {
    return []
  }
}

function leerBeta(): boolean {
  try {
    return localStorage.getItem(CLAVE_BETA) === '1'
  } catch {
    return false
  }
}

export function inventarioGuardado(): ReadonlySet<string> {
  return comoSet
}

/** Lo comprado y, si se sabe, si es beta tester (sin decirlo, queda como estaba: al comprar). */
export function fijarInventario(ids: readonly string[], esBetaTester?: boolean) {
  actual = [...ids]
  comoSet = new Set(actual)
  if (esBetaTester !== undefined) beta = esBetaTester
  try {
    if (actual.length > 0) localStorage.setItem(CLAVE, JSON.stringify(actual))
    else localStorage.removeItem(CLAVE)
    if (beta) localStorage.setItem(CLAVE_BETA, '1')
    else localStorage.removeItem(CLAVE_BETA)
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

/** Si la cuenta es de un beta tester (puede usar todo lo de la tienda sin comprarlo). */
export function esBeta(): boolean {
  return beta
}

export function useEsBeta(): boolean {
  return useSyncExternalStore(
    (o) => {
      oyentes.add(o)
      return () => void oyentes.delete(o)
    },
    () => beta,
  )
}
