/**
 * Packs de voces para los cantos. Cada pack es una carpeta `public/voces/<id>/` con un archivo
 * por canto (los arma `scripts/voces.mjs` desde las grabaciones). Si al pack le falta un canto,
 * ese canto queda solo con el globo de texto.
 */

/** Los cantos que pueden tener voz (las claves de `TEXTO_CANTO`, las respuestas y algo más). */
export const CANTOS_VOZ = [
  'truco',
  'retruco',
  'valeCuatro',
  'envido',
  'realEnvido',
  'faltaEnvido',
  'flor',
  'contraflor',
  'contraflorAlResto',
  'quiero',
  'noQuiero',
  'sonBuenas',
  'envidoVaPrimero',
] as const

export type CantoVoz = (typeof CANTOS_VOZ)[number]

export interface PackVoces {
  id: string
  nombre: string
  /** Archivo de cada canto, relativo a la carpeta del pack (por ejemplo "truco.webm"). */
  archivos: Partial<Record<CantoVoz, string>>
}

/**
 * Los packs publicados. Todavía ninguno: las voces se graban más adelante. Para sumar uno,
 * correr `node scripts/voces.mjs` y pegar acá lo que imprime.
 */
export const PACKS_VOCES: readonly PackVoces[] = []

/** Cómo es un pack (no se publica: no tiene archivos). */
export const PACK_EJEMPLO: PackVoces = { id: 'ejemplo', nombre: 'Ejemplo', archivos: {} }

/** El pack elegido, o el primero si el elegido no existe; null si no hay ninguno. */
export function packElegido(id: string | null, packs: readonly PackVoces[] = PACKS_VOCES): PackVoces | null {
  return packs.find((p) => p.id === id) ?? packs[0] ?? null
}

/** La dirección del archivo de un canto en un pack, o null si el pack no lo trae. */
export function urlDeVoz(pack: PackVoces, canto: CantoVoz): string | null {
  const archivo = pack.archivos[canto]
  return archivo ? `/voces/${pack.id}/${archivo}` : null
}
