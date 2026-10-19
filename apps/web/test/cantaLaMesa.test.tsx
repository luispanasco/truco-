import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { apply, crearPartida, vistaPara, type Accion, type Carta, type EstadoPartida } from '@truco/engine'
import { CantaLaMesa } from '../src/componentes/CantaLaMesa'

afterEach(cleanup)

const c = (numero: number, palo: Carta['palo']): Carta => ({ numero, palo }) as Carta

function hacer(estado: EstadoPartida, ...acciones: Accion[]): EstadoPartida {
  for (const a of acciones) {
    const r = apply(estado, a)
    if (!r.ok) throw new Error(r.motivo)
    estado = r.estado
  }
  return estado
}

describe('canta la mesa', () => {
  it('se ve lo que tiró cada uno, la suma y a quién le toca', () => {
    let estado = crearPartida({
      jugadores: [
        { id: 'a', nombre: 'Ana' },
        { id: 'b', nombre: 'Beto' },
      ],
      semilla: 1,
      config: { formato: '1v1' },
      repartoFijo: {
        cartas: [
          [c(7, 'espada'), c(6, 'espada'), c(5, 'espada')],
          [c(7, 'basto'), c(6, 'basto'), c(4, 'basto')],
        ],
        muestra: c(3, 'copa'),
      },
    })
    estado = hacer(
      estado,
      { tipo: 'cantarFlor', jugador: 'a', canto: 'flor' },
      { tipo: 'cantarFlor', jugador: 'b', canto: 'flor' },
      { tipo: 'cantarFlor', jugador: 'b', canto: 'contraflorAlResto' },
      { tipo: 'responder', jugador: 'a', respuesta: 'quiero', cantaLaMesa: true },
      { tipo: 'mostrarFlor', jugador: 'a', carta: c(5, 'espada') },
    )
    const vista = vistaPara(estado, 'b')
    render(<CantaLaMesa vista={vista} apodo={(x) => ['Ana', 'Beto'][x]!} />)
    const region = screen.getByRole('region', { name: 'Canta la mesa' })
    expect(within(region).getByLabelText('Suma 25')).toBeTruthy()
    expect(within(region).getByText('Tocá una carta de tu mano para tirarla')).toBeTruthy()
    // La vista de b trae las cartas que tiró a, pero no las que a todavía tiene.
    expect(JSON.stringify(vista)).not.toContain('"numero":7,"palo":"espada"')
  })
})
