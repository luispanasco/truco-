import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { codificarAvatar, MAESTRO } from '@truco/shared'
import { Avatar } from '../componentes/Avatar'
import '../estilos-tutorial.css'
import './estilos-recorrido.css'

/** Un paso del recorrido: lo que dice Don Queiroz y qué se ilumina. */
export interface PasoRecorrido {
  texto: ReactNode
  /** Dónde mirar: selectores, el primero que esté. Sin ninguno, el globo va al medio. */
  donde?: string[]
  /** Antes de mostrarlo (mover el menú a otra pantalla, por ejemplo). */
  antes?: () => void
  /** Botones de más, al lado de "Siguiente" (el cierre). */
  extra?: ReactNode
}

interface Caja {
  top: number
  left: number
  width: number
  height: number
}

const MARGEN = 12
const AIRE = 6
/** Lo que tarda el menú en deslizarse a otra pantalla antes de iluminar. */
const ESPERA_MS = 450

function buscar(donde: string[] | undefined): HTMLElement | null {
  for (const s of donde ?? []) {
    const el = document.querySelector<HTMLElement>(s)
    if (el) return el
  }
  return null
}

/** La caja del elemento a la vista (con un poco de aire), recortada a la pantalla; sin tamaño, nada. */
function medir(el: HTMLElement | null): Caja | null {
  if (!el) return null
  const r = el.getBoundingClientRect()
  if (r.width === 0 || r.height === 0) return null
  const ancho = window.innerWidth
  const alto = window.innerHeight
  const top = Math.max(AIRE, r.top - AIRE)
  const left = Math.max(AIRE, r.left - AIRE)
  const bottom = Math.min(alto - AIRE, r.bottom + AIRE)
  const right = Math.min(ancho - AIRE, r.right + AIRE)
  if (bottom <= top || right <= left) return null
  return { top, left, width: right - left, height: bottom - top }
}

const igual = (a: Caja | null, b: Caja | null) =>
  a === b || (!!a && !!b && Math.abs(a.top - b.top) < 1 && Math.abs(a.left - b.left) < 1 && Math.abs(a.width - b.width) < 1 && Math.abs(a.height - b.height) < 1)

/**
 * El recorrido guiado: la pantalla se oscurece, queda iluminado lo que se explica y Don Queiroz
 * lo cuenta en un globo (abajo o arriba, donde haya lugar). Mientras está abierto no se puede
 * tocar lo de atrás. Escape lo salta.
 */
export function Recorrido({
  pasos,
  titulo,
  alTerminar,
  alSaltar,
}: {
  pasos: PasoRecorrido[]
  titulo: string
  /** Al tocar "Siguiente" en el último. */
  alTerminar: () => void
  alSaltar: () => void
}) {
  const quieto = useReducedMotion() ?? false
  const [i, setI] = useState(0)
  const [listo, setListo] = useState(false)
  const [caja, setCaja] = useState<Caja | null>(null)
  const [altoGlobo, setAltoGlobo] = useState(180)
  const globo = useRef<HTMLDivElement>(null)
  const siguiente = useRef<HTMLButtonElement>(null)
  const paso = pasos[i]!
  const ultimo = i === pasos.length - 1

  // Cada paso: lo de antes (mover el menú), un rato para que se acomode, y se trae a la vista.
  useEffect(() => {
    setListo(false)
    pasos[i]!.antes?.()
    const espera = quieto || !pasos[i]!.antes ? 0 : ESPERA_MS
    const t = setTimeout(() => {
      buscar(pasos[i]!.donde)?.scrollIntoView?.({ block: 'center', inline: 'nearest' })
      setListo(true)
    }, espera)
    return () => clearTimeout(t)
    // Los pasos no cambian mientras está abierto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i, quieto])

  // Se sigue al elemento (si se mueve, si gira la pantalla) cuadro a cuadro.
  useEffect(() => {
    if (!listo) return
    let vivo = true
    let ultima: Caja | null = null
    const cuadro = typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (f: () => void) => setTimeout(f, 50) as unknown as number
    const mirar = () => {
      if (!vivo) return
      const nueva = medir(buscar(paso.donde))
      if (!igual(nueva, ultima)) {
        ultima = nueva
        setCaja(nueva)
      }
      cuadro(mirar)
    }
    mirar()
    return () => {
      vivo = false
    }
  }, [listo, paso])

  useLayoutEffect(() => {
    const h = globo.current?.offsetHeight
    if (h && h !== altoGlobo) setAltoGlobo(h)
  })

  useEffect(() => {
    if (listo) siguiente.current?.focus()
  }, [listo, i])

  const avanzar = () => (ultimo ? alTerminar() : setI(i + 1))

  const alTeclado = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      alSaltar()
    } else if (e.key === 'Tab') {
      // El foco queda adentro del globo.
      const botones = [...(globo.current?.querySelectorAll<HTMLElement>('button') ?? [])]
      if (botones.length === 0) return
      const pos = botones.indexOf(document.activeElement as HTMLElement)
      e.preventDefault()
      botones[(pos + (e.shiftKey ? -1 : 1) + botones.length) % botones.length]!.focus()
    }
  }

  // El globo abajo del elemento si entra; si no, arriba; si tampoco, abajo de todo (o al medio sin elemento).
  const alto = typeof window === 'undefined' ? 800 : window.innerHeight
  let estiloGlobo: { top?: number; bottom?: number }
  if (!caja) estiloGlobo = { top: Math.max(MARGEN, (alto - altoGlobo) / 2) }
  else if (caja.top + caja.height + MARGEN + altoGlobo <= alto - MARGEN) estiloGlobo = { top: caja.top + caja.height + MARGEN }
  else if (caja.top - MARGEN - altoGlobo >= MARGEN) estiloGlobo = { top: caja.top - MARGEN - altoGlobo }
  else estiloGlobo = { bottom: MARGEN }
  const abajo = !!caja && estiloGlobo.top !== undefined && estiloGlobo.top > caja.top
  const transicion = quieto ? { duration: 0 } : { type: 'spring' as const, stiffness: 320, damping: 34 }

  return (
    <div className="recorrido" role="dialog" aria-modal="true" aria-label={titulo} onKeyDown={alTeclado}>
      {/* Lo de atrás no se toca mientras dura el recorrido. */}
      <div className="recorrido-tapa" />
      {caja && listo ? (
        <motion.div className="recorrido-luz" aria-hidden="true" initial={false} animate={{ ...caja }} transition={transicion} />
      ) : (
        <div className="recorrido-sombra" aria-hidden="true" />
      )}
      <div
        ref={globo}
        className={`recorrido-globo${caja ? (abajo ? ' abajo' : ' arriba') : ' al-medio'}${listo ? '' : ' oculto'}`}
        style={estiloGlobo}
      >
        <span className="recorrido-cara" aria-hidden="true">
          <Avatar codigo={codificarAvatar(MAESTRO.avatar)} encuadre="cara" />
        </span>
        <motion.div
          key={i}
          className="tutorial-globo recorrido-texto"
          initial={quieto ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18 }}
        >
          <p role="status">{paso.texto}</p>
          {paso.extra && <div className="recorrido-extra">{paso.extra}</div>}
          <div className="recorrido-botones">
            <span className="recorrido-cuenta">
              {i + 1} de {pasos.length}
            </span>
            {!ultimo && (
              <button type="button" className="recorrido-saltar" onClick={alSaltar}>
                Saltar
              </button>
            )}
            <button ref={siguiente} type="button" className="recorrido-siguiente" onClick={avanzar}>
              {ultimo ? '¡A jugar!' : 'Siguiente'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
