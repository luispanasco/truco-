import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import type { EstadoMisiones } from '@truco/shared'
import { useCuenta } from '../src/cuenta/cuenta'
import { useMisiones } from '../src/cuenta/misiones'
import { ParaHacer } from '../src/menu/ParaHacer'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  useMisiones.setState({ estado: null })
  useCuenta.setState({ estado: 'afuera', token: null, cuenta: null, saldo: null })
})

const estado = (cobradaLaDelDia = false): EstadoMisiones => ({
  deUnaVez: [
    { id: 'un-amigo', texto: 'Sumá un amigo', meta: 1, premio: 100, ir: 'amigos', avance: 0, cobrada: false },
    { id: 'rocha-1', texto: 'Ganá el nivel 1 de Rocha en el modo historia', meta: 1, premio: 100, ir: 'historia', avance: 1, cobrada: false },
    { id: 'un-grupo', texto: 'Entrá a un grupo (o armá el tuyo)', meta: 1, premio: 100, ir: 'grupos', avance: 0, cobrada: false },
  ],
  delDia: [
    { id: 'dos-online', texto: 'Jugá 2 partidas online', meta: 2, premio: 50, ir: 'jugar', avance: 1, cobrada: false },
    { id: 'ganar-online', texto: 'Ganá una partida online', meta: 1, premio: 75, ir: 'jugar', avance: 1, cobrada: cobradaLaDelDia },
  ],
  cambian: new Date(Date.now() + 5 * 3_600_000).toISOString(),
})

function servidor() {
  const pedidos: { ruta: string; cuerpo: unknown }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const ruta = new URL(url, 'http://x').pathname.replace(/^.*\/api/, '')
      pedidos.push({ ruta, cuerpo: init?.body ? JSON.parse(String(init.body)) : null })
      const datos = ruta === '/misiones/cobrar' ? { misiones: estado(true), saldo: 175, premio: 75 } : estado()
      return new Response(JSON.stringify(datos), { status: 200, headers: { 'content-type': 'application/json' } })
    }),
  )
  return pedidos
}

describe('Para hacer', () => {
  it('sin cuenta, invita a entrar', () => {
    const alEntrar = vi.fn()
    render(<ParaHacer alIr={vi.fn()} alEntrar={alEntrar} />)
    fireEvent.click(screen.getByRole('button', { name: 'Entrar a tu cuenta' }))
    expect(alEntrar).toHaveBeenCalled()
  })

  it('muestra los primeros pasos (las cumplidas primero, dos a la vista) y las del día; cobra y lleva a donde se hace', async () => {
    const pedidos = servidor()
    useCuenta.setState({ estado: 'adentro', token: 'prueba:ana@ejemplo.com', saldo: 100 })
    const alIr = vi.fn()
    render(<ParaHacer alIr={alIr} alEntrar={vi.fn()} />)
    const lista = await screen.findByRole('region', { name: 'Para hacer' })
    // De las de una vez, dos: primero la cumplida.
    const filas = within(lista).getAllByRole('listitem')
    expect(filas[0]!.textContent).toContain('Ganá el nivel 1 de Rocha')
    expect(filas[1]!.textContent).toContain('Sumá un amigo')
    expect(within(lista).queryByText(/Entrá a un grupo/)).toBeNull()
    expect(within(lista).getByText(/cambian en 5 h/)).toBeTruthy()

    fireEvent.click(within(lista).getByRole('button', { name: 'Ir: Sumá un amigo' }))
    expect(alIr).toHaveBeenCalledWith('amigos')

    fireEvent.click(within(lista).getByRole('button', { name: 'Cobrar 75 monedas: Ganá una partida online' }))
    await waitFor(() => expect(useCuenta.getState().saldo).toBe(175))
    expect(pedidos.at(-1)).toEqual({ ruta: '/misiones/cobrar', cuerpo: { id: 'ganar-online' } })
    expect(await within(lista).findByText('¡+75 monedas!')).toBeTruthy()
    expect(within(lista).getByLabelText('Cobrada')).toBeTruthy()
  })
})
