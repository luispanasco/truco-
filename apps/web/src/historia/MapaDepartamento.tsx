import { useEffect, useId, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { DEPARTAMENTOS, type IdDepartamento } from '@truco/shared'
import { MAPA_URUGUAY, proyectar } from './geografia'
import type { MapaBarrio } from './mapasBarrios'

/** Un punto del mapa: un nivel (su lugar) o un barrio (su nombre). */
interface Punto {
  lugar: string
  donde: readonly [number, number]
}

/** El mapa de fondo de un barrio (OpenStreetMap): la imagen y dónde cae en el mundo. */
export interface FondoDeMapa extends MapaBarrio {
  imagen: string
}

/** El punto en píxeles del mapa de fondo (Web Mercator, como las teselas de OpenStreetMap). */
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

/**
 * El mapa de un departamento: su contorno (con los vecinos apagados alrededor), un punto por nivel
 * (o por barrio) donde queda su lugar y el camino que los une en orden, punteado: dorado en los
 * tramos ya ganados y más claro en los que faltan. Cada punto se toca para elegirlo.
 *
 * Con `fondo` (el mapa de un barrio, de OpenStreetMap), en vez del contorno va ese mapa y los puntos
 * se ubican con su proyección. Con `fotos` (una lista por punto), cada punto es un redondel con esas
 * fotos pasando.
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
  let vista: string
  let lado: number
  let proyeccion: (donde: readonly [number, number]) => [number, number]
  if (fondo) {
    vista = `0 0 ${fondo.ancho} ${fondo.alto}`
    lado = Math.max(fondo.ancho, fondo.alto) * 0.62
    proyeccion = (donde) => enElMapa(donde, fondo)
  } else {
    const [x, y, w, h] = MAPA_URUGUAY[departamento].caja
    lado = Math.max(w, h)
    const margen = lado * 0.14
    vista = `${x - margen} ${y - margen} ${w + margen * 2} ${h + margen * 2}`
    proyeccion = proyectar
  }
  // Con fotos, los redondeles son más grandes (se tienen que ver).
  const radio = lado * (fotos ? 0.075 : 0.045)
  const puntos = puntosDe(niveles, radio * 2.4, proyeccion)
  const tramos = puntos.slice(1).map((p, i) => ({ desde: puntos[i]!, hasta: p, hecho: ganados.includes(i + 1) }))
  return (
    <figure className={`mapa-departamento${fondo ? ' con-fondo' : ''}`}>
      <svg className="mapa-departamento-svg" viewBox={vista} role="group" aria-label={fondo ? 'Mapa del barrio' : 'Mapa del departamento'}>
        {fondo ? (
          <image href={fondo.imagen} x={0} y={0} width={fondo.ancho} height={fondo.alto} className="mapa-fondo" aria-hidden="true" />
        ) : (
          <>
            {/* Los vecinos, apagados, para ubicarse. */}
            {DEPARTAMENTOS.filter((d) => d.id !== departamento).map((d) => (
              <path key={d.id} className="mapa-vecino" d={MAPA_URUGUAY[d.id].d} />
            ))}
            <path className="mapa-este" d={MAPA_URUGUAY[departamento].d} style={{ strokeWidth: lado * 0.008 }} />
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
              onClick={() => alElegir(n)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  alElegir(n)
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
      </svg>
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
