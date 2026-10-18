import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Avatar } from '../componentes/Avatar'
import { CabeceraOnline, MensajeError } from '../componentes/Online'
import { iniciarCuenta, useCuenta } from '../cuenta/cuenta'
import {
  agregarAmigo,
  borrarAmigo,
  cargarAmigos,
  responderSolicitud,
  useAmigos,
  type Amigo,
  type EstadoAmigo,
  type Persona,
} from '../cuenta/amigos'

export const TEXTO_ESTADO: Record<EstadoAmigo, string> = {
  enSala: 'En una sala, esperando',
  conectado: 'Conectado',
  jugando: 'Jugando',
  desconectado: 'Desconectado',
}

/** Tus amigos: tu código para que te agreguen, las solicitudes y quién está conectado. */
export function Amigos() {
  const navegar = useNavigate()
  const estado = useCuenta((s) => s.estado)
  const lista = useAmigos((s) => s.lista)
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  useEffect(() => void iniciarCuenta(), [])

  // Mientras está abierta, la lista se actualiza sola (quién se conecta, quién entra a una sala).
  useEffect(() => {
    if (estado !== 'adentro') return
    const cargar = () => void cargarAmigos().catch(() => setError('No se pudo traer la lista de amigos.'))
    cargar()
    const t = setInterval(cargar, 15_000)
    return () => clearInterval(t)
  }, [estado])

  const agregar = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setAviso(null)
    const motivo = await agregarAmigo(codigo)
    if (motivo) return setError(motivo)
    setCodigo('')
    setAviso('Listo: le llegó tu solicitud.')
  }
  const accion = async (hacer: Promise<string | null>) => {
    setError((await hacer) ?? null)
  }

  if (estado !== 'adentro') {
    return (
      <div className="pantalla-inicio pantalla-online">
        <CabeceraOnline titulo="Amigos" />
        <section className="tarjeta">
          <p className="nota-izq">{estado === 'cargando' || estado === 'entrando' ? 'Cargando…' : 'Para tener amigos, entrá a tu cuenta desde el inicio.'}</p>
        </section>
      </div>
    )
  }

  return (
    <div className="pantalla-inicio pantalla-online">
      <CabeceraOnline titulo="Amigos" />
      <section className="tarjeta">
        <p className="nota-izq">Tu código de amigo. Pasáselo a quien quieras que te agregue:</p>
        <p className="codigo-amigo">
          <strong>{lista?.codigo ?? '······'}</strong>
          {lista && typeof navigator !== 'undefined' && navigator.clipboard && (
            <button type="button" className="boton-texto" onClick={() => void navigator.clipboard.writeText(lista.codigo).then(() => setAviso('Código copiado.'))}>
              Copiar
            </button>
          )}
        </p>
        <form className="amigos-agregar" onSubmit={(e) => void agregar(e)}>
          <label className="perfil-apodo">
            <span>Agregar con su código</span>
            <input
              value={codigo}
              maxLength={6}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="ABC234"
              onChange={(e) => {
                setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                setError(null)
              }}
            />
          </label>
          <button type="submit" className="boton" disabled={codigo.length !== 6}>
            Agregar
          </button>
        </form>
        {aviso && (
          <p className="nota-izq" role="status">
            {aviso}
          </p>
        )}
        {error && <MensajeError>{error}</MensajeError>}
      </section>

      {lista && lista.recibidas.length > 0 && (
        <section className="tarjeta">
          <h2>Te quieren agregar</h2>
          <ul className="amigos">
            {lista.recibidas.map((p) => (
              <FilaPersona key={p.id} persona={p}>
                <button type="button" className="boton" onClick={() => void accion(responderSolicitud(p.id, true))}>
                  Aceptar
                </button>
                <button type="button" className="boton boton-secundario" onClick={() => void accion(responderSolicitud(p.id, false))}>
                  No
                </button>
              </FilaPersona>
            ))}
          </ul>
        </section>
      )}

      <section className="tarjeta">
        <h2>Tus amigos</h2>
        {!lista && <p className="nota">Cargando…</p>}
        {lista && lista.amigos.length === 0 && <p className="nota-izq">Todavía no tenés amigos agregados.</p>}
        {lista && lista.amigos.length > 0 && (
          <ul className="amigos">
            {lista.amigos.map((a) => (
              <FilaAmigo key={a.id} amigo={a} alUnirse={(sala) => navegar(`/s/${sala}`)} alBorrar={() => void accion(borrarAmigo(a.id))} />
            ))}
          </ul>
        )}
        {lista && lista.enviadas.length > 0 && (
          <>
            <p className="nota-izq">Esperando que acepten:</p>
            <ul className="amigos">
              {lista.enviadas.map((p) => (
                <FilaPersona key={p.id} persona={p}>
                  <button type="button" className="boton boton-secundario" onClick={() => void accion(borrarAmigo(p.id))}>
                    Cancelar
                  </button>
                </FilaPersona>
              ))}
            </ul>
          </>
        )}
      </section>
    </div>
  )
}

function FilaPersona({ persona, detalle, children }: { persona: Persona; detalle?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <li className="amigo">
      <span className="amigo-avatar">
        <Avatar codigo={persona.avatar} apodo={persona.apodo} />
      </span>
      <span className="amigo-nombre">
        {persona.apodo}
        {detalle}
      </span>
      <span className="amigo-acciones">{children}</span>
    </li>
  )
}

function FilaAmigo({ amigo, alUnirse, alBorrar }: { amigo: Amigo; alUnirse: (sala: string) => void; alBorrar: () => void }) {
  const [confirmar, setConfirmar] = useState(false)
  return (
    <FilaPersona
      persona={amigo}
      detalle={
        <small className={`amigo-estado estado-${amigo.estado}`}>
          <span className="amigo-punto" aria-hidden="true" /> {TEXTO_ESTADO[amigo.estado]}
        </small>
      }
    >
      {amigo.sala && (
        <button type="button" className="boton" onClick={() => alUnirse(amigo.sala!)}>
          Unirme
        </button>
      )}
      {confirmar ? (
        <button type="button" className="boton boton-secundario" onClick={alBorrar}>
          ¿Borrar?
        </button>
      ) : (
        <button type="button" className="boton-texto" aria-label={`Borrar a ${amigo.apodo}`} onClick={() => setConfirmar(true)}>
          ✕
        </button>
      )}
    </FilaPersona>
  )
}
