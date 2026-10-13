import { useLayoutEffect, useMemo, useRef, useState } from 'react'
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

export function lugarMazo(n: number, reparteRel: number): [number, number] {
  return (POSICIONES[n] ?? POSICIONES[2]!)[reparteRel] ?? [50, 50]
}

export function posicionMazo(n: number, reparteRel: number): { left: string; top: string } {
  const [x, y] = lugarMazo(n, reparteRel)
  return { left: `${x}%`, top: `${y}%` }
}

/** Lo que dura el corte en el mazo, según el tipo; después se reparte y se da vuelta la muestra. */
export const CORTE_MS: Record<TipoCorte, number> = { convencional: 950, sacarMuestra: 850, darAlMano: 850 }
export const REPARTO_MS = 760
export const GIRO_MS = 320
/** Lo que tarda cada carta del reparto en llegar a su jugador. */
const VUELO_REPARTO_MS = 300

/**
 * En qué va el corte: se corta el mazo, se reparte y se da vuelta la muestra (al sacar la
 * muestra, sale en el mismo corte: no hay giro después).
 */
export type FaseCorte = 'corte' | 'reparto' | 'muestra' | null

/**
 * La fase del corte que acaba de llegar. Arranca antes de pintar (así ni la muestra ni las
 * cartas nuevas asoman un instante) y con movimiento reducido no hay animación ni espera.
 */
export function useFaseCorte(corte: { id: number; corte: TipoCorte } | null): FaseCorte {
  const reducido = useReducedMotion()
  const [fase, setFase] = useState<FaseCorte>(null)
  const id = corte?.id
  const tipo = corte?.corte
  useLayoutEffect(() => {
    if (id === undefined || tipo === undefined || reducido) return
    const fin = CORTE_MS[tipo] + REPARTO_MS
    setFase('corte')
    const timers = [
      setTimeout(() => setFase('reparto'), CORTE_MS[tipo]),
      ...(tipo === 'sacarMuestra'
        ? [setTimeout(() => setFase(null), fin)]
        : [setTimeout(() => setFase('muestra'), fin), setTimeout(() => setFase(null), fin + GIRO_MS)]),
    ]
    return () => {
      timers.forEach(clearTimeout)
      setFase(null)
    }
  }, [id, tipo, reducido])
  return fase
}

/** Cuántos dorsos se apilan para que se vea un mazo con cuerpo, no una carta sola. */
const CAPAS = 10
/** Corrimiento de cada dorso sobre el de abajo (px): el espesor del mazo. */
const ESPESOR: [number, number] = [-0.6, -1.05]

function Capas({ desde, hasta, tope = false }: { desde: number; hasta: number; tope?: boolean }) {
  return (
    <>
      {Array.from({ length: hasta - desde }, (_, k) => {
        const i = desde + k
        return (
          <div
            key={i}
            className={`mazo-capa${tope && i === hasta - 1 ? ' mazo-tope' : ''}`}
            style={{ translate: `${i * ESPESOR[0]}px ${i * ESPESOR[1]}px` }}
          >
            <Carta oculta tam="mesa" />
          </div>
        )
      })}
    </>
  )
}

/** El mazo quieto: los dorsos apilados, con espesor. */
export function PilaMazo() {
  return (
    <div className="mazo-pila">
      <Capas desde={0} hasta={CAPAS} tope />
    </div>
  )
}

/** Hacia dónde queda el centro del paño visto desde el mazo (vector de largo 1; el paño es más alto que ancho). */
function haciaElCentro(x: number, y: number): [number, number] {
  const [dx, dy] = [50 - x, (50 - y) * 1.4]
  const largo = Math.hypot(dx, dy) || 1
  return [dx / largo, dy / largo]
}

/** Desplazamiento de las capas [desde, hasta) si se las sube o se las baja de a `capas`. */
const subir = (capas: number) => ({ x: capas * ESPESOR[0], y: capas * ESPESOR[1] })

/**
 * El corte en el mazo (en px desde la pila; lo que se separa va hacia el centro del paño, `hacia`):
 * - convencional: se separa en dos pilas; la de arriba se corre a un costado, la de abajo
 *   pasa encima y vuelven juntas;
 * - sacar la muestra: la de arriba se levanta, se da vuelta y queda de muestra;
 * - se la doy al mano: una sola de arriba se separa y pasa al fondo (de ahí sale para el mano).
 */
