import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  accionesValidas,
  apply,
  calcularEnvido,
  tieneFlor,
  crearPartida,
  esperandoA,
  vistaPara,
  type Accion,
  type Carta,
  type ConfigSala,
  type EstadoPartida,
  type Formato,
  type Numero,
  type Palo,
} from '@truco/engine'
import { crearBot, ENVIDO_PARA_SENIAR, jugarPartida, NIVELES_BOT, seniasDeMano, type Nivel, type SeniasRecibidas } from '../src'
import { Aleatorio, crearContexto } from '../src/contexto'
import { muestrear } from '../src/muestreo'
import { probEnvido } from '../src/estimaciones'

const PALOS: Record<string, Palo> = { e: 'espada', b: 'basto', o: 'oro', c: 'copa' }
const c = (t: string): Carta => ({ numero: Number(t.slice(0, -1)) as Numero, palo: PALOS[t.slice(-1)]! })
const IDS = ['a', 'b', 'c', 'd', 'e', 'f']

function partidaCon(manos: string[], muestra: string, config: Partial<ConfigSala> = {}): EstadoPartida {
  const formato = manos.length === 2 ? '1v1' : manos.length === 4 ? '2v2' : '3v3'
  return crearPartida({
    jugadores: IDS.slice(0, manos.length).map((id) => ({ id, nombre: id })),
    semilla: 7,
    config: { formato, ...config },
    repartoFijo: { cartas: manos.map((m) => m.split(' ').map(c)), muestra: c(muestra) },
  })
}

function aplicar(estado: EstadoPartida, ...acciones: Accion[]): EstadoPartida {
  for (const a of acciones) {
    const r = apply(estado, a)
    if (!r.ok) throw new Error(r.motivo)
    estado = r.estado
  }
  return estado
}

const NIVELES: Nivel[] = NIVELES_BOT

