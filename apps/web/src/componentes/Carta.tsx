import { motion } from 'motion/react'
import type { Carta as TCarta, Palo } from '@truco/engine'
import { Dorso, Frente } from './dibujo'

const NOMBRE_PALO: Record<Palo, string> = { espada: 'espadas', basto: 'bastos', oro: 'oros', copa: 'copas' }

interface Props {
  carta?: TCarta
  oculta?: boolean
  tam?: 'chica' | 'mesa' | 'normal' | 'grande'
  jugable?: boolean
  resaltada?: boolean
  ganadora?: boolean
  alTocar?: () => void
}

export function Carta({ carta, oculta, tam = 'normal', jugable, resaltada, ganadora, alTocar }: Props) {
  const clases = ['carta', `carta-${tam}`]
  if (oculta || !carta) clases.push('carta-dorso')
  if (jugable) clases.push('carta-jugable')
  if (resaltada) clases.push('carta-resaltada')
  if (ganadora) clases.push('carta-ganadora')
  if (oculta || !carta) {
    return (
      <div className={clases.join(' ')} aria-label="carta boca abajo">
        <Dorso />
      </div>
    )
  }
  const etiqueta = `${carta.numero} de ${NOMBRE_PALO[carta.palo]}`
  const frente = <Frente palo={carta.palo} numero={carta.numero} />
  return alTocar ? (
    <button type="button" className={clases.join(' ')} onClick={alTocar} disabled={!jugable} aria-label={`Jugar el ${etiqueta}`}>
      {frente}
    </button>
  ) : (
    // La ganadora de la vuelta late una vez (la escala no pisa el transform de quien la ubica).
    <motion.div
      className={clases.join(' ')}
      aria-label={etiqueta}
      role="img"
      initial={false}
      animate={ganadora ? { scale: [1, 1.12, 1] } : { scale: 1 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
    >
      {frente}
    </motion.div>
  )
}
