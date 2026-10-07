import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { crearConfig } from '@truco/engine'
import {
  AVATAR_BASE,
  BARAJAS as CATALOGO_BARAJAS,
  CATALOGO_AVATAR,
  SENIAS_DEFAULT,
  codificarAvatar,
  leerAvatar,
  normalizarBaraja,
  type InfoSala,
  type MensajesCliente,
} from '@truco/shared'
import { useBaraja } from '../src/baraja'
import { datosUnirse } from '../src/componentes/Online'
import { EditorAvatar } from '../src/componentes/EditorAvatar'
import type { Conexion, MensajeServidor } from '../src/conexion/tipos'
import { useJuego } from '../src/estado'
import { leerPerfil } from '../src/perfil'
import { Inicio } from '../src/pantallas/Inicio'
import { Sala, textoMesaYBaraja } from '../src/pantallas/Sala'

beforeEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.mesa
  useBaraja.setState({ baraja: 'propia' })
})
afterEach(() => {
  act(() => useJuego.getState().salir())
  cleanup()
})

const guardar = (perfil: object) => localStorage.setItem('truco.perfil', JSON.stringify({ invitadoId: 'web-tienda', apodo: 'Beto', ...perfil }))
const sombreroPago = CATALOGO_AVATAR.sombrero.findIndex((p) => p.precio > 0)
const avatarPago = codificarAvatar({ ...AVATAR_BASE, sombrero: sombreroPago })

function inicio() {
  return render(
    <MemoryRouter>
      <Inicio />
    </MemoryRouter>,
  )
}

const interruptorTienda = () => screen.getByRole('switch', { name: /Desbloquear la tienda/ })
const mesas = () => screen.getByRole('radiogroup', { name: 'Mesa' })

describe('barajas en el catálogo', () => {
  it('todas son gratis y lo que no existe vuelve a la propia', () => {
    expect(CATALOGO_BARAJAS.map((b) => [b.id, b.precio])).toEqual([
      ['propia', 0],
      ['fournier1878', 0],
      ['cid1888', 0],
      ['grimaud1860', 0],
    ])
    expect(normalizarBaraja('fournier1878')).toBe('fournier1878')
    expect(normalizarBaraja('tarot')).toBe('propia')
  })
})

