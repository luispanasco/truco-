import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { ColyseusTestServer } from '@colyseus/testing'
import type { Accion } from '@truco/engine'
import { MOTIVO_SENIA_TARDE, yaJugoEnLaMano, type ConfigSenias } from '@truco/shared'
import { esperarMs, Jugador, levantar, salaEnServidor } from './helpers'

let colyseus: ColyseusTestServer

beforeAll(async () => {
  // Tiempos rápidos: los bots juegan enseguida y el turno de las personas no vence.
  ;({ colyseus } = await levantar(2574, { tiempos: { botMinMs: 0, botMaxMs: 0, pausaVueltaMs: 0, pausaManoMs: 0, turnoMs: 60_000, reconexionS: 1 } }))
})
afterAll(async () => colyseus.shutdown())
beforeEach(async () => colyseus.cleanup())

/**
 * Un 2v2 con dos personas rivales: `a` en el asiento 0 (es mano) y `b` en el 1. Los
 * compañeros son bots: el 2 de `a` y el 3 de `b`.
 */
async function mesa(senias: Partial<ConfigSenias>) {
  const a = await Jugador.crear(colyseus, { config: { formato: '2v2' }, senias })
  await a.esperar(() => a.sala !== null)
  const b = await Jugador.unirse(colyseus, a.sala!.codigo!)
  await b.esperar(() => b.sala?.yo === 1)
  a.enviar('iniciar', {})
  await a.esperar(() => a.vista !== null && a.vista.esperandoA.includes(0), 5_000, 'el turno de a')
  await b.esperar(() => b.vista !== null)
  return { a, b, sala: salaEnServidor(colyseus, a.room.roomId) }
}

describe('señas pescadas', () => {
  it('la configuración de señas llega en la sala', async () => {
    const { a } = await mesa({ pescar: 'gestoYCarta', probabilidadPescar: 0.35, momento: 'antesDeJugar' })
    expect(a.sala!.senias).toEqual({ habilitadas: true, pescar: 'gestoYCarta', probabilidadPescar: 0.35, momento: 'antesDeJugar' })
  })

  it('con probabilidad 1 y "gestoYCarta", el rival ve la seña entera y el bot rival la anota', async () => {
    const { a, b, sala } = await mesa({ pescar: 'gestoYCarta', probabilidadPescar: 1 })
    a.enviar('senia', { senia: 'tres' })
    await b.esperar(() => b.de('seniaPescada').some((p) => p.de === 0), 5_000, 'la seña pescada')
    expect(b.de('seniaPescada').filter((p) => p.de === 0)).toEqual([{ de: 0, senia: 'tres' }])
    // Al rival no le llega como seña de compañero.
    expect(b.de('senia').some((s) => s.de === 0)).toBe(false)
    // El bot rival (asiento 3) la tiene para imaginar la mano de a; el compañero (2), como siempre.
    expect(sala.seniasParaTests()[3]![0]).toEqual(['tres'])
    expect(sala.seniasParaTests()[2]![0]).toEqual(['tres'])
    // Las señas de los bots al empezar la mano también se pescan: las de 3 las ve a.
    const deBot3 = a.de('seniaPescada').filter((p) => p.de === 3)
    expect(deBot3.every((p) => p.senia !== null)).toBe(true)
    expect(a.de('senia').every((s) => s.de === 2)).toBe(true)
  })

  it('con "gesto", el rival ve que hubo una seña pero no cuál, y el bot rival no anota nada', async () => {
    const { a, b, sala } = await mesa({ pescar: 'gesto', probabilidadPescar: 1 })
    a.enviar('senia', { senia: 'perico' })
    await b.esperar(() => b.de('seniaPescada').some((p) => p.de === 0), 5_000, 'la seña pescada')
    expect(b.de('seniaPescada').filter((p) => p.de === 0)).toEqual([{ de: 0, senia: null }])
    expect(sala.seniasParaTests()[3]![0]).toBeUndefined()
    expect(a.de('seniaPescada').every((p) => p.senia === null)).toBe(true)
  })

  it('con probabilidad 0 (o "nunca") no se pesca nada', async () => {
    for (const senias of [{ pescar: 'gestoYCarta', probabilidadPescar: 0 }, { pescar: 'nunca', probabilidadPescar: 1 }] as const) {
      const { a, b, sala } = await mesa(senias)
      a.enviar('senia', { senia: 'flor' })
      // La seña llega al compañero bot; al rival no.
      await esperarMs(300)
      expect(sala.seniasParaTests()[2]![0]).toEqual(['flor'])
      expect(b.de('seniaPescada')).toEqual([])
      expect(a.de('seniaPescada')).toEqual([])
      expect(sala.seniasParaTests()[3]![0]).toBeUndefined()
      a.room.leave()
      b.room.leave()
    }
  })
})

