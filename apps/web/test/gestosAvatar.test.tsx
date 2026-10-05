import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { GESTO, SENIAS, SIGNIFICADO, type Senia } from '@truco/bots'
import { avatarAlAzar, codificarAvatar } from '@truco/shared'
import { PIEZAS_GESTO, type GestoAvatar } from '../src/avatares/gestos'
import { Avatar } from '../src/componentes/Avatar'
import { PanelSenias } from '../src/componentes/Senias'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const CODIGO = codificarAvatar(avatarAlAzar('Luis'))
const GESTOS: GestoAvatar[] = [...SENIAS, 'disimulo']

/** El SVG del avatar, cuando terminó de cargar el estilo. */
async function dibujo(contenedor: HTMLElement): Promise<SVGSVGElement> {
  await waitFor(() => expect(contenedor.querySelector('svg.avatar-dibujo')).not.toBeNull())
  return contenedor.querySelector('svg.avatar-dibujo')!
}

describe('señas sobre la cara del avatar', () => {
  it.each(GESTOS)('%s: el avatar lleva el gesto y tiene todas las piezas de las señas', async (gesto) => {
    const { container } = render(<Avatar codigo={CODIGO} gesto={gesto} />)
    const svg = await dibujo(container)
    expect(svg.getAttribute('data-gesto')).toBe(gesto)
    for (const pieza of PIEZAS_GESTO) expect(svg.querySelector(`.gesto-${pieza}`), pieza).not.toBeNull()
    // Los ojos se ven en dos mitades; el original queda oculto (sirve para medir).
    expect(svg.querySelector('.capa-ojos')!.getAttribute('visibility')).toBe('hidden')
    expect(svg.querySelectorAll('.ojo-mitad')).toHaveLength(2)
  })

  it('las piezas se agregan una sola vez, aunque cambie el gesto', async () => {
    const { container, rerender } = render(<Avatar codigo={CODIGO} gesto="perico" />)
    const svg = await dibujo(container)
    rerender(<Avatar codigo={CODIGO} gesto="flor" />)
    rerender(<Avatar codigo={CODIGO} />)
    expect(svg.querySelectorAll('.gesto-piezas')).toHaveLength(1)
    expect(svg.hasAttribute('data-gesto')).toBe(false)
  })

  it('cada gesto tiene su animación en el CSS, y hay pose quieta para movimiento reducido', () => {
    const css = readFileSync('src/avatares/gestos.css', 'utf8')
    for (const g of GESTOS) expect(css, g).toContain(`[data-gesto='${g}']`)
    expect(css).toContain('prefers-reduced-motion: reduce')
  })

  it('sin estilo cargado o con un código roto se ve la inicial, con el gesto igual', () => {
    const { container } = render(<Avatar codigo="🧉" apodo="luis" gesto="tres" />)
    const inicial = container.querySelector('.avatar-inicial')!
    expect(inicial.textContent).toBe('L')
    expect(inicial.getAttribute('data-gesto')).toBe('tres')
  })
})

describe('cara de señas con tu avatar', () => {
  const abrir = () => {
    const alElegir = vi.fn<(s: Senia) => void>()
    const vista = render(<PanelSenias avatar={CODIGO} apodo="Luis" alElegir={alElegir} alCerrar={() => {}} />)
    return { alElegir, hoja: within(screen.getByRole('dialog', { name: 'Señas' })), ...vista }
  }

  it('la cara grande es tu avatar', async () => {
    const { container } = abrir()
    const svg = await dibujo(container)
    expect(svg.closest('.cara-senias')).not.toBeNull()
  })

  it.each(SENIAS.filter((s) => !['pieza4', 'tres', 'dosComun', 'unoFalso'].includes(s)))(
    'tocar la zona de %s manda esa seña y la hace tu avatar',
    async (senia) => {
      const { alElegir, hoja, container } = abrir()
      await dibujo(container)
      fireEvent.click(hoja.getAllByRole('button', { name: `${GESTO[senia]} (${SIGNIFICADO[senia]})` })[0]!)
      expect(alElegir).toHaveBeenCalledWith(senia)
      expect(container.querySelector('svg.avatar-dibujo')!.getAttribute('data-gesto')).toBe(senia)
    },
  )

  it.each(['pieza4', 'tres', 'dosComun', 'unoFalso', 'flor'] as Senia[])('la boca abre su menú y manda %s', async (senia) => {
    const { alElegir, hoja, container } = abrir()
    await dibujo(container)
    fireEvent.click(hoja.getByRole('button', { name: 'Boca: más señas' }))
    const menu = within(hoja.getByRole('group', { name: 'Señas con la boca' }))
    fireEvent.click(menu.getByRole('button', { name: `${GESTO[senia]} (${SIGNIFICADO[senia]})` }))
    expect(alElegir).toHaveBeenCalledWith(senia)
  })

  it('las zonas se ubican sobre las capas del avatar', async () => {
    // Cajas de mentira (jsdom no dibuja): un SVG de 200 × 200 con la cara en su lugar.
    const cajas: Record<string, [number, number, number, number]> = {
      'avatar-dibujo': [0, 0, 200, 200],
      'capa-cejas': [40, 40, 120, 14],
      'capa-ojos': [40, 60, 120, 30],
      'capa-nariz': [95, 90, 20, 30],
      'capa-boca': [80, 130, 40, 14],
    }
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
      const clase = Object.keys(cajas).find((c) => this.classList.contains(c))
      const [x, y, w, h] = clase ? cajas[clase]! : [0, 0, 0, 0]
      return { x, y, left: x, top: y, width: w, height: h, right: x + w, bottom: y + h, toJSON: () => ({}) } as DOMRect
    })
    const { hoja, container } = abrir()
    await dibujo(container)
    const zona = (nombre: string) => hoja.getAllByRole('button', { name: nombre })[0]!.style
    const boca = hoja.getByRole('button', { name: 'Boca: más señas' }).style
    // La boca, de 64 % a 73 %, crece hasta el mínimo que se puede tocar.
    await waitFor(() => expect(parseFloat(boca.top)).toBeCloseTo(63.3, 0))
    const izq = zona(`${GESTO.perica} (${SIGNIFICADO.perica})`)
    const der = zona(`${GESTO.perico} (${SIGNIFICADO.perico})`)
    // Como en un espejo: el ojo derecho es el de la derecha de la pantalla.
    expect(parseFloat(izq.left)).toBeCloseTo(19, 0)
    expect(parseFloat(der.left)).toBeGreaterThan(parseFloat(izq.left) + 20)
    const cejas = zona(`${GESTO.pieza2} (${SIGNIFICADO.pieza2})`)
    expect(parseFloat(cejas.top)).toBeLessThan(parseFloat(izq.top))
    const pera = zona(`${GESTO.unoBravo} (${SIGNIFICADO.unoBravo})`)
    expect(parseFloat(pera.top)).toBeGreaterThan(parseFloat(boca.top))
  })
})
