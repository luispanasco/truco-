import { describe, expect, it } from 'vitest'
import { crearBaraja, fuerza, mismaCarta, PALOS, piezaDe, type Carta, type Numero, type Palo } from '../src'

/** Grupos de la tabla de jerarquía, de mayor a menor, para una muestra dada. */
function gruposEsperados(muestra: Carta): Carta[][] {
  const m = muestra.palo
  const piezaNums = [2, 4, 5, 11, 10] as const
  const esMuestraPieza = (piezaNums as readonly number[]).includes(muestra.numero)
  const pieza = (n: (typeof piezaNums)[number]): Carta =>
    n === muestra.numero ? { numero: 12, palo: m } : { numero: n, palo: m }
  const esPiezaCarta = (x: Carta) =>
    x.palo === m && ((piezaNums as readonly number[]).includes(x.numero) || (x.numero === 12 && esMuestraPieza))
  const todos = (n: Numero, palos: readonly Palo[] = PALOS) =>
    palos.map((palo) => ({ numero: n, palo })).filter((x) => !esPiezaCarta(x))

  const grupos: Carta[][] = [
    ...piezaNums.map((n) => [pieza(n)]),
    [{ numero: 1, palo: 'espada' }],
    [{ numero: 1, palo: 'basto' }],
    [{ numero: 7, palo: 'espada' }],
    [{ numero: 7, palo: 'oro' }],
    todos(3),
    todos(2),
    todos(1, ['copa', 'oro']),
    todos(12),
    todos(11),
    todos(10),
    todos(7, ['copa', 'basto']),
    todos(6),
    todos(5),
    todos(4),
  ]
  // La muestra no está en juego.
  return grupos.map((g) => g.filter((x) => !mismaCarta(x, muestra))).filter((g) => g.length > 0)
}

const MUESTRAS_DE_PRUEBA: Numero[] = [3, 6, 1, 7, 12, 2, 4, 5, 11, 10]

describe('jerarquía', () => {
  for (const palo of PALOS) {
    for (const numero of MUESTRAS_DE_PRUEBA) {
      const muestra: Carta = { numero, palo }
      it(`orden completo con muestra ${numero} de ${palo}`, () => {
        const grupos = gruposEsperados(muestra)
        // Cubre las 39 cartas en juego.
        expect(grupos.flat()).toHaveLength(39)
        const fuerzas = grupos.map((g) => g.map((x) => fuerza(x, muestra)))
        for (const f of fuerzas) expect(new Set(f).size).toBe(1)
        const porGrupo = fuerzas.map((f) => f[0]!)
        for (let i = 1; i < porGrupo.length; i++) expect(porGrupo[i]!).toBeLessThan(porGrupo[i - 1]!)
      })
    }
  }

  it('el 12 reemplaza a la pieza que salió de muestra, con su misma jerarquía', () => {
    const muestra: Carta = { numero: 4, palo: 'oro' }
    expect(piezaDe({ numero: 12, palo: 'oro' }, muestra)).toBe(4)
    expect(fuerza({ numero: 12, palo: 'oro' }, muestra)).toBe(18)
    expect(fuerza({ numero: 2, palo: 'oro' }, muestra)).toBeGreaterThan(fuerza({ numero: 12, palo: 'oro' }, muestra))
    expect(fuerza({ numero: 12, palo: 'oro' }, muestra)).toBeGreaterThan(fuerza({ numero: 5, palo: 'oro' }, muestra))
  })

  it('sin muestra pieza, el 12 del palo es un 12 común', () => {
    const muestra: Carta = { numero: 3, palo: 'copa' }
    expect(piezaDe({ numero: 12, palo: 'copa' }, muestra)).toBeNull()
    expect(fuerza({ numero: 12, palo: 'copa' }, muestra)).toBe(fuerza({ numero: 12, palo: 'basto' }, muestra))
  })

  it('las matas nunca son pieza', () => {
    for (const palo of PALOS) {
      const muestra: Carta = { numero: 3, palo }
      for (const x of crearBaraja()) {
        if ((x.numero === 1 || x.numero === 7) && piezaDe(x, muestra) !== null) throw new Error('mata como pieza')
      }
    }
  })
})
