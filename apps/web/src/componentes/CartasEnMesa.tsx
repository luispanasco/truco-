import { useEffect, useState, type CSSProperties } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
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
/** Con las cartas que se levantan: lo que queda a la vista la vuelta cerrada, para ver quién la ganó. */
export const MUESTRA_VUELTA_MS = 1200

export function direccion(n: number, pos: number): [number, number] {
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
  /** Opción de la sala: las cartas se levantan al cerrar cada vuelta (queda solo la vuelta en curso). */
  levantar?: boolean
  /** Terminó la mano (o el duelo): lo que está en la mesa queda quieto hasta que se levanta todo. */
  quieta?: boolean
  /**
   * Mesa en perspectiva: hacia dónde queda cada asiento desde el centro del paño (px del paño
   * sin inclinar), o null si todavía no se midió. Las cartas llegan desde ahí por el aire y caen
   * acostadas; al levantar la vuelta, se van hacia el que la ganó.
   */
  desdeAsiento?: (pos: number) => [number, number] | null
}

/** En perspectiva: desde qué altura (px, hacia la cámara) cae una carta tirada, y cuánto viene parada. */
const ALTURA_TIRO = 70
const PARADA_TIRO = 30

/** Una carta en la pila de un jugador: tirada en una vuelta, o mostrada al terminar. */
interface EnPila {
  asiento: number
  /** null: boca abajo (tapada, o una pieza de otro duelo que no se ve). */
  carta: TCarta | null
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
export function CartasEnMesa({ n, rel, mesa, mostradas, apodo, nuestro, levantar = false, quieta = false, desdeAsiento }: Props) {
  const reducido = useReducedMotion()
  const cerradas = mesa.vueltas.length
  // Con la opción de levantar: cuántas vueltas ya se levantaron. La recién cerrada queda un
  // momento (MUESTRA_VUELTA_MS) para ver quién la ganó; si alguien ya tiró en la siguiente, se
  // levanta enseguida para que no se mezclen.
  const [levantadas, setLevantadas] = useState(0)
  const empezoOtra = mesa.jugadas.some((j) => j.vuelta >= cerradas)
  const fuera = !levantar ? 0 : empezoOtra ? cerradas : Math.min(levantadas, cerradas)
  useEffect(() => {
    // Mesa nueva (otra mano u otro duelo): se arranca de cero.
    if (levantadas > cerradas) {
      setLevantadas(cerradas)
      return
    }
    if (!levantar || quieta || levantadas === cerradas) return
    const t = setTimeout(() => setLevantadas(cerradas), MUESTRA_VUELTA_MS)
    return () => clearTimeout(t)
  }, [levantar, quieta, levantadas, cerradas])

  // La vuelta "viva": la última en la que alguien tiró. La cerrada sigue viva hasta la próxima carta.
  const viva = mesa.jugadas.reduce((m, j) => Math.max(m, j.vuelta), 0)
  const enMesa = mesa.jugadas.filter((j) => j.vuelta >= fuera)
  const pila: EnPila[] = [
    // Las que se levantaron ya no cuentan para escalonar: la vuelta en curso cae en el anclaje.
    ...enMesa.map((j) => ({ asiento: j.asiento, carta: j.carta, lugar: j.vuelta - fuera })),
    ...mostradas.flatMap((m) => {
      const tiradas = enMesa.filter((j) => j.asiento === m.asiento).length
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
    <div className={`centro cartas-en-mesa${levantar ? ' se-levantan' : ''}`}>
      {/* Las cartas se ubican con CSS; lo animado va en un envoltorio adentro. */}
      <AnimatePresence>
        {pila.map((c) => {
          const pos = rel(c.asiento)
          const [dx, dy] = direccion(n, pos)
          // En perspectiva: el lugar de verdad de quien la tiró (si ya se midió la mesa).
          const desde = desdeAsiento?.(pos) ?? null
          const vuelta = c.lugar + fuera
          const cerrada = c.mostrada ? undefined : mesa.vueltas[vuelta]
          const ganadora = cerrada?.ganador === c.asiento
          const pasada = !c.mostrada && vuelta < viva
          // Una vuelta cerrada que se levanta se va hacia quien la ganó (si fue parda, al centro).
          const [gx, gy] = levantar && cerrada && cerrada.ganador !== null ? direccion(n, rel(cerrada.ganador)) : [0, 0]
          const hacia = levantar && cerrada && cerrada.ganador !== null ? (desdeAsiento?.(rel(cerrada.ganador)) ?? null) : null
          const salida = reducido
            ? { opacity: 0, transition: { duration: 0 } }
            : levantar && cerrada && desdeAsiento?.(0)
              ? {
                  // En perspectiva: se levanta del paño y va por el aire hasta el que la ganó (parda: se junta en el medio).
                  x: hacia ? hacia[0] * 0.85 : 0,
                  y: hacia ? hacia[1] * 0.85 : 0,
                  z: 40,
                  scale: 0.6,
                  opacity: 0,
                  transition: { duration: 0.45, ease: 'easeIn' as const, opacity: { duration: 0.45, ease: [0.6, 0, 1, 1] as const } },
                }
            : levantar && cerrada
              ? {
                  x: gx * VUELO * 0.8,
                  y: gy * VUELO * 0.8,
                  scale: 0.5,
                  opacity: 0,
                  transition: { duration: 0.4, ease: 'easeIn' as const, opacity: { duration: 0.4, ease: [0.6, 0, 1, 1] as const } },
                }
              : {
                  x: -dx * 30,
                  y: -dy * 30,
                  scale: 0.6,
                  opacity: 0,
                  transition: { duration: DURACION, ease: 'easeOut' as const, opacity: { duration: DURACION / 3, ease: 'easeIn' as const } },
                }
          return (
            <motion.div
              key={c.carta ? `${c.asiento}-${c.carta.numero}-${c.carta.palo}` : `${c.asiento}-tapada-${vuelta}`}
              className={`jugada pos-${pos}${pasada ? ' pasada' : ''}${c.mostrada ? ' mostrada' : ''}`}
              style={{ '--vuelta': c.lugar, zIndex: c.lugar + 1 } as CSSProperties}
              // La que se va queda debajo de todas, también de la que llega a su lugar.
              exit={{ zIndex: 0, transition: { duration: 0 } }}
            >
              <motion.div
                className="jugada-vuelo"
                // Las tiradas llegan desde el lado de quien las tiró, un poco giradas; las
                // mostradas se dan vuelta ahí mismo, de a una.
                initial={
                  reducido
                    ? false
                    : c.mostrada
                    ? { rotateY: 90, opacity: 0 }
                    : desde
                      ? // En perspectiva: sale de la mano de quien la tira, en el aire y casi parada, y cae acostada.
                        // La tuya arranca a la vista (sale de tu mano); las de los demás aparecen al salir.
                        { x: desde[0] * 0.85, y: desde[1] * 0.85, z: ALTURA_TIRO, rotateX: -PARADA_TIRO, rotate: (dx || 1) * 14, opacity: pos === 0 ? 1 : 0 }
                      : { x: dx * VUELO, y: dy * VUELO, rotate: (dx || 1) * 14, opacity: 0 }
                }
                animate={c.mostrada ? { rotateY: 0, opacity: 1 } : desde ? { x: 0, y: 0, z: 0, rotateX: 0, rotate: 0, opacity: 1 } : { x: 0, y: 0, rotate: 0, opacity: 1 }}
                // Al levantar la mesa se achica y se va hacia el centro. Se apaga enseguida: si
                // en ese lugar ya cae una carta nueva, la vieja no se ve asomando por debajo.
                exit={salida}
                transition={{
                  duration: desde && !c.mostrada ? DURACION * 1.3 : DURACION,
                  ease: 'easeOut',
                  delay: c.mostrada ? 0.1 + c.mostrada.orden * 0.12 : 0,
                  // La de los demás se ve enseguida de salir de su mano.
                  ...(desde && !c.mostrada ? { opacity: { duration: 0.12 } } : {}),
                }}
              >
                {c.carta ? <Carta carta={c.carta} tam="mesa" ganadora={ganadora} /> : <Carta oculta tam="mesa" ganadora={ganadora} />}
                {c.mostrada?.etiqueta && (
                  <span className="mostradas-etiqueta" role="note" aria-label={`${apodo(c.asiento)} muestra: ${c.mostrada.etiqueta}`}>
                    {c.mostrada.etiqueta}
                  </span>
                )}
              </motion.div>
            </motion.div>
          )
        })}
      </AnimatePresence>

      {mesa.vueltas.length > 0 && (
        <div className="vueltas" aria-label="Resultado de las vueltas">
          {/* Con las cartas que se levantan, es lo único que queda de las vueltas pasadas. */}
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
