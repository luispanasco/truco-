import { describe, expect, it } from 'vitest'
import { enfrentamientoActual } from '../src'
import { jugar, partidaCon, rechaza } from './helpers'

// Muestra 3 de copas. "a" es mano (equipo 0), "b" es pie (equipo 1).
// a: envido 7, b: envido 6. Ninguno tiene flor.
const sinFlor = () => partidaCon(['1e 7o 4b', '1b 2e 6o'], '3c')

describe('truco', () => {
  it('solo sube el equipo que aceptó el último canto', () => {
    let { estado } = jugar(sinFlor(), ['truco', 'a'])
    rechaza(estado, ['truco', 'a'], 'Esperá')
    ;({ estado } = jugar(estado, ['quiero', 'b']))
    expect(enfrentamientoActual(estado).truco.valor).toBe(2)
    rechaza(estado, ['truco', 'a'], 'Solo puede subir el equipo que aceptó')
    ;({ estado } = jugar(estado, ['jugar', 'a', '1e'], ['truco', 'b']))
    // Subir responde que sí a lo anterior.
    ;({ estado } = jugar(estado, ['truco', 'a']))
    expect(enfrentamientoActual(estado).truco.valor).toBe(3)
    ;({ estado } = jugar(estado, ['quiero', 'b']))
    expect(enfrentamientoActual(estado).truco.valor).toBe(4)
    rechaza(estado, ['truco', 'b'], 'No se puede subir más')
    ;({ estado } = jugar(
      estado,
      ['jugar', 'b', '2e'],
      ['jugar', 'a', '7o'],
      ['jugar', 'b', '1b'],
      ['jugar', 'b', '6o'],
      ['jugar', 'a', '4b'],
    ))
    expect(estado.puntos).toEqual([0, 4])
  })

  it('no querer entrega el valor anterior', () => {
    expect(jugar(sinFlor(), ['truco', 'a'], ['noQuiero', 'b']).estado.puntos).toEqual([1, 0])
    expect(jugar(sinFlor(), ['truco', 'a'], ['truco', 'b'], ['noQuiero', 'a']).estado.puntos).toEqual([0, 2])
    expect(
      jugar(sinFlor(), ['truco', 'a'], ['truco', 'b'], ['truco', 'a'], ['noQuiero', 'b']).estado.puntos,
    ).toEqual([3, 0])
  })

  it('no se puede cantar truco fuera de turno ni jugar con un canto pendiente', () => {
    rechaza(sinFlor(), ['truco', 'b'], 'No es tu turno')
    const { estado } = jugar(sinFlor(), ['truco', 'a'])
    rechaza(estado, ['jugar', 'a', '1e'], 'truco sin responder')
    rechaza(estado, ['quiero', 'a'], 'Esperá')
  })

  it('irse al mazo entrega lo que vale el truco aceptado', () => {
    expect(jugar(sinFlor(), ['mazo', 'a']).estado.puntos).toEqual([0, 1])
    expect(jugar(sinFlor(), ['truco', 'a'], ['quiero', 'b'], ['mazo', 'a']).estado.puntos).toEqual([0, 2])
    // Con un truco sin responder, cobra lo aceptado hasta ahí.
    expect(jugar(sinFlor(), ['truco', 'a'], ['mazo', 'b']).estado.puntos).toEqual([1, 0])
  })
})

