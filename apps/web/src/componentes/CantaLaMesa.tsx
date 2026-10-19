import { motion } from 'motion/react'
import { sumaFlor, type VistaPartida } from '@truco/engine'
import { Carta } from './Carta'

/**
 * "Canta la mesa": querida la contraflor al resto, los que tienen flor tiran sus cartas de a una,
 * en orden desde el mano. En el medio de la mesa se ve lo que tiró cada uno y cuánto suma.
 */
export function CantaLaMesa({ vista, apodo }: { vista: VistaPartida; apodo: (asiento: number) => string }) {
  const e = vista.mano.enfrentamientos[vista.mano.actual]!
  const mesa = e.flor.mesa
  const muestra = vista.mano.muestra
  if (!mesa || !muestra) return null
  const yo = vista.yo.asiento
  const leToca = vista.ganador === null ? vista.esperandoA[0] : undefined
  return (
    <div className="canta-la-mesa" role="region" aria-label="Canta la mesa">
      <p className="canta-la-mesa-titulo">¡Canta la mesa!</p>
      <ul>
        {mesa.orden.map((a) => {
          const cartas = mesa.mostradas[a] ?? []
          return (
            <li key={a} className={a === leToca ? 'tirando' : ''}>
              <span className="canta-la-mesa-nombre">{a === yo ? 'Vos' : apodo(a)}</span>
              <span className="canta-la-mesa-cartas">
                {cartas.map((c) => (
                  <motion.span key={`${c.numero}${c.palo}`} initial={{ y: -24, opacity: 0, rotate: -8 }} animate={{ y: 0, opacity: 1, rotate: 0 }}>
                    <Carta carta={c} tam="chica" />
                  </motion.span>
                ))}
              </span>
              <strong className="canta-la-mesa-suma" aria-label={`Suma ${cartas.length > 0 ? sumaFlor(cartas, muestra, vista.config.florConPiezas) : 0}`}>
                {cartas.length > 0 ? sumaFlor(cartas, muestra, vista.config.florConPiezas) : '–'}
              </strong>
            </li>
          )
        })}
      </ul>
      {leToca !== undefined && (
        <p className="canta-la-mesa-turno" role="status">
          {leToca === yo ? 'Tocá una carta de tu mano para tirarla' : `Tira ${apodo(leToca)}`}
        </p>
      )}
    </div>
  )
}
