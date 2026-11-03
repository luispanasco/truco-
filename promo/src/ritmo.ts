/**
 * El tempo de la música (public/musica.mp3: el tema de music/ desde su primer compás, a 2,24 s).
 * 114,1 BPM: cada pulso dura 0,526 s y cada compás de 4 pulsos, 2,1 s. Las escenas cambian en los
 * compases y los textos entran en los pulsos.
 */
export const FPS = 30
export const BPM = 114.1
export const PULSO = (60 / BPM) * FPS // ≈ 15,78 cuadros
export const COMPAS = PULSO * 4 // ≈ 63,1 cuadros

/** El cuadro (entero) donde cae el pulso `n` contado desde el principio del reel. */
export const pulso = (n: number) => Math.round(n * PULSO)
/** El cuadro donde empieza el compás `n`. */
export const compas = (n: number) => Math.round(n * COMPAS)

export const DURACION = 900 // 30 s
