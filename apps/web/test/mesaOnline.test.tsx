import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { crearConfig, crearPartida, esperandoA, vistaPara } from '@truco/engine'
import { SENIAS_DEFAULT, type InfoSala, type MensajesCliente } from '@truco/shared'
import { ConexionLocal } from '../src/conexion/local'
import type { Conexion, MensajeServidor } from '../src/conexion/tipos'
import { useJuego } from '../src/estado'
import { Mesa } from '../src/pantallas/Mesa'

function App() {
  return (
    <MemoryRouter initialEntries={['/mesa']}>
      <Routes>
        <Route path="/" element={<div>Inicio</div>} />
        <Route path="/mesa" element={<Mesa />} />
      </Routes>
    </MemoryRouter>
  )
}

afterEach(() => {
  act(() => useJuego.getState().salir())
  cleanup()
  sessionStorage.clear()
})

const local = (formato: '1v1' | '2v2') =>
  new ConexionLocal({ apodo: 'Luis', avatar: '🧉', formato, nivelBots: 'facil', demoraBots: [0, 0], semilla: 21 })

async function entrar(c: Conexion) {
  act(() => useJuego.getState().conectar(c))
  render(<App />)
  await waitFor(() => expect(screen.getByLabelText('Mazo y muestra')).toBeTruthy(), { timeout: 5000 })
}

/** Conexión de mentira "online": el test decide qué llega y ve lo que se manda. */
function conexionFalsa() {
  let oyente: ((m: MensajeServidor) => void) | null = null
  const enviados: { tipo: keyof MensajesCliente; datos: unknown }[] = []
  const c = {
    tipo: 'online' as const,
    roomId: 'SALA1',
    enviar: (tipo: keyof MensajesCliente, datos: unknown) => void enviados.push({ tipo, datos }),
    escuchar: (o: (m: MensajeServidor) => void) => {
      oyente = o
      return () => (oyente = null)
    },
    salir: () => {},
  }
  return { c: c as Conexion, enviados, llegar: (m: MensajeServidor) => act(() => oyente!(m)) }
}

/** Una partida 1v1 entre dos personas, vista desde el asiento al que le toca jugar. */
function partidaOnline(otro: { conectado: boolean } = { conectado: true }) {
  const config = crearConfig({ formato: '1v1' })
  const estado = crearPartida({
    jugadores: [
      { id: 'j0', nombre: 'Luis' },
      { id: 'j1', nombre: 'Ana' },
    ],
    semilla: 5,
    config,
    reparte: 0,
  })
  const yo = esperandoA(estado)[0]!
  const apodo = (a: number) => (a === yo ? 'Luis' : 'Ana')
  const sala: InfoSala = {
    codigo: 'SALA1',
    publica: false,
    tiempos: { turnoS: 30, primeraJugadaS: 60 },
    cartasJugadas: 'quedan',
    mesa: 'boliche',
    baraja: 'propia',
    fase: 'jugando',
    formato: '1v1',
    config,
    botsEnVacios: false,
    nivelBots: 'medio',
    ayudas: true,
    senias: SENIAS_DEFAULT,
    chatEquipo: false,
    lugares: [0, 1].map((a) => ({
      asiento: a,
      tipo: 'humano' as const,
      apodo: apodo(a),
      avatar: null,
      conectado: a === yo ? true : otro.conectado,
      anfitrion: a === 0,
    })),
    yo,
    revancha: [],
  }
  return { sala, vista: vistaPara(estado, `j${yo}`), yo }
}

