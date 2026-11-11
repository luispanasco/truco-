import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import type { Senia } from '@truco/bots'
import type { ConfigSala } from '@truco/engine'
import { buscarItem, idMonedas, LECCIONES, MONEDAS_DIPLOMA, PREMIO_DIPLOMA } from '@truco/shared'
import { Aprender, LeccionTutorial } from '../src/pantallas/Aprender'
import { Diploma } from '../src/tutorial/Diploma'
import { FinExamen } from '../src/tutorial/Examen'
import { EQUIPOS, QUE_ANUNCIA, SENIAS_TUTORIAL } from '../src/tutorial/lecciones-equipo'
import { pasosDe } from '../src/tutorial/lecciones'
import { recargarTutorial, useTutorial } from '../src/tutorial/progreso'
import { conexionExamen } from '../src/menu/contraLaCompu'
import { useCuenta } from '../src/cuenta/cuenta'
import { inventarioGuardado } from '../src/cuenta/inventario'
import { useJuego } from '../src/estado'
import { leerPerfil } from '../src/perfil'

beforeEach(() => {
  localStorage.clear()
  recargarTutorial()
  useCuenta.setState({ estado: 'afuera', token: null, cuenta: null, saldo: null })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  useJuego.getState().salir()
})

function Ruta() {
  return <p data-testid="ruta">{useLocation().pathname}</p>
}

function abrir(ruta: string, elemento?: ReactNode) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/" element={<Ruta />} />
        <Route path="/mesa" element={<Ruta />} />
        <Route path="/aprender" element={<Aprender />} />
        <Route path="/aprender/diploma" element={<Diploma />} />
        <Route path="/aprender/:leccion" element={<LeccionTutorial />} />
        <Route path="/fin" element={elemento} />
      </Routes>
    </MemoryRouter>,
  )
}

/** Hasta la lección anterior, todo hecho. */
function hastaAntesDe(id: (typeof LECCIONES)[number]['id']) {
  const i = LECCIONES.findIndex((l) => l.id === id)
  for (const l of LECCIONES.slice(0, i)) useTutorial.getState().terminar(l.id, 3)
}

const seguir = () => fireEvent.click(screen.getByRole('button', { name: /^(Seguir|Terminar)$/ }))
/** La seña que está haciendo Don Queiroz en la pizarra. */
const seniaEnLaCara = () => document.querySelector('.equipo-cara [data-gesto]')!.getAttribute('data-gesto') as Senia