/**
 * `a` tira su primera carta. Si hay flor de por medio, `a` y `b` la cantan o la quieren
 * antes. Después `b` no juega, así la mano queda quieta.
 */
async function jugarPrimeraCarta(a: Jugador, b: Jugador) {
  const jugo = () => yaJugoEnLaMano(a.vista!.mano, 0)
  const elegir = (validas: Accion[], primero: Accion['tipo'][]) =>
    primero.map((t) => validas.find((x) => x.tipo === t)).find((x) => x !== undefined)
  for (let i = 0; i < 20 && !jugo(); i++) {
    const [quien, orden] = a.vista!.esperandoA.includes(0)
      ? ([a, ['jugarCarta', 'cantarFlor', 'responder']] as const)
      : b.vista!.esperandoA.includes(1)
        ? ([b, ['cantarFlor', 'responder', 'jugarCarta']] as const)
        : ([null, []] as const)
    const antes = a.vistas.length
    if (quien) {
      const accion = elegir(quien.vista!.accionesValidas, [...orden])
      if (accion) quien.enviar('accion', { accion })
    }
    await a.esperar(() => a.vistas.length > antes, 5_000, 'una vista nueva')
  }
  expect(jugo()).toBe(true)
}

describe('momento de las señas', () => {
  it('"antesDeJugar" deja hacer señas antes de tirar la primera carta y después las rechaza', async () => {
    const { a, b, sala } = await mesa({ pescar: 'nunca', momento: 'antesDeJugar' })
    a.enviar('senia', { senia: 'pieza2' })
    await esperarMs(200)
    expect(a.de('error')).toEqual([])
    expect(sala.seniasParaTests()[2]![0]).toEqual(['pieza2'])

    await jugarPrimeraCarta(a, b)
    a.enviar('senia', { senia: 'tres' })
    await a.esperar(() => a.de('error').length > 0, 5_000, 'el rechazo')
    expect(a.de('error')[0]!.motivo).toBe(MOTIVO_SENIA_TARDE)
    expect(sala.seniasParaTests()[2]![0]).toEqual(['pieza2'])
  })

  it('"libre" deja hacer señas después de jugar', async () => {
    const { a, b, sala } = await mesa({ pescar: 'nunca' })
    await jugarPrimeraCarta(a, b)
    a.enviar('senia', { senia: 'tres' })
    await esperarMs(200)
    expect(a.de('error')).toEqual([])
    expect(sala.seniasParaTests()[2]![0]).toEqual(['tres'])
  })
})

