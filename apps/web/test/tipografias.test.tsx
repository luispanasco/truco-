import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { TIPOGRAFIA_DEFAULT, TIPOGRAFIAS, TODO_PERMITIDO, normalizarTipografia, tipografiaGratis } from '@truco/shared'
import { SelectorTipografia } from '../src/componentes/SelectorTipografia'
import { Inicio } from '../src/pantallas/Inicio'
import { datosUnirse } from '../src/componentes/Online'
import { leerPerfil } from '../src/perfil'
import { aplicarTipografia } from '../src/temaTipografia'

const raiz = document.documentElement

beforeEach(() => {
  localStorage.clear()
  delete raiz.dataset.tipografia
  raiz.removeAttribute('style')
})
afterEach(cleanup)

const guardar = (perfil: object) => localStorage.setItem('truco.perfil', JSON.stringify({ invitadoId: 'inv-tipo', apodo: 'Luis', ...perfil }))

describe('catálogo de tipografías', () => {
  it('diez, ids únicos, Nunito primera; gratis solo las de la app y las demás con precio', () => {
    const ids = TIPOGRAFIAS.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toHaveLength(10)
    expect(TIPOGRAFIAS[0].id).toBe(TIPOGRAFIA_DEFAULT)
    expect(TIPOGRAFIAS.filter((t) => t.precio === 0).map((t) => t.id)).toEqual(['nunito', 'alfa-slab'])
    for (const t of TIPOGRAFIAS) {
      expect(t.nombre.length).toBeGreaterThan(0)
      expect(Number.isInteger(t.precio) && t.precio >= 0).toBe(true)
      if (t.precio > 0) expect(t.precio >= 200 && t.precio <= 500).toBe(true)
      // La familia nombra su letra y, mientras baja, cae en Nunito.
      expect(t.familia).toContain(`'${t.id === 'nunito' ? 'Nunito' : t.nombre}'`)
      expect(t.familia).toContain("'Nunito'")
      expect(t.escala).toBeGreaterThan(0.5)
      expect(t.escala).toBeLessThan(1.3)
    }
    // Las anchas, más chicas, para que no rompan la mesa en un celular angosto.
    expect(TIPOGRAFIAS.find((t) => t.id === 'press-start')!.escala).toBeLessThan(0.7)
  })

  it('normalizar: lo que no existe o es de la tienda vuelve a Nunito', () => {
    expect(normalizarTipografia('alfa-slab')).toBe('alfa-slab')
    expect(normalizarTipografia('lobster')).toBe('nunito')
    expect(normalizarTipografia('comic-sans')).toBe('nunito')
    expect(normalizarTipografia(undefined)).toBe('nunito')
    expect(normalizarTipografia({ roto: true })).toBe('nunito')
    expect(tipografiaGratis('pacifico')).toBe(false)
    expect(tipografiaGratis('nunito')).toBe(true)
    // Con la tienda de prueba (o, más adelante, comprada), la paga se puede usar.
    expect(normalizarTipografia('lobster', TODO_PERMITIDO)).toBe('lobster')
  })
})

describe('tipografía en el perfil', () => {
  it('por defecto es Nunito', () => {
    expect(leerPerfil().tipografia).toBe('nunito')
  })

  it('una gratis se respeta; una inválida o de la tienda vuelve a Nunito y se guarda', () => {
    guardar({ tipografia: 'alfa-slab' })
    expect(leerPerfil().tipografia).toBe('alfa-slab')
    guardar({ tipografia: 'press-start' })
    expect(leerPerfil().tipografia).toBe('nunito')
    expect(JSON.parse(localStorage.getItem('truco.perfil')!).tipografia).toBe('nunito')
    guardar({ tipografia: 7 })
    expect(leerPerfil().tipografia).toBe('nunito')
  })

  it('con la tienda de prueba desbloqueada, la paga queda', () => {
    guardar({ tipografia: 'lobster', tiendaDesbloqueada: true })
    expect(leerPerfil().tipografia).toBe('lobster')
  })

  it('es personal: no viaja al servidor', () => {
    guardar({ tipografia: 'alfa-slab' })
    expect(datosUnirse(leerPerfil())).not.toHaveProperty('tipografia')
  })
})

