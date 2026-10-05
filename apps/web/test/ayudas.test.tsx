import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import {
  apply,
  calcularEnvido,
  calcularFlor,
  crearBaraja,
  crearPartida,
  mismaCarta,
  vistaPara,
  type Carta,
  type ConfigSala,
  type EstadoPartida,
} from '@truco/engine'
import type { InfoSala } from '@truco/shared'
import { explicarCarta, explicarEnvido, explicarFlor, explicarTanto } from '../src/ayudas'
import { esPiezaOMata } from '../src/senias'
import type { Conexion, MensajeServidor } from '../src/conexion/tipos'
import { useJuego } from '../src/estado'
import { Mesa } from '../src/pantallas/Mesa'

const c = (numero: Carta['numero'], palo: Carta['palo']): Carta => ({ numero, palo })

describe('explicaciones de las ayudas', () => {
  it('el envido y la flor explicados dan lo mismo que el motor, con las dos reglas de la flor', () => {
    const baraja = crearBaraja()
    let manos = 0
    // Todas las muestras, con una de cada siete manos posibles (unas 50 000 en total).
    for (const muestra of baraja) {
      const resto = baraja.filter((x) => !mismaCarta(x, muestra))
      let k = 0
      for (let i = 0; i < resto.length; i++)
        for (let j = i + 1; j < resto.length; j++)
          for (let l = j + 1; l < resto.length; l++) {
            if (k++ % 7 !== 0) continue
            const mano = [resto[i]!, resto[j]!, resto[l]!]
            expect(explicarEnvido(mano, muestra).tanto).toBe(calcularEnvido(mano, muestra))
            for (const regla of ['piezaMayorMasDigitos', 'piezaMayorMasNumero'] as const) {
              expect(explicarFlor(mano, muestra, { florConPiezas: regla, florObligatoria: true })?.tanto ?? null).toBe(
                calcularFlor(mano, muestra, regla),
              )
            }
            manos++
          }
    }
    expect(manos).toBeGreaterThan(40_000)
  })

  it('la estrella se explica en las mismas cartas que se marcan (piezas y matas)', () => {
    const baraja = crearBaraja()
    for (const muestra of baraja)
      for (const carta of baraja) {
        if (mismaCarta(carta, muestra)) continue
        expect(explicarCarta(carta, muestra) !== null).toBe(esPiezaOMata(carta, muestra))
      }
  })

  it('envido: con par del mismo palo, sin par y con pieza', () => {
    const muestra = c(4, 'espada')
    expect(explicarEnvido([c(7, 'oro'), c(6, 'oro'), c(1, 'copa')], muestra).texto).toBe('Tu envido: 33 (7 y 6 de oros + 20).')
    expect(explicarEnvido([c(7, 'basto'), c(12, 'basto'), c(1, 'copa')], muestra).texto).toBe(
      'Tu envido: 27 (7 y 12 de bastos + 20; las figuras (10, 11 y 12) valen 0).',
    )
    expect(explicarEnvido([c(7, 'oro'), c(3, 'copa'), c(1, 'basto')], muestra).texto).toBe(
      'Tu envido: 7. No tenés dos del mismo palo: vale tu carta más alta, el 7 de oros.',
    )
    expect(explicarEnvido([c(5, 'espada'), c(7, 'oro'), c(3, 'copa')], muestra).texto).toBe(
      'Tu envido: 35 (28 del 5 de la muestra + 7 del 7 de oros). Con pieza se suma la más alta de las otras, de cualquier palo.',
    )
  })

  it('flor: con dos piezas cambia según la regla de la sala', () => {
    const muestra = c(4, 'copa')
    const mano = [c(10, 'copa'), c(6, 'copa'), c(11, 'copa')]
    const digitos = explicarFlor(mano, muestra, { florConPiezas: 'piezaMayorMasDigitos', florObligatoria: true })!
    expect(digitos.tanto).toBe(40)
    expect(digitos.texto).toBe(
      'Tenés flor de 40: dos piezas, que hacen de comodín. Vale 27 (perica) + 7 (perico, solo el último dígito) + 6 (6 de copas). Cantala en la primera vuelta: si no, se pierde.',
    )
    const numero = explicarFlor(mano, muestra, { florConPiezas: 'piezaMayorMasNumero', florObligatoria: false })!
    expect(numero.tanto).toBe(calcularFlor(mano, muestra, 'piezaMayorMasNumero'))
    expect(numero.texto).toContain('por su número')
    expect(numero.texto).not.toContain('Cantala')
    expect(explicarFlor([c(3, 'basto'), c(4, 'basto'), c(5, 'basto')], c(1, 'oro'), { florConPiezas: 'piezaMayorMasDigitos', florObligatoria: true })!.texto).toContain(
      'tres cartas del mismo palo. Vale 20 + 3 + 4 + 5.',
    )
  })

  it('piezas y matas: a quién le ganan, también cuando el 12 hace de pieza', () => {
    expect(explicarCarta(c(2, 'oro'), c(1, 'oro'))).toBe('Pieza: el 2 de la muestra. Es la carta más alta: no la mata ninguna. Para el envido vale 30.')
    expect(explicarCarta(c(11, 'espada'), c(4, 'espada'))).toBe(
      'Pieza: el perico (11 de la muestra). Gana a todas menos al 2, al 12 (que hace de 4) y al 5 de la muestra. Para el envido vale 27.',
    )
    expect(explicarCarta(c(12, 'espada'), c(4, 'espada'))).toContain('Como la muestra es el 4, el 12 toma su lugar.')
    expect(explicarCarta(c(10, 'basto'), c(3, 'basto'))).toContain('Gana a todas menos a las otras piezas.')
    expect(explicarCarta(c(1, 'espada'), c(3, 'oro'))).toBe('Mata: el 1 de espadas. Solo le ganan las piezas.')
    expect(explicarCarta(c(7, 'oro'), c(3, 'copa'))).toBe(
      'Mata: el 7 de oros. Le ganan las piezas, el 1 de espadas, el 1 de bastos y el 7 de espadas.',
    )
    // La muestra no la tiene nadie: no se nombra.
    expect(explicarCarta(c(1, 'basto'), c(1, 'espada'))).toBe('Mata: el 1 de bastos. Solo le ganan las piezas.')
    expect(explicarCarta(c(3, 'oro'), c(1, 'copa'))).toBeNull()
  })
})

