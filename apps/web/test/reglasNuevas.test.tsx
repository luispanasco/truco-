import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { apply, crearPartida, vistaPara, type Carta, type EstadoPartida } from '@truco/engine'
import { BotonPasar, BotonPie, PanelPie } from '../src/componentes/Pie'
import { Mazo } from '../src/componentes/Mazo'
import { TiradaDeReyes } from '../src/componentes/Reyes'
import { CartasEnMesa } from '../src/componentes/CartasEnMesa'
import { asientosDespuesDeReyes, planReyes } from '../src/tiradaReyes'
import { ConexionLocal } from '../src/conexion/local'
import type { MensajeServidor } from '../src/conexion/tipos'

const c = (numero: Carta['numero'], palo: Carta['palo']): Carta => ({ numero, palo })
const ids = ['a', 'b', 'c', 'd']

afterEach(cleanup)

function dosVsDos(config = {}, bots: number[] = []): EstadoPartida {
  return crearPartida({
    jugadores: ids.map((id, i) => ({ id, nombre: id.toUpperCase(), ...(bots.includes(i) ? { bot: true } : {}) })),
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

  it('aparece solo para el pie; a una persona se le insinúa (sin ver sus cartas)', () => {
    const p = dosVsDos()
    const alElegir = vi.fn()
    const { container } = render(<PanelPie vista={vistaPara(p, 'a')} apodo={apodo} alElegir={alElegir} />)
    expect(container.querySelector('.panel-pie')).toBeNull()
    render(<PanelPie vista={vistaPara(p, 'c')} apodo={apodo} alElegir={alElegir} />)
    // Con un solo compañero no se nombra a quién: solo las frases.
    expect(document.querySelector('.pie-nombre')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '¡Matala!' }))
    expect(alElegir).toHaveBeenCalledWith({ tipo: 'mandar', jugador: 'c', a: 0, que: 'matala' })
    for (const texto of ['Dejala', 'Jugá algo', '¡Vení a mí!', '¡Tocá!', '¡Gritá!']) expect(screen.getByRole('button', { name: texto })).toBeTruthy()
  })

  it('a tu bot no le ves las cartas: le decís una frase', () => {
    // a es persona y pie; c es su bot.
    const p = dosVsDos({}, [1, 2, 3])
    const alElegir = vi.fn()
    render(<PanelPie vista={vistaPara(p, 'a')} apodo={apodo} alElegir={alElegir} esperando={2} />)
    expect(screen.getByText('¿Qué juega?')).toBeTruthy()
    expect(document.querySelector('.panel-pie .carta')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Jugá algo' }))
    expect(alElegir).toHaveBeenCalledWith({ tipo: 'mandar', jugador: 'a', a: 2, que: 'jugaAlgo' })
  })

  it('se abre con el botón "Pie" (marcado si tu bot espera) y se cierra al elegir', () => {
    const p = dosVsDos({}, [1, 2, 3])
    const alCambiar = vi.fn()
    render(<BotonPie vista={vistaPara(p, 'a')} abierto={false} alCambiar={alCambiar} esperando={2} />)
    fireEvent.click(screen.getByRole('button', { name: /^Pie: tu bot espera/ }))
    expect(alCambiar).toHaveBeenCalledWith(true)
    const alCerrar = vi.fn()
    render(<PanelPie vista={vistaPara(p, 'a')} apodo={apodo} alElegir={() => {}} alCerrar={alCerrar} />)
    fireEvent.click(screen.getByRole('button', { name: 'Dejala' }))
    expect(alCerrar).toHaveBeenCalled()
  })
})

