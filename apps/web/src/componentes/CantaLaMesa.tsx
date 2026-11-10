import { motion } from 'motion/react'
import { mismaCarta, sumaFlor, type Carta as TCarta, type VistaPartida } from '@truco/engine'
import { Carta } from './Carta'

interface Props {
  vista: VistaPartida
  apodo: (asiento: number) => string
  /** Las cartas que te quedan en la mano: si te toca tirar, se tocan acá mismo (el cuadro tapa la mano). */
  misCartas?: TCarta[]
  jugable?: (c: TCarta) => boolean
  alTocar?: (c: TCarta) => void
}

/**
 * "Canta la mesa": querida la contraflor al resto, los que tienen flor tiran sus cartas de a una,
 * en orden desde el mano. Salta en un cuadro sobre la mesa con lo que tiró cada uno y cuánto suma;
 * al que le toca le aparecen ahí sus cartas para tirarlas.
 */
export function CantaLaMesa({ vista, apodo, misCartas = [], jugable, alTocar }: Props) {
  const e = vista.mano.enfrentamientos[vista.mano.actual]!
  const mesa = e.flor.mesa
  const muestra = vista.mano.muestra
  if (!mesa || !muestra) return null
  const yo = vista.yo.asiento
  const leToca = vista.ganador === null ? vista.esperandoA[0] : undefined
  const paraTirar = leToca === yo && alTocar ? misCartas.filter((c) => !(mesa.mostradas[yo] ?? []).some((x) => mismaCarta(x, c))) : []
  return (
    <div className="modal canta-la-mesa-fondo" role="dialog" aria-modal="true" aria-labelledby="canta-la-mesa-titulo">
      <div className="modal-caja canta-la-mesa">
        <div className="fin-emblema chico" aria-hidden="true">
          🌼
        </div>
        <h2 id="canta-la-mesa-titulo" className="modal-titulo">
          ¡Canta la mesa!
        </h2>
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
            {leToca !== yo ? `Tira ${apodo(leToca)}` : paraTirar.length > 0 ? 'Tocá una carta para tirarla' : 'Tocá una carta de tu mano para tirarla'}
          </p>
        )}
        {paraTirar.length > 0 && (
          <div className="canta-la-mesa-mano" aria-label="Tus cartas">
            {paraTirar.map((c) => (
              <Carta key={`${c.numero}${c.palo}`} carta={c} tam="mesa" jugable={jugable?.(c) ?? true} alTocar={() => alTocar!(c)} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
