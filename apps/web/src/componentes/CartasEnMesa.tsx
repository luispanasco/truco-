import type { CSSProperties } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import type { Carta as TCarta } from '@truco/engine'
import type { MesaVisible, Mostradas } from '../estado'
import { Carta } from './Carta'
import '../estilos-mesa-cartas.css'

/**
 * Hacia dónde queda cada jugador visto desde el centro (x a la derecha, y hacia abajo), por
 * cantidad de jugadores y posición relativa. Las cartas tiradas llegan desde ahí.
 */
const DIRECCION: Record<number, [number, number][]> = {
  2: [[0, 1], [0, -1]],
  4: [[0, 1], [1, 0], [0, -1], [-1, 0]],
  6: [[0, 1], [0.8, 0.6], [0.8, -0.6], [0, -1], [-0.8, -0.6], [-0.8, 0.6]],
}
/** Distancia (px) desde la que llega volando una carta tirada. */
const VUELO = 170
const DURACION = 0.3

function direccion(n: number, pos: number): [number, number] {
  return DIRECCION[n]?.[pos] ?? [0, 1]
}

interface Props {
  n: number
  /** Posición relativa a quien mira (0 = abajo, en sentido antihorario). */
  rel: (asiento: number) => number
  mesa: MesaVisible
  /** Cartas que se dieron vuelta al terminar la mano (flor o envido ganado). */
  mostradas: Mostradas[]
  apodo: (asiento: number) => string
  /** Equipo de quien mira, para pintar las vueltas ganadas y perdidas. */
  nuestro: number
}

/** Una carta en la pila de un jugador: tirada en una vuelta, o mostrada al terminar. */
interface EnPila {
  asiento: number
  carta: TCarta
  /** Lugar en la pila (0 abajo de todo); para las tiradas es la vuelta. */
  lugar: number
  mostrada?: { orden: number; etiqueta: string | null }
}

/**
 * Las cartas jugadas quedan en la mesa como en la vida real: cada uno deja las suyas frente
 * a sí, una por vuelta, escalonadas (la de la primera abajo de todo). La ganadora de cada
 * vuelta va resaltada y las de vueltas ya cerradas quedan un poco apagadas. Al terminar,
 * quien cantó flor o ganó el envido da vuelta las que le quedaron, a continuación de su pila.
 */
export function CartasEnMesa({ n, rel, mesa, mostradas, apodo, nuestro }: Props) {
  // La vuelta "viva": la última en la que alguien tiró. La cerrada sigue viva hasta la próxima carta.
  const viva = mesa.jugadas.reduce((m, j) => Math.max(m, j.vuelta), 0)
  const pila: EnPila[] = [
    ...mesa.jugadas.map((j) => ({ asiento: j.asiento, carta: j.carta, lugar: j.vuelta })),
    ...mostradas.flatMap((m) => {
      const tiradas = mesa.jugadas.filter((j) => j.asiento === m.asiento).length
      return m.cartas.map((carta, i) => ({
        asiento: m.asiento,
        carta,
        lugar: tiradas + i,
        // La etiqueta va sobre la última, la que queda arriba de todo.
        mostrada: { orden: i, etiqueta: i === m.cartas.length - 1 && m.etiqueta ? m.etiqueta : null },
      }))
    }),
  ]

  return (
    <div className="centro cartas-en-mesa">
      {/* Las cartas se ubican con CSS; lo animado va en un envoltorio adentro. */}
      <AnimatePresence>
        {pila.map((c) => {
          const pos = rel(c.asiento)
          const [dx, dy] = direccion(n, pos)
          const ganadora = !c.mostrada && mesa.vueltas[c.lugar]?.ganador === c.asiento
          const pasada = !c.mostrada && c.lugar < viva
          return (
            <div
              key={`${c.asiento}-${c.carta.numero}-${c.carta.palo}`}
              className={`jugada pos-${pos}${pasada ? ' pasada' : ''}${c.mostrada ? ' mostrada' : ''}`}
              style={{ '--vuelta': c.lugar, zIndex: c.lugar + 1 } as CSSProperties}
            >
              <motion.div
                className="jugada-vuelo"
                // Las tiradas llegan desde el lado de quien las tiró, un poco giradas; las
                // mostradas se dan vuelta ahí mismo, de a una.
                initial={
                  c.mostrada
                    ? { rotateY: 90, opacity: 0 }
                    : { x: dx * VUELO, y: dy * VUELO, rotate: (dx || 1) * 14, opacity: 0 }
                }
                animate={c.mostrada ? { rotateY: 0, opacity: 1 } : { x: 0, y: 0, rotate: 0, opacity: 1 }}
                // Al levantar la mesa se achica y se va hacia el centro.
                exit={{ x: -dx * 30, y: -dy * 30, scale: 0.6, opacity: 0, transition: { duration: DURACION, ease: 'easeOut' } }}
                transition={{ duration: DURACION, ease: 'easeOut', delay: c.mostrada ? 0.1 + c.mostrada.orden * 0.12 : 0 }}
              >
                <Carta carta={c.carta} tam="mesa" ganadora={ganadora} />
                {c.mostrada?.etiqueta && (
                  <span className="mostradas-etiqueta" role="note" aria-label={`${apodo(c.asiento)} muestra: ${c.mostrada.etiqueta}`}>
                    {c.mostrada.etiqueta}
                  </span>
                )}
              </motion.div>
            </div>
          )
        })}
      </AnimatePresence>

      {mesa.vueltas.length > 0 && (
        <div className="vueltas" aria-label="Resultado de las vueltas">
          {mesa.vueltas.map((v, i) => (
            <span key={i} className={v.resultado === 'parda' ? 'parda' : v.resultado === nuestro ? 'ganada' : 'perdida'}>
              {v.resultado === 'parda' ? '=' : v.resultado === nuestro ? '✔' : '✘'}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
