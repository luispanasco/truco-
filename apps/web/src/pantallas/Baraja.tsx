import { crearBaraja } from '@truco/engine'
import { BARAJAS, elegirBaraja, useBaraja } from '../baraja'
import { Carta } from '../componentes/Carta'

/**
 * Página de desarrollo (/baraja): las 40 cartas y el dorso, para revisar el dibujo. Arriba se
 * cambia de baraja para comparar (queda guardada en el perfil, como en el inicio).
 */
export function Baraja() {
  const baraja = useBaraja((e) => e.baraja)
  const credito = BARAJAS.find((b) => b.id === baraja)?.credito
  return (
    <div className="pantalla-baraja">
      <div className="baraja-comparar segmentado" role="radiogroup" aria-label="Baraja">
        {BARAJAS.map((b) => (
          <button
            key={b.id}
            type="button"
            role="radio"
            aria-checked={baraja === b.id}
            className={baraja === b.id ? 'elegido' : ''}
            onClick={() => elegirBaraja(b.id)}
          >
            {b.nombre}
          </button>
        ))}
      </div>
      {credito && <p className="baraja-comparar-credito">{credito}</p>}
      {crearBaraja().map((c) => (
        <Carta key={`${c.numero}-${c.palo}`} carta={c} tam="grande" />
      ))}
      <Carta oculta tam="grande" />
    </div>
  )
}
