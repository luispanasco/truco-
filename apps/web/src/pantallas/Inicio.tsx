import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Carta } from '../componentes/Carta'
import { FORMATOS, NIVELES } from '../componentes/FormularioSala'
import { Interruptor } from '../componentes/Interruptor'
import { datosUnirse, destinoAlEntrar, MensajeError } from '../componentes/Online'
import { TarjetaPerfil, usePerfil } from '../componentes/TarjetaPerfil'
import { ConexionLocal } from '../conexion/local'
import { ConexionOnline, descartarPartidaGuardada, leerPartidaGuardada, motivoError } from '../conexion/online'
import { useJuego } from '../estado'

/** Una opción del menú online: ícono, título y una línea que explica. */
function OpcionOnline({
  icono,
  titulo,
  detalle,
  deshabilitada,
  alTocar,
}: {
  icono: string
  titulo: string
  detalle: string
  deshabilitada: boolean
  alTocar: () => void
}) {
  return (
    <button type="button" className="opcion-online" disabled={deshabilitada} onClick={alTocar}>
      <span className="opcion-online-icono" aria-hidden="true">
        {icono}
      </span>
      <span className="opcion-online-texto">
        <strong>{titulo}</strong>
        <small>{detalle}</small>
      </span>
      <span className="opcion-online-flecha" aria-hidden="true">
        ›
      </span>
    </button>
  )
}

/** Si quedó una partida online a medias (se recargó o se cerró la app), se ofrece volver. */
function PartidaEnCurso({ apodo, alVolver }: { apodo: boolean; alVolver: () => Promise<string | null> }) {
  const [partida, setPartida] = useState(leerPartidaGuardada)
  const [volviendo, setVolviendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  if (!partida && !error) return null

  const volver = async () => {
    setVolviendo(true)
    setError(null)
    const motivo = await alVolver()
    if (motivo) {
      setError(motivo)
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
            <button type="button" className="boton" disabled={!apodo || volviendo} onClick={volver}>
              {volviendo ? 'Volviendo…' : 'Volver a la partida'}
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

export function Inicio() {
  const navegar = useNavigate()
  const [perfil, cambiar] = usePerfil()
  const apodo = perfil.apodo.trim()

  const jugarContraBots = () => {
    useJuego.getState().conectar(
      new ConexionLocal({
        apodo,
        avatar: perfil.avatar,
        formato: perfil.formato,
        nivelBots: perfil.nivelBots,
        ayudas: perfil.ayudas,
        config: { picaPica: perfil.picaPica },
        ...(perfil.rapido ? { demoraBots: [350, 700] as [number, number], pausas: { vuelta: 500, mano: 2700 } } : {}),
      }),
    )
    navegar('/mesa')
  }

  /** Vuelve a la partida guardada; devuelve el motivo si no se pudo. */
  const volverALaPartida = async (): Promise<string | null> => {
    const partida = leerPartidaGuardada()
    if (!partida) return 'Esa partida ya no está disponible.'
    try {
      const c = await ConexionOnline.unirse(partida.roomId, datosUnirse(perfil))
      useJuego.getState().conectar(c)
      navegar(destinoAlEntrar())
      return null
    } catch (e) {
      const motivo = motivoError(e)
      // Si la sala ya no existe (terminó o se cerró), no tiene sentido seguir ofreciéndola.
      if (motivo === 'No existe una sala con ese código.') {
        descartarPartidaGuardada()
        return 'Esa partida ya terminó o se cerró.'
      }
      return motivo
    }
  }

  return (
    <div className="pantalla-inicio">
      <header className="inicio-cabecera">
        <div className="abanico" aria-hidden="true">
          <Carta carta={{ numero: 7, palo: 'oro' }} />
          <Carta carta={{ numero: 1, palo: 'espada' }} />
          <Carta carta={{ numero: 1, palo: 'basto' }} />
        </div>
        <h1>Truco</h1>
        <p className="subtitulo">uruguayo · con muestra, piezas y flor</p>
      </header>

      <PartidaEnCurso apodo={apodo.length > 0} alVolver={volverALaPartida} />

      <TarjetaPerfil perfil={perfil} cambiar={cambiar} />

      <section className="tarjeta">
        <h2>Contra la compu</h2>
        <div className="campo">
          <span>Formato</span>
          <div className="segmentado">
            {FORMATOS.map(([f, t, sub]) => (
              <button key={f} type="button" className={perfil.formato === f ? 'elegido' : ''} onClick={() => cambiar({ formato: f })}>
                <strong>{t}</strong>
                <small>{sub}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="campo">
          <span>Dificultad</span>
          <div className="segmentado">
            {NIVELES.map(([nv, t]) => (
              <button
                key={nv}
                type="button"
                className={perfil.nivelBots === nv ? 'elegido' : ''}
                onClick={() => cambiar({ nivelBots: nv })}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <details className="mas-opciones">
          <summary>Más opciones</summary>
          <Interruptor
            activo={perfil.ojear}
            alCambiar={(v) => cambiar({ ojear: v })}
            titulo="Ojear cartas"
            detalle="Al repartir, descubrís tus cartas de a poco, como en la mesa (también online)"
          />
          <Interruptor
            activo={perfil.ayudas}
            alCambiar={(v) => cambiar({ ayudas: v })}
            titulo="Ayudas"
            detalle="Marca piezas y matas, y muestra tu envido y tu flor"
          />
          <Interruptor
            activo={perfil.picaPica}
            alCambiar={(v) => cambiar({ picaPica: v })}
            titulo="Pica-pica"
            detalle="En 3 vs 3, mientras los dos equipos están en malas"
          />
          <Interruptor
            activo={perfil.rapido}
            alCambiar={(v) => cambiar({ rapido: v })}
            titulo="Juego rápido"
            detalle="Los bots juegan sin pensar tanto"
          />
        </details>
        <button type="button" className="boton boton-grande" disabled={!apodo} onClick={jugarContraBots}>
          Jugar
        </button>
        {!apodo && <p className="nota">Poné tu apodo para jugar.</p>}
      </section>

      <section className="tarjeta tarjeta-online">
        <h2>Online</h2>
        <p className="nota-izq">Jugá con amigos con un código o un link, o con gente de todos lados.</p>
        <div className="opciones-online">
          <OpcionOnline
            icono="👥"
            titulo="Crear sala"
            detalle="Armá la mesa y pasale el código a tus amigos"
            deshabilitada={!apodo}
            alTocar={() => navegar('/crear')}
          />
          <OpcionOnline
            icono="🔑"
            titulo="Unirme con código"
            detalle="Entrá a la sala que armó otro"
            deshabilitada={!apodo}
            alTocar={() => navegar('/unirme')}
          />
          <OpcionOnline
            icono="🌎"
            titulo="Buscar partida"
            detalle="Mano a mano con desconocidos"
            deshabilitada={!apodo}
            alTocar={() => navegar('/buscar')}
          />
        </div>
        {!apodo && <p className="nota">Poné tu apodo para jugar online.</p>}
      </section>

      <footer className="inicio-pie">Truco uruguayo · versión de prueba</footer>
    </div>
  )
}
