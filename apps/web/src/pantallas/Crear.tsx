import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { invitacionPendiente } from '../componentes/Amistad'
import { FormularioSala, opcionesIniciales, opcionesParaServidor } from '../componentes/FormularioSala'
import { CabeceraOnline, datosUnirse, MensajeError } from '../componentes/Online'
import { TarjetaPerfil, usePerfil } from '../componentes/TarjetaPerfil'
import { ConexionOnline, motivoError } from '../conexion/online'
import { useJuego } from '../estado'

/** Armar una sala privada para jugar con amigos. */
export function Crear() {
  const navegar = useNavigate()
  const [perfil, cambiarPerfil] = usePerfil()
  // Si se llega sin apodo (con el link directo), se pide acá mismo.
  const [pedirApodo] = useState(() => !perfil.apodo.trim())
  const [opciones, setOpciones] = useState(() => opcionesIniciales(perfil))
  const [creando, setCreando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const apodo = perfil.apodo.trim()
  // Si se llegó desde "Invitar" en el menú, al amigo se lo invita apenas está la sala.
  const estadoRuta = useLocation().state as unknown
  const invitar = invitacionPendiente(estadoRuta)

  const crear = async () => {
    setCreando(true)
    setError(null)
    // Lo elegido queda como propuesta para la próxima vez.
    cambiarPerfil({
      formato: opciones.formato,
      nivelBots: opciones.nivelBots,
      ayudas: opciones.ayudas,
      picaPica: opciones.reglas.picaPica,
      tiempos: opciones.tiempos,
      seniasHabilitadas: opciones.senias.habilitadas,
      cartasJugadas: opciones.cartasJugadas,
    })
    try {
      const c = await ConexionOnline.crearSala({ ...datosUnirse(perfil), ...opcionesParaServidor(opciones) })
      useJuego.getState().conectar(c)
      navegar('/sala', invitar ? { state: estadoRuta } : undefined)
    } catch (e) {
      setError(motivoError(e))
      setCreando(false)
    }
  }

  return (
    <div className="pantalla-inicio pantalla-online">
      <CabeceraOnline titulo="Crear sala" />
      {pedirApodo && <TarjetaPerfil perfil={perfil} cambiar={cambiarPerfil} />}
      <section className="tarjeta">
        <h2>¿Cómo se juega?</h2>
        <FormularioSala valor={opciones} alCambiar={setOpciones} />
      </section>
      {error && <MensajeError>{error}</MensajeError>}
      <button type="button" className="boton boton-grande" disabled={!apodo || creando} onClick={crear}>
        {creando ? 'Creando…' : 'Crear sala'}
      </button>
      {!apodo && <p className="nota">Poné tu apodo para crear la sala.</p>}
      <p className="nota">
        {invitar
          ? `Al crearla, le llega tu invitación a ${invitar.apodo}.`
          : 'Después te damos un código y un link para pasarle a los demás.'}
      </p>
    </div>
  )
}
