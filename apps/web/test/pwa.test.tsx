import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { guardarBarajaSinConexion, mostrarBaraja } from '../src/baraja'
import { AvisoActualizacion, InstalarApp } from '../src/componentes/Pwa'
import { useEnLinea } from '../src/enLinea'
import { Inicio } from '../src/pantallas/Inicio'
import {
  ayudaIOSCerrada,
  esIOS,
  esSafari,
  instalar,
  mostrarAyudaIOS,
  puedeAvisarActualizacion,
  usePwa,
  type EventoInstalar,
} from '../src/pwa'

const SAFARI_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
const CHROME_IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1'
const SAFARI_IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15'
const CHROME_ANDROID =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36'

/** Simula la conexión del sistema, como la cambia el navegador (con su evento). */
function ponerConexion(enLinea: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(enLinea)
  act(() => {
    window.dispatchEvent(new Event(enLinea ? 'online' : 'offline'))
  })
}

const estadoInicial = usePwa.getState()

beforeEach(() => {
  localStorage.clear()
  usePwa.setState(estadoInicial, true)
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('useEnLinea', () => {
  it('sigue a navigator.onLine con los eventos online y offline', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
    const { result } = renderHook(() => useEnLinea())
    expect(result.current).toBe(true)
    ponerConexion(false)
    expect(result.current).toBe(false)
    ponerConexion(true)
    expect(result.current).toBe(true)
  })
})

describe('Inicio sin conexión', () => {
  const inicio = () => {
    localStorage.setItem('truco.perfil', JSON.stringify({ invitadoId: 'web-pwa', apodo: 'Luis', avatar: '🦉' }))
    localStorage.setItem('truco.partidaOnline', JSON.stringify({ roomId: 'ABCDE', publica: false, hora: Date.now() }))
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<Inicio />} />
        </Routes>
      </MemoryRouter>,
    )
  }
  const opcion = (titulo: string) => screen.getByText(titulo).closest('button') as HTMLButtonElement

  it('desactiva lo online con "Sin conexión" y deja jugar contra la compu', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    inicio()
    for (const titulo of ['Crear sala', 'Unirme con código', 'Buscar partida']) {
      expect(opcion(titulo).disabled).toBe(true)
      expect(opcion(titulo).textContent).toContain('Sin conexión')
    }
    expect((screen.getByRole('button', { name: /Volver a la partida · Sin conexión/ }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/Contra la compu se juega igual/)).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Jugar' }) as HTMLButtonElement).disabled).toBe(false)
  })

  it('al volver la conexión, lo online se puede usar de nuevo', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
    inicio()
    ponerConexion(true)
    expect(opcion('Crear sala').disabled).toBe(false)
    expect(opcion('Crear sala').textContent).not.toContain('Sin conexión')
    expect((screen.getByRole('button', { name: 'Volver a la partida' }) as HTMLButtonElement).disabled).toBe(false)
    expect(screen.queryByText(/Contra la compu se juega igual/)).toBeNull()
  })
})

describe('aviso de versión nueva', () => {
  it('solo fuera de la partida: inicio y pantallas sin sala, o la mesa con la partida terminada', () => {
    expect(puedeAvisarActualizacion('/', false)).toBe(true)
    expect(puedeAvisarActualizacion('/crear', false)).toBe(true)
    expect(puedeAvisarActualizacion('/mesa', false)).toBe(false)
    expect(puedeAvisarActualizacion('/mesa', true)).toBe(true)
    expect(puedeAvisarActualizacion('/sala', false)).toBe(false)
    expect(puedeAvisarActualizacion('/buscar', false)).toBe(false)
    expect(puedeAvisarActualizacion('/s/ABCDE', false)).toBe(false)
  })

  const aviso = (ruta: string) =>
    render(
      <MemoryRouter initialEntries={[ruta]}>
        <AvisoActualizacion />
      </MemoryRouter>,
    )

  it('no aparece si no hay versión nueva', () => {
    aviso('/')
    expect(screen.queryByText('Hay una versión nueva')).toBeNull()
  })

  it('en el inicio se ofrece, y actualiza solo al tocar', () => {
    const actualizar = vi.fn()
    usePwa.setState({ versionNueva: true, actualizar })
    aviso('/')
    expect(screen.getByText('Hay una versión nueva')).toBeTruthy()
    expect(actualizar).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }))
    expect(actualizar).toHaveBeenCalledOnce()
  })

  it('en medio de una partida no aparece', () => {
    usePwa.setState({ versionNueva: true })
    aviso('/mesa')
    expect(screen.queryByText('Hay una versión nueva')).toBeNull()
  })
})

