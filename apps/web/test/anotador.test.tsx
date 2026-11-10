import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { crearConfig, crearPartida, esperandoA, vistaPara } from '@truco/engine'
import { SENIAS_DEFAULT, type InfoSala } from '@truco/shared'
import type { Conexion, MensajeServidor } from '../src/conexion/tipos'
import { ConexionLocal } from '../src/conexion/local'
import { DibujoAnotador, tramoDe } from '../src/componentes/Anotador'
import { Fosforos, enCuadrados } from '../src/componentes/Fosforos'
import { useJuego } from '../src/estado'
import { Mesa } from '../src/pantallas/Mesa'

function App() {
  return (
    <MemoryRouter initialEntries={['/mesa']}>
      <Routes>
        <Route path="/" element={<div>Inicio</div>} />
        <Route path="/mesa" element={<Mesa />} />
      </Routes>
    </MemoryRouter>
  )
}

afterEach(() => {
  act(() => useJuego.getState().salir())
  cleanup()
})

/** Fósforos dibujados (cada uno lleva su cabeza roja). */
const fosforos = (el: Element) => el.querySelectorAll('circle').length

describe('fósforos', () => {
  it('de a 5 por cuadrado: a 30, tres cuadrados por mitad; a 40, cuatro', () => {
    expect(enCuadrados(12, 15)).toEqual([5, 5, 2])
    expect(enCuadrados(17, 20)).toEqual([5, 5, 5, 2])
    expect(enCuadrados(0, 20)).toEqual([0, 0, 0, 0])
  })

  it('el marcador chico dibuja malas y buenas, y no se pasa del total', () => {
    const { container, rerender } = render(<Fosforos puntos={18} malas={15} />)
    expect(fosforos(container)).toBe(18)
    expect(container.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 148 22')
    rerender(<Fosforos puntos={38} malas={20} />)
    expect(fosforos(container)).toBe(38)
    rerender(<Fosforos puntos={45} malas={20} />)
    expect(fosforos(container)).toBe(40)
  })

  it('el tanteador se dice en malas y buenas', () => {
    expect(tramoDe(0, 15)).toBe('sin puntos')
    expect(tramoDe(1, 15)).toBe('1 mala')
    expect(tramoDe(15, 15)).toBe('15 malas')
    expect(tramoDe(16, 15)).toBe('1 buena')
    expect(tramoDe(27, 20)).toBe('7 buenas')
  })

  it('el anotador grande: una columna por equipo, con la raya de la mitad', () => {
    render(<DibujoAnotador nosotros={{ nombre: 'Nosotros', puntos: 22 }} ellos={{ nombre: 'Ellos', puntos: 9 }} malas={20} />)
    const dibujo = screen.getByRole('img', { name: 'Nosotros: 2 buenas. Ellos: 9 malas.' })
    const [nos, ellos] = [...dibujo.querySelectorAll('.anotador-columna')]
    expect(fosforos(nos!)).toBe(22)
    expect(fosforos(ellos!)).toBe(9)
    // A 40: cuatro cuadrados de malas y cuatro de buenas por equipo.
    expect(nos!.querySelectorAll('rect')).toHaveLength(8)
    expect(dibujo.querySelectorAll('.anotador-mitad')).toHaveLength(1)
    expect(within(dibujo as unknown as HTMLElement).getByText('MALAS')).toBeTruthy()
    expect(within(dibujo as unknown as HTMLElement).getByText('BUENAS')).toBeTruthy()
  })
})

/** Conexión de mentira "online": el test decide qué llega. */
function conexionFalsa() {
  let oyente: ((m: MensajeServidor) => void) | null = null
  const c = {
    tipo: 'online' as const,
    roomId: 'SALA4',
    enviar: () => {},
    escuchar: (o: (m: MensajeServidor) => void) => {
      oyente = o
      return () => (oyente = null)
    },
    salir: () => {},
  }
  return { c: c as Conexion, llegar: (m: MensajeServidor) => act(() => oyente!(m)) }
}

const APODOS = ['Luis', 'Ana', 'Pepe', 'Rita']

/** Un 2v2 online a 40, con los puntos que se le pasen. */
function partidaOnline(puntos: [number, number]) {
  const config = crearConfig({ formato: '2v2', puntosPartida: 40 })
  const estado = crearPartida({ jugadores: APODOS.map((n, a) => ({ id: `j${a}`, nombre: n })), semilla: 3, config, reparte: 3 })
  const yo = esperandoA(estado)[0]!
  const sala: InfoSala = {
    codigo: 'SALA4',
    publica: false,
    tiempos: { turnoS: 30, primeraJugadaS: 60 },
    cartasJugadas: 'quedan',
    tirarReyes: 'no',
    voz: false,
    mesa: 'boliche',
    baraja: 'propia',
    fase: 'jugando',
    formato: '2v2',
    config,
    botsEnVacios: false,
    nivelBots: 'medio',
    ayudas: true,
    senias: SENIAS_DEFAULT,
    chatEquipo: true,
    lugares: APODOS.map((apodo, a) => ({ asiento: a, tipo: 'humano' as const, apodo, avatar: '🧉', conectado: true, anfitrion: a === 0 })),
    yo,
    revancha: [],
  }
  const vista = vistaPara(estado, `j${yo}`)
  return { sala, vista: { ...vista, puntos: puntos }, yo }
}

const botonMarcador = () => screen.getByRole('button', { name: /^Ver el anotador/ })

describe('anotador en la mesa', () => {
  it('local: tocar el marcador abre el anotador; se cierra con el botón y tocando afuera', async () => {
    act(() =>
      useJuego
        .getState()
        .conectar(new ConexionLocal({ apodo: 'Luis', avatar: '🧉', formato: '1v1', nivelBots: 'facil', demoraBots: [0, 0], semilla: 21 })),
    )
    render(<App />)
    await waitFor(() => expect(screen.getByLabelText('Mazo y muestra')).toBeTruthy(), { timeout: 5000 })
    expect(screen.queryByRole('dialog', { name: 'Anotador' })).toBeNull()
    fireEvent.click(botonMarcador())
    const dialogo = screen.getByRole('dialog', { name: 'Anotador' })
    expect(dialogo.getAttribute('aria-modal')).toBe('true')
    // Contra la compu se juega a 30 de entrada: 15 malas y 15 buenas.
    expect(within(dialogo).getByText(/A 30: los primeros 15 son las malas/)).toBeTruthy()
    expect(within(dialogo).getByRole('img', { name: /^Vos: sin puntos\./ })).toBeTruthy()
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Volver a la mesa' }))
    expect(screen.queryByRole('dialog', { name: 'Anotador' })).toBeNull()
    // Tocando afuera (el fondo oscuro) también se cierra.
    fireEvent.click(botonMarcador())
    fireEvent.click(document.querySelector('.hoja-fondo')!)
    expect(screen.queryByRole('dialog', { name: 'Anotador' })).toBeNull()
    // Y tocando adentro no.
    fireEvent.click(botonMarcador())
    fireEvent.click(screen.getByRole('img', { name: /^Vos:/ }))
    expect(screen.getByRole('dialog', { name: 'Anotador' })).toBeTruthy()
  })

  it('online a 40: los fósforos de cada equipo, partidos en malas y buenas', async () => {
    const datos = partidaOnline([0, 0])
    const nuestro = datos.yo % 2
    const puntos: [number, number] = nuestro === 0 ? [23, 8] : [8, 23]
    const f = conexionFalsa()
    act(() => useJuego.getState().conectar(f.c))
    render(<App />)
    f.llegar({ tipo: 'sala', datos: datos.sala })
    f.llegar({ tipo: 'vista', datos: { ...datos.vista, puntos } })
    await waitFor(() => expect(screen.getByLabelText('Mazo y muestra')).toBeTruthy())
    expect(botonMarcador().getAttribute('aria-label')).toBe('Ver el anotador: Nosotros 23, Ellos 8')
    fireEvent.click(botonMarcador())
    const dialogo = screen.getByRole('dialog', { name: 'Anotador' })
    const dibujo = within(dialogo).getByRole('img', { name: 'Nosotros: 3 buenas. Ellos: 8 malas.' })
    const [nos, ellos] = [...dibujo.querySelectorAll('.anotador-columna')]
    expect(fosforos(nos!)).toBe(23)
    expect(fosforos(ellos!)).toBe(8)
    expect(within(dialogo).getByText(/A 40: los primeros 20 son las malas y los otros 20, las buenas/)).toBeTruthy()
    // Escape también lo cierra.
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog', { name: 'Anotador' })).toBeNull()
  })
})
