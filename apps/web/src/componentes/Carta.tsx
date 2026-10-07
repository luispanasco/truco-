import { useEffect } from 'react'
import { motion } from 'motion/react'
import type { Carta as TCarta, Palo } from '@truco/engine'
import { imagenCarta, precargarBaraja, useBaraja, type Baraja } from '../baraja'
import { Dorso, Frente } from './dibujo'
import '../estilos-baraja.css'

const NOMBRE_PALO: Record<Palo, string> = { espada: 'espadas', basto: 'bastos', oro: 'oros', copa: 'copas' }

interface Props {
  carta?: TCarta
  oculta?: boolean
  tam?: 'chica' | 'mesa' | 'normal' | 'grande'
  jugable?: boolean
  resaltada?: boolean
  ganadora?: boolean
  alTocar?: () => void
  /** Para mostrar una baraja distinta de la elegida (la comparación en /baraja). */
  baraja?: Baraja
}

/**
 * Imagen de una baraja antigua. Es decorativa (alt vacío): el nombre de la carta lo lleva el
 * elemento de afuera (aria-label), igual que con el SVG.
 */
function Imagen({ src }: { src: string }) {
  return <img className="carta-img" src={src} alt="" draggable={false} decoding="async" />
}

export function Carta({ carta, oculta, tam = 'normal', jugable, resaltada, ganadora, alTocar, baraja: forzada }: Props) {
  const elegida = useBaraja((e) => e.baraja)
  const baraja = forzada ?? elegida
  // La primera carta que se dibuja con la baraja elegida baja todas (una sola vez): sin parpadeos.
  // Las miniaturas de otra baraja (el selector) no disparan la descarga.
  useEffect(() => precargarBaraja(elegida), [elegida])
  // Las barajas que no son la propia son imágenes (todas antiguas, con el mismo papel de fondo).
  const clasica = baraja !== 'propia'
  const clases = ['carta', `carta-${tam}`]
  if (clasica) clases.push('carta-clasica')
  if (oculta || !carta) clases.push('carta-dorso')
  if (jugable) clases.push('carta-jugable')
  if (resaltada) clases.push('carta-resaltada')
  if (ganadora) clases.push('carta-ganadora')
  if (oculta || !carta) {
    return (
      <div className={clases.join(' ')} aria-label="carta boca abajo">
        {baraja !== 'propia' ? <Imagen src={imagenCarta(baraja)} /> : <Dorso />}
      </div>
    )
  }
  const etiqueta = `${carta.numero} de ${NOMBRE_PALO[carta.palo]}`
  const frente = baraja !== 'propia' ? <Imagen src={imagenCarta(baraja, carta)} /> : <Frente palo={carta.palo} numero={carta.numero} />
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