describe('el corte en el mazo', () => {
  it('mientras se elige, el mazo brilla y dice quién corta; la muestra espera al giro', () => {
    const { container, rerender } = render(<Mazo muestra={null} n={4} reparteRel={0} avisoCorte="Corta B" />)
    expect(container.querySelector('.mazo-esperando-corte')).not.toBeNull()
    expect(screen.getByRole('status').textContent).toBe('Corta B')
    // Es un mazo de varias cartas, no una sola.
    expect(container.querySelectorAll('.mazo-pila .mazo-capa').length).toBeGreaterThan(5)
    // Cortando: la muestra que ya llegó no se ve hasta que se da vuelta; se separa la de arriba.
    const corte = { corte: 'darAlMano' as const, id: 1 }
    rerender(<Mazo muestra={c(3, 'copa')} n={4} reparteRel={0} corte={corte} fase="corte" />)
    expect(container.querySelector('.mazo-muestra')).toBeNull()
    expect(container.querySelectorAll('.mazo-grupo .mazo-capa')).toHaveLength(1)
    // Repartiendo: tres cartas para cada uno, la primera desde abajo del mazo (se la dieron al mano).
    rerender(<Mazo muestra={c(3, 'copa')} n={4} reparteRel={0} corte={corte} fase="reparto" manoRel={1} />)
    expect(container.querySelector('.mazo-muestra')).toBeNull()
    expect(container.querySelectorAll('.reparto-carta')).toHaveLength(12)
    expect(container.querySelector('.reparto-carta')!.classList.contains('desde-abajo')).toBe(true)
    rerender(<Mazo muestra={c(3, 'copa')} n={4} reparteRel={0} corte={corte} fase="muestra" />)
    expect(container.querySelector('.mazo-muestra')).not.toBeNull()
    expect(container.querySelector('.reparto-carta')).toBeNull()
    expect(container.querySelector('.mazo-esperando-corte')).toBeNull()
  })

  it('el convencional parte el mazo en dos; al sacar la muestra, sale en el mismo corte', () => {
    const { container, rerender } = render(
      <Mazo muestra={c(3, 'copa')} n={2} reparteRel={0} corte={{ corte: 'convencional', id: 1 }} fase="corte" />,
    )
    const grupos = container.querySelectorAll('.mazo-grupo')
    expect(grupos).toHaveLength(2)
    expect(grupos[0]!.querySelectorAll('.mazo-capa').length).toBe(grupos[1]!.querySelectorAll('.mazo-capa').length)
    rerender(<Mazo muestra={c(3, 'copa')} n={2} reparteRel={0} corte={{ corte: 'sacarMuestra', id: 2 }} fase="corte" />)
    expect(container.querySelector('.mazo-muestra')).not.toBeNull()
  })
})

describe('la tirada de reyes en la mesa', () => {
  const tiradas = [
    { asiento: 0, carta: c(4, 'oro') },
    { asiento: 1, carta: c(12, 'basto') },
    { asiento: 2, carta: c(7, 'copa') },
    { asiento: 3, carta: c(12, 'oro') },
  ]

  it('los tiempos: cada carta sale después de la anterior, el rey se deja ver y moverse alarga', () => {
    const quieto = planReyes(tiradas, false)
    expect(quieto.salidas).toHaveLength(4)
    expect(quieto.salidas.every((t, i) => i === 0 || t > quieto.salidas[i - 1]!)).toBe(true)
    // Después de un rey hay más espera que después de otra carta.
    expect(quieto.salidas[2]! - quieto.salidas[1]!).toBeGreaterThan(quieto.salidas[1]! - quieto.salidas[0]!)
    expect(quieto.mover).toBeNull()
    const moviendo = planReyes(tiradas, true)
    expect(moviendo.mover).not.toBeNull()
    expect(moviendo.fin).toBeGreaterThan(quieto.fin)
    // Una tirada larga (3 contra 3 con equipos) no se hace eterna.
    const larga = Array.from({ length: 30 }, (_, i) => ({ asiento: i % 6, carta: c(i % 3 === 0 ? 12 : 4, 'oro') }))
    expect(planReyes(larga, true).fin).toBeLessThan(14000)
  })

  it('reconoce a cada uno en su lugar nuevo, aunque se repita un apodo', () => {
    const lugar = (asiento: number, apodo: string, avatar: string | null = null) => ({
      asiento,
      tipo: 'humano' as const,
      apodo,
      avatar,
      conectado: true,
      anfitrion: false,
    })
    const antes = [lugar(0, 'Ana', 'a'), lugar(1, 'Beto'), lugar(2, 'Ana', 'b'), lugar(3, 'Caro')]
    // Se cambiaron Beto y la segunda Ana.
    const ahora = [lugar(0, 'Ana', 'a'), lugar(1, 'Ana', 'b'), lugar(2, 'Beto'), lugar(3, 'Caro')]
    expect(asientosDespuesDeReyes(['Ana', 'Beto', 'Ana', 'Caro'], antes, ahora)).toEqual([0, 2, 1, 3])
    // Sin la sala de antes (contra la compu), por el apodo.
    expect(asientosDespuesDeReyes(['Ana', 'Beto', 'Caro', 'Dani'], null, [lugar(0, 'Ana'), lugar(1, 'Caro'), lugar(2, 'Beto'), lugar(3, 'Dani')])).toEqual([
      0, 2, 1, 3,
    ])
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
      config: { corte: true, puntosPartida: 20 },
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
