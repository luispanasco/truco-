import type { Carta as TCarta } from '@truco/engine'
import { Carta } from './Carta'

/**
 * Dónde va el mazo (en % del paño), según la posición del que reparte relativa a quien
 * mira (0 = abajo, en sentido antihorario). Va a la derecha del que reparte, o sea del
 * lado del mano, pegado al borde para no tapar las cartas jugadas.
 */
const POSICIONES: Record<number, [number, number][]> = {
  2: [
    [74, 84],
    [26, 18],
  ],
  4: [
    [74, 86],
    [84, 24],
    [26, 16],
    [16, 76],
  ],
  6: [
    [64, 91],
    [86, 50],
    [70, 12],
    [30, 12],
    [14, 50],
    [36, 91],
  ],
}

export function posicionMazo(n: number, reparteRel: number): { left: string; top: string } {
  const [x, y] = (POSICIONES[n] ?? POSICIONES[2]!)[reparteRel] ?? [50, 50]
  return { left: `${x}%`, top: `${y}%` }
}

/** La muestra boca arriba, con el mazo cruzado encima. */
export function Mazo({ muestra, n, reparteRel }: { muestra: TCarta; n: number; reparteRel: number }) {
  return (
    <div className={`mazo${n === 6 ? ' mazo-chico' : ''}`} style={posicionMazo(n, reparteRel)} aria-label="Mazo y muestra">
      <div className="mazo-muestra">
        <Carta carta={muestra} tam="mesa" />
      </div>
      <div className="mazo-pila">
        <Carta oculta tam="mesa" />
      </div>
    </div>
  )
}
