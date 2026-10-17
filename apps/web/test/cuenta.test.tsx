import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { datosUnirse } from '../src/componentes/Online'
import { TarjetaCuenta } from '../src/componentes/TarjetaCuenta'
import { leerPerfil, guardarPerfil } from '../src/perfil'
import { useCuenta } from '../src/cuenta/cuenta'

/** Un servidor de cuentas falso con el login de prueba: la cuenta ya existía con otro apodo. */
function servidorFalso(nueva: boolean) {
  const pedidos: { url: string; metodo: string; cuerpo: Record<string, unknown> | null }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      pedidos.push({ url, metodo: init?.method ?? 'GET', cuerpo: init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : null })
      if (url.endsWith('/estado')) return Response.json({ cuentas: true, loginDePrueba: true })
      if (url.endsWith('/entrar')) {
        return Response.json({ id: 'c1', email: 'ana@ejemplo.com', apodo: 'Ana de la cuenta', avatar: null, preferencias: { formato: '3v3' }, nueva })
      }
      return Response.json({})
    }),
  )
  return pedidos
}

beforeEach(() => {
  localStorage.clear()
  guardarPerfil({ ...leerPerfil(), apodo: 'Ana del celu', formato: '1v1' })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('tu cuenta', () => {
  it('con el login de prueba se entra con el email, y lo de la cuenta pasa a este navegador', async () => {
    const pedidos = servidorFalso(false)
    render(<TarjetaCuenta />)
    fireEvent.change(await screen.findByPlaceholderText('vos@ejemplo.com'), { target: { value: 'ana@ejemplo.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    expect(await screen.findByText(/Entraste como/)).toBeTruthy()

    const entrar = pedidos.find((p) => p.url.endsWith('/entrar'))!
    expect(entrar.cuerpo).toMatchObject({ apodo: 'Ana del celu', preferencias: { formato: '1v1' } })
    expect(entrar.cuerpo!.preferencias).not.toHaveProperty('invitadoId')
    expect(leerPerfil()).toMatchObject({ apodo: 'Ana de la cuenta', formato: '3v3' })
    // Al entrar a una sala viaja el token de la sesión.
    expect(datosUnirse(leerPerfil()).token).toBe('prueba:ana@ejemplo.com')

    fireEvent.click(screen.getByRole('button', { name: 'Salir de la cuenta' }))
    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeTruthy()
    expect(useCuenta.getState().token).toBeNull()
  })
})
