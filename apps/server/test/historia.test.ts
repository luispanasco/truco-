import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { ColyseusTestServer } from '@colyseus/testing'
import { HISTORIAS, idBaraja, idMesa, idMonedas } from '@truco/shared'
import { baseLocal, type Base } from '../src/cuentas/base'
import { verificadorDePrueba } from '../src/cuentas/auth'
import { entrar } from '../src/cuentas/cuentas'
import { ganarNivel, progresoHistoria } from '../src/cuentas/historia'
import { inventario } from '../src/cuentas/tienda'
import { saldo } from '../src/cuentas/monedas'
import { Jugador, levantar, salaEnServidor } from './helpers'
import { elencoDelNivel } from '@truco/shared'

let base: Base
let colyseus: ColyseusTestServer
let n = 0

beforeAll(async () => {
  base = await baseLocal()
  ;({ colyseus } = await levantar(2601, { cuentas: { base, verificar: verificadorDePrueba, loginDePrueba: true } }))
})
afterAll(async () => {
  await colyseus.shutdown()
  await base.cerrar()
})
afterEach(() => {
  delete process.env.ADMINS
})
beforeEach(async () => colyseus.cleanup())

async function cuenta(): Promise<{ id: string; token: string; email: string }> {
  const email = `historia${++n}@ejemplo.com`
  const token = `prueba:${email}`
  const u = (await verificadorDePrueba(token))!
  await entrar(base, u, { apodo: `H${n}` })
  return { id: u.id, token, email }
}

describe('modo historia', () => {
  it('los niveles se abren de a uno; la primera vez da sus recompensas, después ya no', async () => {
    const { id } = await cuenta()
    // Para el admin (todo abierto).
    await expect(ganarNivel(base, id, 'rocha', 2, true)).rejects.toThrow('Primero ganá el nivel anterior')
    await expect(ganarNivel(base, id, 'rocha', 9)).rejects.toThrow('Ese nivel no existe')
    await expect(ganarNivel(base, id, 'narnia', 1)).rejects.toThrow('Ese nivel no existe')

    const rocha = HISTORIAS.rocha!
    const r1 = await ganarNivel(base, id, 'rocha', 1, true)
    expect(r1.nuevas).toEqual(rocha.niveles[0]!.recompensas)
    expect(r1.progreso).toEqual({ rocha: [1] })
    // Repetir un nivel ganado se puede, pero no vuelve a dar nada.
    expect((await ganarNivel(base, id, 'rocha', 1, true)).nuevas).toEqual([])

    for (let nivel = 2; nivel <= rocha.niveles.length; nivel++) await ganarNivel(base, id, 'rocha', nivel, true)
    expect(await progresoHistoria(base, id)).toEqual({ rocha: [1, 2, 3, 4, 5] })
    const tiene = await inventario(base, id)
    expect(tiene).toEqual(expect.arrayContaining([idBaraja('costa'), idMesa('rocha'), ...rocha.niveles.flatMap((x) => x.recompensas)]))
  })

  it('se arranca en Rocha; los departamentos sin publicar, solo el admin', async () => {
    const { id } = await cuenta()
    await expect(ganarNivel(base, id, 'montevideo', 1)).rejects.toThrow('Ese departamento todavía no está abierto')
    for (let nivel = 1; nivel <= HISTORIAS.rocha!.niveles.length; nivel++) await ganarNivel(base, id, 'rocha', nivel)
    // Completar Rocha no abre a sus vecinos mientras no estén publicados.
    await expect(ganarNivel(base, id, 'maldonado', 1)).rejects.toThrow('Ese departamento todavía no está abierto')
    expect((await ganarNivel(base, id, 'maldonado', 1, true)).progreso).toEqual({ maldonado: [1], rocha: [1, 2, 3, 4, 5] })
  })

  it('los niveles que dan monedas las suman al saldo, una sola vez', async () => {
    const { id } = await cuenta()
    expect(HISTORIAS.artigas!.niveles[0]!.recompensas).toEqual([idMonedas(100)])
    const antes = await saldo(base, id)
    const r = await ganarNivel(base, id, 'artigas', 1, true)
    expect(r.nuevas).toEqual([idMonedas(100)])
    expect(r.saldo).toBe(antes + 100)
    expect((await ganarNivel(base, id, 'artigas', 1, true)).nuevas).toEqual([])
    expect(await saldo(base, id)).toBe(antes + 100)
    // Las monedas no van al inventario.
    expect(await inventario(base, id)).not.toContain(idMonedas(100))
  })

  it('la API es para cualquiera con cuenta; los departamentos sin publicar, solo para los admins', async () => {
    const yo = await cuenta()
    const pedir = async (ruta: string, body?: unknown): Promise<{ status: number; data: unknown }> => {
      const http = body ? colyseus.http.post : colyseus.http.get
      try {
        const r = await http(`/api${ruta}`, { headers: { 'content-type': 'application/json', authorization: `Bearer ${yo.token}` }, ...(body ? { body } : {}) })
        return { status: r.statusCode, data: r.data }
      } catch (e) {
        const r = e as { statusCode: number; data: unknown }
        return { status: r.statusCode, data: r.data }
      }
    }
    expect((await pedir('/historia')).data).toEqual({ progreso: {} })
    const r = await pedir('/historia/ganar', { departamento: 'rocha', nivel: 1 })
    expect((r.data as { progreso: unknown }).progreso).toEqual({ rocha: [1] })
    expect((await pedir('/historia/ganar', { departamento: 'rocha', nivel: 3 })).status).toBe(409)
    expect((await pedir('/historia/ganar', { departamento: 'artigas', nivel: 1 })).status).toBe(409)

    process.env.ADMINS = yo.email
    const admin = await pedir('/historia/ganar', { departamento: 'artigas', nivel: 1 })
    expect((admin.data as { progreso: unknown }).progreso).toEqual({ artigas: [1], rocha: [1] })
  })
})

