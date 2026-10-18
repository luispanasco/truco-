import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { Amigos } from '../src/pantallas/Amigos'
import { AvisoInvitacion } from '../src/componentes/Amistad'
import { useCuenta } from '../src/cuenta/cuenta'
import { useAmigos } from '../src/cuenta/amigos'

let pedidos: { url: string; cuerpo: unknown }[] = []

beforeEach(() => {
  pedidos = []
  useCuenta.setState({ estado: 'adentro', token: 'prueba:ana@ejemplo.com', cuenta: { id: 'a', email: 'ana@ejemplo.com', apodo: 'Ana', avatar: null, preferencias: {}, nueva: false } })
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      pedidos.push({ url, cuerpo: init?.body ? JSON.parse(String(init.body)) : null })
      if (url.endsWith('/amigos')) {
        return Response.json({
          codigo: 'QWE234',
          amigos: [
            { id: 'b', apodo: 'Beto', avatar: null, estado: 'enSala', sala: 'ABC23' },
            { id: 'c', apodo: 'Ceci', avatar: null, estado: 'desconectado', sala: null },
          ],
          recibidas: [{ id: 'd', apodo: 'Dani', avatar: null }],
          enviadas: [],
        })
      }
      if (url.endsWith('/amigos/agregar')) return Response.json({ motivo: 'No hay nadie con ese código' }, { status: 409 })
      if (url.endsWith('/amigos/latido')) return Response.json({ invitaciones: [] })
      return Response.json({ ok: true })
    }),
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  useAmigos.setState({ lista: null, invitaciones: [] })
})

describe('amigos', () => {
  it('muestra tu código, las solicitudes y a tus amigos con su estado', async () => {
    render(
      <MemoryRouter initialEntries={['/amigos']}>
        <Routes>
          <Route path="/amigos" element={<Amigos />} />
          <Route path="/s/:codigo" element={<p>Entrando a la sala</p>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(await screen.findByText('QWE234')).toBeTruthy()
    expect(screen.getByText('En una sala, esperando')).toBeTruthy()
    expect(screen.getByText('Desconectado')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Aceptar' }))
    await screen.findByText('QWE234')
    expect(pedidos.some((p) => p.url.endsWith('/amigos/responder') && JSON.stringify(p.cuerpo) === '{"id":"d","aceptar":true}')).toBe(true)

    fireEvent.change(screen.getByPlaceholderText('ABC234'), { target: { value: 'zzz-zzz' } })
    fireEvent.click(screen.getByRole('button', { name: 'Agregar' }))
    expect(await screen.findByText('No hay nadie con ese código')).toBeTruthy()

    // Beto está esperando en una sala: se puede unir.
    fireEvent.click(screen.getByRole('button', { name: 'Unirme' }))
    expect(await screen.findByText('Entrando a la sala')).toBeTruthy()
  })

  it('una invitación aparece en cualquier pantalla y lleva a la sala', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AvisoInvitacion />
        <Routes>
          <Route path="/" element={<p>Inicio</p>} />
          <Route path="/s/:codigo" element={<p>Entrando a la sala</p>} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.queryByRole('alertdialog')).toBeNull()
    act(() => useAmigos.setState({ invitaciones: [{ de: 'b', apodo: 'Beto', sala: 'ABC23', hora: 0 }] }))
    expect(screen.getByText(/te invita a su sala/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText('Entrando a la sala')).toBeTruthy()
    expect(useAmigos.getState().invitaciones).toEqual([])
  })
})
