import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { useNavigate } from 'react-router'
import { diaDeTienda, TODO_PERMITIDO, type DestinoMision } from '@truco/shared'
import { mostrarBaraja } from '../baraja'
import { EditorAvatar } from '../componentes/EditorAvatar'
import { Hoja } from '../componentes/Hoja'
import { TarjetaCuenta } from '../componentes/TarjetaCuenta'
import { VisorMazo } from '../componentes/VisorMazo'
import { usePerfil } from '../componentes/TarjetaPerfil'
import { useCuenta } from '../cuenta/cuenta'
import { useHayParaCobrar } from '../cuenta/misiones'
import { cargarGrupos, useHayNovedadesEnGrupos } from '../cuenta/grupos'
import { useEnLinea } from '../enLinea'
import { Ajustes } from '../menu/Ajustes'
import { Banner } from '../menu/Banner'
import { IconoGrupos, IconoJugar, IconoLobby, IconoPercha, IconoTienda } from '../menu/Iconos'
import { PanelGrupos } from '../menu/PanelGrupos'
import { PanelJugar } from '../menu/PanelJugar'
import { PanelLobby } from '../menu/PanelLobby'
import { PanelPersonalizar } from '../menu/PanelPersonalizar'
import { aplicarMesa } from '../temaMesa'
import { aplicarTipografia } from '../temaTipografia'
import { VitrinaDelDia } from './Tienda'
import { RecorridoMenu } from '../recorrido/RecorridoMenu'
import '../menu/estilos-menu.css'

/** Las cinco pantallas del menú, de izquierda a derecha. Abre en la del medio: jugar. */
const PANELES = [
  { id: 'avatar', titulo: 'Avatar', Icono: IconoPercha },
  { id: 'tienda', titulo: 'Tienda', Icono: IconoTienda },
  { id: 'jugar', titulo: 'Jugar', Icono: IconoJugar },
  { id: 'lobby', titulo: 'Lobby', Icono: IconoLobby },
  { id: 'grupos', titulo: 'Grupos', Icono: IconoGrupos },
] as const
const JUGAR = 2
/** En la compu van a la vista solo las del medio (tienda, jugar y lobby); las otras dos se abren en hojas. */
const DE_LOS_COSTADOS = new Set<string>(['avatar', 'grupos'])

/** En qué pantalla quedó el menú: al volver de una sala o del ranking, se vuelve a la misma (hasta recargar). */
let ultimoPanel = JUGAR

/** El último día en que miraste la tienda: si cambió la vitrina desde entonces, la barra avisa. */
const CLAVE_TIENDA_VISTA = 'truco.tiendaVista'

function leerTiendaVista(): string | null {
  try {
    return localStorage.getItem(CLAVE_TIENDA_VISTA)
  } catch {
    return null
  }
}

/** Con pantalla ancha (la compu), las tres pantallas van una al lado de la otra, sin deslizar. */
const ANCHO = '(min-width: 1100px)'
function suscribirAncho(avisar: () => void) {
  if (typeof matchMedia !== 'function') return () => {}
  const m = matchMedia(ANCHO)
  m.addEventListener('change', avisar)
  return () => m.removeEventListener('change', avisar)
}
const esAncha = () => typeof matchMedia === 'function' && matchMedia(ANCHO).matches

type HojaMenu = 'perfil' | 'cuenta' | 'ajustes' | 'apodo' | 'cartas' | 'avatar' | 'grupos' | null

/**
 * El menú principal, como en los juegos de celular: el banner con tu cuenta arriba, cinco
 * pantallas que se deslizan con el dedo (avatar, tienda, jugar, lobby y grupos) y la barra de abajo
 * para saltar de una a otra. Deslizar es scroll horizontal con "snap": lo hace el navegador,
 * así se siente como en una app.
 */
