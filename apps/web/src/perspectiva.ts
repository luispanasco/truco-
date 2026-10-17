/**
 * La mesa en perspectiva: el paño es un plano inclinado (CSS 3D) y los demás, recortes parados
 * alrededor. Acá está dónde se sienta cada uno (en coordenadas del paño) y la cuenta para pasar
 * un punto de la pantalla al paño inclinado (para medir los recorridos de las animaciones).
 */

export type Punto = [number, number]

/**
 * Dónde se sienta cada uno, en fracciones del paño sin inclinar (x de izquierda a derecha; y de
 * lo lejos, 0, a lo cerca, 1), por cantidad de jugadores y posición relativa a quien mira (0 =
 * vos, en sentido antihorario). Es el punto del borde (un poco afuera) donde apoya el pecho: los
 * de enfrente detrás del borde de lejos y los de los costados, contra los bordes de los lados.
 * Vos estás de este lado del borde de cerca, donde tenés la mano.
 */
const ASIENTOS: Record<number, Punto[]> = {
  2: [
    [0.5, 1.22],
    [0.5, -0.015],
  ],
  4: [
    [0.5, 1.22],
    [1.035, 0.4],
    [0.5, -0.015],
    [-0.035, 0.4],
  ],
  // En 3 contra 3, los de los costados de cerca bien adelante: así entran los cinco sin apretarse.
  6: [
    [0.5, 1.22],
    [1.035, 0.68],
    [1.035, 0.22],
    [0.5, -0.015],
    [-0.035, 0.22],
    [-0.035, 0.68],
  ],
}

export function asientoEnPanio(n: number, pos: number): Punto {
  return (ASIENTOS[n] ?? ASIENTOS[2]!)[pos] ?? [0.5, 1.22]
}

/** Una homografía (3×3, por filas): lleva el cuadrado unidad a un cuadrilátero. */
export type Homografia = [number, number, number, number, number, number, number, number, number]

/**
 * La homografía que lleva el cuadrado unidad (0,0)→(1,0)→(1,1)→(0,1) a las cuatro esquinas
 * dadas en ese orden (la cuenta de Heckbert). Un plano inclinado con perspectiva se ve en la
 * pantalla exactamente así: con sus cuatro esquinas se sabe dónde cae cualquier punto.
 */
export function homografia([[x0, y0], [x1, y1], [x2, y2], [x3, y3]]: [Punto, Punto, Punto, Punto]): Homografia {
  const sx = x0 - x1 + x2 - x3
  const sy = y0 - y1 + y2 - y3
  if (Math.abs(sx) < 1e-9 && Math.abs(sy) < 1e-9) {
    // Sin perspectiva (un paralelogramo): alcanza con una afín.
    return [x1 - x0, x3 - x0, x0, y1 - y0, y3 - y0, y0, 0, 0, 1]
  }
  const dx1 = x1 - x2
  const dx2 = x3 - x2
  const dy1 = y1 - y2
  const dy2 = y3 - y2
  const det = dx1 * dy2 - dx2 * dy1
  const g = (sx * dy2 - dx2 * sy) / det
  const h = (dx1 * sy - sx * dy1) / det
  return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h, 1]
}

export function aplicar(m: Homografia, [x, y]: Punto): Punto {
  const w = m[6] * x + m[7] * y + m[8]
  return [(m[0] * x + m[1] * y + m[2]) / w, (m[3] * x + m[4] * y + m[5]) / w]
}

/** La homografía inversa (la adjunta: la escala no importa). */
export function invertir([a, b, c, d, e, f, g, h, i]: Homografia): Homografia {
  return [e * i - f * h, c * h - b * i, b * f - c * e, f * g - d * i, a * i - c * g, c * d - a * f, d * h - e * g, b * g - a * h, a * e - b * d]
}

/** El centro de un elemento en la pantalla. */
export function centro(el: Element): Punto {
  const r = el.getBoundingClientRect()
  return [r.left + r.width / 2, r.top + r.height / 2]
}

/**
 * Pasa un punto de la pantalla al paño inclinado: en px del paño sin inclinar, desde su esquina
 * de arriba a la izquierda. Usa las cuatro esquinas que marca el paño (.esquina-panio). Si el
 * paño no está o no se puede medir (sin navegador de verdad), null.
 */
export function aLocal(panio: HTMLElement, punto: Punto): Punto | null {
  const esquinas = [...panio.querySelectorAll(':scope > .esquina-panio')].map(centro)
  const w = panio.offsetWidth
  const h = panio.offsetHeight
  if (esquinas.length !== 4 || !w || !h) return null
  const m = homografia(esquinas as [Punto, Punto, Punto, Punto])
  if (!m.every(Number.isFinite)) return null
  const [u, v] = aplicar(invertir(m), punto)
  if (!Number.isFinite(u) || !Number.isFinite(v)) return null
  return [u * w, v * h]
}