function CorteEnMazo({ tipo, hacia: [hx, hy] }: { tipo: TipoCorte; hacia: [number, number] }) {
  const s = CORTE_MS[tipo] / 1000
  const mitad = CAPAS / 2
  const L = 54
  if (tipo === 'convencional') {
    const arriba = subir(-mitad)
    const abajo = subir(mitad)
    return (
      <div className="mazo-pila">
        <motion.div
          className="mazo-grupo"
          style={{ zIndex: 1 }}
          initial={false}
          animate={{
            x: [0, hx * L * 0.35, hx * L, hx * L, arriba.x],
            y: [0, hy * L * 0.35 - 12, hy * L, hy * L, arriba.y],
            rotate: [0, 4, 7, 7, 0],
          }}
          transition={{ duration: s, times: [0, 0.18, 0.38, 0.72, 1], ease: 'easeInOut' }}
        >
          <Capas desde={mitad} hasta={CAPAS} />
        </motion.div>
        <motion.div
          className="mazo-grupo"
          initial={false}
          animate={{
            x: [0, 0, hx * L * 0.5, hx * L + abajo.x, abajo.x],
            y: [0, 0, hy * L * 0.5 - 16, hy * L + abajo.y, abajo.y],
            rotate: [0, 0, 4, 7, 0],
            zIndex: [0, 0, 2, 2, 2],
          }}
          transition={{ duration: s, times: [0, 0.38, 0.55, 0.72, 1], ease: 'easeInOut' }}
        >
          <Capas desde={0} hasta={mitad} />
        </motion.div>
      </div>
    )
  }
  if (tipo === 'sacarMuestra') {
    return (
      <div className="mazo-pila">
        <Capas desde={0} hasta={CAPAS - 1} />
        <motion.div
          className="mazo-grupo"
          style={{ transformPerspective: 500 }}
          initial={false}
          animate={{ x: [0, 8 * hx, 26], y: [0, -20, -6], rotate: [0, 0, 50], rotateY: [0, 0, 90], opacity: [1, 1, 1, 0] }}
          transition={{ duration: s * 0.6, times: [0, 0.45, 1], ease: 'easeInOut', opacity: { duration: s * 0.6, times: [0, 0.5, 0.98, 1] } }}
        >
          <Capas desde={CAPAS - 1} hasta={CAPAS} />
        </motion.div>
      </div>
    )
  }
  return (
    <div className="mazo-pila">
      <motion.div
        className="mazo-grupo"
        initial={false}
        animate={{
          // Queda asomando abajo del mazo: de ahí sale primero, para el mano.
          x: [0, hx * L * 0.75, hx * L * 0.75, subir(-(CAPAS - 1)).x + 5, subir(-(CAPAS - 1)).x + 5],
          y: [0, hy * L * 0.75 - 10, hy * L * 0.75 - 10, subir(-(CAPAS - 1)).y + 7, subir(-(CAPAS - 1)).y + 7],
          rotate: [0, 6, 6, -3, -3],
          zIndex: [2, 2, -1, -1, -1],
        }}
        transition={{ duration: s, times: [0, 0.3, 0.45, 0.8, 1], ease: 'easeInOut' }}
      >
        <Capas desde={CAPAS - 1} hasta={CAPAS} />
      </motion.div>
      <Capas desde={0} hasta={CAPAS - 1} />
    </div>
  )
}

/**
 * El reparto: de a una, empezando por el mano y en sentido antihorario, tres vueltas. Cada carta
 * vuela hasta el lugar del jugador (se mide en la pantalla, así sirve en cualquier mesa). Si se
 * la dieron al mano, la primera sale de abajo del mazo.
 */
