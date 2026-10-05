import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { AjustesSonido } from '../componentes/AjustesSonido'
import { Carta } from '../componentes/Carta'
import { FORMATOS, NIVELES } from '../componentes/FormularioSala'
import { Interruptor } from '../componentes/Interruptor'
import { SelectorMesa } from '../componentes/SelectorMesa'
import { SelectorVistaMesa } from '../componentes/SelectorVistaMesa'
import { InstalarApp } from '../componentes/Pwa'
import { datosUnirse, destinoAlEntrar, MensajeError } from '../componentes/Online'
import { TarjetaPerfil, usePerfil } from '../componentes/TarjetaPerfil'
import { ConexionLocal } from '../conexion/local'
import { ConexionOnline, descartarPartidaGuardada, leerPartidaGuardada, motivoError } from '../conexion/online'
import { useEnLinea } from '../enLinea'
import { useJuego } from '../estado'
import { aplicarMesa } from '../temaMesa'

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
function PartidaEnCurso({
  apodo,
  enLinea,
  alVolver,
}: {
  apodo: boolean
  enLinea: boolean
  alVolver: () => Promise<string | null>
}) {
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
            <button type="button" className="boton" disabled={!apodo || volviendo || !enLinea} onClick={volver}>
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

export function Inicio() {
  const navegar = useNavigate()
  const [perfil, cambiar] = usePerfil()
  const apodo = perfil.apodo.trim()
  const enLinea = useEnLinea()
  // Al elegir otra mesa, toda la app cambia de color en el momento.
  useEffect(() => aplicarMesa(perfil.mesa), [perfil.mesa])

  const jugarContraBots = () => {
    useJuego.getState().conectar(
      new ConexionLocal({
        apodo,
        avatar: perfil.avatar,
        formato: perfil.formato,
        nivelBots: perfil.nivelBots,
        ayudas: perfil.ayudas,
        config: { picaPica: perfil.picaPica },
        senias: {
          habilitadas: perfil.seniasHabilitadas,
          pescar: perfil.pescarSenias ? 'gesto' : 'nunca',
          momento: perfil.seniasAntesDeJugar ? 'antesDeJugar' : 'libre',
        },
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

      <PartidaEnCurso apodo={apodo.length > 0} enLinea={enLinea} alVolver={volverALaPartida} />

      <TarjetaPerfil perfil={perfil} cambiar={cambiar} />
      <AjustesSonido />

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
          <SelectorVistaMesa valor={perfil.mesaBustos} alCambiar={(mesaBustos) => cambiar({ mesaBustos })} />
          <SelectorMesa valor={perfil.mesa} alCambiar={(mesa) => cambiar({ mesa })} />
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
            activo={perfil.seniasHabilitadas}
            alCambiar={(v) => cambiar({ seniasHabilitadas: v })}
            titulo="Se juega con señas"
            detalle="En parejas y tríos, con tu compañero (y los bots también se hacen)"
          />
          {perfil.seniasHabilitadas && (
            <>
              <Interruptor
                activo={perfil.pescarSenias}
                alCambiar={(v) => cambiar({ pescarSenias: v })}
                titulo="Pescar señas"
                detalle="A veces se ve que un rival le hace una seña a su compañero (y a vos también te pueden ver)"
              />
              <Interruptor
                activo={perfil.seniasAntesDeJugar}
                alCambiar={(v) => cambiar({ seniasAntesDeJugar: v })}
                titulo="Señas antes de jugar"
                detalle="Las señas se hacen solo hasta tirar tu primera carta de la mano"
              />
            </>
          )}
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
            detalle={enLinea ? 'Armá la mesa y pasale el código a tus amigos' : 'Sin conexión'}
            deshabilitada={!apodo || !enLinea}
            alTocar={() => navegar('/crear')}
          />
          <OpcionOnline
            icono="🔑"
            titulo="Unirme con código"
            detalle={enLinea ? 'Entrá a la sala que armó otro' : 'Sin conexión'}
            deshabilitada={!apodo || !enLinea}
            alTocar={() => navegar('/unirme')}
          />
          <OpcionOnline
            icono="🌎"
            titulo="Buscar partida"
            detalle={enLinea ? 'Mano a mano con desconocidos' : 'Sin conexión'}
            deshabilitada={!apodo || !enLinea}
            alTocar={() => navegar('/buscar')}
          />
        </div>
        {!enLinea ? (
          <p className="sin-conexion" role="status">
            <span aria-hidden="true">📵</span> Sin conexión: lo online vuelve cuando haya internet. Contra la compu se juega igual.
          </p>
        ) : (
          !apodo && <p className="nota">Poné tu apodo para jugar online.</p>
        )}
      </section>

      <InstalarApp />

      <footer className="inicio-pie">Truco uruguayo · versión de prueba</footer>
    </div>
  )
}
