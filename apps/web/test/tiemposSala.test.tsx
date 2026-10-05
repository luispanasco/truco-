import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { crearConfig } from '@truco/engine'
import { SENIAS_DEFAULT, type InfoSala, type MensajesCliente, type OpcionesCrearSala } from '@truco/shared'
import { AnilloReloj, RelojPropio } from '../src/componentes/Reloj'
import { ConexionOnline } from '../src/conexion/online'
import type { Conexion, MensajeServidor } from '../src/conexion/tipos'
import { useJuego } from '../src/estado'
import { leerPerfil } from '../src/perfil'
import { Crear } from '../src/pantallas/Crear'
import { Sala } from '../src/pantallas/Sala'

beforeEach(() => localStorage.clear())
afterEach(() => {
  act(() => useJuego.getState().salir())
  vi.restoreAllMocks()
  vi.useRealTimers()
  cleanup()
})

function enRuta(ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/" element={<p>INICIO</p>} />
        <Route path="/crear" element={<Crear />} />
        <Route path="/sala" element={<Sala />} />
        <Route path="/mesa" element={<p>MESA</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

const grupo = (nombre: string) => screen.getByRole('radiogroup', { name: nombre })

describe('tiempos en la creación de la sala', () => {
  it('se eligen en el formulario, se mandan al servidor y quedan para la próxima', async () => {
    localStorage.setItem('truco.perfil', JSON.stringify({ invitadoId: 'web-tiempos-1', apodo: 'Ana', avatar: '🦉' }))
    let mandado: OpcionesCrearSala | null = null
    vi.spyOn(ConexionOnline, 'crearSala').mockImplementation(async (op) => {
      mandado = op
      throw new Error('sin servidor en esta prueba')
    })
    const { unmount } = enRuta('/crear')
    expect(screen.getByRole('heading', { name: 'Tiempos' })).toBeTruthy()
    // Por defecto: 30 s por jugada y 60 s para la primera del mano.
    expect(within(grupo('Tiempo por jugada')).getByRole('radio', { name: '30 s' }).getAttribute('aria-checked')).toBe('true')
    expect(within(grupo('Primera jugada del mano')).getByRole('radio', { name: '60 s' }).getAttribute('aria-checked')).toBe('true')
    expect(within(grupo('Tiempo por jugada')).getAllByRole('radio').map((b) => b.textContent)).toEqual(['20 s', '30 s', '45 s', '60 s'])
    expect(within(grupo('Primera jugada del mano')).getAllByRole('radio').map((b) => b.textContent)).toEqual([
      '45 s',
      '60 s',
      '90 s',
      '120 s',
    ])

    fireEvent.click(within(grupo('Tiempo por jugada')).getByRole('radio', { name: '45 s' }))
    fireEvent.click(within(grupo('Primera jugada del mano')).getByRole('radio', { name: '120 s' }))
    fireEvent.click(screen.getByRole('button', { name: 'Crear sala' }))
    await waitFor(() => expect(mandado).not.toBeNull())
    expect(mandado!.tiempos).toEqual({ turnoS: 45, primeraJugadaS: 120 })

    // Queda en el perfil y la próxima sala la propone igual.
    expect(leerPerfil().tiempos).toEqual({ turnoS: 45, primeraJugadaS: 120 })
    unmount()
    enRuta('/crear')
    expect(within(grupo('Tiempo por jugada')).getByRole('radio', { name: '45 s' }).getAttribute('aria-checked')).toBe('true')
    expect(within(grupo('Primera jugada del mano')).getByRole('radio', { name: '120 s' }).getAttribute('aria-checked')).toBe('true')
  })
})

/** Una conexión de mentira: guarda lo que se manda y deja hacer llegar mensajes. */
function conexionFalsa() {
  const enviados: { tipo: keyof MensajesCliente; datos: unknown }[] = []
  let oyente: ((m: MensajeServidor) => void) | null = null
  const conexion: Conexion = {
    tipo: 'online',
    enviar: (tipo, datos) => void enviados.push({ tipo, datos }),
    escuchar: (o) => {
      oyente = o
      return () => (oyente = null)
    },
    salir: () => {},
  }
  return { conexion, enviados, llegar: (m: MensajeServidor) => act(() => oyente?.(m)) }
}

function salaDeEspera(tiempos: InfoSala['tiempos']): InfoSala {
  return {
    codigo: 'TIEMP',
    publica: false,
    fase: 'esperando',
    formato: '1v1',
    config: crearConfig({ formato: '1v1' }),
    botsEnVacios: true,
    nivelBots: 'medio',
    ayudas: true,
    senias: SENIAS_DEFAULT,
    tiempos,
    cartasJugadas: 'quedan',
    chatEquipo: false,
    lugares: [
      { asiento: 0, tipo: 'humano', apodo: 'Ana', avatar: null, conectado: true, anfitrion: true },
      { asiento: 1, tipo: 'libre', apodo: '', avatar: null, conectado: false, anfitrion: false },
    ],
    yo: 0,
    revancha: [],
  }
}

describe('tiempos en la sala de espera', () => {
  it('el resumen los muestra y el anfitrión los cambia', () => {
    const { conexion, enviados, llegar } = conexionFalsa()
    act(() => useJuego.getState().conectar(conexion))
    llegar({ tipo: 'sala', datos: salaDeEspera({ turnoS: 20, primeraJugadaS: 90 }) })
    enRuta('/sala')
    expect(screen.getByText('20 s por jugada; la primera del mano, 90 s')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar' }))
    expect(within(grupo('Tiempo por jugada')).getByRole('radio', { name: '20 s' }).getAttribute('aria-checked')).toBe('true')
    fireEvent.click(within(grupo('Primera jugada del mano')).getByRole('radio', { name: '60 s' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    const configurar = enviados.find((m) => m.tipo === 'configurar')!.datos as MensajesCliente['configurar']
    expect(configurar.tiempos).toEqual({ turnoS: 20, primeraJugadaS: 60 })
  })

  it('si la sala trae un valor que no está entre las opciones, igual aparece elegido', () => {
    const { conexion, llegar } = conexionFalsa()
    act(() => useJuego.getState().conectar(conexion))
    llegar({ tipo: 'sala', datos: salaDeEspera({ turnoS: 15, primeraJugadaS: 180 }) })
    enRuta('/sala')
    expect(screen.getByText('15 s por jugada; la primera del mano, 180 s')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar' }))
    expect(within(grupo('Tiempo por jugada')).getByRole('radio', { name: '15 s' }).getAttribute('aria-checked')).toBe('true')
    expect(within(grupo('Primera jugada del mano')).getByRole('radio', { name: '180 s' }).getAttribute('aria-checked')).toBe('true')
  })
})

describe('reloj con turnos de distinta duración', () => {
  const resto = (c: HTMLElement) => c.querySelector('.anillo-reloj-resto')!.getAttribute('stroke-dasharray')!.split(' ')[0]!

  it('con 60 s y con 120 s el anillo arranca lleno y el texto cuenta bien', () => {
    vi.useFakeTimers({ now: 1_000_000 })
    const vence60 = Date.now() + 60_000
    const { container, rerender } = render(
      <div>
        <AnilloReloj venceEn={vence60} />
        <RelojPropio venceEn={vence60} />
      </div>,
    )
    expect(screen.getByRole('timer').textContent).toBe('Te quedan 60 s')
    expect(Number(resto(container))).toBe(100)

    act(() => vi.advanceTimersByTime(30_000))
    expect(screen.getByRole('timer').textContent).toBe('Te quedan 30 s')
    expect(Number(resto(container))).toBeCloseTo(50, 0)
    expect(screen.getByRole('timer').className).not.toContain('apurado')

    act(() => vi.advanceTimersByTime(21_000))
    expect(screen.getByRole('timer').textContent).toBe('Te quedan 9 s')
    expect(screen.getByRole('timer').className).toContain('apurado')

    // Llega otro turno, más largo: el anillo vuelve a estar lleno y se mide contra 120 s.
    const vence120 = Date.now() + 120_000
    rerender(
      <div>
        <AnilloReloj venceEn={vence120} />
        <RelojPropio venceEn={vence120} />
      </div>,
    )
    act(() => vi.advanceTimersByTime(250))
    expect(screen.getByRole('timer').textContent).toBe('Te quedan 120 s')
    expect(Number(resto(container))).toBeGreaterThan(99)
    act(() => vi.advanceTimersByTime(90_000))
    expect(screen.getByRole('timer').textContent).toBe('Te quedan 30 s')
    expect(Number(resto(container))).toBeCloseTo(25, 0)
  })
})