// ── En la mesa: 3 contra 3 con pica-pica ─────────────────────────

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

function conexionFalsa() {
  let oyente: ((m: MensajeServidor) => void) | null = null
  const conexion = {
    tipo: 'online' as const,
    roomId: 'AYUDA',
    enviar: () => {},
    escuchar: (o: (m: MensajeServidor) => void) => {
      oyente = o
      return () => (oyente = null)
    },
    salir: () => {},
  }
  return { c: conexion as Conexion, llegar: (m: MensajeServidor) => act(() => oyente!(m)) }
}

/**
 * Reparto fijo, muestra el 4 de espadas (el 12 de espadas hace de 4). El 0 es mano y juega
 * el primer duelo contra el 3; el 1 espera su duelo.
 *   0: 7 y 6 de oros y 1 de copas (envido 33).
 *   1: perica y perico de espadas y 6 de copas (flor de 40, o de 33 por número; envido 33).
 */
const REPARTO = {
  muestra: c(4, 'espada'),
  cartas: [
    [c(7, 'oro'), c(6, 'oro'), c(1, 'copa')],
    [c(10, 'espada'), c(11, 'espada'), c(6, 'copa')],
    [c(3, 'basto'), c(4, 'basto'), c(5, 'basto')],
    [c(2, 'copa'), c(3, 'copa'), c(12, 'oro')],
    [c(1, 'basto'), c(7, 'basto'), c(2, 'oro')],
    [c(5, 'copa'), c(4, 'copa'), c(12, 'basto')],
  ],
}

function partida(config: Partial<ConfigSala>): EstadoPartida {
  return crearPartida({
    jugadores: Array.from({ length: 6 }, (_, a) => ({ id: `j${a}`, nombre: `Jugador ${a}` })),
    semilla: 1,
    reparte: 5,
    config: { formato: '3v3', picaPica: true, ...config },
    repartoFijo: REPARTO,
  })
}

