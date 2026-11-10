/**
 * Anotador con fósforos, como en la mesa: de a 5 (cuatro formando un cuadrado y
 * uno cruzado). A 30 son tres cuadrados de malas (0 a 15) y otros tres de buenas; a 40, cuatro
 * y cuatro.
 */
function Fosforo({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <g strokeLinecap="round">
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#f3e2b8" strokeWidth="2.6" />
      <circle cx={x2} cy={y2} r="2.2" fill="#c0392b" />
    </g>
  )
}

/** Un cuadrado de hasta 5 fósforos, en una caja de 20 × 20. */
export function Cuadrado({ cantidad, x, y = 0 }: { cantidad: number; x: number; y?: number }) {
  const l = 18
  const segs: [number, number, number, number][] = [
    [1, 1, 1, 1 + l], // izquierda
    [1, 1, 1 + l, 1], // arriba
    [1 + l, 1, 1 + l, 1 + l], // derecha
    [1, 1 + l, 1 + l, 1 + l], // abajo
    [1, 1 + l, 1 + l, 1], // cruzado
  ]
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0" y="0" width="20" height="20" fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="1" />
      {segs.slice(0, cantidad).map(([a, b, c, d], i) => (
        <Fosforo key={i} x1={a} y1={b} x2={c} y2={d} />
      ))}
    </g>
  )
}

/** Cuántos cuadrados lleva cada mitad (las malas o las buenas). */
export const cuadradosPorMitad = (malas: number) => Math.max(1, Math.ceil(malas / 5))

/** Los fósforos de cada cuadrado de una mitad, con n puntos en ella. */
export function enCuadrados(n: number, malas: number): number[] {
  return Array.from({ length: cuadradosPorMitad(malas) }, (_, i) => Math.max(0, Math.min(5, n - i * 5)))
}

/** Los puntos que van en las malas y en las buenas. */
export function mitades(puntos: number, malas: number): { enMalas: number; enBuenas: number } {
  return { enMalas: Math.max(0, Math.min(puntos, malas)), enBuenas: Math.max(0, Math.min(malas, puntos - malas)) }
}

export function Fosforos({ puntos, malas = 15 }: { puntos: number; malas?: number }) {
  const { enMalas, enBuenas } = mitades(puntos, malas)
  const k = cuadradosPorMitad(malas)
  const linea = k * 23 + 4
  return (
    <svg viewBox={`0 0 ${2 * k * 23 + 10} 22`} className="fosforos" role="img" aria-label={`${puntos} puntos`}>
      {enCuadrados(enMalas, malas).map((c, i) => (
        <Cuadrado key={`m${i}`} cantidad={c} x={1 + i * 23} />
      ))}
      <line x1={linea} y1="0" x2={linea} y2="22" stroke="rgb(255 255 255 / 0.35)" strokeWidth="1.5" />
      {enCuadrados(enBuenas, malas).map((c, i) => (
        <Cuadrado key={`b${i}`} cantidad={c} x={linea + 5 + i * 23} />
      ))}
    </svg>
  )
}
