import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { motion } from 'motion/react'
import { nombreCarta, type Carta as TCarta } from '@truco/engine'
import { Carta } from './Carta'
import {
  conTope,
  enTope,
  ESPERA_ABRIR_MS,
  estaOjeada,
  moverCarta,
  posicionesIniciales,
  UMBRAL_ARRASTRE_PX,
  VIBRACION_MS,
  VIBRACION_TOPE_MS,
  ZONAS_OJEO,
} from '../ojeo'
import { useBaraja } from '../baraja'
import '../estilos-ojeo.css'

/** Cuántas cartas tiene que tener la mano para ojearla (una mano recién repartida). */
const CARTAS_OJEO = 3
/** En el abanico: cuánto hay que subir una carta (px) arrastrándola para jugarla al soltar. */
export const UMBRAL_JUGAR_PX = 60
/** Una carta que no se puede jugar se deja arrastrar apenas (y vuelve sola). */
const RESISTENCIA_NO_JUGABLE = 0.25
/** Abanico curvo: giro (grados) y caída (px) por cada lugar de distancia al centro. */
const GIRO_ABANICO = 8
const CAIDA_ABANICO = 7
/** En el abanico: cuánto (ms) hay que mantener apretada una carta, sin moverla, para hacer su seña. */
export const MANTENER_MS = 450
const VIBRACION_MANTENER_MS = 25

/** Arrastre en curso: ojeando la pila, o llevando una carta del abanico a la mesa. */
interface Arrastre {
  modo: 'ojeo' | 'jugar'
  i: number
  id: number
  x0: number
  y0: number
  dx: number
  dy: number
  desde: number
  alto: number
  movio: boolean
  enTope: boolean
  /** Se mantuvo apretada hasta hacer la seña: al soltarla no se juega. */
  mantuvo: boolean
}

interface Props {
  /** De adelante hacia atrás: la primera es la que se ve entera en la pila. */
  cartas: TCarta[]
  /** Con el ajuste "Ojear cartas" apagado llegan directo en abanico. */
  ojeoActivado: boolean
  /** Avisa cuando la mano se abre en abanico (ojeada, "Ver todas" o tocando en su turno). */
  onAbrir?: () => void
  /** Es el turno del jugador: tocar cualquier carta de la pila abre el abanico. */
  abrirAlTocar?: boolean
  jugable?: (c: TCarta) => boolean
  resaltada?: (c: TCarta) => boolean
  /** Con ayudas: la estrella de las resaltadas se puede tocar (explica por qué está marcada). */
  alTocarEstrella?: (c: TCarta, estrella: HTMLElement) => void
  /** Juega la carta: tocándola, o arrastrándola hacia la mesa con la mano abierta. */
  alTocar?: (c: TCarta) => void
  /** Mantenerla apretada en el abanico (MANTENER_MS, sin moverla): hace su seña. Apilada no aplica. */
  alMantener?: (c: TCarta) => void
  /** Animación de reparto al entrar (las cartas bajan escalonadas). */
  reparto?: boolean
  className?: string
}

/** Lugar de cada carta en el abanico curvo: las de los costados giradas y un poco más abajo. */
function lugarEnAbanico(i: number, n: number): CSSProperties {
  const k = i - (n - 1) / 2
  return { '--giro': `${k * GIRO_ABANICO}deg`, '--caida': `${k * k * CAIDA_ABANICO}px` } as CSSProperties
}

