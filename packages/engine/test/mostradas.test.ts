import { describe, expect, it } from 'vitest'
import type { EstadoPartida, Evento, ResultadoEnfrentamiento } from '../src'
import { jugar, mano, partidaCon } from './helpers'

// Muestra 3 de copas. "a" es mano (equipo 0), "b" es pie (equipo 1).
// a: envido 7, b: envido 6. Ninguno tiene flor.
const sinFlor = () => partidaCon(['1e 7o 4b', '1b 2e 6o'], '3c')
// a tiene flor de 38.
const conFlor = () => partidaCon(['7e 6e 5e', '1b 2o 4o'], '3c')

/** El resultado que trae el evento de fin del (único) enfrentamiento. */
function resultado(eventos: Evento[]): ResultadoEnfrentamiento {
  const ev = eventos.find((x) => x.tipo === 'enfrentamientoTerminado')
  if (!ev || ev.tipo !== 'enfrentamientoTerminado') throw new Error('No terminó el enfrentamiento')
  return ev.resultado
}

describe('cartas mostradas al terminar', () => {
  it('el que cantó flor da vuelta las que le quedaron si el rival se va al mazo', () => {
    const { eventos } = jugar(conFlor(), ['flor', 'a'], ['jugar', 'a', '7e'], ['mazo', 'b'])
    expect(resultado(eventos).mostradas).toEqual([{ asiento: 0, cartas: mano('6e 5e') }])
  })

  it('el que ganó el envido querido muestra la carta que no jugó si se gana en dos vueltas', () => {
    const { eventos } = jugar(
      sinFlor(),
      ['envido', 'a'],
      ['quiero', 'b'],
      ['declarar', 'a', 7],
      ['declarar', 'b', 'sonBuenas'],
      ['jugar', 'a', '1e'],
      ['jugar', 'b', '2e'],
      ['jugar', 'a', '7o'],
      ['jugar', 'b', '6o'],
    )
    const r = resultado(eventos)
    expect(r.motivo).toBe('vueltas')
    expect(r.mostradas).toEqual([{ asiento: 0, cartas: mano('4b') }])
  })

  it('si gana el envido el que declaró segundo, muestra él y no el otro', () => {
    const { eventos } = jugar(
      partidaCon(['1b 2e 6o', '1e 7o 4b'], '3c'),
      ['envido', 'a'],
      ['quiero', 'b'],
      ['declarar', 'a', 6],
      ['declarar', 'b', 7],
      ['mazo', 'a'],
    )
    expect(resultado(eventos).mostradas).toEqual([{ asiento: 1, cartas: mano('1e 7o 4b') }])
  })

  it('con envido no querido no se muestra nada', () => {
    const { eventos } = jugar(
      sinFlor(),
      ['envido', 'a'],
      ['noQuiero', 'b'],
      ['jugar', 'a', '1e'],
      ['jugar', 'b', '2e'],
      ['jugar', 'a', '7o'],
      ['jugar', 'b', '6o'],
    )
    expect(resultado(eventos).mostradas).toEqual([])
  })

  it('sin cantos no se muestra nada', () => {
    const { eventos } = jugar(sinFlor(), ['mazo', 'b'])
    expect(resultado(eventos).mostradas).toEqual([])
  })

  it('si se llega a la tercera vuelta no queda nada por mostrar', () => {
    const { eventos } = jugar(
      sinFlor(),
      ['envido', 'a'],
      ['quiero', 'b'],
      ['declarar', 'a', 7],
      ['declarar', 'b', 'sonBuenas'],
      ['jugar', 'a', '4b'],
      ['jugar', 'b', '1b'],
      ['jugar', 'b', '2e'],
      ['jugar', 'a', '1e'],
      ['jugar', 'a', '7o'],
      ['jugar', 'b', '6o'],
    )
    expect(resultado(eventos).mostradas).toEqual([])
  })

  it('queda guardado en el resultado del enfrentamiento y en pica-pica cada duelo muestra lo suyo', () => {
    // Equipo 0: a, c, e. Equipo 1: b, d, f. Duelo 1: a contra d.
    let estado: EstadoPartida = partidaCon(
      ['1e 7o 4b', '1b 2e 6o', '7e 5o 12b', '3e 6b 11o', '2b 5e 10o', '3o 7b 12e'],
      '3c',
      { picaPicaAlternado: false },
    )
    let eventos: Evento[]
    ;({ estado, eventos } = jugar(
      estado,
      ['envido', 'a'],
      ['quiero', 'd'],
      ['declarar', 'a', 7],
      ['declarar', 'd', 'sonBuenas'],
      ['mazo', 'd'],
    ))
    expect(resultado(eventos).mostradas).toEqual([{ asiento: 0, cartas: mano('1e 7o 4b') }])
    expect(estado.mano.enfrentamientos[0]!.resultado!.mostradas).toEqual([{ asiento: 0, cartas: mano('1e 7o 4b') }])
    // Duelo 2: b contra e, sin cantos.
    ;({ eventos } = jugar(estado, ['mazo', 'e']))
    expect(resultado(eventos).mostradas).toEqual([])
  })
})
