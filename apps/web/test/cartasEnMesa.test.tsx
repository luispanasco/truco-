import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import type { Carta } from '@truco/engine'
import { CartasEnMesa, MUESTRA_VUELTA_MS } from '../src/componentes/CartasEnMesa'
import { lugarMazo, Mazo, posicionMazo } from '../src/componentes/Mazo'
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

describe('cartas que se levantan en cada vuelta', () => {
  const props = { n: 2, rel: (a: number) => a, apodo: (a: number) => `J${a}`, nuestro: 0, mostradas: [], levantar: true }
  const primera: MesaVisible['jugadas'] = [
    { asiento: 0, carta: c(1, 'espada'), vuelta: 0 },
    { asiento: 1, carta: c(7, 'oro'), vuelta: 0 },
  ]
  const cerrada: MesaVisible = { jugadas: primera, vueltas: [{ resultado: 0, ganador: 0 }] }
  const esperar = (ms: number) => act(() => new Promise((r) => setTimeout(r, ms)))

  it('la vuelta cerrada queda un momento con la ganadora y después se levanta: queda solo la vuelta en curso', async () => {
    const { container, rerender } = render(<CartasEnMesa {...props} mesa={{ jugadas: primera, vueltas: [] }} />)
    expect(container.querySelector('.cartas-en-mesa')!.classList.contains('se-levantan')).toBe(true)
    rerender(<CartasEnMesa {...props} mesa={cerrada} />)
    // Recién cerrada: se ve quién la ganó.
    expect(container.querySelectorAll('.jugada')).toHaveLength(2)
    expect(screen.getByLabelText('1 de espadas').classList.contains('carta-ganadora')).toBe(true)
    await esperar(MUESTRA_VUELTA_MS - 300)
    expect(container.querySelectorAll('.jugada')).toHaveLength(2)
    await waitFor(() => expect(container.querySelectorAll('.jugada')).toHaveLength(0), { timeout: 2000 })
    // Queda el resultado de las vueltas, para saber cómo viene la mano.
    expect(screen.getByLabelText('Resultado de las vueltas').textContent).toBe('✔')

    // La segunda vuelta cae sola en la mesa, en el lugar de la primera.
    rerender(<CartasEnMesa {...props} mesa={{ ...cerrada, jugadas: [...primera, { asiento: 0, carta: c(4, 'oro'), vuelta: 1 }] }} />)
    const jugadas = container.querySelectorAll<HTMLElement>('.jugada')
    expect(jugadas).toHaveLength(1)
    expect(jugadas[0]!.style.getPropertyValue('--vuelta')).toBe('0')
    expect(jugadas[0]!.classList.contains('pasada')).toBe(false)
  })

  it('si alguien tira en la vuelta siguiente antes de tiempo, la cerrada se levanta enseguida', async () => {
    const { container, rerender } = render(<CartasEnMesa {...props} mesa={cerrada} />)
    rerender(<CartasEnMesa {...props} mesa={{ ...cerrada, jugadas: [...primera, { asiento: 0, carta: c(4, 'oro'), vuelta: 1 }] }} />)
    await waitFor(() => expect(container.querySelectorAll('.jugada')).toHaveLength(1), { timeout: 1000 })
    expect(screen.getByLabelText('4 de oros')).toBeTruthy()
  })

  it('al terminar la mano la última vuelta queda, con las cartas mostradas al lado', async () => {
    const mostradas = [{ asiento: 1, cartas: [c(6, 'oro')], etiqueta: 'Envido 33' }]
    const { container } = render(<CartasEnMesa {...props} mesa={cerrada} mostradas={mostradas} quieta />)
    await esperar(MUESTRA_VUELTA_MS + 300)
    expect(container.querySelectorAll('.jugada')).toHaveLength(3)
    const mostrada = container.querySelector('.jugada.mostrada') as HTMLElement
    expect(mostrada.style.getPropertyValue('--vuelta')).toBe('1')
  })

  it('sin la opción, las vueltas cerradas quedan en la mesa', async () => {
    const { container } = render(<CartasEnMesa {...props} levantar={false} mesa={cerrada} />)
    await esperar(MUESTRA_VUELTA_MS + 300)
    expect(container.querySelectorAll('.jugada')).toHaveLength(2)
  })
})

describe('la carta tirada y el mazo', () => {
  const mesa: MesaVisible = {
    jugadas: [
      { asiento: 4, carta: c(1, 'espada'), vuelta: 0 },
      { asiento: 5, carta: c(7, 'oro'), vuelta: 0 },
      { asiento: 4, carta: c(4, 'oro'), vuelta: 1 },
    ],
    vueltas: [{ resultado: 1, ganador: 5 }],
  }

  it('cada jugada queda por encima del mazo (z-index 1), también la de la primera vuelta', () => {
    const { container } = render(<CartasEnMesa n={6} rel={(a) => a} apodo={(a) => `J${a}`} nuestro={0} mesa={mesa} mostradas={[]} />)
    const z = [...container.querySelectorAll<HTMLElement>('.jugada')].map((j) => Number(j.style.zIndex))
    expect(z).toHaveLength(3)
    for (const x of z) expect(x).toBeGreaterThan(1)
  })

  it('el mazo pasa por encima de todo solo mientras vuelan las cartas, no al dar vuelta la muestra', () => {
    const corte = { corte: 'convencional' as const, id: 1 }
    const { container, rerender } = render(<Mazo muestra={c(3, 'copa')} n={6} reparteRel={0} corte={corte} fase="corte" />)
    expect(container.querySelector('.mazo-cortando')).not.toBeNull()
    rerender(<Mazo muestra={c(3, 'copa')} n={6} reparteRel={0} corte={corte} fase="reparto" />)
    expect(container.querySelector('.mazo-cortando')).not.toBeNull()
    // Dando vuelta la muestra el mano ya puede tirar: su carta no queda debajo del mazo.
    rerender(<Mazo muestra={c(3, 'copa')} n={6} reparteRel={0} corte={corte} fase="muestra" />)
    expect(container.querySelector('.mazo-cortando')).toBeNull()
  })

  it('en 3 contra 3 el mazo va siempre a una esquina, lejos de las pilas de los costados', () => {
    for (let rel = 0; rel < 6; rel++) {
      const [x, y] = lugarMazo(6, rel)
      expect(x < 25 || x > 75).toBe(true)
      expect(y < 12 || y > 88).toBe(true)
    }
  })

  it('el lugar va en variables: uno para el paño angosto y otro para el bajito y ancho', () => {
    const estilo = posicionMazo(6, 4) as Record<string, string>
    expect(estilo['--mazo-x']).toBe('16%')
    expect(estilo['--mazo-y']).toBe('89%')
    // En el paño ancho los de los costados van acostados: el medio del costado está libre.
    expect(estilo['--mazo-x-ancha']).toBe('14%')
    expect(estilo['--mazo-y-ancha']).toBe('50%')
    // En perspectiva hay un solo lugar.
    const p = posicionMazo(6, 4, true) as Record<string, string>
    expect(p['--mazo-x-ancha']).toBe(p['--mazo-x'])
  })
})
