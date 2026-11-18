import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { useCuenta } from '../src/cuenta/cuenta'
import { useAvisoReportes } from '../src/componentes/AvisoReportes'
import { AvisoNovedades } from '../src/componentes/Novedades'
import { Ajustes } from '../src/menu/Ajustes'
import {
  CLAVE_NOVEDADES,
  compararVersiones,
  NOVEDADES,
  novedadesAutomaticas,
  novedadesDesde,
  novedadesPorVer,
  VERSION_ACTUAL,
  type Novedad,
} from '../src/novedades'
import { guardarPerfil, leerPerfil } from '../src/perfil'

beforeEach(() => {
  localStorage.clear()
  novedadesAutomaticas(true)
  useCuenta.setState({ estado: 'afuera', token: null, cuenta: null })
  useAvisoReportes.setState({ terminado: true })
})
afterEach(() => {
  novedadesAutomaticas(false)
  cleanup()
  localStorage.clear()
})

/** Alguien que ya usaba la app (tiene apodo): no es nuevo. */
const yaJugaba = () => guardarPerfil({ ...leerPerfil(), apodo: 'Pepe' })

describe('la lista de novedades', () => {
  it('de la más nueva a la más vieja, con fecha válida y algún cambio; la primera es la versión de la app', () => {
    expect(VERSION_ACTUAL).toBe(NOVEDADES[0]!.version)
    NOVEDADES.forEach((n, i) => {
      expect(n.version).toMatch(/^\d+\.\d+$/)
      expect(n.fecha).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(Number.isNaN(new Date(n.fecha).getTime())).toBe(false)
      expect(n.titulo.trim()).not.toBe('')
      expect(n.cambios.length).toBeGreaterThan(0)
      const siguiente = NOVEDADES[i + 1]
      if (siguiente) {
        expect(compararVersiones(n.version, siguiente.version)).toBeGreaterThan(0)
        expect(n.fecha >= siguiente.fecha).toBe(true)
      }
    })
  })

  it('las versiones se comparan como números', () => {
    expect(compararVersiones('1.10', '1.9')).toBeGreaterThan(0)
    expect(compararVersiones('2.0', '1.12')).toBeGreaterThan(0)
    expect(compararVersiones('1.0', '1.0')).toBe(0)
    const lista: Novedad[] = ['1.3', '1.2', '1.1', '1.0'].map((version) => ({ version, fecha: '2026-11-18', titulo: 'x', cambios: [] }))
    expect(novedadesDesde('1.1', lista).map((n) => n.version)).toEqual(['1.3', '1.2'])
    expect(novedadesDesde('1.3', lista)).toEqual([])
  })

  it('a quien es nuevo no le sale nada (queda anotada la versión); a quien ya jugaba, la última', () => {
    expect(novedadesPorVer(true)).toEqual([])
    expect(localStorage.getItem(CLAVE_NOVEDADES)).toBe(VERSION_ACTUAL)
    expect(novedadesPorVer(false)).toEqual([])

    localStorage.clear()
    expect(novedadesPorVer(false)).toEqual([NOVEDADES[0]])
    // Vista una versión vieja: lo que salió después.
    localStorage.setItem(CLAVE_NOVEDADES, '0.9')
    expect(novedadesPorVer(true).map((n) => n.version)).toEqual(NOVEDADES.filter((n) => compararVersiones(n.version, '0.9') > 0).slice(0, 3).map((n) => n.version))
  })
})

describe('al abrir la app', () => {
  it('sale una vez la versión que no viste y, con "¡Dale!", no vuelve', () => {
    yaJugaba()
    render(<AvisoNovedades />)
    const hoja = screen.getByRole('dialog', { name: '¡Novedades!' })
    expect(within(hoja).getByText(`Versión ${VERSION_ACTUAL}`)).toBeTruthy()
    expect(within(hoja).getByText(NOVEDADES[0]!.titulo)).toBeTruthy()
    expect(within(hoja).getByText(NOVEDADES[0]!.cambios[0]!.texto)).toBeTruthy()
    fireEvent.click(within(hoja).getByRole('button', { name: '¡Dale!' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(localStorage.getItem(CLAVE_NOVEDADES)).toBe(VERSION_ACTUAL)
    cleanup()
    render(<AvisoNovedades />)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('a quien abre la app por primera vez no le sale', () => {
    render(<AvisoNovedades />)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(localStorage.getItem(CLAVE_NOVEDADES)).toBe(VERSION_ACTUAL)
  })

  it('con la cuenta abierta no es nuevo, aunque en este celular no haya nada', () => {
    useCuenta.setState({ estado: 'adentro', token: 't', cuenta: { id: 'a', email: 'a@ejemplo.com', apodo: 'Ana', avatar: null, preferencias: {}, nueva: false } })
    render(<AvisoNovedades />)
    expect(screen.getByRole('dialog', { name: '¡Novedades!' })).toBeTruthy()
  })

  it('espera a que termine el aviso de reportes y a saber si tenés cuenta', () => {
    yaJugaba()
    useAvisoReportes.setState({ terminado: false })
    useCuenta.setState({ estado: 'cargando' })
    render(<AvisoNovedades />)
    expect(screen.queryByRole('dialog')).toBeNull()
    act(() => useCuenta.setState({ estado: 'afuera' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    act(() => useAvisoReportes.setState({ terminado: true }))
    expect(screen.getByRole('dialog', { name: '¡Novedades!' })).toBeTruthy()
  })
})

describe('en Ajustes', () => {
  it('la versión y todas las novedades; abrirlas cuenta como vistas', () => {
    render(
      <MemoryRouter>
        <Ajustes perfil={leerPerfil()} cambiar={() => {}} />
      </MemoryRouter>,
    )
    expect(screen.getAllByText(new RegExp(`Versión ${VERSION_ACTUAL.replace('.', '\\.')} · `)).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: 'Ver las novedades' }))
    const hoja = screen.getByRole('dialog', { name: 'Novedades' })
    expect(within(hoja).getAllByRole('region').length).toBe(NOVEDADES.length)
    expect(localStorage.getItem(CLAVE_NOVEDADES)).toBe(VERSION_ACTUAL)
    fireEvent.click(within(hoja).getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog', { name: 'Novedades' })).toBeNull()
  })
})
