import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { barajaGratis, DEPARTAMENTOS, elencoDelNivel, HISTORIAS, idBaraja, nivelesPorTamanio, nombreRecompensa, permisosDe } from '@truco/shared'
import { useCuenta } from '../src/cuenta/cuenta'
import { useHistoria } from '../src/cuenta/historia'
import { fijarInventario } from '../src/cuenta/inventario'
import type { ConexionLocal } from '../src/conexion/local'
import { conexionHistoria } from '../src/menu/contraLaCompu'
import { leerPerfil } from '../src/perfil'
import type { MensajeServidor } from '../src/conexion/tipos'
import { FinHistoria } from '../src/componentes/FinHistoria'
import { DepartamentoHistoria, Historia, PreviaNivel } from '../src/pantallas/Historia'
import { useJuego } from '../src/estado'

const ROCHA = HISTORIAS.rocha!

/** Un servidor de cuentas falso con el modo historia: lo que se ganó y lo que se pidió. */
function servidorFalso(progreso: Record<string, number[]> = {}) {
  const pedidos: { url: string; cuerpo: unknown }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const cuerpo = init?.body ? JSON.parse(String(init.body)) : undefined
      pedidos.push({ url, cuerpo })
      if (url.endsWith('/historia')) return Response.json({ progreso })
      if (url.endsWith('/historia/ganar')) {
        const { nivel } = cuerpo as { nivel: number }
        progreso.rocha = [...new Set([...(progreso.rocha ?? []), nivel])]
        return Response.json({ progreso, nuevas: ROCHA.niveles[nivel - 1]!.recompensas, inventario: ROCHA.niveles[nivel - 1]!.recompensas })
      }
      return Response.json({})
    }),
  )
  return pedidos
}

function comoAdmin(admin = true) {
  useCuenta.setState({
    estado: 'adentro',
    token: 'prueba:luis@ejemplo.com',
    cuenta: { id: 'c1', email: 'luis@ejemplo.com', apodo: 'Luis', avatar: null, preferencias: {}, admin, nueva: false },
  })
}

function Ruta() {
  return <p data-testid="ruta">{useLocation().pathname}</p>
}

function app(ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/historia" element={<Historia />} />
        <Route path="/historia/:departamento" element={<DepartamentoHistoria />} />
        <Route path="/historia/:departamento/:nivel" element={<PreviaNivel />} />
        <Route path="*" element={<Ruta />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  useHistoria.setState({ progreso: null })
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  act(() => useJuego.getState().salir())
  useCuenta.setState({ estado: 'afuera', token: null, cuenta: null })
  fijarInventario([], false)
})

describe('los datos del modo historia', () => {
  it('19 departamentos; Rocha tiene los niveles que le tocan por tamaño y cada nivel su elenco', () => {
    expect(DEPARTAMENTOS).toHaveLength(19)
    expect(ROCHA.niveles).toHaveLength(nivelesPorTamanio(10_551))
    expect([nivelesPorTamanio(530), nivelesPorTamanio(9_008), nivelesPorTamanio(15_438)]).toEqual([3, 4, 5])
    // La dificultad sube nivel a nivel.
    expect(ROCHA.niveles.map((n) => n.nivelBots)).toEqual(['facil', 'medio', 'dificil', 'muyDificil', 'master'])
    for (const nivel of ROCHA.niveles) {
      const elenco = elencoDelNivel(nivel)
      expect(elenco).toHaveLength({ '1v1': 1, '2v2': 3, '3v3': 5 }[nivel.formato])
      // En el 1 se sienta el personaje del departamento.
      expect(elenco[0]!.id).toBe(ROCHA.jefe)
      expect(nivel.frases.length).toBeGreaterThanOrEqual(2)
      for (const r of nivel.recompensas) expect(nombreRecompensa(r)).not.toBe(r)
    }
    expect(nombreRecompensa(idBaraja('costa'))).toBe('Baraja Costa Uruguaya')
  })

  it('la baraja de la costa se gana: sin tenerla no se puede usar', () => {
    expect(barajaGratis('costa')).toBe(false)
    expect(barajaGratis('propia')).toBe(true)
    expect(permisosDe([]).baraja('costa')).toBe(false)
    expect(permisosDe([idBaraja('costa')]).baraja('costa')).toBe(true)
  })
})

