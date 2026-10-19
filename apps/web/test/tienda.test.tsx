import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { CATALOGO_TIENDA, NOMBRE_RAREZA, cambioDeVitrina, diaDeTienda } from '@truco/shared'
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

const abrirTienda = () =>
  render(
    <MemoryRouter>
      <Tienda />
    </MemoryRouter>,
  )

describe('tienda', () => {
  it('la destacada va arriba con la cuenta regresiva, y el saldo en la cabecera', async () => {
    abrirTienda()
    const destacada = await screen.findByRole('button', { name: `${letra.nombre}. ${NOMBRE_RAREZA[letra.rareza]}. ${letra.precio} monedas. Probar` })
    expect(destacada.className).toContain('vitrina-destacada')
    expect(destacada.textContent).toMatch(/Cambia en \d+:\d\d/)
    expect(screen.getByLabelText('1000 monedas')).toBeTruthy()
  })

  it('se prueba, se confirma, se compra y se usa desde el probador', async () => {
    abrirTienda()
    fireEvent.click(await screen.findByRole('button', { name: /^Mesa Cantina\./ }))
    const probador = screen.getByRole('dialog', { name: 'Mesa Cantina' })
    // Con / Sin: la muestra pasa de tu mesa a la nueva.
    expect(probador.querySelector('.muestra-mesa')?.getAttribute('data-mesa')).toBe('cantina')
    fireEvent.click(within(probador).getByRole('button', { name: 'Sin' }))
    await waitFor(() => expect(probador.querySelector('.muestra-mesa')?.getAttribute('data-mesa')).toBe(leerPerfil().mesa))
    // Comprar pide confirmación.
    fireEvent.click(within(probador).getByRole('button', { name: `Comprar Mesa Cantina por ${mesa.precio} monedas` }))
    expect(within(probador).getByText(/¿Comprás/).textContent).toMatch(new RegExp(`Mesa Cantina por\\s+${mesa.precio}\\?`))
    fireEvent.click(within(probador).getByRole('button', { name: 'Sí, comprar' }))
    expect(await within(probador).findByText('¡Es tuyo!')).toBeTruthy()
    expect(useCuenta.getState().saldo).toBe(200)
    fireEvent.click(within(probador).getByRole('button', { name: 'Usar ahora' }))
    expect(leerPerfil().mesa).toBe('cantina')
    expect(within(probador).getByRole('button', { name: '✓ Puesto' })).toBeTruthy()
  })

  it('"Mejor no" vuelve sin comprar', async () => {
    abrirTienda()
    fireEvent.click(await screen.findByRole('button', { name: /^Mesa Cantina\./ }))
    const probador = screen.getByRole('dialog', { name: 'Mesa Cantina' })
    fireEvent.click(within(probador).getByRole('button', { name: /^Comprar/ }))
    fireEvent.click(within(probador).getByRole('button', { name: 'Mejor no' }))
    expect(within(probador).getByRole('button', { name: /^Comprar/ })).toBeTruthy()
    expect(vi.mocked(fetch).mock.calls.some(([u]) => String(u).endsWith('/tienda/comprar'))).toBe(false)
  })

  it('sin monedas suficientes dice cuánto falta y cómo se ganan', async () => {
    useCuenta.setState({ saldo: 10 })
    abrirTienda()
    fireEvent.click(await screen.findByRole('button', { name: /^Mesa Cantina\./ }))
    const probador = screen.getByRole('dialog', { name: 'Mesa Cantina' })
    expect(within(probador).getByText(/Te faltan/).textContent).toContain(String(mesa.precio - 10))
    expect(within(probador).getByText(/la primera partida del día/)).toBeTruthy()
    expect(within(probador).queryByRole('button', { name: /^Comprar/ })).toBeNull()
  })

  it('sin cuenta, invita a entrar', async () => {
    useCuenta.setState({ estado: 'afuera', token: null, saldo: null, cuenta: null })
    abrirTienda()
    expect(await screen.findByText(/Las monedas se ganan jugando/)).toBeTruthy()
    fireEvent.click(await screen.findByRole('button', { name: /^Mesa Cantina\./ }))
    const probador = screen.getByRole('dialog', { name: 'Mesa Cantina' })
    expect(within(probador).getByText(/Para comprar, entrá a tu cuenta/)).toBeTruthy()
    expect(within(probador).queryByRole('button', { name: /^Comprar/ })).toBeNull()
  })

  it('tu colección: lo comprado, con Usar y Puesto', async () => {
    fijarInventario([mesa.id, letra.id])
    abrirTienda()
    const coleccion = await screen.findByRole('region', { name: /Tu colección/ })
    fireEvent.click(within(coleccion).getByRole('button', { name: 'Usar Mesa Cantina' }))
    expect(leerPerfil().mesa).toBe('cantina')
    expect(within(coleccion).getByRole('button', { name: 'Mesa Cantina: puesto' })).toBeTruthy()
    expect(within(coleccion).getByRole('button', { name: `Usar ${letra.nombre}` })).toBeTruthy()
  })
})
