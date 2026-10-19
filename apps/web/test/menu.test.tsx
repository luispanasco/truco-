import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { useCuenta } from '../src/cuenta/cuenta'
import { useAmigos } from '../src/cuenta/amigos'
import { Crear } from '../src/pantallas/Crear'
import { Inicio } from '../src/pantallas/Inicio'
import { guardarPerfil, leerPerfil } from '../src/perfil'

/** Un servidor de cuentas falso con el login de prueba, un ranking y dos amigos en la app. */
function servidorFalso({ conElo = true } = {}) {
  const pedidos: string[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) => {
      pedidos.push(url)
      if (url.endsWith('/estado')) return Response.json({ cuentas: true, loginDePrueba: true })
      if (url.endsWith('/entrar')) return Response.json({ id: 'c1', email: 'ana@ejemplo.com', apodo: 'Ana', avatar: null, preferencias: {}, nueva: true, saldo: 340 })
      if (url.includes('/ranking?formato=')) {
        const formato = url.slice(-3)
        const yo = conElo ? { posicion: 3, cuentaId: 'c1', apodo: 'Ana', avatar: null, puntos: formato === '2v2' ? 1111 : 1287, partidas: 9, ganadas: 6, enRanking: true } : null
        return Response.json({ formato, minimo: 5, filas: [], yo })
      }
      if (url.endsWith('/amigos')) {
        return Response.json({
          codigo: 'ABC234',
          amigos: [
            { id: 'a1', apodo: 'Beto', avatar: null, estado: 'conectado', sala: null },
            { id: 'a2', apodo: 'Caro', avatar: null, estado: 'enSala', sala: 'QWERT' },
            { id: 'a3', apodo: 'Dani', avatar: null, estado: 'desconectado', sala: null },
          ],
          recibidas: [],
          enviadas: [],
        })
      }
      if (url.endsWith('/amigos/latido')) return Response.json({ invitaciones: [] })
      if (url.endsWith('/tienda')) return Response.json({ dia: '2026-10-18', cambia: new Date(Date.now() + 3_600_000).toISOString(), items: [] })
      return Response.json({})
    }),
  )
  return pedidos
}

/** Dónde quedó la navegación (para las pantallas a las que lleva el menú). */
function Ruta() {
  const { pathname } = useLocation()
  return <p data-testid="ruta">{pathname}</p>
}

function menu() {
  return render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/crear" element={<Crear />} />
        <Route path="*" element={<Ruta />} />
      </Routes>
    </MemoryRouter>,
  )
}

const pestania = (nombre: string) => screen.getByRole('tab', { name: nombre })
const panel = (id: string) => document.getElementById(`panel-${id}`)!

beforeEach(() => {
  localStorage.clear()
  guardarPerfil({ ...leerPerfil(), apodo: 'Ana', formato: '1v1' })
  useCuenta.setState({ estado: 'afuera', modo: 'prueba', cuenta: null, token: null, saldo: null, error: null, linkEnviado: null })
})
afterEach(() => {
  cleanup()
  // Afuera de la cuenta se para el latido de los amigos.
  act(() => useCuenta.setState({ estado: 'afuera', cuenta: null, token: null }))
  useAmigos.setState({ lista: null, invitaciones: [] })
  vi.unstubAllGlobals()
})

