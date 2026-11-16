import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router'
import type { Formato } from '@truco/engine'
import { Carta } from '../componentes/Carta'
import { FORMATOS } from '../componentes/FormularioSala'
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

const formatoDe = (x: string | null): Formato => (x === '2v2' || x === '3v3' ? x : '1v1')

/**
 * Cola pública: una partida con gente que también esté buscando, en el formato de la dirección
 * (`?formato=2v2`). Si llegás con tu grupo desde una sala (`state.sumarseA`), entrás a la sala de la
 * cola donde les guardaron lugar del mismo lado.
 */
export function Buscar() {
  const navegar = useNavigate()
  const [parametros, setParametros] = useSearchParams()
  const sumarseA = (useLocation().state as { sumarseA?: string } | null)?.sumarseA ?? null
  const sala = useJuego((s) => s.sala)
  const formato = sala?.publica ? sala.formato : formatoDe(parametros.get('formato'))
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
      const c = sumarseA ? await ConexionOnline.sumarseALaCola(sumarseA, datosUnirse(perfil)) : await ConexionOnline.buscarPartida(datosUnirse(perfil), formato)
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

  const total = FORMATOS.find(([f]) => f === formato)![2]
  const lugares = sala?.publica ? sala.lugares : null
  const llegaron = lugares?.filter((l) => l.tipo === 'humano').length ?? 0
  const titulo = formato === '1v1' ? 'Buscando rival…' : sumarseA ? 'Buscando rivales para tu grupo…' : 'Buscando gente…'
  const detalle =
    formato === '1v1'
      ? 'Mano a mano con alguien que también esté buscando.'
      : `${total} con gente que también esté buscando.${lugares ? ` Ya están ${llegaron} de ${lugares.length}.` : ''}`

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
          <h2>{titulo}</h2>
          <p className="nota">
            {detalle}
            <br />
            {conectada ? `Esperando hace ${reloj(Math.max(0, ahora - desde))}` : 'Conectando…'}
          </p>
        </section>
      ) : (
        <>
          <TarjetaPerfil perfil={perfil} cambiar={cambiarPerfil} />
          <section className="tarjeta">
            <h2>Jugar con gente que esté buscando</h2>
            <div className="segmentado" role="group" aria-label="Formato">
              {FORMATOS.map(([f, t, sub]) => (
                <button key={f} type="button" className={formato === f ? 'elegido' : ''} onClick={() => setParametros({ formato: f }, { replace: true })}>
                  <strong>{t}</strong>
                  <small>{sub}</small>
                </button>
              ))}
            </div>
            <p className="nota-izq">
              {formato === '1v1'
                ? 'Te juntamos con otra persona que esté buscando. Si no aparece nadie, podés jugar contra un bot.'
                : 'Te sentamos con gente que esté buscando. Para jugar con tus amigos del mismo lado, armá una sala y tocá “Buscar rivales”.'}
            </p>
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
          <p className="nota-izq">
            {formato === '1v1'
              ? 'Podés jugar ya contra un bot, o seguir esperando a que llegue alguien.'
              : 'Podés empezar ya y completar los lugares que faltan con bots, o seguir esperando. Con bots no cuenta para el Elo.'}
          </p>
          <div className="botones-fila">
            <button type="button" className="boton" onClick={() => enviar('jugarContraBot', {})}>
              {formato === '1v1' ? 'Jugar contra un bot' : 'Completar con bots'}
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
