import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { crearServidor } from '@truco/server/src/servidor'

// Con jsdom, el WebSocket de Node no acepta los eventos de jsdom: sin él, el SDK de Colyseus usa `ws`.
// Tiene que ser antes de que se cargue el SDK (vi.hoisted corre antes que los import).
vi.hoisted(() => Reflect.deleteProperty(globalThis, 'WebSocket'))
import { ConexionOnline } from '../src/conexion/online'
import type { MensajeServidor } from '../src/conexion/tipos'
import { useJuego } from '../src/estado'
import { Compartido } from '../src/pantallas/Compartido'
import { Crear } from '../src/pantallas/Crear'
import { Inicio } from '../src/pantallas/Inicio'
import { Sala } from '../src/pantallas/Sala'
import { Unirme } from '../src/pantallas/Unirme'

const PUERTO = 2577
let servidor: ReturnType<typeof crearServidor>
/** Conexiones hechas a mano (el "otro" jugador), para cerrarlas al final de cada prueba. */
const otras: ConexionOnline[] = []

beforeAll(async () => {
  vi.stubEnv('VITE_SERVIDOR', `ws://localhost:${PUERTO}`)
  servidor = crearServidor({
    dirDatos: mkdtempSync(join(tmpdir(), 'truco-web-pantallas-')),
    tiempos: { botMinMs: 0, botMaxMs: 0, pausaVueltaMs: 0, pausaManoMs: 0 },
  })
  await servidor.listen(PUERTO)
})
afterAll(async () => {
  vi.unstubAllEnvs()
  await servidor.gracefullyShutdown(false).catch(() => {})
})

let n = 0
/** Cada prueba con un invitado distinto, así el servidor no lo confunde con uno anterior. */
function perfil(apodo: string) {
  localStorage.setItem('truco.perfil', JSON.stringify({ invitadoId: `web-pantallas-${++n}-${Date.now()}`, apodo, avatar: '🦉' }))
}

beforeEach(() => localStorage.clear())
afterEach(() => {
  act(() => useJuego.getState().salir())
  for (const c of otras.splice(0)) c.salir()
  cleanup()
})

function App({ ruta }: { ruta: string }) {
  return (
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/crear" element={<Crear />} />
        <Route path="/unirme" element={<Unirme />} />
        <Route path="/s/:codigo" element={<Compartido />} />
        <Route path="/sala" element={<Sala />} />
        {/* La mesa de verdad se prueba aparte: acá alcanza con saber que se llegó. */}
        <Route path="/mesa" element={<p>MESA</p>} />
      </Routes>
    </MemoryRouter>
  )
}

/** Un jugador conectado por fuera de la interfaz, que junta lo que le llega. */
function escuchar(c: ConexionOnline) {
  otras.push(c)
  const mensajes: MensajeServidor[] = []
  c.escuchar((m) => mensajes.push(m))
  return mensajes
}

