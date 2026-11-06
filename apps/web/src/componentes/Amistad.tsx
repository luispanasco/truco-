import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { PUEDE } from '@truco/shared'
import { TEXTO_ESTADO } from '../pantallas/Amigos'
import { Avatar } from './Avatar'
import { useCuenta } from '../cuenta/cuenta'
import { cargarAmigos, descartarInvitacion, invitarAmigo, useAmigos, type Amigo } from '../cuenta/amigos'
import { cargarGrupos, convocarGrupo, invitarAlGrupo, useGrupos } from '../cuenta/grupos'
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
        {inv.grupo ? (
          <>
            <strong>{inv.apodo}</strong> llama a <strong>{inv.grupo}</strong> a jugar en su sala.
          </>
        ) : (
          <>
            <strong>{inv.apodo}</strong> te invita a su sala.
          </>
        )}
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

/** A quién invitar apenas se cree la sala (se elige desde el menú, en "Tus amigos"). */
export interface InvitarAlCrear {
  invitar: { id: string; apodo: string }
}

export function invitacionPendiente(estado: unknown): InvitarAlCrear['invitar'] | null {
  const i = (estado as Partial<InvitarAlCrear> | null)?.invitar
  return i && typeof i.id === 'string' && typeof i.apodo === 'string' ? i : null
}

/** A qué grupo llamar apenas se cree la sala (se elige en la pantalla del grupo, con "Armar partida"). */
export interface ConvocarAlCrear {
  convocar: { id: string; nombre: string }
}

export function convocatoriaPendiente(estado: unknown): ConvocarAlCrear['convocar'] | null {
  const c = (estado as Partial<ConvocarAlCrear> | null)?.convocar
  return c && typeof c.id === 'string' && typeof c.nombre === 'string' ? c : null
}

/** Con la cuenta abierta, la lista de amigos se pide al entrar y cada 15 s mientras se ve. */
function useCargarAmigos(adentro: boolean) {
  useEffect(() => {
    if (!adentro) return
    const cargar = () => void cargarAmigos().catch(() => {})
    cargar()
    const t = setInterval(cargar, 15_000)
    return () => clearInterval(t)
  }, [adentro])
}

