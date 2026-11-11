import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { esPieza, fuerza, mismaCarta, type Carta } from '@truco/engine'
import { estrellasPorErrores, LECCIONES, leccionAbierta, proximaLeccion } from '@truco/shared'
import { Aprender, LeccionTutorial } from '../src/pantallas/Aprender'
import { cartasConPalo, cartasConPiezas, explicar, ganadora, manoParaOrdenar, muestraPieza, parParaComparar, piezasDe } from '../src/tutorial/cartas'
import { pasosDe } from '../src/tutorial/lecciones'
import { recargarTutorial, useTutorial } from '../src/tutorial/progreso'
import { TarjetaAprender } from '../src/tutorial/TarjetaAprender'

const c = (numero: Carta['numero'], palo: Carta['palo']): Carta => ({ numero, palo })

/** Un azar con semilla, para que las rondas se repitan. */
function conSemilla(semilla: number) {
  let s = semilla
  return () => {
    s = (s * 1103515245 + 12345) % 2 ** 31
    return s / 2 ** 31
  }
}

beforeEach(() => {
  localStorage.clear()
  recargarTutorial()
})
afterEach(cleanup)

function abrir(ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/" element={<TarjetaAprender />} />
        <Route path="/aprender" element={<Aprender />} />
        <Route path="/aprender/:leccion" element={<LeccionTutorial />} />
      </Routes>
    </MemoryRouter>,
  )
}

const seguir = () => fireEvent.click(screen.getByRole('button', { name: /^(Seguir|Terminar)$/ }))

