import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { crearServidor } from '@truco/server/src/servidor'

// Con jsdom, el WebSocket de Node no acepta los eventos de jsdom: sin él, el SDK de Colyseus usa `ws`.
// Tiene que ser antes de que se cargue el SDK (vi.hoisted corre antes que los import).
vi.hoisted(() => Reflect.deleteProperty(globalThis, 'WebSocket'))
import { useJuego } from '../src/estado'
import { Buscar } from '../src/pantallas/Buscar'

const PUERTO = 2578
let servidor: ReturnType<typeof crearServidor>

beforeAll(async () => {
  vi.stubEnv('VITE_SERVIDOR', `ws://localhost:${PUERTO}`)
  servidor = crearServidor({
    dirDatos: mkdtempSync(join(tmpdir(), 'truco-web-buscar-')),
    // La oferta de jugar contra un bot llega enseguida.
    tiempos: { botMinMs: 0, botMaxMs: 0, pausaVueltaMs: 0, pausaManoMs: 0, ofrecerBotMs: 300 },
  })
  await servidor.listen(PUERTO)
})
afterAll(async () => {
  vi.unstubAllEnvs()
  await servidor.gracefullyShutdown(false).catch(() => {})
})
afterEach(() => {
  act(() => useJuego.getState().salir())
  cleanup()
})

describe('buscar partida', () => {
  it('si no aparece nadie, ofrece jugar contra un bot y va a la mesa', async () => {
    localStorage.setItem('truco.perfil', JSON.stringify({ invitadoId: `web-buscar-${Date.now()}`, apodo: 'Luis', avatar: '🧉' }))
    render(
      <MemoryRouter initialEntries={['/buscar']}>
        <Routes>
          <Route path="/" element={<p>INICIO</p>} />
          <Route path="/buscar" element={<Buscar />} />
          <Route path="/mesa" element={<p>MESA</p>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByText('Buscando rival…')).toBeTruthy()
    await screen.findByText('No aparece nadie todavía', {}, { timeout: 8000 })

    fireEvent.click(screen.getByRole('button', { name: 'Jugar contra un bot' }))
    await screen.findByText('MESA', {}, { timeout: 8000 })
    expect(useJuego.getState().sala!.lugares[1]!.tipo).toBe('bot')
  })

  it('se puede seguir esperando, y cancelar deja la cola y vuelve al inicio', async () => {
    localStorage.setItem('truco.perfil', JSON.stringify({ invitadoId: `web-buscar-2-${Date.now()}`, apodo: 'Luis', avatar: '🧉' }))
    render(
      <MemoryRouter initialEntries={['/buscar']}>
        <Routes>
          <Route path="/" element={<p>INICIO</p>} />
          <Route path="/buscar" element={<Buscar />} />
        </Routes>
      </MemoryRouter>,
    )
    await screen.findByText(/Esperando hace/, {}, { timeout: 8000 })
    await screen.findByText('No aparece nadie todavía', {}, { timeout: 8000 })
    fireEvent.click(screen.getByRole('button', { name: 'Seguir esperando' }))
    expect(screen.queryByText('No aparece nadie todavía')).toBeNull()
    expect(screen.getByText('Buscando rival…')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(await screen.findByText('INICIO')).toBeTruthy()
    expect(useJuego.getState().conexion).toBeNull()
  })
})