describe('instalar', () => {
  it('reconoce Safari de iPhone y de iPad, y no Chrome de iPhone ni Android', () => {
    expect(esIOS({ userAgent: SAFARI_IPHONE })).toBe(true)
    expect(esIOS({ userAgent: SAFARI_IPAD, platform: 'MacIntel', maxTouchPoints: 5 })).toBe(true)
    expect(esIOS({ userAgent: SAFARI_IPAD, platform: 'MacIntel', maxTouchPoints: 0 })).toBe(false)
    expect(esIOS({ userAgent: CHROME_ANDROID })).toBe(false)
    expect(esSafari(SAFARI_IPHONE)).toBe(true)
    expect(esSafari(CHROME_IPHONE)).toBe(false)
    expect(mostrarAyudaIOS({ userAgent: SAFARI_IPHONE }, false, false)).toBe(true)
    expect(mostrarAyudaIOS({ userAgent: SAFARI_IPHONE }, true, false)).toBe(false)
    expect(mostrarAyudaIOS({ userAgent: SAFARI_IPHONE }, false, true)).toBe(false)
    expect(mostrarAyudaIOS({ userAgent: CHROME_IPHONE }, false, false)).toBe(false)
  })

  it('con el pedido del navegador, el botón abre su diálogo una sola vez', async () => {
    const evento = Object.assign(new Event('beforeinstallprompt'), {
      prompt: vi.fn(async () => {}),
      userChoice: Promise.resolve({ outcome: 'accepted' as const }),
    }) as EventoInstalar
    usePwa.setState({ eventoInstalar: evento })
    render(<InstalarApp />)
    fireEvent.click(screen.getByRole('button', { name: /Instalar la app/ }))
    expect(evento.prompt).toHaveBeenCalledOnce()
    expect(screen.queryByRole('button', { name: /Instalar la app/ })).toBeNull()
    await instalar()
    expect(evento.prompt).toHaveBeenCalledOnce()
  })

  it('en Safari de iPhone explica cómo agregarla, y al cerrarlo no vuelve', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(SAFARI_IPHONE)
    render(<InstalarApp />)
    expect(screen.getByText(/Agregar a inicio/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByText(/Agregar a inicio/)).toBeNull()
    expect(ayudaIOSCerrada()).toBe(true)
    cleanup()
    render(<InstalarApp />)
    expect(screen.queryByText(/Agregar a inicio/)).toBeNull()
  })

  it('en otros navegadores, sin pedido de instalación, no muestra nada', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(CHROME_ANDROID)
    const { container } = render(<InstalarApp />)
    expect(container.innerHTML).toBe('')
  })
})

describe('baraja clásica sin conexión', () => {
  it('pide las 41 imágenes (para que el service worker las guarde), y ninguna con la propia', async () => {
    const pedir = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(''))
    act(() => mostrarBaraja('propia'))
    await guardarBarajaSinConexion()
    expect(pedir).not.toHaveBeenCalled()
    act(() => mostrarBaraja('fournier1878'))
    await guardarBarajaSinConexion()
    expect(pedir).toHaveBeenCalledTimes(41)
    expect(pedir).toHaveBeenCalledWith('/barajas/fournier-1878/dorso.webp')
    act(() => mostrarBaraja('propia'))
  })
})
