import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import type { Formato } from '@truco/engine'
import { Avatar } from '../componentes/Avatar'
import { FORMATOS, NIVELES, Segmentado, SelectorLargo } from '../componentes/FormularioSala'
import { Interruptor } from '../componentes/Interruptor'
import { direccionApi, useCuenta } from '../cuenta/cuenta'
import { useJuego } from '../estado'
import { leerPerfil, type Perfil } from '../perfil'
import { conexionContraLaCompu } from './contraLaCompu'
import { useElo } from './Banner'
import { IconoBuscar, IconoCompu, IconoCrear } from './Iconos'

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

const FORMATOS_ELO: [Formato, string][] = [
  ['1v1', '1 vs 1'],
  ['2v2', '2 vs 2'],
  ['3v3', '3 vs 3'],
]

/** Tu Elo en un formato: el número grande y el formato abajo (sin cuenta, una raya). */
function EloDe({ formato, nombre }: { formato: Formato; nombre: string }) {
  const elo = useElo(formato)
  return (
    <span className="lobby-elo">
      <strong>{elo?.puntos ?? '—'}</strong>
      <small>{nombre}</small>
    </span>
  )
}

interface FilaTop {
  posicion: number
  cuentaId: string
  apodo: string
  avatar: string | null
  puntos: number
}

/** Los cinco primeros del ranking de mano a mano. */
function TopRanking() {
  const [filas, setFilas] = useState<FilaTop[] | null>(null)
  useEffect(() => {
    let vigente = true
    fetch(`${direccionApi()}/ranking?formato=1v1`)
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status))
        const d = (await r.json()) as { filas?: FilaTop[] }
        if (vigente) setFilas(Array.isArray(d.filas) ? d.filas.slice(0, 5) : [])
      })
      .catch(() => vigente && setFilas([]))
    return () => {
      vigente = false
    }
  }, [])
  if (!filas) return null
  if (filas.length === 0) return <p className="nota-izq">Todavía nadie entró al ranking: jugá online con tu cuenta y sé el primero.</p>
  return (
    <ol className="lobby-top" aria-label="Los mejores de mano a mano">
      {filas.map((f) => (
        <li key={f.cuentaId}>
          <span className={`tabla-puesto puesto-${f.posicion}`}>{f.posicion}</span>
          <span className="lobby-top-avatar">
            <Avatar codigo={f.avatar} apodo={f.apodo} />
          </span>
          <span className="lobby-top-nombre">{f.apodo}</span>
          <strong>{f.puntos}</strong>
        </li>
      ))}
    </ol>
  )
}

/**
 * La pantalla de la derecha del menú, lo competitivo. Arriba, "Competí": tu Elo en cada formato,
 * buscar un rival online y los cinco mejores del ranking. Después, practicar contra la compu
 * (formato, nivel de los bots y las reglas de esa partida) y los amigos.
 */
export function PanelLobby({
  perfil,
  cambiar,
  conApodo,
}: {
  perfil: Perfil
  cambiar: (p: Partial<Perfil>) => void
  /** Hace lo pedido; sin apodo, antes lo pide. */
  conApodo: (accion: () => void) => void
}) {
  const navegar = useNavigate()
  const adentro = useCuenta((s) => s.estado === 'adentro')

  const jugarContraBots = () =>
    conApodo(() => {
      useJuego.getState().conectar(conexionContraLaCompu(leerPerfil()))
      navegar('/mesa')
    })

  return (
    <>
      <h2 className="panel-titulo">Lobby</h2>
      <section className="tarjeta lobby-competi" aria-labelledby="titulo-competi">
        <h2 id="titulo-competi">Competí</h2>
        <div className="lobby-elos" aria-label="Tu Elo">
          {FORMATOS_ELO.map(([f, nombre]) => (
            <EloDe key={f} formato={f} nombre={nombre} />
          ))}
        </div>
        {!adentro && <p className="nota-izq">Entrá a tu cuenta para tener Elo y aparecer en el ranking.</p>}
        <button type="button" className="boton-jugar-grande lobby-buscar" onClick={() => conApodo(() => navegar('/buscar'))}>
          <IconoBuscar clase="lobby-buscar-icono" /> Buscar rival
        </button>
        <TopRanking />
        <button type="button" className="boton-texto lobby-ver-ranking" onClick={() => navegar('/ranking')}>
          Ver todo el ranking <span aria-hidden="true">›</span>
        </button>
      </section>

      <section className="tarjeta contra-la-compu lobby-compacto" aria-labelledby="titulo-compu">
        <h2 id="titulo-compu">
          <IconoCompu clase="titulo-icono" /> Practicar contra la compu
        </h2>
        <p className="nota-izq">Sin internet. No cuenta para el Elo.</p>
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
            activo={perfil.pieUltimo}
            alCambiar={(v) => cambiar({ pieUltimo: v })}
            titulo="El pie puede ser un bot"
            detalle="En parejas y tríos el pie es el último de tu equipo en jugar la primera. Apagado, el pie sos vos y tus bots juegan lo que les digas"
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
        <button type="button" className="boton boton-grande boton-relieve" onClick={jugarContraBots}>
          Jugar
        </button>
      </section>

      <div className="atajos-lobby">
        {adentro && <Atajo icono={<IconoCrear />} titulo="Amigos" detalle="Tu código, solicitudes y quién está conectado" alTocar={() => navegar('/amigos')} />}
      </div>
    </>
  )
}
