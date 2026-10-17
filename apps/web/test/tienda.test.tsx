import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { CATALOGO_TIENDA, cambioDeVitrina, diaDeTienda } from '@truco/shared'
import { Tienda } from '../src/pantallas/Tienda'
import { useCuenta } from '../src/cuenta/cuenta'
import { fijarInventario } from '../src/cuenta/inventario'
import { leerPerfil } from '../src/perfil'

const mesa = CATALOGO_TIENDA.find((i) => i.id === 'mesa:cantina')!
const letra = CATALOGO_TIENDA.find((i) => i.tipo === 'tipografia')!

beforeEach(() => {
  localStorage.clear()
  fijarInventario([])
  useCuenta.setState({ estado: 'adentro', token: 'prueba:ana@ejemplo.com', saldo: 1000, cuenta: { id: 'c1', email: 'ana@ejemplo.com', apodo: 'Ana', avatar: null, preferencias: {}, nueva: false } })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      if (url.endsWith('/tienda')) return Response.json({ dia: diaDeTienda(new Date()), cambia: cambioDeVitrina(new Date()).toISOString(), items: [mesa, letra] })
      if (url.endsWith('/tienda/comprar')) return Response.json({ saldo: 200, inventario: [mesa.id] })
      return Response.json({ cuentas: true, loginDePrueba: true })
    }),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('tienda', () => {
  it('se compra con monedas, y lo comprado se usa desde la vitrina', async () => {
    render(
      <MemoryRouter>
        <Tienda />
      </MemoryRouter>,
    )
    expect(await screen.findByText('Mesa Cantina')).toBeTruthy()
    expect(screen.getByText('Legendaria')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: `Comprar Mesa Cantina por ${mesa.precio} monedas` }))
    fireEvent.click(await screen.findByRole('button', { name: 'Usar' }))
    expect(leerPerfil().mesa).toBe('cantina')
    expect(screen.getByRole('button', { name: 'Puesto' })).toBeTruthy()
    expect(useCuenta.getState().saldo).toBe(200)
  })

  it('sin monedas suficientes no se puede comprar', async () => {
    useCuenta.setState({ saldo: 10 })
    render(
      <MemoryRouter>
        <Tienda />
      </MemoryRouter>,
    )
    const boton = await screen.findByRole('button', { name: /Comprar Mesa Cantina/ })
    expect((boton as HTMLButtonElement).disabled).toBe(true)
  })
})
