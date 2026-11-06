import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { apply, crearConfig, crearPartida, esperandoA, vistaPara, type Accion } from '@truco/engine'
import { crearBot } from '@truco/bots'
import { ALFABETO_CODIGO, LARGO_CODIGO, pasosDeRepeticion } from '@truco/shared'
import { baseLocal, type Base } from '../src/cuentas/base'
import { verificadorDePrueba } from '../src/cuentas/auth'
import { entrar } from '../src/cuentas/cuentas'
import { configurarGrupo, crearGrupo, entrarAGrupo } from '../src/cuentas/grupos'
import { anotarEnGrupos, invitarAlGrupo, muroDeGrupo, repeticion } from '../src/cuentas/muro'
import type { RegistroPartida } from '../src/registro'

let base: Base
let n = 0
/** Un código de sala válido (su largo y su alfabeto). */
const CODIGO = [...ALFABETO_CODIGO].slice(0, LARGO_CODIGO).join('').toUpperCase()

beforeAll(async () => {
  base = await baseLocal()
})
afterAll(async () => {
  await base.cerrar()
})

async function cuenta(apodo: string): Promise<string> {
  const u = (await verificadorDePrueba(`prueba:muro${++n}@ejemplo.com`))!
  await entrar(base, u, { apodo })
  return u.id
}

let grupos = 0
const datosGrupo = (convocan: 'todos' | 'capitanes' = 'todos') => ({
  nombre: `Grupo del muro ${++grupos}`,
  sigla: `M${grupos}`,
  descripcion: '',
  ingreso: 'abierto',
  cupo: null,
  convocan,
})

/** Una partida 1v1 entera entre bots, como la registra el servidor (asiento 0 y 1 con cuenta). */
function partidaJugada(cuentas: [string, string]): RegistroPartida {
  const config = crearConfig({ formato: '1v1', puntosPartida: 20 })
  const semilla = 2026
  let estado = crearPartida({ jugadores: [0, 1].map((a) => ({ id: `j${a}`, nombre: `J${a}`, bot: false })), semilla, config, reparte: 1 })
  const bots = [crearBot('medio', 1), crearBot('medio', 2)]
  const acciones: RegistroPartida['acciones'] = []
  for (let i = 0; i < 5000 && estado.ganador === null; i++) {
    const a = esperandoA(estado)[0]!
    const accion = { ...bots[a]!.decidir(vistaPara(estado, `j${a}`)), jugador: `j${a}` } as Accion
    const r = apply(estado, accion)
    if (!r.ok) throw new Error(r.motivo)
    estado = r.estado
    acciones.push({ ms: i, asiento: a, accion, porBot: true })
  }
  return {
    sala: 'sala-muro',
    inicio: new Date().toISOString(),
    fin: new Date().toISOString(),
    semilla,
    reparte: 1,
    config,
    jugadores: [0, 1].map((a) => ({ asiento: a, apodo: `J${a}`, tipo: 'humano' as const, invitadoId: null, cuentaId: cuentas[a] })),
    acciones,
    resultado: { ganador: estado.ganador!, puntos: estado.puntos },
  }
}

describe('el muro de los grupos', () => {
  it('una partida entre miembros va al muro con su repetición, que se vuelve a jugar igual', async () => {
    const [ana, beto, caro] = [await cuenta('Ana'), await cuenta('Beto'), await cuenta('Caro')]
    const { id: grupo } = await crearGrupo(base, ana, datosGrupo())
    await entrarAGrupo(base, beto, grupo)
    const registro = partidaJugada([ana, beto])
    expect(await anotarEnGrupos(base, registro)).toBe(1)

    const muro = await muroDeGrupo(base, ana, grupo)
    const [entrada] = muro.entradas
    expect(entrada?.tipo).toBe('resultado')
    if (entrada?.tipo !== 'resultado') return
    expect(entrada.datos.puntos).toEqual(registro.resultado && 'puntos' in registro.resultado ? registro.resultado.puntos : null)
    expect(entrada.datos.equipos.map((e) => e.map((j) => j.cuentaId))).toEqual([[ana], [beto]])
    // El ranking: uno ganó y el otro no.
    expect(muro.ranking.map((f) => [f.jugadas, f.ganadas]).sort()).toEqual([
      [1, 0],
      [1, 1],
    ])

    // La repetición la ven los del grupo; reconstruida, termina igual que la partida.
    const r = await repeticion(base, beto, entrada.datos.repeticion)
    const pasos = pasosDeRepeticion(r)
    expect(pasos).toHaveLength(registro.acciones.length + 1)
    expect(pasos.at(-1)!.estado.puntos).toEqual(entrada.datos.puntos)
    expect(pasos.at(-1)!.estado.ganador).toBe(entrada.datos.ganador)
    // Alguien de afuera, no.
    await expect(repeticion(base, caro, entrada.datos.repeticion)).rejects.toThrow('Esa repetición no existe')
    await expect(muroDeGrupo(base, caro, grupo)).rejects.toThrow('Ese grupo no existe')
  })

  it('si no jugaron dos del mismo grupo, no se anota nada', async () => {
    const [ana, beto] = [await cuenta('Ana'), await cuenta('Beto')]
    await crearGrupo(base, ana, datosGrupo())
    expect(await anotarEnGrupos(base, partidaJugada([ana, beto]))).toBe(0)
  })

  it('mandar una sala al grupo: aparece en el muro y una nueva de la misma sala reemplaza a la anterior', async () => {
    const [ana, beto] = [await cuenta('Ana'), await cuenta('Beto')]
    const { id: grupo } = await crearGrupo(base, ana, datosGrupo())
    await entrarAGrupo(base, beto, grupo)
    await invitarAlGrupo(base, beto, grupo, { codigo: CODIGO, formato: '2v2', puntos: 30 })
    await invitarAlGrupo(base, beto, grupo, { codigo: CODIGO.toLowerCase(), formato: '2v2', puntos: 40 })
    const { entradas } = await muroDeGrupo(base, ana, grupo)
    expect(entradas).toHaveLength(1)
    const [e] = entradas
    expect(e?.tipo === 'invitacion' && [e.autor.apodo, e.datos]).toEqual(['Beto', { codigo: CODIGO, formato: '2v2', puntos: 40 }])
    await expect(invitarAlGrupo(base, beto, grupo, { codigo: '¡no!', formato: '2v2' })).rejects.toThrow('Esa sala no existe')
    await expect(invitarAlGrupo(base, beto, grupo, { codigo: CODIGO, formato: '9v9' })).rejects.toThrow('Formato inválido')
  })

  it('con "líder y capitanes", un miembro no puede mandar salas', async () => {
    const [ana, beto] = [await cuenta('Ana'), await cuenta('Beto')]
    const { id: grupo } = await crearGrupo(base, ana, datosGrupo())
    await configurarGrupo(base, ana, grupo, { ...datosGrupo('capitanes'), nombre: `Cerrado ${grupos}` })
    await entrarAGrupo(base, beto, grupo)
    await expect(invitarAlGrupo(base, beto, grupo, { codigo: CODIGO, formato: '1v1' })).rejects.toThrow('mandan partidas el líder y los capitanes')
  })
})
