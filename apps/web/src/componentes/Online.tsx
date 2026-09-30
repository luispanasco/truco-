import { useEffect, useRef, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import type { OpcionesUnirse } from '@truco/shared'
import { useJuego } from '../estado'
import type { Perfil } from '../perfil'

/** Con qué nombre y cara se entra a una sala. */
export function datosUnirse(p: Perfil): OpcionesUnirse {
  return { invitadoId: p.invitadoId, apodo: p.apodo.trim(), avatar: p.avatar }
}

/** Título de las pantallas online, con la flecha para volver. */
export function CabeceraOnline({ titulo, alVolver }: { titulo: string; alVolver?: () => void }) {
  const navegar = useNavigate()
  return (
    <header className="online-cabecera">
      <button type="button" className="online-volver" aria-label="Volver" onClick={alVolver ?? (() => navegar('/'))}>
        ‹
      </button>
      <h1>{titulo}</h1>
    </header>
  )
}

/** Aviso si se cortó la conexión con el servidor. */
export function AvisoConexion() {
  const estado = useJuego((s) => s.estadoConexion)
  const navegar = useNavigate()
  if (estado === 'conectada') return null
  return estado === 'reconectando' ? (
    <p className="aviso-conexion" role="status">
      <span className="punto-latido" aria-hidden="true" /> Se cortó la conexión. Reconectando…
    </p>
  ) : (
    <div className="aviso-conexion caida" role="alert">
      <span>Se perdió la conexión con el servidor.</span>
      <button
        type="button"
        className="boton boton-chico"
        onClick={() => {
          useJuego.getState().salir()
          navegar('/')
        }}
      >
        Volver al inicio
      </button>
    </div>
  )
}

/** Los errores que manda el servidor (por ejemplo, "Faltan jugadores"), como un aviso que se va solo. */
export function ErrorServidor() {
  const error = useJuego((s) => s.error)
  if (!error) return null
  return (
    <p key={error.id} className="error-online aviso-temporal" role="alert">
      {error.motivo}
    </p>
  )
}

export function MensajeError({ children }: { children: ReactNode }) {
  return (
    <p className="error-online" role="alert">
      {children}
    </p>
  )
}

/** Recién conectado: a la espera, o directo a la mesa si la partida ya estaba en juego (al volver). */
export function destinoAlEntrar(): '/sala' | '/mesa' {
  const fase = useJuego.getState().sala?.fase
  return fase === 'jugando' || fase === 'terminada' ? '/mesa' : '/sala'
}

/** En la espera: cuando la sala arranca (o si ya estaba en juego), a la mesa. */
export function useIrALaMesa() {
  const navegar = useNavigate()
  const fase = useJuego((s) => s.sala?.fase)
  useEffect(() => {
    if (fase === 'jugando' || fase === 'terminada') navegar('/mesa', { replace: true })
  }, [fase, navegar])
}

/**
 * Si se deja la pantalla de espera por otro lado (la flecha del navegador) antes de que
 * empiece la partida, se deja también la sala, así no queda un lugar ocupado de más.
 */
export function useSalirAlDesmontar() {
  const montada = useRef(false)
  useEffect(() => {
    montada.current = true
    return () => {
      montada.current = false
      // En desarrollo, React desmonta y vuelve a montar enseguida: se espera un momento antes de salir.
      setTimeout(() => {
        if (montada.current) return
        const { conexion, sala } = useJuego.getState()
        if (conexion?.tipo === 'online' && (!sala || sala.fase === 'esperando')) useJuego.getState().salir()
      }, 0)
    }
  }, [])
}
