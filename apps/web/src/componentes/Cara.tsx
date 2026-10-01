import { useEffect, useRef, useState } from 'react'
import type { Senia } from '@truco/bots'
import '../estilos-senias.css'

/**
 * Gestos que sabe hacer la cara: las 11 señas y "disimulo", que es lo que se ve cuando
 * pescás a un rival haciendo una seña pero la sala no deja saber cuál.
 */
export type GestoCara = Senia | 'disimulo'

/** Un gesto en curso; el id sirve de clave para que la animación arranque de nuevo. */
export interface GestoActivo {
  gesto: GestoCara
  id: number
}

/**
 * Lo que dura un gesto sobre el avatar: la cara entra, hace el gesto (1,7 s, en el CSS),
 * se queda un momento quieta para leer el globito y le devuelve el lugar al ícono.
 */
export const DURACION_GESTO = 2300

/**
 * Cara dibujada por capas (cabeza, pelo, cejas, ojos, nariz, mejillas, boca y pera).
 * Se ve como en un espejo: lo "derecho" queda a la derecha de la pantalla, igual en la
 * cara grande de las señas que en los avatares. El gesto se anima solo con CSS: cada
 * capa sabe qué hacer según `data-gesto` (ver estilos-senias.css).
 */
export function Cara({ gesto, clase = '' }: { gesto: GestoCara | null; clase?: string }) {
  const g = gesto ?? 'nada'
  const es = (...gs: GestoCara[]) => gesto !== null && gs.includes(gesto)
  // Las capas que el gesto reemplaza (un ojo, la boca) se esconden mientras dura.
  const sale = (si: boolean) => (si ? 'cara-sale' : undefined)
  const bocaPropia = es('pieza4', 'pieza5', 'tres', 'dosComun', 'unoFalso', 'flor', 'unoBravo', 'sieteBravo', 'disimulo')
  return (
    <svg className={`cara ${clase}`} data-gesto={g} viewBox="0 0 200 240" aria-hidden="true" focusable="false">
      <g className="cara-cabeza">
        <ellipse className="cara-oreja" cx="28" cy="124" rx="11" ry="17" />
        <ellipse className="cara-oreja" cx="172" cy="124" rx="11" ry="17" />
        <ellipse className="cara-piel" cx="100" cy="120" rx="74" ry="88" />
        <path className="cara-pelo" d="M28 108 C24 52 66 26 100 28 C134 26 176 50 172 108 C162 66 138 42 100 42 C62 42 38 66 28 108 Z" />
      </g>

      {/* Cachetes inflados (flor): se salen del contorno de la cara, como un sapo. */}
      {es('flor') && (
        <g className="cara-entra cara-cachetes">
          <path className="cara-cachete" d="M48 112 Q-6 148 50 184 Q80 150 48 112 Z" />
          <path className="cara-trazo-fino" d="M48 112 Q-6 148 50 184" />
          <path className="cara-cachete" d="M152 112 Q206 148 150 184 Q120 150 152 112 Z" />
          <path className="cara-trazo-fino" d="M152 112 Q206 148 150 184" />
        </g>
      )}
      <g className="cara-mejillas">
        <circle cx="60" cy="140" r="13" />
        <circle cx="140" cy="140" r="13" />
      </g>

      <g className="cara-cejas">
        <path d="M54 80 Q72 69 88 77" />
        <path d="M112 77 Q128 69 146 80" />
      </g>

      <g className="cara-ojos">
        <g className={`cara-ojo izq ${sale(es('perica')) ?? ''}`}>
          <ellipse className="cara-blanco" cx="72" cy="98" rx="11" ry="9.5" />
          <circle className="cara-pupila" cx="72" cy="99" r="5" />
          <circle className="cara-brillo" cx="74" cy="97" r="1.6" />
        </g>
        <g className={`cara-ojo der ${sale(es('perico')) ?? ''}`}>
          <ellipse className="cara-blanco" cx="128" cy="98" rx="11" ry="9.5" />
          <circle className="cara-pupila" cx="128" cy="99" r="5" />
          <circle className="cara-brillo" cx="130" cy="97" r="1.6" />
        </g>
        {es('perica') && <path className="cara-trazo cara-entra" d="M60 99 Q72 106 84 99" />}
        {es('perico') && <path className="cara-trazo cara-entra" d="M116 99 Q128 106 140 99" />}
      </g>

      <g className="cara-nariz">
        <path className="cara-trazo-fino" d="M101 104 Q97 120 92 126 Q100 132 108 126" />
        {es('pieza5') && (
          <g className="cara-entra cara-arrugas">
            <path d="M88 110 l7 3" />
            <path d="M112 110 l-7 3" />
            <path d="M89 117 l6 2" />
            <path d="M111 117 l-6 2" />
          </g>
        )}
      </g>

      {/* La pera y la boca se mueven juntas en las muecas. */}
      <g className="cara-boca">
        <path className={`cara-trazo ${sale(bocaPropia) ?? ''}`} d="M82 160 Q100 173 118 160" />
        {es('pieza4') && (
          <g className="cara-entra">
            <ellipse className="cara-labios" cx="100" cy="163" rx="8" ry="9" />
            <ellipse className="cara-oscuro" cx="100" cy="163" rx="3" ry="3.6" />
            <path className="cara-corazon" d="M128 150 c-4-6-12-2-8 4 l8 7 l8-7 c4-6-4-10-8-4 Z" />
          </g>
        )}
        {es('pieza5') && <path className="cara-trazo cara-entra" d="M84 166 Q100 157 116 166" />}
        {es('tres') && (
          <g className="cara-entra">
            <path className="cara-trazo" d="M82 157 Q100 152 118 157" />
            <path className="cara-labios" d="M84 162 Q100 176 116 162 Q100 167 84 162 Z" />
            <rect className="cara-diente" x="91" y="156" width="8" height="9" rx="1.5" />
            <rect className="cara-diente" x="101" y="156" width="8" height="9" rx="1.5" />
          </g>
        )}
        {es('dosComun') && (
          <g className="cara-entra">
            <ellipse className="cara-oscuro" cx="100" cy="165" rx="14" ry="17" />
            <ellipse className="cara-lengua" cx="100" cy="176" rx="9" ry="5" />
          </g>
        )}
        {es('unoFalso') && (
          <g className="cara-entra">
            <path className="cara-trazo" d="M82 160 Q100 168 118 160" />
            <path className="cara-lengua cara-lengua-afuera" d="M90 163 Q89 189 100 189 Q111 189 110 163 Z" />
            <path className="cara-trazo-fino" d="M100 167 L100 180" />
          </g>
        )}
        {es('flor') && <ellipse className="cara-labios cara-entra" cx="100" cy="163" rx="9" ry="4" />}
        {es('unoBravo') && <path className="cara-trazo cara-entra" d="M84 166 Q104 167 122 153" />}
        {es('sieteBravo') && <path className="cara-trazo cara-entra" d="M78 153 Q96 167 116 166" />}
        {es('disimulo') && <path className="cara-trazo cara-entra" d="M88 163 L112 163" />}
      </g>
      <path className="cara-pera cara-trazo-fino" d="M90 196 Q100 202 110 196" />
    </svg>
  )
}

