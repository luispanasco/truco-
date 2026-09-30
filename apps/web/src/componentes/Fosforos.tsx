/**
 * Anotador con fósforos, como en la mesa: de a 5 (cuatro formando un cuadrado y
 * uno cruzado). Tres cuadrados son las malas (0 a 15) y otros tres las buenas.
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
function Cuadrado({ cantidad, x }: { cantidad: number; x: number }) {
  const l = 18
  const segs: [number, number, number, number][] = [
    [1, 1, 1, 1 + l], // izquierda
    [1, 1, 1 + l, 1], // arriba
    [1 + l, 1, 1 + l, 1 + l], // derecha
    [1, 1 + l, 1 + l, 1 + l], // abajo
    [1, 1 + l, 1 + l, 1], // cruzado
  ]
  return (
    <g transform={`translate(${x} 0)`}>
      <rect x="0" y="0" width="20" height="20" fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth="1" />
      {segs.slice(0, cantidad).map(([a, b, c, d], i) => (
        <Fosforo key={i} x1={a} y1={b} x2={c} y2={d} />
      ))}
    </g>
  )
}

export function Fosforos({ puntos, malas = 15 }: { puntos: number; malas?: number }) {
  const enMalas = Math.min(puntos, malas)
  const enBuenas = Math.max(0, puntos - malas)
  const cuadrados = (n: number) => [0, 1, 2].map((i) => Math.max(0, Math.min(5, n - i * 5)))
  return (
    <svg viewBox="0 0 148 22" className="fosforos" role="img" aria-label={`${puntos} puntos`}>
      {cuadrados(enMalas).map((c, i) => (
        <Cuadrado key={`m${i}`} cantidad={c} x={1 + i * 23} />
      ))}
      <line x1="73" y1="0" x2="73" y2="22" stroke="rgb(255 255 255 / 0.35)" strokeWidth="1.5" />
      {cuadrados(enBuenas).map((c, i) => (
        <Cuadrado key={`b${i}`} cantidad={c} x={78 + i * 23} />
      ))}
    </svg>
  )
}
