import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { Carta } from '../componentes/Carta'
import {
  AvisoConexion,
  CabeceraOnline,
  datosUnirse,
  ErrorServidor,
  MensajeError,
  useIrALaMesa,
  useSalirAlDesmontar,
} from '../componentes/Online'
import { TarjetaPerfil, usePerfil } from '../componentes/TarjetaPerfil'
import { ConexionOnline, motivoError } from '../conexion/online'
import { useJuego } from '../estado'

/** Después de "Seguir esperando", la oferta de jugar contra un bot vuelve a aparecer a este tiempo. */
const VOLVER_A_OFRECER_MS = 30_000

function reloj(ms: number): string {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/** Cola pública: un mano a mano con alguien que también esté buscando. */
export function Buscar() {
  const navegar = useNavigate()
  const [perfil, cambiarPerfil] = usePerfil()
  const apodo = perfil.apodo.trim()
  const [conApodoAlAbrir] = useState(() => apodo.length > 0)
  const [buscando, setBuscando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [desde, setDesde] = useState(0)
  const [ahora, setAhora] = useState(() => Date.now())
  const [ofertaOculta, setOfertaOculta] = useState(false)
  const conectada = useJuego((s) => s.conexion?.tipo === 'online')
  const ofrecerBot = useJuego((s) => s.ofrecerBot)
  const enviar = useJuego((s) => s.enviar)
  useIrALaMesa()
  useSalirAlDesmontar()

  const montada = useRef(false)
  useEffect(() => {
    montada.current = true
    return () => void (montada.current = false)
  }, [])

  const buscar = async () => {
    setBuscando(true)
    setError(null)
    setDesde(Date.now())
    try {
      const c = await ConexionOnline.buscarPartida(datosUnirse(perfil))
      // Si ya se fue de la pantalla mientras se conectaba, no se queda en la cola.
      if (!montada.current) return c.salir()
      useJuego.getState().conectar(c)
    } catch (e) {
      setError(motivoError(e))
      setBuscando(false)
    }
  }

  // Con apodo, la búsqueda arranca sola (una vez, aunque React monte dos veces en desarrollo).
  const iniciada = useRef(false)
  useEffect(() => {
    if (!conApodoAlAbrir || iniciada.current) return
    iniciada.current = true
    void buscar()
  }, [])

  useEffect(() => {
    if (!buscando) return
    const t = setInterval(() => setAhora(Date.now()), 1000)
    return () => clearInterval(t)
  }, [buscando])

  useEffect(() => {
    if (!ofertaOculta) return
    const t = setTimeout(() => setOfertaOculta(false), VOLVER_A_OFRECER_MS)
    return () => clearTimeout(t)
  }, [ofertaOculta])

  const cancelar = () => {
    useJuego.getState().salir()
    navegar('/')
  }

  return (
    <div className="pantalla-inicio pantalla-online">
      <CabeceraOnline titulo="Buscar partida" alVolver={cancelar} />
      <AvisoConexion />
      {buscando ? (
        <section className="tarjeta buscando" aria-live="polite">
          <div className="buscando-cartas" aria-hidden="true">
            <Carta oculta tam="chica" />
            <Carta oculta tam="chica" />
            <Carta oculta tam="chica" />
          </div>
          <h2>Buscando rival…</h2>
          <p className="nota">
            Mano a mano con alguien que también esté buscando.
            <br />
            {conectada ? `Esperando hace ${reloj(Math.max(0, ahora - desde))}` : 'Conectando…'}
          </p>
        </section>
      ) : (
        <>
          <TarjetaPerfil perfil={perfil} cambiar={cambiarPerfil} />
          <section className="tarjeta">
            <h2>Mano a mano con desconocidos</h2>
            <p className="nota-izq">Te juntamos con otra persona que esté buscando. Si no aparece nadie, podés jugar contra un bot.</p>
            <button type="button" className="boton boton-grande" disabled={!apodo} onClick={buscar}>
              {error ? 'Probar de nuevo' : 'Buscar partida'}
            </button>
            {!apodo && <p className="nota">Poné tu apodo para buscar partida.</p>}
          </section>
        </>
      )}
      {error && <MensajeError>{error}</MensajeError>}
      {ofrecerBot && !ofertaOculta && (
        <section className="tarjeta oferta-bot" role="dialog" aria-label="No aparece nadie todavía">
          <h2>No aparece nadie todavía</h2>
          <p className="nota-izq">Podés jugar ya contra un bot, o seguir esperando a que llegue alguien.</p>
          <div className="botones-fila">
            <button type="button" className="boton" onClick={() => enviar('jugarContraBot', {})}>
              Jugar contra un bot
            </button>
            <button type="button" className="boton boton-secundario" onClick={() => setOfertaOculta(true)}>
              Seguir esperando
            </button>
          </div>
        </section>
      )}
      <ErrorServidor />
      {buscando && (
        <button type="button" className="boton boton-secundario" onClick={cancelar}>
          Cancelar
        </button>
      )}
    </div>
  )
}
