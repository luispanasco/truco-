import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { crearConfig } from '@truco/engine'
import { SENIAS_DEFAULT, TIEMPOS_SALA_DEFAULT, type CartasJugadas, type InfoSala, type MensajesCliente, type OpcionesCrearSala } from '@truco/shared'
import { ConexionLocal } from '../src/conexion/local'
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

const grupo = () => screen.getByRole('radiogroup', { name: 'Cartas jugadas' })
const elegida = () => within(grupo()).getAllByRole('radio').find((b) => b.getAttribute('aria-checked') === 'true')?.textContent

describe('cartas jugadas al crear la sala', () => {
  it('por defecto quedan; se elige que se levanten, se manda al servidor y queda para la próxima', async () => {
    localStorage.setItem('truco.perfil', JSON.stringify({ invitadoId: 'web-cartas-1', apodo: 'Ana' }))
    let mandado: OpcionesCrearSala | null = null
    vi.spyOn(ConexionOnline, 'crearSala').mockImplementation(async (op) => {
      mandado = op
      throw new Error('sin servidor en esta prueba')
    })
    const { unmount } = enRuta('/crear')
    expect(elegida()).toBe('Quedan en la mesa')
    fireEvent.click(within(grupo()).getByRole('radio', { name: 'Se levantan en cada vuelta' }))
    fireEvent.click(screen.getByRole('button', { name: 'Crear sala' }))
    await waitFor(() => expect(mandado).not.toBeNull())
    expect(mandado!.cartasJugadas).toBe('seLevantan')

    expect(leerPerfil().cartasJugadas).toBe('seLevantan')
    unmount()
    enRuta('/crear')
    expect(elegida()).toBe('Se levantan en cada vuelta')
  })

  it('un valor roto en el perfil vuelve a "quedan"', () => {
    localStorage.setItem('truco.perfil', JSON.stringify({ invitadoId: 'web-cartas-2', apodo: 'Ana', cartasJugadas: 'volando' }))
    expect(leerPerfil().cartasJugadas).toBe('quedan')
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

function salaDeEspera(cartasJugadas: CartasJugadas): InfoSala {
  return {
    codigo: 'CARTA',
    publica: false,
    fase: 'esperando',
    formato: '1v1',
    config: crearConfig({ formato: '1v1' }),
    botsEnVacios: true,
    nivelBots: 'medio',
    ayudas: true,
    senias: SENIAS_DEFAULT,
    tiempos: TIEMPOS_SALA_DEFAULT,
    cartasJugadas,
    mesa: 'boliche',
    baraja: 'propia',
    chatEquipo: false,
    lugares: [
      { asiento: 0, tipo: 'humano', apodo: 'Ana', avatar: null, conectado: true, anfitrion: true },
      { asiento: 1, tipo: 'libre', apodo: '', avatar: null, conectado: false, anfitrion: false },
    ],
    yo: 0,
    revancha: [],
  }
}

describe('cartas jugadas en la sala de espera', () => {
  it('el resumen la muestra y el anfitrión la cambia', () => {
    const { conexion, enviados, llegar } = conexionFalsa()
    act(() => useJuego.getState().conectar(conexion))
    llegar({ tipo: 'sala', datos: salaDeEspera('seLevantan') })
    enRuta('/sala')
    expect(screen.getByText('Las cartas se levantan en cada vuelta')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Cambiar' }))
    expect(elegida()).toBe('Se levantan en cada vuelta')
    fireEvent.click(within(grupo()).getByRole('radio', { name: 'Quedan en la mesa' }))
    fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
    const configurar = enviados.find((m) => m.tipo === 'configurar')!.datos as MensajesCliente['configurar']
    expect(configurar.cartasJugadas).toBe('quedan')
  })
})

describe('cartas jugadas contra la compu', () => {
  it('la conexión local manda la opción en la sala', async () => {
    const salaDe = (cartasJugadas?: CartasJugadas) =>
      new Promise<InfoSala>((resolve) => {
        const c = new ConexionLocal({ apodo: 'Ana', avatar: null, formato: '1v1', nivelBots: 'medio', demoraBots: [0, 0], semilla: 1, cartasJugadas })
        c.escuchar((m) => {
          if (m.tipo !== 'sala') return
          c.salir()
          resolve(m.datos)
        })
      })
    expect((await salaDe()).cartasJugadas).toBe('quedan')
    expect((await salaDe('seLevantan')).cartasJugadas).toBe('seLevantan')
  })
})