describe('menú principal', () => {
  it('abre en "Jugar", con lo online, y la barra de abajo pasa de pantalla', () => {
    servidorFalso()
    menu()
    expect(pestania('Jugar').getAttribute('aria-selected')).toBe('true')
    expect(within(panel('jugar')).getByRole('button', { name: /Crear sala/ })).toBeTruthy()
    expect(within(panel('jugar')).getByRole('button', { name: /Unirme con código/ })).toBeTruthy()
    expect(within(panel('jugar')).getByRole('button', { name: /Buscar partida/ })).toBeTruthy()
    // Las de los costados no se alcanzan mientras no están a la vista.
    expect(panel('tienda').hasAttribute('inert')).toBe(true)
    expect(panel('lobby').hasAttribute('inert')).toBe(true)

    fireEvent.click(pestania('Tienda'))
    expect(pestania('Tienda').getAttribute('aria-selected')).toBe('true')
    expect(panel('tienda').hasAttribute('inert')).toBe(false)
    expect(panel('jugar').hasAttribute('inert')).toBe(true)

    // Con las flechas, como cualquier grupo de pestañas (y da la vuelta).
    fireEvent.keyDown(pestania('Tienda'), { key: 'ArrowLeft' })
    expect(pestania('Lobby').getAttribute('aria-selected')).toBe('true')
    expect(within(panel('lobby')).getByRole('button', { name: 'Jugar' })).toBeTruthy()
    expect(within(panel('lobby')).getByText('Contra la compu')).toBeTruthy()
    fireEvent.keyDown(pestania('Lobby'), { key: 'ArrowRight' })
    expect(pestania('Tienda').getAttribute('aria-selected')).toBe('true')
  })

  it('al deslizar con el dedo, la barra marca la pantalla que quedó a la vista', () => {
    servidorFalso()
    menu()
    const carril = panel('jugar').parentElement!
    Object.defineProperty(carril, 'clientWidth', { value: 400 })
    carril.scrollLeft = 800
    fireEvent.scroll(carril)
    expect(pestania('Lobby').getAttribute('aria-selected')).toBe('true')
    carril.scrollLeft = 10
    fireEvent.scroll(carril)
    expect(pestania('Tienda').getAttribute('aria-selected')).toBe('true')
  })

  it('sin apodo se pide en "Jugar", y lo online se habilita al ponerlo', () => {
    servidorFalso()
    guardarPerfil({ ...leerPerfil(), apodo: '' })
    menu()
    expect(screen.getByRole('button', { name: /Crear sala/ })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: 'Cambiar tu avatar' })).toBeTruthy()
    fireEvent.change(screen.getByPlaceholderText('¿Cómo te dicen?'), { target: { value: 'Luis' } })
    expect(screen.getByRole('button', { name: /Crear sala/ })).toHaveProperty('disabled', false)
    // El banner se entera en el momento.
    expect(screen.getByRole('button', { name: 'Luis' })).toBeTruthy()
  })

  it('tocando el avatar del banner se editan el avatar y el apodo', () => {
    servidorFalso()
    menu()
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar tu avatar' }))
    const hoja = screen.getByRole('dialog', { name: 'Tu perfil' })
    fireEvent.change(within(hoja).getByPlaceholderText('¿Cómo te dicen?'), { target: { value: 'Anita' } })
    expect(within(hoja).getByRole('tab', { name: 'Pelo' })).toBeTruthy()
    fireEvent.click(within(hoja).getByRole('button', { name: 'Listo' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(leerPerfil().apodo).toBe('Anita')
    expect(screen.getByRole('button', { name: 'Anita' })).toBeTruthy()
  })

  it('el engranaje abre los ajustes: sonido, mesa, letra, baraja, señas y la tienda de prueba', () => {
    servidorFalso()
    menu()
    fireEvent.click(screen.getByRole('button', { name: 'Ajustes' }))
    const hoja = screen.getByRole('dialog', { name: 'Ajustes' })
    expect(within(hoja).getByText('Sonido')).toBeTruthy()
    expect(within(hoja).getByRole('radiogroup', { name: 'Mesa' })).toBeTruthy()
    expect(within(hoja).getByRole('radiogroup', { name: 'Tipografía' })).toBeTruthy()
    expect(within(hoja).getByRole('radiogroup', { name: 'Baraja' })).toBeTruthy()
    expect(within(hoja).getByRole('switch', { name: /Se juega con señas/ })).toBeTruthy()
    expect(within(hoja).getByRole('switch', { name: /Ayudas/ })).toBeTruthy()
    fireEvent.click(within(hoja).getByRole('switch', { name: /Desbloquear la tienda/ }))
    expect(leerPerfil().tiendaDesbloqueada).toBe(true)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('banner de la cuenta', () => {
  it('como invitado invita a entrar; al entrar se ven las monedas y el Elo del formato', async () => {
    servidorFalso()
    menu()
    expect(screen.queryByRole('button', { name: /monedas\. Ir a la tienda/ })).toBeNull()
    fireEvent.click(screen.getAllByRole('button', { name: 'Entrar a tu cuenta' })[0]!)
    const hoja = screen.getByRole('dialog', { name: 'Entrar a tu cuenta' })
    fireEvent.change(within(hoja).getByPlaceholderText('vos@ejemplo.com'), { target: { value: 'ana@ejemplo.com' } })
    fireEvent.click(within(hoja).getByRole('button', { name: 'Entrar' }))

    // Adentro, la hoja se cierra sola y el banner muestra lo de la cuenta.
    const monedas = await screen.findByRole('button', { name: '340 monedas. Ir a la tienda' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(await screen.findByText('1287')).toBeTruthy()
    expect(screen.getByText('Elo 1 vs 1')).toBeTruthy()

    // Las monedas llevan a la tienda.
    fireEvent.click(monedas)
    expect(pestania('Tienda').getAttribute('aria-selected')).toBe('true')

    // Al cambiar de formato en el lobby, el banner muestra el Elo de ese formato.
    fireEvent.click(pestania('Lobby'))
    fireEvent.click(within(panel('lobby')).getByRole('button', { name: /^Parejas/ }))
    expect(await screen.findByText('1111')).toBeTruthy()
    expect(screen.getByText('Elo 2 vs 2')).toBeTruthy()
  })

  it('sin partidas con Elo, muestra el inicial (1200)', async () => {
    servidorFalso({ conElo: false })
    useCuenta.setState({ estado: 'adentro', token: 'prueba:ana@ejemplo.com', saldo: 0 })
    menu()
    expect(await screen.findByText('1200')).toBeTruthy()
    expect(document.querySelector('.banner-elo.sin-partidas')).toBeTruthy()
  })
})

describe('amigos en el menú', () => {
  it('muestra los conectados: al que espera en una sala te unís, al conectado lo invitás', async () => {
    servidorFalso()
    useCuenta.setState({ estado: 'adentro', token: 'prueba:ana@ejemplo.com', saldo: 0 })
    menu()
    const amigos = await screen.findByRole('region', { name: /Tus amigos/ })
    await within(amigos).findByText('Beto')
    expect(within(amigos).getByText('Caro')).toBeTruthy()
    // Los desconectados no aparecen en el menú (están en la pantalla de amigos).
    expect(within(amigos).queryByText('Dani')).toBeNull()
    // Primero el que está en una sala.
    expect(within(amigos).getAllByRole('listitem')[0]!.textContent).toContain('Caro')

    fireEvent.click(within(amigos).getByRole('button', { name: 'Invitar a Beto' }))
    await waitFor(() => expect(screen.getByText('Al crearla, le llega tu invitación a Beto.')).toBeTruthy())
  })

  it('"Unirme" lleva a la sala del amigo', async () => {
    servidorFalso()
    useCuenta.setState({ estado: 'adentro', token: 'prueba:ana@ejemplo.com', saldo: 0 })
    menu()
    const amigos = await screen.findByRole('region', { name: /Tus amigos/ })
    fireEvent.click(await within(amigos).findByRole('button', { name: 'Unirme' }))
    expect(screen.getByTestId('ruta').textContent).toBe('/s/QWERT')
  })
})
