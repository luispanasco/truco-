import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import { PIELES, leerAvatar } from '@truco/shared'
import { useEstiloAvatar } from '../avatares/estilo'
import { medirZonas, prepararCara, type ZonasCara } from '../avatares/gestos'
import '../avatares/gestos.css'

/**
 * Avatar de un jugador dibujado por capas. Si el código no es válido (o el estilo todavía
 * se está cargando), se ve la inicial del apodo.
 *
 * `gesto` va como `data-gesto` en el SVG: las señas animan las capas de la cara con CSS
 * (avatares/gestos.css), con piezas que se agregan al montarlo (avatares/gestos.ts).
 * Con `encuadre="cara"` el dibujo se acerca a la cara (cuánto, lo dice el CSS de afuera
 * con `--zoom`). `alMedir` recibe dónde quedó cada parte de la cara (para tocarla).
 */
export function Avatar({
  codigo,
  apodo = '',
  gesto,
  clase = '',
  encuadre = 'entero',
  alMedir,
}: {
  codigo: string | null | undefined
  apodo?: string
  gesto?: string | null
  clase?: string
  encuadre?: 'entero' | 'cara'
  alMedir?: (zonas: ZonasCara | null) => void
}) {
  const estilo = useEstiloAvatar()
  const avatar = leerAvatar(codigo)
  const ref = useRef<SVGSVGElement>(null)
  const html = estilo && avatar ? `<g class="avatar-todo">${estilo.dibujar(avatar)}</g>` : null
  const medir = useRef(alMedir)
  medir.current = alMedir

  // Después de montar (o de cambiar el dibujo), se preparan los ojos y las piezas de las señas.
  useLayoutEffect(() => {
    const svg = ref.current
    if (!svg || !estilo || !html) return
    prepararCara(svg, estilo.cara)
    // Se mide quieto: durante un gesto las capas se mueven.
    if (!gesto) medir.current?.(medirZonas(svg))
  }, [html, estilo, gesto])

  if (!estilo || !avatar || !html) {
    return (
      <span className={`avatar-inicial ${clase}`} data-gesto={gesto ?? undefined} aria-hidden="true">
        {apodo.slice(0, 1).toUpperCase() || '?'}
      </span>
    )
  }
  const [vx, vy, vw, vh] = estilo.viewBox.split(' ').map(Number) as [number, number, number, number]
  const { x, y, ancho, alto } = estilo.cara
  const cx = x + ancho / 2
  const cy = y + alto / 2
  const vars = {
    '--u': ancho / 100,
    '--cara-cx': `${cx}px`,
    '--cara-cy': `${cy}px`,
    '--centrar': `${vx + vw / 2 - cx}px ${vy + vh / 2 - cy}px`,
    '--zoom-cara': vw / Math.max(ancho, alto),
    '--avatar-piel': PIELES[avatar.piel] ?? PIELES[0],
  } as CSSProperties
  return (
    <svg
      ref={ref}
      className={`avatar-dibujo encuadre-${encuadre} ${clase}`}
      viewBox={estilo.viewBox}
      style={vars}
      data-gesto={gesto ?? undefined}
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