function Reparto({ orden, desdeAbajo }: { orden: number[]; desdeAbajo: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const total = orden.length * 3
  const paso = Math.min(90, (REPARTO_MS - VUELO_REPARTO_MS) / Math.max(1, total - 1))
  useLayoutEffect(() => {
    const raiz = ref.current
    const mesa = raiz?.closest('.pantalla-mesa')
    if (!raiz || !mesa) return
    const origen = raiz.getBoundingClientRect()
    // El mazo puede estar achicado (3 contra 3): lo medido en pantalla se pasa a su escala.
    const escala = raiz.offsetWidth > 0 ? origen.width / raiz.offsetWidth : 1
    const cx = origen.left + origen.width / 2
    const cy = origen.top + origen.height / 2
    const destino = (pos: number) => {
      const el = pos === 0 ? mesa.querySelector('.mi-lugar .mi-mano-zona') : mesa.querySelector(`.tapete .asiento.pos-${pos} .asiento-avatar`)
      const r = el?.getBoundingClientRect()
      if (!r) return [0, 0]
      // Las tuyas llegan al borde de abajo del paño: de ahí bajan a tu mano.
      const borde = mesa.querySelector('.tapete')?.getBoundingClientRect().bottom
      const ty = pos === 0 && borde !== undefined ? Math.min(r.top + r.height / 2, borde - 50) : r.top + r.height / 2
      return [(r.left + r.width / 2 - cx) / escala, (ty - cy) / escala]
    }
    const animaciones: Animation[] = []
    raiz.querySelectorAll<HTMLElement>('.reparto-carta').forEach((el, i) => {
      if (typeof el.animate !== 'function') return
      const [dx, dy] = destino(orden[i % orden.length]!)
      const giro = (i % 2 ? 1 : -1) * 12
      // Salen de arriba de la pila; la del mano, si se la dieron, de abajo (donde quedó asomando).
      const [x0, y0] = i === 0 && desdeAbajo ? [5, 7] : [subir(CAPAS - 1).x, subir(CAPAS - 1).y]
      animaciones.push(
        el.animate(
          [
            { transform: `translate(${x0}px, ${y0}px) rotate(-8deg) scale(1)`, opacity: 1 },
            { transform: `translate(${dx}px, ${dy}px) rotate(${giro}deg) scale(0.7)`, opacity: 1, offset: 0.85 },
            { transform: `translate(${dx}px, ${dy}px) rotate(${giro}deg) scale(0.6)`, opacity: 0 },
          ],
          { duration: VUELO_REPARTO_MS, delay: i * paso, easing: 'ease-out', fill: 'both' },
        ),
      )
    })
    return () => animaciones.forEach((a) => a.cancel())
  }, [orden, paso, desdeAbajo])
  return (
    <div ref={ref} className="mazo-reparto" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className={`reparto-carta${i === 0 && desdeAbajo ? ' desde-abajo' : ''}`} style={{ zIndex: i === 0 && desdeAbajo ? 0 : 2 + total - i }}>
          <Carta oculta tam="mesa" />
        </div>
      ))}
    </div>
  )
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
  /** Posición del mano (relativa a quien mira): por él empieza el reparto. */
  manoRel?: number
}

/**
 * La muestra boca arriba, con el mazo cruzado encima. Mientras se corta todavía no hay
 * muestra: el mazo brilla con el aviso de quién corta. Al cortar se ve el corte en el mazo,
 * las cartas salen hacia cada jugador y la muestra se da vuelta.
 */
export function Mazo({ muestra, n, reparteRel, avisoCorte = null, corte = null, fase = null, manoRel = 0 }: Props) {
  const reducido = useReducedMotion()
  const esperando = avisoCorte !== null
  const [x, y] = lugarMazo(n, reparteRel)
  const tipo = corte?.corte ?? null
  // La muestra espera al giro del final; si se sacó en el corte, sale ahí mismo.
  const verMuestra = !!muestra && (fase === null || fase === 'muestra' || tipo === 'sacarMuestra')
  const giro = !reducido && tipo !== null && (fase === 'muestra' || (tipo === 'sacarMuestra' && fase === 'corte'))
  const demoraGiro = tipo === 'sacarMuestra' && fase === 'corte' ? (CORTE_MS.sacarMuestra / 1000) * 0.55 : 0
  // El orden del reparto: desde el mano, en sentido antihorario (las posiciones crecen así).
  const orden = useMemo(() => Array.from({ length: n }, (_, k) => (manoRel + k) % n), [n, manoRel])
  return (
    <div
      className={`mazo${n === 6 ? ' mazo-chico' : ''}${esperando ? ' mazo-esperando-corte' : ''}${fase ? ' mazo-cortando' : ''}`}
      style={posicionMazo(n, reparteRel)}
      aria-label={muestra ? 'Mazo y muestra' : 'Mazo sin cortar'}
      data-fase={fase ?? undefined}
    >
      {verMuestra && (
        <div className="mazo-muestra">
          <motion.div
            key={giro ? `giro-${corte!.id}` : 'quieta'}
            className="mazo-giro"
            style={{ transformPerspective: 500 }}
            initial={giro ? { rotateY: 90, opacity: 0 } : false}
            animate={{ rotateY: 0, opacity: 1 }}
            transition={{ duration: GIRO_MS / 1000, ease: 'easeOut', delay: demoraGiro, opacity: { duration: 0.01, delay: demoraGiro } }}
          >
            <Carta carta={muestra} tam="mesa" />
          </motion.div>
        </div>
      )}
      {fase === 'corte' && tipo ? (
        // Hacia el centro del paño: del borde no se sale.
        <CorteEnMazo key={corte!.id} tipo={tipo} hacia={haciaElCentro(x, y)} />
      ) : (
        <PilaMazo />
      )}
      {fase === 'reparto' && <Reparto key={corte!.id} orden={orden} desdeAbajo={tipo === 'darAlMano'} />}
      {esperando && (
        // El aviso va hacia el centro del paño: en la mitad de abajo, arriba del mazo.
        <span className={`mazo-aviso${y > 50 ? ' arriba' : ''}`} role="status">
          {avisoCorte}
        </span>
      )}
    </div>
  )
}
