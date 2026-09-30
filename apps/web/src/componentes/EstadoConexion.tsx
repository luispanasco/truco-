import { useState } from 'react'
import { ConexionOnline, motivoError } from '../conexion/online'
import { useJuego } from '../estado'
import { leerPerfil } from '../perfil'

/**
 * Solo online: si se corta la conexión, un aviso fijo mientras el cliente reintenta solo;
 * si se pierde del todo, un modal para volver a entrar a la sala o irse al inicio.
 */
export function EstadoConexion({ alIrAlInicio }: { alIrAlInicio: () => void }) {
  const estado = useJuego((s) => s.estadoConexion)
  const conexion = useJuego((s) => s.conexion)
  const [intentando, setIntentando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!(conexion instanceof ConexionOnline) || estado === 'conectada') return null

  if (estado === 'reconectando') {
    return (
      <div className="aviso-conexion" role="status">
        <span className="aviso-conexion-punto" aria-hidden="true" />
        Se cortó la conexión. Reconectando…
      </div>
    )
  }

  const reintentar = async () => {
    setIntentando(true)
    setError(null)
    try {
      const { invitadoId, apodo, avatar } = leerPerfil()
      const nueva = await ConexionOnline.unirse(conexion.roomId, { invitadoId, apodo, avatar })
      // La conexión vieja ya se cerró: se suelta sin llamar a su salir(), que borraría la
      // partida guardada (la nueva ya la guardó con la misma sala).
      useJuego.setState({ conexion: null })
      useJuego.getState().conectar(nueva)
    } catch (e) {
      setError(motivoError(e))
    } finally {
      setIntentando(false)
    }
  }

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="caida-titulo">
      <div className="modal-caja">
        <div className="fin-emblema chico" aria-hidden="true">
          📡
        </div>
        <h2 id="caida-titulo" className="modal-titulo">
          Se perdió la conexión
        </h2>
        <p className="modal-texto">Mientras tanto juega un bot por vos. Si volvés rápido, recuperás tu lugar.</p>
        {error && <p className="modal-texto conexion-error">{error}</p>}
        <div className="modal-botones">
          <button type="button" className="boton boton-grande" onClick={reintentar} disabled={intentando}>
            {intentando ? 'Conectando…' : 'Volver a intentar'}
          </button>
          <button
            type="button"
            className="boton boton-secundario"
            onClick={() => {
              // Tampoco acá se llama a su salir(): la partida queda guardada para volver desde el inicio.
              useJuego.setState({ conexion: null })
              alIrAlInicio()
            }}
          >
            Ir al inicio
          </button>
        </div>
      </div>
    </div>
  )
}
