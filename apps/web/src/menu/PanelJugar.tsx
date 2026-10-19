import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { motion } from 'motion/react'
import { AmigosConectados } from '../componentes/Amistad'
import { Carta } from '../componentes/Carta'
import { datosUnirse, destinoAlEntrar, MensajeError } from '../componentes/Online'
import { ConexionOnline, descartarPartidaGuardada, leerPartidaGuardada, motivoError } from '../conexion/online'
import { useCuenta } from '../cuenta/cuenta'
import { useJuego } from '../estado'
import type { Perfil } from '../perfil'
import { IconoBuscar, IconoCrear, IconoLlave } from './Iconos'

/** Un botón grande del menú, con relieve: ícono, título y una línea que explica. */
function BotonJugar({
  icono,
  titulo,
  detalle,
  deshabilitado,
  clase,
  alTocar,
}: {
  icono: ReactNode
  titulo: string
  detalle: string
  deshabilitado: boolean
  clase: string
  alTocar: () => void
}) {
  return (
    <motion.button
      type="button"
      className={`boton-jugar ${clase}`}
      disabled={deshabilitado}
      onClick={alTocar}
      variants={{ antes: { opacity: 0, y: 14 }, despues: { opacity: 1, y: 0 } }}
    >
      <span className="boton-jugar-icono" aria-hidden="true">
        {icono}
      </span>
      <span className="boton-jugar-texto">
        <strong>{titulo}</strong>
        <small>{detalle}</small>
      </span>
    </motion.button>
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

/**
 * La pantalla del medio del menú, la que abre: el juego es online. Crear una sala, unirse con
 * un código o buscar partida, y tus amigos conectados.
 */
export function PanelJugar({
  perfil,
  cambiar,
  enLinea,
  alEntrar,
}: {
  perfil: Perfil
  cambiar: (p: Partial<Perfil>) => void
  enLinea: boolean
  alEntrar: () => void
}) {
  const navegar = useNavigate()
  const apodo = perfil.apodo.trim()
  // Sin apodo (la primera vez), se pide acá mismo; queda a la vista mientras se escribe.
  const [pedirApodo] = useState(() => !apodo)
  const afuera = useCuenta((s) => s.estado === 'afuera' || s.estado === 'entrando')
  const online = !apodo || !enLinea
  const detalle = (texto: string) => (enLinea ? texto : 'Sin conexión')

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

      {pedirApodo && (
        <section className="tarjeta pedir-apodo">
          <label className="perfil-apodo">
            <span>Para jugar, poné tu apodo</span>
            <input value={perfil.apodo} maxLength={20} placeholder="¿Cómo te dicen?" onChange={(e) => cambiar({ apodo: e.target.value })} />
          </label>
        </section>
      )}

      <motion.div
        className="jugar-botones"
        initial="antes"
        animate="despues"
        variants={{ despues: { transition: { staggerChildren: 0.06 } } }}
      >
        <BotonJugar
          clase="boton-jugar-crear"
          icono={<IconoCrear />}
          titulo="Crear sala"
          detalle={detalle('Armá la mesa y pasale el código a tus amigos')}
          deshabilitado={online}
          alTocar={() => navegar('/crear')}
        />
        <BotonJugar
          clase="boton-jugar-unirme"
          icono={<IconoLlave />}
          titulo="Unirme con código"
          detalle={detalle('Entrá a la sala que armó otro')}
          deshabilitado={online}
          alTocar={() => navegar('/unirme')}
        />
        <BotonJugar
          clase="boton-jugar-buscar"
          icono={<IconoBuscar />}
          titulo="Buscar partida"
          detalle={detalle('Mano a mano con desconocidos')}
          deshabilitado={online}
          alTocar={() => navegar('/buscar')}
        />
      </motion.div>
      {!enLinea ? (
        <p className="sin-conexion" role="status">
          <span aria-hidden="true">📵</span> Sin conexión: lo online vuelve cuando haya internet. Contra la compu se juega igual.
        </p>
      ) : (
        !apodo && <p className="nota">Poné tu apodo para jugar online.</p>
      )}

      <AmigosConectados deshabilitado={online} />
      {afuera && (
        <AvisoMenu icono="🧉" titulo="Jugá con tus amigos">
          Con tu cuenta los agregás, ves quién está conectado y los invitás a tu sala.{' '}
          <button type="button" className="boton-enlace" onClick={alEntrar}>
            Entrar a tu cuenta
          </button>
        </AvisoMenu>
      )}
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
