import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import {
  DEPARTAMENTOS,
  departamentoAbierto,
  departamentoCompleto,
  departamentoPublicado,
  departamentoSiguiente,
  HISTORIAS,
  nivelesDelDepartamento,
  nivelesGanados,
  type IdDepartamento,
  type ProgresoHistoria,
  VECINOS,
} from '@truco/shared'
import { ALTO_MAPA, ANCHO_MAPA, MAPA_URUGUAY } from './geografia'
import { Nubes } from './Nubes'

/** Dónde va el nombre de un departamento: el centro, salvo los chicos, que lo llevan al costado. */
const ETIQUETA: Partial<Record<IdDepartamento, readonly [number, number]>> = {
  montevideo: [0, 34],
  canelones: [10, -6],
}

const VISTA = `0 0 ${ANCHO_MAPA} ${ALTO_MAPA}`

/** La vista que encuadra un departamento (para el zoom antes de entrar). */
function vistaDe(id: IdDepartamento): string {
  const [x, y, w, h] = MAPA_URUGUAY[id].caja
  const lado = Math.max(w, h) * 1.3
  return `${x + w / 2 - lado / 2} ${y + h / 2 - lado / 2} ${lado} ${lado}`
}

/**
 * El mapa de Uruguay del modo historia: cada departamento con su estado (completo, abierto o
 * cerrado; el que sigue, latiendo). Al tocar uno abierto, el mapa se acerca, entran las nubes y
 * se pasa al departamento. Con `desde` (al volver de la despedida de un departamento), se marca la
 * ruta de ahí a cada vecino.
 */
export function MapaUruguay({
  progreso,
  todoAbierto,
  alElegir,
  desde,
}: {
  progreso: ProgresoHistoria
  todoAbierto: boolean
  desde?: IdDepartamento
  alElegir: (id: IdDepartamento) => void
}) {
  const sinMovimiento = useReducedMotion() ?? false
  const [elegido, setElegido] = useState<IdDepartamento | null>(null)
  const siguiente = departamentoSiguiente(progreso, todoAbierto)
  const elegir = (id: IdDepartamento) => {
    if (elegido) return
    setElegido(id)
  }
  return (
    <div className="mapa-uruguay">
      <motion.svg
        viewBox={VISTA}
        initial={false}
        animate={{ viewBox: elegido ? vistaDe(elegido) : VISTA }}
        transition={{ duration: sinMovimiento ? 0 : 1.1, ease: 'easeInOut' }}
        role="group"
        aria-label="Mapa de Uruguay"
      >
        {DEPARTAMENTOS.map((d) => {
          const ganados = nivelesGanados(progreso, d.id)
          const historia = HISTORIAS[d.id]
          const niveles = historia ? nivelesDelDepartamento(historia) : 0
          const completo = departamentoCompleto(progreso, d.id)
          const abierto = departamentoAbierto(progreso, d.id, todoAbierto)
          const estado = completo ? 'completo' : abierto ? 'abierto' : 'cerrado'
          return (
            <g
              key={d.id}
              className={`mapa-departamento ${estado}${d.id === siguiente ? ' siguiente' : ''}${d.id === elegido ? ' elegido' : ''}`}
              role="button"
              tabIndex={abierto ? 0 : -1}
              aria-disabled={!abierto || undefined}
              aria-label={`${d.nombre} · ${abierto ? `${ganados} de ${niveles} niveles` : departamentoPublicado(d.id) ? 'cerrado: ganá la mitad de un departamento vecino' : 'próximamente'}`}
              onClick={() => abierto && elegir(d.id)}
              onKeyDown={(e) => {
                if (abierto && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault()
                  elegir(d.id)
                }
              }}
            >
              <path d={MAPA_URUGUAY[d.id].d} />
            </g>
          )
        })}
        {/* La ruta desde el departamento que completaste a sus vecinos: una curva punteada que se dibuja. */}
        {desde &&
          !elegido &&
          VECINOS[desde].map((v, i) => {
            const [x1, y1] = MAPA_URUGUAY[desde].centro
            const [x2, y2] = MAPA_URUGUAY[v].centro
            // El punto de control, corrido a un costado de la recta: la ruta hace una curva suave.
            const cx = (x1 + x2) / 2 - (y2 - y1) * 0.2
            const cy = (y1 + y2) / 2 + (x2 - x1) * 0.2
            return (
              <motion.path
                key={v}
                className={`mapa-ruta${departamentoAbierto(progreso, v, todoAbierto) ? ' abierta' : ''}`}
                d={`M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`}
                initial={sinMovimiento ? false : { pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 1 + i * 0.3, duration: 0.9, ease: 'easeInOut' }}
                aria-hidden="true"
              />
            )
          })}
        {/* Los nombres, arriba de todos los departamentos (si no, el de al lado los tapa). */}
        {DEPARTAMENTOS.map((d) => {
          const [cx, cy] = MAPA_URUGUAY[d.id].centro
          const [dx, dy] = ETIQUETA[d.id] ?? [0, 0]
          const completo = departamentoCompleto(progreso, d.id)
          const abierto = departamentoAbierto(progreso, d.id, todoAbierto)
          return (
            <text key={d.id} className="mapa-nombre" x={cx + dx} y={cy + dy} aria-hidden="true">
              {completo ? '✓ ' : abierto ? '' : '🔒 '}
              {d.nombre}
            </text>
          )
        })}
      </motion.svg>
      {elegido && <Nubes modo="cerrar" alTerminar={() => alElegir(elegido)} />}
    </div>
  )
}
