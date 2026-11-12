import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  abreVecinos,
  barrioAbierto,
  barriosDe,
  departamentoCompleto,
  dificultadesDelBarrio,
  elencoDelNivel,
  HISTORIAS,
  idBaraja,
  idMesa,
  idMonedas,
  nivelAbierto,
  nivelesDelDepartamento,
  nombreRecompensa,
  PERSONAJES,
  ROCHA_POR_BARRIOS,
  type HistoriaDepartamento,
  type ProgresoHistoria,
} from '@truco/shared'
import { baseLocal, type Base } from '../src/cuentas/base'
import { verificadorDePrueba } from '../src/cuentas/auth'
import { entrar } from '../src/cuentas/cuentas'
import { ganarNivel, progresoHistoria } from '../src/cuentas/historia'
import { saldo } from '../src/cuentas/monedas'

const hasta = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

describe('Rocha por barrios: los datos', () => {
  const barrios = ROCHA_POR_BARRIOS.barrios!

  it('seis barrios por la costa, de sur a norte, con 32 niveles', () => {
    expect(barrios.map((b) => b.id)).toEqual(['la-paloma', 'la-pedrera', 'cabo-polonio', 'aguas-dulces-valizas-castillos', 'punta-del-diablo', 'santa-teresa-y-chuy'])
    expect(barrios.map((b) => b.niveles.length)).toEqual([6, 4, 6, 6, 4, 6])
    expect(nivelesDelDepartamento(ROCHA_POR_BARRIOS)).toBe(32)
  })

  it('la dificultad va en serrucho: cada barrio sube y el siguiente arranca más abajo', () => {
    const extremos = barrios.map((b) => [b.niveles[0]!.nivelBots, b.niveles.at(-1)!.nivelBots])
    expect(extremos).toEqual([
      ['facil', 'dificil'],
      ['medio', 'muyDificil'],
      ['dificil', 'master'],
      ['muyDificil', 'master'],
      ['muyDificil', 'master'],
      ['muyDificil', 'master'],
    ])
    expect(dificultadesDelBarrio('facil', 'dificil', 6)).toEqual(['facil', 'facil', 'medio', 'medio', 'dificil', 'dificil'])
    expect(dificultadesDelBarrio('medio', 'muyDificil', 4)).toEqual(['medio', 'dificil', 'dificil', 'muyDificil'])
  })

  it('cada nivel tiene su elenco completo, con el personaje del barrio de rival principal', () => {
    for (const b of barrios) {
      expect(PERSONAJES.some((p) => p.id === b.jefe)).toBe(true)
      for (const n of b.niveles) {
        const lugares = n.formato === '1v1' ? 1 : n.formato === '2v2' ? 3 : 5
        const elenco = elencoDelNivel(n)
        expect(elenco, `${b.id}: ${n.lugar}`).toHaveLength(lugares)
        expect(elenco.every((p) => p !== undefined), `${b.id}: ${n.lugar}`).toBe(true)
        expect(n.rivales[0]).toBe(b.jefe)
        expect(new Set([...n.rivales, ...n.companieros]).size, `${b.id}: ${n.lugar} repite a alguien`).toBe(lugares)
      }
    }
  })

  it('cada nivel cuenta dos datos del lugar, con su fuente', () => {
    for (const n of barrios.flatMap((b) => b.niveles)) {
      expect(n.datos, n.lugar).toHaveLength(2)
      for (const d of n.datos!) expect(d.fuente, n.lugar).toMatch(/^https:\/\//)
      expect(n.frases, n.lugar).toHaveLength(3)
    }
  })

  it('los premios existen; el último barrio cierra con la baraja y la mesa de Rocha', () => {
    for (const r of barrios.flatMap((b) => b.niveles.flatMap((n) => n.recompensas))) expect(nombreRecompensa(r), r).not.toBe(r)
    expect(barrios.at(-1)!.niveles.at(-1)!.recompensas).toEqual([idBaraja('costa'), idMesa('rocha')])
  })

  it('los personajes no repiten nombre', () => {
    const nombres = PERSONAJES.map((p) => p.nombre)
    expect(nombres.filter((n, i) => nombres.indexOf(n) !== i)).toEqual([])
  })
})

describe('Rocha por barrios: el progreso', () => {
  let anterior: HistoriaDepartamento | undefined
  let base: Base
  let n = 0

  beforeAll(async () => {
    // Las pantallas de los barrios todavía no están: para probar, Rocha pasa a tener barrios acá.
    anterior = HISTORIAS.rocha
    HISTORIAS.rocha = ROCHA_POR_BARRIOS
    base = await baseLocal()
  })
  afterAll(async () => {
    HISTORIAS.rocha = anterior
    await base.cerrar()
  })

  async function cuenta(): Promise<string> {
    const u = (await verificadorDePrueba(`prueba:barrios${++n}@ejemplo.com`))!
    await entrar(base, u, { apodo: `B${n}` })
    return u.id
  }

  it('los barrios se abren de a uno: el siguiente, cuando completás el anterior', () => {
    const p: ProgresoHistoria = {}
    expect(barrioAbierto(p, 'rocha', 'la-paloma')).toBe(true)
    expect(barrioAbierto(p, 'rocha', 'la-pedrera')).toBe(false)
    expect(nivelAbierto(p, 'rocha', 1, 'la-pedrera')).toBe(false)
    p['rocha/la-paloma'] = hasta(5)
    expect(barrioAbierto(p, 'rocha', 'la-pedrera')).toBe(false)
    expect(nivelAbierto(p, 'rocha', 6, 'la-paloma')).toBe(true)
    p['rocha/la-paloma'] = hasta(6)
    expect(nivelAbierto(p, 'rocha', 1, 'la-pedrera')).toBe(true)
    expect(nivelAbierto(p, 'rocha', 2, 'la-pedrera')).toBe(false)
    expect(barrioAbierto(p, 'rocha', 'narnia')).toBe(false)
  })

  it('los vecinos se abren con la mitad del departamento ganada', () => {
    const p: ProgresoHistoria = { 'rocha/la-paloma': hasta(6), 'rocha/la-pedrera': hasta(4), 'rocha/cabo-polonio': hasta(5) }
    expect(abreVecinos(p, 'rocha')).toBe(false)
    p['rocha/cabo-polonio'] = hasta(6)
    expect(abreVecinos(p, 'rocha')).toBe(true)
    expect(departamentoCompleto(p, 'rocha')).toBe(false)
    for (const b of barriosDe(ROCHA_POR_BARRIOS)) p[`rocha/${b.id}`] = hasta(b.niveles.length)
    expect(departamentoCompleto(p, 'rocha')).toBe(true)
  })

  it('el que había completado la Rocha de antes sigue con los vecinos abiertos', () => {
    expect(abreVecinos({ rocha: hasta(5) }, 'rocha')).toBe(true)
    expect(abreVecinos({ rocha: hasta(3) }, 'rocha')).toBe(false)
    // Lo de antes no cuenta como barrios ganados.
    expect(barrioAbierto({ rocha: hasta(5) }, 'rocha', 'la-pedrera')).toBe(false)
  })

  it('el servidor anota cada nivel con su barrio y respeta el orden', async () => {
    const id = await cuenta()
    await expect(ganarNivel(base, id, 'rocha', 1, false, 'la-pedrera')).rejects.toThrow('Primero completá el barrio anterior')
    await expect(ganarNivel(base, id, 'rocha', 1)).rejects.toThrow('Ese nivel no existe')
    await expect(ganarNivel(base, id, 'rocha', 2, false, 'la-paloma')).rejects.toThrow('Primero ganá el nivel anterior')

    const antes = await saldo(base, id)
    const r = await ganarNivel(base, id, 'rocha', 1, false, 'la-paloma')
    expect(r.nuevas).toEqual([idMonedas(100)])
    expect(r.saldo).toBe(antes + 100)
    expect(r.progreso).toEqual({ 'rocha/la-paloma': [1] })

    for (let k = 2; k <= 6; k++) await ganarNivel(base, id, 'rocha', k, false, 'la-paloma')
    await ganarNivel(base, id, 'rocha', 1, false, 'la-pedrera')
    expect(await progresoHistoria(base, id)).toEqual({ 'rocha/la-paloma': hasta(6), 'rocha/la-pedrera': [1] })
  })

  it('lo ganado antes de los barrios queda anotado sin barrio', async () => {
    const id = await cuenta()
    for (const k of hasta(5)) await base.consultar("insert into historia (cuenta_id, departamento, nivel) values ($1, 'rocha', $2)", [id, k])
    await ganarNivel(base, id, 'rocha', 1, false, 'la-paloma')
    expect(await progresoHistoria(base, id)).toEqual({ rocha: hasta(5), 'rocha/la-paloma': [1] })
  })
})
