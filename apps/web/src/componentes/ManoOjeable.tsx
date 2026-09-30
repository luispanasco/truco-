import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { motion } from 'motion/react'
import type { Carta as TCarta } from '@truco/engine'
import { Carta } from './Carta'
import {
  ESPERA_ABRIR_MS,
  estaOjeada,
  moverCarta,
  posicionesIniciales,
  UMBRAL_ARRASTRE_PX,
  VIBRACION_MS,
  ZONA_INDICE,
} from '../ojeo'
import '../estilos-ojeo.css'

/** Cuántas cartas tiene que tener la mano para ojearla (una mano recién repartida). */
const CARTAS_OJEO = 3

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
  alTocar?: (c: TCarta) => void
  /** Animación de reparto al entrar (las cartas bajan escalonadas). */
  reparto?: boolean
  className?: string
}

function sinMovimiento(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

/**
 * La mano del jugador. Si el ojeo está activado y la mano está entera, las cartas llegan
 * apiladas y se descubren arrastrando hacia abajo (ver `ojeo.ts`); cuando están todas ojeadas
 * se abre sola en abanico. Es puramente visual: no manda nada ni cambia la partida.
 * Para empezar un ojeo nuevo en cada mano, montarla con `key` distinta.
 */
export function ManoOjeable({ cartas, ojeoActivado, onAbrir, abrirAlTocar, jugable, resaltada, alTocar, reparto, className }: Props) {
  const [abierta, setAbierta] = useState(() => !ojeoActivado || cartas.length !== CARTAS_OJEO)
  // Si se juega una carta (o cambia la mano) antes de terminar, se muestra el abanico normal.
  const apilada = !abierta && cartas.length === CARTAS_OJEO
  // Una vez ojeada, queda ojeada (aunque después se la vuelva a tapar). La de adelante se ve entera.
  const [ojeadas, setOjeadas] = useState<boolean[]>(() => cartas.map((_, i) => i === 0))
  const ojeadasRef = useRef(ojeadas)

  // El arrastre no pasa por React: posiciones en una ref y transform directo al elemento.
  const posiciones = useRef(posicionesIniciales(cartas.length))
  const envolturas = useRef<(HTMLDivElement | null)[]>([])
  const arrastre = useRef<{ i: number; id: number; y0: number; desde: number; alto: number; movio: boolean } | null>(null)
  const ultimoGesto = useRef(0)
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

  const aplicar = (pos: number[]) => {
    pos.forEach((y, i) => {
      const el = envolturas.current[i]
      if (el) el.style.transform = y ? `translate3d(0, ${y}px, 0)` : ''
    })
  }

  const alBajar = (i: number) => (e: PointerEvent<HTMLDivElement>) => {
    if (!apilada || (e.pointerType === 'mouse' && e.button !== 0)) return
    const alto = e.currentTarget.offsetHeight || e.currentTarget.getBoundingClientRect().height
    arrastre.current = { i, id: e.pointerId, y0: e.clientY, desde: posiciones.current[i]!, alto, movio: false }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Sin captura (navegadores viejos o pruebas): igual sigue al dedo mientras esté encima.
    }
  }

  const alMover = (e: PointerEvent<HTMLDivElement>) => {
    const a = arrastre.current
    if (!a || a.id !== e.pointerId) return
    const dy = e.clientY - a.y0
    if (!a.movio && Math.abs(dy) < UMBRAL_ARRASTRE_PX) return
    a.movio = true
    // Sigue al dedo 1:1, solo en vertical, dentro de los límites.
    const pos = moverCarta(a.i, a.desde + dy, posiciones.current, a.alto)
    posiciones.current = pos
    aplicar(pos)
    const antes = ojeadasRef.current
    const nuevas = antes.map((o, k) => o || estaOjeada(k, pos, a.alto))
    if (nuevas.some((o, k) => o !== antes[k])) {
      ojeadasRef.current = nuevas
      setOjeadas(nuevas)
      navigator.vibrate?.(VIBRACION_MS)
    }
  }

  const alSoltar = (e: PointerEvent<HTMLDivElement>) => {
    const a = arrastre.current
    if (!a || a.id !== e.pointerId) return
    arrastre.current = null
    ultimoGesto.current = Date.now()
    // Un toque (sin arrastre) en su turno abre el abanico para poder jugar.
    if (!a.movio && e.type === 'pointerup' && abrirAlTocar) abrir()
  }

  const n = cartas.length
  const estilo = { '--franja': ZONA_INDICE.hasta, '--n': n } as CSSProperties
  return (
    <div
      className={['mano-ojeable', apilada ? 'mano-apilada' : 'mano-abanico', className].filter(Boolean).join(' ')}
      style={estilo}
      // El click que sigue a un arrastre o a un toque sobre la pila no juega la carta.
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
          className={`ojeo-carta${apilada && !ojeadas[i] ? ' tapada' : ''}`}
          style={apilada ? { zIndex: n - i } : undefined}
          onPointerDown={alBajar(i)}
          onPointerMove={alMover}
          onPointerUp={alSoltar}
          onPointerCancel={alSoltar}
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
              resaltada={resaltada?.(c)}
              alTocar={alTocar ? () => alTocar(c) : undefined}
            />
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
