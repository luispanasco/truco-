import type { Accion, Carta, CantoEnvido, CantoFlor, VistaPartida } from '@truco/engine'
import { Aleatorio, crearContexto, pendiente, type Contexto } from './contexto'
import { seniasDeMano, type Senia, type SeniasRecibidas } from './senias'
import { crearFacil } from './facil'
import { crearMedio } from './medio'
import { crearDificil } from './dificil'

export type Nivel = 'facil' | 'medio' | 'dificil'

export interface Bot {
  readonly nivel: Nivel
  /** Elige una acción mirando solo la vista del jugador y las señas de su equipo. */
  decidir(vista: VistaPartida, senias?: SeniasRecibidas): Accion
  /** Señas que hace a su equipo al empezar la mano. */
  hacerSenias(vista: VistaPartida): Senia[]
}

export type RespuestaCanto = 'quiero' | 'noQuiero' | 'subir'

/** Lo que cambia entre niveles. El flujo de decisión es común (ver `elegir`). */
export interface Estrategia {
  /** Con flor propia y flor del rival cantada: flor simple, contraflor o al resto. */
  cantarFlor(ctx: Contexto, puede: { contraflor: boolean; alResto: boolean }): CantoFlor
  responderContraflor(ctx: Contexto, puedeSubir: boolean): RespuestaCanto
  /** Canto de envido que quiere hacer ahora, o null para no cantar. */
  cantarEnvido(ctx: Contexto, posibles: CantoEnvido[]): CantoEnvido | null
  responderEnvido(ctx: Contexto, subidas: CantoEnvido[]): 'quiero' | 'noQuiero' | CantoEnvido
  cantarTruco(ctx: Contexto): boolean
  responderTruco(ctx: Contexto, puedeSubir: boolean): RespuestaCanto
  elegirCarta(ctx: Contexto): Carta
  /** Modo sucio: si pide ver los tantos del rival. */
  pedirVer(ctx: Contexto): boolean
  /** Modo sucio: tanto a declarar cuando el real no alcanza; null para decir "son buenas". */
  mentirTanto(ctx: Contexto): number | null
}

export interface OpcionesBot {
  /** Mentir en el tanto y pedir ver (fase 3). Apagado por defecto. */
  permitirMentiras?: boolean
}

export function crearBot(nivel: Nivel, semilla: number, opciones: OpcionesBot = {}): Bot {
  const estrategia =
    nivel === 'facil' ? crearFacil() : nivel === 'medio' ? crearMedio() : crearDificil(opciones.permitirMentiras ?? false)
  return crearBotCon(nivel, estrategia, semilla)
}

/** Bot con una estrategia a medida (para experimentos y tests). */
export function crearBotCon(nivel: Nivel, estrategia: Estrategia, semilla: number): Bot {
  const rng = new Aleatorio(semilla >>> 0)
  return {
    nivel,
    decidir(vista, senias) {
      const validas = vista.accionesValidas
      if (validas.length === 0) throw new Error('El bot no tiene acciones válidas')
      const ctx = crearContexto(vista, senias, rng)
      const elegida = elegir(ctx, estrategia, validas)
      const clave = JSON.stringify(elegida)
      const valida = validas.find((a) => JSON.stringify(a) === clave)
      if (valida) return valida
      // Una mentira en modo sucio no figura entre las acciones sugeridas pero es válida.
      if (elegida.tipo === 'declararTanto' && vista.config.modoSucio) return elegida
      return validas.find((a) => a.tipo !== 'irseAlMazo') ?? validas[0]!
    },
    hacerSenias(vista) {
      return seniasDeMano(vista.mano.misCartas, vista.mano.muestra)
    },
  }
}

function elegir(ctx: Contexto, est: Estrategia, validas: Accion[]): Accion {
  const jugador = ctx.vista.yo.id
  const hay = (pred: (a: Accion) => boolean) => validas.find(pred)
  const flor = (canto: CantoFlor) => hay((a) => a.tipo === 'cantarFlor' && a.canto === canto)
  const envidos = validas.flatMap((a) => (a.tipo === 'cantarEnvido' ? [a.canto] : []))
  const responder = (respuesta: 'quiero' | 'noQuiero'): Accion => ({ tipo: 'responder', jugador, respuesta })

  if (hay((a) => a.tipo === 'pedirVer' || a.tipo === 'noPedirVer')) {
    return { tipo: est.pedirVer(ctx) ? 'pedirVer' : 'noPedirVer', jugador }
  }

  const pend = pendiente(ctx.e)

  // La flor propia se canta siempre, antes que cualquier otra cosa.
  const yaCante = ctx.e.flor.cantadas.some((x) => x.asiento === ctx.yo)
  if (ctx.miTanto.flor !== null && !yaCante && pend !== 'flor' && flor('flor')) {
    const puede = { contraflor: !!flor('contraflor'), alResto: !!flor('contraflorAlResto') }
    const canto = puede.contraflor || puede.alResto ? est.cantarFlor(ctx, puede) : 'flor'
    return { tipo: 'cantarFlor', jugador, canto }
  }

  // Ya cantadas todas las flores, se puede subir con contraflor.
  if (yaCante && pend !== 'flor' && (flor('contraflor') || flor('contraflorAlResto'))) {
    const canto = est.cantarFlor(ctx, { contraflor: !!flor('contraflor'), alResto: !!flor('contraflorAlResto') })
    if (canto !== 'flor') return { tipo: 'cantarFlor', jugador, canto }
  }

  if (pend === 'flor') {
    const r = est.responderContraflor(ctx, !!flor('contraflorAlResto'))
    return r === 'subir' ? { tipo: 'cantarFlor', jugador, canto: 'contraflorAlResto' } : responder(r)
  }

  if (pend === 'envido') {
    const r = est.responderEnvido(ctx, envidos)
    return r === 'quiero' || r === 'noQuiero' ? responder(r) : { tipo: 'cantarEnvido', jugador, canto: r }
  }

  if (pend === 'declaracion') {
    const real = hay((a) => a.tipo === 'declararTanto' && a.tanto !== 'sonBuenas')
    if (real) return real
    const mentira = ctx.config.modoSucio ? est.mentirTanto(ctx) : null
    return { tipo: 'declararTanto', jugador, tanto: mentira ?? 'sonBuenas' }
  }

  if (pend === 'truco') {
    // "Envido va primero".
    if (envidos.length > 0) {
      const canto = est.cantarEnvido(ctx, envidos)
      if (canto) return { tipo: 'cantarEnvido', jugador, canto }
    }
    const puedeSubir = !!hay((a) => a.tipo === 'cantarTruco')
    const r = est.responderTruco(ctx, puedeSubir)
    return r === 'subir' ? { tipo: 'cantarTruco', jugador } : responder(r)
  }

  if (envidos.length > 0) {
    const canto = est.cantarEnvido(ctx, envidos)
    if (canto) return { tipo: 'cantarEnvido', jugador, canto }
  }
  if (hay((a) => a.tipo === 'cantarTruco') && est.cantarTruco(ctx)) return { tipo: 'cantarTruco', jugador }
  if (hay((a) => a.tipo === 'jugarCarta')) return { tipo: 'jugarCarta', jugador, carta: est.elegirCarta(ctx) }
  return validas.find((a) => a.tipo !== 'irseAlMazo') ?? validas[0]!
}
