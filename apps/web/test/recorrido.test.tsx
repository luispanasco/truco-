import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { ConexionLocal } from '../src/conexion/local'
import { useJuego } from '../src/estado'
import { Inicio } from '../src/pantallas/Inicio'
import { Mesa } from '../src/pantallas/Mesa'
import { guardarPerfil, leerPerfil } from '../src/perfil'
import { recorridoAutomatico } from '../src/recorrido/bandera'

function App({ ruta = '/' }: { ruta?: string }) {
  return (
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/mesa" element={<Mesa />} />
        <Route path="/aprender" element={<p>Lecciones</p>} />
      </Routes>
    </MemoryRouter>
  )
}

const recorrido = () => screen.queryByRole('dialog', { name: 'Recorrido con Don Queiroz' })
const siguiente = () => fireEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
const pestania = (nombre: string) => screen.getByRole('tab', { name: nombre }).getAttribute('aria-selected')

beforeEach(() => {
  localStorage.clear()
  // Sin servidor de cuentas: la app queda sin cuentas (no hay sesión abierta).
  vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('Sin servidor'))))
  recorridoAutomatico(true)
})

// jsdom no desliza: el carril de Jugar (Partidas / Modo historia) usa scrollTo.
Element.prototype.scrollTo ??= () => {}

afterEach(() => {
  act(() => useJuego.getState().salir())
  cleanup()
  recorridoAutomatico(false)
  vi.unstubAllGlobals()
})

describe('recorrido de bienvenida', () => {
  it('sale la primera vez, avanza por los pasos moviendo el menú y al terminar no vuelve', async () => {
    render(<App />)
    await waitFor(() => expect(recorrido()).toBeTruthy())
    expect(screen.getByText('1 de 11')).toBeTruthy()
    expect(screen.getByText(/Soy Don Queiroz/)).toBeTruthy()
    expect(localStorage.getItem('truco.recorrido')).toBe('visto')
    // El foco va a "Siguiente".
    await waitFor(() => expect(document.activeElement?.textContent).toBe('Siguiente'))

    for (let i = 1; i < 7; i++) siguiente()
    expect(screen.getByText('7 de 11')).toBeTruthy()
    expect(screen.getByText(/En Avatar armás tu personaje/)).toBeTruthy()
    expect(pestania('Avatar')).toBe('true')
    siguiente()
    expect(pestania('Tienda')).toBe('true')
    siguiente()
    expect(pestania('Lobby')).toBe('true')
    siguiente()
    expect(pestania('Grupos')).toBe('true')
    siguiente()
    expect(screen.getByText('11 de 11')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Aprendé a jugar' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '¡A jugar!' }))
    expect(recorrido()).toBeNull()
    expect(pestania('Jugar')).toBe('true')

    // Al volver a abrir la app, ya no sale.
    cleanup()
    render(<App />)
    await act(() => new Promise((r) => setTimeout(r, 50)))
    expect(recorrido()).toBeNull()
  })

  it('"Saltar" (o Escape) lo cierra y no vuelve', async () => {
    render(<App />)
    await waitFor(() => expect(recorrido()).toBeTruthy())
    siguiente()
    fireEvent.click(screen.getByRole('button', { name: 'Saltar' }))
    expect(recorrido()).toBeNull()
    cleanup()
    render(<App />)
    await act(() => new Promise((r) => setTimeout(r, 50)))
    expect(recorrido()).toBeNull()
  })

  it('no sale si ya usó la app (tiene apodo); "Ver el recorrido de nuevo" en Ajustes lo abre', async () => {
    guardarPerfil({ ...leerPerfil(), apodo: 'Luis' })
    render(<App />)
    await act(() => new Promise((r) => setTimeout(r, 50)))
    expect(recorrido()).toBeNull()
    expect(localStorage.getItem('truco.recorrido')).toBe('viejo')
    // Tampoco le sale el de la mesa.
    expect(localStorage.getItem('truco.recorridoMesa')).toBe('viejo')

    fireEvent.click(screen.getByRole('button', { name: 'Ajustes' }))
    fireEvent.click(screen.getByRole('button', { name: 'Ver el recorrido de nuevo' }))
    await waitFor(() => expect(recorrido()).toBeTruthy())
    expect(screen.queryByRole('dialog', { name: 'Ajustes' })).toBeNull()
    fireEvent.keyDown(recorrido()!, { key: 'Escape' })
    expect(recorrido()).toBeNull()
  })

  it('el botón de las lecciones lleva a /aprender', async () => {
    render(<App />)
    await waitFor(() => expect(recorrido()).toBeTruthy())
    for (let i = 1; i < 11; i++) siguiente()
    fireEvent.click(screen.getByRole('button', { name: 'Aprendé a jugar' }))
    expect(screen.getByText('Lecciones')).toBeTruthy()
  })
})

describe('recorrido de la mesa', () => {
  it('sale en la primera partida contra la compu y la partida espera hasta saltarlo', async () => {
    localStorage.setItem('truco.recorrido', 'visto')
    guardarPerfil({ ...leerPerfil(), apodo: 'Luis', ojear: false })
    // Con esta semilla arranca jugando el bot: si no esperara, jugaría enseguida.
    act(() =>
      useJuego
        .getState()
        .conectar(new ConexionLocal({ apodo: 'Luis', avatar: '🧉', formato: '1v1', nivelBots: 'facil', demoraBots: [0, 0], semilla: 2 })),
    )
    render(<App ruta="/mesa" />)
    const mesa = () => screen.queryByRole('dialog', { name: 'La mesa, con Don Queiroz' })
    await waitFor(() => expect(mesa()).toBeTruthy(), { timeout: 5000 })
    expect(localStorage.getItem('truco.recorridoMesa')).toBe('visto')
    // En 1 contra 1 no está el paso de las señas.
    expect(screen.getByText('1 de 5')).toBeTruthy()

    const vista = useJuego.getState().vista!
    expect(vista.esperandoA).not.toContain(0)
    await act(() => new Promise((r) => setTimeout(r, 200)))
    expect(useJuego.getState().vista).toBe(vista)

    fireEvent.click(screen.getByRole('button', { name: 'Saltar' }))
    expect(mesa()).toBeNull()
    await waitFor(() => expect(useJuego.getState().vista).not.toBe(vista), { timeout: 3000 })
  })

  it('en las partidas siguientes ya no sale', async () => {
    localStorage.setItem('truco.recorrido', 'visto')
    localStorage.setItem('truco.recorridoMesa', 'visto')
    guardarPerfil({ ...leerPerfil(), apodo: 'Luis', ojear: false })
    act(() =>
      useJuego
        .getState()
        .conectar(new ConexionLocal({ apodo: 'Luis', avatar: '🧉', formato: '1v1', nivelBots: 'facil', demoraBots: [0, 0], semilla: 2 })),
    )
    render(<App ruta="/mesa" />)
    await waitFor(() => expect(screen.getAllByLabelText(/^Jugar el /).length).toBeGreaterThan(0), { timeout: 5000 })
    await act(() => new Promise((r) => setTimeout(r, 1200)))
    expect(screen.queryByRole('dialog', { name: 'La mesa, con Don Queiroz' })).toBeNull()
  })
})
