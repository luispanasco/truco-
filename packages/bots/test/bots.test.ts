import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  accionesValidas,
  apply,
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
import { crearBot, jugarPartida, seniasDeMano, type Nivel, type SeniasRecibidas } from '../src'
import { Aleatorio, crearContexto } from '../src/contexto'
import { muestrear } from '../src/muestreo'

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

const NIVELES: Nivel[] = ['facil', 'medio', 'dificil']

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
        }),
        (formato, niveles, semilla, config) => {
          const n = formato === '1v1' ? 2 : formato === '2v2' ? 4 : 6
          const bots = niveles.slice(0, n).map((nivel, i) => crearBot(nivel, semilla + i))
          // jugarPartida falla si algún bot elige una acción inválida o si se traba.
          const r = jugarPartida({ bots, semilla, config: { ...config, formato } })
          expect(r.puntos[r.ganador]).toBe(30)
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
})