describe('aplicar la tipografía', () => {
  it('pone el atributo en <html> y las variables de la letra; lo que no se puede usar, Nunito', () => {
    aplicarTipografia('alfa-slab')
    expect(raiz.dataset.tipografia).toBe('alfa-slab')
    expect(raiz.style.getPropertyValue('--fuente-texto')).toContain("'Alfa Slab One'")
    expect(raiz.style.getPropertyValue('--fuente-titulo')).toContain("'Alfa Slab One'")
    expect(raiz.style.getPropertyValue('--escala-texto')).toBe('0.9')
    expect(raiz.style.getPropertyValue('--sintesis-negrita')).toBe('none')

    aplicarTipografia('lobster')
    expect(raiz.dataset.tipografia).toBe('nunito')
    // Nunito: el texto en Nunito y los títulos en Alfa Slab One, como siempre.
    expect(raiz.style.getPropertyValue('--fuente-texto')).toMatch(/^'Nunito'/)
    expect(raiz.style.getPropertyValue('--fuente-titulo')).toMatch(/^'Alfa Slab One'/)
    expect(raiz.style.getPropertyValue('--escala-texto')).toBe('1')

    aplicarTipografia('lobster', TODO_PERMITIDO)
    expect(raiz.dataset.tipografia).toBe('lobster')
    expect(raiz.style.getPropertyValue('--fuente-texto')).toMatch(/^'Lobster'/)
  })
})

describe('selector de tipografías', () => {
  it('muestra todas escritas con su letra; las de la tienda con candado y precio, sin poder elegirlas', () => {
    const elegidas: string[] = []
    render(<SelectorTipografia valor="nunito" alCambiar={(t) => elegidas.push(t)} />)
    const grupo = screen.getByRole('radiogroup', { name: 'Tipografía' })
    expect(within(grupo).getAllByRole('radio')).toHaveLength(TIPOGRAFIAS.length)
    for (const t of TIPOGRAFIAS) {
      const muestra = grupo.querySelector<HTMLElement>(`.muestra-tipografia[data-tipografia="${t.id}"]`)!
      expect(muestra.style.fontFamily).toContain(t.id === 'nunito' ? 'Nunito' : t.nombre)
    }

    const press = within(grupo).getByRole('radio', { name: /Press Start 2P: 500 monedas/ })
    expect(press.getAttribute('aria-disabled')).toBe('true')
    expect(press.querySelector('.candado')).toBeTruthy()
    fireEvent.click(press)
    expect(elegidas).toEqual([])
    expect(screen.getByRole('status').textContent).toMatch(/500 monedas\. Pronto en la tienda/)

    fireEvent.click(within(grupo).getByRole('radio', { name: 'Alfa Slab One' }))
    expect(elegidas).toEqual(['alfa-slab'])
  })

  it('con la tienda de prueba, las pagas se eligen y llevan el candado abierto', () => {
    const elegidas: string[] = []
    render(<SelectorTipografia valor="nunito" alCambiar={(t) => elegidas.push(t)} tiendaDesbloqueada />)
    const caveat = screen.getByRole('radio', { name: 'Caveat' })
    expect(caveat.getAttribute('aria-disabled')).toBeNull()
    expect(caveat.querySelector('.pieza-abierta')).toBeTruthy()
    fireEvent.click(caveat)
    expect(elegidas).toEqual(['caveat'])
  })

  it('en el inicio, elegir otra la guarda y cambia la letra de la app en el momento', () => {
    guardar({})
    render(
      <MemoryRouter>
        <Inicio />
      </MemoryRouter>,
    )
    expect(raiz.dataset.tipografia).toBe('nunito')
    const grupo = screen.getByRole('radiogroup', { name: 'Tipografía' })
    fireEvent.click(within(grupo).getByRole('radio', { name: 'Alfa Slab One' }))
    expect(raiz.dataset.tipografia).toBe('alfa-slab')
    expect(leerPerfil().tipografia).toBe('alfa-slab')
    expect(within(grupo).getByRole('radio', { name: 'Alfa Slab One' }).getAttribute('aria-checked')).toBe('true')
    // Una de la tienda no cambia nada.
    fireEvent.click(within(grupo).getByRole('radio', { name: /Pacifico/ }))
    expect(raiz.dataset.tipografia).toBe('alfa-slab')
    expect(leerPerfil().tipografia).toBe('alfa-slab')
  })

  it('al apagar la tienda de prueba, la paga vuelve a Nunito', () => {
    guardar({ tipografia: 'bebas-neue', tiendaDesbloqueada: true })
    render(
      <MemoryRouter>
        <Inicio />
      </MemoryRouter>,
    )
    expect(raiz.dataset.tipografia).toBe('bebas-neue')
    fireEvent.click(screen.getByRole('switch', { name: /Desbloquear la tienda/ }))
    expect(raiz.dataset.tipografia).toBe('nunito')
    expect(leerPerfil().tipografia).toBe('nunito')
  })
})
