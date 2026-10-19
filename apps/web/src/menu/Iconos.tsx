import type { ReactNode } from 'react'

/**
 * Los íconos del menú, dibujados a trazo (24×24, del color del texto): se ven igual en todos
 * los teléfonos, a diferencia de los emojis, y toman los colores de la mesa elegida.
 */
function Icono({ children, clase }: { children: ReactNode; clase?: string }) {
  return (
    <svg
      className={`icono-menu${clase ? ` ${clase}` : ''}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

/** La tienda: una bolsa de compras. */
export function IconoTienda({ clase }: { clase?: string }) {
  return (
    <Icono clase={clase}>
      <path d="M5.2 7.5h13.6l-1 12.1a1.6 1.6 0 0 1-1.6 1.4H7.8a1.6 1.6 0 0 1-1.6-1.4Z" />
      <path d="M8.8 10V6.8a3.2 3.2 0 0 1 6.4 0V10" />
    </Icono>
  )
}

/** Jugar online: dos naipes abiertos. */
export function IconoJugar({ clase }: { clase?: string }) {
  return (
    <Icono clase={clase}>
      <rect x="3.2" y="5.2" width="10" height="14.5" rx="1.8" transform="rotate(-12 8.2 12.4)" />
      <rect x="10.2" y="4" width="10" height="14.5" rx="1.8" transform="rotate(10 15.2 11.2)" />
      <circle cx="15.2" cy="11.2" r="2" transform="rotate(10 15.2 11.2)" />
    </Icono>
  )
}

/** El lobby (contra la compu, ranking y amigos): la copa de los que compiten. */
export function IconoLobby({ clase }: { clase?: string }) {
  return (
    <Icono clase={clase}>
      <path d="M7 4h10v5a5 5 0 0 1-10 0Z" />
      <path d="M7 6H4.5v1.5A3 3 0 0 0 7.3 10.5M17 6h2.5v1.5a3 3 0 0 1-2.8 3" />
      <path d="M12 14v3.5M8.5 20.5h7M9.5 20.5l.6-3h3.8l.6 3" />
    </Icono>
  )
}

/** El engranaje de los ajustes. */
export function IconoAjustes({ clase }: { clase?: string }) {
  return (
    <Icono clase={clase}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </Icono>
  )
}

/** Crear sala: una mesa con gente alrededor. */
export function IconoCrear({ clase }: { clase?: string }) {
  return (
    <Icono clase={clase}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 19.5a6 6 0 0 1 12 0" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16.5 14a4.6 4.6 0 0 1 4.8 4.6" />
    </Icono>
  )
}

/** Unirme con código: una llave. */
export function IconoLlave({ clase }: { clase?: string }) {
  return (
    <Icono clase={clase}>
      <circle cx="7.5" cy="15.5" r="4" />
      <path d="m10.4 12.6 9.1-9.1M16.5 6.5l2.5 2.5M14 9l2 2" />
    </Icono>
  )
}

/** Buscar partida: una lupa sobre el mundo. */
export function IconoBuscar({ clase }: { clase?: string }) {
  return (
    <Icono clase={clase}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M4 10.5h13M10.5 4c-2 2-2 11 0 13M10.5 4c2 2 2 11 0 13" />
      <path d="m15.5 15.5 5 5" />
    </Icono>
  )
}
