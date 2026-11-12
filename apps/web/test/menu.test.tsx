import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { useCuenta } from '../src/cuenta/cuenta'
import { useAmigos } from '../src/cuenta/amigos'
import { fijarInventario } from '../src/cuenta/inventario'
import { Crear } from '../src/pantallas/Crear'
import { Inicio } from '../src/pantallas/Inicio'
import { guardarPerfil, leerPerfil } from '../src/perfil'
import { codificarAvatar, PERSONAJES } from '@truco/shared'

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
      if (url.endsWith('/grupos')) return Response.json({ tuyos: [], buscar: [], quedan: 10 })
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
    expect(within(panel('jugar')).getByRole('button', { name: '¡Jugar!' })).toBeTruthy()
    expect(within(panel('jugar')).getByText('Contra la compu')).toBeTruthy()
    expect(within(panel('jugar')).getByRole('button', { name: /Crear sala/ })).toBeTruthy()
    expect(within(panel('jugar')).getByRole('button', { name: /Unirme con código/ })).toBeTruthy()
    // Las de los costados no se alcanzan mientras no están a la vista.
    expect(panel('tienda').hasAttribute('inert')).toBe(true)
    expect(panel('lobby').hasAttribute('inert')).toBe(true)
    // Cinco pestañas: avatar a la izquierda de todo y grupos a la derecha de todo.
    expect(within(screen.getByRole('tablist', { name: 'Pantallas del menú' })).getAllByRole('tab').map((t) => t.getAttribute('aria-label'))).toEqual(['Avatar', 'Tienda', 'Jugar', 'Lobby', 'Grupos'])

    fireEvent.click(pestania('Tienda'))
    expect(pestania('Tienda').getAttribute('aria-selected')).toBe('true')
    expect(panel('tienda').hasAttribute('inert')).toBe(false)
    expect(panel('jugar').hasAttribute('inert')).toBe(true)

    // Con las flechas, como cualquier grupo de pestañas (y da la vuelta).
    fireEvent.keyDown(pestania('Tienda'), { key: 'ArrowLeft' })
    expect(pestania('Avatar').getAttribute('aria-selected')).toBe('true')
    fireEvent.keyDown(pestania('Avatar'), { key: 'ArrowLeft' })
    expect(pestania('Grupos').getAttribute('aria-selected')).toBe('true')
    expect(within(panel('grupos')).getByText('Armá tu grupo')).toBeTruthy()
    fireEvent.keyDown(pestania('Grupos'), { key: 'ArrowLeft' })
    expect(pestania('Lobby').getAttribute('aria-selected')).toBe('true')
    expect(within(panel('lobby')).getByRole('button', { name: 'Jugar' })).toBeTruthy()
    expect(within(panel('lobby')).getByText(/Practicar contra la compu/)).toBeTruthy()
    expect(within(panel('lobby')).getByRole('button', { name: /Buscar rival/ })).toBeTruthy()
    fireEvent.keyDown(pestania('Lobby'), { key: 'ArrowRight' })
    expect(pestania('Grupos').getAttribute('aria-selected')).toBe('true')
  })

  it('al deslizar con el dedo, la barra marca la pantalla que quedó a la vista', () => {
    servidorFalso()
    menu()
    const carril = panel('jugar').parentElement!
    Object.defineProperty(carril, 'clientWidth', { value: 400 })
    carril.scrollLeft = 1200
    fireEvent.scroll(carril)
    expect(pestania('Lobby').getAttribute('aria-selected')).toBe('true')
    carril.scrollLeft = 410
    fireEvent.scroll(carril)
    expect(pestania('Tienda').getAttribute('aria-selected')).toBe('true')
    carril.scrollLeft = 10
    fireEvent.scroll(carril)
    expect(pestania('Avatar').getAttribute('aria-selected')).toBe('true')
  })

  it('el modo se cambia con las flechas y queda guardado; el botón grande hace lo del modo', () => {
    servidorFalso()
    menu()
    const jugar = within(panel('jugar'))
    // Contra la compu dice el formato y el nivel; tocándolo se va al lobby a cambiarlos.
    fireEvent.click(jugar.getByRole('button', { name: 'Cambiar formato y nivel (Mano a mano, Medio)' }))
    expect(pestania('Lobby').getAttribute('aria-selected')).toBe('true')
    fireEvent.click(pestania('Jugar'))
    fireEvent.click(jugar.getByRole('button', { name: 'Modo siguiente' }))
    expect(jugar.getByText('Buscar partida')).toBeTruthy()
    expect(leerPerfil().modoJugar).toBe('buscar')
    fireEvent.click(jugar.getByRole('button', { name: '¡Jugar!' }))
    expect(screen.getByTestId('ruta').textContent).toBe('/buscar')
  })

  it('sin apodo, al tocar jugar se pide y después sigue con lo que tocaste', () => {
    servidorFalso()
    guardarPerfil({ ...leerPerfil(), apodo: '', modoJugar: 'buscar' })
    menu()
    fireEvent.click(screen.getByRole('button', { name: '¡Jugar!' }))
    const hoja = screen.getByRole('dialog', { name: '¿Cómo te dicen?' })
    expect(within(hoja).getByRole('button', { name: '¡A jugar!' })).toHaveProperty('disabled', true)
    fireEvent.change(within(hoja).getByPlaceholderText('¿Cómo te dicen?'), { target: { value: 'Luis' } })
    // El banner se entera en el momento.
    expect(screen.getByRole('button', { name: 'Luis' })).toBeTruthy()
    fireEvent.click(within(hoja).getByRole('button', { name: '¡A jugar!' }))
    expect(screen.getByTestId('ruta').textContent).toBe('/buscar')
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

  it('el engranaje abre los ajustes del juego: sonido, señas, ayudas y la tienda de prueba (nada cosmético)', () => {
    servidorFalso()
    menu()
    fireEvent.click(screen.getByRole('button', { name: 'Ajustes' }))
    const hoja = screen.getByRole('dialog', { name: 'Ajustes' })
    expect(within(hoja).getByText('Sonido')).toBeTruthy()
    expect(within(hoja).queryByRole('radiogroup', { name: 'Mesa' })).toBeNull()
    expect(within(hoja).queryByRole('radiogroup', { name: 'Tipografía' })).toBeNull()
    expect(within(hoja).queryByRole('radiogroup', { name: 'Baraja' })).toBeNull()
    expect(within(hoja).getByRole('switch', { name: /Se juega con señas/ })).toBeTruthy()
    expect(within(hoja).getByRole('switch', { name: /Ayudas/ })).toBeTruthy()
    fireEvent.click(within(hoja).getByRole('switch', { name: /Desbloquear la tienda/ }))
    expect(leerPerfil().tiendaDesbloqueada).toBe(true)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('pantalla Avatar', () => {
  it('junta el avatar, el mazo, el paño y la letra; el visor muestra las cartas de cada palo', () => {
    servidorFalso()
    menu()
    fireEvent.click(pestania('Avatar'))
    const avatar = within(panel('avatar'))
    // Una pestaña por cosa: arranca en el mazo.
    expect(avatar.getByRole('radiogroup', { name: 'Baraja' })).toBeTruthy()
    expect(avatar.queryByRole('radiogroup', { name: 'Mesa' })).toBeNull()
    fireEvent.click(avatar.getByRole('tab', { name: 'Paño' }))
    expect(avatar.getByRole('radiogroup', { name: 'Mesa' })).toBeTruthy()
    fireEvent.click(avatar.getByRole('tab', { name: 'Letra' }))
    expect(avatar.getByRole('radiogroup', { name: 'Tipografía' })).toBeTruthy()
    // Los personajes, solo para el admin.
    expect(avatar.queryByRole('tab', { name: 'Personajes' })).toBeNull()
    fireEvent.click(avatar.getByRole('tab', { name: 'Mazo' }))

    // El avatar se edita en la misma hoja que desde el banner.
    fireEvent.click(avatar.getByRole('button', { name: 'Cambiar avatar y apodo' }))
    expect(screen.getByRole('dialog', { name: 'Tu perfil' })).toBeTruthy()
    fireEvent.keyDown(window, { key: 'Escape' })

    fireEvent.click(avatar.getByRole('button', { name: 'Ver las cartas' }))
    const visor = within(screen.getByRole('dialog', { name: 'Las cartas del mazo' }))
    const cartas = () => visor.getAllByRole('listitem').map((li) => li.querySelector('.carta')!.getAttribute('aria-label'))
    expect(cartas()).toHaveLength(10)
    expect(cartas()[0]).toBe('1 de espadas')
    fireEvent.click(visor.getByRole('radio', { name: 'Copa' }))
    expect(cartas()).toEqual([1, 2, 3, 4, 5, 6, 7, 10, 11, 12].map((n) => `${n} de copas`))
    // Solo las que mandan: las piezas de la más alta a la más baja (en copa no hay matas).
    fireEvent.click(visor.getByRole('switch', { name: /Solo las que mandan/ }))
    expect(cartas()).toEqual([2, 4, 5, 11, 10].map((n) => `${n} de copas`))
    fireEvent.click(visor.getByRole('radio', { name: 'Espada' }))
    expect(cartas()).toEqual(['2', '4', '5', '11', '10', '1', '7'].map((n) => `${n} de espadas`))
    expect(visor.getByText('Perico')).toBeTruthy()
    // El dorso: una carta grande boca abajo, sin el interruptor.
    fireEvent.click(visor.getByRole('radio', { name: 'Dorso' }))
    expect(visor.getByLabelText('carta boca abajo')).toBeTruthy()
    expect(visor.queryByRole('switch', { name: /Solo las que mandan/ })).toBeNull()
    // Solo se ve la baraja que usás (no hay selector de barajas).
    expect(visor.queryByRole('radiogroup', { name: 'Baraja que mirás' })).toBeNull()
    // Sin ser admin no están los personajes.
    expect(avatar.queryByRole('heading', { name: 'Personajes del modo historia' })).toBeNull()
  })

  it('el admin ve los personajes del modo historia y se puede probar uno (y volver al suyo)', () => {
    servidorFalso()
    useCuenta.setState({
      estado: 'adentro',
      token: 'prueba:luis@ejemplo.com',
      cuenta: { id: 'c1', email: 'luis@ejemplo.com', apodo: 'Luis', avatar: null, preferencias: {}, beta: true, admin: true, nueva: false },
    })
    // Como al entrar: el servidor marca al admin como beta, así puede usar las piezas pagas.
    fijarInventario([], true)
    menu()
    fireEvent.click(pestania('Avatar'))
    const avatar = within(panel('avatar'))
    fireEvent.click(avatar.getByRole('tab', { name: 'Personajes' }))
    expect(avatar.getByRole('heading', { name: 'Personajes del modo historia' })).toBeTruthy()
    expect(avatar.getAllByRole('button', { name: /^Probarte a / })).toHaveLength(PERSONAJES.length)
    const antes = leerPerfil().avatar
    fireEvent.click(avatar.getByRole('button', { name: 'Probarte a Ramón el Gaucho' }))
    expect(leerPerfil().avatar).toBe(codificarAvatar(PERSONAJES.find((p) => p.id === 'gaucho')!.avatar))
    expect(avatar.getByText(/Tenés puesto a Ramón el Gaucho/)).toBeTruthy()
    fireEvent.click(avatar.getByRole('button', { name: 'Volver al tuyo' }))
    expect(leerPerfil().avatar).toBe(antes)
  })
})

/** Lo que dice el Elo del banner. */
const eloDelBanner = () => document.querySelector('.banner-elo')?.textContent ?? ''

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
    // (El Elo también está en el lobby: acá se mira el del banner.)
    await waitFor(() => expect(eloDelBanner()).toContain('1287'))
    expect(eloDelBanner()).toContain('Elo 1 vs 1')

    // Las monedas llevan a la tienda.
    fireEvent.click(monedas)
    expect(pestania('Tienda').getAttribute('aria-selected')).toBe('true')

    // Al cambiar de formato en el lobby, el banner muestra el Elo de ese formato.
    fireEvent.click(pestania('Lobby'))
    fireEvent.click(within(panel('lobby')).getByRole('button', { name: /^Parejas/ }))
    await waitFor(() => expect(eloDelBanner()).toContain('1111'))
    expect(eloDelBanner()).toContain('Elo 2 vs 2')
  })

  it('sin partidas con Elo, muestra el inicial (1200)', async () => {
    servidorFalso({ conElo: false })
    useCuenta.setState({ estado: 'adentro', token: 'prueba:ana@ejemplo.com', saldo: 0 })
    menu()
    await waitFor(() => expect(eloDelBanner()).toContain('1200'))
    expect(document.querySelector('.banner-elo.sin-partidas')).toBeTruthy()
  })
})

describe('amigos en el menú', () => {
  it('muestra los conectados: al que espera en una sala te unís, al conectado lo invitás', async () => {
    servidorFalso()
    useCuenta.setState({ estado: 'adentro', token: 'prueba:ana@ejemplo.com', saldo: 0 })
    menu()
    const amigos = await screen.findByRole('region', { name: /^Amigos/ })
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
    const amigos = await screen.findByRole('region', { name: /^Amigos/ })
    fireEvent.click(await within(amigos).findByRole('button', { name: 'Unirte a la sala de Caro' }))
    expect(screen.getByTestId('ruta').textContent).toBe('/s/QWERT')
  })
})
