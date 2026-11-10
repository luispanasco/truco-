import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { CATALOGO_TIENDA, NOMBRE_RAREZA, cambioDeVitrina, diaDeTienda, proximasVitrinas } from '@truco/shared'
import { armarEstantes, cuandoVuelve } from '../src/tienda/estantes'
import { Tienda } from '../src/pantallas/Tienda'
import { useCuenta } from '../src/cuenta/cuenta'
import { esBeta, fijarInventario } from '../src/cuenta/inventario'
import { cosmeticosPermitidos, leerPerfil } from '../src/perfil'

const mesa = CATALOGO_TIENDA.find((i) => i.id === 'mesa:cantina')!
const letra = CATALOGO_TIENDA.find((i) => i.tipo === 'tipografia')!

beforeEach(() => {
  localStorage.clear()
  fijarInventario([], false)
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
    // (Mientras sale la animación conviven la vieja y la nueva: alcanza con que aparezca la tuya.)
    const muestras = () => [...probador.querySelectorAll('.muestra-mesa')].map((m) => m.getAttribute('data-mesa'))
    await waitFor(() => expect(muestras()).toContain(leerPerfil().mesa), { timeout: 4000 })
    // Comprar pide confirmación.
    fireEvent.click(within(probador).getByRole('button', { name: `Comprar Mesa Cantina por ${mesa.precio} monedas` }))
    expect(within(probador).getByText(/¿Comprás/).textContent).toMatch(new RegExp(`Mesa Cantina por\\s+${mesa.precio}\\?`))
    fireEvent.click(within(probador).getByRole('button', { name: 'Sí, comprar' }))
    expect(await within(probador).findByText('¡Es tuyo!')).toBeTruthy()
    expect(useCuenta.getState().saldo).toBe(200)
    fireEvent.click(within(probador).getByRole('button', { name: 'Usar ahora' }))
    expect(leerPerfil().mesa).toBe('cantina')
    expect(within(probador).getByRole('button', { name: '✓ Puesto' })).toBeTruthy()
  }, 15_000) // Dibuja la tienda entera (con los estantes): con la suite completa en paralelo tarda más de 5 s.

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

describe('estantes', () => {
  it('todo el catálogo por categoría (sin lo del modo historia); cuándo vuelve, en palabras', () => {
    const estantes = armarEstantes(CATALOGO_TIENDA)
    expect(estantes.map((e) => e.titulo)).toEqual(['Pelo', 'Cara', 'Sombreros, lentes y aros', 'Ropa', 'En la mano y en la boca', 'Paños', 'Letras'])
    const enEstantes = estantes.flatMap((e) => e.items)
    expect(enEstantes).toHaveLength(CATALOGO_TIENDA.filter((i) => !i.recompensa).length)
    expect(new Set(enEstantes.map((i) => i.id)).size).toBe(enEstantes.length)
    expect(cuandoVuelve('2026-11-11', '2026-11-10')).toBe('mañana')
    expect(cuandoVuelve('2026-11-13', '2026-11-10')).toBe('el viernes 13')
    expect(cuandoVuelve('2026-12-02', '2026-11-10')).toBe('el 2/12')
    // La próxima vez de cada cosa es un día en que de verdad sale en la vitrina.
    const proximas = proximasVitrinas(new Date('2026-11-10T15:00:00Z'), 10)
    expect(proximas.size).toBeGreaterThan(0)
    for (const dia of proximas.values()) expect(dia > '2026-11-10').toBe(true)
  })

  it('lo que hoy no está en la vitrina se prueba pero no se compra, y dice cuándo vuelve', async () => {
    abrirTienda()
    const pelo = await screen.findByRole('region', { name: 'Pelo' })
    const ficha = within(pelo).getAllByRole('button', { name: /, del estante\./ })[0]!
    expect(ficha.getAttribute('aria-label')).toMatch(/Vuelve (mañana|el .+)\. Probar$|Vuelve más adelante\. Probar$/)
    fireEvent.click(ficha)
    const probador = screen.getByRole('dialog')
    expect(within(probador).getByText(/Hoy no está en la vitrina/)).toBeTruthy()
    expect(within(probador).queryByRole('button', { name: /^Comprar/ })).toBeNull()
  })

  it('"¿Cómo gano monedas?" cuenta las misiones', async () => {
    abrirTienda()
    fireEvent.click(await screen.findByRole('button', { name: /Cómo gano monedas/ }))
    const hoja = screen.getByRole('dialog', { name: '¿Cómo gano monedas?' })
    expect(within(hoja).getByText(/por cada misión/)).toBeTruthy()
  })
})

describe('beta tester', () => {
  it('usa lo de la tienda sin comprarlo, lo recuerda al comprar, y al salir de la cuenta vuelve lo gratis', () => {
    const conCantina = () => cosmeticosPermitidos({ ...leerPerfil(), mesa: 'cantina' }).mesa
    expect(conCantina()).not.toBe('cantina')
    fijarInventario([], true)
    expect(conCantina()).toBe('cantina')
    expect(localStorage.getItem('truco.beta')).toBe('1')
    // Comprar no dice nada del beta: sigue como estaba.
    fijarInventario([letra.id])
    expect(esBeta()).toBe(true)
    fijarInventario([], false)
    expect(conCantina()).not.toBe('cantina')
    expect(localStorage.getItem('truco.beta')).toBeNull()
  })
})
