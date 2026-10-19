import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { Nivel } from '@truco/bots'
import type { Formato } from '@truco/engine'
import { AmigosConectados } from '../componentes/Amistad'
import { Carta } from '../componentes/Carta'
import { datosUnirse, destinoAlEntrar, MensajeError } from '../componentes/Online'
import { ConexionOnline, descartarPartidaGuardada, leerPartidaGuardada, motivoError } from '../conexion/online'
import { FORMATOS, NIVELES } from '../componentes/FormularioSala'
import { useJuego } from '../estado'
import { leerPerfil, MODOS_JUGAR, type Perfil } from '../perfil'
import { conexionContraLaCompu } from './contraLaCompu'
import { IconoBuscar, IconoCompu, IconoCrear, IconoLlave } from './Iconos'

/** Un botón chico del menú (crear sala, unirme): ícono y título, con la explicación debajo. */
function BotonChico({
  icono,
  titulo,
  detalle,
  deshabilitado,
  alTocar,
}: {
  icono: ReactNode
  titulo: string
  detalle: string
  deshabilitado: boolean
  alTocar: () => void
}) {
  return (
    <button type="button" className="boton-chico" disabled={deshabilitado} onClick={alTocar}>
      <span className="boton-chico-icono" aria-hidden="true">
        {icono}
      </span>
      <span className="boton-chico-texto">
        <strong>{titulo}</strong>
        <small>{detalle}</small>
      </span>
    </button>
  )
}

/** Si quedó una partida online a medias (se recargó o se cerró la app), se ofrece volver. */
function PartidaEnCurso({ perfil, enLinea }: { perfil: Perfil; enLinea: boolean }) {
  const navegar = useNavigate()
  const [partida, setPartida] = useState(leerPartidaGuardada)
  const [volviendo, setVolviendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!partida && !error) return null

  /** Vuelve a la partida guardada; si no se pudo, queda el motivo. */
  const volver = async () => {
    setVolviendo(true)
    setError(null)
    const guardada = leerPartidaGuardada()
    if (!guardada) {
      setError('Esa partida ya no está disponible.')
      setPartida(null)
      return setVolviendo(false)
    }
    try {
      const c = await ConexionOnline.unirse(guardada.roomId, datosUnirse(perfil))
      useJuego.getState().conectar(c)
      navegar(destinoAlEntrar())
    } catch (e) {
      const motivo = motivoError(e)
      // Si la sala ya no existe (terminó o se cerró), no tiene sentido seguir ofreciéndola.
      if (motivo === 'No existe una sala con ese código.') {
        descartarPartidaGuardada()
        setError('Esa partida ya terminó o se cerró.')
      } else setError(motivo)
      setVolviendo(false)
      if (!leerPartidaGuardada()) setPartida(null)
    }
  }

  return (
    <section className="tarjeta partida-en-curso">
      <h2>Tenés una partida en curso</h2>
      {partida ? (
        <>
          <p className="nota-izq">
            {partida.publica ? 'Un mano a mano online' : `La sala ${partida.roomId}`}: mientras no estás, juega un bot por vos.
          </p>
          {error && <MensajeError>{error}</MensajeError>}
          <div className="botones-fila botones-volver">
            <button type="button" className="boton" disabled={!perfil.apodo.trim() || volviendo || !enLinea} onClick={() => void volver()}>
              {volviendo ? 'Volviendo…' : enLinea ? 'Volver a la partida' : 'Volver a la partida · Sin conexión'}
            </button>
            <button
              type="button"
              className="boton boton-secundario"
              disabled={volviendo}
              onClick={() => {
                descartarPartidaGuardada()
                setPartida(null)
              }}
            >
              Descartar
            </button>
          </div>
        </>
      ) : (
        <MensajeError>{error}</MensajeError>
      )}
    </section>
  )
}

const NOMBRE_FORMATO = Object.fromEntries(FORMATOS.map(([f, t]) => [f, t])) as Record<Formato, string>
const NOMBRE_NIVEL = Object.fromEntries(NIVELES) as Record<Nivel, string>

/**
 * La pantalla del medio del menú, la que abre, como en los juegos de celular: arriba el nombre,
 * al medio el modo (contra la compu o buscar partida, con flechas o deslizando) y el botón grande
 * de jugar; debajo, crear sala y unirme con código, y tus amigos conectados.
 */
