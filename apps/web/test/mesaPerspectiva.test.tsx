import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, render, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import type { Formato } from '@truco/engine'
import { ConexionLocal } from '../src/conexion/local'
import { useJuego } from '../src/estado'
import { leerPerfil, vistaDesdeUrl, vistaGuardada } from '../src/perfil'
import { aplicar, homografia, invertir, type Punto } from '../src/perspectiva'
import { Mesa } from '../src/pantallas/Mesa'
import { lugarMazo } from '../src/componentes/Mazo'

beforeEach(() => localStorage.clear())
afterEach(() => {
  act(() => useJuego.getState().salir())
  cleanup()
})

const guardado = () => JSON.parse(localStorage.getItem('truco.perfil') ?? '{}') as Record<string, unknown>

describe('la vista de la mesa: tres valores, migrando la preferencia de antes', () => {
  it('el perfil de antes con los sentados prendidos pasa a "sentados" y se guarda sin el campo viejo', () => {
    localStorage.setItem('truco.perfil', JSON.stringify({ invitadoId: 'inv-1', apodo: 'Ana', mesaBustos: true, ojear: false }))
    expect(leerPerfil().vistaMesa).toBe('sentados')
    expect(guardado().vistaMesa).toBe('sentados')
    expect('mesaBustos' in guardado()).toBe(false)
    // Lo demás queda como estaba.
    expect(guardado().apodo).toBe('Ana')
    expect(guardado().ojear).toBe(false)
  })

  it('apagado, o sin el campo, son los círculos', () => {
    localStorage.setItem('truco.perfil', JSON.stringify({ invitadoId: 'inv-2', apodo: 'Beto', mesaBustos: false }))
    expect(leerPerfil().vistaMesa).toBe('circulos')
    localStorage.setItem('truco.perfil', JSON.stringify({ invitadoId: 'inv-3', apodo: 'Caro' }))
    expect(leerPerfil().vistaMesa).toBe('circulos')
    expect(guardado().vistaMesa).toBe('circulos')
  })

  it('la vista nueva manda sobre el campo viejo, y lo que no existe vuelve a lo de antes', () => {
    expect(vistaGuardada({ vistaMesa: 'perspectiva', mesaBustos: true })).toBe('perspectiva')
    expect(vistaGuardada({ vistaMesa: 'cualquiera', mesaBustos: true })).toBe('sentados')
    expect(vistaGuardada({ vistaMesa: 3 })).toBe('circulos')
    expect(vistaGuardada(null)).toBe('circulos')
  })

  it('se elige también con ?vista= en la dirección', () => {
    vistaDesdeUrl('?vista=perspectiva')
    expect(leerPerfil().vistaMesa).toBe('perspectiva')
    vistaDesdeUrl('?vista=nada')
    expect(leerPerfil().vistaMesa).toBe('perspectiva')
    vistaDesdeUrl('?vista=sentados')
    expect(leerPerfil().vistaMesa).toBe('sentados')
  })
})

describe('homografía del paño inclinado', () => {
  it('lleva el cuadrado a las esquinas y la inversa lo trae de vuelta', () => {
    // Un trapecio: el borde de lejos más angosto, como el paño en perspectiva.
    const esquinas: [Punto, Punto, Punto, Punto] = [
      [90, 200],
      [270, 200],
      [300, 510],
      [60, 510],
    ]
    const m = homografia(esquinas)
    const cuadrado: Punto[] = [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ]
    cuadrado.forEach((p, i) => {
      const [x, y] = aplicar(m, p)
      expect(x).toBeCloseTo(esquinas[i]![0], 6)
      expect(y).toBeCloseTo(esquinas[i]![1], 6)
    })
    const [u, v] = aplicar(invertir(m), aplicar(m, [0.3, 0.7]))
    expect(u).toBeCloseTo(0.3, 6)
    expect(v).toBeCloseTo(0.7, 6)
    // Lo de lejos se ve más chico: la mitad del paño queda más arriba de la mitad de la pantalla.
    expect(aplicar(m, [0.5, 0.5])[1]).toBeLessThan(355)
  })
})

/** Una mesa contra bots quietos, con la vista en perspectiva. */
function mesa(formato: Formato) {
  localStorage.setItem('truco.perfil', JSON.stringify({ invitadoId: 'inv-persp', apodo: 'Luis', ojear: false, vistaMesa: 'perspectiva' }))
  act(() =>
    useJuego
      .getState()
      .conectar(new ConexionLocal({ apodo: 'Luis', avatar: '', formato, nivelBots: 'facil', demoraBots: [1e9, 1e9], semilla: 183 })),
  )
  return render(
    <MemoryRouter initialEntries={['/mesa']}>
      <Mesa />
    </MemoryRouter>,
  ).container
}

describe('el mazo en la mesa en perspectiva', () => {
  it('en 3 contra 3 va siempre a una esquina: a los costados están las dos pilas de cada lado', () => {
    for (let rel = 0; rel < 6; rel++) {
      const [x, y] = lugarMazo(6, rel, true)
      expect(x < 20 || x > 80).toBe(true)
      expect(y < 20 || y > 80).toBe(true)
    }
  })

  it('en 2 contra 2 queda en las esquinas, afuera del medio donde van las pilas', () => {
    for (let rel = 0; rel < 4; rel++) {
      const [x, y] = lugarMazo(4, rel, true)
      expect(x < 20 || x > 80).toBe(true)
      expect(y < 25 || y > 75).toBe(true)
    }
  })

  it('las otras vistas no cambian', () => {
    expect(lugarMazo(6, 1)).toEqual([86, 50])
    expect(lugarMazo(4, 3)).toEqual([16, 83])
  })
})

describe('mesa en perspectiva', () => {
  it.each([
    ['1v1', 2],
    ['2v2', 4],
    ['3v3', 6],
  ] as const)('en %s: el paño inclinado con el mazo, y los demás parados de medio cuerpo alrededor', async (formato, n) => {
    const c = mesa(formato)
    await waitFor(() => expect(c.querySelector(`.pantalla-mesa.n-${n}.mesa-perspectiva`)).toBeTruthy())
    // No es la de bustos ni la de círculos.
    expect(c.querySelector('.mesa-bustos')).toBeNull()
    const panio = c.querySelector('.tapete > .panio')!
    expect(panio).toBeTruthy()
    // Lo que se apoya en la mesa va en el paño; los asientos, afuera (planos, de frente).
    expect(panio.querySelector('.mazo')).toBeTruthy()
    expect(panio.querySelector('.cartas-en-mesa')).toBeTruthy()
    expect(panio.querySelectorAll('.esquina-panio')).toHaveLength(4)
    expect(panio.querySelectorAll('.ancla-asiento')).toHaveLength(n)
    expect(panio.querySelector('.asiento')).toBeNull()
    await waitFor(() => expect(c.querySelectorAll('.tapete > .asiento svg.avatar-dibujo')).toHaveLength(n - 1), { timeout: 5000 })
    for (const svg of c.querySelectorAll('.asiento svg.avatar-dibujo')) expect(svg.classList).toContain('encuadre-busto')
    // Tu mano y tu lugar quedan como siempre, fuera del paño.
    expect(c.querySelector('.mi-lugar .mi-mano')).toBeTruthy()
    expect(c.querySelector('.mi-info .avatar-dibujo')?.classList).toContain('encuadre-cara')
  })
})
