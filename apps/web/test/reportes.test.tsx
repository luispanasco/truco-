import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { pasosDeRepeticion, type ReporteEnviado, type ReporteListado } from '@truco/shared'
import { ConexionLocal } from '../src/conexion/local'
import { useCuenta } from '../src/cuenta/cuenta'
import { useJuego } from '../src/estado'
import { Mesa } from '../src/pantallas/Mesa'
import { AdminReportes } from '../src/pantallas/AdminReportes'
import { Ajustes } from '../src/menu/Ajustes'
import { guardarPerfil, leerPerfil } from '../src/perfil'

let pedidos: { url: string; metodo: string; cuerpo: unknown; auth: string | null }[] = []
let falla = false

const LISTA: ReporteListado[] = [
  {
    id: 7,
    fecha: '2026-11-10T21:30:00Z',
    tipo: 'bot',
    descripcion: 'El bot se fue al mazo con flor',
    apodo: 'Luis',
    cuentaId: null,
    email: null,
    invitadoId: 'invitado-123456',
    ruta: '/mesa',
    version: 'abc123 (2026-11-10)',
    donde: 'Contra la compu',
    conRepeticion: true,
  },
  {
    id: 6,
    fecha: '2026-11-10T20:00:00Z',
    tipo: 'visual',
    descripcion: '',
    apodo: 'Ana',
    cuentaId: 'a',
    email: 'ana@ejemplo.com',
    invitadoId: 'invitado-654321',
    ruta: '/',
    version: null,
    donde: 'Fuera de una partida',
    conRepeticion: false,
  },
]

function servidor() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const headers = (init?.headers ?? {}) as Record<string, string>
      pedidos.push({ url, metodo: init?.method ?? 'GET', cuerpo: typeof init?.body === 'string' ? JSON.parse(init.body) : null, auth: headers.authorization ?? null })
      if (url.endsWith('/reportes') && init?.method === 'POST') {
        return falla ? Response.json({ motivo: 'Falló la base de datos' }, { status: 500 }) : Response.json({ id: 1 })
      }
      if (url.endsWith('/reportes')) return Response.json({ reportes: LISTA })
      return Response.json({ ok: true })
    }),
  )
}

function Ruta() {
  return <p data-testid="ruta">{useLocation().pathname}</p>
}

beforeEach(() => {
  // Un perfil guardado: el ID de invitado es siempre el mismo.
  guardarPerfil(leerPerfil())
  pedidos = []
  falla = false
  servidor()
})
afterEach(() => {
  act(() => useJuego.getState().salir())
  useCuenta.setState({ estado: 'afuera', token: null, cuenta: null })
  vi.unstubAllGlobals()
  cleanup()
})

const reportesMandados = () => pedidos.filter((p) => p.url.endsWith('/reportes') && p.metodo === 'POST').map((p) => p.cuerpo as ReporteEnviado)

