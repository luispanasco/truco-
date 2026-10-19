import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import { TODO_PERMITIDO } from '@truco/shared'
import { mostrarBaraja } from '../baraja'
import { EditorAvatar } from '../componentes/EditorAvatar'
import { Hoja } from '../componentes/Hoja'
import { TarjetaCuenta } from '../componentes/TarjetaCuenta'
import { usePerfil } from '../componentes/TarjetaPerfil'
import { useCuenta } from '../cuenta/cuenta'
import { useEnLinea } from '../enLinea'
import { Ajustes } from '../menu/Ajustes'
import { Banner } from '../menu/Banner'
import { PanelJugar } from '../menu/PanelJugar'
import { PanelLobby } from '../menu/PanelLobby'
import { aplicarMesa } from '../temaMesa'
import { aplicarTipografia } from '../temaTipografia'
import { VitrinaDelDia } from './Tienda'
import '../menu/estilos-menu.css'

/** Las tres pantallas del menú, de izquierda a derecha. Abre en la del medio: jugar online. */
const PANELES = [
  { id: 'tienda', titulo: 'Tienda', icono: '🛒' },
  { id: 'jugar', titulo: 'Jugar', icono: '🃏' },
  { id: 'lobby', titulo: 'Lobby', icono: '🏠' },
] as const
const JUGAR = 1

/** En qué pantalla quedó el menú: al volver de una sala o del ranking, se vuelve a la misma (hasta recargar). */
let ultimoPanel = JUGAR

/** Con pantalla ancha (la compu), las tres pantallas van una al lado de la otra, sin deslizar. */
const ANCHO = '(min-width: 1100px)'
function suscribirAncho(avisar: () => void) {
  if (typeof matchMedia !== 'function') return () => {}
  const m = matchMedia(ANCHO)
  m.addEventListener('change', avisar)
  return () => m.removeEventListener('change', avisar)
}
const esAncha = () => typeof matchMedia === 'function' && matchMedia(ANCHO).matches

type HojaMenu = 'perfil' | 'cuenta' | 'ajustes' | null

/**
 * El menú principal, como en los juegos de celular: el banner con tu cuenta arriba, tres
 * pantallas que se deslizan con el dedo (tienda, jugar online y lobby) y la barra de abajo
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

  /** Al deslizar con el dedo: la pantalla que quedó más a la vista. */
  const alDeslizar = () => {
    const c = carril.current
    if (!c || c.clientWidth === 0 || ancha) return
    const i = Math.max(0, Math.min(PANELES.length - 1, Math.round(c.scrollLeft / c.clientWidth)))
    if (i !== actual) fijar(i)
  }

  /** Desde la barra de abajo (o el banner): desliza hasta esa pantalla. */
  const irA = (i: number) => {
    fijar(i)
    const c = carril.current
    if (c && !ancha) c.scrollTo?.({ left: i * c.clientWidth, behavior: sinMovimiento ? 'auto' : 'smooth' })
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
      <h2 className="panel-titulo">Tienda</h2>
      <VitrinaDelDia alEntrar={() => setHoja('cuenta')} />
    </>,
    <PanelJugar perfil={perfil} cambiar={cambiar} enLinea={enLinea} alEntrar={() => setHoja('cuenta')} />,
    <PanelLobby perfil={perfil} cambiar={cambiar} />,
  ]

  return (
    <div className={`menu${ancha ? ' menu-ancho' : ''}`}>
      <Banner
        perfil={perfil}
        alEditarPerfil={() => setHoja('perfil')}
        alEntrar={() => setHoja('cuenta')}
        alAjustes={() => setHoja('ajustes')}
        alTienda={() => irA(0)}
      />

      <div className="menu-carril" ref={carril} onScroll={alDeslizar}>
        {PANELES.map((p, i) => (
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
        ))}
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
                tabIndex={i === actual ? 0 : -1}
                className={`menu-pestania${i === actual ? ' activa' : ''}`}
                onClick={() => irA(i)}
              >
                {i === actual && <motion.span layoutId="menu-pestania-activa" className="menu-pestania-fondo" transition={{ type: 'spring', stiffness: 500, damping: 38 }} />}
                <span className="menu-pestania-icono" aria-hidden="true">
                  {p.icono}
                </span>
                <span className="menu-pestania-titulo">{p.titulo}</span>
              </button>
            ))}
          </div>
        </nav>
      )}

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
      {hoja === 'cuenta' && (
        <Hoja titulo="Entrar a tu cuenta" alCerrar={cerrarHoja} clase="hoja-menu" claseFondo="hoja-fija">
          <div className="hoja-menu-contenido">
            <TarjetaCuenta sinEnlaces />
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
