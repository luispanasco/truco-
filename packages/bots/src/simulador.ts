import {
  apply,
  cantidadJugadores,
  crearPartida,
  enfrentamientoActual,
  equipoDe,
  esperandoA,
  liderDe,
  vistaPara,
  type Accion,
  type ConfigSala,
  type Equipo,
  type EstadoPartida,
  type Formato,
} from '@truco/engine'
import { crearBot, type Bot, type Nivel } from './bot'
import { envidoParaSenia, type SeniasRecibidas } from './senias'

export interface ResultadoPartida {
  ganador: Equipo
  puntos: [number, number]
  manos: number
  acciones: number
}

export interface OpcionesPartidaBots {
  bots: Bot[]
  semilla: number
  config?: Partial<ConfigSala>
  reparte?: number
  /** Se llama con cada acción que se aplica (para tests y estadísticas). */
  alAccion?: (estado: EstadoPartida, accion: Accion, asiento: number) => void
}

/** Juega una partida entera entre bots. Las señas se reparten solo entre compañeros. */
export function jugarPartida(op: OpcionesPartidaBots): ResultadoPartida {
  let estado = crearPartida({
    jugadores: op.bots.map((_, i) => ({ id: `j${i}`, nombre: `Bot ${i}` })),
    semilla: op.semilla,
    config: op.config,
    reparte: op.reparte,
  })
  const n = op.bots.length
  let numeroMano = ''
  let senias: SeniasRecibidas[] = []
  let acciones = 0

  while (estado.ganador === null) {
    // Las señas se hacen al ver las cartas: después del corte, si lo hay.
    const claveMano = `${estado.mano.numero}-${estado.mano.cortando === null}`
    if (claveMano !== numeroMano) {
      numeroMano = claveMano
      senias = Array.from({ length: n }, () => ({}))
      if (n > 2 && !estado.mano.picaPica) {
        for (let a = 0; a < n; a++) {
          const hechas = op.bots[a]!.hacerSenias(vistaPara(estado, `j${a}`))
          // La de envido va con el número real, como la manda el servidor.
          const envido = hechas.includes('envido') ? envidoParaSenia(vistaPara(estado, `j${a}`).mano.miTanto) : null
          for (let b = a % 2; b < n; b += 2) {
            if (b === a) continue
            senias[b]![a] = hechas
            if (envido !== null) senias[b]!.envido = { ...senias[b]!.envido, [a]: envido }
          }
        }
      }
    }
    const asiento = esperandoA(estado)[0]
    if (asiento === undefined) throw new Error('La partida se trabó')
    // Con "toques y gritos del pie", el pie le manda al compañero antes de que juegue.
    if (estado.config.toquesYGritos === 'pie' && estado.mano.cortando === null) {
      const e = enfrentamientoActual(estado)
      const lider = liderDe(estado, e, equipoDe(asiento))
      if (lider !== null && lider !== asiento && e.turno === asiento) {
        const que = op.bots[lider]!.ordenar(vistaPara(estado, `j${lider}`), senias[lider], asiento)
        const r = que ? apply(estado, { tipo: 'mandar', jugador: `j${lider}`, a: asiento, que }) : null
        if (r?.ok) estado = r.estado
      }
    }
    const accion = op.bots[asiento]!.decidir(vistaPara(estado, `j${asiento}`), senias[asiento])
    op.alAccion?.(estado, accion, asiento)
    const r = apply(estado, accion)
    if (!r.ok) throw new Error(`El bot ${op.bots[asiento]!.nivel} eligió una acción inválida: ${r.motivo}`)
    estado = r.estado
    acciones++
  }
  return { ganador: estado.ganador, puntos: estado.puntos, manos: estado.mano.numero, acciones }
}

export interface ResultadoEnfrentamiento {
  partidas: number
  ganadasA: number
  porcentajeA: number
  /** Margen del 95% del porcentaje. */
  margen: number
  milisegundos: number
}

/**
 * Juega `partidas` entre dos niveles. Alterna qué equipo es cada nivel y quién
 * reparte primero, para que ninguno tenga ventaja de posición.
 */
export function enfrentar(
  a: Nivel,
  b: Nivel,
  partidas: number,
  formato: Formato,
  semilla = 1,
  config: Partial<ConfigSala> = {},
  /** Índice de la primera partida: permite repartir una tanda en varios procesos. */
  desde = 0,
): ResultadoEnfrentamiento {
  const n = cantidadJugadores(formato)
  const inicio = Date.now()
  let ganadasA = 0
  for (let i = desde; i < desde + partidas; i++) {
    const s = (semilla * 7919 + i * 104729) >>> 0
    const aEsEquipo: Equipo = (i % 2) as Equipo
    const bots = Array.from({ length: n }, (_, asiento) =>
      crearBot(asiento % 2 === aEsEquipo ? a : b, (s + asiento * 31337) >>> 0),
    )
    const reparte = Math.floor(i / 2) % 2 === 0 ? n - 1 : 0
    const r = jugarPartida({ bots, semilla: s, config: { ...config, formato }, reparte })
    if (r.ganador === aEsEquipo) ganadasA++
  }
  const porcentajeA = ganadasA / partidas
  return {
    partidas,
    ganadasA,
    porcentajeA,
    margen: 1.96 * Math.sqrt((porcentajeA * (1 - porcentajeA)) / partidas),
    milisegundos: Date.now() - inicio,
  }
}
