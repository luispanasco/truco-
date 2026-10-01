import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { mostrarBaraja, useBaraja } from '../src/baraja'
import { Carta } from '../src/componentes/Carta'
import { TarjetaPerfil, usePerfil } from '../src/componentes/TarjetaPerfil'
import {
  conTope,
  estaOjeada,
  franja,
  moverCarta,
  posicionTope,
  TOPE_CORTES,
  ZONA_CORTES,
  ZONA_INDICE,
  ZONA_SEPARACION,
  ZONAS_FOURNIER,
  ZONAS_OJEO,
  ZONAS_PROPIA,
  zonaVisible,
} from '../src/ojeo'
import { leerPerfil } from '../src/perfil'

const imagen = (el: HTMLElement) => el.querySelector('img')?.getAttribute('src') ?? null

beforeEach(() => {
  localStorage.clear()
  act(() => mostrarBaraja('propia'))
})
afterEach(cleanup)

describe('Carta según la baraja', () => {
  it('con la propia dibuja el SVG', () => {
    render(<Carta carta={{ numero: 1, palo: 'espada' }} />)
    const carta = screen.getByRole('img', { name: '1 de espadas' })
    expect(carta.querySelector('svg')).not.toBeNull()
    expect(imagen(carta)).toBeNull()
  })

  it('con la clásica muestra la imagen de esa carta, con el mismo nombre accesible', () => {
    act(() => mostrarBaraja('fournier1878'))
    render(<Carta carta={{ numero: 1, palo: 'espada' }} tam="mesa" />)
    const carta = screen.getByRole('img', { name: '1 de espadas' })
    expect(carta.classList.contains('carta-clasica')).toBe(true)
    expect(imagen(carta)).toBe('/barajas/fournier-1878/1-espada.webp')
    expect(carta.querySelector('svg')).toBeNull()
    // La imagen es decorativa: el nombre lo lleva la carta.
    expect(carta.querySelector('img')?.getAttribute('alt')).toBe('')
  })

  it('el botón para jugar y el dorso también cambian', () => {
    act(() => mostrarBaraja('fournier1878'))
    render(
      <>
        <Carta carta={{ numero: 12, palo: 'oro' }} jugable alTocar={() => {}} />
        <Carta oculta tam="chica" />
      </>,
    )
    expect(imagen(screen.getByRole('button', { name: 'Jugar el 12 de oros' }))).toBe('/barajas/fournier-1878/12-oro.webp')
    expect(imagen(screen.getByLabelText('carta boca abajo'))).toBe('/barajas/fournier-1878/dorso.webp')
  })

  it('se puede forzar una baraja (las miniaturas del selector)', () => {
    render(<Carta carta={{ numero: 7, palo: 'copa' }} baraja="fournier1878" />)
    expect(imagen(screen.getByRole('img', { name: '7 de copas' }))).toBe('/barajas/fournier-1878/7-copa.webp')
  })
})

describe('elegir la baraja en el perfil', () => {
  function Perfil() {
    const [perfil, cambiar] = usePerfil()
    return <TarjetaPerfil perfil={perfil} cambiar={cambiar} />
  }

  it('por defecto es la propia', () => {
    expect(leerPerfil().baraja).toBe('propia')
    render(<Perfil />)
    expect(screen.getByRole('radio', { name: 'Propia' }).getAttribute('aria-checked')).toBe('true')
  })

  it('la elección queda guardada y redibuja las cartas', () => {
    render(
      <>
        <Perfil />
        <Carta carta={{ numero: 3, palo: 'basto' }} />
      </>,
    )
    const clasica = screen.getByRole('radio', { name: /Clásica 1878.*Fournier 1878 · dominio público/ })
    fireEvent.click(clasica)
    expect(clasica.getAttribute('aria-checked')).toBe('true')
    expect(leerPerfil().baraja).toBe('fournier1878')
    expect(useBaraja.getState().baraja).toBe('fournier1878')
    expect(imagen(screen.getByRole('img', { name: '3 de bastos' }))).toBe('/barajas/fournier-1878/3-basto.webp')
    // Cambiar otra cosa del perfil después no pisa la baraja.
    fireEvent.change(screen.getByPlaceholderText('¿Cómo te dicen?'), { target: { value: 'Luis' } })
    expect(leerPerfil()).toMatchObject({ apodo: 'Luis', baraja: 'fournier1878' })
  })

  it('un valor guardado que no es una baraja vuelve a la propia', () => {
    localStorage.setItem('truco.perfil', JSON.stringify({ apodo: 'Luis', baraja: 'tarot' }))
    expect(leerPerfil().baraja).toBe('propia')
  })
})

describe('zonas del ojeo por baraja', () => {
  const ALTO = 132 // la carta grande de la mano en un celular

  it('la propia queda como estaba', () => {
    expect(ZONAS_OJEO.propia).toBe(ZONAS_PROPIA)
    expect(ZONAS_PROPIA).toEqual({ cortes: ZONA_CORTES, separacion: ZONA_SEPARACION, indice: ZONA_INDICE, tope: TOPE_CORTES })
    expect(franja(ALTO)).toBeCloseTo(0.3 * ALTO)
  })

  it('la clásica: cortes arriba, el número enseguida y el tope entre los dos', () => {
    const z = ZONAS_OJEO.fournier1878
    expect(z).toBe(ZONAS_FOURNIER)
    expect(z.cortes.desde).toBe(0)
    expect(z.cortes.hasta).toBe(z.separacion.desde)
    expect(z.separacion.hasta).toBe(z.indice.desde)
    expect(z.tope).toBeGreaterThanOrEqual(z.cortes.hasta)
    expect(z.tope).toBeLessThanOrEqual(z.indice.desde)
    // Mucho más chica que la de la propia: el número de Fournier está arriba de todo.
    expect(z.indice.hasta).toBeLessThan(ZONA_INDICE.hasta / 2)
    expect(franja(ALTO, z)).toBeCloseTo(z.indice.hasta * ALTO)
  })

  it('con la clásica, una carta queda ojeada al asomar su franja (más corta)', () => {
    const z = ZONAS_FOURNIER
    const f = franja(ALTO, z)
    expect(estaOjeada(1, [f - 2, 0, 0], ALTO, z)).toBe(false)
    expect(estaOjeada(1, [f, 0, 0], ALTO, z)).toBe(true)
    // Con las zonas de la propia, esa misma posición no alcanza.
    expect(estaOjeada(1, [f, 0, 0], ALTO)).toBe(false)
    expect(zonaVisible(1, [z.tope * ALTO, 0, 0], ALTO, z)).toBe('cortes')
    // El escalonado completo usa la franja de la clásica.
    expect(moverCarta(0, 500, [0, 0, 0], ALTO, z)).toEqual([2 * f, 0, 0])
  })

  it('el tope de la clásica está justo debajo de la línea y no hace saltar la carta al arrancar', () => {
    const z = ZONAS_FOURNIER
    const t = posicionTope(0, [0, 0, 0], ALTO, z)!
    expect(t).toBeCloseTo(z.tope * ALTO)
    // El radio del tope se achica a lo que hay hasta él: en 0 la carta sigue en 0.
    expect(conTope(0, 0, [0, 0, 0], ALTO, z)).toBeCloseTo(0, 9)
    expect(conTope(0, t, [0, 0, 0], ALTO, z)).toBe(t)
    // Pasado el radio, 1:1 de nuevo.
    expect(conTope(0, 2 * t + 1, [0, 0, 0], ALTO, z)).toBeCloseTo(2 * t + 1, 9)
  })
})
