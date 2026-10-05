import { useEffect, useState } from 'react'
import type { Avatar } from '@truco/shared'

/**
 * Un estilo de dibujo para los avatares. El formato del avatar (`@truco/shared`) dice qué
 * pieza hay en cada capa; el estilo sabe cómo se dibuja. Para cambiar de estilo (por ejemplo,
 * uno hecho por un diseñador) alcanza con otro módulo que cumpla esta interfaz.
 *
 * Las capas de la cara van en `<g class="capa capa-{nombre}">` (capa-cejas, capa-ojos,
 * capa-nariz, capa-boca, capa-barba...) para que las señas las animen por separado.
 */
export interface EstiloAvatar {
  nombre: string
  viewBox: string
  /** El contenido del SVG del avatar. */
  dibujar(a: Avatar): string
  /**
   * Dónde queda la cara (de las cejas a la pera), en unidades del viewBox. Sirve para
   * acercarse a la cara (en la mesa y en la cara de señas) y de medida para las señas.
   */
  cara: { x: number; y: number; ancho: number; alto: number }
}

let cargando: Promise<EstiloAvatar> | null = null
let cargado: EstiloAvatar | null = null

/** Los dibujos van en un archivo aparte, para no engordar la carga inicial de la app. */
export function cargarEstilo(): Promise<EstiloAvatar> {
  cargando ??= import('./lorelei').then((m) => (cargado = m.LORELEI))
  return cargando
}

/** El estilo, o null mientras se carga. */
export function useEstiloAvatar(): EstiloAvatar | null {
  const [estilo, setEstilo] = useState(cargado)
  useEffect(() => {
    if (estilo) return
    let vivo = true
    void cargarEstilo().then((e) => vivo && setEstilo(e))
    return () => {
      vivo = false
    }
  }, [estilo])
  return estilo
}
