import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { Carta as TCarta } from '@truco/engine'
import { ManoOjeable } from '../src/componentes/ManoOjeable'
import { ESPERA_ABRIR_MS } from '../src/ojeo'

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

function arrastrar(el: HTMLElement, dy: number) {
  fireEvent.pointerDown(el, { pointerId: 1, clientY: 100, button: 0, pointerType: 'touch' })
  fireEvent.pointerMove(el, { pointerId: 1, clientY: 100 + dy / 2, pointerType: 'touch' })
  fireEvent.pointerMove(el, { pointerId: 1, clientY: 100 + dy, pointerType: 'touch' })
  fireEvent.pointerUp(el, { pointerId: 1, clientY: 100 + dy, pointerType: 'touch' })
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
    expect(b.style.transform).toBe('translate3d(0, 30px, 0)')
    expect(a.style.transform).toBe('translate3d(0, 60px, 0)')
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
    arrastrar(a, 12)
    expect(a.style.transform).toBe('translate3d(0, 12px, 0)')
    expect(envoltura('1 de espadas').classList.contains('tapada')).toBe(true)
    expect(container.querySelector('.mano-apilada')).toBeTruthy()
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
