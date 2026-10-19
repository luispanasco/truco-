import { equipoDe, ORDENES_DE_CARTA, valorEnvido, type Accion, type Orden, type Carta, type CantoEnvido, type CantoFlor, type QueManda, type TipoCorte, type VistaPartida } from '@truco/engine'
import { Aleatorio, crearContexto, f, mejorDeLaVuelta, ordenadas, pendiente, type Contexto } from './contexto'
import { ENVIDO_PARA_SENIAR, envidoParaSenia, seniasDeMano, type Senia, type SeniasRecibidas } from './senias'
import { crearFacil } from './facil'
import { crearMedio } from './medio'
import { crearDificil } from './dificil'
import { AJUSTES_MASTER, AJUSTES_MUY_DIFICIL, crearExperto } from './experto'

export type Nivel = 'facil' | 'medio' | 'dificil' | 'muyDificil' | 'master'

/** Los niveles de menor a mayor. */
export const NIVELES_BOT: Nivel[] = ['facil', 'medio', 'dificil', 'muyDificil', 'master']

/** Lo que el pie le sugiere en voz alta a un compañero (no es obligatorio seguirlo). */
export type Sugerencia = { tipo: 'veni' } | { tipo: 'vamosA'; asiento: number }

export interface Bot {
  readonly nivel: Nivel
  /**
   * Elige una acción mirando solo la vista del jugador, las señas de su equipo y la última
   * sugerencia del pie. Las órdenes del pie (tocar, gritar) vienen en la vista y las cumple.
   */
  decidir(vista: VistaPartida, senias?: SeniasRecibidas, sugerencia?: Sugerencia): Accion
  /**
   * Señas que hace a su equipo al empezar la mano (después del corte): las de sus cartas, la
   * flor y, con buen envido (sin flor), la de envido. El número lo agrega el servidor.
   */
  hacerSenias(vista: VistaPartida): Senia[]
  /** Como pie: si manda al compañero a tocar o a gritar antes de que juegue. */
  ordenar(vista: VistaPartida, senias: SeniasRecibidas | undefined, companiero: number): QueManda | null
}

const CORTES: TipoCorte[] = ['convencional', 'sacarMuestra', 'darAlMano']

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
  /** Mira la mesa antes de cada decisión, para aprender de los rivales (master). */
  observar?(vista: VistaPartida): void
}

export interface OpcionesBot {
  /** Mentir en el tanto y pedir ver (fase 3). Apagado por defecto. */
  permitirMentiras?: boolean
}

export function crearBot(nivel: Nivel, semilla: number, opciones: OpcionesBot = {}): Bot {
  const estrategia =
    nivel === 'facil'
      ? crearFacil()
      : nivel === 'medio'
        ? crearMedio()
        : nivel === 'dificil'
          ? crearDificil(opciones.permitirMentiras ?? false)
          : crearExperto(nivel === 'master' ? AJUSTES_MASTER : AJUSTES_MUY_DIFICIL)
  return crearBotCon(nivel, estrategia, semilla)
}

/** Bot con una estrategia a medida (para experimentos y tests). */
export function crearBotCon(nivel: Nivel, estrategia: Estrategia, semilla: number): Bot {
  const rng = new Aleatorio(semilla >>> 0)
  return {
    nivel,
    decidir(vista, senias, sugerencia) {
      const validas = vista.accionesValidas
      if (validas.length === 0) throw new Error('El bot no tiene acciones válidas')
      if (validas.every((a) => a.tipo === 'cortar')) {
        return { tipo: 'cortar', jugador: vista.yo.id, corte: CORTES[Math.floor(rng.sig() * CORTES.length)]! }
      }
      if (vista.mano.muestra) estrategia.observar?.(vista)
      const ctx = crearContexto(vista, senias, rng)
      const elegida = elegir(ctx, estrategia, validas, sugerencia)
      const clave = JSON.stringify(elegida)
      const valida = validas.find((a) => JSON.stringify(a) === clave)
      if (valida) return valida
      // Una mentira en modo sucio no figura entre las acciones sugeridas pero es válida.
      if (elegida.tipo === 'declararTanto' && vista.config.modoSucio) return elegida
      return validas.find((a) => a.tipo !== 'irseAlMazo') ?? validas[0]!
    },
    hacerSenias(vista) {
      if (!vista.mano.muestra) return []
      const senias = seniasDeMano(vista.mano.misCartas, vista.mano.muestra)
      const envido = envidoParaSenia(vista.mano.miTanto)
      return envido !== null && envido >= ENVIDO_PARA_SENIAR ? [...senias, 'envido'] : senias
    },
    ordenar(vista, senias, companiero) {
      if (!vista.mano.muestra) return null
      const e = vista.mano.enfrentamientos[vista.mano.actual]!
      if (e.ordenes.some((o) => o.asiento === companiero)) return null
      const ctx = crearContexto(vista, senias, rng)
      const enPrimera = e.vueltas.length === 1 && e.envido.estado === 'libre' && e.flor.cantadas.length === 0
      if (enPrimera && estrategia.cantarEnvido(ctx, ['envido', 'realEnvido', 'faltaEnvido'])) return 'tocar'
      const puedeGritar = e.truco.valor < 4 && !e.truco.pendiente && (e.truco.puedeSubir === null || e.truco.puedeSubir === ctx.equipo)
      if (puedeGritar && estrategia.cantarTruco(ctx)) return 'gritar'
      return null
    },
  }
}

