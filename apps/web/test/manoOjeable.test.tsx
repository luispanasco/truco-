import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { Carta as TCarta } from '@truco/engine'
import { ManoOjeable, UMBRAL_JUGAR_PX } from '../src/componentes/ManoOjeable'
import { ESPERA_ABRIR_MS, TOPE_CORTES, VIBRACION_TOPE_MS } from '../src/ojeo'

const MANO: TCarta[] = [
  { numero: 7, palo: 'oro' },
  { numero: 1, palo: 'espada' },
  { numero: 3, palo: 'copa' },
]
const ALTO = 120

// jsdom no calcula tamaños: cada envoltura de carta mide 120 px de alto.
beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(ALTO)
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

const envoltura = (nombre: string) => screen.getByLabelText(nombre).closest('.ojeo-carta') as HTMLElement
const bajada = (el: HTMLElement) => Number(/translate3d\(0, ([\d.]+)px/.exec(el.style.transform)?.[1] ?? 0)

function arrastrar(el: HTMLElement, dy: number, dx = 0) {
  fireEvent.pointerDown(el, { pointerId: 1, clientX: 100, clientY: 100, button: 0, pointerType: 'touch' })
  fireEvent.pointerMove(el, { pointerId: 1, clientX: 100 + dx / 2, clientY: 100 + dy / 2, pointerType: 'touch' })
  fireEvent.pointerMove(el, { pointerId: 1, clientX: 100 + dx, clientY: 100 + dy, pointerType: 'touch' })
  fireEvent.pointerUp(el, { pointerId: 1, clientX: 100 + dx, clientY: 100 + dy, pointerType: 'touch' })
}

describe('ManoOjeable', () => {
  it('se ojea arrastrando y se abre sola en abanico', () => {
    vi.useFakeTimers()
    const onAbrir = vi.fn()
    const { container } = render(<ManoOjeable cartas={MANO} ojeoActivado onAbrir={onAbrir} alTocar={() => {}} />)
    expect(container.querySelector('.mano-apilada')).toBeTruthy()
    const a = envoltura('Jugar el 7 de oros')
    const b = envoltura('Jugar el 1 de espadas')

    // A baja 60: se ve el número de B (y sigue al dedo 1:1).
    arrastrar(a, 60)
    expect(a.style.transform).toBe('translate3d(0, 60px, 0)')
    expect(b.classList.contains('tapada')).toBe(false)
    expect(envoltura('Jugar el 3 de copas').classList.contains('tapada')).toBe(true)

    // B baja por detrás de A hasta su franja: aparece C y quedan las tres ojeadas.
    arrastrar(b, 500)
    expect(b.style.transform).toBe('translate3d(0, 36px, 0)')
    // A estaba en 60 y le tapaba el número a B: B la empuja hasta el escalonado completo.
    expect(a.style.transform).toBe('translate3d(0, 72px, 0)')
    expect(onAbrir).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(ESPERA_ABRIR_MS))
    expect(onAbrir).toHaveBeenCalledOnce()
    expect(container.querySelector('.mano-abanico')).toBeTruthy()
    // En el abanico siguen siendo los mismos botones de jugar.
    expect(screen.getAllByLabelText(/^Jugar el /)).toHaveLength(3)
  })

  it('al soltar a mitad de camino queda ahí, sin abrirse', () => {
    const { container } = render(<ManoOjeable cartas={MANO} ojeoActivado />)
    const a = envoltura('7 de oros')
    arrastrar(a, 30)
    expect(a.style.transform).toBe('translate3d(0, 30px, 0)')
    expect(envoltura('1 de espadas').classList.contains('tapada')).toBe(true)
    expect(container.querySelector('.mano-apilada')).toBeTruthy()
  })

  it('al mostrar solo los cortes la carta se frena en el tope (con un golpecito)', () => {
    const vibrar = vi.fn()
    Object.defineProperty(navigator, 'vibrate', { value: vibrar, configurable: true })
    render(<ManoOjeable cartas={MANO} ojeoActivado />)
    const a = envoltura('7 de oros')
    const tope = TOPE_CORTES * ALTO
    // El dedo se pasa un poco del tope, pero la carta casi no se mueve de ahí.
    arrastrar(a, tope + 3)
    expect(Math.abs(bajada(a) - tope)).toBeLessThan(0.5)
    expect(vibrar).toHaveBeenCalledWith(VIBRACION_TOPE_MS)
    // B sigue sin ojear: solo se ven los cortes.
    expect(envoltura('1 de espadas').classList.contains('tapada')).toBe(true)
    // Siguiendo un poco más aparece el número.
    arrastrar(a, 30)
    expect(envoltura('1 de espadas').classList.contains('tapada')).toBe(false)
    Reflect.deleteProperty(navigator, 'vibrate')
  })

  it('"Ver todas" abre el abanico sin ojear', () => {
    const { container } = render(<ManoOjeable cartas={MANO} ojeoActivado />)
    fireEvent.click(screen.getByRole('button', { name: 'Ver todas' }))
    expect(container.querySelector('.mano-abanico')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Ver todas' })).toBeNull()
  })

  it('en su turno, tocar la pila abre el abanico y no juega la carta', () => {
    const alTocar = vi.fn()
    const { container } = render(<ManoOjeable cartas={MANO} ojeoActivado abrirAlTocar jugable={() => true} alTocar={alTocar} />)
    const b = envoltura('Jugar el 1 de espadas')
    fireEvent.pointerDown(b, { pointerId: 1, clientY: 10, button: 0, pointerType: 'touch' })
    fireEvent.pointerUp(b, { pointerId: 1, clientY: 11, pointerType: 'touch' })
    // El click que sigue al toque no llega a jugar la carta.
    fireEvent.click(screen.getByLabelText('Jugar el 1 de espadas'))
    expect(container.querySelector('.mano-abanico')).toBeTruthy()
    expect(alTocar).not.toHaveBeenCalled()
  })

  it('fuera de su turno, tocar la pila no la abre', () => {
    const { container } = render(<ManoOjeable cartas={MANO} ojeoActivado />)
    const a = envoltura('7 de oros')
    fireEvent.pointerDown(a, { pointerId: 1, clientY: 10, button: 0, pointerType: 'touch' })
    fireEvent.pointerUp(a, { pointerId: 1, clientY: 10, pointerType: 'touch' })
    expect(container.querySelector('.mano-apilada')).toBeTruthy()
  })

  it('sin ojeo (o con la mano empezada) llegan en abanico', () => {
    const { container, unmount } = render(<ManoOjeable cartas={MANO} ojeoActivado={false} />)
    expect(container.querySelector('.mano-abanico')).toBeTruthy()
    unmount()
    const r = render(<ManoOjeable cartas={MANO.slice(1)} ojeoActivado />)
    expect(r.container.querySelector('.mano-abanico')).toBeTruthy()
  })
})

describe('abanico', () => {
  it('curvo: las de los costados giradas para afuera y un poco más abajo', () => {
    render(<ManoOjeable cartas={MANO} ojeoActivado={false} />)
    const [a, b, c] = ['7 de oros', '1 de espadas', '3 de copas'].map(envoltura)
    expect(a!.style.getPropertyValue('--giro')).toBe('-8deg')
    expect(b!.style.getPropertyValue('--giro')).toBe('0deg')
    expect(c!.style.getPropertyValue('--giro')).toBe('8deg')
    expect(b!.style.getPropertyValue('--caida')).toBe('0px')
    expect(parseFloat(a!.style.getPropertyValue('--caida'))).toBeGreaterThan(0)
  })

  it('arrastrar una carta jugable hacia la mesa la juega; el click que sigue no la juega dos veces', () => {
    const alTocar = vi.fn()
    render(<ManoOjeable cartas={MANO} ojeoActivado={false} jugable={() => true} alTocar={alTocar} />)
    const b = envoltura('Jugar el 1 de espadas')
    arrastrar(b, -(UMBRAL_JUGAR_PX + 20), 10)
    expect(alTocar).toHaveBeenCalledExactlyOnceWith(MANO[1])
    fireEvent.click(screen.getByLabelText('Jugar el 1 de espadas'))
    expect(alTocar).toHaveBeenCalledOnce()
  })

  it('si no pasa el umbral vuelve a su lugar sin jugarse', () => {
    const alTocar = vi.fn()
    render(<ManoOjeable cartas={MANO} ojeoActivado={false} jugable={() => true} alTocar={alTocar} />)
    const a = envoltura('Jugar el 7 de oros')
    fireEvent.pointerDown(a, { pointerId: 1, clientX: 100, clientY: 100, button: 0, pointerType: 'touch' })
    fireEvent.pointerMove(a, { pointerId: 1, clientX: 100, clientY: 70, pointerType: 'touch' })
    // Mientras se arrastra sigue al dedo y sube al frente.
    expect(a.style.transform).toBe('translate3d(0px, -30px, 0)')
    expect(a.classList.contains('levantada')).toBe(true)
    fireEvent.pointerUp(a, { pointerId: 1, clientX: 100, clientY: 70, pointerType: 'touch' })
    expect(alTocar).not.toHaveBeenCalled()
    expect(a.style.transform).toBe('')
  })

  it('una carta que no se puede jugar apenas se mueve y vuelve sola', () => {
    const alTocar = vi.fn()
    render(<ManoOjeable cartas={MANO} ojeoActivado={false} jugable={(c) => c.palo !== 'oro'} alTocar={alTocar} />)
    const a = envoltura('Jugar el 7 de oros')
    fireEvent.pointerDown(a, { pointerId: 1, clientX: 100, clientY: 200, button: 0, pointerType: 'touch' })
    fireEvent.pointerMove(a, { pointerId: 1, clientX: 100, clientY: 100, pointerType: 'touch' })
    expect(a.style.transform).toBe('translate3d(0px, -25px, 0)')
    fireEvent.pointerUp(a, { pointerId: 1, clientX: 100, clientY: 100, pointerType: 'touch' })
    expect(alTocar).not.toHaveBeenCalled()
    expect(a.style.transform).toBe('')
  })

  it('un toque sin arrastre juega la carta como siempre', () => {
    const alTocar = vi.fn()
    render(<ManoOjeable cartas={MANO} ojeoActivado={false} jugable={() => true} alTocar={alTocar} />)
    const c = envoltura('Jugar el 3 de copas')
    fireEvent.pointerDown(c, { pointerId: 1, clientX: 100, clientY: 100, button: 0, pointerType: 'touch' })
    fireEvent.pointerUp(c, { pointerId: 1, clientX: 101, clientY: 101, pointerType: 'touch' })
    fireEvent.click(screen.getByLabelText('Jugar el 3 de copas'))
    expect(alTocar).toHaveBeenCalledExactlyOnceWith(MANO[2])
  })
})