describe('bots', () => {
  it('cualquier bot, en cualquier formato y configuración, elige siempre acciones válidas y la partida termina', () => {
    fc.assert(
      fc.property(
        fc.constantFrom<Formato>('1v1', '2v2', '3v3'),
        fc.array(fc.constantFrom(...NIVELES), { minLength: 6, maxLength: 6 }),
        fc.integer(),
        fc.record<Partial<ConfigSala>>({
          florObligatoria: fc.boolean(),
          envidoEnvido: fc.boolean(),
          picaPica: fc.boolean(),
          faltaEnvidoEnMalas: fc.constantFrom('loQueFalta', 'ganaPartido'),
          modoSucio: fc.boolean(),
          pie: fc.constantFrom('persona', 'ultimo'),
          corte: fc.boolean(),
          puntosPartida: fc.constantFrom(20, 30, 40),
        }),
        (formato, niveles, semilla, config) => {
          const n = formato === '1v1' ? 2 : formato === '2v2' ? 4 : 6
          const bots = niveles.slice(0, n).map((nivel, i) => crearBot(nivel, semilla + i))
          // jugarPartida falla si algún bot elige una acción inválida o si se traba.
          const r = jugarPartida({ bots, semilla, config: { ...config, formato } })
          expect(r.puntos[r.ganador]).toBe(config.puntosPartida ?? 30)
        },
      ),
      { numRuns: 15 },
    )
  }, 120_000)

  it('la misma semilla reproduce la misma partida entre bots', () => {
    const jugar = () =>
      jugarPartida({ bots: [crearBot('dificil', 1), crearBot('medio', 2)], semilla: 99, config: { formato: '1v1' } })
    expect(jugar()).toEqual(jugar())
  })

  it('sin mentiras habilitadas, en modo sucio declaran siempre el tanto real y nunca piden ver', () => {
    for (let semilla = 0; semilla < 6; semilla++) {
      const bots = [crearBot('dificil', semilla), crearBot('dificil', semilla + 100)]
      jugarPartida({
        bots,
        semilla,
        config: { formato: '1v1', modoSucio: true },
        alAccion: (estado, accion, asiento) => {
          expect(accion.tipo).not.toBe('pedirVer')
          if (accion.tipo === 'declararTanto' && accion.tanto !== 'sonBuenas') {
            expect(accion.tanto).toBe(estado.mano.tantos[asiento]!.envidoReal)
          }
        },
      })
    }
  })

  it('el fácil casi nunca sube y nunca sube el envido', () => {
    let respuestas = 0
    let subidas = 0
    for (let semilla = 0; semilla < 20; semilla++) {
      jugarPartida({
        bots: [crearBot('facil', semilla), crearBot('dificil', semilla + 1)],
        semilla,
        config: { formato: '1v1' },
        alAccion: (estado, accion, asiento) => {
          if (asiento !== 0) return
          const e = estado.mano.enfrentamientos[estado.mano.actual]!
          if (e.envido.estado === 'pendiente') expect(accion.tipo).not.toBe('cantarEnvido')
          if (e.truco.pendiente && e.envido.estado !== 'pendiente') {
            respuestas++
            if (accion.tipo === 'cantarTruco') subidas++
          }
        },
      })
    }
    expect(respuestas).toBeGreaterThan(20)
    expect(subidas / respuestas).toBeLessThan(0.08)
  })

  it('el difícil no quiere un vale cuatro que no puede ganar', () => {
    // Muestra 3 de copas. b (el bot) tiene 4, 5 y 6: no le gana a casi nada.
    let estado = partidaCon(['1e 7e 3o', '4b 5o 6e'], '3c')
    estado = aplicar(
      estado,
      { tipo: 'cantarTruco', jugador: 'a' },
      { tipo: 'cantarTruco', jugador: 'b' },
      { tipo: 'cantarTruco', jugador: 'a' },
    )
    for (let semilla = 0; semilla < 5; semilla++) {
      const accion = crearBot('dificil', semilla).decidir(vistaPara(estado, 'b'))
      expect(accion).toEqual({ tipo: 'responder', jugador: 'b', respuesta: 'noQuiero' })
    }
  })

  it('el difícil imagina la mano del compañero según sus señas', () => {
    // Muestra 6 de oros. d le señó a b un uno bravo y nada más.
    let estado = partidaCon(['7c 12e 10c', '3e 4b 6c', '12b 11e 4e', '1e 5c 6b'], '6o')
    estado = aplicar(estado, { tipo: 'jugarCarta', jugador: 'a', carta: c('7c') })
    const ctx = crearContexto(vistaPara(estado, 'b'), { 3: ['unoBravo'] }, new Aleatorio(1))
    const muestras = muestrear(ctx, 50, { declarado: true, pesos: true, senias: true })
    expect(muestras.length).toBeGreaterThan(40)
    for (const m of muestras) {
      expect(seniasDeMano(m.completas.get(3)!, c('6o'))).toEqual(['unoBravo'])
    }
  })

  it('el difícil usa la seña que le pescó a un rival (sin suponer que es la única)', () => {
    // Muestra 6 de oros. b le pescó a c (asiento 2, rival) la seña de un 3.
    let estado = partidaCon(['7c 12e 10c', '3e 4b 6c', '12b 11e 4e', '1e 5c 6b'], '6o')
    estado = aplicar(estado, { tipo: 'jugarCarta', jugador: 'a', carta: c('7c') })
    const ctx = crearContexto(vistaPara(estado, 'b'), { 2: ['tres'] }, new Aleatorio(1))
    const muestras = muestrear(ctx, 60, { declarado: true, pesos: true, senias: true })
    expect(muestras.length).toBeGreaterThan(40)
    for (const m of muestras) expect(seniasDeMano(m.completas.get(2)!, c('6o'))).toContain('tres')
    // Puede tener otras señas además de la pescada.
    expect(muestras.some((m) => seniasDeMano(m.completas.get(2)!, c('6o')).length > 1)).toBe(true)
  })

  it('el medio le deja la vuelta al compañero que le señó que puede matar', () => {
    // Muestra 6 de oros. a tira el 7 de copas; b (el bot) le gana con el 3 de espadas.
    let estado = partidaCon(['7c 12e 10c', '3e 4b 6c', '12b 11e 4e', '1e 5c 6b'], '6o')
    estado = aplicar(estado, { tipo: 'jugarCarta', jugador: 'a', carta: c('7c') })
    const cartaDeB = (senias: SeniasRecibidas, semilla: number) => {
      const bot = crearBot('medio', semilla)
      let actual = estado
      let accion = bot.decidir(vistaPara(actual, 'b'), senias)
      // Si canta algo antes de jugar, los demás lo quieren y declaran; después se le vuelve a preguntar.
      for (let i = 0; i < 20 && accion.tipo !== 'jugarCarta'; i++) {
        actual = aplicar(actual, accion)
        while (esperandoA(actual)[0] !== 1) {
          const otro = IDS[esperandoA(actual)[0]!]!
          const validas = accionesValidas(actual, otro)
          const elegida =
            validas.find((x) => x.tipo === 'declararTanto') ??
            validas.find((x) => x.tipo === 'responder' && x.respuesta === 'quiero')!
          actual = aplicar(actual, elegida)
        }
        accion = bot.decidir(vistaPara(actual, 'b'), senias)
      }
      return accion.tipo === 'jugarCarta' ? accion.carta : null
    }
    for (let semilla = 0; semilla < 5; semilla++) {
      // d, que juega último, le señó un uno bravo: b tira la más baja.
      expect(cartaDeB({ 3: ['unoBravo'] }, semilla)).toEqual(c('4b'))
      // d no hizo ninguna seña: b mata con el 3.
      expect(cartaDeB({ 3: [] }, semilla)).toEqual(c('3e'))
    }
  })

  it('corta el mazo cuando le toca', () => {
    const p = crearPartida({
      jugadores: IDS.slice(0, 2).map((id) => ({ id, nombre: id })),
      semilla: 3,
      config: { corte: true },
    })
    const accion = crearBot('medio', 1).decidir(vistaPara(p, 'a'))
    expect(accion.tipo).toBe('cortar')
    aplicar(p, accion)
  })

  it('cumple lo que le manda el pie: tocar y gritar', () => {
    // Muestra 3 de copas. a tiene envido 7, nada que cantar solo.
    const p = partidaCon(['4e 6o 5b', '1b 2e 6e', '7e 5o 12b', '3e 6b 11o'], '3c')
    for (const nivel of NIVELES) {
      const toca = aplicar(p, { tipo: 'mandar', jugador: 'c', a: 0, que: 'tocar' })
      expect(crearBot(nivel, 1).decidir(vistaPara(toca, 'a'))).toMatchObject({ tipo: 'cantarEnvido' })
      const grita = aplicar(p, { tipo: 'mandar', jugador: 'c', a: 0, que: 'gritar' })
      expect(crearBot(nivel, 1).decidir(vistaPara(grita, 'a'))).toEqual({ tipo: 'cantarTruco', jugador: 'a' })
    }
  })

  it('el bot que manda una persona juega lo que el pie le dice y no canta solo', () => {
    // a (persona, pie) y c (bot); b y d bots. Le toca a c después de a y b.
    const conBot = () =>
      crearPartida({
        jugadores: ['a', 'b', 'c', 'd'].map((id, i) => ({ id, nombre: id, ...(i > 0 ? { bot: true } : {}) })),
        semilla: 1,
        config: { formato: '2v2' },
        repartoFijo: { cartas: ['4e 6o 5b', '1b 2e 6e', '1e 7e 4o', '3e 6b 11o'].map((m) => m.split(' ').map(c)), muestra: c('3c') },
      })
    let p = aplicar(aplicar(conBot(), { tipo: 'jugarCarta', jugador: 'a', carta: c('4e') }), { tipo: 'jugarCarta', jugador: 'b', carta: c('2e') })
    for (const nivel of NIVELES) {
      // Sin orden no canta (tiene el 1 de espadas y el 7 de espadas, para gritar).
      expect(crearBot(nivel, 1).decidir(vistaPara(p, 'c'))).toMatchObject({ tipo: 'jugarCarta' })
      const matala = aplicar(p, { tipo: 'mandar', jugador: 'a', a: 2, que: 'matala' })
      expect(crearBot(nivel, 1).decidir(vistaPara(matala, 'c'))).toMatchObject({ tipo: 'jugarCarta', carta: c('1e') })
      const dejala = aplicar(p, { tipo: 'mandar', jugador: 'a', a: 2, que: 'dejala' })
      expect(crearBot(nivel, 1).decidir(vistaPara(dejala, 'c'))).toMatchObject({ tipo: 'jugarCarta', carta: c('4o') })
      const algo = aplicar(p, { tipo: 'mandar', jugador: 'a', a: 2, que: 'jugaAlgo' })
      expect(crearBot(nivel, 1).decidir(vistaPara(algo, 'c'))).toMatchObject({ tipo: 'jugarCarta', carta: c('7e') })
      const carta = aplicar(p, { tipo: 'mandar', jugador: 'a', a: 2, que: 'carta', carta: c('7e') })
      expect(crearBot(nivel, 1).decidir(vistaPara(carta, 'c'))).toMatchObject({ tipo: 'jugarCarta', carta: c('7e') })
    }
    p = conBot()
  })

  it('con "vení" tira la más baja', () => {
    const p = partidaCon(['1e 7o 4b', '1b 2e 6o', '7e 5o 12b', '3e 6b 11o'], '3c')
    for (const nivel of NIVELES) {
      const accion = crearBot(nivel, 1).decidir(vistaPara(p, 'a'), {}, { tipo: 'veni' })
      if (accion.tipo === 'jugarCarta') expect(accion.carta).toEqual(c('4b'))
    }
  })
})

