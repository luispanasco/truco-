import type { Carta as TCarta } from '@truco/engine'
import { BARAJAS, mostrarBaraja, type Baraja } from '../baraja'
import { Carta } from './Carta'

/** Las dos cartas de muestra de cada baraja en el selector. */
const MUESTRAS: TCarta[] = [
  { numero: 1, palo: 'espada' },
  { numero: 12, palo: 'oro' },
]

/**
 * Elegir la baraja (cosmético): miniaturas de cada una y su crédito. `alElegir` la guarda donde
 * corresponda (el perfil); además todas las cartas de la app se redibujan al momento.
 */
export function SelectorBaraja({ baraja, alElegir }: { baraja: Baraja; alElegir: (b: Baraja) => void }) {
  return (
    <div className="selector-baraja">
      <span id="titulo-baraja">Baraja</span>
      <div className="selector-baraja-opciones" role="radiogroup" aria-labelledby="titulo-baraja">
        {BARAJAS.map((b) => (
          <button
            key={b.id}
            type="button"
            role="radio"
            aria-checked={baraja === b.id}
            aria-label={b.credito ? `${b.nombre} (${b.credito})` : b.nombre}
            className={`baraja-opcion${baraja === b.id ? ' elegido' : ''}`}
            onClick={() => {
              alElegir(b.id)
              mostrarBaraja(b.id)
            }}
          >
            <span className="baraja-muestras" aria-hidden="true">
              {MUESTRAS.map((c) => (
                <Carta key={`${c.numero}-${c.palo}`} carta={c} tam="chica" baraja={b.id} />
              ))}
            </span>
            <span className="baraja-opcion-texto" aria-hidden="true">
              <strong>{b.nombre}</strong>
              {b.credito && <small>{b.credito}</small>}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
