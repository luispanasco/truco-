import { describe, expect, it } from 'vitest'
import { CharlaDeMesa, elencoDelNivel, HISTORIAS } from '@truco/shared'

/** Un azar fijo que va dando vueltas por los valores (repetible). */
function azarFijo(valores: number[]) {
  let i = 0
  return () => valores[i++ % valores.length]!
}

const elenco = (dep: keyof typeof HISTORIAS, n: number) => [null, ...elencoDelNivel(HISTORIAS[dep]!.niveles[n - 1]!).map((p) => p.id)]

describe('la charla de la mesa (modo historia)', () => {
  it('el rival cancherea cuando te viene ganando, y no en todas las manos', () => {
    const charla = new CharlaDeMesa(elenco('rocha', 1), 30, azarFijo([0.1]))
    // Mano 1: nada que comentar (va 0 a 1).
    expect(charla.alTerminarMano([0, 1])).toBeNull()
    // Mano 2: el rival ya saca 6 de ventaja.
    const frase = charla.alTerminarMano([0, 6])
    expect(frase?.asiento).toBe(1)
    expect(frase?.texto.length).toBeGreaterThan(3)
    // La mano siguiente no habla (hay una pausa entre frase y frase).
    expect(charla.alTerminarMano([0, 7])).toBeNull()
  })

  it('no repite frases en la misma partida hasta agotarlas', () => {
    const charla = new CharlaDeMesa(elenco('rocha', 1), 99, azarFijo([0.3, 0.7, 0.1, 0.9, 0.45]))
    const dichas: string[] = []
    let rival = 0
    // El rival se escapa de a 1 punto por mano (sin manos grandes): siempre "te viene ganando".
    for (let mano = 0; mano < 40; mano++) {
      rival += 1
      const f = charla.alTerminarMano([0, rival])
      if (f && rival > 25) dichas.push(f.texto)
    }
    expect(dichas.length).toBeGreaterThan(3)
    expect(new Set(dichas).size).toBe(dichas.length)
  })

  it('la mitad y el final parejo se comentan una sola vez; una mano grande, casi siempre', () => {
    const charla = new CharlaDeMesa(elenco('artigas', 1), 30, azarFijo([0.5]))
    // De a poco, parejo, hasta la mitad: nada que comentar.
    for (const p of [2, 4, 6, 8, 10, 12, 14]) expect(charla.alTerminarMano([p, p])).toBeNull()
    expect(charla.alTerminarMano([16, 15])?.texto).toBeTruthy() // pasaron la mitad
    expect(charla.alTerminarMano([17, 16])).toBeNull() // pausa
    expect(charla.alTerminarMano([18, 17])).toBeNull() // la mitad ya se comentó
    expect(charla.alTerminarMano([20, 19])).toBeNull()
    expect(charla.alTerminarMano([22, 21])?.texto).toBeTruthy() // parejo cerca del final
    expect(charla.alTerminarMano([23, 22])).toBeNull() // pausa
    expect(charla.alTerminarMano([24, 23])).toBeNull() // el parejo ya se dijo
    expect(charla.alTerminarMano([24, 28])?.asiento).toBe(1) // el rival hizo 5: mano grande
  })

  it('en los niveles de equipo a veces habla otro: un compañero del rival o uno tuyo (que alienta o festeja)', () => {
    const nivel = HISTORIAS.rocha!.niveles[3]! // 3v3: Julio, Nico y Luna contra vos, Cacho y Doña Rosa
    const quien = (azar: number, puntos: [number, number]) => {
      const charla = new CharlaDeMesa(elenco('rocha', 4), nivel.puntos, azarFijo([0.1, azar, 0]))
      charla.alTerminarMano([0, 0])
      return charla.alTerminarMano(puntos)
    }
    // Te vienen ganando: tu compañero te da ánimo.
    const aliento = quien(0.1, [0, 8])!
    expect(aliento.asiento % 2).toBe(0)
    expect(aliento.asiento).not.toBe(0)
    // El rival principal, casi siempre.
    expect(quien(0.9, [0, 8])!.asiento).toBe(1)
    // A veces, uno de sus compañeros.
    expect([3, 5]).toContain(quien(0.3, [0, 8])!.asiento)
  })

  it('las personas no hablan solas: sin bots en un lado, no hay frase de ese lado', () => {
    // Cooperativo: los pares son personas.
    const charla = new CharlaDeMesa([null, 'pescador', null, 'surfista'], 15, azarFijo([0.1, 0.1, 0]))
    charla.alTerminarMano([0, 0])
    expect(charla.alTerminarMano([0, 8])!.asiento % 2).toBe(1)
  })
})