export function PanelJugar({
  perfil,
  cambiar,
  enLinea,
  conApodo,
  alConfigurarCompu,
}: {
  perfil: Perfil
  cambiar: (p: Partial<Perfil>) => void
  enLinea: boolean
  /** Hace lo pedido; sin apodo, antes lo pide. */
  conApodo: (accion: () => void) => void
  /** Ir a elegir el formato, el nivel y las reglas de contra la compu (el lobby). */
  alConfigurarCompu: () => void
}) {
  const navegar = useNavigate()
  const sinMovimiento = useReducedMotion() ?? false
  const i = MODOS_JUGAR.indexOf(perfil.modoJugar)
  // Para qué lado entra el modo nuevo: 1 desde la derecha, -1 desde la izquierda.
  const [sentido, setSentido] = useState(1)
  const cambiarModo = (paso: number) => {
    setSentido(paso)
    cambiar({ modoJugar: MODOS_JUGAR[(i + paso + MODOS_JUGAR.length) % MODOS_JUGAR.length]! })
  }
  const modo = perfil.modoJugar
  const sinRed = modo === 'buscar' && !enLinea
  const detalle = (texto: string) => (enLinea ? texto : 'Sin conexión')

  const jugar = () =>
    conApodo(() => {
      if (modo === 'buscar') return navegar('/buscar')
      useJuego.getState().conectar(conexionContraLaCompu(leerPerfil()))
      navegar('/mesa')
    })

  return (
    <>
      <PartidaEnCurso perfil={perfil} enLinea={enLinea} />

      <header className="jugar-logo">
        <div className="abanico" aria-hidden="true">
          <Carta carta={{ numero: 7, palo: 'oro' }} />
          <Carta carta={{ numero: 1, palo: 'espada' }} />
          <Carta carta={{ numero: 1, palo: 'basto' }} />
        </div>
        <h1>Truco</h1>
        <p className="subtitulo">uruguayo · con muestra, piezas y flor</p>
      </header>

      <div className="jugar-centro">
        <div className="selector-modo" role="group" aria-label="Modo de juego">
          <button type="button" className="selector-modo-flecha" aria-label="Modo anterior" onClick={() => cambiarModo(-1)}>
            ‹
          </button>
          <div className="selector-modo-ventana">
            <AnimatePresence initial={false} mode="popLayout" custom={sentido}>
              <motion.div
                key={modo}
                className="selector-modo-modo"
                custom={sentido}
                variants={{
                  entra: (d: number) => ({ x: sinMovimiento ? 0 : `${d * 60}%`, opacity: 0 }),
                  quieto: { x: 0, opacity: 1 },
                  sale: (d: number) => ({ x: sinMovimiento ? 0 : `${-d * 60}%`, opacity: 0 }),
                }}
                initial="entra"
                animate="quieto"
                exit="sale"
                transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                drag={sinMovimiento ? false : 'x'}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.35}
                onDragEnd={(_, info) => {
                  if (info.offset.x < -45) cambiarModo(1)
                  else if (info.offset.x > 45) cambiarModo(-1)
                }}
              >
                <span className="selector-modo-icono" aria-hidden="true">
                  {modo === 'compu' ? <IconoCompu /> : <IconoBuscar />}
                </span>
                <strong aria-live="polite">{modo === 'compu' ? 'Contra la compu' : 'Buscar partida'}</strong>
                {modo === 'compu' ? (
                  <button
                    type="button"
                    className="selector-modo-detalle"
                    onClick={alConfigurarCompu}
                    aria-label={`Cambiar formato y nivel (${NOMBRE_FORMATO[perfil.formato]}, ${NOMBRE_NIVEL[perfil.nivelBots]})`}
                  >
                    {NOMBRE_FORMATO[perfil.formato]} · {NOMBRE_NIVEL[perfil.nivelBots]} <span aria-hidden="true">›</span>
                  </button>
                ) : (
                  <span className="selector-modo-detalle">{detalle('Mano a mano online, con Elo')}</span>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          <button type="button" className="selector-modo-flecha" aria-label="Modo siguiente" onClick={() => cambiarModo(1)}>
            ›
          </button>
        </div>
        <div className="selector-modo-puntos" aria-hidden="true">
          {MODOS_JUGAR.map((m) => (
            <span key={m} className={m === modo ? 'activo' : ''} />
          ))}
        </div>

        <button type="button" className="boton-jugar-grande" disabled={sinRed} onClick={jugar}>
          ¡Jugar!
        </button>
      </div>

      <div className="jugar-secundarios">
        <BotonChico
          icono={<IconoCrear />}
          titulo="Crear sala"
          detalle={detalle('Con tus amigos')}
          deshabilitado={!enLinea}
          alTocar={() => conApodo(() => navegar('/crear'))}
        />
        <BotonChico
          icono={<IconoLlave />}
          titulo="Unirme con código"
          detalle={detalle('A la sala de otro')}
          deshabilitado={!enLinea}
          alTocar={() => conApodo(() => navegar('/unirme'))}
        />
      </div>
      {!enLinea && (
        <p className="sin-conexion" role="status">
          <span aria-hidden="true">📵</span> Sin conexión: lo online vuelve cuando haya internet. Contra la compu se juega igual.
        </p>
      )}

      <AmigosConectados deshabilitado={!enLinea} conApodo={conApodo} />
    </>
  )
}

/** Una tarjeta chica del menú con un ícono, un título y un texto. */
export function AvisoMenu({ icono, titulo, children }: { icono: string; titulo: string; children: ReactNode }) {
  return (
    <section className="tarjeta aviso-menu">
      <span className="aviso-menu-icono" aria-hidden="true">
        {icono}
      </span>
      <div>
        <h2>{titulo}</h2>
        <p className="nota-izq">{children}</p>
      </div>
    </section>
  )
}