function sinMovimiento(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/**
 * La mano del jugador. Si el ojeo está activado y la mano está entera, las cartas llegan
 * apiladas y se descubren arrastrando hacia abajo (ver `ojeo.ts`); cuando están todas ojeadas
 * se abre sola en abanico. Abierta, una carta jugable se juega tocándola o arrastrándola hacia
 * arriba (hacia la mesa) más allá de UMBRAL_JUGAR_PX; si no llega, vuelve a su lugar.
 * El ojeo es puramente visual: no manda nada ni cambia la partida.
 * Para empezar un ojeo nuevo en cada mano, montarla con `key` distinta.
 */
export function ManoOjeable({
  cartas,
  ojeoActivado,
  onAbrir,
  abrirAlTocar,
  jugable,
  resaltada,
  alTocarEstrella,
  alTocar,
  alMantener,
  reparto,
  className,
}: Props) {
  const [abierta, setAbierta] = useState(() => !ojeoActivado || cartas.length !== CARTAS_OJEO)
  // Dónde están los cortes y el número depende de la baraja elegida.
  const zonas = ZONAS_OJEO[useBaraja((e) => e.baraja)]
  // Si se juega una carta (o cambia la mano) antes de terminar, se muestra el abanico normal.
  const apilada = !abierta && cartas.length === CARTAS_OJEO
  // Una vez ojeada, queda ojeada (aunque después se la vuelva a tapar). La de adelante se ve entera.
  const [ojeadas, setOjeadas] = useState<boolean[]>(() => cartas.map((_, i) => i === 0))
  const ojeadasRef = useRef(ojeadas)

  // El arrastre no pasa por React: posiciones en una ref y transform directo al elemento.
  const posiciones = useRef(posicionesIniciales(cartas.length))
  const envolturas = useRef<(HTMLDivElement | null)[]>([])
  const arrastre = useRef<Arrastre | null>(null)
  // La carta que se toca o se arrastra en el abanico sube al frente.
  const [levantada, setLevantada] = useState<number | null>(null)
  const ultimoGesto = useRef(0)
  const timerMantener = useRef<ReturnType<typeof setTimeout> | null>(null)
  // La carta que se está manteniendo apretada, y la que acaba de hacer su seña (un saltito).
  const [apretada, setApretada] = useState<number | null>(null)
  const [mantenida, setMantenida] = useState<number | null>(null)
  const rectsAntes = useRef<(DOMRect | null)[] | null>(null)

  const abrir = useCallback(() => {
    if (!apilada) return
    // Para animar el paso a abanico: dónde está cada carta antes de acomodarse (FLIP).
    rectsAntes.current = envolturas.current.map((el) => el?.getBoundingClientRect() ?? null)
    arrastre.current = null
    setAbierta(true)
    onAbrir?.()
  }, [apilada, onAbrir])

  useLayoutEffect(() => {
    if (apilada) return
    const antes = rectsAntes.current
    rectsAntes.current = null
    const animar = !!antes && !sinMovimiento()
    envolturas.current.forEach((el, i) => {
      if (!el) return
      el.style.transform = ''
      const a = antes?.[i]
      if (!animar || !a) return
      const d = el.getBoundingClientRect()
      const [dx, dy] = [a.left - d.left, a.top - d.top]
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
      el.style.transition = 'none'
      el.style.transform = `translate(${dx}px, ${dy}px)`
      void el.offsetWidth // fuerza el cálculo antes de soltarla hacia su lugar
      el.style.transition = ''
      el.style.transform = ''
    })
  }, [apilada])

  // Ojeadas las tres, la mano se abre sola un momento después.
  const todas = ojeadas.every(Boolean)
  useEffect(() => {
    if (!apilada || !todas) return
    const t = setTimeout(abrir, ESPERA_ABRIR_MS)
    return () => clearTimeout(t)
  }, [apilada, todas, abrir])

  // Mantener apretada: la carta se marca "apretando" (el CSS dibuja el progreso) y al cumplirse
  // el tiempo hace la seña, con un golpecito. Moverla o soltarla antes lo corta.
  const cortarMantener = () => {
    if (timerMantener.current) clearTimeout(timerMantener.current)
    timerMantener.current = null
    setApretada(null)
  }
  useEffect(() => () => clearTimeout(timerMantener.current ?? undefined), [])
  useEffect(() => {
    if (mantenida === null) return
    const t = setTimeout(() => setMantenida(null), 600)
    return () => clearTimeout(t)
  }, [mantenida])

  const empezarMantener = (i: number) => {
    const c = cartas[i]
    if (!c || !alMantener) return
    cortarMantener()
    setApretada(i)
    timerMantener.current = setTimeout(() => {
      timerMantener.current = null
      setApretada(null)
      const a = arrastre.current
      if (!a || a.i !== i || a.movio) return
      a.mantuvo = true
      setMantenida(i)
      navigator.vibrate?.(VIBRACION_MANTENER_MS)
      alMantener(c)
    }, MANTENER_MS)
  }

  const aplicar = (pos: number[]) => {
    pos.forEach((y, i) => {
      const el = envolturas.current[i]
      if (el) el.style.transform = y ? `translate3d(0, ${y}px, 0)` : ''
    })
  }

  const capturar = (e: PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Sin captura (navegadores viejos o pruebas): igual sigue al dedo mientras esté encima.
    }
  }

  const alBajar = (i: number) => (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    // Con la pila se arrastra para ojear; en el abanico, para jugar (si hay con qué).
    if (!apilada && !alTocar && !alMantener) return
    const alto = e.currentTarget.offsetHeight || e.currentTarget.getBoundingClientRect().height
    arrastre.current = {
      modo: apilada ? 'ojeo' : 'jugar',
      i,
      id: e.pointerId,
      x0: e.clientX,
      y0: e.clientY,
      dx: 0,
      dy: 0,
      desde: posiciones.current[i] ?? 0,
      alto,
      movio: false,
      enTope: false,
      mantuvo: false,
    }
    // En el abanico la captura espera a que haya arrastre: un toque tiene que llegarle a la carta como click.
    if (apilada) capturar(e)
    else {
      setLevantada(i)
      empezarMantener(i)
    }
  }

  const moverOjeo = (a: Arrastre) => {
    // Sigue al dedo 1:1, solo en vertical, dentro de los límites; salvo en el tope de los cortes.
    const y = conTope(a.i, a.desde + a.dy, posiciones.current, a.alto, zonas)
    const pos = moverCarta(a.i, y, posiciones.current, a.alto, zonas)
    posiciones.current = pos
    aplicar(pos)
    const antes = ojeadasRef.current
    const nuevas = antes.map((o, k) => o || estaOjeada(k, pos, a.alto, zonas))
    const tope = enTope(a.i, pos, a.alto, zonas)
    if (nuevas.some((o, k) => o !== antes[k])) {
      ojeadasRef.current = nuevas
      setOjeadas(nuevas)
      navigator.vibrate?.(VIBRACION_MS)
    } else if (tope && !a.enTope) {
      // Un golpecito al llegar a ver solo el palo.
      navigator.vibrate?.(VIBRACION_TOPE_MS)
    }
    a.enTope = tope
  }

  const moverJugada = (a: Arrastre) => {
    const el = envolturas.current[a.i]
    const c = cartas[a.i]
    if (!el || !c) return
    const puede = !!jugable?.(c)
    // La jugable sigue al dedo; la que no se puede jugar apenas se mueve, para que se note que no va.
    const k = puede ? 1 : RESISTENCIA_NO_JUGABLE
    el.classList.add('arrastrando')
    el.classList.toggle('lista-para-jugar', puede && -a.dy >= UMBRAL_JUGAR_PX)
    el.style.transform = `translate3d(${a.dx * k}px, ${a.dy * k}px, 0)`
  }

  const alMover = (e: PointerEvent<HTMLDivElement>) => {
    const a = arrastre.current
    // Ya hizo la seña: se queda quieta hasta que la suelten.
    if (!a || a.id !== e.pointerId || a.mantuvo) return
    a.dx = e.clientX - a.x0
    a.dy = e.clientY - a.y0
    if (!a.movio) {
      const lejos = a.modo === 'ojeo' ? Math.abs(a.dy) : Math.hypot(a.dx, a.dy)
      if (lejos < UMBRAL_ARRASTRE_PX) return
      cortarMantener()
      // Sin jugada posible (solo para señas), moverla no la arrastra.
      if (a.modo === 'jugar' && !alTocar) return
      a.movio = true
      if (a.modo === 'jugar') capturar(e)
    }
    if (a.modo === 'ojeo') moverOjeo(a)
    else moverJugada(a)
  }

  const soltarJugada = (a: Arrastre, e: PointerEvent<HTMLDivElement>) => {
    const el = envolturas.current[a.i]
    el?.classList.remove('arrastrando', 'lista-para-jugar')
    if (!a.movio) return
    const c = cartas[a.i]
    if (c && e.type === 'pointerup' && jugable?.(c) && -a.dy >= UMBRAL_JUGAR_PX) {
      // Se juega: queda donde se soltó hasta que la partida la saque de la mano.
      // Si por algo sigue ahí (la jugada no se aceptó), al rato vuelve a su lugar.
      alTocar?.(c)
      if (el)
        setTimeout(() => {
          if (el.isConnected) el.style.transform = ''
        }, 1500)
      return
    }
    // No llegó (o no se puede jugar): vuelve a su lugar con la transición del CSS.
    if (el) el.style.transform = ''
  }

  const alSoltar = (e: PointerEvent<HTMLDivElement>) => {
    const a = arrastre.current
    if (!a || a.id !== e.pointerId) return
    arrastre.current = null
    if (a.modo === 'jugar') {
      cortarMantener()
      setLevantada(null)
      // Si hizo la seña, el click que sigue no juega la carta.
      if (a.mantuvo) {
        ultimoGesto.current = Date.now()
        return
      }
      // Solo se descarta el click que sigue a un arrastre: un toque juega la carta como siempre.
      if (a.movio) ultimoGesto.current = Date.now()
      soltarJugada(a, e)
      return
    }
    ultimoGesto.current = Date.now()
    // Un toque (sin arrastre) en su turno abre el abanico para poder jugar.
    if (!a.movio && e.type === 'pointerup' && abrirAlTocar) abrir()
  }

  const n = cartas.length
  const estilo = { '--franja': zonas.indice.hasta, '--n': n } as CSSProperties
  return (
    <div
      className={['mano-ojeable', apilada ? 'mano-apilada' : 'mano-abanico', className].filter(Boolean).join(' ')}
      style={estilo}
      // El click que sigue a un arrastre, o a un toque sobre la pila, no juega la carta.
      onClickCapture={(e) => {
        if (Date.now() - ultimoGesto.current < 400) {
          e.preventDefault()
          e.stopPropagation()
        }
      }}
    >
      {cartas.map((c, i) => (
        <div
          key={`${c.numero}-${c.palo}`}
          ref={(el) => {
            envolturas.current[i] = el
          }}
          className={[
            'ojeo-carta',
            apilada && !ojeadas[i] && 'tapada',
            !apilada && levantada === i && 'levantada',
            !apilada && apretada === i && 'apretando',
            !apilada && mantenida === i && 'mantenida',
          ]
            .filter(Boolean)
            .join(' ')}
          style={apilada ? { zIndex: n - i } : lugarEnAbanico(i, n)}
          onPointerDown={alBajar(i)}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
          // Mantener apretado en el celular no abre el menú del navegador.
          onContextMenu={alMantener && !apilada ? (e) => e.preventDefault() : undefined}
        >
          <motion.div
            className="mano-reparto"
            initial={reparto ? { y: -90, scale: 0.7, opacity: 0 } : false}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: i * 0.08 }}
          >
            <Carta
              carta={c}
              tam="grande"
              jugable={jugable?.(c)}
              // Si la estrella se puede tocar, la dibuja el botón de abajo y no la carta.
              resaltada={!alTocarEstrella && resaltada?.(c)}
              alTocar={alTocar ? () => alTocar(c) : undefined}
            />
            {alTocarEstrella && resaltada?.(c) && (
              <button
                type="button"
                className="estrella-ayuda"
                aria-label={`Por qué está marcado el ${nombreCarta(c)}`}
                // Tocar la estrella no arrastra, no ojea ni hace la seña de la carta.
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation()
                  alTocarEstrella(c, e.currentTarget)
                }}
              >
                ★
              </button>
            )}
          </motion.div>
        </div>
      ))}
      {apilada && (
        <>
          <span className="ojeo-ayuda" aria-hidden="true">
            Deslizá
            <br />
            para ojear ↓
          </span>
          <button type="button" className="ojeo-ver-todas" onClick={abrir}>
            Ver todas
          </button>
        </>
      )}
    </div>
  )
}
