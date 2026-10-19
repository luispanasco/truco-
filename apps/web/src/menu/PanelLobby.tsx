import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { FORMATOS, NIVELES, Segmentado, SelectorLargo } from '../componentes/FormularioSala'
import { Interruptor } from '../componentes/Interruptor'
import { ConexionLocal } from '../conexion/local'
import { useCuenta } from '../cuenta/cuenta'
import { useJuego } from '../estado'
import type { Perfil } from '../perfil'
import { IconoCrear, IconoLobby } from './Iconos'

/** Un atajo del lobby a otra pantalla: ícono, título y una línea que explica. */
function Atajo({ icono, titulo, detalle, alTocar }: { icono: ReactNode; titulo: string; detalle: string; alTocar: () => void }) {
  return (
    <button type="button" className="opcion-online atajo-lobby" onClick={alTocar}>
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

/**
 * La pantalla de la derecha del menú: contra la compu (formato, nivel de los bots y las reglas
 * de esa partida), el ranking y los amigos.
 */
export function PanelLobby({ perfil, cambiar }: { perfil: Perfil; cambiar: (p: Partial<Perfil>) => void }) {
  const navegar = useNavigate()
  const apodo = perfil.apodo.trim()
  const adentro = useCuenta((s) => s.estado === 'adentro')

  const jugarContraBots = () => {
    useJuego.getState().conectar(
      new ConexionLocal({
        apodo,
        avatar: perfil.avatar,
        formato: perfil.formato,
        nivelBots: perfil.nivelBots,
        ayudas: perfil.ayudas,
        cartasJugadas: perfil.cartasJugadas,
        mesa: perfil.mesa,
        baraja: perfil.baraja,
        config: {
          picaPica: perfil.picaPica,
          puntosPartida: perfil.puntosPartida,
          toquesYGritos: perfil.toquesDelPie ? 'pie' : 'cualquiera',
          corte: perfil.corte,
        },
        tirarReyes: perfil.tirarReyes,
        senias: {
          habilitadas: perfil.seniasHabilitadas,
          pescar: perfil.pescarSenias ? 'gesto' : 'nunca',
          momento: perfil.seniasAntesDeJugar ? 'antesDeJugar' : 'libre',
        },
        ...(perfil.rapido ? { demoraBots: [350, 700] as [number, number], pausas: { vuelta: 1500, mano: 5000 } } : {}),
      }),
    )
    navegar('/mesa')
  }

  return (
    <>
      <h2 className="panel-titulo">Lobby</h2>
      <section className="tarjeta contra-la-compu" aria-labelledby="titulo-compu">
        <h2 id="titulo-compu">
          <span aria-hidden="true">🤖</span> Contra la compu
        </h2>
        <p className="nota-izq">Para practicar, sin internet. No cuenta para el Elo.</p>
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
          <div className="segmentado segmentado-niveles">
            {NIVELES.map(([nv, t]) => (
              <button key={nv} type="button" className={perfil.nivelBots === nv ? 'elegido' : ''} onClick={() => cambiar({ nivelBots: nv })}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <details className="mas-opciones">
          <summary>Reglas de la partida</summary>
          <SelectorLargo valor={perfil.puntosPartida} alCambiar={(puntosPartida) => cambiar({ puntosPartida })} />
          <Segmentado
            titulo="Tirar reyes"
            valor={perfil.tirarReyes}
            opciones={[
              ['no', 'No'],
              ['reparte', 'Para repartir'],
              ['reparteYEquipos', 'Y los equipos'],
            ]}
            alCambiar={(tirarReyes) => cambiar({ tirarReyes })}
            detalle="Una carta a cada uno hasta el primer rey, que reparte (y, con equipos, los primeros reyes van juntos)"
          />
          <Interruptor
            activo={perfil.toquesDelPie}
            alCambiar={(v) => cambiar({ toquesDelPie: v })}
            titulo="Toques y gritos del pie"
            detalle="En parejas y tríos, toca y grita el pie (o el que él manda) y contesta él"
          />
          <Interruptor
            activo={perfil.corte}
            alCambiar={(v) => cambiar({ corte: v })}
            titulo="Cortar el mazo"
            detalle="Antes de cada mano: corte, sacar la muestra o se la doy al mano"
          />
          <Interruptor
            activo={perfil.picaPica}
            alCambiar={(v) => cambiar({ picaPica: v })}
            titulo="Pica-pica"
            detalle="En 3 vs 3, mientras los dos equipos están en malas"
          />
          <Interruptor activo={perfil.rapido} alCambiar={(v) => cambiar({ rapido: v })} titulo="Juego rápido" detalle="Los bots juegan sin pensar tanto" />
        </details>
        <button type="button" className="boton boton-grande boton-relieve" disabled={!apodo} onClick={jugarContraBots}>
          Jugar
        </button>
        {!apodo && <p className="nota">Poné tu apodo para jugar.</p>}
      </section>

      <div className="atajos-lobby">
        <Atajo icono={<IconoLobby />} titulo="Ranking" detalle="Los mejores de cada formato, por Elo" alTocar={() => navegar('/ranking')} />
        {adentro && <Atajo icono={<IconoCrear />} titulo="Amigos" detalle="Tu código, solicitudes y quién está conectado" alTocar={() => navegar('/amigos')} />}
      </div>
    </>
  )
}