describe('pantallas', () => {
  it('sin ser admin, está en preparación', () => {
    servidorFalso()
    comoAdmin(false)
    app('/historia')
    expect(screen.getByText(/Se está armando/)).toBeTruthy()
  })

  it('el mapa: Rocha se juega y los demás dicen "Próximamente"', async () => {
    servidorFalso({ rocha: [1, 2] })
    comoAdmin()
    app('/historia')
    const rocha = await screen.findByRole('button', { name: /Rocha.*2 de 5 niveles/ })
    expect((rocha as HTMLButtonElement).disabled).toBe(false)
    expect((screen.getByRole('button', { name: /Montevideo.*Próximamente · 3 niveles/ }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(rocha)
    expect(screen.getByRole('heading', { name: 'Rocha' })).toBeTruthy()
  })

  it('Rocha: los niveles se abren de a uno y dicen su premio', async () => {
    servidorFalso({ rocha: [1] })
    comoAdmin()
    app('/historia/rocha')
    await waitFor(() => expect((screen.getByRole('button', { name: 'Jugar el nivel 2' }) as HTMLButtonElement).disabled).toBe(false))
    expect(screen.getByRole('button', { name: 'Volver a jugar el nivel 1' })).toBeTruthy()
    expect((screen.getByRole('button', { name: 'Jugar el nivel 3' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/Premio: Baraja Costa Uruguaya y Mesa Rocha/)).toBeTruthy()
  })

  it('la previa: el rival dice sus frases de a una y "¡A jugar!" arranca el nivel en su mesa', async () => {
    servidorFalso({ rocha: [1] })
    comoAdmin()
    app('/historia/rocha/2')
    const nivel = ROCHA.niveles[1]!
    expect(await screen.findByRole('heading', { name: nivel.lugar })).toBeTruthy()
    for (const frase of nivel.frases.slice(0, -1)) {
      await screen.findByText(frase)
      fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    }
    await screen.findByText(nivel.frases.at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: '¡A jugar!' }))
    expect(screen.getByTestId('ruta').textContent).toBe('/mesa')
    const conexion = useJuego.getState().conexion as ConexionLocal
    expect(conexion.historia).toEqual({ departamento: 'rocha', nivel: 2 })
  })

  it('un nivel cerrado no se puede abrir por la dirección', async () => {
    servidorFalso({})
    comoAdmin()
    app('/historia/rocha/3')
    await waitFor(() => expect(screen.getByText(/Se está armando/)).toBeTruthy())
  })
})

describe('la partida de un nivel', () => {
  it('sienta al elenco del nivel en su lugar, en la mesa de Rocha, a los puntos del nivel', async () => {
    const sala = await new Promise<Extract<MensajeServidor, { tipo: 'sala' }>['datos']>((resolve) => {
      const c = conexionHistoria(leerPerfil(), { departamento: 'rocha', nivel: 4 })
      c.escuchar((m) => {
        if (m.tipo !== 'sala') return
        c.salir()
        resolve(m.datos)
      })
    })
    const elenco = elencoDelNivel(ROCHA.niveles[3]!)
    expect(sala.lugares.slice(1).map((l) => l.apodo)).toEqual(elenco.map((p) => p.nombre))
    expect(sala.mesa).toBe('rocha')
    expect(sala.formato).toBe('3v3')
    expect(sala.config.puntosPartida).toBe(30)
    expect(sala.nivelBots).toBe('muyDificil')
  })

  it('al ganar, se anota y se ven las recompensas; el último nivel no tiene "Siguiente"', async () => {
    const pedidos = servidorFalso({ rocha: [1, 2, 3, 4] })
    comoAdmin()
    render(
      <MemoryRouter>
        <FinHistoria jugado={{ departamento: 'rocha', nivel: 5 }} ganamos revancha={() => {}} />
      </MemoryRouter>,
    )
    const premios = await screen.findByRole('status')
    await waitFor(() => expect(within(premios).getByText(/Baraja Costa Uruguaya/)).toBeTruthy())
    expect(within(premios).getByText(/Mesa Rocha/)).toBeTruthy()
    expect(pedidos.find((p) => p.url.endsWith('/historia/ganar'))!.cuerpo).toEqual({ departamento: 'rocha', nivel: 5 })
    expect(screen.queryByRole('button', { name: 'Siguiente nivel' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Volver a Rocha' })).toBeTruthy()
  })

  it('al perder no se anota nada: revancha o volver', () => {
    const pedidos = servidorFalso()
    comoAdmin()
    const revancha = vi.fn()
    render(
      <MemoryRouter>
        <FinHistoria jugado={{ departamento: 'rocha', nivel: 2 }} ganamos={false} revancha={revancha} />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Revancha' }))
    expect(revancha).toHaveBeenCalled()
    expect(pedidos.some((p) => p.url.endsWith('/historia/ganar'))).toBe(false)
  })
})
