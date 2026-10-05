import { leerAvatar } from '@truco/shared'
import { useEstiloAvatar } from '../avatares/estilo'

/**
 * Avatar de un jugador dibujado por capas. Si el código no es válido (o el estilo todavía
 * se está cargando), se ve la inicial del apodo.
 *
 * `gesto` va como `data-gesto` en el SVG: las señas animan las capas de la cara con CSS.
 * `data-avatar` lleva el código, para saber qué avatar se ve (los tests de punta a punta).
 */
export function Avatar({
  codigo,
  apodo = '',
  gesto,
  clase = '',
}: {
  codigo: string | null | undefined
  apodo?: string
  gesto?: string | null
  clase?: string
}) {
  const estilo = useEstiloAvatar()
  const avatar = leerAvatar(codigo)
  if (!estilo || !avatar) {
    return (
      <span className={`avatar-inicial ${clase}`} aria-hidden="true">
        {apodo.slice(0, 1).toUpperCase() || '?'}
      </span>
    )
  }
  return (
    <svg
      className={`avatar-dibujo ${clase}`}
      viewBox={estilo.viewBox}
      data-gesto={gesto ?? undefined}
      data-avatar={codigo ?? undefined}
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: estilo.dibujar(avatar) }}
    />
  )
}
