import { motion, useReducedMotion } from 'motion/react'
import { DEPARTAMENTOS, type IdDepartamento, type NivelHistoria } from '@truco/shared'
import { MAPA_URUGUAY, proyectar } from './geografia'

/**
 * Dónde va cada nivel en el plano: su lugar proyectado. Los que quedan casi encima de otro (en una
 * misma ciudad) se separan un poco, así se puede tocar cada uno.
 */
function puntosDe(niveles: readonly NivelHistoria[], minimo: number): [number, number][] {
  const puntos = niveles.map((n) => proyectar(n.donde))
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

/**
 * El mapa de un departamento: su contorno (con los vecinos apagados alrededor), un punto por nivel
 * donde queda su lugar y el camino que los une en orden, punteado: dorado en los tramos ya ganados
 * y más claro en los que faltan. Cada punto se toca para elegir el nivel.
 */
export function MapaDepartamento({
  departamento,
  niveles,
  ganados,
  abiertos,
  elegido,
  alElegir,
}: {
  departamento: IdDepartamento
  niveles: readonly NivelHistoria[]
  ganados: readonly number[]
  /** Los niveles que se pueden jugar (desde 1). */
  abiertos: readonly number[]
  elegido: number
  alElegir: (n: number) => void
}) {
  const sinMovimiento = useReducedMotion() ?? false
  const [x, y, w, h] = MAPA_URUGUAY[departamento].caja
  const lado = Math.max(w, h)
  const margen = lado * 0.14
  const vista = `${x - margen} ${y - margen} ${w + margen * 2} ${h + margen * 2}`
  const radio = lado * 0.045
  const puntos = puntosDe(niveles, radio * 2.6)
  const tramos = puntos.slice(1).map((p, i) => ({ desde: puntos[i]!, hasta: p, hecho: ganados.includes(i + 1) }))
  return (
    <svg className="mapa-departamento-svg" viewBox={vista} role="group" aria-label="Mapa del departamento">
      {/* Los vecinos, apagados, para ubicarse. */}
      {DEPARTAMENTOS.filter((d) => d.id !== departamento).map((d) => (
        <path key={d.id} className="mapa-vecino" d={MAPA_URUGUAY[d.id].d} />
      ))}
      <path className="mapa-este" d={MAPA_URUGUAY[departamento].d} style={{ strokeWidth: lado * 0.008 }} />
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
        return (
          <motion.g
            key={n}
            className={`mapa-nivel${ganado ? ' ganado' : ''}${abierto ? '' : ' cerrado'}${n === elegido ? ' elegido' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={`Nivel ${n} · ${niveles[i]!.lugar}`}
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
            <circle cx={px} cy={py} r={radio} style={{ strokeWidth: radio * 0.18 }} />
            <text x={px} y={py} style={{ fontSize: radio * 1.05 }} dominantBaseline="central" textAnchor="middle" aria-hidden="true">
              {ganado ? '✓' : abierto ? n : '🔒'}
            </text>
          </motion.g>
        )
      })}
    </svg>
  )
}