export function Inicio() {
  const [perfil, cambiar] = usePerfil()
  const enLinea = useEnLinea()
  const adentro = useCuenta((s) => s.estado === 'adentro')
  const ancha = useSyncExternalStore(suscribirAncho, esAncha, () => false)
  const sinMovimiento = useReducedMotion() ?? false
  const [actual, setActual] = useState(ultimoPanel)
  const [hoja, setHoja] = useState<HojaMenu>(null)
  const carril = useRef<HTMLDivElement>(null)
  const cerrarHoja = useCallback(() => setHoja(null), [])
  // Lo que se quería hacer cuando se pidió el apodo: se hace al ponerlo.
  const pendiente = useRef<(() => void) | null>(null)
  const conApodo = (accion: () => void) => {
    if (perfil.apodo.trim()) return accion()
    pendiente.current = accion
    setHoja('apodo')
  }
  const listoApodo = () => {
    if (!perfil.apodo.trim()) return
    setHoja(null)
    const accion = pendiente.current
    pendiente.current = null
    accion?.()
  }

  // Al elegir otra mesa, toda la app cambia de color en el momento. El perfil ya trae solo lo
  // que se puede usar (con la tienda de prueba, también lo pago). Al volver de una sala, que
  // tenía la mesa y la baraja del anfitrión, vuelven las tuyas.
  useEffect(() => aplicarMesa(perfil.mesa, TODO_PERMITIDO), [perfil.mesa])
  useEffect(() => mostrarBaraja(perfil.baraja), [perfil.baraja])
  // La tipografía es solo tuya (no cambia en las salas): se aplica al elegirla.
  useEffect(() => aplicarTipografia(perfil.tipografia, TODO_PERMITIDO), [perfil.tipografia])

  // Al entrar a la cuenta desde la hoja, la hoja se cierra sola.
  useEffect(() => {
    if (adentro) setHoja((h) => (h === 'cuenta' ? null : h))
  }, [adentro])

  // Al llegar, el carril se para en la pantalla que corresponde, sin animar.
  useLayoutEffect(() => {
    const c = carril.current
    if (c && !ancha) c.scrollLeft = ultimoPanel * c.clientWidth
  }, [ancha])

  const fijar = (i: number) => {
    ultimoPanel = i
    setActual(i)
  }

  // Las pantallas de los costados no están en la compu: si quedó una, se vuelve a jugar.
  useEffect(() => {
    if (ancha && DE_LOS_COSTADOS.has(PANELES[actual]!.id)) fijar(JUGAR)
  }, [ancha, actual])

  /** Al deslizar con el dedo: la pantalla que quedó más a la vista. */
  const alDeslizar = () => {
    const c = carril.current
    if (!c || c.clientWidth === 0 || ancha) return
    const i = Math.max(0, Math.min(PANELES.length - 1, Math.round(c.scrollLeft / c.clientWidth)))
    if (i !== actual) fijar(i)
  }

  // Mirar la tienda (o tenerla a la vista, en la compu) apaga su aviso hasta que cambie la vitrina.
  const [tiendaVista, setTiendaVista] = useState(leerTiendaVista)
  const hoy = diaDeTienda(new Date())
  useEffect(() => {
    if (!ancha && PANELES[actual]!.id !== 'tienda') return
    try {
      localStorage.setItem(CLAVE_TIENDA_VISTA, hoy)
    } catch {
      // Sin almacenamiento, el aviso vuelve a aparecer al recargar: no pasa nada.
    }
    setTiendaVista(hoy)
  }, [actual, ancha, hoy])
  const hayParaCobrar = useHayParaCobrar()
  const hayNovedadesEnGrupos = useHayNovedadesEnGrupos()
  // En la compu Grupos es una hoja (no está montada): la lista, para su aviso, se pide igual.
  useEffect(() => {
    if (adentro && ancha) void cargarGrupos().catch(() => {})
  }, [adentro, ancha])
  /** Las pantallas con algo nuevo: un puntito en su pestaña. */
  const conAviso: Record<string, boolean> = { jugar: hayParaCobrar, tienda: tiendaVista !== hoy, grupos: hayNovedadesEnGrupos }

  /** Desde la barra de abajo (o el banner): desliza hasta esa pantalla. */
  const irA = (i: number) => {
    fijar(i)
    const c = carril.current
    if (c && !ancha) c.scrollTo?.({ left: i * c.clientWidth, behavior: sinMovimiento ? 'auto' : 'smooth' })
  }

  /** "Ir" de una misión: a donde se hace. */
  const navegar = useNavigate()
  const irAMision = (destino: DestinoMision) => {
    if (destino === 'jugar') return conApodo(() => navegar('/buscar'))
    if (destino === 'historia') return navegar('/historia')
    if (destino === 'aprender') return navegar('/aprender')
    if (destino === 'amigos') return navegar('/amigos')
    if (destino === 'tienda') return irA(PANELES.findIndex((p) => p.id === 'tienda'))
    if (ancha) setHoja('grupos')
    else irA(PANELES.findIndex((p) => p.id === 'grupos'))
  }

  /** Flechas en la barra, como en cualquier grupo de pestañas. */
  const alTeclado = (e: KeyboardEvent) => {
    const paso = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!paso) return
    e.preventDefault()
    const i = (actual + paso + PANELES.length) % PANELES.length
    irA(i)
    document.getElementById(`pestania-${PANELES[i]!.id}`)?.focus()
  }

  const contenido = [
    <>
      <h2 className="panel-titulo">Personalizá</h2>
      <PanelPersonalizar perfil={perfil} cambiar={cambiar} alEditarAvatar={() => setHoja('perfil')} alVerCartas={() => setHoja('cartas')} />
    </>,
    <>
      <h2 className="panel-titulo">Tienda</h2>
      <VitrinaDelDia alEntrar={() => setHoja('cuenta')} />
    </>,
    <PanelJugar
      perfil={perfil}
      cambiar={cambiar}
      enLinea={enLinea}
      conApodo={conApodo}
      alConfigurarCompu={() => irA(3)}
      alIrMision={irAMision}
      alEntrar={() => setHoja('cuenta')}
    />,
    <PanelLobby perfil={perfil} cambiar={cambiar} conApodo={conApodo} />,
    <>
      <h2 className="panel-titulo">Grupos</h2>
      <PanelGrupos alEntrar={() => setHoja('cuenta')} />
    </>,
  ]

  return (
    <div className={`menu${ancha ? ' menu-ancho' : ''}`}>
      <Banner
        perfil={perfil}
        alEditarPerfil={() => setHoja('perfil')}
        alEntrar={() => setHoja('cuenta')}
        alAjustes={() => setHoja('ajustes')}
        alTienda={() => irA(1)}
        {...(ancha && { alPersonalizar: () => setHoja('avatar'), alGrupos: () => setHoja('grupos') })}
      />

      <div className="menu-carril" ref={carril} onScroll={alDeslizar}>
        {PANELES.map((p, i) =>
          ancha && DE_LOS_COSTADOS.has(p.id) ? null : (
            <section
              key={p.id}
              id={`panel-${p.id}`}
              className={`menu-panel panel-${p.id}`}
              role={ancha ? 'region' : 'tabpanel'}
              {...(ancha ? { 'aria-label': p.titulo } : { 'aria-labelledby': `pestania-${p.id}` })}
              // Las de los costados no se alcanzan con el teclado mientras no están a la vista.
              inert={!ancha && i !== actual}
            >
              <div className="menu-panel-contenido">{contenido[i]}</div>
            </section>
          ),
        )}
      </div>

      {!ancha && (
        <nav className="menu-barra" aria-label="Menú">
          <div className="menu-barra-pestanias" role="tablist" aria-label="Pantallas del menú" onKeyDown={alTeclado}>
            {PANELES.map((p, i) => (
              <button
                key={p.id}
                id={`pestania-${p.id}`}
                type="button"
                role="tab"
                aria-selected={i === actual}
                aria-controls={`panel-${p.id}`}
                aria-label={p.titulo}
                title={p.titulo}
                tabIndex={i === actual ? 0 : -1}
                className={`menu-pestania pestania-${p.id}${i === actual ? ' activa' : ''}`}
                onClick={() => irA(i)}
              >
                {i === actual && <motion.span layoutId="menu-pestania-activa" className="menu-pestania-marca" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                <p.Icono clase="menu-pestania-icono" />
                {conAviso[p.id] && <span className="menu-pestania-aviso" aria-hidden="true" />}
                <span className="menu-pestania-nombre" aria-hidden="true">
                  {p.titulo}
                </span>
              </button>
            ))}
          </div>
        </nav>
      )}

      <RecorridoMenu paneles={PANELES.map((p) => p.id)} irA={irA} alCerrarHoja={cerrarHoja} alEntrar={() => setHoja('cuenta')} />

      {hoja === 'perfil' && (
        <Hoja titulo="Tu perfil" alCerrar={cerrarHoja} clase="hoja-avatar hoja-perfil" claseFondo="hoja-fija">
          <label className="perfil-apodo">
            <span>Tu apodo</span>
            <input value={perfil.apodo} maxLength={20} placeholder="¿Cómo te dicen?" onChange={(e) => cambiar({ apodo: e.target.value })} />
          </label>
          <EditorAvatar
            codigo={perfil.avatar}
            apodo={perfil.apodo}
            alCambiar={(avatar) => cambiar({ avatar })}
            tiendaDesbloqueada={perfil.tiendaDesbloqueada}
          />
          <button type="button" className="boton" onClick={cerrarHoja}>
            Listo
          </button>
        </Hoja>
      )}
      {hoja === 'apodo' && (
        <Hoja titulo="¿Cómo te dicen?" alCerrar={cerrarHoja} clase="hoja-menu hoja-apodo" claseFondo="hoja-fija">
          <form
            className="hoja-menu-contenido"
            onSubmit={(e) => {
              e.preventDefault()
              listoApodo()
            }}
          >
            <p className="nota-izq">Es el nombre que ven los demás en la mesa. Lo cambiás cuando quieras tocando tu avatar.</p>
            <label className="perfil-apodo">
              <span>Tu apodo</span>
              <input autoFocus value={perfil.apodo} maxLength={20} placeholder="¿Cómo te dicen?" onChange={(e) => cambiar({ apodo: e.target.value })} />
            </label>
            <button type="submit" className="boton boton-grande boton-relieve" disabled={!perfil.apodo.trim()}>
              ¡A jugar!
            </button>
          </form>
        </Hoja>
      )}
      {hoja === 'cuenta' && (
        <Hoja titulo="Entrar a tu cuenta" alCerrar={cerrarHoja} clase="hoja-menu" claseFondo="hoja-fija">
          <div className="hoja-menu-contenido">
            <TarjetaCuenta sinEnlaces />
          </div>
        </Hoja>
      )}
      {hoja === 'cartas' && <VisorMazo baraja={perfil.baraja} alCerrar={cerrarHoja} />}
      {hoja === 'avatar' && (
        <Hoja titulo="Personalizá" alCerrar={cerrarHoja} clase="hoja-menu hoja-ajustes" claseFondo="hoja-fija">
          <div className="hoja-menu-contenido">
            <PanelPersonalizar perfil={perfil} cambiar={cambiar} alEditarAvatar={() => setHoja('perfil')} alVerCartas={() => setHoja('cartas')} />
          </div>
        </Hoja>
      )}
      {hoja === 'grupos' && (
        <Hoja titulo="Grupos" alCerrar={cerrarHoja} clase="hoja-menu" claseFondo="hoja-fija">
          <div className="hoja-menu-contenido">
            <PanelGrupos alEntrar={() => setHoja('cuenta')} />
          </div>
        </Hoja>
      )}
      {hoja === 'ajustes' && (
        <Hoja titulo="Ajustes" alCerrar={cerrarHoja} clase="hoja-menu hoja-ajustes" claseFondo="hoja-fija">
          <div className="hoja-menu-contenido">
            <Ajustes perfil={perfil} cambiar={cambiar} />
          </div>
        </Hoja>
      )}
    </div>
  )
}