describe('pantallas online', () => {
  it('se crea una sala desde /crear, entra otro y el anfitrión la empieza', async () => {
    perfil('Ana')
    render(<App ruta="/crear" />)
    fireEvent.click(screen.getByRole('radio', { name: /Parejas/ }))
    // Las reglas de la mesa están plegadas y se pueden cambiar.
    fireEvent.click(screen.getByText('Reglas de la mesa'))
    fireEvent.click(screen.getByRole('radio', { name: '5 puntos' }))
    fireEvent.click(screen.getByRole('button', { name: 'Crear sala' }))

    await screen.findByText('Código de la sala', {}, { timeout: 8000 })
    const codigo = useJuego.getState().sala!.codigo!
    expect(codigo).toMatch(/^[A-Z0-9]{5}$/)
    expect(screen.getByText(codigo)).toBeTruthy()
    expect(useJuego.getState().sala!.config.valorContraflor).toBe(5)
    expect(useJuego.getState().sala!.lugares).toHaveLength(4)
    expect(screen.getByText('(vos)')).toBeTruthy()
    expect(screen.getByLabelText('Anfitrión')).toBeTruthy()

    // Entra otro con el código: aparece en el equipo 2 (asiento 1).
    const otro = escuchar(await ConexionOnline.unirse(codigo, { invitadoId: 'web-pantallas-beto', apodo: 'Beto', avatar: '🐸' }))
    const equipo2 = screen.getByRole('group', { name: 'Equipo 2' })
    await waitFor(() => expect(within(equipo2).getByText('Beto')).toBeTruthy(), { timeout: 8000 })
    expect(screen.getByText('2 de 4')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Empezar' }))
    await screen.findByText('MESA', {}, { timeout: 8000 })
    await waitFor(() => expect(otro.some((m) => m.tipo === 'vista')).toBe(true), { timeout: 8000 })
  })

  it('se entra con código desde /unirme y se va a la mesa cuando el anfitrión empieza', async () => {
    const anfitrion = await ConexionOnline.crearSala({ invitadoId: 'web-pantallas-ana', apodo: 'Ana', config: { formato: '1v1' } })
    escuchar(anfitrion)
    perfil('Beto')
    render(<App ruta="/unirme" />)
    const campo = screen.getByLabelText('Código de la sala') as HTMLInputElement
    fireEvent.change(campo, { target: { value: anfitrion.roomId.toLowerCase() } })
    expect(campo.value).toBe(anfitrion.roomId)
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    await screen.findByText('(vos)', {}, { timeout: 8000 })
    expect(screen.getByText('Ana')).toBeTruthy()
    expect(screen.getByText(/Esperando que el anfitrión empiece/)).toBeTruthy()
    // Solo el anfitrión ve el botón de empezar.
    expect(screen.queryByRole('button', { name: 'Empezar' })).toBeNull()

    anfitrion.enviar('iniciar', {})
    await screen.findByText('MESA', {}, { timeout: 8000 })
  })

  it('con el link /s/CODIGO y apodo, se entra directo a la sala', async () => {
    const anfitrion = await ConexionOnline.crearSala({ invitadoId: 'web-pantallas-ana-2', apodo: 'Ana', config: { formato: '1v1' } })
    escuchar(anfitrion)
    perfil('Caro')
    render(<App ruta={`/s/${anfitrion.roomId}`} />)
    await screen.findByText('(vos)', {}, { timeout: 8000 })
    expect(screen.getByText('Caro')).toBeTruthy()
  })

  it('un código que no existe muestra un error entendible', async () => {
    perfil('Beto')
    render(<App ruta="/unirme" />)
    fireEvent.change(screen.getByLabelText('Código de la sala'), { target: { value: 'ZZZZZ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('No existe una sala con ese código.', {}, { timeout: 8000 })).toBeTruthy()
  })
})

describe('inicio online', () => {
  it('sin apodo, las opciones online están desactivadas', () => {
    render(<App ruta="/" />)
    expect(screen.getByRole('button', { name: /Crear sala/ })).toHaveProperty('disabled', true)
    expect(screen.getByRole('button', { name: /Buscar partida/ })).toHaveProperty('disabled', true)
    fireEvent.change(screen.getByPlaceholderText('¿Cómo te dicen?'), { target: { value: 'Luis' } })
    expect(screen.getByRole('button', { name: /Unirme con código/ })).toHaveProperty('disabled', false)
  })

  it('ofrece volver a una partida en curso y se puede descartar', () => {
    perfil('Luis')
    localStorage.setItem('truco.partidaOnline', JSON.stringify({ roomId: 'ABCDE', publica: false, hora: Date.now() }))
    render(<App ruta="/" />)
    expect(screen.getByText('Tenés una partida en curso')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(screen.queryByText('Tenés una partida en curso')).toBeNull()
    expect(localStorage.getItem('truco.partidaOnline')).toBeNull()
  })
})
