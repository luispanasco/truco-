import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { Nubes } from './Nubes'

/** Un renglón de la presentación: un lugar (un nivel) o un barrio. */
export interface LugarPresentado {
  nombre: string
  resumen: string
}

/**
 * Al llegar a un departamento (o a un barrio) desde el mapa: se abren las nubes y aparece con su
 * presentación y sus lugares (o sus barrios), de a uno, cada uno con lo que es. "Ver el mapa" (o
 * "Saltar") pasa al mapa.
 */
export function PresentacionDepartamento({
  nombre,
  presentacion,
  lugares,
  departamento,
  barrio,
  alTerminar,
}: {
  nombre: string
  presentacion: string
  lugares: readonly LugarPresentado[]
  /** Para el fondo. */
  departamento: string
  /** Para el fondo del barrio (el de su primer nivel). */
  barrio?: string
  alTerminar: () => void
}) {
  const sinMovimiento = useReducedMotion() ?? false
  const [nubes, setNubes] = useState(true)
  const entra = (demora: number) =>
    sinMovimiento
      ? {}
      : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay: demora, duration: 0.35 } }
  return (
    <div
      className="presentacion-departamento"
      data-fondo={departamento}
      {...(barrio ? { 'data-barrio': barrio, 'data-nivel': 1 } : {})}
      role="dialog"
      aria-label={`Llegaste a ${nombre}`}
    >
      <button type="button" className="historia-saltar" onClick={alTerminar}>
        Saltar <span aria-hidden="true">›</span>
      </button>
      <motion.h1 {...entra(0.6)}>{nombre}</motion.h1>
      <motion.p className="presentacion-texto" {...entra(0.9)}>
        {presentacion}
      </motion.p>
      <ol className="presentacion-lugares">
        {lugares.map((l, i) => (
          <motion.li key={l.nombre} {...entra(1.3 + i * 0.35)}>
            <span className="presentacion-numero" aria-hidden="true">
              {i + 1}
            </span>
            <span>
              <strong>{l.nombre}</strong>
              <small>{l.resumen}</small>
            </span>
          </motion.li>
        ))}
      </ol>
      <motion.div className="presentacion-pie" {...entra(1.4 + lugares.length * 0.35)}>
        <button type="button" className="boton boton-grande" onClick={alTerminar}>
          Ver el mapa
        </button>
      </motion.div>
      {nubes && <Nubes modo="abrir" alTerminar={() => setNubes(false)} />}
    </div>
  )
}