describe('desbloquear la tienda (prueba)', () => {
  it('apagado por defecto: lo pago de un perfil guardado vuelve a lo gratis', () => {
    guardar({ mesa: 'bordo', avatar: avatarPago })
    const p = leerPerfil()
    expect(p.tiendaDesbloqueada).toBe(false)
    expect(p.mesa).toBe('boliche')
    expect(leerAvatar(p.avatar)!.sombrero).toBe(AVATAR_BASE.sombrero)
  })

  it('prendido, el perfil guarda lo pago', () => {
    guardar({ tiendaDesbloqueada: true, mesa: 'bordo', avatar: avatarPago })
    const p = leerPerfil()
    expect(p.mesa).toBe('bordo')
    expect(p.avatar).toBe(avatarPago)
  })

  it('el interruptor desbloquea el selector de mesas y al apagarlo vuelve lo gratis', () => {
    guardar({})
    inicio()
    expect((interruptorTienda() as HTMLInputElement).checked).toBe(false)
    // Con la tienda cerrada, Bordó no se elige.
    fireEvent.click(within(mesas()).getByRole('radio', { name: /Bordó/ }))
    expect(leerPerfil().mesa).toBe('boliche')

    fireEvent.click(interruptorTienda())
    expect(leerPerfil().tiendaDesbloqueada).toBe(true)
    const bordo = within(mesas()).getByRole('radio', { name: 'Bordó' })
    expect(bordo.getAttribute('aria-disabled')).toBeNull()
    expect(bordo.querySelector('.pieza-abierta')).toBeTruthy()
    fireEvent.click(bordo)
    expect(leerPerfil().mesa).toBe('bordo')
    expect(document.documentElement.dataset.mesa).toBe('bordo')

    // Apagado: la mesa paga vuelve a boliche, en el perfil y en la pantalla.
    fireEvent.click(interruptorTienda())
    expect(leerPerfil().tiendaDesbloqueada).toBe(false)
    expect(leerPerfil().mesa).toBe('boliche')
    expect(document.documentElement.dataset.mesa).toBe('boliche')
    expect(within(mesas()).getByRole('radio', { name: /Bordó: 400 monedas/ }).getAttribute('aria-disabled')).toBe('true')
  })

  it('al apagarlo, las piezas pagas del avatar vuelven a las gratis', () => {
    guardar({ tiendaDesbloqueada: true, avatar: avatarPago })
    inicio()
    fireEvent.click(interruptorTienda())
    expect(leerAvatar(leerPerfil().avatar)!.sombrero).toBe(AVATAR_BASE.sombrero)
  })

  it('el editor de avatar deja elegir las piezas pagas', () => {
    const elegidos: string[] = []
    const base = codificarAvatar(AVATAR_BASE)
    const { unmount } = render(<EditorAvatar codigo={base} apodo="Ana" alCambiar={(c) => elegidos.push(c)} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Sombrero' }))
    const nombre = CATALOGO_AVATAR.sombrero[sombreroPago]!.nombre
    fireEvent.click(screen.getByRole('radio', { name: new RegExp(`^${nombre}: \\d+ monedas`) }))
    expect(elegidos).toEqual([])
    unmount()

    render(<EditorAvatar codigo={base} apodo="Ana" alCambiar={(c) => elegidos.push(c)} tiendaDesbloqueada />)
    fireEvent.click(screen.getByRole('tab', { name: 'Sombrero' }))
    const pieza = screen.getByRole('radio', { name: nombre })
    expect(pieza.getAttribute('aria-disabled')).toBeNull()
    fireEvent.click(pieza)
    expect(elegidos).toEqual([avatarPago])
  })

  it('al entrar a una sala se avisa al servidor y viajan la mesa y la baraja', () => {
    guardar({ tiendaDesbloqueada: true, mesa: 'bordo', baraja: 'fournier1878' })
    expect(datosUnirse(leerPerfil())).toMatchObject({ tiendaDesbloqueada: true, mesa: 'bordo', baraja: 'fournier1878' })
    guardar({ mesa: 'azul' })
    const datos = datosUnirse(leerPerfil())
    expect(datos.tiendaDesbloqueada).toBeUndefined()
    expect(datos).toMatchObject({ mesa: 'azul', baraja: 'propia' })
  })
})

/** Una conexión online de mentira: guarda lo que se manda y deja hacer llegar mensajes. */
function conexionFalsa(tipo: Conexion['tipo'] = 'online') {
  const enviados: { tipo: keyof MensajesCliente; datos: unknown }[] = []
  let oyente: ((m: MensajeServidor) => void) | null = null
  const conexion: Conexion = {
    tipo,
    enviar: (t, datos) => void enviados.push({ tipo: t, datos }),
    escuchar: (o) => {
      oyente = o
      return () => (oyente = null)
    },
    salir: () => {},
  }
  return { conexion, enviados, llegar: (m: MensajeServidor) => act(() => oyente?.(m)) }
}

function salaDeAna(mesa: InfoSala['mesa'], baraja: InfoSala['baraja'], yo = 1): InfoSala {
  return {
    codigo: 'ANFIT',
    publica: false,
    fase: 'esperando',
    formato: '1v1',
    config: crearConfig({ formato: '1v1' }),
    botsEnVacios: true,
    nivelBots: 'medio',
    ayudas: true,
    senias: SENIAS_DEFAULT,
    tiempos: { turnoS: 30, primeraJugadaS: 60 },
    cartasJugadas: 'quedan',
    mesa,
    baraja,
    chatEquipo: false,
    lugares: [
      { asiento: 0, tipo: 'humano', apodo: 'Ana', avatar: null, conectado: true, anfitrion: true },
      { asiento: 1, tipo: 'humano', apodo: 'Beto', avatar: null, conectado: true, anfitrion: false },
    ],
    yo,
    revancha: [],
  }
}

function enSala() {
  return render(
    <MemoryRouter initialEntries={['/sala']}>
      <Routes>
        <Route path="/" element={<p>INICIO</p>} />
        <Route path="/sala" element={<Sala />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('la mesa y la baraja del anfitrión', () => {
  it('en la sala se aplican las del anfitrión y al salir vuelven las tuyas', () => {
    guardar({ mesa: 'azul', baraja: 'propia' })
    const { conexion, llegar } = conexionFalsa()
    act(() => useJuego.getState().conectar(conexion))
    llegar({ tipo: 'sala', datos: salaDeAna('bordo', 'fournier1878') })
    expect(document.documentElement.dataset.mesa).toBe('bordo')
    expect(useBaraja.getState().baraja).toBe('fournier1878')
    enSala()
    expect(screen.getByText('Mesa Bordó · Baraja clásica, de Ana')).toBeTruthy()
    // Beto no es el anfitrión: no las puede cambiar.
    expect(screen.queryByRole('button', { name: 'Cambiar la mesa y la baraja' })).toBeNull()

    // Si el anfitrión las cambia, se actualizan.
    llegar({ tipo: 'sala', datos: salaDeAna('boliche', 'propia') })
    expect(document.documentElement.dataset.mesa).toBe('boliche')
    expect(useBaraja.getState().baraja).toBe('propia')

    act(() => useJuego.getState().salir())
    expect(document.documentElement.dataset.mesa).toBe('azul')
    expect(useBaraja.getState().baraja).toBe('propia')
  })

  it('contra la compu no se toca: quedan las tuyas', () => {
    guardar({ mesa: 'azul' })
    document.documentElement.dataset.mesa = 'azul'
    const { conexion, llegar } = conexionFalsa('local')
    act(() => useJuego.getState().conectar(conexion))
    llegar({ tipo: 'sala', datos: { ...salaDeAna('bordo', 'fournier1878'), fase: 'jugando' } })
    expect(document.documentElement.dataset.mesa).toBe('azul')
    expect(useBaraja.getState().baraja).toBe('propia')
  })

  it('el anfitrión las ve como suyas y las cambia desde la espera', () => {
    guardar({ apodo: 'Ana', mesa: 'boliche' })
    const { conexion, enviados, llegar } = conexionFalsa()
    act(() => useJuego.getState().conectar(conexion))
    llegar({ tipo: 'sala', datos: salaDeAna('boliche', 'propia', 0) })
    enSala()
    expect(screen.getByText('Mesa Boliche · Baraja propia, las tuyas')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar la mesa y la baraja' }))
    fireEvent.click(within(mesas()).getByRole('radio', { name: 'Azul' }))
    expect(enviados.at(-1)).toEqual({ tipo: 'mesaYBaraja', datos: { mesa: 'azul', baraja: 'propia' } })
    expect(leerPerfil().mesa).toBe('azul')
  })

  it('el texto de la línea', () => {
    expect(textoMesaYBaraja(salaDeAna('celeste', 'propia'))).toBe('Mesa Celeste · Baraja propia, de Ana')
  })
})
