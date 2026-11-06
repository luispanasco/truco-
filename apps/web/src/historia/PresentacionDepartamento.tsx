import { useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { HistoriaDepartamento } from '@truco/shared'
import { Nubes } from './Nubes'

/**
 * Al llegar a un departamento desde el mapa: se abren las nubes y aparece el departamento con su
 * presentación y sus lugares, de a uno, cada uno con lo que es. "Ver el mapa" (o "Saltar") pasa al
 * mapa del departamento.
 */
export function PresentacionDepartamento({
  nombre,
  historia,
  alTerminar,
}: {
  nombre: string
  historia: HistoriaDepartamento
  alTerminar: () => void
}) {
  const sinMovimiento = useReducedMotion() ?? false
  const [nubes, setNubes] = useState(true)
  const entra = (demora: number) =>
    sinMovimiento
      ? {}
      : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay: demora, duration: 0.35 } }
  return (
    <div className="presentacion-departamento" data-fondo={historia.departamento} role="dialog" aria-label={`Llegaste a ${nombre}`}>
      <button type="button" className="historia-saltar" onClick={alTerminar}>
        Saltar <span aria-hidden="true">›</span>
      </button>
      <motion.h1 {...entra(0.6)}>{nombre}</motion.h1>
      <motion.p className="presentacion-texto" {...entra(0.9)}>
        {historia.presentacion}
      </motion.p>
      <ol className="presentacion-lugares">
        {historia.niveles.map((n, i) => (
          <motion.li key={n.lugar} {...entra(1.3 + i * 0.35)}>
            <span className="presentacion-numero" aria-hidden="true">
              {i + 1}
            </span>
            <span>
              <strong>{n.lugar}</strong>
              <small>{n.resumen}</small>
            </span>
          </motion.li>
        ))}
      </ol>
      <motion.div className="presentacion-pie" {...entra(1.4 + historia.niveles.length * 0.35)}>
        <button type="button" className="boton boton-grande" onClick={alTerminar}>
          Ver el mapa
        </button>
      </motion.div>
      {nubes && <Nubes modo="abrir" alTerminar={() => setNubes(false)} />}
    </div>
  )
}
