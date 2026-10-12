import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { apply, crearPartida, vistaPara, type Carta, type EstadoPartida } from '@truco/engine'
import { BotonPasar, PanelPie } from '../src/componentes/Pie'
import { TiradaDeReyes } from '../src/componentes/Reyes'
import { CartasEnMesa } from '../src/componentes/CartasEnMesa'
import { ConexionLocal } from '../src/conexion/local'
import type { MensajeServidor } from '../src/conexion/tipos'

const c = (numero: Carta['numero'], palo: Carta['palo']): Carta => ({ numero, palo })
const ids = ['a', 'b', 'c', 'd']

afterEach(cleanup)

function dosVsDos(config = {}): EstadoPartida {
  return crearPartida({
    jugadores: ids.map((id) => ({ id, nombre: id.toUpperCase() })),
    semilla: 3,
    config: { formato: '2v2', ...config },
    repartoFijo: {
      cartas: [
        [c(1, 'espada'), c(7, 'oro'), c(4, 'basto')],
        [c(1, 'basto'), c(2, 'espada'), c(6, 'oro')],
        [c(7, 'espada'), c(5, 'oro'), c(12, 'basto')],
        [c(3, 'espada'), c(6, 'basto'), c(11, 'oro')],
      ],
      muestra: c(3, 'copa'),
    },
  })
}

describe('el panel del pie', () => {
  const apodo = (a: number) => ids[a]!.toUpperCase()

  it('aparece solo para el que lidera, con "Vení" y "Vamos a"', () => {
    const p = dosVsDos()
    const alSugerir = vi.fn()
    const { container } = render(<PanelPie vista={vistaPara(p, 'a')} apodo={apodo} alSugerir={alSugerir} alElegir={() => {}} />)
    expect(container.querySelector('.panel-pie')).toBeNull()
    render(<PanelPie vista={vistaPara(p, 'c')} apodo={apodo} alSugerir={alSugerir} alElegir={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Vení' }))
    expect(alSugerir).toHaveBeenCalledWith({ tipo: 'veni' })
    fireEvent.click(screen.getByRole('button', { name: 'Vamos a B' }))
    expect(alSugerir).toHaveBeenCalledWith({ tipo: 'vamosA', asiento: 1 })
  })

  it('con "toques y gritos del pie" manda a tocar o a gritar', () => {
    const p = dosVsDos({ toquesYGritos: 'pie' })
    const alElegir = vi.fn()
    render(<PanelPie vista={vistaPara(p, 'c')} apodo={apodo} alSugerir={() => {}} alElegir={alElegir} />)
    fireEvent.click(screen.getByRole('button', { name: 'Tocá, A' }))
    expect(alElegir).toHaveBeenCalledWith({ tipo: 'mandar', jugador: 'c', a: 0, que: 'tocar' })
    expect(screen.getByRole('button', { name: 'Gritá, A' })).toBeTruthy()
  })
})

describe('pasar en la tercera', () => {
  it('el botón aparece solo cuando se puede pasar', () => {
    let p = dosVsDos()
    const { container, rerender } = render(<BotonPasar vista={vistaPara(p, 'b')} activo={false} alCambiar={() => {}} />)
    expect(container.querySelector('.boton-pasar')).toBeNull()
    const jugadas: [string, Carta][] = [
      ['a', c(1, 'espada')],
      ['b', c(6, 'oro')],
      ['c', c(12, 'basto')],
      ['d', c(11, 'oro')],
      ['a', c(4, 'basto')],
      ['b', c(1, 'basto')],
      ['c', c(5, 'oro')],
      ['d', c(3, 'espada')],
    ]
    for (const [jugador, carta] of jugadas) {
      const r = apply(p, { tipo: 'jugarCarta', jugador, carta })
      if (!r.ok) throw new Error(r.motivo)
      p = r.estado
    }
    const alCambiar = vi.fn()
    rerender(<BotonPasar vista={vistaPara(p, 'b')} activo={false} alCambiar={alCambiar} />)
    fireEvent.click(screen.getByRole('button', { name: 'Pasar' }))
    expect(alCambiar).toHaveBeenCalledWith(true)
  })

  it('la carta que no se ve queda boca abajo en la mesa', () => {
    const { container } = render(
      <CartasEnMesa
        n={2}
        rel={(a) => a}
        apodo={(a) => `J${a}`}
        nuestro={0}
        mesa={{ jugadas: [{ asiento: 1, carta: null, tapada: true, vuelta: 0 }], vueltas: [] }}
        mostradas={[]}
      />,
    )
    expect(container.querySelector('.jugada .carta-dorso')).not.toBeNull()
  })
})

describe('tirar reyes', () => {
  it('muestra las cartas de cada uno y quién reparte', () => {
    const alCerrar = vi.fn()
    render(
      <TiradaDeReyes
        reyes={{
          tiradas: [
            { asiento: 0, carta: c(4, 'oro') },
            { asiento: 1, carta: c(12, 'basto') },
          ],
          reparte: 1,
          equipos: null,
          apodos: ['Ana', 'Beto'],
        }}
        alCerrar={alCerrar}
      />,
    )
    expect(screen.getByText(/Reparte Beto/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Listo' }))
    expect(alCerrar).toHaveBeenCalled()
  })
})

describe('contra la compu con las reglas nuevas', () => {
  it('se tiran reyes, se corta y se juega entera con el pie y a 20', async () => {
    const con = new ConexionLocal({
      apodo: 'Test',
      avatar: null,
      formato: '2v2',
      nivelBots: 'medio',
      demoraBots: [0, 0],
      semilla: 5,
      tirarReyes: 'reparteYEquipos',
      config: { corte: true, toquesYGritos: 'pie', puntosPartida: 20 },
    })
    const mensajes: MensajeServidor[] = []
    let i = 0
    await new Promise<void>((resolve, reject) => {
      const limite = setTimeout(() => reject(new Error('La partida no terminó')), 20_000)
      con.escuchar((m) => {
        mensajes.push(m)
        if (m.tipo !== 'vista') return
        const v = m.datos
        if (v.ganador !== null) {
          clearTimeout(limite)
          con.salir()
          resolve()
          return
        }
        if (!v.esperandoA.includes(0) || v.accionesValidas.length === 0) return
        const opciones = v.accionesValidas.filter((a) => a.tipo !== 'irseAlMazo')
        con.enviar('accion', { accion: opciones[i++ % opciones.length] ?? v.accionesValidas[0]! })
      })
    })
    const reyes = mensajes.find((m) => m.tipo === 'reyes')
    expect(reyes).toBeDefined()
    const eventos = mensajes.flatMap((m) => (m.tipo === 'eventos' ? m.datos : []))
    expect(eventos.some((e) => e.tipo === 'corte')).toBe(true)
    const final = mensajes.filter((m) => m.tipo === 'vista').at(-1)!
    if (final.tipo === 'vista') expect(Math.max(...final.datos.puntos)).toBe(20)
  }, 30_000)
})
