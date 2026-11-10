import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { MISIONES_DE_UNA_VEZ, MISIONES_POR_DIA, misionesDelDia } from '@truco/shared'
import { baseLocal, type Base } from '../src/cuentas/base'
import { verificadorDePrueba } from '../src/cuentas/auth'
import { entrar } from '../src/cuentas/cuentas'
import { crearGrupo, entrarAGrupo } from '../src/cuentas/grupos'
import { ganarNivel } from '../src/cuentas/historia'
import { anotarPartidaJugada, cobrarMision, misiones } from '../src/cuentas/misiones'
import { pagarPartida, saldo } from '../src/cuentas/monedas'

let base: Base
let n = 0

beforeAll(async () => {
  base = await baseLocal()
})
afterAll(async () => {
  await base.cerrar()
})

async function cuenta(): Promise<string> {
  const email = `misiones${++n}@ejemplo.com`
  const u = (await verificadorDePrueba(`prueba:${email}`))!
  await entrar(base, u, { apodo: `M${n}` })
  return u.id
}

const MEDIODIA = new Date('2026-11-10T15:00:00Z')
const MANIANA = new Date('2026-11-11T15:00:00Z')

describe('misiones', () => {
  it('las del día son tres, sin repetir, siempre las mismas para el mismo día y la misma cuenta', () => {
    for (const conGrupo of [false, true]) {
      const hoy = misionesDelDia('2026-11-10', 'c1', conGrupo)
      expect(hoy).toHaveLength(MISIONES_POR_DIA)
      expect(new Set(hoy.map((m) => m.id)).size).toBe(MISIONES_POR_DIA)
      expect(misionesDelDia('2026-11-10', 'c1', conGrupo)).toEqual(hoy)
      // La del grupo, solo si estás en uno.
      if (!conGrupo) expect(hoy.some((m) => m.id === 'con-grupo')).toBe(false)
    }
    // Con grupo, en algún día sale la del grupo.
    const dias = Array.from({ length: 30 }, (_, i) => `2026-12-${String(i + 1).padStart(2, '0')}`)
    expect(dias.some((d) => misionesDelDia(d, 'c1', true).some((m) => m.id === 'con-grupo'))).toBe(true)
  })

  it('las de una vez avanzan con lo que hacés, se cobran una sola vez y ya no se muestran', async () => {
    const id = await cuenta()
    let estado = await misiones(base, id, MEDIODIA)
    expect(estado.deUnaVez.map((m) => m.id)).toEqual(MISIONES_DE_UNA_VEZ.map((m) => m.id))
    expect(estado.deUnaVez.every((m) => m.avance === 0 && !m.cobrada)).toBe(true)
    await expect(cobrarMision(base, id, 'rocha-1', MEDIODIA)).rejects.toThrow('Todavía no la cumpliste')

    await ganarNivel(base, id, 'rocha', 1)
    estado = await misiones(base, id, MEDIODIA)
    expect(estado.deUnaVez.find((m) => m.id === 'rocha-1')!.avance).toBe(1)
    const antes = await saldo(base, id)
    const r = await cobrarMision(base, id, 'rocha-1', MEDIODIA)
    expect(r.premio).toBe(100)
    expect(r.saldo).toBe(antes + 100)
    expect(r.misiones.deUnaVez.some((m) => m.id === 'rocha-1')).toBe(false)
    await expect(cobrarMision(base, id, 'rocha-1', MEDIODIA)).rejects.toThrow('no está entre las tuyas')
    await expect(cobrarMision(base, id, 'narnia', MEDIODIA)).rejects.toThrow('no está entre las tuyas')
  })

  it('las partidas online cuentan aunque el tope del día no deje cobrar monedas, y las del día se cobran una vez por día', async () => {
    const id = await cuenta()
    // Muchas partidas en el día: después del tope ya no pagan, pero cuentan igual.
    for (let i = 0; i < 20; i++) {
      await pagarPartida(base, `sala:${i}`, { cuentaId: id, gano: true, contraGente: true }, MEDIODIA)
      await anotarPartidaJugada(base, id, `sala:${i}`, true, [], MEDIODIA)
    }
    // Anotar la misma partida dos veces no la cuenta dos veces.
    await anotarPartidaJugada(base, id, 'sala:0', true, [], MEDIODIA)
    const estado = await misiones(base, id, MEDIODIA)
    expect(estado.deUnaVez.find((m) => m.id === 'primera-online')!.avance).toBe(1)
    const delDia = estado.delDia.filter((m) => m.ir === 'jugar')
    expect(delDia.length).toBeGreaterThan(0)
    for (const m of delDia) expect(m.avance).toBe(m.meta)
    const m = delDia[0]!
    await cobrarMision(base, id, m.id, MEDIODIA)
    await expect(cobrarMision(base, id, m.id, MEDIODIA)).rejects.toThrow('Ya la cobraste')
    // Al otro día cambian y arrancan de cero.
    const otroDia = await misiones(base, id, MANIANA)
    expect(otroDia.delDia.every((x) => !x.cobrada && x.avance === 0)).toBe(true)
    expect(otroDia.cambian).toBe('2026-11-12T03:00:00.000Z')
  })

  it('"con alguien de tu grupo": cuenta si en la mesa había alguien de uno de tus grupos', async () => {
    const ana = await cuenta()
    const beto = await cuenta()
    const otro = await cuenta()
    const { id: grupo } = await crearGrupo(base, ana, { nombre: `Misiones ${n}`, sigla: `X${n}`, descripcion: '', ingreso: 'abierto', cupo: null, convocan: 'todos' })
    await entrarAGrupo(base, beto, grupo)
    await anotarPartidaJugada(base, ana, 'g:1', false, [otro], MEDIODIA)
    await anotarPartidaJugada(base, ana, 'g:2', false, [beto, otro], MEDIODIA)
    const [fila] = await base.consultar<{ n: number }>('select count(*)::int as n from partidas_jugadas where cuenta_id = $1 and con_grupo', [ana])
    expect(fila!.n).toBe(1)
    // Y la de una vez del grupo ya está cumplida.
    expect((await misiones(base, ana, MEDIODIA)).deUnaVez.find((m) => m.id === 'un-grupo')!.avance).toBe(1)
  })
})