describe('la lección en equipo', () => {
  it('las señas que se enseñan tienen su explicación y la lección tiene sus pasos', () => {
    expect(pasosDe('equipos')).toBe(EQUIPOS)
    for (const s of SENIAS_TUTORIAL) expect(EQUIPOS.some((p) => p.tipo === 'gesto' && p.senia === s), s).toBe(true)
    expect(EQUIPOS.some((p) => p.tipo === 'senias')).toBe(true)
    expect(EQUIPOS.some((p) => p.tipo === 'mesa' && p.marcar === 'pie')).toBe(true)
  })

  it('se hace entera: la mesa, las señas de Don Queiroz, "¿qué seña te hizo?" (con un error) y el pie', () => {
    hastaAntesDe('equipos')
    abrir('/aprender/equipos')
    expect(screen.getByRole('heading', { name: 'En equipo' })).toBeTruthy()
    let errores = 0
    for (const paso of EQUIPOS) {
      if (paso.tipo === 'mesa') {
        expect(screen.getByRole('list', { name: /La mesa/ }).querySelectorAll('[role="listitem"]')).toHaveLength(paso.jugadores)
        if (paso.marcar === 'pie') expect(screen.getAllByText('PIE')).toHaveLength(2)
      }
      if (paso.tipo === 'gesto') {
        expect(seniaEnLaCara()).toBe(paso.senia)
        expect(screen.getByText(QUE_ANUNCIA[paso.senia])).toBeTruthy()
      }
      if (paso.tipo === 'senias') {
        for (let r = 0; r < paso.rondas; r++) {
          expect(screen.getByText(`${r + 1} de ${paso.rondas}`)).toBeTruthy()
          const senia = seniaEnLaCara()
          const grupo = screen.getByRole('group', { name: '¿Qué te dijo?' })
          const opciones = [...grupo.querySelectorAll('button')]
          expect(opciones).toHaveLength(3)
          // En la primera ronda, una mal a propósito.
          const elegida = r === 0 ? opciones.find((b) => b.textContent !== QUE_ANUNCIA[senia])! : opciones.find((b) => b.textContent === QUE_ANUNCIA[senia])!
          if (r === 0) errores++
          fireEvent.click(elegida)
          expect(screen.getByRole('status').textContent).toMatch(r === 0 ? /^No…/ : /^¡Bien!/)
          if (r < paso.rondas - 1) fireEvent.click(screen.getByRole('button', { name: 'Otra seña' }))
        }
      }
      if (paso.tipo === 'pregunta') fireEvent.click(screen.getByRole('button', { name: paso.opciones[paso.correcta]! }))
      seguir()
    }
    expect(errores).toBe(1)
    expect(screen.getByRole('heading', { name: '¡Lección terminada!' })).toBeTruthy()
    expect(useTutorial.getState().progreso.equipos).toBe(2)
    expect(screen.getByRole('button', { name: 'Siguiente: El examen' })).toBeTruthy()
  })

  it('Don Queiroz repite la seña una y otra vez', () => {
    vi.useFakeTimers()
    try {
      hastaAntesDe('equipos')
      abrir('/aprender/equipos')
      for (let i = 0; i < 4; i++) seguir()
      const antes = document.querySelector('.equipo-cara [data-gesto]')
      act(() => vi.advanceTimersByTime(2700))
      expect(document.querySelector('.equipo-cara [data-gesto]')).not.toBe(antes)
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('el examen', () => {
  it('es mano a mano contra la compu en fácil, a 20 (10 y 10), con ayudas', () => {
    const c = conexionExamen({ ...leerPerfil(), apodo: '', ayudas: false, puntosPartida: 30, formato: '3v3' })
    expect(c.examen).toBe(true)
    const op = (c as unknown as { op: { formato: string; nivelBots: string; ayudas: boolean; apodo: string } }).op
    expect(op).toMatchObject({ formato: '1v1', nivelBots: 'facil', ayudas: true, apodo: 'Vos' })
    expect((c as unknown as { config: ConfigSala }).config).toMatchObject({ puntosPartida: 20, puntosMalas: 10 })
  })

  it('Don Queiroz lo presenta y el botón lleva a la mesa', () => {
    hastaAntesDe('examen')
    abrir('/aprender/examen')
    for (let i = 0; i < 3; i++) seguir()
    expect(screen.queryByRole('button', { name: /^(Seguir|Terminar)$/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '¡A la mesa!' }))
    expect(screen.getByTestId('ruta').textContent).toBe('/mesa')
    expect(useJuego.getState().conexion?.examen).toBe(true)
  })

  it('al ganar se anota con 3 estrellas y se va al diploma', () => {
    abrir('/fin', <FinExamen ganamos revancha={() => {}} />)
    expect(useTutorial.getState().progreso.examen).toBe(3)
    expect(screen.getByText(/Te ganaste el diploma/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Ver tu diploma' }))
    expect(screen.getByRole('heading', { name: 'Diploma' })).toBeTruthy()
  })

  it('al perder no se anota: ánimo y revancha', () => {
    const revancha = vi.fn()
    abrir('/fin', <FinExamen ganamos={false} revancha={revancha} />)
    expect(useTutorial.getState().progreso.examen).toBeUndefined()
    expect(screen.getByText(/Casi/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Ver tu diploma' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Revancha' }))
    expect(revancha).toHaveBeenCalled()
  })
})

describe('la graduación', () => {
  it('sin recibirte, no hay diploma', () => {
    abrir('/aprender/diploma')
    expect(screen.getByRole('heading', { name: 'Todavía no te recibiste' })).toBeTruthy()
  })

  it('sin cuenta: el diploma y el premio, que queda guardado para cobrar al entrar', () => {
    useTutorial.getState().terminar('examen', 3)
    abrir('/aprender/diploma')
    const diploma = screen.getByRole('region', { name: 'Diploma' })
    expect(diploma.textContent).toContain('Te recibiste de truquero')
    expect(diploma.textContent).toContain('Don Queiroz')
    const premio = screen.getByRole('region', { name: 'Tu premio' })
    expect(premio.textContent).toContain(`${MONEDAS_DIPLOMA} monedas`)
    expect(premio.textContent).toContain(buscarItem(PREMIO_DIPLOMA)!.nombre)
    expect(premio.textContent).toContain('Entrá a tu cuenta')
    // En la ruta, el botón para volver a verlo.
    cleanup()
    abrir('/aprender')
    expect(screen.getByRole('button', { name: /Ver tu diploma/ })).toBeTruthy()
  })

  it('con cuenta: se cobra en el servidor (las monedas y los Naipes)', async () => {
    const pedidos: string[] = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        pedidos.push(url)
        return Response.json({ nuevas: [idMonedas(MONEDAS_DIPLOMA), PREMIO_DIPLOMA], inventario: [PREMIO_DIPLOMA], saldo: 450 })
      }),
    )
    useCuenta.setState({
      estado: 'adentro',
      token: 'prueba:luis@ejemplo.com',
      cuenta: { id: 'c1', email: 'luis@ejemplo.com', apodo: 'Luis', avatar: null, preferencias: {}, nueva: false },
    })
    useTutorial.getState().terminar('examen', 3)
    abrir('/aprender/diploma')
    await waitFor(() => expect(screen.getByRole('region', { name: 'Tu premio' }).textContent).toContain('¡Listo!'))
    expect(pedidos.some((u) => u.endsWith('/tutorial/recibirse'))).toBe(true)
    expect(useCuenta.getState().saldo).toBe(450)
    expect(inventarioGuardado().has(PREMIO_DIPLOMA)).toBe(true)
  })
})
