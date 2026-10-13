import { describe, expect, it } from 'vitest'
import { probGanarPartida } from '../src/equidad'

describe('probabilidad de ganar la partida', () => {
  it('parejos es la mitad, y llegar es ganar', () => {
    expect(probGanarPartida(0, 0, 30, false)).toBeCloseTo(0.5, 1)
    expect(probGanarPartida(12, 12, 30, true)).toBeCloseTo(0.5, 1)
    expect(probGanarPartida(30, 10, 30, false)).toBe(1)
    expect(probGanarPartida(10, 30, 30, false)).toBe(0)
  })

  it('más puntos propios es más chance, y a 29 a 0 es casi seguro', () => {
    for (const objetivo of [20, 30, 40]) {
      for (let x = 0; x < objetivo - 1; x++) {
        expect(probGanarPartida(x + 1, 5, objetivo, false)).toBeGreaterThan(probGanarPartida(x, 5, objetivo, false))
      }
    }
    expect(probGanarPartida(29, 0, 30, false)).toBeGreaterThan(0.95)
  })
})
