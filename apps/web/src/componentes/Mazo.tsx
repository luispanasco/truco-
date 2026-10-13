import { useLayoutEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { Carta as TCarta, TipoCorte } from '@truco/engine'
import { Carta } from './Carta'

/**
 * Dónde va el mazo (en % del paño), según la posición del que reparte relativa a quien
 * mira (0 = abajo, en sentido antihorario). Va a la derecha del que reparte, o sea del
 * lado del mano, pegado al borde para no tapar las cartas jugadas.
 */
const POSICIONES: Record<number, [number, number][]> = {
  2: [
    [84, 66],
    [17, 16],
  ],
  4: [
    [85, 86],
    [84, 24],
    [17, 15],
    // Bien abajo: más arriba pisa las cartas del de la izquierda (en escritorio el paño es bajito).
    [16, 83],
  ],
  // En 3 contra 3 va a las esquinas: el medio de arriba y de abajo es de los asientos y del registro.
  6: [
    [84, 91],
    [86, 50],
    [78, 9],
    [22, 9],
    [14, 50],
    [16, 91],
  ],
}

function lugarMazo(n: number, reparteRel: number): [number, number] {
  return (POSICIONES[n] ?? POSICIONES[2]!)[reparteRel] ?? [50, 50]
}

export function posicionMazo(n: number, reparteRel: number): { left: string; top: string } {
  const [x, y] = lugarMazo(n, reparteRel)
  return { left: `${x}%`, top: `${y}%` }
}

/** Lo que dura el corte en el mazo y el giro de la muestra; después se reparte. */
export const CORTE_MS = 700
export const GIRO_MS = 320

/** En qué va el corte: el mazo se corta, la muestra se da vuelta, y recién ahí se reparte. */
export type FaseCorte = 'corte' | 'muestra' | null

/**
 * La fase del corte que acaba de llegar. Arranca antes de pintar (así ni la muestra ni las
 * cartas nuevas asoman un instante) y con movimiento reducido no hay animación ni espera.
 */
export function useFaseCorte(corte: { id: number } | null): FaseCorte {
  const reducido = useReducedMotion()
  const [fase, setFase] = useState<FaseCorte>(null)
  const id = corte?.id
  useLayoutEffect(() => {
    if (id === undefined || reducido) return
    setFase('corte')
    const t1 = setTimeout(() => setFase('muestra'), CORTE_MS)
    const t2 = setTimeout(() => setFase(null), CORTE_MS + GIRO_MS)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      setFase(null)
    }
  }, [id, reducido])
  return fase
}

const S = CORTE_MS / 1000

/**
 * Cómo se mueve lo que se levanta del mazo, según el corte (en px, desde la pila):
 * - convencional: se levanta un pedazo, se corre y pasa abajo;
 * - sacar la muestra: la de arriba se levanta, se corre hacia la muestra y se da vuelta;
 * - se la doy al mano: una sola carta va al fondo y después sale hacia el mano.
 */
function movimientoDelCorte(tipo: TipoCorte, haciaMano: [number, number]) {
  if (tipo === 'convencional') {
    return {
      animate: { x: [0, 30, 30, 0], y: [0, -16, -4, 0], rotate: [0, 8, 4, 0], zIndex: [2, 2, 0, 0] },
      transition: { duration: S, times: [0, 0.4, 0.6, 1], ease: 'easeInOut' as const },
    }
  }
  if (tipo === 'sacarMuestra') {
    return {
      animate: { x: [0, 10, 34], y: [0, -18, 0], rotateY: [0, 0, 90], opacity: [1, 1, 0] },
      transition: { duration: S, times: [0, 0.45, 1], ease: 'easeInOut' as const },
    }
  }
  const [dx, dy] = haciaMano
  return {
    animate: {
      x: [0, -14, 0, 0, dx * 90],
      y: [0, -12, 0, 0, dy * 90],
      zIndex: [2, 2, 0, 3, 3],
      opacity: [1, 1, 1, 1, 0],
    },
    transition: { duration: S, times: [0, 0.25, 0.5, 0.55, 1], ease: 'easeInOut' as const },
  }
}

interface Props {
  muestra: TCarta | null
  n: number
  reparteRel: number
  /** Quién está eligiendo el corte (texto del aviso: "Corta X"), o null. */
  avisoCorte?: string | null
  /** El corte que se está animando y en qué fase va. */
  corte?: { corte: TipoCorte; id: number } | null
  fase?: FaseCorte
  /** Hacia dónde queda el mano visto desde el mazo (x a la derecha, y hacia abajo). */
  haciaMano?: [number, number]
}

/**
 * La muestra boca arriba, con el mazo cruzado encima. Mientras se corta todavía no hay
 * muestra: el mazo brilla con el aviso de quién corta. Al cortar, se ve el corte y la muestra
 * se da vuelta con un giro.
 */
export function Mazo({ muestra, n, reparteRel, avisoCorte = null, corte = null, fase = null, haciaMano = [0, 1] }: Props) {
  const reducido = useReducedMotion()
  const esperando = avisoCorte !== null
  // Mientras se corta, la muestra (que ya llegó) espera; después aparece girando.
  const verMuestra = muestra && fase !== 'corte'
  const giro = !reducido && corte !== null && fase === 'muestra'
  const mov = corte && fase === 'corte' ? movimientoDelCorte(corte.corte, haciaMano) : null
  return (
    <div
      className={`mazo${n === 6 ? ' mazo-chico' : ''}${esperando ? ' mazo-esperando-corte' : ''}`}
      style={posicionMazo(n, reparteRel)}
      aria-label={muestra ? 'Mazo y muestra' : 'Mazo sin cortar'}
    >
      {verMuestra && (
        <div className="mazo-muestra">
          <motion.div
            key={giro ? `giro-${corte!.id}` : 'quieta'}
            className="mazo-giro"
            style={{ transformPerspective: 500 }}
            initial={giro ? { rotateY: 90 } : false}
            animate={{ rotateY: 0 }}
            transition={{ duration: GIRO_MS / 1000, ease: 'easeOut' }}
          >
            <Carta carta={muestra} tam="mesa" />
          </motion.div>
        </div>
      )}
      <div className="mazo-pila">
        <div className="mazo-base">
          <Carta oculta tam="mesa" />
        </div>
        {mov && (
          <motion.div key={corte!.id} className="mazo-cortado" style={{ transformPerspective: 500 }} initial={false} animate={mov.animate} transition={mov.transition}>
            <Carta oculta tam="mesa" />
          </motion.div>
        )}
      </div>
      {esperando && (
        // El aviso va hacia el centro del paño: en la mitad de abajo, arriba del mazo.
        <span className={`mazo-aviso${lugarMazo(n, reparteRel)[1] > 50 ? ' arriba' : ''}`} role="status">
          {avisoCorte}
        </span>
      )}
    </div>
  )
}
