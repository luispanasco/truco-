import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import type { DetalleGrupo, ResumenGrupo } from '@truco/shared'
import { PanelGrupos } from '../src/menu/PanelGrupos'
import { Grupo } from '../src/pantallas/Grupo'
import { useCuenta } from '../src/cuenta/cuenta'
import { useAmigos } from '../src/cuenta/amigos'
import { useGrupos } from '../src/cuenta/grupos'
import { AvisoInvitacion, InvitarGrupos } from '../src/componentes/Amistad'

let pedidos: { url: string; cuerpo: Record<string, unknown> | null }[] = []
let detalle: DetalleGrupo

const resumen = (extra: Partial<ResumenGrupo>): ResumenGrupo => ({
  id: 'g1',
  nombre: 'Los del Boliche',
  sigla: 'BOL',
  descripcion: '',
  ingreso: 'abierto',
  cupo: null,
  convocan: 'todos',
  miembros: 3,
  foto: null,
  rol: null,
  pedido: false,
  ...extra,
})

function servidor({ quedan = 8 } = {}) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      pedidos.push({ url, cuerpo: init?.body && typeof init.body === 'string' ? JSON.parse(init.body) : null })
      if (url.endsWith('/grupos')) {
        return Response.json({
          tuyos: [resumen({ rol: 'capitan' })],
          buscar: [resumen({ id: 'g2', nombre: 'La Barra', sigla: 'BAR', ingreso: 'solicitud', miembros: 2 })],
          quedan,
        })
      }
      if (url.endsWith('/grupos/detalle')) return Response.json(detalle)
      if (url.endsWith('/grupos/entrar')) return Response.json({ adentro: false })
      if (url.endsWith('/grupos/crear')) return Response.json({ id: 'g9' })
      if (url.endsWith('/grupos/convocar')) return Response.json({ invitados: 2 })
      if (url.endsWith('/grupos/codigo')) return Response.json({ motivo: 'No hay ningún grupo con ese código' }, { status: 409 })
      return Response.json({ ok: true })
    }),
  )
}

function Ruta() {
  return <p data-testid="ruta">{useLocation().pathname}</p>
}

function montar(ruta: string, alEntrar = () => {}) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/" element={<PanelGrupos alEntrar={alEntrar} />} />
        <Route path="/grupos/:id" element={<Grupo />} />
        <Route path="*" element={<Ruta />} />
      </Routes>
    </MemoryRouter>,
  )
}

const cuerpo = (fin: string) => pedidos.find((p) => p.url.endsWith(fin))?.cuerpo

beforeEach(() => {
  pedidos = []
  useCuenta.setState({ estado: 'adentro', token: 'prueba:ana@ejemplo.com', cuenta: { id: 'a', email: 'ana@ejemplo.com', apodo: 'Ana', avatar: null, preferencias: {}, nueva: false } })
  detalle = {
    ...resumen({ rol: 'lider' }),
    lista: [
      { id: 'a', apodo: 'Ana', avatar: null, rol: 'lider', desde: '2026-11-01T00:00:00Z', estado: 'conectado', sala: null },
      { id: 'b', apodo: 'Beto', avatar: null, rol: 'capitan', desde: '2026-11-02T00:00:00Z', estado: 'enSala', sala: 'ABCDE' },
      { id: 'c', apodo: 'Caro', avatar: null, rol: 'miembro', desde: '2026-11-03T00:00:00Z', estado: 'desconectado', sala: null },
    ],
    codigo: 'ABC2345',
    solicitudes: [{ id: 'd', apodo: 'Dani', avatar: null }],
  }
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  useGrupos.setState({ lista: null })
  useAmigos.setState({ lista: null, invitaciones: [] })
})

