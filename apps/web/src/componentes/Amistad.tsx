import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useCuenta } from '../cuenta/cuenta'
import { cargarAmigos, descartarInvitacion, invitarAmigo, useAmigos } from '../cuenta/amigos'
import { useJuego } from '../estado'

/**
 * El aviso de que un amigo te invita a su sala, en cualquier pantalla. En la mesa, en plena
 * partida, no se muestra: espera a que vuelvas.
 */
export function AvisoInvitacion() {
  const invitaciones = useAmigos((s) => s.invitaciones)
  const navegar = useNavigate()
  const { pathname } = useLocation()
  const enPartida = useJuego((s) => s.conexion !== null) && pathname === '/mesa'
  const inv = invitaciones[0]
  if (!inv || enPartida) return null
  const entrar = () => {
    descartarInvitacion(inv)
    // Si estabas en otra sala, se sale antes de entrar a la nueva.
    if (useJuego.getState().conexion) useJuego.getState().salir()
    navegar(`/s/${inv.sala}`)
  }
  return (
    <div className="aviso-invitacion" role="alertdialog" aria-label="Invitación a una sala">
      <p>
        <strong>{inv.apodo}</strong> te invita a su sala.
      </p>
      <div className="aviso-invitacion-botones">
        <button type="button" className="boton" onClick={entrar}>
          Entrar
        </button>
        <button type="button" className="boton boton-secundario" onClick={() => descartarInvitacion(inv)}>
          Ahora no
        </button>
      </div>
    </div>
  )
}

/** En la sala de espera: tus amigos conectados, para invitarlos. */
export function InvitarAmigos() {
  const adentro = useCuenta((s) => s.estado === 'adentro')
  const lista = useAmigos((s) => s.lista)
  const [invitados, setInvitados] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!adentro) return
    const cargar = () => void cargarAmigos().catch(() => {})
    cargar()
    const t = setInterval(cargar, 15_000)
    return () => clearInterval(t)
  }, [adentro])
  if (!adentro || !lista || lista.amigos.length === 0) return null
  const disponibles = lista.amigos.filter((a) => a.estado === 'conectado' || a.estado === 'enSala')
  return (
    <section className="tarjeta">
      <h2>Invitar amigos</h2>
      {disponibles.length === 0 ? (
        <p className="nota-izq">Ninguno de tus amigos está conectado ahora.</p>
      ) : (
        <ul className="amigos">
          {disponibles.map((a) => (
            <li key={a.id} className="amigo amigo-chico">
              <span className="amigo-nombre">{a.apodo}</span>
              <button
                type="button"
                className="boton"
                disabled={invitados.has(a.id)}
                onClick={async () => {
                  const motivo = await invitarAmigo(a.id)
                  setError(motivo)
                  if (!motivo) setInvitados((s) => new Set(s).add(a.id))
                }}
              >
                {invitados.has(a.id) ? 'Invitado' : 'Invitar'}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="nota-izq">{error}</p>}
    </section>
  )
}
