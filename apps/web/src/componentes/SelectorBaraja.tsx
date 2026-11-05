import { useState } from 'react'
import type { Carta as TCarta } from '@truco/engine'
import { idBaraja } from '@truco/shared'
import { BARAJAS, mostrarBaraja, type Baraja } from '../baraja'
import { useEsBeta, useInventario } from '../cuenta/inventario'
import { Carta } from './Carta'

/** Las dos cartas de muestra de cada baraja en el selector. */
const MUESTRAS: TCarta[] = [
  { numero: 1, palo: 'espada' },
  { numero: 12, palo: 'oro' },
]

/**
 * Elegir la baraja (cosmético): miniaturas de cada una y su crédito. `alElegir` la guarda donde
 * corresponda (el perfil); además todas las cartas de la app se redibujan al momento. Las que se
 * ganan en el modo historia se ven con candado hasta que las ganás (los beta las usan igual).
 */
export function SelectorBaraja({ baraja, alElegir }: { baraja: Baraja; alElegir: (b: Baraja) => void }) {
  const beta = useEsBeta()
  const tenes = useInventario()
  const [aviso, setAviso] = useState<string | null>(null)
  return (
    <div className="selector-baraja">
      <span id="titulo-baraja">Baraja</span>
      <div className="selector-baraja-opciones" role="radiogroup" aria-labelledby="titulo-baraja">
        {BARAJAS.map((b) => {
          const falta = !!b.recompensa && !beta && !tenes.has(idBaraja(b.id))
          return (
          <button
            key={b.id}
            type="button"
            role="radio"
            aria-checked={baraja === b.id}
            aria-disabled={falta || undefined}
            aria-label={falta ? `${b.nombre}: se gana en ${b.recompensa}` : b.credito ? `${b.nombre} (${b.credito})` : b.nombre}
            className={`baraja-opcion${baraja === b.id ? ' elegido' : ''}${falta ? ' bloqueada' : ''}`}
            onClick={() => {
              if (falta) return setAviso(`La baraja ${b.nombre} se gana en ${b.recompensa}, en el modo historia.`)
              setAviso(null)
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
              {falta ? <small>🔒 Se gana en {b.recompensa}</small> : b.credito && <small>{b.credito}</small>}
            </span>
          </button>
          )
        })}
      </div>
      {aviso && (
        <small className="campo-detalle" role="status">
          {aviso}
        </small>
      )}
    </div>
  )
}