async function entrar(estado: EstadoPartida, yo: number, ayudas = true) {
  const config = estado.config
  const sala: InfoSala = {
    codigo: 'AYUDA',
    publica: false,
    tiempos: { turnoS: 30, primeraJugadaS: 60 },
    fase: 'jugando',
    formato: '3v3',
    config,
    botsEnVacios: true,
    nivelBots: 'medio',
    ayudas,
    senias: { habilitadas: true, momento: 'libre', pescar: 'nunca', probabilidadPescar: 0.2 },
    chatEquipo: true,
    lugares: Array.from({ length: 6 }, (_, a) => ({
      asiento: a,
      tipo: 'humano' as const,
      apodo: `Jugador ${a}`,
      avatar: '🧉',
      conectado: true,
      anfitrion: a === 0,
    })),
    yo,
    revancha: [],
  }
  const f = conexionFalsa()
  act(() => useJuego.getState().conectar(f.c))
  render(<App />)
  f.llegar({ tipo: 'sala', datos: sala })
  f.llegar({ tipo: 'vista', datos: vistaPara(estado, `j${yo}`) })
  await waitFor(() => expect(screen.getByLabelText('Mazo y muestra')).toBeTruthy())
  return f
}

describe('ayudas en la mesa (3 contra 3, pica-pica)', () => {
  it('quien espera su duelo ve su flor con la regla de la sala, y la explicación al tocarla', async () => {
    const estado = partida({ florConPiezas: 'piezaMayorMasNumero' })
    expect(estado.mano.picaPica).toBe(true)
    await entrar(estado, 1)
    expect(screen.getByText('Esperás tu duelo')).toBeTruthy()
    const ficha = screen.getByRole('button', { name: 'flor 33' })
    fireEvent.click(ficha)
    const globo = screen.getByText(/^Tenés flor de 33/)
    expect(globo.textContent).toContain('por su número')
    expect(globo.textContent).toContain('Con flor, el envido no se juega (el tuyo sería 33).')
    // Tocarla otra vez la cierra.
    fireEvent.pointerDown(ficha)
    fireEvent.click(ficha)
    expect(screen.queryByText(/^Tenés flor de/)).toBeNull()
  })

  it('con la otra regla, la misma mano es flor de 40', async () => {
    await entrar(partida({ florConPiezas: 'piezaMayorMasDigitos' }), 1)
    expect(screen.getByRole('button', { name: 'flor 40' })).toBeTruthy()
  })

  it('la estrella va en las piezas y se explica al tocarla; tocar fuera la cierra', async () => {
    await entrar(partida({}), 1)
    expect(screen.queryByLabelText('Por qué está marcado el 6 de copas')).toBeNull()
    expect(screen.getByLabelText('Por qué está marcado el 10 de espadas')).toBeTruthy()
    fireEvent.click(screen.getByLabelText('Por qué está marcado el 11 de espadas'))
    expect(screen.getByText(/^Pieza: el perico \(11 de la muestra\)\. Gana a todas menos al 2, al 12 \(que hace de 4\) y al 5/)).toBeTruthy()
    fireEvent.pointerDown(document.body)
    expect(screen.queryByText(/^Pieza:/)).toBeNull()
  })

  it('después de tirar una carta, el envido se sigue explicando con las tres', async () => {
    let estado = partida({})
    const jugada = vistaPara(estado, 'j0').accionesValidas.find((a) => a.tipo === 'jugarCarta' && mismaCarta(a.carta, c(1, 'copa')))!
    const r = apply(estado, jugada)
    if (!r.ok) throw new Error(r.motivo)
    estado = r.estado
    expect(vistaPara(estado, 'j0').mano.misCartas).toHaveLength(2)
    expect(explicarTanto(vistaPara(estado, 'j0'))).toBe('Tu envido: 33 (7 y 6 de oros + 20).')
    await entrar(estado, 0)
    fireEvent.click(screen.getByRole('button', { name: 'envido 33' }))
    expect(screen.getByText('Tu envido: 33 (7 y 6 de oros + 20).')).toBeTruthy()
  })

  it('sin ayudas no hay ficha del tanto ni estrellas', async () => {
    await entrar(partida({}), 1, false)
    expect(screen.queryByRole('button', { name: /^flor / })).toBeNull()
    expect(screen.queryByLabelText(/^Por qué está marcado/)).toBeNull()
  })

  it('cada jugador ve su tanto: el de enfrente en el duelo tiene el suyo', async () => {
    // El 3 (2 y 3 de copas, 12 de oros): envido 25, sin flor.
    const estado = partida({})
    expect(estado.mano.tantos[3]!.envidoReal).toBe(25)
    await entrar(estado, 3)
    expect(screen.getByRole('button', { name: 'envido 25' })).toBeTruthy()
  })
})
