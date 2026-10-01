import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { Carta } from '@truco/engine'
import { CartasEnMesa } from '../src/componentes/CartasEnMesa'
import type { MesaVisible } from '../src/estado'

const c = (numero: Carta['numero'], palo: Carta['palo']): Carta => ({ numero, palo })

afterEach(cleanup)

describe('cartas en la mesa', () => {
  // 1 contra 1 visto desde el asiento 0: dos vueltas jugadas, la primera la gana el 0 y la segunda el 1.
  const mesa: MesaVisible = {
    jugadas: [
      { asiento: 0, carta: c(1, 'espada'), vuelta: 0 },
      { asiento: 1, carta: c(7, 'oro'), vuelta: 0 },
      { asiento: 0, carta: c(4, 'oro'), vuelta: 1 },
      { asiento: 1, carta: c(1, 'basto'), vuelta: 1 },
    ],
    vueltas: [
      { resultado: 0, ganador: 0 },
      { resultado: 1, ganador: 1 },
    ],
  }
  const props = { n: 2, rel: (a: number) => a, apodo: (a: number) => `J${a}`, nuestro: 0 }

  it('quedan todas las vueltas, cada una frente a quien la tiró, con la ganadora resaltada', () => {
    const { container } = render(<CartasEnMesa {...props} mesa={mesa} mostradas={[]} />)
    const jugadas = [...container.querySelectorAll('.jugada')]
    expect(jugadas).toHaveLength(4)
    expect(container.querySelectorAll('.jugada.pos-0')).toHaveLength(2)
    expect(container.querySelectorAll('.jugada.pos-1')).toHaveLength(2)
    // La primera vuelta quedó atrás: apagada.
    expect(container.querySelectorAll('.jugada.pasada')).toHaveLength(2)
    expect(screen.getByLabelText('1 de espadas').classList.contains('carta-ganadora')).toBe(true)
    expect(screen.getByLabelText('1 de bastos').classList.contains('carta-ganadora')).toBe(true)
    expect(screen.getByLabelText('7 de oros').classList.contains('carta-ganadora')).toBe(false)
    expect(screen.getByLabelText('Resultado de las vueltas').textContent).toBe('✔✘')
  })

  it('las cartas mostradas siguen la pila de quien las da vuelta, con su tanto', () => {
    const { container } = render(
      <CartasEnMesa {...props} mesa={mesa} mostradas={[{ asiento: 1, cartas: [c(6, 'oro')], etiqueta: 'Envido 33' }]} />,
    )
    const mostrada = container.querySelector('.jugada.mostrada') as HTMLElement
    expect(mostrada.classList.contains('pos-1')).toBe(true)
    // Va arriba de las dos que tiró.
    expect(mostrada.style.getPropertyValue('--vuelta')).toBe('2')
    expect(screen.getByLabelText('6 de oros')).toBeTruthy()
    expect(screen.getByLabelText('J1 muestra: Envido 33').textContent).toBe('Envido 33')
  })
})