describe('chat', () => {
  it('se abre, manda una frase rápida y el mensaje aparece (modo local)', async () => {
    await entrar(local('2v2'))
    fireEvent.click(screen.getByRole('button', { name: /^Chat/ }))
    const panel = screen.getByRole('dialog', { name: 'Chat' })
    // En 2v2 hay chat de equipo.
    expect(within(panel).getByRole('tab', { name: 'Equipo' })).toBeTruthy()
    fireEvent.click(within(panel).getByRole('button', { name: 'Buena mano' }))
    await waitFor(() => expect(panel.querySelector('.chat-lista')!.textContent).toContain('Buena mano'))
    // También se escribe a mano.
    fireEvent.change(within(panel).getByLabelText('Mensaje'), { target: { value: 'Vamos arriba' } })
    fireEvent.click(within(panel).getByRole('button', { name: 'Enviar' }))
    await waitFor(() => expect(panel.querySelector('.chat-lista')!.textContent).toContain('Vamos arriba'))
    fireEvent.click(within(panel).getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog', { name: 'Chat' })).toBeNull()
  })

  it('cuenta los mensajes sin leer y al cerrar el panel quedan leídos', async () => {
    const { c, llegar } = conexionFalsa()
    const { sala, vista, yo } = partidaOnline()
    act(() => useJuego.getState().conectar(c))
    render(<App />)
    llegar({ tipo: 'sala', datos: sala })
    llegar({ tipo: 'vista', datos: vista })
    llegar({ tipo: 'chat', datos: { de: 1 - yo, apodo: 'Ana', texto: 'Hola', canal: 'general', hora: 1000 } })
    llegar({ tipo: 'chat', datos: { de: 1 - yo, apodo: 'Ana', texto: '¿Todo bien?', canal: 'general', hora: 2000 } })
    fireEvent.click(screen.getByRole('button', { name: 'Chat, 2 sin leer' }))
    expect(within(screen.getByRole('dialog', { name: 'Chat' })).getByText('¿Todo bien?')).toBeTruthy()
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Chat' })).getByRole('button', { name: 'Cerrar' }))
    expect(screen.getByRole('button', { name: 'Chat' })).toBeTruthy()
  })
})

describe('globitos de chat', () => {
  it('el mensaje sale como globo de quien lo mandó, y el mío de mi lugar', () => {
    const { c, llegar } = conexionFalsa()
    const { sala, vista, yo } = partidaOnline()
    act(() => useJuego.getState().conectar(c))
    const { container } = render(<App />)
    llegar({ tipo: 'sala', datos: sala })
    llegar({ tipo: 'vista', datos: vista })
    llegar({ tipo: 'chat', datos: { de: 1 - yo, apodo: 'Ana', texto: 'Hola', canal: 'general', hora: 1000 } })
    const deAna = container.querySelector('.asiento .globo-chat')!
    expect(deAna.textContent).toBe('Ana: Hola')
    // Ana está enfrente (arriba de todo): el globo le sale al costado del avatar.
    expect(deAna.classList.contains('lateral')).toBe(true)
    // Otro mensaje de la misma persona reemplaza al anterior.
    llegar({ tipo: 'chat', datos: { de: 1 - yo, apodo: 'Ana', texto: '¿Todo bien?', canal: 'general', hora: 2000 } })
    expect(container.querySelectorAll('.asiento .globo-chat')).toHaveLength(1)
    expect(container.querySelector('.asiento .globo-chat')!.textContent).toBe('Ana: ¿Todo bien?')
    // El mío sale de mi lugar, abajo.
    llegar({ tipo: 'chat', datos: { de: yo, apodo: 'Luis', texto: 'Joya', canal: 'general', hora: 3000 } })
    expect(container.querySelector('.mi-lugar .mis-globos .globo-chat')!.textContent).toBe('Luis: Joya')
  })

  it('con un canto en el mismo lugar se apilan: el canto, pegado a la persona', () => {
    const { c, llegar } = conexionFalsa()
    const { sala, vista, yo } = partidaOnline()
    act(() => useJuego.getState().conectar(c))
    const { container } = render(<App />)
    llegar({ tipo: 'sala', datos: sala })
    llegar({ tipo: 'vista', datos: vista })
    llegar({ tipo: 'chat', datos: { de: yo, apodo: 'Luis', texto: 'Ahí va', canal: 'general', hora: 1000 } })
    llegar({ tipo: 'eventos', datos: [{ tipo: 'alMazo', asiento: yo, equipo: (yo % 2) as 0 | 1 }] })
    const pila = container.querySelector('.mis-globos')!
    expect([...pila.children].map((g) => g.textContent)).toEqual(['Me voy al mazo', 'Luis: Ahí va'])
    expect(pila.querySelector('.globo-chat')!.classList.contains('apilado')).toBe(true)
  })

  it('no muestra los de alguien silenciado', () => {
    const { c, llegar } = conexionFalsa()
    const { sala, vista, yo } = partidaOnline()
    act(() => useJuego.getState().conectar(c))
    const { container } = render(<App />)
    llegar({ tipo: 'sala', datos: sala })
    llegar({ tipo: 'vista', datos: vista })
    fireEvent.click(screen.getByRole('button', { name: 'Opciones para Ana' }))
    fireEvent.click(screen.getByRole('button', { name: 'Silenciar' }))
    llegar({ tipo: 'chat', datos: { de: 1 - yo, apodo: 'Ana', texto: 'Hola', canal: 'general', hora: 1000 } })
    expect(container.querySelector('.globo-chat')).toBeNull()
  })
})

describe('señas', () => {
  it('en 2v2 se abre la cara de señas y se hace una (modo local)', async () => {
    await entrar(local('2v2'))
    fireEvent.click(screen.getByRole('button', { name: 'Hacer una seña' }))
    const panel = screen.getByRole('dialog', { name: 'Señas' })
    fireEvent.click(within(panel).getByRole('button', { name: 'Guiño derecho (perico)' }))
    expect(screen.getByText(/Le hiciste la seña: guiño derecho/)).toBeTruthy()
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Señas' })).toBeNull(), { timeout: 3000 })
  })

  it('en 1v1 no hay botón de señas', async () => {
    await entrar(local('1v1'))
    expect(screen.queryByRole('button', { name: 'Hacer una seña' })).toBeNull()
  })
})

describe('online', () => {
  it('con tiempo límite muestra "Te quedan N s" en vez de "Te toca"', () => {
    const { c, llegar } = conexionFalsa()
    const { sala, vista, yo } = partidaOnline()
    act(() => useJuego.getState().conectar(c))
    render(<App />)
    llegar({ tipo: 'sala', datos: sala })
    llegar({ tipo: 'vista', datos: vista })
    llegar({ tipo: 'turno', datos: { asientos: [yo], venceEn: null } })
    expect(screen.getByText('Te toca')).toBeTruthy()
    llegar({ tipo: 'turno', datos: { asientos: [yo], venceEn: Date.now() + 25_000 } })
    expect(screen.getByRole('timer').textContent).toMatch(/^Te quedan (25|24) s$/)
    expect(screen.queryByText('Te toca')).toBeNull()
  })

  it('el que se desconectó aparece con "juega un bot"', () => {
    const { c, llegar } = conexionFalsa()
    const { sala, vista } = partidaOnline({ conectado: false })
    act(() => useJuego.getState().conectar(c))
    render(<App />)
    llegar({ tipo: 'sala', datos: sala })
    llegar({ tipo: 'vista', datos: vista })
    expect(screen.getByText('juega un bot')).toBeTruthy()
  })

  it('el menú de jugador silencia y reporta', () => {
    const { c, llegar, enviados } = conexionFalsa()
    const { sala, vista, yo } = partidaOnline()
    act(() => useJuego.getState().conectar(c))
    render(<App />)
    llegar({ tipo: 'sala', datos: sala })
    llegar({ tipo: 'vista', datos: vista })
    fireEvent.click(screen.getByRole('button', { name: 'Opciones para Ana' }))
    fireEvent.click(screen.getByRole('button', { name: 'Silenciar' }))
    expect(enviados).toContainEqual({ tipo: 'silenciar', datos: { asiento: 1 - yo, silenciar: true } })
    expect(screen.getByLabelText('silenciado')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Opciones para Ana' }))
    expect(screen.getByRole('button', { name: 'Dejar de silenciar' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Reportar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Insultos' }))
    expect(enviados).toContainEqual({ tipo: 'reportar', datos: { asiento: 1 - yo, motivo: 'insultos' } })
    expect(screen.getByText('Gracias, lo vamos a revisar.')).toBeTruthy()
  })

  it('la revancha muestra cuántos la pidieron', () => {
    const { c, llegar, enviados } = conexionFalsa()
    const { sala, vista, yo } = partidaOnline()
    act(() => useJuego.getState().conectar(c))
    render(<App />)
    llegar({ tipo: 'sala', datos: { ...sala, fase: 'terminada', revancha: [1 - yo] } })
    llegar({ tipo: 'vista', datos: { ...vista, ganador: 0 } })
    fireEvent.click(screen.getByRole('button', { name: 'Revancha 1/2' }))
    expect(enviados).toContainEqual({ tipo: 'revancha', datos: {} })
    llegar({ tipo: 'sala', datos: { ...sala, fase: 'terminada', revancha: [0, 1] } })
    expect((screen.getByRole('button', { name: 'Esperando a los demás…' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
