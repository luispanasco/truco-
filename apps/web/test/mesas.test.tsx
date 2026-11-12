import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { barriosDe, DEPARTAMENTOS, HISTORIAS, MESA_DEFAULT, MESAS, mesaGratis, normalizarMesa } from '@truco/shared'
import { SelectorMesa } from '../src/componentes/SelectorMesa'
import { Inicio } from '../src/pantallas/Inicio'
import { leerPerfil } from '../src/perfil'
import { BARRA_MESA, aplicarMesa } from '../src/temaMesa'

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.mesa
})
afterEach(cleanup)

const guardar = (perfil: object) => localStorage.setItem('truco.perfil', JSON.stringify({ invitadoId: 'inv-mesas', apodo: 'Luis', ...perfil }))

describe('catálogo de mesas', () => {
  it('ids únicos, boliche primera y gratis, y las de la tienda con precio', () => {
    const ids = MESAS.map((m) => m.id)
    expect(new Set(ids).size).toBe(ids.length)
    // Las de la tienda, las de los departamentos y las de los barrios de Rocha.
    const barrios = barriosDe(HISTORIAS.rocha!).map((b) => b.id)
    expect(ids).toEqual(['boliche', 'azul', 'bordo', 'pizarra', 'celeste', 'parrillero', 'cantina', ...DEPARTAMENTOS.map((d) => d.id), ...barrios])
    expect(MESAS[0].id).toBe(MESA_DEFAULT)
    expect(MESAS.filter((m) => mesaGratis(m.id)).map((m) => m.id)).toEqual(['boliche', 'azul'])
    // Las de los departamentos no se compran: se ganan en el modo historia.
    expect(mesaGratis('rocha')).toBe(false)
    expect(normalizarMesa('rocha')).toBe('boliche')
    expect(normalizarMesa('rocha', () => true)).toBe('rocha')
    for (const m of MESAS) {
      expect(m.nombre.length).toBeGreaterThan(0)
      expect(Number.isInteger(m.precio) && m.precio >= 0).toBe(true)
      // Cada mesa tiene su color de barra en la web.
      expect(BARRA_MESA[m.id]).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('normalizar: lo que no existe o es de la tienda vuelve a boliche', () => {
    expect(normalizarMesa('azul')).toBe('azul')
    expect(normalizarMesa('cantina')).toBe('boliche')
    expect(normalizarMesa('mantel')).toBe('boliche')
    expect(normalizarMesa(undefined)).toBe('boliche')
    expect(normalizarMesa(3)).toBe('boliche')
    expect(mesaGratis('bordo')).toBe(false)
    // Con la tienda, quien la compró la puede usar.
    expect(normalizarMesa('cantina', () => true)).toBe('cantina')
  })
})

describe('mesa en el perfil', () => {
  it('por defecto es boliche', () => {
    expect(leerPerfil().mesa).toBe('boliche')
  })

  it('una guardada gratis se respeta; una inválida o de la tienda vuelve a boliche y se guarda', () => {
    guardar({ mesa: 'azul' })
    expect(leerPerfil().mesa).toBe('azul')
    guardar({ mesa: 'parrillero' })
    expect(leerPerfil().mesa).toBe('boliche')
    expect(JSON.parse(localStorage.getItem('truco.perfil')!).mesa).toBe('boliche')
    guardar({ mesa: { roto: true } })
    expect(leerPerfil().mesa).toBe('boliche')
  })
})

describe('aplicar la mesa', () => {
  it('pone el atributo en <html> y el color de la barra; lo que no se puede usar, boliche', () => {
    const meta = document.createElement('meta')
    meta.name = 'theme-color'
    document.head.append(meta)
    aplicarMesa('azul')
    expect(document.documentElement.dataset.mesa).toBe('azul')
    expect(meta.content).toBe(BARRA_MESA.azul)
    aplicarMesa('cantina')
    expect(document.documentElement.dataset.mesa).toBe('boliche')
    expect(meta.content).toBe(BARRA_MESA.boliche)
    meta.remove()
  })
})

describe('selector de mesas', () => {
  it('solo muestra las que tenés: las de la tienda y las del modo historia no aparecen', () => {
    const elegidas: string[] = []
    render(<SelectorMesa valor="boliche" alCambiar={(m) => elegidas.push(m)} />)
    const grupo = screen.getByRole('radiogroup', { name: 'Mesa' })
    const libres = MESAS.filter((m) => mesaGratis(m.id))
    expect(within(grupo).getAllByRole('radio')).toHaveLength(libres.length)
    for (const m of libres) expect(grupo.querySelector(`.muestra-mesa[data-mesa="${m.id}"]`)).toBeTruthy()
    expect(within(grupo).queryByRole('radio', { name: /Cantina/ })).toBeNull()

    fireEvent.click(within(grupo).getByRole('radio', { name: 'Azul' }))
    expect(elegidas).toEqual(['azul'])
  })

  it('en el inicio, elegir otra mesa la guarda y pinta la app en el momento', () => {
    guardar({})
    render(
      <MemoryRouter>
        <Inicio />
      </MemoryRouter>,
    )
    // Lo cosmético está en la pantalla Avatar.
    fireEvent.click(screen.getByRole('tab', { name: 'Avatar' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Paño' }))
    expect(document.documentElement.dataset.mesa).toBe('boliche')
    const grupo = screen.getByRole('radiogroup', { name: 'Mesa' })
    fireEvent.click(within(grupo).getByRole('radio', { name: 'Azul' }))
    expect(document.documentElement.dataset.mesa).toBe('azul')
    expect(leerPerfil().mesa).toBe('azul')
    expect(within(grupo).getByRole('radio', { name: 'Azul' }).getAttribute('aria-checked')).toBe('true')
    // Las de la tienda (sin comprar) ni aparecen.
    expect(within(grupo).queryByRole('radio', { name: /Bordó/ })).toBeNull()
  })
})