/** En la sala de espera: tus amigos conectados, para invitarlos. */
export function InvitarAmigos() {
  const adentro = useCuenta((s) => s.estado === 'adentro')
  const lista = useAmigos((s) => s.lista)
  const [invitados, setInvitados] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  useCargarAmigos(adentro)

  // Si se creó la sala desde "Invitar" en el menú, el amigo se invita solo, una vez.
  const pendiente = invitacionPendiente(useLocation().state)
  const yaInvitado = useRef(false)
  useEffect(() => {
    if (!adentro || !pendiente || yaInvitado.current) return
    yaInvitado.current = true
    void invitarAmigo(pendiente.id).then((motivo) => {
      setError(motivo)
      if (!motivo) setInvitados((s) => new Set(s).add(pendiente.id))
    })
  }, [adentro, pendiente])

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

/**
 * En la sala de espera: tus grupos, para mandarles la sala (los que la configuración de cada grupo te
 * deja): queda en el muro del grupo y a los conectados les llega el aviso. Si se creó la sala desde
 * "Armar partida" en un grupo, a ese se le manda sola, una vez.
 */
export function InvitarGrupos({ sala }: { sala: { codigo: string; formato: string; puntos: number } }) {
  const adentro = useCuenta((s) => s.estado === 'adentro')
  const lista = useGrupos((s) => s.lista)
  const [llamados, setLlamados] = useState<Set<string>>(new Set())
  const [aviso, setAviso] = useState<string | null>(null)

  /** La sala va al muro del grupo (la ven todos un rato) y a los conectados les llega el aviso. */
  const llamar = async (id: string) => {
    const [muro, r] = await Promise.all([invitarAlGrupo(id, sala), convocarGrupo(id)])
    if (!r.ok) return setAviso(r.motivo)
    setLlamados((s) => new Set(s).add(id))
    const n = r.datos.invitados
    const avisados = n === 0 ? 'Ahora no hay nadie conectado' : n === 1 ? 'Le llegó el aviso a 1' : `Les llegó el aviso a ${n}`
    setAviso(muro.ok ? `Quedó en el muro del grupo. ${avisados}.` : `${avisados}.`)
  }

  useEffect(() => {
    if (adentro && !lista) void cargarGrupos().catch(() => {})
  }, [adentro, lista])

  const pendiente = convocatoriaPendiente(useLocation().state)
  const yaLlamado = useRef(false)
  useEffect(() => {
    if (!adentro || !pendiente || yaLlamado.current) return
    yaLlamado.current = true
    void llamar(pendiente.id)
  }, [adentro, pendiente])

  const grupos = (lista?.tuyos ?? []).filter((g) => PUEDE.convocar(g.rol, g.convocan))
  if (!adentro || grupos.length === 0) return null
  return (
    <section className="tarjeta">
      <h2>Mandar a tu grupo</h2>
      <p className="nota-izq">La sala queda en el muro del grupo y a los que están conectados les llega el aviso.</p>
      <ul className="amigos">
        {grupos.map((g) => (
          <li key={g.id} className="amigo amigo-chico">
            <span className="amigo-nombre">
              [{g.sigla}] {g.nombre}
            </span>
            <button type="button" className="boton" disabled={llamados.has(g.id)} aria-label={`Mandar a ${g.nombre}`} onClick={() => void llamar(g.id)}>
              {llamados.has(g.id) ? 'Mandada' : 'Mandar'}
            </button>
          </li>
        ))}
      </ul>
      {aviso && (
        <p className="nota-izq" role="status">
          {aviso}
        </p>
      )}
    </section>
  )
}

const ORDEN_ESTADO: Record<Amigo['estado'], number> = { enSala: 0, conectado: 1, jugando: 2, desconectado: 3 }

/**
 * En el menú, en "Jugar": una tira con los avatares de tus amigos que están en la app. Al que
 * espera en una sala te unís; al conectado lo invitás (se crea tu sala y le llega la invitación).
 * Al final, el acceso a la pantalla de amigos (con las solicitudes que te llegaron). Sin cuenta, nada.
 */
export function AmigosConectados({ deshabilitado, conApodo }: { deshabilitado: boolean; conApodo: (accion: () => void) => void }) {
  const adentro = useCuenta((s) => s.estado === 'adentro')
  const lista = useAmigos((s) => s.lista)
  const navegar = useNavigate()
  useCargarAmigos(adentro)
  if (!adentro) return null

  const enLaApp = (lista?.amigos ?? []).filter((a) => a.estado !== 'desconectado').sort((a, b) => ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado])
  const pedidos = lista?.recibidas.length ?? 0
  const accion = (a: Amigo) =>
    a.sala
      ? { texto: `Unirte a la sala de ${a.apodo}`, hacer: () => navegar(`/s/${a.sala}`) }
      : a.estado === 'conectado'
        ? { texto: `Invitar a ${a.apodo}`, hacer: () => navegar('/crear', { state: { invitar: { id: a.id, apodo: a.apodo } } satisfies InvitarAlCrear }) }
        : null
  return (
    <section className="amigos-tira" aria-labelledby="titulo-amigos-menu">
      <h2 id="titulo-amigos-menu">
        Amigos
        {lista && <small>{enLaApp.length > 0 ? `${enLaApp.length} en la app` : lista.amigos.length > 0 ? 'Ninguno conectado' : ''}</small>}
      </h2>
      <ul>
        {enLaApp.map((a) => {
          const acc = accion(a)
          return (
            <li key={a.id}>
              <button
                type="button"
                className={`amigo-tira estado-${a.estado}`}
                disabled={deshabilitado || !acc}
                aria-label={acc ? acc.texto : `${a.apodo}: ${TEXTO_ESTADO[a.estado]}`}
                title={TEXTO_ESTADO[a.estado]}
                onClick={() => acc && conApodo(acc.hacer)}
              >
                <span className="amigo-tira-avatar">
                  <Avatar codigo={a.avatar} apodo={a.apodo} />
                  <span className="amigo-punto" aria-hidden="true" />
                </span>
                <span className="amigo-tira-nombre">{a.apodo}</span>
                <span className="amigo-tira-accion" aria-hidden="true">
                  {a.sala ? 'Unirme' : a.estado === 'conectado' ? 'Invitar' : TEXTO_ESTADO[a.estado]}
                </span>
              </button>
            </li>
          )
        })}
        <li>
          <Link className="amigo-tira amigo-tira-mas" to="/amigos" aria-label={pedidos > 0 ? `Amigos: ${pedidos} ${pedidos === 1 ? 'solicitud' : 'solicitudes'}` : 'Agregar amigos'}>
            <span className="amigo-tira-avatar" aria-hidden="true">
              +{pedidos > 0 && <span className="amigo-tira-pedidos">{pedidos}</span>}
            </span>
            <span className="amigo-tira-nombre">{lista && lista.amigos.length === 0 ? 'Agregar' : 'Ver todos'}</span>
          </Link>
        </li>
      </ul>
    </section>
  )
}
