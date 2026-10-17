import type { VistaMesa } from '../perfil'
import { Segmentado } from './FormularioSala'

const DETALLE: Record<VistaMesa, string> = {
  circulos: 'Los demás se ven en un círculo con su cara.',
  sentados: 'Los demás se ven de medio cuerpo detrás del paño; más grandes cuanto más grande la pantalla.',
  perspectiva: 'La mesa se ve inclinada, como sentado frente a ella: los demás del otro lado y a los costados, más chicos cuanto más lejos.',
}

/**
 * Cómo se ve la mesa: los demás en círculos (la cara), sentados detrás del paño de medio
 * cuerpo (el tamaño crece con la pantalla) o la mesa entera en perspectiva.
 */
export function SelectorVistaMesa({ valor, alCambiar }: { valor: VistaMesa; alCambiar: (vista: VistaMesa) => void }) {
  return (
    <Segmentado
      titulo="Jugadores en la mesa"
      valor={valor}
      opciones={[
        ['circulos', 'Círculos'],
        ['sentados', 'Sentados'],
        ['perspectiva', 'En perspectiva'],
      ]}
      alCambiar={alCambiar}
      detalle={DETALLE[valor]}
    />
  )
}
