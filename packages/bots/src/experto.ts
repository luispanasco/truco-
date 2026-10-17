import {
  calcularEnvido,
  calcularFlor,
  equipoDe,
  fuerza,
  puntosEnvidoNoQuerido,
  puntosEnvidoQuerido,
  type CantoEnvido,
  type CantoHecho,
  type Carta,
  type VistaPartida,
} from '@truco/engine'
import type { Estrategia } from './bot'
import { memo, valorFalta, type Contexto } from './contexto'
import { probGanarPartida } from './equidad'
import { estimarTruco, mejorCarta, type OpcionesEstimacion } from './estimaciones'
import { nivelPendiente } from './evaluacion'
import { muestrear, type Muestra, type ModeloRival } from './muestreo'
import { crearMesa, minimax, mixto, rollout, valorTrasJugar } from './simulacion'

/**
 * Los niveles "muy difícil" y "master". No usan umbrales fijos: para cada decisión (cantar,
 * querer, subir, pasar) imaginan cientos de repartos coherentes con todo lo que se vio y se
 * dijo, simulan la mano en cada uno y eligen lo que más sube la probabilidad de ganar la
 * PARTIDA (no los puntos de la mano), teniendo en cuenta qué contestaría el rival con la mano
 * que tendría en cada reparto. Entre opciones casi iguales eligen al azar, así no se los lee.
 * El master además aprende de los rivales: cuánto quieren el truco y el envido, y con qué
 * tanto cantan.
 */
export interface AjustesExperto {
  /** Repartos imaginados para el truco y las cartas, por formato. */
  muestras: { '1v1': number; equipos: number; '3v3': number }
  /** Repartos para el envido y la flor (es barato: no hay que simular la mano). */
  muestrasTanto: number
  /** Azar entre opciones parecidas, en probabilidad de ganar la partida (0: siempre la mejor). */
  temperatura: number
  /** En 3v3, desde qué vuelta (0, 1 o 2) se simula la mano perfecta en vez de la política golosa. */
  minimax3v3Desde: number
  /** Aprender de los rivales durante la partida. */
  aprender: boolean
  /** Leer también lo que el rival no cantó (ver `OpcionesMuestreo.pasividad`). */
  pasividad: boolean
  /** Cómo simula la mano: el rival viendo todo (minimax) o jugando sin ver mis cartas (mixto). */
  simulacion: 'minimax' | 'mixto'
  /** Lo que cree al empezar de cómo contestan los rivales. */
  respuestas: Respuestas
  /**
   * Cantar el truco: con probabilidad de ganar la mano desde `cantar` (más o menos `ruido`, para
   * que no se le lea el umbral), o de farol con `farol` si tiene poco. Cantar apenas conviene
   * pierde la opción de cantar después sabiendo más: por eso va por umbral y no por valor esperado.
   */
  truco: {
    cantar: number
    ruido: number
    farol: number
    contestar: 'ev' | 'umbral'
    margenQuerer: number
    /** Cuánto cree que el rival tiene con qué cuando canta truco (0: nada) y cuando sube. */
    creeTruco: number
    creeSubida: number
  }
}

export const AJUSTES_MUY_DIFICIL: AjustesExperto = {
  muestras: { '1v1': 200, equipos: 80, '3v3': 45 },
  muestrasTanto: 400,
  temperatura: 0.006,
  minimax3v3Desde: 2,
  aprender: false,
  pasividad: false,
  simulacion: 'minimax',
  respuestas: { quiereTruco: 0.3, quiereEnvido: { envido: 25.5, realEnvido: 27, faltaEnvido: 29.5 }, quiereContraflor: 33 },
  truco: { cantar: 0.62, ruido: 0.03, farol: 0.2, contestar: 'umbral', margenQuerer: 0.05, creeTruco: 0.05, creeSubida: 0.2 },
}

export const AJUSTES_MASTER: AjustesExperto = {
  muestras: { '1v1': 400, equipos: 140, '3v3': 70 },
  muestrasTanto: 900,
  temperatura: 0.003,
  minimax3v3Desde: 1,
  aprender: true,
  pasividad: true,
  simulacion: 'minimax',
  respuestas: AJUSTES_MUY_DIFICIL.respuestas,
  truco: AJUSTES_MUY_DIFICIL.truco,
}

