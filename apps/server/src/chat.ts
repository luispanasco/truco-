import { LIMITES } from '@truco/shared'
import { PALABRAS_PROHIBIDAS } from './palabras'

/** Pasa a minúsculas y saca tildes, carácter por carácter (mismo largo que el original). */
function normalizar(texto: string): string {
  return [...texto].map((c) => c.toLowerCase().normalize('NFD')[0] ?? c).join('')
}

const LETRA = 'a-z0-9ñ'
const PATRONES = PALABRAS_PROHIBIDAS.map(
  (p) => new RegExp(`(?<![${LETRA}])${normalizar(p).replace(/ /g, '\\s+')}(?![${LETRA}])`, 'g'),
)

/** Tapa las palabras prohibidas con asteriscos, sin cambiar el resto del texto. */
export function filtrarTexto(texto: string): string {
  const chars = [...texto]
  const normal = normalizar(texto)
  // Los índices del regex son de unidades UTF-16; se trabaja sobre el arreglo de caracteres.
  const indiceChar: number[] = []
  let u = 0
  for (let i = 0; i < chars.length; i++) {
    for (let k = 0; k < chars[i]!.length; k++) indiceChar[u + k] = i
    u += chars[i]!.length
  }
  for (const patron of PATRONES) {
    for (const m of normal.matchAll(patron)) {
      const desde = indiceChar[m.index]!
      const hasta = indiceChar[m.index + m[0].length - 1]!
      for (let i = desde; i <= hasta; i++) if (!/\s/.test(chars[i]!)) chars[i] = '*'
    }
  }
  return chars.join('')
}

/** Limpia y valida un mensaje de chat: null si no hay nada que mandar. */
export function prepararMensaje(texto: unknown): string | null {
  if (typeof texto !== 'string') return null
  const limpio = texto.replace(/\s+/g, ' ').trim().slice(0, LIMITES.largoChat)
  if (limpio.length === 0) return null
  return filtrarTexto(limpio)
}

/** Permite como máximo `maximo` eventos dentro de cualquier ventana de `ventanaMs`. */
export class LimiteFrecuencia {
  private marcas: number[] = []

  constructor(
    private readonly maximo: number,
    private readonly ventanaMs: number,
  ) {}

  permitir(ahora = Date.now()): boolean {
    this.marcas = this.marcas.filter((t) => ahora - t < this.ventanaMs)
    if (this.marcas.length >= this.maximo) return false
    this.marcas.push(ahora)
    return true
  }
}
