/**
 * Piezas propias para el estilo Lorelei (que trae solo la cabeza): torso con ropa,
 * sombreros y accesorios. Coordenadas en el viewBox de Lorelei (0 0 980 980).
 *
 * PROVISORIO: formas simples para armar la base. Se reemplazan por los dibujos definitivos,
 * con el trazo de Lorelei (contorno negro grueso y rellenos planos).
 */

const TRAZO = 'stroke="#000" stroke-width="10" stroke-linejoin="round"'

/** Torso con una remera del color dado. Recibe el color de piel (para el cuello). */
const remera = (color: string) => (piel: string) =>
  `<path d="M300 980c0-120 70-190 190-190s190 70 190 190Z" fill="${color}" ${TRAZO}/><path d="M440 790h100v40c0 25-100 25-100 0Z" fill="${piel}" ${TRAZO}/>`

/** Ropas, en el orden del catálogo (`CATALOGO_AVATAR.ropa`). */
export const ROPAS: readonly ((piel: string) => string)[] = [
  remera('#f5f5f0'),
  remera('#c83a32'),
  remera('#2f5fae'),
  remera('#3c8a4a'),
  remera('#7fb8e6'),
  remera('#f5f5f0'),
  remera('#f2c230'),
  remera('#c83a32'),
  remera('#8a8f96'),
  remera('#3d5b8c'),
]

/** Sombreros, sin el "Sin sombrero" (el 1 del catálogo es el primero de esta lista). */
export const SOMBREROS: readonly ((colorPelo: string) => string)[] = [
  () => `<ellipse cx="490" cy="250" rx="230" ry="70" fill="#2b2b2b" ${TRAZO}/>`,
  () => `<path d="M290 300c0-150 400-150 400 0Z" fill="#c83a32" ${TRAZO}/>`,
  () => `<path d="M290 300c0-140 400-140 400 0Z" fill="#2f5fae" ${TRAZO}/><path d="M620 290h130v30H620Z" fill="#2f5fae" ${TRAZO}/>`,
  () => `<ellipse cx="490" cy="290" rx="300" ry="50" fill="#e3c27a" ${TRAZO}/><path d="M360 290c0-120 260-120 260 0Z" fill="#e3c27a" ${TRAZO}/>`,
]

/** Accesorios, sin el "Nada". */
export const ACCESORIOS: readonly (() => string)[] = [
  () => `<path d="M700 760h90v150c0 30-90 30-90 0Z" fill="#8a5a36" ${TRAZO}/><path d="M760 700l20 70" stroke="#c0c0c0" stroke-width="14"/>`,
]