/** Lo que el bot cree de cómo contestan los rivales. El master lo va ajustando. */
export interface Respuestas {
  /**
   * Qué parte de sus manos posibles el rival no quiere ante un truco (0 a 1). Contra un vale
   * cuatro o un retruco no quiere menos: la apuesta ya está hecha (se escala por 2 / nivel).
   */
  quiereTruco: number
  /** Tanto desde el que un rival quiere cada canto de envido. */
  quiereEnvido: Record<CantoEnvido, number>
  /** Flor desde la que un rival quiere una contraflor. */
  quiereContraflor: number
}

const sig = (x: number) => 1 / (1 + Math.exp(-x))

export function crearExperto(aj: AjustesExperto): Estrategia {
  const respuestas: Respuestas = structuredClone(aj.respuestas)
  // Con qué tanto canta cada canto el rival (para pesar los repartos).
  const modelo: ModeloRival = { centrosEnvido: { envido: 25, realEnvido: 27, faltaEnvido: 29 }, farolTruco: 0.15 }
  // Cuánto le cree al rival cuando canta o sube el truco. El master lo aprende de cada rival.
  const cree = { truco: aj.truco.creeTruco, subida: aj.truco.creeSubida }
  const memoria = crearMemoria(respuestas, modelo, cree)

  const opciones = (ctx: Contexto): OpcionesEstimacion => {
    const base = { declarado: true, pesos: true, senias: true, modelo, pasividad: aj.pasividad, subidas: true }
    const jugadores = ctx.e.participantes.length
    if (jugadores === 2) return { ...base, muestras: aj.muestras['1v1'], metodo: aj.simulacion }
    if (jugadores === 4) return { ...base, muestras: aj.muestras.equipos, metodo: aj.simulacion }
    const vuelta = ctx.e.vueltas.length - 1
    return { ...base, muestras: aj.muestras['3v3'], metodo: vuelta >= aj.minimax3v3Desde ? aj.simulacion : 'golosa' }
  }
  const opcionesTanto = (ctx: Contexto): OpcionesEstimacion => ({ ...opciones(ctx), muestras: aj.muestrasTanto, metodo: 'golosa' })

  /** Probabilidad de ganar la partida si mi equipo suma `a` y el rival `b`. */
  const W = (ctx: Contexto, a: number, b: number) =>
    probGanarPartida(
      ctx.vista.puntos[ctx.equipo] + a,
      ctx.vista.puntos[ctx.rival] + b,
      ctx.config.puntosPartida,
      ctx.n > 2,
    )

  /** Entre opciones con su valor, la mejor; con temperatura, al azar entre las parecidas. */
  function elegir<T>(ctx: Contexto, opcionesEv: [T, number][]): T {
    const max = Math.max(...opcionesEv.map(([, v]) => v))
    if (aj.temperatura <= 0) return opcionesEv.find(([, v]) => v === max)![0]
    const pesos = opcionesEv.map(([, v]) => Math.exp((v - max) / aj.temperatura))
    const total = pesos.reduce((s, x) => s + x, 0)
    let r = ctx.rng.sig() * total
    for (let i = 0; i < opcionesEv.length; i++) {
      r -= pesos[i]!
      if (r <= 0) return opcionesEv[i]![0]
    }
    return opcionesEv[opcionesEv.length - 1]![0]
  }

  /** Cada reparto imaginado: si gano la mano jugando bien y qué fuerza le queda al rival. */
  const escenariosTruco = (ctx: Contexto) =>
    memo(ctx, 'exp:truco', () => {
      const op = opciones(ctx)
      const evaluar = op.metodo === 'minimax' ? minimax : op.metodo === 'mixto' ? mixto : rollout
      const miTurno = ctx.e.turno === ctx.yo
      const fuerzas = [...new Set(ctx.misCartas.map((c) => fuerza(c, ctx.muestra)))]
      return muestrasDe(ctx, op).map((m) => {
        const mesa = crearMesa(ctx, m.restantes)
        const gana = miTurno
          ? Math.max(0, ...fuerzas.map((x) => valorTrasJugar(mesa, ctx.yo, x, ctx.equipo, evaluar)))
          : evaluar(mesa, ctx.equipo)
        return { gana, rival: fuerzaRival(ctx, m) }
      })
    })

  /** Cada reparto para el tanto: si mi equipo gana el envido, el mejor tanto rival y las flores. */
  const escenariosTanto = (ctx: Contexto) =>
    memo(ctx, 'exp:tanto', () => {
      const declarados = new Map(ctx.e.envido.declaraciones.filter((d) => d.tanto !== null).map((d) => [d.asiento, d.tanto!]))
      const cantaronFlor = new Set([...ctx.e.flor.cantadas.map((x) => x.asiento), ctx.yo])
      return muestrasDe(ctx, opcionesTanto(ctx)).map((m) => {
        let mejor: { a: number; t: number } | null = null
        let tantoRival = 0
        let mejorFlor: { a: number; t: number } | null = null
        let florRival = 0
        for (const a of ctx.e.participantes) {
          if (ctx.e.retirados.includes(a)) continue
          const cartas = m.completas.get(a) ?? []
          const t =
            a === ctx.yo ? ctx.miTanto.envido : (declarados.get(a) ?? ctx.envidoMarcado.get(a) ?? calcularEnvido(cartas, ctx.muestra))
          if (!mejor || t > mejor.t) mejor = { a, t }
          if (equipoDe(a) !== ctx.equipo) tantoRival = Math.max(tantoRival, t)
          if (cantaronFlor.has(a)) {
            const fl = a === ctx.yo ? ctx.miTanto.flor : calcularFlor(cartas, ctx.muestra, ctx.config.florConPiezas)
            if (fl !== null) {
              if (!mejorFlor || fl > mejorFlor.t) mejorFlor = { a, t: fl }
              if (equipoDe(a) !== ctx.equipo) florRival = Math.max(florRival, fl)
            }
          }
        }
        return {
          // Ante empate gana el más cercano al mano: el primero que llegó al máximo en el orden.
          ganaEnvido: mejor !== null && equipoDe(mejor.a) === ctx.equipo,
          tantoRival,
          ganaFlor: mejorFlor !== null && equipoDe(mejorFlor.a) === ctx.equipo,
          florRival,
        }
      })
    })

  const promedio = <T>(xs: T[], f: (x: T) => number) => (xs.length === 0 ? 0 : xs.reduce((s, x) => s + f(x), 0) / xs.length)
  /**
   * Probabilidad de que el rival quiera un truco de nivel L: no lo quiere con la peor parte de
   * sus manos posibles. La posición de su mano sale de comparar su fuerza con la de todos los
   * repartos imaginados.
   */
  const quiereTruco = (esc: { rival: number }[], s: number, L: number) => {
    const debajo = esc.filter((x) => x.rival < s).length / Math.max(1, esc.length)
    return sig((debajo - (respuestas.quiereTruco * 2) / L) * 12)
  }
  const quiereEnvido = (t: number, canto: CantoEnvido) => sig((t - respuestas.quiereEnvido[canto]) / 1.5)

  return {
    observar: aj.aprender ? (vista) => memoria.observar(vista) : undefined,

    cantarFlor(ctx, puede) {
      const esc = escenariosTanto(ctx)
      const mias = 1 + ctx.e.flor.cantadas.filter((x) => x.equipo === ctx.equipo && x.asiento !== ctx.yo).length
      const K = ctx.config.valorContraflor
      const conFlor = promedio(esc, (x) => (x.ganaFlor ? W(ctx, 3 * mias, 0) : W(ctx, 0, 3)))
      const op: ['flor' | 'contraflor' | 'contraflorAlResto', number][] = [['flor', conFlor]]
      const noQuiere = W(ctx, 3 * mias + 1, 0)
      const acepta = (f: number) => sig((f - respuestas.quiereContraflor) / 2)
      if (puede.contraflor) {
        op.push(['contraflor', promedio(esc, (x) => acepta(x.florRival) * (x.ganaFlor ? W(ctx, K, 0) : W(ctx, 0, K)) + (1 - acepta(x.florRival)) * noQuiere)])
      }
      if (puede.alResto) {
        op.push(['contraflorAlResto', promedio(esc, (x) => acepta(x.florRival + 2) * (x.ganaFlor ? 1 : 0) + (1 - acepta(x.florRival + 2)) * noQuiere)])
      }
      return elegir(ctx, op)
    },

    responderContraflor(ctx, puedeSubir) {
      const esc = escenariosTanto(ctx)
      const alResto = ctx.e.flor.contra.at(-1)?.canto === 'contraflorAlResto'
      const K = ctx.config.valorContraflor
      const floresRival = ctx.e.flor.cantadas.filter((x) => x.equipo !== ctx.equipo).length
      const mias = ctx.e.flor.cantadas.filter((x) => x.equipo === ctx.equipo).length
      const quiero = promedio(esc, (x) => (alResto ? (x.ganaFlor ? 1 : 0) : x.ganaFlor ? W(ctx, K, 0) : W(ctx, 0, K)))
      const op: ['quiero' | 'noQuiero' | 'subir', number][] = [
        ['quiero', quiero],
        ['noQuiero', W(ctx, 0, 3 * floresRival + 1)],
      ]
      if (puedeSubir) {
        const acepta = (f: number) => sig((f - respuestas.quiereContraflor - 2) / 2)
        op.push(['subir', promedio(esc, (x) => acepta(x.florRival) * (x.ganaFlor ? 1 : 0) + (1 - acepta(x.florRival)) * W(ctx, 3 * mias + 1, 0))])
      }
      return elegir(ctx, op)
    },

    cantarEnvido(ctx, posibles) {
      const esc = escenariosTanto(ctx)
      const cantos = ctx.e.envido.cantos
      const falta = valorFalta(ctx, ctx.equipo)
      const op: [CantoEnvido | null, number][] = [[null, W(ctx, 0, 0)]]
      for (const canto of posibles) {
        const cadena: CantoHecho<CantoEnvido>[] = [...cantos, { canto, asiento: ctx.yo, equipo: ctx.equipo }]
        const Q = puntosEnvidoQuerido(cadena, falta)
        const N = puntosEnvidoNoQuerido(cadena)
        op.push([
          canto,
          promedio(esc, (x) => {
            const p = quiereEnvido(x.tantoRival, canto)
            return p * (x.ganaEnvido ? W(ctx, Q, 0) : W(ctx, 0, Q)) + (1 - p) * W(ctx, N, 0)
          }),
        ])
      }
      memoria.anotarEnvido(ctx)
      return elegir(ctx, op)
    },

    responderEnvido(ctx, subidas): 'quiero' | 'noQuiero' | CantoEnvido {
      const esc = escenariosTanto(ctx)
      const cantos = ctx.e.envido.cantos
      const falta = valorFalta(ctx, ctx.equipo)
      const Q = puntosEnvidoQuerido(cantos, falta)
      const N = puntosEnvidoNoQuerido(cantos)
      const op: ['quiero' | 'noQuiero' | CantoEnvido, number][] = [
        ['quiero', promedio(esc, (x) => (x.ganaEnvido ? W(ctx, Q, 0) : W(ctx, 0, Q)))],
        ['noQuiero', W(ctx, 0, N)],
      ]
      for (const canto of subidas) {
        const cadena: CantoHecho<CantoEnvido>[] = [...cantos, { canto, asiento: ctx.yo, equipo: ctx.equipo }]
        const Q2 = puntosEnvidoQuerido(cadena, falta)
        const N2 = puntosEnvidoNoQuerido(cadena)
        op.push([
          canto,
          // El que cantó tiene tanto: para que quiera la subida le pido un poco menos que de cero.
          promedio(esc, (x) => {
            const p = quiereEnvido(x.tantoRival + 1, canto)
            return p * (x.ganaEnvido ? W(ctx, Q2, 0) : W(ctx, 0, Q2)) + (1 - p) * W(ctx, N2, 0)
          }),
        ])
      }
      const r = elegir(ctx, op)
      if (r !== 'quiero' && r !== 'noQuiero') memoria.anotarEnvido(ctx)
      return r
    },

    cantarTruco(ctx) {
      const { p } = estimarTruco(ctx, opciones(ctx))
      const umbral = aj.truco.cantar + (ctx.rng.sig() - 0.5) * 2 * aj.truco.ruido
      const r = p >= umbral || (p < 0.3 && ctx.rng.chance(aj.truco.farol))
      if (r) memoria.anotarTruco(ctx, ctx.e.truco.valor + 1, 1 - respuestas.quiereTruco)
      return r
    },

    responderTruco(ctx, puedeSubir) {
      const L = nivelPendiente(ctx)
      const v = ctx.e.truco.valor
      if (aj.truco.contestar === 'umbral') {
        // El que canta (y más el que sube) suele tener con qué: pesan más los repartos en que gana él.
        const esc = escenariosTruco(ctx)
        const c = L >= 3 ? cree.subida : cree.truco
        const peso = (x: { gana: number }) => 1 - c + c * (1 - x.gana)
        const total = esc.reduce((s, x) => s + peso(x), 0)
        const p = total > 0 ? esc.reduce((s, x) => s + peso(x) * x.gana, 0) / total : 0.5
        // Para subir alcanza con lo que dice el muestreo (ya pesa al que cantó); el descuento extra
        // es para no querer de más contra el que solo canta con la mano hecha.
        if (puedeSubir && estimarTruco(ctx, opciones(ctx)).p > (L === 2 ? 0.72 : 0.8)) return 'subir'
        // Si no querer le da la partida al rival, no hay nada que perder.
        // Querer vale la pena si p·L − (1−p)·L > −(L−1), o sea p > 1/(2L), más un margen.
        const quiero = W(ctx, 0, v) === 0 || p > 1 / (2 * L) + aj.truco.margenQuerer
        if (quiero) memoria.anotarQuerido(ctx, L)
        return quiero ? 'quiero' : 'noQuiero'
      }
      const esc = escenariosTruco(ctx)
      const op: ['quiero' | 'noQuiero' | 'subir', number][] = [
        ['quiero', promedio(esc, (x) => x.gana * W(ctx, L, 0) + (1 - x.gana) * W(ctx, 0, L))],
        ['noQuiero', W(ctx, 0, v)],
      ]
      if (puedeSubir && L < 4) {
        // El que cantó tiene juego: quiere la subida con más fuerza que de cero.
        op.push([
          'subir',
          promedio(esc, (x) => {
            const quiere = quiereTruco(esc, x.rival, L + 1)
            return (1 - quiere) * W(ctx, L, 0) + quiere * (x.gana * W(ctx, L + 1, 0) + (1 - x.gana) * W(ctx, 0, L + 1))
          }),
        ])
      }
      const r = elegir(ctx, op)
      if (r === 'subir') memoria.anotarTruco(ctx, L + 1, promedio(esc, (x) => quiereTruco(esc, x.rival, L + 1)))
      return r
    },

    elegirCarta: (ctx) => mejorCarta(ctx, estimarTruco(ctx, opciones(ctx))),

    pedirVer: () => false,
    mentirTanto: () => null,
  }
}

