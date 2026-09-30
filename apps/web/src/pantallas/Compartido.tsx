import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { CabeceraOnline, datosUnirse, destinoAlEntrar, MensajeError } from '../componentes/Online'
import { TarjetaPerfil, usePerfil } from '../componentes/TarjetaPerfil'
import { ConexionOnline, motivoError } from '../conexion/online'
import { useJuego } from '../estado'

/** El link para compartir (/s/CODIGO): con apodo entra directo; si no, lo pide primero. */
export function Compartido() {
  const navegar = useNavigate()
  const codigo = (useParams().codigo ?? '').toUpperCase()
  const [perfil, cambiarPerfil] = usePerfil()
  const [entrando, setEntrando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const apodo = perfil.apodo.trim()

  const entrar = async () => {
    setEntrando(true)
    setError(null)
    try {
      const c = await ConexionOnline.unirse(codigo, datosUnirse(perfil))
      useJuego.getState().conectar(c)
      navegar(destinoAlEntrar(), { replace: true })
    } catch (e) {
      setError(motivoError(e))
      setEntrando(false)
    }
  }

  // Con apodo, se entra solo al abrir el link (una vez, aunque React monte dos veces en desarrollo).
  const [conApodoAlAbrir] = useState(() => apodo.length > 0)
  const intentado = useRef(false)
  useEffect(() => {
    if (!conApodoAlAbrir || intentado.current) return
    intentado.current = true
    void entrar()
  }, [])

  return (
    <div className="pantalla-inicio pantalla-online">
      <CabeceraOnline titulo="Te invitaron" />
      <section className="tarjeta invitacion">
        <span className="invitacion-texto">Sala</span>
        <strong className="codigo-sala codigo-mediano">{codigo}</strong>
        {conApodoAlAbrir && entrando && <p className="nota">Entrando…</p>}
        {!conApodoAlAbrir && <p className="nota">Elegí cómo te van a ver en la mesa y entrá.</p>}
      </section>
      {!conApodoAlAbrir && <TarjetaPerfil perfil={perfil} cambiar={cambiarPerfil} />}
      {error && <MensajeError>{error}</MensajeError>}
      {(!conApodoAlAbrir || error) && (
        <button type="button" className="boton boton-grande" disabled={!apodo || entrando} onClick={entrar}>
          {entrando ? 'Entrando…' : error ? 'Probar de nuevo' : 'Entrar a la sala'}
        </button>
      )}
      {!apodo && <p className="nota">Poné tu apodo para entrar.</p>}
      {error && (
        <button type="button" className="boton boton-secundario" onClick={() => navegar('/')}>
          Ir al inicio
        </button>
      )}
    </div>
  )
}