describe('modo historia en cooperativo', () => {
  it('la sala del nivel: la abre cualquiera con cuenta, las personas van del mismo lado y los demás son el elenco', async () => {
    const admin = await cuenta()
    const amigo = await cuenta()
    process.env.ADMINS = admin.email
    // Sin ser admin, un departamento sin publicar no se abre; y sin cuenta, ninguno.
    await expect(Jugador.crear(colyseus, { token: amigo.token, historia: { departamento: 'canelones', nivel: 2 } })).rejects.toThrow()
    await expect(Jugador.crear(colyseus, { historia: { departamento: 'rocha', nivel: 2 } })).rejects.toThrow()
    // Un nivel mano a mano no es para jugar de a dos.
    await expect(Jugador.crear(colyseus, { token: admin.token, historia: { departamento: 'rocha', nivel: 1 } })).rejects.toThrow()

    const a = await Jugador.crear(colyseus, { token: admin.token, historia: { departamento: 'rocha', nivel: 4 }, config: { formato: '1v1' } })
    await a.esperar(() => a.sala?.yo === 0)
    const sala = a.sala!
    // El nivel manda: 3v3, muy difícil, a 30, en la mesa de Rocha (aunque se pida otra cosa).
    expect([sala.formato, sala.nivelBots, sala.config.puntosPartida, sala.mesa, sala.baraja]).toEqual(['3v3', 'muyDificil', 30, 'rocha', 'costa'])
    expect(sala.historia).toEqual({ departamento: 'rocha', nivel: 4 })

    const b = await Jugador.unirse(colyseus, sala.codigo!, undefined, 'Amigo', { token: amigo.token })
    await b.esperar(() => b.sala?.yo != null)
    expect(b.sala!.yo! % 2).toBe(0)
    a.enviar('configurar', { config: { formato: '1v1' } })
    await a.esperar(() => a.de('error').length > 0)

    a.enviar('iniciar', {})
    await a.esperar(() => a.sala?.fase === 'jugando')
    const elenco = elencoDelNivel(HISTORIAS.rocha!.niveles[3]!)
    for (const l of a.sala!.lugares) {
      if (l.tipo === 'bot') expect(l.apodo).toBe(elenco[l.asiento - 1]!.nombre)
    }

    // Al ganar, a cada uno se le anota si tenía abierto el nivel (el amigo, que no tiene Rocha abierto ni el 3, no).
    for (let nivel = 1; nivel <= 3; nivel++) await ganarNivel(base, admin.id, 'rocha', nivel, true)
    await (salaEnServidor(colyseus, a.room.roomId) as unknown as { anotarHistoria(g: 0 | 1): Promise<void> }).anotarHistoria(0)
    await a.esperar(() => a.de('historia').length > 0)
    expect(a.de('historia')[0]).toEqual({ nuevas: HISTORIAS.rocha!.niveles[3]!.recompensas, anotado: true, saldo: expect.any(Number) })
    await b.esperar(() => b.de('historia').length > 0)
    expect(b.de('historia')[0]).toEqual({ nuevas: [], anotado: false })
  })
})

