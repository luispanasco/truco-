import fc from 'fast-check'
import { describe, expect, it } from 'vitest'
import {
  apply,
  crearPartida,
  mismaCarta,
  vistaPara,
  type Accion,
  type Carta,
  type ConfigSala,
  type EstadoPartida,
  type Formato,
} from '../src'
import { IDS, pasoAlAzar } from './helpers'

const MAX_PASOS = 20_000

const arbConfig = fc.record<Partial<ConfigSala>>({
  formato: fc.constantFrom<Formato>('1v1', '2v2', '3v3'),
  florObligatoria: fc.boolean(),
  envidoEnvido: fc.boolean(),
  mazoCobraEnvidoPendiente: fc.boolean(),
  faltaEnvidoEnMalas: fc.constantFrom('completarMalas', 'loQueFalta', 'ganaPartido'),
  empiezaTrasParda: fc.constantFrom('quienEmpezo', 'mano'),
  florConPiezas: fc.constantFrom('piezaMayorMasDigitos', 'piezaMayorMasNumero'),
  picaPica: fc.boolean(),
  picaPicaAlternado: fc.boolean(),
  modoSucio: fc.boolean(),
})

function nueva(config: Partial<ConfigSala>, semilla: number): EstadoPartida {
  const n = config.formato === '1v1' ? 2 : config.formato === '2v2' ? 4 : 6
  return crearPartida({
    jugadores: IDS.slice(0, n).map((id) => ({ id, nombre: id })),
    semilla,
    config,
  })
}

/** Juega una partida entera al azar, llamando a `alPaso` con cada estado. */
function partidaAlAzar(
  config: Partial<ConfigSala>,
  semilla: number,
  semillaJuego: number,
  alPaso: (estado: EstadoPartida) => void = () => {},
): { final: EstadoPartida; acciones: Accion[] } {
  let estado = nueva(config, semilla)
  let rng = semillaJuego >>> 0
  const acciones: Accion[] = []
  alPaso(estado)
  for (let i = 0; i < MAX_PASOS && estado.ganador === null; i++) {
    const paso = pasoAlAzar(estado, rng)
    if (!paso) throw new Error(`La partida se trabó en el paso ${i}`)
    rng = paso.rng
    const r = apply(estado, paso.accion)
    if (!r.ok) throw new Error(`accionesValidas devolvió una acción inválida: ${r.motivo}`)
    acciones.push(paso.accion)
    estado = r.estado
    alPaso(estado)
  }
  return { final: estado, acciones }
}

function cartasDentro(x: unknown, out: Carta[] = []): Carta[] {
  if (Array.isArray(x)) {
    for (const y of x) cartasDentro(y, out)
  } else if (x !== null && typeof x === 'object') {
    const o = x as Record<string, unknown>
    if (typeof o.numero === 'number' && typeof o.palo === 'string') out.push(o as unknown as Carta)
    else for (const v of Object.values(o)) cartasDentro(v, out)
  }
  return out
}

describe('propiedades', () => {
  it('toda partida al azar termina en el puntaje objetivo, sin trabarse y sin que el puntaje baje', () => {
    fc.assert(
      fc.property(arbConfig, fc.integer(), fc.integer(), (config, semilla, semillaJuego) => {
        let anterior: [number, number] = [0, 0]
        const { final } = partidaAlAzar(config, semilla, semillaJuego, (estado) => {
          expect(estado.puntos[0]).toBeGreaterThanOrEqual(anterior[0])
          expect(estado.puntos[1]).toBeGreaterThanOrEqual(anterior[1])
          anterior = [...estado.puntos]
        })
        expect(final.ganador).not.toBeNull()
        expect(final.puntos[final.ganador!]).toBe(30)
      }),
      { numRuns: 60 },
    )
  })

  it('la misma semilla y las mismas acciones reproducen la partida idéntica', () => {
    fc.assert(
      fc.property(arbConfig, fc.integer(), fc.integer(), (config, semilla, semillaJuego) => {
        const { final, acciones } = partidaAlAzar(config, semilla, semillaJuego)
        let estado = nueva(config, semilla)
        for (const a of acciones) {
          const r = apply(estado, a)
          if (!r.ok) throw new Error(r.motivo)
          estado = r.estado
        }
        expect(estado).toEqual(final)
      }),
      { numRuns: 30 },
    )
  })

  it('ninguna vista contiene cartas ajenas no jugadas ni el generador', () => {
    fc.assert(
      fc.property(arbConfig, fc.integer(), fc.integer(), (config, semilla, semillaJuego) => {
        partidaAlAzar(config, semilla, semillaJuego, (estado) => {
          for (const j of estado.jugadores) {
            const vista = vistaPara(estado, j.id)
            expect(vista).not.toHaveProperty('rng')
            expect(vista).not.toHaveProperty('semilla')
            // Las que se dieron vuelta al terminar un enfrentamiento (flor o envido ganado) son públicas.
            const mostradas = estado.mano.enfrentamientos.flatMap((e) => e.resultado?.mostradas ?? [])
            const ocultas = estado.mano.cartas.flatMap((cs, asiento) =>
              asiento === j.asiento
                ? []
                : cs.filter((c) => !mostradas.some((m) => m.asiento === asiento && m.cartas.some((x) => mismaCarta(x, c)))),
            )
            for (const vista_c of cartasDentro(vista)) {
              if (ocultas.some((o) => mismaCarta(o, vista_c))) {
                throw new Error(`La vista de ${j.id} contiene una carta ajena: ${vista_c.numero} de ${vista_c.palo}`)
              }
            }
          }
        })
      }),
      { numRuns: 12 },
    )
  })

  it('apply no modifica el estado recibido', () => {
    fc.assert(
      fc.property(arbConfig, fc.integer(), fc.integer(), (config, semilla, semillaJuego) => {
        let estado = nueva(config, semilla)
        let rng = semillaJuego >>> 0
        for (let i = 0; i < 200 && estado.ganador === null; i++) {
          const paso = pasoAlAzar(estado, rng)!
          rng = paso.rng
          const copia = structuredClone(estado)
          const r = apply(estado, paso.accion)
          expect(estado).toEqual(copia)
          if (!r.ok) throw new Error(r.motivo)
          estado = r.estado
        }
      }),
      { numRuns: 20 },
    )
  })
})
