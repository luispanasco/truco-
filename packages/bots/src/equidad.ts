/**
 * Probabilidad de ganar la partida según el marcador. Sirve para decidir por lo que importa
 * (ganar el partido) y no por los puntos de la mano: a 2 a 2 cuatro puntos son poco, a 27 a 28
 * son todo.
 *
 * Se arma con cómo se reparten los puntos en una mano entre bots difíciles (`cli/distribucion.ts`,
 * 150 partidas): cada par es (puntos de uno, puntos del otro) y su frecuencia.
 */
const MANOS_1V1: [number, number, number][] = [
  [2, 0, 0.1266], [0, 2, 0.1266], [0, 4, 0.1053], [4, 0, 0.1053], [1, 1, 0.0991], [1, 0, 0.0699], [0, 1, 0.0699],
  [3, 0, 0.0359], [0, 3, 0.0359], [5, 0, 0.0261], [0, 5, 0.0261], [1, 3, 0.0255], [3, 1, 0.0255], [2, 1, 0.0166],
  [1, 2, 0.0166], [3, 2, 0.0083], [2, 3, 0.0083], [3, 3, 0.0083], [0, 7, 0.0077], [7, 0, 0.0077], [4, 3, 0.0063],
  [3, 4, 0.0063], [6, 0, 0.0051], [0, 6, 0.0051], [2, 2, 0.0047], [4, 1, 0.0024], [1, 4, 0.0024],
]
const MANOS_EQUIPOS: [number, number, number][] = [
  [4, 0, 0.1091], [0, 4, 0.1091], [2, 0, 0.0852], [0, 2, 0.0852], [1, 0, 0.0644], [0, 1, 0.0644], [3, 0, 0.0482],
  [0, 3, 0.0482], [0, 5, 0.0363], [5, 0, 0.0363], [7, 0, 0.0277], [0, 7, 0.0277], [1, 1, 0.0263], [3, 2, 0.0227],
  [2, 3, 0.0227], [1, 3, 0.0205], [3, 1, 0.0205], [3, 3, 0.0205], [0, 6, 0.0169], [6, 0, 0.0169], [2, 1, 0.0158],
  [1, 2, 0.0158], [2, 2, 0.0095], [3, 4, 0.005], [4, 3, 0.005], [0, 8, 0.0041], [8, 0, 0.0041], [4, 2, 0.0029],
  [2, 4, 0.0029], [9, 0, 0.0029], [0, 9, 0.0029], [0, 10, 0.0021], [10, 0, 0.0021],
]

const tablas = new Map<string, Float64Array>()

/**
 * Probabilidad de ganar la partida con `mios` puntos contra `suyos`, jugando a `objetivo`.
 * Se calcula una vez por largo de partido y formato, de atrás para adelante.
 */
export function probGanarPartida(mios: number, suyos: number, objetivo: number, equipos: boolean): number {
  if (mios >= objetivo) return 1
  if (suyos >= objetivo) return 0
  const clave = `${objetivo}:${equipos}`
  let t = tablas.get(clave)
  if (!t) {
    t = armarTabla(objetivo, equipos ? MANOS_EQUIPOS : MANOS_1V1)
    tablas.set(clave, t)
  }
  return t[mios * objetivo + suyos]!
}

function armarTabla(objetivo: number, manos: [number, number, number][]): Float64Array {
  const total = manos.reduce((s, [, , p]) => s + p, 0)
  const t = new Float64Array(objetivo * objetivo)
  const w = (x: number, y: number) => (x >= objetivo ? 1 : y >= objetivo ? 0 : t[x * objetivo + y]!)
  // Cada mano reparte al menos un punto: los estados con más puntos se calculan antes.
  for (let suma = 2 * objetivo - 2; suma >= 0; suma--) {
    for (let x = Math.min(objetivo - 1, suma); x >= 0 && suma - x < objetivo; x--) {
      const y = suma - x
      let v = 0
      for (const [a, b, p] of manos) v += p * w(x + a, y + b)
      t[x * objetivo + y] = v / total
    }
  }
  return t
}
