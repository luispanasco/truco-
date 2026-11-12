import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { DEPARTAMENTOS, type IdDepartamento } from '@truco/shared'
import { MAPA_URUGUAY, proyectar } from './geografia'
import type { MapaBarrio } from './mapasBarrios'

/** Un punto del mapa: un nivel (su lugar) o un barrio (su nombre). */
interface Punto {
  lugar: string
  donde: readonly [number, number]
}

/** El mapa de fondo de un barrio (dibujado con OpenStreetMap): el SVG y dónde cae en el mundo. */
export interface FondoDeMapa extends MapaBarrio {
  imagen: string
}

/** El punto en píxeles del mapa de fondo (Web Mercator, como el dibujo del barrio). */
function enElMapa([lat, lon]: readonly [number, number], m: MapaBarrio): [number, number] {
  const n = 256 * 2 ** m.z
  const s = Math.sin((lat * Math.PI) / 180)
  return [((lon + 180) / 360) * n - m.x, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n - m.y]
}

/**
 * Dónde va cada punto en el plano: su lugar proyectado. Los que quedan casi encima de otro (en una
 * misma ciudad) se separan un poco, así se puede tocar cada uno.
 */
function puntosDe(niveles: readonly Punto[], minimo: number, proyeccion: (donde: readonly [number, number]) => [number, number]): [number, number][] {
  const puntos = niveles.map((n) => proyeccion(n.donde))
  for (let vuelta = 0; vuelta < 40; vuelta++) {
    let movio = false
    for (let i = 0; i < puntos.length; i++) {
      for (let j = i + 1; j < puntos.length; j++) {
        const [ax, ay] = puntos[i]!
        const [bx, by] = puntos[j]!
        const dist = Math.hypot(bx - ax, by - ay)
        if (dist >= minimo) continue
        // Si están en el mismo punto, se abren en una dirección que depende del par.
        const ang = dist > 0.01 ? Math.atan2(by - ay, bx - ax) : (i + j) * 2.4
        const empuje = (minimo - dist) / 2
        puntos[i] = [ax - Math.cos(ang) * empuje, ay - Math.sin(ang) * empuje]
        puntos[j] = [bx + Math.cos(ang) * empuje, by + Math.sin(ang) * empuje]
        movio = true
      }
    }
    if (!movio) break
  }
  return puntos
}

/** Cada cuánto cambia la foto de un redondel (cada uno arranca en otro momento). */
const CADA_MS = 3200

/** Las fotos de un barrio en un redondel, de a una, con un fundido. Quieto, la primera. */
function FotosQuePasan({ fotos, cx, cy, r, demora, quieto }: { fotos: readonly string[]; cx: number; cy: number; r: number; demora: number; quieto: boolean }) {
  const recorte = useId()
  const [i, setI] = useState(0)
  useEffect(() => {
    if (quieto || fotos.length < 2) return
    let intervalo: ReturnType<typeof setInterval> | undefined
    const arranque = setTimeout(() => {
      setI((x) => x + 1)
      intervalo = setInterval(() => setI((x) => x + 1), CADA_MS)
    }, demora)
    return () => {
      clearTimeout(arranque)
      clearInterval(intervalo)
    }
  }, [quieto, fotos.length, demora])
  return (
    <g aria-hidden="true">
      <clipPath id={recorte}>
        <circle cx={cx} cy={cy} r={r} />
      </clipPath>
      {fotos.map((f, k) => (
        <image
          key={f}
          href={f}
          x={cx - r}
          y={cy - r}
          width={r * 2}
          height={r * 2}
          clipPath={`url(#${recorte})`}
          preserveAspectRatio="xMidYMid slice"
          className="mapa-foto"
          style={{ opacity: k === i % fotos.length ? 1 : 0 }}
        />
      ))}
    </g>
  )
}

