import { describe, expect, it } from 'vitest'
import type { Palo } from '@truco/engine'
import { DIBUJO_DESDE, DIBUJO_HASTA, DISPOSICION, tamSimbolo } from '../src/componentes/dibujo'
import {
  estaOjeada,
  franja,
  limitesArrastre,
  moverCarta,
  posicionesIniciales,
  visibleArriba,
  ZONA_CORTES,
  ZONA_INDICE,
  zonaVisible,
} from '../src/ojeo'

// Una carta de 120 px de alto: cortes de 0 a 9.6, número de 9.6 a 30.
const ALTO = 120
const F = franja(ALTO)

describe('zonas', () => {
  it('cortes arriba de todo y el número justo debajo', () => {
    expect(ZONA_CORTES.desde).toBe(0)
    expect(ZONA_CORTES.hasta).toBe(ZONA_INDICE.desde)
    expect(ZONA_INDICE.hasta).toBe(0.25)
    expect(F).toBe(30)
  })

  it('el dibujo de los palos empieza debajo del número', () => {
    const palos: Palo[] = ['oro', 'copa', 'espada', 'basto']
    for (const palo of palos) {
      for (const [numero, puntos] of Object.entries(DISPOSICION)) {
        // Cada palo ocupa un poco más de la mitad de su tamaño hacia arriba y hacia abajo.
        const medio = tamSimbolo(palo, Number(numero)) * 0.53
        for (const [, y] of puntos) {
          expect(y - medio, `${numero} de ${palo}`).toBeGreaterThanOrEqual(ZONA_INDICE.hasta * 300)
          expect(y + medio, `${numero} de ${palo}`).toBeLessThanOrEqual(DIBUJO_HASTA)
        }
      }
    }
    expect(DIBUJO_DESDE).toBeGreaterThan(ZONA_INDICE.hasta * 300)
  })
})

describe('qué se ve y cuándo está ojeada', () => {
  it('apiladas: la de adelante entera, las otras tapadas', () => {
    const pos = posicionesIniciales(3)
    expect(zonaVisible(0, pos, ALTO)).toBe('toda')
    expect(zonaVisible(1, pos, ALTO)).toBe('nada')
    expect(zonaVisible(2, pos, ALTO)).toBe('nada')
    expect([0, 1, 2].map((i) => estaOjeada(i, pos, ALTO))).toEqual([true, false, false])
  })

  it('la de atrás asoma en proporción exacta: primero los cortes, después el número', () => {
    expect(visibleArriba(1, [7, 0, 0])).toBe(7)
    expect(zonaVisible(1, [5, 0, 0], ALTO)).toBe('cortes')
    expect(zonaVisible(1, [20, 0, 0], ALTO)).toBe('cortes')
    expect(estaOjeada(1, [29, 0, 0], ALTO)).toBe(false)
    expect(estaOjeada(1, [30, 0, 0], ALTO)).toBe(true)
    expect(zonaVisible(1, [45, 0, 0], ALTO)).toBe('indice')
  })

  it('la del fondo la tapa la que tenga más arriba de las de adelante', () => {
    // B bajó 30 por detrás de A (que está en 60): de C se ven 30, justo el número.
    expect(visibleArriba(2, [60, 30, 0])).toBe(30)
    expect(estaOjeada(2, [60, 30, 0], ALTO)).toBe(true)
    expect(estaOjeada(2, [60, 20, 0], ALTO)).toBe(false)
    // Escalonado final: las tres ojeadas.
    expect([0, 1, 2].every((i) => estaOjeada(i, [2 * F, F, 0], ALTO))).toBe(true)
  })
})

describe('límites del arrastre', () => {
  it('ninguna sube más arriba de su posición inicial', () => {
    expect(moverCarta(0, -50, [0, 0, 0], ALTO)).toEqual([0, 0, 0])
    expect(moverCarta(1, -50, [60, 30, 0], ALTO)).toEqual([60, 0, 0])
  })

  it('la de adelante baja hasta el escalonado completo y no más', () => {
    expect(limitesArrastre(0, [0, 0, 0], ALTO)).toEqual({ min: 0, max: 2 * F })
    expect(moverCarta(0, 500, [0, 0, 0], ALTO)).toEqual([2 * F, 0, 0])
    // Al soltar queda donde se la dejó: una posición intermedia es válida.
    expect(moverCarta(0, 12, [0, 0, 0], ALTO)).toEqual([12, 0, 0])
  })

  it('la del medio no puede bajar mientras la de adelante le tapa el número', () => {
    expect(limitesArrastre(1, [20, 0, 0], ALTO)).toEqual({ min: 0, max: 0 })
    expect(moverCarta(1, 15, [20, 0, 0], ALTO)).toEqual([20, 0, 0])
  })

  it('la del medio se desliza por detrás sin que le tapen el número (empuja a la de adelante)', () => {
    // A en 60: B baja por detrás hasta 30 sin mover a A.
    expect(moverCarta(1, 30, [60, 0, 0], ALTO)).toEqual([60, 30, 0])
    // A en 30 (justo se ve el número de B): si B baja, A baja con ella para no taparlo.
    expect(moverCarta(1, 10, [30, 0, 0], ALTO)).toEqual([40, 10, 0])
    // B nunca pasa de su lugar en el escalonado.
    expect(moverCarta(1, 500, [30, 0, 0], ALTO)).toEqual([2 * F, F, 0])
  })

  it('con la de atrás separada, la de adelante no puede subir a taparle el número', () => {
    expect(limitesArrastre(0, [60, 30, 0], ALTO)).toEqual({ min: 60, max: 60 })
    expect(moverCarta(0, 0, [60, 30, 0], ALTO)).toEqual([60, 30, 0])
    // Si la de atrás vuelve a la pila, la de adelante queda libre otra vez.
    expect(limitesArrastre(0, [60, 0, 0], ALTO)).toEqual({ min: 0, max: 60 })
  })

  it('la del fondo no se mueve', () => {
    expect(moverCarta(2, 40, [60, 30, 0], ALTO)).toEqual([60, 30, 0])
  })
})
