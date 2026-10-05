import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { ConexionLocal } from '../src/conexion/local'
import { useJuego } from '../src/estado'
import { bustosDesdeUrl, leerPerfil } from '../src/perfil'
import { Mesa } from '../src/pantallas/Mesa'

beforeEach(() => localStorage.clear())
afterEach(() => {
  act(() => useJuego.getState().salir())
  cleanup()
})

/** Una mesa de 2 contra 2 contra bots quietos, con la variante de bustos prendida o no. */
function mesa(bustos: boolean) {
  localStorage.setItem('truco.perfil', JSON.stringify({ invitadoId: 'inv-bustos', apodo: 'Luis', ojear: false, mesaBustos: bustos }))
  act(() =>
    useJuego
      .getState()
      .conectar(new ConexionLocal({ apodo: 'Luis', avatar: '', formato: '2v2', nivelBots: 'facil', demoraBots: [1e9, 1e9], semilla: 183 })),
  )
  return render(
    <MemoryRouter initialEntries={['/mesa']}>
      <Mesa />
    </MemoryRouter>,
  ).container
}

describe('mesa de bustos', () => {
  it('viene apagada y se prende o se apaga con ?bustos= en la dirección', () => {
    expect(leerPerfil().mesaBustos).toBe(false)
    bustosDesdeUrl('?bustos=1')
    expect(leerPerfil().mesaBustos).toBe(true)
    // Otra cosa en la dirección no la toca.
    bustosDesdeUrl('?otra=1')
    expect(leerPerfil().mesaBustos).toBe(true)
    bustosDesdeUrl('?bustos=0')
    expect(leerPerfil().mesaBustos).toBe(false)
  })

  it('prendida, la mesa lleva la clase y cada asiento dibuja el avatar de medio cuerpo', async () => {
    const c = mesa(true)
    await waitFor(() => expect(c.querySelector('.pantalla-mesa.mesa-bustos')).toBeTruthy())
    await waitFor(() => expect(c.querySelectorAll('.asiento svg.avatar-dibujo')).toHaveLength(3), { timeout: 5000 })
    for (const svg of c.querySelectorAll('.asiento svg.avatar-dibujo')) expect(svg.classList).toContain('encuadre-busto')
    // Vos seguís con el circulito, acercado a la cara.
    expect(c.querySelector('.mi-info .avatar-dibujo')?.classList).toContain('encuadre-cara')
  })

  it('apagada, la mesa es la de siempre: círculos con la cara', async () => {
    const c = mesa(false)
    await waitFor(() => expect(c.querySelector('.pantalla-mesa')).toBeTruthy())
    expect(c.querySelector('.mesa-bustos')).toBeNull()
    await waitFor(() => expect(c.querySelectorAll('.asiento svg.avatar-dibujo')).toHaveLength(3), { timeout: 5000 })
    for (const svg of c.querySelectorAll('.asiento svg.avatar-dibujo')) expect(svg.classList).toContain('encuadre-cara')
  })
})
