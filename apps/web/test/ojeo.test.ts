import { describe, expect, it } from 'vitest'
import type { Palo } from '@truco/engine'
import { DIBUJO_DESDE, DIBUJO_HASTA, disposicion, MEDIDA_PALO } from '../src/componentes/dibujo'
import {
  conTope,
  enTope,
  estaOjeada,
  franja,
  limitesArrastre,
  moverCarta,
  posicionesIniciales,
  posicionTope,
  TOPE_CORTES,
  TOPE_RADIO_PX,
  visibleArriba,
  ZONA_CORTES,
  ZONA_DIBUJO_DESDE,
  ZONA_INDICE,
  ZONA_SEPARACION,
  zonaVisible,
} from '../src/ojeo'

// Una carta de 120 px de alto: cortes de 0 a 9.6, nada de 9.6 a 18, número de 18 a 36.
const ALTO = 120
const F = franja(ALTO)
const TOPE = TOPE_CORTES * ALTO

describe('zonas', () => {
  it('cortes arriba de todo, una franja vacía y después el número', () => {
    expect(ZONA_CORTES.desde).toBe(0)
    expect(ZONA_CORTES.hasta).toBe(ZONA_SEPARACION.desde)
    expect(ZONA_SEPARACION.hasta).toBe(ZONA_INDICE.desde)
    // La separación tiene que notarse con el dedo (unos 9 px en la carta de la mano).
    expect(ZONA_SEPARACION.hasta - ZONA_SEPARACION.desde).toBeGreaterThanOrEqual(0.06)
    expect(ZONA_INDICE.hasta).toBe(0.3)
    expect(ZONA_DIBUJO_DESDE).toBeGreaterThan(ZONA_INDICE.hasta)
    expect(F).toBeCloseTo(36)
    // El tope cae en la separación: se ven los cortes enteros y nada del número.
    expect(TOPE).toBeGreaterThan(ZONA_CORTES.hasta * ALTO)
    expect(TOPE).toBeLessThan(ZONA_INDICE.desde * ALTO)
  })

  /** Medio ancho de la punta de abajo y de la de arriba de cada palo derecho (a tamaño 100). */
  const ANCHO_ABAJO: Record<Palo, number> = { oro: 48, copa: 28, espada: 7, basto: 9 }
  const ANCHO_ARRIBA: Record<Palo, number> = { oro: 48, copa: 38, espada: 8, basto: 17 }

  it('el dibujo de los palos empieza debajo del número y no se sale del marco', () => {
    const palos: Palo[] = ['oro', 'copa', 'espada', 'basto']
    for (const palo of palos) {
      for (let numero = 1; numero <= 7; numero++) {
        const puntos = disposicion(palo, numero)
        expect(puntos, `${numero} de ${palo}`).toHaveLength(numero === 1 ? 1 : palo === 'basto' && numero === 3 ? 3 : numero)
        for (const { x, y, tam, rot } of puntos) {
          // Las dos puntas del palo (a lo largo) y, si está derecho o acostado, también lo ancho.
          const { ancho, alto } = MEDIDA_PALO[palo]
          const r = (rot * Math.PI) / 180
          const largo = { x: Math.sin(r) * alto * (tam / 100), y: Math.cos(r) * alto * (tam / 100) }
          const recto = rot % 90 === 0
          const anchoGirado = recto ? { x: Math.abs(Math.cos(r)) * ancho * (tam / 100), y: Math.abs(Math.sin(r)) * ancho * (tam / 100) } : { x: 0, y: 0 }
          const nombre = `${numero} de ${palo}`
          expect(y - Math.abs(largo.y) - anchoGirado.y, nombre).toBeGreaterThanOrEqual(DIBUJO_DESDE - 0.5)
          expect(y + Math.abs(largo.y) + anchoGirado.y, nombre).toBeLessThanOrEqual(DIBUJO_HASTA + 0.5)
          expect(x - Math.abs(largo.x) - anchoGirado.x, nombre).toBeGreaterThanOrEqual(14)
          expect(x + Math.abs(largo.x) + anchoGirado.x, nombre).toBeLessThanOrEqual(186)
          // Y no pisa el número de abajo (la esquina de abajo a la derecha, x de 146 a 182 e y desde 250).
          // Derecho o al revés, lo que queda abajo es una punta: su ancho es el de esa punta.
          const punta = rot === 0 ? ANCHO_ABAJO[palo] : rot === 180 ? ANCHO_ARRIBA[palo] : null
          const anchoAbajo = punta === null ? anchoGirado.x : (punta * tam) / 100
          const pisaNumero = x + Math.abs(largo.x) + anchoAbajo > 146 && y + Math.abs(largo.y) + anchoGirado.y > 250
          expect(pisaNumero, `${nombre}: pisa el número de abajo`).toBe(false)
        }
      }
    }
    expect(DIBUJO_DESDE).toBeGreaterThan(ZONA_INDICE.hasta * 300)
    expect(DIBUJO_DESDE).toBeCloseTo(ZONA_DIBUJO_DESDE * 300)
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
    // Toda la separación muestra solo los cortes: ni un pelo del número.
    expect(zonaVisible(1, [10, 0, 0], ALTO)).toBe('cortes')
    expect(zonaVisible(1, [TOPE, 0, 0], ALTO)).toBe('cortes')
    expect(zonaVisible(1, [18, 0, 0], ALTO)).toBe('cortes')
    // Pasando la separación asoma el número, pero recién entero cuenta como ojeada.
    expect(zonaVisible(1, [20, 0, 0], ALTO)).toBe('parte-indice')
    expect(estaOjeada(1, [20, 0, 0], ALTO)).toBe(false)
    expect(estaOjeada(1, [35, 0, 0], ALTO)).toBe(false)
    expect(estaOjeada(1, [36, 0, 0], ALTO)).toBe(true)
    expect(zonaVisible(1, [50, 0, 0], ALTO)).toBe('indice')
  })

  it('la del fondo la tapa la que tenga más arriba de las de adelante', () => {
    // B bajó 36 por detrás de A (que está en 72): de C se ven 36, justo el número.
    expect(visibleArriba(2, [72, 36, 0])).toBe(36)
    expect(estaOjeada(2, [72, 36, 0], ALTO)).toBe(true)
    expect(estaOjeada(2, [72, 20, 0], ALTO)).toBe(false)
    // Escalonado final: las tres ojeadas.
    expect([0, 1, 2].every((i) => estaOjeada(i, [2 * F, F, 0], ALTO))).toBe(true)
  })
})