function elegir(ctx: Contexto, est: Estrategia, validas: Accion[], sugerencia?: Sugerencia): Accion {
  const jugador = ctx.vista.yo.id
  const hay = (pred: (a: Accion) => boolean) => validas.find(pred)
  const flor = (canto: CantoFlor) => hay((a) => a.tipo === 'cantarFlor' && a.canto === canto)
  const envidos = validas.flatMap((a) => (a.tipo === 'cantarEnvido' ? [a.canto] : []))
  const responder = (respuesta: 'quiero' | 'noQuiero'): Accion => ({ tipo: 'responder', jugador, respuesta })

  // "Canta la mesa": tira primero las que menos suman y deja la mejor para el final.
  const aMostrar = validas.filter((a): a is Extract<Accion, { tipo: 'mostrarFlor' }> => a.tipo === 'mostrarFlor')
  if (aMostrar.length > 0) {
    return [...aMostrar].sort((x, y) => valorEnvido(x.carta, ctx.vista.mano.muestra!) - valorEnvido(y.carta, ctx.vista.mano.muestra!))[0]!
  }

  if (hay((a) => a.tipo === 'pedirVer' || a.tipo === 'noPedirVer')) {
    return { tipo: est.pedirVer(ctx) ? 'pedirVer' : 'noPedirVer', jugador }
  }

  const pend = pendiente(ctx.e)

  // La flor propia se canta siempre, antes que cualquier otra cosa.
  const yaCante = ctx.e.flor.cantadas.some((x) => x.asiento === ctx.yo)
  if (ctx.miTanto.flor !== null && !yaCante && pend !== 'flor' && flor('flor')) {
    const puede = { contraflor: !!flor('contraflor'), alResto: !!flor('contraflorAlResto') }
    const canto = puede.contraflor || puede.alResto ? est.cantarFlor(ctx, puede) : 'flor'
    // Cargado: "flor y truco" en un solo canto.
    const yTruco = hay((a) => a.tipo === 'cantarFlor' && a.yTruco === true)
    if (canto === 'flor' && yTruco && est.cantarTruco(ctx)) return yTruco
    return { tipo: 'cantarFlor', jugador, canto }
  }

  // Ya cantadas todas las flores, se puede subir con contraflor.
  if (yaCante && pend !== 'flor' && (flor('contraflor') || flor('contraflorAlResto'))) {
    const canto = est.cantarFlor(ctx, { contraflor: !!flor('contraflor'), alResto: !!flor('contraflorAlResto') })
    if (canto !== 'flor') return { tipo: 'cantarFlor', jugador, canto }
  }

  if (pend === 'flor') {
    const r = est.responderContraflor(ctx, !!flor('contraflorAlResto'))
    // Al querer la contraflor al resto, a veces "canta la mesa", que tiene más gracia.
    const mesa = hay((a) => a.tipo === 'responder' && a.cantaLaMesa === true)
    if (r === 'quiero' && mesa && ctx.rng.sig() < 0.5) return mesa
    return r === 'subir' ? { tipo: 'cantarFlor', jugador, canto: 'contraflorAlResto' } : responder(r)
  }

  if (pend === 'envido') {
    // La cadena no tiene límite: después de 4 cantos el bot ya no sube, salvo con la falta.
    const subidas = ctx.e.envido.cantos.length >= 4 ? envidos.filter((c) => c === 'faltaEnvido') : envidos
    const r = est.responderEnvido(ctx, subidas)
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

  // Lo que manda el pie se cumple.
  const misOrdenes = ctx.e.ordenes.filter((o) => o.asiento === ctx.yo)
  const ordenes = misOrdenes.map((o) => o.que)
  if (ordenes.includes('tocar') && envidos.length > 0) {
    return { tipo: 'cantarEnvido', jugador, canto: est.cantarEnvido(ctx, envidos) ?? envidos[0]! }
  }
  if (ordenes.includes('gritar') && hay((a) => a.tipo === 'cantarTruco')) return { tipo: 'cantarTruco', jugador }

  // Un bot que manda una persona no canta por su cuenta (salvo la flor, arriba): espera que lo manden.
  if (!mandadoPorPersona(ctx.vista)) {
    if (envidos.length > 0) {
      const canto = est.cantarEnvido(ctx, envidos)
      if (canto) return { tipo: 'cantarEnvido', jugador, canto }
    }
    if (hay((a) => a.tipo === 'cantarTruco') && est.cantarTruco(ctx)) return { tipo: 'cantarTruco', jugador }
  }
  if (hay((a) => a.tipo === 'jugarCarta')) {
    const orden = misOrdenes.find((o) => ORDENES_DE_CARTA.includes(o.que))
    const carta = cartaDeOrden(ctx, orden) ?? cartaSugerida(ctx, sugerencia) ?? est.elegirCarta(ctx)
    // Pasar en la tercera: si la carta no gana y juega un compañero después, va tapada.
    const tapada = hay((a) => a.tipo === 'jugarCarta' && a.tapada === true && JSON.stringify(a.carta) === JSON.stringify(carta))
    if (tapada && !ganaLaVuelta(ctx, carta) && quedaCompanieroPorJugar(ctx)) return tapada
    return { tipo: 'jugarCarta', jugador, carta }
  }
  return validas.find((a) => a.tipo !== 'irseAlMazo') ?? validas[0]!
}

/** Si el bot lo manda una persona (su pie): juega y canta lo que ella le diga. */
export function mandadoPorPersona(v: VistaPartida): boolean {
  if (!v.yo.bot) return false
  const e = v.mano.enfrentamientos[v.mano.actual]
  const lider = e?.lideres[v.yo.equipo] ?? null
  return lider !== null && lider !== v.yo.asiento && !v.jugadores[lider]?.bot
}

/**
 * La carta que pidió el pie: la que nombró; "dejala", la más baja; "matala", la más alta; "jugá
 * algo", la del medio (la segunda más grande); "vení" y "vamos a", la más baja (la vuelta la lleva otro).
 */
function cartaDeOrden(ctx: Contexto, o: Orden | undefined): Carta | null {
  if (!o || ctx.misCartas.length === 0) return null
  const cs = ordenadas(ctx, ctx.misCartas)
  switch (o.que) {
    case 'carta':
      return o.carta && ctx.misCartas.some((c) => c.numero === o.carta!.numero && c.palo === o.carta!.palo) ? o.carta : null
    case 'matala':
      return cs[cs.length - 1]!
    case 'jugaAlgo':
      return cs[Math.max(0, cs.length - 2)]!
    case 'dejala':
    case 'veni':
    case 'vamosA':
      return cs[0]!
    default:
      return null
  }
}

/**
 * La carta que pide la sugerencia del pie: "vení" es tirar la más baja; "vamos a X" (X es un
 * compañero) también, porque la vuelta la lleva X. Si el nombrado es el propio bot, juega a ganarla.
 */
function cartaSugerida(ctx: Contexto, s: Sugerencia | undefined): Carta | null {
  if (!s || ctx.misCartas.length === 0) return null
  if (s.tipo === 'vamosA' && (s.asiento === ctx.yo || equipoDe(s.asiento) !== ctx.equipo)) return null
  return ordenadas(ctx, ctx.misCartas)[0]!
}

function ganaLaVuelta(ctx: Contexto, carta: Carta): boolean {
  const mejor = mejorDeLaVuelta(ctx)
  return !mejor || f(ctx, carta) > mejor.f
}

function quedaCompanieroPorJugar(ctx: Contexto): boolean {
  const vuelta = ctx.e.vueltas[ctx.e.vueltas.length - 1]!
  return ctx.companeros.some((a) => !vuelta.jugadas.some((j) => j.asiento === a))
}