describe('reportar un problema', () => {
  it('desde la mesa: se elige el tipo, se manda con la partida local y se sigue jugando', async () => {
    act(() =>
      useJuego.getState().conectar(new ConexionLocal({ apodo: 'Luis', avatar: '🧉', formato: '1v1', nivelBots: 'facil', demoraBots: [0, 0], semilla: 21 })),
    )
    render(
      <MemoryRouter initialEntries={['/mesa']}>
        <Routes>
          <Route path="/mesa" element={<Mesa />} />
        </Routes>
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByText('Te toca')).toBeTruthy(), { timeout: 5000 })
    // Que haya alguna jugada en la repetición: tirar una carta.
    fireEvent.click(screen.getByRole('button', { name: 'Ver todas' }))
    const jugables = screen.getAllByLabelText(/^Jugar el /).filter((b) => !(b as HTMLButtonElement).disabled)
    fireEvent.click(jugables[0]!)
    await waitFor(() => expect(useJuego.getState().vista!.mano.misCartas).toHaveLength(2), { timeout: 5000 })

    // La ✕ abre el menú; desde ahí, reportar.
    fireEvent.click(screen.getByRole('button', { name: 'Salir de la mesa' }))
    fireEvent.click(screen.getByRole('button', { name: '🐞 Reportar un problema' }))
    const hoja = screen.getByRole('dialog', { name: 'Reportar un problema' })
    const mandar = screen.getByRole('button', { name: 'Mandar' }) as HTMLButtonElement
    // Sin tipo no se manda.
    expect(mandar.disabled).toBe(true)
    fireEvent.click(screen.getByRole('radio', { name: 'Un bot hizo algo raro' }))
    expect(mandar.disabled).toBe(false)
    fireEvent.change(hoja.querySelector('textarea')!, { target: { value: 'El bot jugó raro' } })
    fireEvent.click(mandar)
    await waitFor(() => expect(screen.getByText('¡Gracias! Lo vamos a mirar.')).toBeTruthy())

    const [r] = reportesMandados()
    expect(r!.tipo).toBe('bot')
    expect(r!.descripcion).toBe('El bot jugó raro')
    expect(r!.apodo).toBe('Luis')
    expect(r!.invitadoId).toBe(leerPerfil().invitadoId)
    expect(r!.contexto.ruta).toBe('/')
    expect(typeof r!.contexto.version).toBe('string')
    expect(r!.contexto.navegador).toBeTruthy()
    expect(r!.contexto.local!.modo).toBe('compu')
    expect(r!.contexto.vista).toBeTruthy()
    expect(Array.isArray(r!.contexto.registro)).toBe(true)
    // La partida viaja entera: se vuelve a jugar con el motor y llega a la misma vista.
    const rep = r!.contexto.local!.repeticion!
    expect(rep.semilla).toBe(21)
    expect(rep.acciones.length).toBeGreaterThan(0)
    expect(rep.acciones.some((a) => a.asiento === 0 && a.accion.tipo === 'jugarCarta')).toBe(true)
    const pasos = pasosDeRepeticion(rep)
    expect(pasos.length).toBe(rep.acciones.length + 1)
    expect(pasos.at(-1)!.estado.mano.cartas[0]).toHaveLength(useJuego.getState().vista!.mano.misCartas.length)

    // Se sigue en la mesa.
    fireEvent.click(screen.getByRole('button', { name: 'Listo' }))
    expect(screen.queryByRole('dialog', { name: 'Reportar un problema' })).toBeNull()
    expect(useJuego.getState().conexion).not.toBeNull()
  })

  it('desde Ajustes, fuera de una partida; si falla, se ve el error y se reintenta', async () => {
    falla = true
    const perfil = leerPerfil()
    render(
      <MemoryRouter>
        <Ajustes perfil={perfil} cambiar={() => {}} />
      </MemoryRouter>,
    )
    // Sin ser admin no se ve el acceso a los reportes.
    expect(screen.queryByRole('button', { name: /Ver los reportes/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '🐞 Reportar un problema' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Se ve mal' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mandar' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Falló la base de datos'))
    falla = false
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(screen.getByText('¡Gracias! Lo vamos a mirar.')).toBeTruthy())
    const r = reportesMandados().at(-1)!
    expect(r.tipo).toBe('visual')
    expect(r.contexto.local).toBeUndefined()
    expect(r.contexto.online).toBeUndefined()
    expect(reportesMandados()).toHaveLength(2)
  })

  it('con tu cuenta, el reporte va con la sesión', async () => {
    useCuenta.setState({ estado: 'adentro', token: 'prueba:ana@ejemplo.com', cuenta: { id: 'a', email: 'ana@ejemplo.com', apodo: 'Ana', avatar: null, preferencias: {}, nueva: false } })
    render(
      <MemoryRouter>
        <Ajustes perfil={leerPerfil()} cambiar={() => {}} />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: '🐞 Reportar un problema' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Otro' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mandar' }))
    await waitFor(() => expect(reportesMandados()).toHaveLength(1))
    const p = pedidos.find((x) => x.metodo === 'POST')!
    expect(p.auth).toBe('Bearer prueba:ana@ejemplo.com')
    expect(reportesMandados()[0]!.apodo).toBe('Ana')
  })
})

describe('reportes del admin', () => {
  it('el admin ve el acceso en Ajustes y la lista, con "Ver la partida"', async () => {
    useCuenta.setState({
      estado: 'adentro',
      token: 'prueba:admin@ejemplo.com',
      cuenta: { id: 'x', email: 'admin@ejemplo.com', apodo: 'Admin', avatar: null, preferencias: {}, nueva: false, admin: true },
    })
    render(
      <MemoryRouter initialEntries={['/ajustes']}>
        <Routes>
          <Route path="/ajustes" element={<Ajustes perfil={leerPerfil()} cambiar={() => {}} />} />
          <Route path="/admin/reportes" element={<AdminReportes />} />
          <Route path="*" element={<Ruta />} />
        </Routes>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: /Ver los reportes/ }))
    await waitFor(() => expect(screen.getByText('El bot se fue al mazo con flor')).toBeTruthy())
    expect(screen.getByText('Un bot hizo algo raro')).toBeTruthy()
    expect(screen.getByText('Se ve mal')).toBeTruthy()
    expect(screen.getByText(/ana@ejemplo\.com/)).toBeTruthy()
    expect(screen.getByText(/Contra la compu/)).toBeTruthy()
    // Solo el que trae la partida tiene el botón.
    const ver = screen.getAllByRole('button', { name: 'Ver la partida' })
    expect(ver).toHaveLength(1)
    expect(pedidos.find((p) => p.url.endsWith('/reportes'))!.auth).toBe('Bearer prueba:admin@ejemplo.com')
    fireEvent.click(ver[0]!)
    expect(screen.getByTestId('ruta').textContent).toBe('/admin/reportes/7/partida')
  })

  it('sin ser admin, la pantalla no muestra nada', () => {
    useCuenta.setState({ estado: 'adentro', token: 'prueba:ana@ejemplo.com', cuenta: { id: 'a', email: 'ana@ejemplo.com', apodo: 'Ana', avatar: null, preferencias: {}, nueva: false } })
    render(
      <MemoryRouter>
        <AdminReportes />
      </MemoryRouter>,
    )
    expect(screen.getByText('Esta pantalla es solo para el admin.')).toBeTruthy()
    expect(pedidos.some((p) => p.url.endsWith('/reportes'))).toBe(false)
  })
})
