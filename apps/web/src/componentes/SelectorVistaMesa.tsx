import { Segmentado } from './FormularioSala'

/**
 * Cómo se ve a los demás en la mesa: en círculos (la cara) o sentados detrás del paño, de
 * medio cuerpo. Sentados, el tamaño crece con la pantalla.
 */
export function SelectorVistaMesa({ valor, alCambiar }: { valor: boolean; alCambiar: (bustos: boolean) => void }) {
  return (
    <Segmentado
      titulo="Jugadores en la mesa"
      valor={valor ? 'sentados' : 'circulos'}
      opciones={[
        ['circulos', 'Círculos'],
        ['sentados', 'Sentados'],
      ]}
      alCambiar={(v) => alCambiar(v === 'sentados')}
      detalle={
        valor
          ? 'Los demás se ven de medio cuerpo detrás del paño; más grandes cuanto más grande la pantalla.'
          : 'Los demás se ven en un círculo con su cara.'
      }
    />
  )
}
