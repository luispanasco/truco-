import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import {
  apply,
  crearConfig,
  crearPartida,
  esPieza,
  ganadorPorVueltas,
  nombreCarta,
  puntosEnvidoNoQuerido,
  puntosEnvidoQuerido,
  valorFalta,
  type CantoEnvido,
  type Carta,
  type EstadoPartida,
} from '@truco/engine'
import { LECCIONES, type IdLeccion } from '@truco/shared'
import { Aprender, LeccionTutorial } from '../src/pantallas/Aprender'
import { aAccion, esDelRival, jugarGuion, motivoInvalida, partidaGuiada, RIVAL, VOS, type ManoGuiada, type Movida } from '../src/tutorial/guion'
import { MANOS_GUIADAS } from '../src/tutorial/lecciones-mano'
import { pasosDe } from '../src/tutorial/lecciones'
import { PAUSA_RIVAL } from '../src/tutorial/ManoGuiada'
import { recargarTutorial, useTutorial } from '../src/tutorial/progreso'

const c = (numero: Carta['numero'], palo: Carta['palo']): Carta => ({ numero, palo })

beforeEach(() => {
  localStorage.clear()
  recargarTutorial()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

/** Lo que se lleva cada uno al terminar cada mano guiada. */
const PUNTOS: Record<keyof typeof MANOS_GUIADAS, [number, number]> = {
  GANAR_DOS: [1, 0],
  UNA_Y_UNA: [1, 0],
  PRIMERA_PARDA: [1, 0],
  NO_SE_QUIERE: [0, 1],
  VALE_CUATRO: [4, 0],
  ENVIDO_NO_QUERIDO: [2, 0],
  ENVIDO_VA_PRIMERO: [5, 1],
}

describe('los guiones de las manos guiadas', () => {
  for (const [nombre, m] of Object.entries(MANOS_GUIADAS) as [keyof typeof MANOS_GUIADAS, ManoGuiada][]) {
    it(`${nombre}: el motor acepta cada paso, los botones son válidos y termina como dice`, () => {
      let estado = partidaGuiada(m)
      // Sin flor (la flor es otra lección) y el que dice el guion es mano.
      expect(estado.mano.tantos.every((t) => t.florReal === null)).toBe(true)
      expect(estado.mano.mano).toBe(m.mano === 'vos' ? 0 : 1)
      for (const p of m.guion) {
        if (!esDelRival(p)) {
          // Lo pedido es válido, y los botones que se muestran también (salvo "son buenas" con más
          // tanto, que está de trampa: el motor no lo deja y Don Queiroz explica por qué).
          expect(motivoInvalida(estado, p.espera, VOS)).toBeNull()
          for (const b of p.botones ?? []) {
            const motivo = motivoInvalida(estado, b, VOS)
            expect(motivo === null || motivo === 'Tenés más: lo tenés que decir').toBe(true)
          }
        }
        const r = apply(estado, aAccion(esDelRival(p) ? p.rival : p.espera, esDelRival(p) ? RIVAL : VOS))
        expect(r.ok).toBe(true)
        if (r.ok) estado = r.estado
      }
      const fin = jugarGuion(m)
      expect(fin.ok).toBe(true)
      if (!fin.ok) return
      // Terminó la mano (el motor ya repartió la siguiente) con los puntos esperados.
      expect(fin.eventos.some((e) => e.tipo === 'enfrentamientoTerminado')).toBe(true)
      expect(fin.final.puntos).toEqual(PUNTOS[nombre])
    })
  }

  it('en las vueltas no hay piezas: la muestra no toca ninguna carta', () => {
    for (const m of [MANOS_GUIADAS.GANAR_DOS, MANOS_GUIADAS.UNA_Y_UNA, MANOS_GUIADAS.PRIMERA_PARDA]) {
      expect([...m.vos, ...m.rival].some((c) => esPieza(c, m.muestra))).toBe(false)
    }
  })

  it('los tantos que dice Don Queiroz son los del motor', () => {
    const tanto = (m: ManoGuiada) => partidaGuiada(m).mano.tantos.map((t) => t.envidoReal)
    expect(tanto(MANOS_GUIADAS.ENVIDO_NO_QUERIDO)[0]).toBe(33)
    expect(tanto(MANOS_GUIADAS.ENVIDO_VA_PRIMERO)).toEqual([31, 27])
  })
})

describe('las reglas que se enseñan, según el motor', () => {
  const nueva = () =>
    crearPartida({
      jugadores: [
        { id: 'a', nombre: 'A' },
        { id: 'b', nombre: 'B' },
      ],
      semilla: 3,
      // Sin flor, que si no la flor va primero.
      repartoFijo: {
        cartas: [
          [c(4, 'oro'), c(5, 'espada'), c(6, 'basto')],
          [c(1, 'basto'), c(3, 'espada'), c(2, 'oro')],
        ],
        muestra: c(12, 'copa'),
      },
    })
  const hacer = (estado: EstadoPartida, ...movidas: [string, Movida][]) =>
    movidas.reduce((e, [j, m]) => {
      const r = apply(e, aAccion(m, j))
      if (!r.ok) throw new Error(r.motivo)
      return r.estado
    }, estado)
  const puntosAlNoQuerer = (cantos: number) => {
    let e = nueva()
    // Cantan por turnos: a canta truco, b sube, a sube… y el último no se quiere.
    for (let k = 0; k < cantos; k++) e = hacer(e, [k % 2 ? 'b' : 'a', { tipo: 'truco' }])
    e = hacer(e, [cantos % 2 ? 'b' : 'a', { tipo: 'noQuiero' }])
    return e.puntos
  }

  it('truco, retruco y vale cuatro: no querido se lleva lo de antes', () => {
    expect(puntosAlNoQuerer(1)).toEqual([1, 0])
    expect(puntosAlNoQuerer(2)).toEqual([0, 2])
    expect(puntosAlNoQuerer(3)).toEqual([3, 0])
  })

  it('sube solo el que quiso, y en su turno', () => {
    const e = hacer(nueva(), ['a', { tipo: 'truco' }], ['b', { tipo: 'quiero' }])
    expect(motivoInvalida(e, { tipo: 'truco' }, 'a')).not.toBeNull()
    // b quiso, pero le toca a a (el mano): sube cuando le toque.
    expect(motivoInvalida(e, { tipo: 'truco' }, 'b')).toBe('No es tu turno')
    const tira = hacer(e, ['a', { tipo: 'carta', carta: e.mano.cartas[0]![0]! }])
    expect(motivoInvalida(tira, { tipo: 'truco' }, 'b')).toBeNull()
  })

  it('el envido: valores, no querido, el envido va primero y solo en la primera', () => {
    const canto = (...cs: CantoEnvido[]) => cs.map((c, i) => ({ canto: c, asiento: i % 2, equipo: (i % 2) as 0 | 1 }))
    expect(puntosEnvidoQuerido(canto('envido'), 0)).toBe(2)
    expect(puntosEnvidoQuerido(canto('realEnvido'), 0)).toBe(3)
    expect(puntosEnvidoQuerido(canto('envido', 'realEnvido'), 0)).toBe(5)
    expect(puntosEnvidoNoQuerido(canto('envido'))).toBe(1)
    expect(puntosEnvidoNoQuerido(canto('envido', 'realEnvido'))).toBe(2)
    // La falta, 9 a 6: al que va ganando le faltan 6 para salir de las malas (15).
    const e = { ...nueva(), puntos: [6, 9] as [number, number] }
    expect(crearConfig().puntosMalas).toBe(15)
    expect(valorFalta(e, 0)).toBe(6)
    // Con el truco sin contestar, el envido va primero; querido el truco, ya no.
    const conTruco = hacer(nueva(), ['a', { tipo: 'truco' }])
    expect(motivoInvalida(conTruco, { tipo: 'envido', canto: 'envido' }, 'b')).toBeNull()
    const querido = hacer(conTruco, ['b', { tipo: 'quiero' }])
    expect(motivoInvalida(querido, { tipo: 'envido', canto: 'envido' }, 'a')).toBe('Ya se aceptó el truco')
    // Tirada la carta de la primera, ya no.
    const n = nueva()
    const tiro = hacer(n, ['a', { tipo: 'carta', carta: n.mano.cartas[0]![0]! }])
    expect(motivoInvalida(tiro, { tipo: 'envido', canto: 'envido' }, 'a')).not.toBeNull()
  })

  it('las pardas', () => {
    expect(ganadorPorVueltas([0, 'parda'], 1)).toBe(0)
    expect(ganadorPorVueltas(['parda', 1], 0)).toBe(1)
    expect(ganadorPorVueltas([1, 0, 'parda'], 0)).toBe(1)
    expect(ganadorPorVueltas(['parda', 'parda', 'parda'], 0)).toBe(0)
  })
})

function abrir(ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/aprender" element={<Aprender />} />
        <Route path="/aprender/:leccion" element={<LeccionTutorial />} />
      </Routes>
    </MemoryRouter>,
  )
}

const seguir = () => fireEvent.click(screen.getByRole('button', { name: /^(Seguir|Terminar)$/ }))
const esperarRival = () => act(() => vi.advanceTimersByTime(PAUSA_RIVAL + 10))
const habla = () => screen.getByRole('status').textContent ?? ''

/** El botón que hace la movida (las cartas, por su nombre). */
function boton(m: Movida): HTMLElement {
  const nombres: Record<string, RegExp> = {
    truco: /^(Truco|Retruco|Vale cuatro)$/,
    quiero: /^Quiero$/,
    noQuiero: /^No quiero$/,
    mazo: /^Me voy al mazo$/,
  }
  if (m.tipo === 'carta') return screen.getByRole('button', { name: `Tirar el ${nombreCarta(m.carta)}` })
  if (m.tipo === 'envido') return screen.getByRole('button', { name: { envido: 'Envido', realEnvido: 'Real envido', faltaEnvido: 'Falta envido' }[m.canto] })
  if (m.tipo === 'tanto') return screen.getByRole('button', { name: m.tanto === 'sonBuenas' ? 'Son buenas' : `Tengo ${m.tanto}` })
  return screen.getByRole('button', { name: nombres[m.tipo] })
}

/** Juega una mano guiada haciendo lo que se pide. */
function jugarMano(m: ManoGuiada, yaEmpezada = false) {
  expect((screen.getByRole('button', { name: /^(Seguir|Terminar)$/ }) as HTMLButtonElement).disabled).toBe(true)
  for (const [k, p] of m.guion.entries()) {
    if (esDelRival(p)) esperarRival()
    else {
      if (k > 0 || !yaEmpezada) expect(habla()).toBe(p.pide)
      fireEvent.click(boton(p.espera))
    }
  }
  expect(habla()).toBe(m.fin)
}

/** Hace la lección entera sin errores. */
function hacerLeccion(id: IdLeccion) {
  for (const p of pasosDe(id)!) {
    if (p.tipo === 'mano') jugarMano(p.mano)
    if (p.tipo === 'pregunta') fireEvent.click(screen.getByRole('button', { name: p.opciones[p.correcta]! }))
    seguir()
  }
}

describe('las lecciones con manos guiadas', () => {
  const hasta = (id: IdLeccion) => {
    // Las anteriores, terminadas (aunque alguna todavía no esté hecha).
    const i = LECCIONES.findIndex((l) => l.id === id)
    for (const l of LECCIONES.slice(0, i)) useTutorial.getState().terminar(l.id, 3)
  }

  for (const id of ['vueltas', 'cantos', 'envidoEnJuego'] as IdLeccion[]) {
    it(`${id}: se completa haciendo lo pedido, con 3 estrellas`, () => {
      vi.useFakeTimers()
      hasta(id)
      abrir(`/aprender/${id}`)
      hacerLeccion(id)
      expect(useTutorial.getState().progreso[id]).toBe(3)
    })
  }

  it('hacer otra cosa cuenta un error: Don Queiroz explica y se puede reintentar', () => {
    vi.useFakeTimers()
    hasta('vueltas')
    abrir('/aprender/vueltas')
    for (let k = 0; k < 3; k++) seguir()
    // Te pide abrir con el 3 de espadas y tirás el 7 de oros.
    fireEvent.click(screen.getByRole('button', { name: 'Tirar el 7 de oros' }))
    expect(habla()).toContain('guardala para después')
    expect(screen.getByRole('button', { name: 'Tirar el 7 de oros' }).className).toContain('mal')
    // La carta sigue en la mano: se reintenta y sigue el guion.
    jugarMano(MANOS_GUIADAS.GANAR_DOS, true)
    expect(screen.getByLabelText('Lo que vale la mano').textContent).toContain('Mano para vos: +1')
    expect(screen.getByLabelText('1ª vuelta: Ganaste')).toBeTruthy()
    seguir()
    // Y un canto equivocado también: en la de truco, querer con las peores cartas.
    cleanup()
    hasta('cantos')
    abrir('/aprender/cantos')
    for (let k = 0; k < 4; k++) seguir()
    esperarRival()
    expect(screen.getByLabelText('Don Queiroz dice: ¡Truco!')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Quiero' }))
    expect(habla()).toContain('me llevo 2')
    fireEvent.click(screen.getByRole('button', { name: 'Tirar el 4 de oros' }))
    expect(habla()).toContain('Primero contestá el truco')
    fireEvent.click(screen.getByRole('button', { name: 'No quiero' }))
    expect(habla()).toBe(MANOS_GUIADAS.NO_SE_QUIERE.fin)
    seguir()
    // Termina con 2 errores en total: 2 estrellas.
    jugarMano(MANOS_GUIADAS.VALE_CUATRO)
    seguir()
    for (const p of pasosDe('cantos')!.slice(6)) {
      if (p.tipo === 'pregunta') fireEvent.click(screen.getByRole('button', { name: p.opciones[p.correcta]! }))
      seguir()
    }
    expect(useTutorial.getState().progreso.cantos).toBe(2)
  })
})