describe('envido', () => {
  it('los cantos se encadenan y no querer da lo acumulado antes del último', () => {
    const { estado } = jugar(
      sinFlor(),
      ['envido', 'a'],
      ['envido', 'b'],
      ['realEnvido', 'a'],
      ['faltaEnvido', 'b'],
      ['noQuiero', 'a'],
      ['mazo', 'a'],
    )
    expect(estado.puntos).toEqual([0, 2 + 2 + 3 + 1])
  })

  it('no querer el primer canto da 1', () => {
    expect(jugar(sinFlor(), ['realEnvido', 'a'], ['noQuiero', 'b'], ['mazo', 'a']).estado.puntos).toEqual([1, 1])
  })

  it('cadenas inválidas', () => {
    const dos = jugar(sinFlor(), ['envido', 'a'], ['envido', 'b']).estado
    rechaza(dos, ['envido', 'a'], 'No se puede cantar eso')
    const real = jugar(sinFlor(), ['realEnvido', 'a']).estado
    rechaza(real, ['envido', 'b'], 'No se puede cantar eso')
    rechaza(real, ['realEnvido', 'b'], 'No se puede cantar eso')
    const falta = jugar(sinFlor(), ['faltaEnvido', 'a']).estado
    rechaza(falta, ['realEnvido', 'b'], 'No se puede cantar eso')
    rechaza(falta, ['faltaEnvido', 'b'], 'No se puede cantar eso')
    rechaza(dos, ['envido', 'b'], 'Esperá')
  })

  it('envido envido se puede desactivar', () => {
    const p = partidaCon(['1e 7o 4b', '1b 2e 6o'], '3c', { envidoEnvido: false })
    rechaza(jugar(p, ['envido', 'a']).estado, ['envido', 'b'], 'No se puede cantar eso')
  })

  it('querido: declara primero el mano y el otro dice un tanto mayor o son buenas', () => {
    let { estado } = jugar(sinFlor(), ['envido', 'a'], ['quiero', 'b'])
    rechaza(estado, ['declarar', 'b', 6], 'No te toca')
    rechaza(estado, ['declarar', 'a', 'sonBuenas'], 'El primero tiene que decir su tanto')
    rechaza(estado, ['declarar', 'a', 5], 'Tu tanto es 7')
    ;({ estado } = jugar(estado, ['declarar', 'a', 7]))
    rechaza(estado, ['declarar', 'b', 6], 'mayor')
    rechaza(estado, ['mazo', 'b'], 'declarar')
    ;({ estado } = jugar(estado, ['declarar', 'b', 'sonBuenas']))
    expect(enfrentamientoActual(estado).envido.ganador).toBe(0)
    expect(jugar(estado, ['mazo', 'a']).estado.puntos).toEqual([2, 1])
  })

  it('empate de tantos: gana el mano', () => {
    // b también tiene 7.
    const p = partidaCon(['1e 7o 4b', '7b 2e 6o'], '3c')
    const { estado } = jugar(p, ['envido', 'a'], ['quiero', 'b'], ['declarar', 'a', 7])
    rechaza(estado, ['declarar', 'b', 7], 'mayor')
  })

  it('el pie con más tanto le gana al mano', () => {
    const p = partidaCon(['1e 7o 4b', '7b 6b 2e'], '3c')
    const { estado } = jugar(p, ['envido', 'a'], ['quiero', 'b'], ['declarar', 'a', 7], ['declarar', 'b', 33])
    expect(enfrentamientoActual(estado).envido.ganador).toBe(1)
  })

  it('en 2v2 declaran en orden y el que ya va ganando no habla', () => {
    // a: 7, b: 26, c: 33, d: 5
    const p = partidaCon(['1e 7o 4b', '1b 2o 4o', '7e 6e 12b', '5e 11b 10o'], '3c')
    let { estado } = jugar(p, ['envido', 'a'], ['quiero', 'b'], ['declarar', 'a', 7], ['declarar', 'b', 26])
    // d no habla porque su equipo va ganando; le toca a c.
    rechaza(estado, ['declarar', 'd', 'sonBuenas'], 'No te toca')
    ;({ estado } = jugar(estado, ['declarar', 'c', 33]))
    // Ahora d tiene que hablar.
    ;({ estado } = jugar(estado, ['declarar', 'd', 'sonBuenas']))
    const e = enfrentamientoActual(estado)
    expect(e.envido.estado).toBe('resuelto')
    expect(e.envido.ganador).toBe(0)
  })

  it('solo en la primera vuelta y antes de jugar la carta', () => {
    const { estado } = jugar(sinFlor(), ['jugar', 'a', '1e'])
    // El pie todavía no jugó: puede envidar.
    jugar(estado, ['envido', 'b'])
    const segunda = jugar(estado, ['jugar', 'b', '2e']).estado
    rechaza(segunda, ['envido', 'a'], 'primera vuelta')
  })

  it('primero está el envido', () => {
    let { estado, eventos } = jugar(sinFlor(), ['truco', 'a'], ['envido', 'b'])
    expect(eventos).toContainEqual(expect.objectContaining({ tipo: 'cantoEnvido', primeroEstaElEnvido: true }))
    rechaza(estado, ['quiero', 'b'], 'Esperá')
    ;({ estado } = jugar(estado, ['quiero', 'a'], ['declarar', 'a', 7], ['declarar', 'b', 'sonBuenas']))
    // El truco sigue esperando respuesta de b.
    rechaza(estado, ['jugar', 'a', '1e'], 'truco sin responder')
    ;({ estado } = jugar(estado, ['quiero', 'b']))
    expect(enfrentamientoActual(estado).truco.valor).toBe(2)
  })

  it('con el truco ya aceptado no hay envido', () => {
    const { estado } = jugar(sinFlor(), ['truco', 'a'], ['quiero', 'b'])
    rechaza(estado, ['envido', 'a'], 'Ya se aceptó el truco')
  })

  it('irse al mazo con envido del rival pendiente: cobra el envido no querido', () => {
    expect(jugar(sinFlor(), ['envido', 'a'], ['mazo', 'b']).estado.puntos).toEqual([2, 0])
    const p = partidaCon(['1e 7o 4b', '1b 2e 6o'], '3c', { mazoCobraEnvidoPendiente: false })
    expect(jugar(p, ['envido', 'a'], ['mazo', 'b']).estado.puntos).toEqual([1, 0])
    // Si se va el que cantó, el rival no cobra ese envido.
    expect(jugar(sinFlor(), ['envido', 'a'], ['mazo', 'a']).estado.puntos).toEqual([0, 1])
  })

  it('falta envido: lo que le falta al que va ganando', () => {
    const p = sinFlor()
    p.puntos = [5, 10]
    const { estado } = jugar(p, ['faltaEnvido', 'a'], ['quiero', 'b'], ['declarar', 'a', 7], ['declarar', 'b', 'sonBuenas'], ['mazo', 'b'])
    expect(estado.puntos).toEqual([5 + 20 + 1, 10])
  })

  it('falta envido con los dos en malas y la opción "gana el partido"', () => {
    const p = partidaCon(['1e 7o 4b', '1b 2e 6o'], '3c', { faltaEnvidoEnMalas: 'ganaPartido' })
    p.puntos = [5, 10]
    const { estado, eventos } = jugar(p, ['faltaEnvido', 'a'], ['quiero', 'b'], ['declarar', 'a', 7], ['declarar', 'b', 'sonBuenas'], ['mazo', 'b'])
    expect(estado.puntos).toEqual([30, 10])
    expect(estado.ganador).toBe(0)
    expect(eventos).toContainEqual(expect.objectContaining({ tipo: 'partidaTerminada', ganador: 0 }))
  })

  it('el envido se anota antes que el truco: si gana el partido, el truco no cuenta', () => {
    const p = sinFlor()
    p.puntos = [28, 29]
    const { estado } = jugar(p, ['envido', 'a'], ['quiero', 'b'], ['declarar', 'a', 7], ['declarar', 'b', 'sonBuenas'], ['mazo', 'a'])
    expect(estado.puntos).toEqual([30, 29])
    expect(estado.ganador).toBe(0)
  })
})