/** El dibujo del barrio (el SVG de scripts/mapas-barrios.py), adentro del mapa: así sus líneas no engordan con el zoom. */
function DibujoDelBarrio({ fondo }: { fondo: FondoDeMapa }) {
  const [contenido, setContenido] = useState<string | null>(null)
  useEffect(() => {
    let vigente = true
    fetch(fondo.imagen)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((t) => vigente && setContenido(t.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')))
      .catch(() => {})
    return () => {
      vigente = false
    }
  }, [fondo.imagen])
  return contenido ? (
    <g className="mapa-fondo" aria-hidden="true" dangerouslySetInnerHTML={{ __html: contenido }} />
  ) : (
    <rect width={fondo.ancho} height={fondo.alto} className="mapa-fondo-vacio" />
  )
}

/** Dónde se mira el mapa: el centro y cuánto se acercó (1 es todo el barrio). */
interface Vista {
  cx: number
  cy: number
  escala: number
}

const ESCALA_MAXIMA = 6

/** Lo que se ve con una vista: el rectángulo del mapa, sin salirse de él. */
function ventana(v: Vista, ancho: number, alto: number) {
  const w = ancho / v.escala
  const h = alto / v.escala
  const x = Math.min(Math.max(v.cx - w / 2, 0), ancho - w)
  const y = Math.min(Math.max(v.cy - h / 2, 0), alto - h)
  return { x, y, w, h }
}

/**
 * La vista del mapa de un barrio y cómo se mueve: con un dedo (o el mouse) se arrastra, con dos (o
 * la rueda) se acerca o se aleja, y `irA` lleva a un lugar con un viaje corto. Devuelve si el último
 * toque fue un arrastre (para no elegir el punto que quedó abajo del dedo).
 */
function useVistaMovil(fondo: FondoDeMapa | undefined, svg: React.RefObject<SVGSVGElement | null>, quieto: boolean) {
  const ancho = fondo?.ancho ?? 1
  const alto = fondo?.alto ?? 1
  const inicial: Vista = { cx: ancho / 2, cy: alto / 2, escala: 1 }
  const [vista, setVista] = useState<Vista>(inicial)
  const actual = useRef(vista)
  actual.current = vista
  const viaje = useRef(0)
  const arrastro = useRef(false)

  const fijar = useCallback(
    (v: Vista) => {
      const escala = Math.min(Math.max(v.escala, 1), ESCALA_MAXIMA)
      const { x, y, w, h } = ventana({ ...v, escala }, ancho, alto)
      setVista({ cx: x + w / 2, cy: y + h / 2, escala })
    },
    [ancho, alto],
  )

  const irA = useCallback(
    (destino: Vista) => {
      cancelAnimationFrame(viaje.current)
      if (quieto) return fijar(destino)
      const desde = actual.current
      const inicio = performance.now()
      const paso = (t: number) => {
        const k = Math.min((t - inicio) / 420, 1)
        const e = 1 - (1 - k) ** 3
        fijar({
          cx: desde.cx + (destino.cx - desde.cx) * e,
          cy: desde.cy + (destino.cy - desde.cy) * e,
          escala: desde.escala * (destino.escala / desde.escala) ** e,
        })
        if (k < 1) viaje.current = requestAnimationFrame(paso)
      }
      viaje.current = requestAnimationFrame(paso)
    },
    [fijar, quieto],
  )

  /** Acerca o aleja `factor` veces dejando quieto el punto de la pantalla (x, y) en píxeles del svg. */
  const zoomEn = useCallback(
    (factor: number, px?: number, py?: number) => {
      const el = svg.current
      const v = actual.current
      const { x, y, w, h } = ventana(v, ancho, alto)
      const r = el?.getBoundingClientRect()
      const mx = r && px !== undefined ? x + ((px - r.left) / r.width) * w : v.cx
      const my = r && py !== undefined ? y + ((py - r.top) / r.height) * h : v.cy
      const escala = Math.min(Math.max(v.escala * factor, 1), ESCALA_MAXIMA)
      const f = v.escala / escala
      fijar({ cx: mx + (v.cx - mx) * f, cy: my + (v.cy - my) * f, escala })
    },
    [ancho, alto, fijar, svg],
  )

  // Rueda y gestos (solo con mapa de fondo). La rueda va con un listener no pasivo, para poder frenar el scroll.
  const hayFondo = fondo !== undefined
  useEffect(() => {
    const el = svg.current
    if (!hayFondo || !el) return
    const rueda = (e: WheelEvent) => {
      e.preventDefault()
      cancelAnimationFrame(viaje.current)
      zoomEn(e.deltaY < 0 ? 1.18 : 1 / 1.18, e.clientX, e.clientY)
    }
    const dedos = new Map<number, { x: number; y: number }>()
    let inicio = { x: 0, y: 0 }
    const abajo = (e: PointerEvent) => {
      cancelAnimationFrame(viaje.current)
      dedos.set(e.pointerId, { x: e.clientX, y: e.clientY })
      if (dedos.size === 1) {
        arrastro.current = false
        inicio = { x: e.clientX, y: e.clientY }
      }
      window.addEventListener('pointermove', mueve)
      window.addEventListener('pointerup', arriba)
      window.addEventListener('pointercancel', arriba)
    }
    const mueve = (e: PointerEvent) => {
      const antes = dedos.get(e.pointerId)
      if (!antes) return
      const r = el.getBoundingClientRect()
      if (dedos.size === 1) {
        if (Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) > 6) arrastro.current = true
        if (!arrastro.current) return
        const v = actual.current
        const { w, h } = ventana(v, ancho, alto)
        fijar({ ...v, cx: v.cx - ((e.clientX - antes.x) / r.width) * w, cy: v.cy - ((e.clientY - antes.y) / r.height) * h })
      } else if (dedos.size === 2) {
        arrastro.current = true
        const [a, b] = [...dedos.entries()].map(([id, p]) => (id === e.pointerId ? { x: e.clientX, y: e.clientY } : p))
        const otro = [...dedos.entries()].find(([id]) => id !== e.pointerId)![1]
        const antesDist = Math.hypot(antes.x - otro.x, antes.y - otro.y)
        const ahoraDist = Math.hypot(a!.x - b!.x, a!.y - b!.y)
        if (antesDist > 0) zoomEn(ahoraDist / antesDist, (a!.x + b!.x) / 2, (a!.y + b!.y) / 2)
      }
      dedos.set(e.pointerId, { x: e.clientX, y: e.clientY })
    }
    const arriba = (e: PointerEvent) => {
      dedos.delete(e.pointerId)
      if (dedos.size === 0) {
        window.removeEventListener('pointermove', mueve)
        window.removeEventListener('pointerup', arriba)
        window.removeEventListener('pointercancel', arriba)
      }
    }
    el.addEventListener('wheel', rueda, { passive: false })
    el.addEventListener('pointerdown', abajo)
    return () => {
      el.removeEventListener('wheel', rueda)
      el.removeEventListener('pointerdown', abajo)
      window.removeEventListener('pointermove', mueve)
      window.removeEventListener('pointerup', arriba)
      window.removeEventListener('pointercancel', arriba)
      cancelAnimationFrame(viaje.current)
    }
  }, [hayFondo, svg, ancho, alto, fijar, zoomEn])

  return { vista, irA, zoomEn, arrastro, verTodo: () => irA(inicial) }
}

/**
 * El mapa de un departamento: su contorno (con los vecinos apagados alrededor), un punto por nivel
 * (o por barrio) donde queda su lugar y el camino que los une en orden, punteado: dorado en los
 * tramos ya ganados y más claro en los que faltan. Cada punto se toca para elegirlo.
 *
 * Con `fondo` (el mapa de un barrio, dibujado con OpenStreetMap), en vez del contorno va ese dibujo,
 * los puntos se ubican con su proyección y el mapa se mueve: se arrastra, se acerca y se aleja (con
 * los dedos, la rueda o los botones), al tocar un nivel se acerca a él y, si el elegido queda fuera
 * de lo que se ve, una flecha en el borde apunta hacia él. Con `fotos` (una lista por punto), cada
 * punto es un redondel con esas fotos pasando.
 */
export function MapaDepartamento({
  departamento,
  niveles,
  ganados,
  abiertos,
  elegido,
  alElegir,
  etiqueta = 'Nivel',
  fondo,
  fotos,
}: {
  departamento: IdDepartamento
  niveles: readonly Punto[]
  /** Los ganados (desde 1): los niveles, o los barrios completos. */
  ganados: readonly number[]
  /** Los que se pueden jugar (desde 1). */
  abiertos: readonly number[]
  elegido: number
  alElegir: (n: number) => void
  /** Cómo se llama cada punto para el lector de pantalla ("Nivel" o "Barrio"). */
  etiqueta?: string
  fondo?: FondoDeMapa
  fotos?: readonly (readonly string[])[]
}) {
  const sinMovimiento = useReducedMotion() ?? false
  const svg = useRef<SVGSVGElement>(null)
  const movil = useVistaMovil(fondo, svg, sinMovimiento)
  let vista: string
  let radio: number
  let proyeccion: (donde: readonly [number, number]) => [number, number]
  let ventanaActual: { x: number; y: number; w: number; h: number } | null = null
  let trazoContorno = 0
  if (fondo) {
    ventanaActual = ventana(movil.vista, fondo.ancho, fondo.alto)
    vista = `${ventanaActual.x} ${ventanaActual.y} ${ventanaActual.w} ${ventanaActual.h}`
    // Los puntos se ven siempre del mismo tamaño: con zoom, más chicos en el mapa.
    radio = (Math.max(fondo.ancho, fondo.alto) * 0.028) / movil.vista.escala
    proyeccion = (donde) => enElMapa(donde, fondo)
  } else {
    const [x, y, w, h] = MAPA_URUGUAY[departamento].caja
    const lado = Math.max(w, h)
    const margen = lado * 0.14
    vista = `${x - margen} ${y - margen} ${w + margen * 2} ${h + margen * 2}`
    // Con fotos, los redondeles son más grandes (se tienen que ver).
    radio = lado * (fotos ? 0.075 : 0.045)
    trazoContorno = lado * 0.008
    proyeccion = proyectar
  }
  const puntos = puntosDe(niveles, radio * 2.4, proyeccion)
  const tramos = puntos.slice(1).map((p, i) => ({ desde: puntos[i]!, hasta: p, hecho: ganados.includes(i + 1) }))
  const elegir = (n: number) => {
    // Lo que fue arrastrar el mapa no elige el punto que quedó abajo del dedo.
    if (movil.arrastro.current) return
    alElegir(n)
    const p = puntos[n - 1]
    if (fondo && p) movil.irA({ cx: p[0], cy: p[1], escala: Math.max(movil.vista.escala, 2.4) })
  }

  // La flecha: si el elegido quedó fuera de lo que se ve, en el borde y apuntando hacia él.
  let flecha: { x: number; y: number; angulo: number } | null = null
  const objetivo = puntos[elegido - 1]
  if (ventanaActual && objetivo) {
    const { x, y, w, h } = ventanaActual
    const [px, py] = objetivo
    if (px < x || px > x + w || py < y || py > y + h) {
      const cx = x + w / 2
      const cy = y + h / 2
      const dx = px - cx
      const dy = py - cy
      const borde = radio * 1.7
      const t = Math.min((w / 2 - borde) / Math.abs(dx || 1e-9), (h / 2 - borde) / Math.abs(dy || 1e-9))
      flecha = { x: cx + dx * t, y: cy + dy * t, angulo: (Math.atan2(dy, dx) * 180) / Math.PI }
    }
  }

  return (
    <figure className={`mapa-lugar${fondo ? ' con-fondo' : ''}`}>
      <div className="mapa-marco">
        <svg ref={svg} className="mapa-departamento-svg" viewBox={vista} role="group" aria-label={fondo ? 'Mapa del barrio' : 'Mapa del departamento'}>
          {fondo ? (
            <DibujoDelBarrio fondo={fondo} />
          ) : (
            <>
              {/* Los vecinos, apagados, para ubicarse. */}
              {DEPARTAMENTOS.filter((d) => d.id !== departamento).map((d) => (
                <path key={d.id} className="mapa-vecino" d={MAPA_URUGUAY[d.id].d} />
              ))}
              <path className="mapa-este" d={MAPA_URUGUAY[departamento].d} style={{ strokeWidth: trazoContorno }} />
            </>
          )}
          {tramos.map((t, i) => (
            <motion.line
              key={i}
              className={`mapa-camino${t.hecho ? ' hecho' : ''}`}
              x1={t.desde[0]}
              y1={t.desde[1]}
              x2={t.hasta[0]}
              y2={t.hasta[1]}
              // Sin animar el largo (pathLength pisa el punteado): aparece de a un tramo.
              style={{ strokeWidth: radio * 0.28, strokeDasharray: `${radio * 0.05} ${radio * 0.55}` }}
              initial={sinMovimiento ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + i * 0.25, duration: 0.4 }}
            />
          ))}
          {puntos.map(([px, py], i) => {
            const n = i + 1
            const ganado = ganados.includes(n)
            const abierto = abiertos.includes(n)
            const susFotos = fotos?.[i]
            const marca = ganado ? '✓' : abierto ? String(n) : '🔒'
            return (
              <motion.g
                key={n}
                className={`mapa-nivel${ganado ? ' ganado' : ''}${abierto ? '' : ' cerrado'}${n === elegido ? ' elegido' : ''}${susFotos ? ' con-fotos' : ''}`}
                role="button"
                tabIndex={0}
                aria-label={`${etiqueta} ${n} · ${niveles[i]!.lugar}`}
                aria-pressed={n === elegido}
                onClick={() => elegir(n)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    elegir(n)
                  }
                }}
                initial={sinMovimiento ? false : { opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15 + i * 0.25, type: 'spring', stiffness: 300, damping: 18 }}
                style={{ transformOrigin: `${px}px ${py}px`, transformBox: 'view-box' }}
              >
                {susFotos ? (
                  <>
                    <circle cx={px} cy={py} r={radio} className="mapa-foto-fondo" />
                    <FotosQuePasan fotos={susFotos} cx={px} cy={py} r={radio} demora={700 + i * 530} quieto={sinMovimiento} />
                    <circle cx={px} cy={py} r={radio} className="mapa-foto-borde" style={{ strokeWidth: radio * 0.14 }} />
                    {/* La marca (número, ✓ o candado) en un circulito abajo a la derecha. */}
                    <circle cx={px + radio * 0.72} cy={py + radio * 0.72} r={radio * 0.36} style={{ strokeWidth: radio * 0.08 }} />
                    <text x={px + radio * 0.72} y={py + radio * 0.72} style={{ fontSize: radio * 0.42 }} dominantBaseline="central" textAnchor="middle" aria-hidden="true">
                      {marca}
                    </text>
                  </>
                ) : (
                  <>
                    <circle cx={px} cy={py} r={radio} style={{ strokeWidth: radio * 0.18 }} />
                    <text x={px} y={py} style={{ fontSize: radio * 1.05 }} dominantBaseline="central" textAnchor="middle" aria-hidden="true">
                      {marca}
                    </text>
                  </>
                )}
              </motion.g>
            )
          })}
          {flecha && objetivo && (
            <g
              className="mapa-flecha"
              role="button"
              tabIndex={0}
              aria-label={`Ir al nivel ${elegido} · ${niveles[elegido - 1]!.lugar}`}
              onClick={() => movil.irA({ cx: objetivo[0], cy: objetivo[1], escala: movil.vista.escala })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  movil.irA({ cx: objetivo[0], cy: objetivo[1], escala: movil.vista.escala })
                }
              }}
            >
              <g transform={`translate(${flecha.x} ${flecha.y}) rotate(${flecha.angulo})`}>
                <path d={`M ${radio * 1.55} 0 L ${radio * 0.7} ${-radio * 0.62} L ${radio * 0.7} ${radio * 0.62} Z`} />
                <circle r={radio * 0.95} style={{ strokeWidth: radio * 0.16 }} />
              </g>
              <text x={flecha.x} y={flecha.y} style={{ fontSize: radio * 0.95 }} dominantBaseline="central" textAnchor="middle" aria-hidden="true">
                {elegido}
              </text>
            </g>
          )}
        </svg>
        {fondo && (
          <div className="mapa-controles" role="group" aria-label="Zoom del mapa">
            <button type="button" aria-label="Acercar" onClick={() => movil.zoomEn(1.6)} disabled={movil.vista.escala >= ESCALA_MAXIMA}>
              +
            </button>
            <button type="button" aria-label="Alejar" onClick={() => movil.zoomEn(1 / 1.6)} disabled={movil.vista.escala <= 1}>
              −
            </button>
            <button type="button" aria-label="Ver todo el barrio" onClick={movil.verTodo} disabled={movil.vista.escala <= 1}>
              ⤢
            </button>
          </div>
        )}
      </div>
      {fondo && (
        <figcaption className="mapa-creditos">
          ©{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
            colaboradores de OpenStreetMap
          </a>
        </figcaption>
      )}
    </figure>
  )
}