describe('grupos en el menú', () => {
  it('sin cuenta invita a entrar', () => {
    servidor()
    useCuenta.setState({ estado: 'afuera', token: null, cuenta: null })
    const alEntrar = vi.fn()
    montar('/', alEntrar)
    fireEvent.click(screen.getByRole('button', { name: 'Entrar a tu cuenta' }))
    expect(alEntrar).toHaveBeenCalled()
  })

  it('muestra tus grupos con tu rol, los que se pueden buscar, y entra o pide entrar', async () => {
    servidor()
    montar('/')
    expect(await screen.findByText('Capitán · 3 miembros')).toBeTruthy()
    expect(screen.getByText('2 miembros · con solicitud')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Pedir entrar a La Barra' }))
    expect(await screen.findByText('Listo: le pediste entrar a La Barra.')).toBeTruthy()
    expect(cuerpo('/grupos/entrar')).toEqual({ id: 'g2' })
    // Con un código que no existe, el motivo del servidor.
    fireEvent.change(screen.getByPlaceholderText('ABC2345'), { target: { value: 'zzz-2345' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('No hay ningún grupo con ese código')).toBeTruthy()
    expect(cuerpo('/grupos/codigo')).toEqual({ codigo: 'ZZZ2345' })
    // Tocando uno tuyo, se abre su pantalla.
    fireEvent.click(screen.getByRole('button', { name: /Los del Boliche/ }))
    await waitFor(() => expect(screen.getByRole('heading', { name: /Los del Boliche/, level: 2 })).toBeTruthy())
  })

  it(`con el tope alcanzado no se puede crear`, async () => {
    servidor({ quedan: 0 })
    montar('/')
    expect(await screen.findByText('Ya hay 10 grupos, el máximo de la beta.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Crear grupo' })).toHaveProperty('disabled', true)
  })

  it('crear: valida antes de mandar y lleva al grupo nuevo', async () => {
    servidor()
    montar('/')
    fireEvent.click(await screen.findByRole('button', { name: 'Crear grupo' }))
    const hoja = within(screen.getByRole('dialog', { name: 'Crear grupo' }))
    fireEvent.click(hoja.getByRole('button', { name: 'Crear grupo' }))
    expect(hoja.getByText('El nombre va de 3 a 24 letras')).toBeTruthy()
    fireEvent.change(hoja.getByPlaceholderText('Los del boliche'), { target: { value: '  Los   Pibes ' } })
    fireEvent.change(hoja.getByPlaceholderText('BOL'), { target: { value: 'pi b' } })
    fireEvent.click(hoja.getByRole('radio', { name: 'Cerrado' }))
    fireEvent.change(hoja.getByPlaceholderText('Sin cupo'), { target: { value: '12' } })
    // Por defecto arman partidas todos.
    expect(hoja.getByRole('radio', { name: 'Todos' }).getAttribute('aria-checked')).toBe('true')
    fireEvent.click(hoja.getByRole('radio', { name: 'Líder y capitanes' }))
    fireEvent.click(hoja.getByRole('button', { name: 'Crear grupo' }))
    await waitFor(() =>
      expect(cuerpo('/grupos/crear')).toEqual({ nombre: 'Los Pibes', sigla: 'PIB', descripcion: '', ingreso: 'cerrado', cupo: 12, convocan: 'capitanes' }),
    )
    await waitFor(() => expect(pedidos.some((p) => p.url.endsWith('/grupos/detalle') && p.cuerpo?.id === 'g9')).toBe(true))
  })
})

describe('pantalla de un grupo', () => {
  it('el líder ve el código, las solicitudes, la configuración y las opciones de cada uno', async () => {
    servidor()
    montar('/grupos/g1')
    expect(await screen.findByText('ABC2345')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }))
    await waitFor(() => expect(cuerpo('/grupos/responder')).toEqual({ id: 'g1', cuenta: 'd', aceptar: true }))
    expect(screen.getByText('Configuración')).toBeTruthy()
    // Con vos mismo no hay opciones.
    expect(screen.queryByRole('button', { name: 'Opciones de Ana' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Opciones de Caro' }))
    fireEvent.click(screen.getByRole('button', { name: 'Hacer capitán' }))
    await waitFor(() => expect(cuerpo('/grupos/rol')).toEqual({ id: 'g1', cuenta: 'c', rol: 'capitan' }))
    fireEvent.click(screen.getByRole('button', { name: 'Opciones de Beto' }))
    expect(screen.getByRole('button', { name: 'Sacar de capitán' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Pasarle el liderazgo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sí, pasárselo' }))
    await waitFor(() => expect(cuerpo('/grupos/liderazgo')).toEqual({ id: 'g1', cuenta: 'b' }))
  })

  it('un capitán saca miembros pero no capitanes, y no configura', async () => {
    servidor()
    detalle = { ...detalle, rol: 'capitan' }
    useCuenta.setState({ cuenta: { id: 'b', email: 'beto@ejemplo.com', apodo: 'Beto', avatar: null, preferencias: {}, nueva: false } })
    montar('/grupos/g1')
    await screen.findByText('ABC2345')
    expect(screen.queryByText('Configuración')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Opciones de Ana' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Opciones de Caro' }))
    expect(screen.queryByRole('button', { name: 'Hacer capitán' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Sacar del grupo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sí, sacarlo' }))
    await waitFor(() => expect(cuerpo('/grupos/expulsar')).toEqual({ id: 'g1', cuenta: 'c' }))
  })

  it('un miembro no ve el código ni opciones, y se puede ir', async () => {
    servidor()
    detalle = { ...detalle, rol: 'miembro', codigo: null, solicitudes: null }
    useCuenta.setState({ cuenta: { id: 'c', email: 'caro@ejemplo.com', apodo: 'Caro', avatar: null, preferencias: {}, nueva: false } })
    montar('/grupos/g1')
    await screen.findByText(/Sos miembro/)
    expect(screen.queryByText('Código de invitación')).toBeNull()
    expect(screen.queryByRole('button', { name: /^Opciones de/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Salir del grupo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sí, salir del grupo' }))
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Tus grupos' })).toBeTruthy())
    expect(cuerpo('/grupos/salir')).toEqual({ id: 'g1' })
  })

  it('jugar con el grupo: se ve quién está conectado, se une a la sala de otro y arma partida', async () => {
    servidor()
    montar('/grupos/g1')
    expect(await screen.findByText('Hay 1 conectado ahora.')).toBeTruthy()
    expect(screen.getByText('En una sala, esperando')).toBeTruthy()
    expect(screen.getByText('Desconectado')).toBeTruthy()
    fireEvent.click(within(screen.getByRole('region', { name: 'Jugar con el grupo' })).getByRole('button', { name: 'Unirme' }))
    expect(screen.getByTestId('ruta').textContent).toBe('/s/ABCDE')
  })

  it('armar partida lleva a crear la sala; con "líder y capitanes", un miembro no la arma', async () => {
    servidor()
    montar('/grupos/g1')
    fireEvent.click(await screen.findByRole('button', { name: 'Armar partida' }))
    expect(screen.getByTestId('ruta').textContent).toBe('/crear')
    cleanup()
    detalle = { ...detalle, rol: 'miembro', convocan: 'capitanes', codigo: null, solicitudes: null }
    montar('/grupos/g1')
    expect(await screen.findByText('En este grupo arman partidas el líder y los capitanes.')).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Armar partida' })).toBeNull()
  })
})

describe('llamar al grupo desde la sala', () => {
  it('desde "Armar partida" se llama solo, una vez; los grupos que no te dejan llamar no aparecen', async () => {
    servidor()
    useGrupos.setState({
      lista: {
        tuyos: [resumen({ rol: 'capitan' }), resumen({ id: 'g3', nombre: 'Los Otros', rol: 'miembro', convocan: 'capitanes' })],
        buscar: [],
        quedan: 8,
      },
    })
    render(
      <MemoryRouter initialEntries={[{ pathname: '/sala', state: { convocar: { id: 'g1', nombre: '[BOL] Los del Boliche' } } }]}>
        <InvitarGrupos />
      </MemoryRouter>,
    )
    expect(await screen.findByText('Les llegó el aviso a 2 del grupo.')).toBeTruthy()
    expect(pedidos.filter((p) => p.url.endsWith('/grupos/convocar')).map((p) => p.cuerpo)).toEqual([{ id: 'g1' }])
    expect(screen.getByRole('button', { name: 'Llamar a Los del Boliche' })).toHaveProperty('disabled', true)
    expect(screen.queryByText(/Los Otros/)).toBeNull()
  })

  it('el aviso dice qué grupo te llama', () => {
    useAmigos.setState({ invitaciones: [{ de: 'b', apodo: 'Beto', sala: 'ABCDE', grupo: '[BOL] Los del Boliche', hora: 0 }] })
    montarAviso()
    expect(screen.getByRole('alertdialog').textContent).toBe('Beto llama a [BOL] Los del Boliche a jugar en su sala.EntrarAhora no')
  })
})

function montarAviso() {
  return render(
    <MemoryRouter>
      <AvisoInvitacion />
    </MemoryRouter>,
  )
}