describe('límites del arrastre', () => {
  it('ninguna sube más arriba de su posición inicial', () => {
    expect(moverCarta(0, -50, [0, 0, 0], ALTO)).toEqual([0, 0, 0])
    expect(moverCarta(1, -50, [72, 36, 0], ALTO)).toEqual([72, 0, 0])
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
    // Con A en el tope (B muestra solo los cortes) tampoco.
    expect(moverCarta(1, 15, [TOPE, 0, 0], ALTO)).toEqual([TOPE, 0, 0])
  })

  it('la del medio se desliza por detrás sin que le tapen el número (empuja a la de adelante)', () => {
    // A en 72: B baja por detrás hasta 36 sin mover a A.
    expect(moverCarta(1, 36, [72, 0, 0], ALTO)).toEqual([72, 36, 0])
    // A en 36 (justo se ve el número de B): si B baja, A baja con ella para no taparlo.
    expect(moverCarta(1, 10, [36, 0, 0], ALTO)).toEqual([46, 10, 0])
    // B nunca pasa de su lugar en el escalonado.
    expect(moverCarta(1, 500, [36, 0, 0], ALTO)).toEqual([2 * F, F, 0])
  })

  it('con la de atrás separada, la de adelante no puede subir a taparle el número', () => {
    expect(limitesArrastre(0, [72, 36, 0], ALTO)).toEqual({ min: 72, max: 72 })
    expect(moverCarta(0, 0, [72, 36, 0], ALTO)).toEqual([72, 36, 0])
    // Si la de atrás vuelve a la pila, la de adelante queda libre otra vez.
    expect(limitesArrastre(0, [72, 0, 0], ALTO)).toEqual({ min: 0, max: 72 })
  })

  it('la del fondo no se mueve', () => {
    expect(moverCarta(2, 40, [72, 36, 0], ALTO)).toEqual([72, 36, 0])
  })
})

describe('tope de los cortes', () => {
  const R = TOPE_RADIO_PX

  it('el tope de cada carta es donde la de atrás muestra solo los cortes', () => {
    expect(posicionTope(0, [0, 0, 0], ALTO)).toBeCloseTo(TOPE)
    // B, por detrás de A ya bajada, destapa a C: su tope es respecto de C.
    expect(posicionTope(1, [72, 0, 0], ALTO)).toBeCloseTo(TOPE)
    // La del fondo no destapa a nadie; y si una de adelante está más arriba, la tapa ella.
    expect(posicionTope(2, [72, 36, 0], ALTO)).toBeNull()
    expect(posicionTope(1, [5, 30, 0], ALTO)).toBeNull()
  })

  it('fuera del tope el arrastre es 1:1 exacto', () => {
    for (const y of [0, 3, TOPE - R, TOPE + R, TOPE + R + 1, 30, 60]) {
      expect(conTope(0, y, [0, 0, 0], ALTO)).toBeCloseTo(y, 9)
    }
  })

  it('cerca del tope la carta casi no se mueve, y sale sin saltos', () => {
    // En el tope mismo se queda ahí; a medio radio apenas se corre (un octavo).
    expect(conTope(0, TOPE, [0, 0, 0], ALTO)).toBe(TOPE)
    expect(conTope(0, TOPE + R / 2, [0, 0, 0], ALTO)).toBeCloseTo(TOPE + R / 8)
    expect(conTope(0, TOPE - R / 2, [0, 0, 0], ALTO)).toBeCloseTo(TOPE - R / 8)
    // Siempre avanza (nunca retrocede) y llega pegada al borde del radio.
    let antes = -Infinity
    for (let y = TOPE - R; y <= TOPE + R; y += 0.25) {
      const c = conTope(0, y, [0, 0, 0], ALTO)
      expect(c).toBeGreaterThanOrEqual(antes)
      antes = c
    }
    expect(conTope(0, TOPE + R - 0.01, [0, 0, 0], ALTO)).toBeCloseTo(TOPE + R, 1)
  })

  it('mientras el dedo está en el tope, de la de atrás se ven los cortes y nada del número', () => {
    for (let y = TOPE - R / 2; y <= TOPE + R / 2; y += 0.5) {
      const pos = moverCarta(0, conTope(0, y, [0, 0, 0], ALTO), [0, 0, 0], ALTO)
      expect(zonaVisible(1, pos, ALTO)).toBe('cortes')
      expect(estaOjeada(1, pos, ALTO)).toBe(false)
    }
    expect(enTope(0, [TOPE, 0, 0], ALTO)).toBe(true)
    expect(enTope(0, [TOPE + 4, 0, 0], ALTO)).toBe(false)
  })
})