describe('flor', () => {
  // a tiene flor de 38.
  const conFlor = (b = '1b 2o 4o', config = {}) => partidaCon(['7e 6e 5e', b], '3c', config)

  it('es obligatoria: hay que cantarla antes de jugar y no se puede envidar', () => {
    const p = conFlor()
    rechaza(p, ['jugar', 'a', '7e'], 'Tenés flor')
    rechaza(p, ['envido', 'a'], 'Tenés flor')
    const { estado } = jugar(p, ['flor', 'a'], ['jugar', 'a', '7e'])
    rechaza(estado, ['envido', 'b'], 'Con flor no hay envido')
    expect(jugar(estado, ['mazo', 'b']).estado.puntos).toEqual([4, 0])
  })

  it('si no es obligatoria, se puede jugar sin cantarla y se pierde', () => {
    const { estado } = jugar(conFlor('1b 2o 4o', { florObligatoria: false }), ['jugar', 'a', '7e'])
    rechaza(estado, ['flor', 'a'], 'primera vuelta')
    expect(jugar(estado, ['mazo', 'b']).estado.puntos).toEqual([1, 0])
  })

  it('no se puede cantar flor sin tenerla', () => {
    const { estado } = jugar(conFlor(), ['flor', 'a'], ['jugar', 'a', '7e'])
    rechaza(estado, ['flor', 'b'], 'No tenés flor')
  })

  it('el que tiene flor no puede responder el envido: la canta y el envido se anula', () => {
    const p = partidaCon(['1b 2o 4o', '7e 6e 5e'], '3c')
    const { estado } = jugar(p, ['envido', 'a'])
    rechaza(estado, ['quiero', 'b'], 'Tenés flor')
    const r = jugar(estado, ['flor', 'b'])
    expect(r.eventos).toContainEqual({ tipo: 'envidoAnulado' })
    expect(enfrentamientoActual(r.estado).envido.estado).toBe('anulado')
    expect(jugar(r.estado, ['mazo', 'a']).estado.puntos).toEqual([0, 4])
  })

  it('los dos con flor sin contraflor: se comparan y el mayor suma 3', () => {
    const { estado } = jugar(
      conFlor('1b 2b 3b'),
      ['flor', 'a'],
      ['jugar', 'a', '7e'],
      ['flor', 'b'],
      ['jugar', 'b', '1b'],
      ['jugar', 'b', '2b'],
      ['jugar', 'a', '6e'],
    )
    // b gana las dos vueltas (1 de truco); a gana la flor (38 contra 26).
    expect(estado.puntos).toEqual([3, 1])
  })

  it('flores iguales: gana el mano', () => {
    const { estado } = jugar(conFlor('7b 6b 5b'), ['flor', 'a'], ['jugar', 'a', '7e'], ['flor', 'b'], ['jugar', 'b', '7b'], ['jugar', 'a', '6e'], ['jugar', 'b', '6b'])
    expect(estado.mano.numero).toBe(2)
    expect(estado.puntos).toEqual([4, 0])
  })

  describe('contraflor', () => {
    const antesDeContra = () => jugar(conFlor('7b 6b 4b'), ['flor', 'a'], ['jugar', 'a', '7e']).estado

    it('querida: el de mayor flor gana el valor de la contraflor', () => {
      const { estado } = jugar(antesDeContra(), ['contraflor', 'b'], ['quiero', 'a'], ['mazo', 'b'])
      expect(estado.puntos).toEqual([6 + 1, 0])
    })

    it('no querida: el que la cantó se queda con los 3', () => {
      const { estado } = jugar(antesDeContra(), ['contraflor', 'b'], ['noQuiero', 'a'], ['mazo', 'b'])
      expect(estado.puntos).toEqual([1, 3])
    })

    it('al resto no querida: el que la cantó cobra la contraflor', () => {
      const { estado } = jugar(antesDeContra(), ['contraflor', 'b'], ['contraflorAlResto', 'a'], ['noQuiero', 'b'], ['mazo', 'b'])
      expect(estado.puntos).toEqual([6 + 1, 0])
    })

    it('al resto querida: el ganador cobra lo que falta para ganar', () => {
      const p = antesDeContra()
      p.puntos = [10, 20]
      const { estado } = jugar(p, ['contraflorAlResto', 'b'], ['quiero', 'a'], ['mazo', 'b'])
      expect(estado.puntos).toEqual([10 + 10 + 1, 20])
    })

    it('no se puede cantar contraflor sin flor del rival, ni subir más allá del resto', () => {
      rechaza(jugar(conFlor('7b 6b 4b'), ['flor', 'a']).estado, ['contraflor', 'a'], 'El rival no cantó flor')
      const alResto = jugar(antesDeContra(), ['contraflorAlResto', 'b']).estado
      rechaza(alResto, ['contraflorAlResto', 'a'], 'No se puede subir más')
    })
  })

  it('en 2v2, dos flores del mismo equipo suman 3 cada una', () => {
    const p = partidaCon(['7e 6e 5e', '1b 2o 4o', '7b 6b 4b', '1o 3e 12o'], '3c')
    const { estado } = jugar(
      p,
      ['flor', 'a'],
      ['jugar', 'a', '7e'],
      ['jugar', 'b', '2o'],
      ['flor', 'c'],
      ['jugar', 'c', '7b'],
      ['mazo', 'd'],
    )
    expect(estado.puntos).toEqual([3 + 3 + 1, 0])
  })

  it('en 2v2 con flor en los dos equipos, el ganador suma 3 en total', () => {
    const p = partidaCon(['7e 6e 5e', '1b 2b 3b', '7o 6o 4o', '1o 3e 12o'], '3c')
    const { estado } = jugar(
      p,
      ['flor', 'a'],
      ['jugar', 'a', '7e'],
      ['flor', 'b'],
      ['jugar', 'b', '1b'],
      ['flor', 'c'],
      ['jugar', 'c', '7o'],
      ['mazo', 'd'],
    )
    expect(estado.puntos).toEqual([3 + 1, 0])
  })
})