function muestrasDe(ctx: Contexto, op: OpcionesEstimacion): Muestra[] {
  return memo(ctx, `m:${op.muestras}:${op.declarado}:${op.pesos}:${op.senias}:${op.pasividad === true}:${op.subidas === true}`, () => muestrear(ctx, op.muestras, op))
}

/** Fuerza de lo que le queda al mejor rival (0 a 1), en el reparto imaginado. */
function fuerzaRival(ctx: Contexto, m: Muestra): number {
  let max = 0
  for (const a of ctx.rivales) {
    const fs = (m.restantes.get(a) ?? []).map((c: Carta) => fuerza(c, ctx.muestra)).sort((x, y) => y - x)
    if (fs.length === 0) continue
    max = Math.max(max, (0.65 * fs[0]!) / 19 + (0.35 * (fs[1] ?? 0)) / 19)
  }
  return max
}

/**
 * Lo que el master aprende mirando qué pasó después de cada canto suyo (si el rival quiso o no)
 * y con qué tanto cantaron envido los rivales. Ajusta de a poco lo que cree de ellos.
 */
function crearMemoria(respuestas: Respuestas, modelo: ModeloRival, cree: { truco: number; subida: number }) {
  let truco: { clave: string; nivel: number; esperado: number } | null = null
  // Un truco del rival que quise: al terminar la mano, el marcador dice si lo ganó él.
  let querido: { numero: number; nivel: number; mios: number; suyos: number } | null = null
  let envido: { clave: string; cantos: number } | null = null
  const vistos = new Set<string>()
  const claveDe = (v: VistaPartida) => `${v.mano.numero}-${v.mano.actual}`
  const ajustar = (actual: number, objetivo: number, paso: number) => actual + paso * (objetivo - actual)

  return {
    anotarTruco(ctx: Contexto, nivel: number, esperado: number) {
      truco = { clave: claveDe(ctx.vista), nivel, esperado }
    },
    anotarQuerido(ctx: Contexto, nivel: number) {
      querido = { numero: ctx.vista.mano.numero, nivel, mios: ctx.vista.puntos[ctx.equipo], suyos: ctx.vista.puntos[ctx.rival] }
    },
    anotarEnvido(ctx: Contexto) {
      envido = { clave: claveDe(ctx.vista), cantos: ctx.e.envido.cantos.length + 1 }
    },
    observar(vista: VistaPartida) {
      const clave = claveDe(vista)
      if (querido && vista.mano.numero !== querido.numero) {
        const eq = vista.yo.equipo
        const ganoEl = vista.puntos[eq === 0 ? 1 : 0] - querido.suyos >= querido.nivel
        const ganeYo = vista.puntos[eq] - querido.mios >= querido.nivel
        if (ganoEl !== ganeYo) {
          // Si el que canta suele tenerla, se le cree más; si va de farol, menos.
          const k = querido.nivel >= 3 ? 'subida' : 'truco'
          cree[k] = Math.min(0.9, Math.max(0, cree[k] + 0.08 * ((ganoEl ? 1 : 0) - 0.5)))
        }
        querido = null
      }
      const e = vista.mano.enfrentamientos[vista.mano.actual]
      if (!e) return
      // ¿Quisieron mi truco? Si el enfrentamiento ya es otro, no lo quisieron (o se fueron).
      if (truco) {
        const quiso = truco.clave === clave && e.truco.valor >= truco.nivel
        const definido = truco.clave !== clave || e.truco.pendiente === null
        if (definido) {
          // Si quieren más de lo que esperaba, el umbral baja (y al revés).
          const error = (quiso ? 1 : 0) - truco.esperado
          respuestas.quiereTruco = Math.min(0.6, Math.max(0.05, respuestas.quiereTruco - 0.04 * error))
          truco = null
        }
      }
      if (envido) {
        const quiso = envido.clave === clave && (e.envido.estado === 'declarando' || e.envido.estado === 'resuelto')
        const noQuiso = envido.clave !== clave || e.envido.estado === 'noQuerido'
        const subio = envido.clave === clave && e.envido.cantos.length > envido.cantos
        if (quiso || noQuiso || subio) {
          const paso = quiso || subio ? -0.4 : 0.25
          for (const c of ['envido', 'realEnvido', 'faltaEnvido'] as const) {
            respuestas.quiereEnvido[c] = Math.min(31, Math.max(21, respuestas.quiereEnvido[c] + paso))
          }
          envido = null
        }
      }
      // Con qué tanto cantan los rivales: lo declaran después de cantar.
      for (const d of e.envido.declaraciones) {
        if (d.tanto === null || equipoDe(d.asiento) === vista.yo.equipo) continue
        const k = `${clave}-${d.asiento}`
        if (vistos.has(k)) continue
        vistos.add(k)
        for (const c of e.envido.cantos) {
          if (c.asiento !== d.asiento) continue
          modelo.centrosEnvido[c.canto] = ajustar(modelo.centrosEnvido[c.canto], d.tanto - 1, 0.2)
        }
      }
    },
  }
}