describe('la ruta del tutorial', () => {
  it('se abre de a una lección; las que no están dicen próximamente', () => {
    expect(leccionAbierta({}, 'historia')).toBe(true)
    expect(leccionAbierta({}, 'baraja')).toBe(false)
    expect(leccionAbierta({ historia: 1 }, 'baraja')).toBe(true)
    expect(leccionAbierta({ historia: 3, baraja: 3, jerarquia: 3, piezas: 3 }, 'vueltas')).toBe(true)
    expect(proximaLeccion({ historia: 2 })?.id).toBe('baraja')
    expect(proximaLeccion({ historia: 3, baraja: 3, jerarquia: 3, piezas: 3 })?.id).toBe('vueltas')
    expect([0, 1, 2, 3, 9].map(estrellasPorErrores)).toEqual([3, 2, 2, 1, 1])
    // Cada lección disponible tiene sus pasos.
    for (const l of LECCIONES) expect(pasosDe(l.id) !== null).toBe(l.disponible)
  })

  it('en la ruta, la primera está abierta y las demás con candado o próximamente', () => {
    abrir('/aprender')
    expect((screen.getByRole('button', { name: 'Lección 1: Un poco de historia' }) as HTMLButtonElement).disabled).toBe(false)
    expect((screen.getByRole('button', { name: 'Lección 2: La baraja' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByRole('button', { name: /Lección 11:/ }).textContent).toContain('Próximamente')
    expect(screen.getByText(/Bienvenido/)).toBeTruthy()
  })

  it('una lección cerrada no se puede abrir por la dirección', () => {
    abrir('/aprender/piezas')
    expect(screen.getByRole('heading', { name: 'Esa lección todavía no está abierta' })).toBeTruthy()
  })

  it('en Jugar, la primera vez invita y después dice por dónde vas', () => {
    abrir('/')
    expect(screen.getByRole('button', { name: /¿Primera vez\? Aprendé a jugar/ })).toBeTruthy()
    cleanup()
    useTutorial.getState().terminar('historia', 3)
    abrir('/')
    expect(screen.getByRole('button', { name: /1 de 11 lecciones · Sigue: La baraja/ })).toBeTruthy()
  })
})

describe('las lecciones', () => {
  it('la historia: se sigue charlando, una pregunta (con un error) y quedan 2 estrellas', () => {
    abrir('/aprender/historia')
    expect(screen.getByRole('status').textContent).toContain('Soy Queiroz')
    for (let i = 0; i < 5; i++) seguir()
    // En la pregunta, no se sigue sin responder.
    expect((screen.getByRole('button', { name: 'Terminar' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: 'No tiene envido' }))
    expect(screen.getByRole('status').textContent).toContain('Pensá en lo que te conté')
    fireEvent.click(screen.getByRole('button', { name: 'La muestra y las piezas' }))
    seguir()
    expect(screen.getByRole('region', { name: 'Lección terminada' }).textContent).toContain('¡Lección terminada!')
    expect(screen.getByLabelText('2 de 3 estrellas')).toBeTruthy()
    expect(useTutorial.getState().progreso.historia).toBe(2)
    expect(JSON.parse(localStorage.getItem('truco.tutorial')!)).toEqual({ historia: 2 })
    // Y se pasa a la siguiente, de cero.
    fireEvent.click(screen.getByRole('button', { name: 'Siguiente: La baraja' }))
    expect(screen.getByRole('heading', { name: 'La baraja' })).toBeTruthy()
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe('1')
  })

  it('la baraja: se tocan las espadas; tocar otra es un error y Don Queiroz dice por qué', () => {
    useTutorial.getState().terminar('historia', 3)
    abrir('/aprender/baraja')
    for (let i = 0; i < 3; i++) seguir()
    const otra = screen.getAllByRole('button', { name: /^El .* de (bastos|oros|copas)$/ })[0]!
    fireEvent.click(otra)
    expect(screen.getByRole('status').textContent).toContain('Las espadas son las finitas')
    const espadas = screen.getAllByRole('button', { name: /^El .* de espadas$/ })
    expect(espadas).toHaveLength(4)
    for (const e of espadas) fireEvent.click(e)
    expect(screen.getByRole('status').textContent).toContain('¡Las encontraste todas!')
    seguir()
    fireEvent.click(screen.getByRole('button', { name: 'El 8 y el 9' }))
    seguir()
    expect(useTutorial.getState().progreso.baraja).toBe(2)
  })
})

describe('las cartas de los ejercicios', () => {
  it('quién gana sin muestra y con muestra', () => {
    expect(ganadora(c(1, 'espada'), c(1, 'basto'), null)).toBe('a')
    expect(ganadora(c(3, 'oro'), c(3, 'copa'), null)).toBe('parda')
    expect(ganadora(c(12, 'copa'), c(1, 'oro'), null)).toBe('b')
    // Sin muestra no hay piezas: el 2 de copas es un dos aunque la "muestra de mentira" sea de copas.
    expect(ganadora(c(2, 'copa'), c(3, 'oro'), null)).toBe('b')
    const muestra = c(6, 'oro')
    expect(ganadora(c(10, 'oro'), c(1, 'espada'), muestra)).toBe('a')
    expect(explicar(c(7, 'espada'), c(3, 'oro'), null)).toBe('El 7 de espadas (una mata) le gana al 3 de oros (un tres).')
    expect(explicar(c(12, 'copa'), c(2, 'copa'), c(2, 'copa'))).toContain('el 12 hace de 2')
  })

  it('las rondas se arman bien', () => {
    const azar = conSemilla(7)
    for (let i = 0; i < 200; i++) {
      const muestra = muestraPieza(azar)
      expect(piezasDe(muestra)).toHaveLength(5)
      expect(piezasDe(muestra).some((x) => x.numero === 12)).toBe(true)
      const [a, b] = parParaComparar(azar, i % 2 ? muestra : null)
      expect(mismaCarta(a, b)).toBe(false)
      if (i % 2) expect(mismaCarta(a, muestra) || mismaCarta(b, muestra)).toBe(false)
      const mano = manoParaOrdenar(azar, muestra)
      expect(new Set(mano.map((x) => fuerza(x, muestra))).size).toBe(3)
      const conPiezas = cartasConPiezas(azar, muestra, 9, 3)
      expect(conPiezas).toHaveLength(9)
      expect(conPiezas.filter((x) => esPieza(x, muestra))).toHaveLength(3)
      const espadas = cartasConPalo(azar, 'espada', 12, 4)
      expect(espadas.filter((x) => x.palo === 'espada')).toHaveLength(4)
    }
  })

  it('Comparar y Ordenar se pueden jugar enteros', () => {
    useTutorial.getState().terminar('historia', 3)
    useTutorial.getState().terminar('baraja', 3)
    abrir('/aprender/jerarquia')
    for (let i = 0; i < 9; i++) seguir()
    // Diez rondas: se responde siempre "Son iguales"; algunas estarán bien y otras no.
    for (let r = 0; r < 10; r++) {
      fireEvent.click(screen.getByRole('button', { name: 'Son iguales (parda)' }))
      if (r < 9) fireEvent.click(screen.getByRole('button', { name: 'Otra' }))
    }
    seguir()
    expect(useTutorial.getState().progreso.jerarquia).toBeDefined()
    expect(screen.queryByRole('group', { name: '¿Cuál gana?' })).toBeNull()
  })
})