describe('pedir que te repitan las señas', () => {
  it('el compañero bot repite lo que ya marcó, sin anotarlo de nuevo; si no marcó nada, avisa', async () => {
    const { a, b, sala } = await mesa({ pescar: 'nunca' })
    const primeras = a.de('senia').filter((s) => s.de === 2)
    a.enviar('pedirSenias', { asiento: 2 })
    if (primeras.length > 0) {
      await a.esperar(() => a.de('senia').filter((s) => s.de === 2).length === primeras.length * 2, 5_000, 'la repetición')
      const repetidas = a.de('senia').filter((s) => s.de === 2).slice(primeras.length)
      expect(repetidas.map((s) => s.senia)).toEqual(primeras.map((s) => s.senia))
      expect(repetidas.every((s) => s.repetida === true && s.mano === a.vista!.mano.numero)).toBe(true)
      expect(sala.seniasParaTests()[0]![2]).toEqual(primeras.map((s) => s.senia))
    } else {
      await a.esperar(() => a.de('error').length > 0, 5_000, 'el aviso')
      expect(a.de('error')[0]!.motivo).toMatch(/no tiene señas para hacerte$/)
    }
    // Al rival no le llega nada como seña de compañero.
    expect(b.de('senia').some((s) => s.de === 2)).toBe(false)
  })

  it('no se le pueden pedir señas a un rival, ni pedir dos veces seguidas al mismo', async () => {
    const { a } = await mesa({ pescar: 'nunca' })
    a.enviar('pedirSenias', { asiento: 1 })
    await a.esperar(() => a.de('error').length === 1, 5_000, 'el rechazo')
    expect(a.de('error')[0]!.motivo).toBe('Solo le podés pedir señas a un compañero')
    a.enviar('pedirSenias', { asiento: 2 })
    await esperarMs(150)
    const errores = a.de('error').length
    a.enviar('pedirSenias', { asiento: 2 })
    await a.esperar(() => a.de('error').length > errores, 5_000, 'el límite')
    expect(a.de('error').at(-1)!.motivo).toBe('Esperá un poco antes de volver a pedirle')
  })

  it('entre personas: al compañero le llega el pedido y "repetir" le vuelve a mandar sus señas', async () => {
    const a = await Jugador.crear(colyseus, { config: { formato: '2v2' }, senias: { pescar: 'gestoYCarta', probabilidadPescar: 1 } })
    await a.esperar(() => a.sala !== null)
    const codigo = a.sala!.codigo!
    const b = await Jugador.unirse(colyseus, codigo) // asiento 1, rival
    const c = await Jugador.unirse(colyseus, codigo) // asiento 2, compañero de a
    await c.esperar(() => c.sala?.yo === 2)
    a.enviar('iniciar', {})
    await c.esperar(() => c.vista !== null)
    await a.esperar(() => a.vista !== null)

    // Sin señas hechas todavía, repetir se rechaza.
    c.enviar('repetirSenias', {})
    await c.esperar(() => c.de('error').length === 1, 5_000, 'el rechazo')
    expect(c.de('error')[0]!.motivo).toBe('Todavía no hiciste señas en esta mano')

    c.enviar('senia', { senia: 'perico' })
    c.enviar('senia', { senia: 'tres' })
    await a.esperar(() => a.de('senia').filter((s) => s.de === 2).length === 2, 5_000, 'las señas')

    a.enviar('pedirSenias', { asiento: 2 })
    await c.esperar(() => c.de('pidenSenias').length === 1, 5_000, 'el pedido')
    expect(c.de('pidenSenias')).toEqual([{ de: 0 }])
    expect(b.de('pidenSenias')).toEqual([])

    c.enviar('repetirSenias', {})
    await a.esperar(() => a.de('senia').filter((s) => s.de === 2).length === 4, 5_000, 'la repetición')
    const deC = a.de('senia').filter((s) => s.de === 2)
    expect(deC.map((s) => [s.senia, s.repetida ?? false])).toEqual([
      ['perico', false],
      ['tres', false],
      ['perico', true],
      ['tres', true],
    ])
    // Repetir tiene el riesgo de siempre: el rival la puede pescar.
    await b.esperar(() => b.de('seniaPescada').filter((p) => p.de === 2).length === 4, 5_000, 'las pescadas')
    expect(b.de('senia').some((s) => s.de === 2)).toBe(false)
  })
})
