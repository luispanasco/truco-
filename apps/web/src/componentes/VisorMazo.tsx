import { useState } from 'react'
import { fuerza, piezaDe, type Carta as TCarta, type Palo } from '@truco/engine'
import { BARAJAS, type Baraja } from '../baraja'
import { Carta } from './Carta'
import { Hoja } from './Hoja'
import { Interruptor } from './Interruptor'

export const PALOS_VISOR: { id: Palo; nombre: string }[] = [
  { id: 'espada', nombre: 'Espada' },
  { id: 'basto', nombre: 'Basto' },
  { id: 'oro', nombre: 'Oro' },
  { id: 'copa', nombre: 'Copa' },
]

const NUMEROS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12] as const

/** Las matas que no son pieza (las del motor: fuerza 11 a 14 sin muestra de su palo). */
const MATAS: TCarta[] = [
  { numero: 1, palo: 'espada' },
  { numero: 1, palo: 'basto' },
  { numero: 7, palo: 'espada' },
  { numero: 7, palo: 'oro' },
]

export interface CartaDelVisor {
  carta: TCarta
  /** Qué es: pieza (si la muestra es de ese palo) o mata; null si es común. */
  etiqueta: string | null
}

/** Una muestra del palo que no es pieza: con ella, el motor dice qué cartas del palo son piezas. */
const muestraDe = (palo: Palo): TCarta => ({ numero: 6, palo })

function etiquetaDe(c: TCarta): string | null {
  const pieza = piezaDe(c, muestraDe(c.palo))
  if (pieza === 11) return 'Perico'
  if (pieza === 10) return 'Perica'
  if (pieza !== null) return 'Pieza'
  return MATAS.some((m) => m.numero === c.numero && m.palo === c.palo) ? 'Mata' : null
}

/**
 * Las cartas de un palo para el visor. Todas, del 1 al 12; o solo las que mandan (las piezas,
 * contando que la muestra es de ese palo, y las matas), de la más alta a la más baja.
 */
export function cartasDelPalo(palo: Palo, soloLasQueMandan: boolean): CartaDelVisor[] {
  const todas = NUMEROS.map((numero) => {
    const carta: TCarta = { numero, palo }
    return { carta, etiqueta: etiquetaDe(carta) }
  })
  if (!soloLasQueMandan) return todas
  const muestra = muestraDe(palo)
  return todas.filter((c) => c.etiqueta !== null).sort((a, b) => fuerza(b.carta, muestra) - fuerza(a.carta, muestra))
}

/** Para ver las cartas de la baraja que usás, de a un palo (pestañas arriba), o el dorso. */
export function VisorMazo({ baraja, alCerrar }: { baraja: Baraja; alCerrar: () => void }) {
  const [palo, setPalo] = useState<Palo | 'dorso'>('espada')
  const [soloLasQueMandan, setSoloLasQueMandan] = useState(false)
  const datos = BARAJAS.find((b) => b.id === baraja)
  return (
    <Hoja titulo="Las cartas del mazo" alCerrar={alCerrar} clase="hoja-menu hoja-visor-mazo" claseFondo="hoja-fija">
      <div className="hoja-menu-contenido visor-mazo">
        <p className="visor-baraja">
          <strong>{datos?.nombre}</strong>
          {datos?.credito && <small className="baraja-comparar-credito">{datos.credito}</small>}
        </p>
        <div className="segmentado visor-palos" role="radiogroup" aria-label="Palo">
          {PALOS_VISOR.map((p) => (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={palo === p.id}
              className={palo === p.id ? 'elegido' : ''}
              onClick={() => setPalo(p.id)}
            >
              {p.nombre}
            </button>
          ))}
          <button type="button" role="radio" aria-checked={palo === 'dorso'} className={palo === 'dorso' ? 'elegido' : ''} onClick={() => setPalo('dorso')}>
            Dorso
          </button>
        </div>
        {palo === 'dorso' ? (
          <div className="visor-dorso">
            <Carta oculta tam="grande" baraja={baraja} />
          </div>
        ) : (
          <VisorPalo palo={palo} baraja={baraja} soloLasQueMandan={soloLasQueMandan} alCambiarSolo={setSoloLasQueMandan} />
        )}
      </div>
    </Hoja>
  )
}

/** Las cartas de un palo, con el interruptor de "solo las que mandan". */
function VisorPalo({
  palo,
  baraja,
  soloLasQueMandan,
  alCambiarSolo,
}: {
  palo: Palo
  baraja: Baraja
  soloLasQueMandan: boolean
  alCambiarSolo: (v: boolean) => void
}) {
  const cartas = cartasDelPalo(palo, soloLasQueMandan)
  return (
    <>
      <Interruptor
        activo={soloLasQueMandan}
        alCambiar={alCambiarSolo}
        titulo="Solo las que mandan"
        detalle="Las piezas y las matas del palo, de la más alta a la más baja"
      />
      <ul className="visor-cartas" aria-label={`Cartas de ${PALOS_VISOR.find((p) => p.id === palo)!.nombre.toLowerCase()}`}>
        {cartas.map(({ carta, etiqueta }) => (
          <li key={`${carta.numero}-${carta.palo}`} className="visor-carta">
            <Carta carta={carta} tam="normal" baraja={baraja} />
            <span className={`visor-etiqueta${etiqueta ? '' : ' vacia'}`}>{etiqueta ?? ' '}</span>
          </li>
        ))}
      </ul>
      <p className="nota">Las piezas mandan cuando la muestra es de este palo; si la muestra es una pieza, el 12 toma su lugar.</p>
    </>
  )
}
