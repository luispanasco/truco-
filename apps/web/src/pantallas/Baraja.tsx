import { crearBaraja } from '@truco/engine'
import { Carta } from '../componentes/Carta'

/** Página de desarrollo (/baraja): las 40 cartas y el dorso, para revisar el dibujo. */
export function Baraja() {
  return (
    <div className="pantalla-baraja">
      {crearBaraja().map((c) => (
        <Carta key={`${c.numero}-${c.palo}`} carta={c} tam="grande" />
      ))}
      <Carta oculta tam="grande" />
    </div>
  )
}