describe('la seña de envido', () => {
  it('el bot marca su envido desde 30 y sin flor, después de las señas de sus cartas', () => {
    // Muestra 6 de oros. a: 7 y 6 de espadas (33 de envido); b: nada de envido; c y d: flor.
    const estado = partidaCon(['7e 6e 4b', '4c 5b 12e', '1e 3e 5e', '10c 11c 2c'], '6o')
    const senias = (j: string) => crearBot('medio', 1).hacerSenias(vistaPara(estado, j))
    expect(senias('a')).toEqual(['sieteBravo', 'envido'])
    expect(senias('b')).toEqual([])
    // Con flor no hay envido: marca la flor.
    expect(senias('c')).toEqual(['unoBravo', 'tres', 'flor'])
    expect(senias('d')).toEqual(['dosComun', 'flor'])
  })

  it('el difícil imagina al compañero con el envido que le marcó (y sin flor)', () => {
    // Muestra 6 de oros. d le marcó un uno bravo y su envido (el real, como lo manda el servidor).
    let estado = partidaCon(['7c 12e 10c', '3e 4b 6c', '12b 11e 4e', '1e 7b 6b'], '6o')
    estado = aplicar(estado, { tipo: 'jugarCarta', jugador: 'a', carta: c('7c') })
    const envido = calcularEnvido([c('1e'), c('7b'), c('6b')], c('6o'))
    const ctx = crearContexto(vistaPara(estado, 'b'), { 3: ['unoBravo', 'envido'], envido: { 3: envido } }, new Aleatorio(1))
    expect(ctx.senias.get(3)).toEqual(['unoBravo', 'envido'])
    const muestras = muestrear(ctx, 50, { declarado: true, pesos: true, senias: true })
    expect(muestras.length).toBeGreaterThan(40)
    for (const m of muestras) {
      const d = m.completas.get(3)!
      expect(calcularEnvido(d, c('6o'))).toBe(envido)
      expect(tieneFlor(d, c('6o'))).toBe(false)
      // La de envido no sale de una carta: las de las cartas siguen siendo solo el uno bravo.
      expect(seniasDeMano(d, c('6o'))).toEqual(['unoBravo'])
    }
  })

  it('con el envido alto que marcó el compañero, el equipo espera ganar el envido mucho más que con uno bajo', () => {
    // b tiene poco envido (4 y 3 de distinto palo); d le marca su envido.
    const estado = partidaCon(['7c 12e 10c', '3e 4b 6c', '12b 11e 4e', '1e 7b 6b'], '6o')
    const p = (envido: number) => {
      const ctx = crearContexto(vistaPara(estado, 'b'), { 3: ['envido'], envido: { 3: envido } }, new Aleatorio(3))
      return probEnvido(ctx, { muestras: 80, metodo: 'golosa', declarado: true, pesos: true, senias: true })
    }
    // Con muestra, un rival con pieza llega fácil a 33: no es seguro, pero es mucho más que con 7.
    expect(p(33)).toBeGreaterThan(0.5)
    expect(p(33)).toBeGreaterThan(p(7) + 0.3)
  })

  it('en las partidas simuladas, el número llega con la seña a los compañeros', () => {
    const vistas: SeniasRecibidas[] = []
    const espia = (nivel: Nivel, semilla: number) => {
      const bot = crearBot(nivel, semilla)
      return { ...bot, decidir: (v: Parameters<typeof bot.decidir>[0], s?: SeniasRecibidas) => (s && vistas.push(s), bot.decidir(v, s)) }
    }
    jugarPartida({ semilla: 4, bots: [0, 1, 2, 3].map((i) => espia('medio', i)), config: { formato: '2v2', puntosPartida: 20 } })
    const conEnvido = vistas.filter((s) => s.envido && Object.keys(s.envido).length > 0)
    expect(conEnvido.length).toBeGreaterThan(0)
    for (const s of conEnvido) {
      for (const [a, t] of Object.entries(s.envido!)) {
        expect(s[Number(a)]).toContain('envido')
        expect(t).toBeGreaterThanOrEqual(ENVIDO_PARA_SENIAR)
      }
    }
  })
})