/**
 * Gestos que se ven sobre los avatares de la mesa. Llegan señas (de compañeros) y señas
 * pescadas (de rivales); cada asiento las hace de a una, en el orden en que llegaron.
 * A cada gesto se le fija la hora de inicio al llegar, así el estado no depende de
 * timers sueltos (y no se traba si React monta los efectos dos veces).
 */
export function useGestos(llegadas: readonly { de: number; senia: Senia | null; id: number }[]): Record<number, GestoActivo> {
  const [gestos, setGestos] = useState<(GestoActivo & { de: number; inicio: number })[]>([])
  const [ahora, setAhora] = useState(() => Date.now())
  const ultimo = useRef(0)
  const libreDesde = useRef(new Map<number, number>())

  useEffect(() => {
    const t = Date.now()
    const nuevos: (GestoActivo & { de: number; inicio: number })[] = []
    for (const l of llegadas) {
      if (l.id <= ultimo.current) continue
      ultimo.current = l.id
      const inicio = Math.max(t, libreDesde.current.get(l.de) ?? 0)
      libreDesde.current.set(l.de, inicio + DURACION_GESTO)
      nuevos.push({ de: l.de, gesto: l.senia ?? 'disimulo', id: l.id, inicio })
    }
    if (nuevos.length === 0) return
    setGestos((s) => [...s.filter((g) => g.inicio + DURACION_GESTO > t), ...nuevos])
    setAhora(t)
  }, [llegadas])

  // Vuelve a mirar la hora cuando empieza o termina el próximo gesto.
  useEffect(() => {
    const proximos = gestos.flatMap((g) => [g.inicio, g.inicio + DURACION_GESTO]).filter((m) => m > ahora)
    if (proximos.length === 0) return
    const t = setTimeout(() => setAhora(Math.max(Date.now(), Math.min(...proximos))), Math.min(...proximos) - Date.now())
    return () => clearTimeout(t)
  }, [gestos, ahora])

  const activos: Record<number, GestoActivo> = {}
  for (const g of gestos) if (g.inicio <= ahora && ahora < g.inicio + DURACION_GESTO) activos[g.de] = { gesto: g.gesto, id: g.id }
  return activos
}
