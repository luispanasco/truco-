import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { crearConfig } from '@truco/engine'
import {
  barajaGratis,
  buscarItem,
  CATALOGO_TIENDA,
  DEPARTAMENTOS,
  SENIAS_DEFAULT,
  type InfoSala,
  dialogoDelNivel,
  elencoDelNivel,
  PERSONAJES,
  HISTORIAS,
  idBaraja,
  idMesa,
  idMonedas,
  monedasDeRecompensa,
  nivelesPorTamanio,
  nombreRecompensa,
  permisosDe,
  vitrinaDelDia,
} from '@truco/shared'
import { useCuenta } from '../src/cuenta/cuenta'
import { useHistoria } from '../src/cuenta/historia'
import { fijarInventario } from '../src/cuenta/inventario'
import type { ConexionLocal } from '../src/conexion/local'
import { conexionHistoria } from '../src/menu/contraLaCompu'
import { leerPerfil } from '../src/perfil'
import type { Conexion, MensajeServidor } from '../src/conexion/tipos'
import { Sala } from '../src/pantallas/Sala'
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

/** Recorre la charla de la previa hasta el final, eligiendo siempre la primera respuesta. */
async function recorrerPrevia(n: number) {
  const dialogo = dialogoDelNivel(ROCHA.niveles[n - 1]!, n)
  for (let i = 0; i < dialogo.length - 1; i++) {
    const turno = dialogo[i]!
    if (turno.quien === null) fireEvent.click(await screen.findByRole('button', { name: turno.opciones[0] }))
    fireEvent.click(await screen.findByRole('button', { name: 'Seguir' }))
  }
}
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

  it('los 19 departamentos se juegan: sus niveles por tamaño, su elenco, la dificultad que sube y sus premios', () => {
    const DIFICULTAD = ['facil', 'medio', 'dificil', 'muyDificil', 'master']
    const barajas = new Set<string>()
    for (const d of DEPARTAMENTOS) {
      const h = HISTORIAS[d.id]!
      expect(h, d.id).toBeTruthy()
      expect(h.niveles, d.id).toHaveLength(nivelesPorTamanio(d.km2))
      const dificultades = h.niveles.map((n) => DIFICULTAD.indexOf(n.nivelBots))
      expect(dificultades, d.id).toEqual([...dificultades].sort((a, b) => a - b))
      expect(new Set(dificultades).size, d.id).toBe(dificultades.length)
      h.niveles.forEach((nivel, i) => {
        const donde = `${d.id} ${i + 1}`
        const elenco = elencoDelNivel(nivel)
        expect(elenco, donde).toHaveLength({ '1v1': 1, '2v2': 3, '3v3': 5 }[nivel.formato])
        expect(elenco.every(Boolean), donde).toBe(true)
        expect(elenco[0]!.id, donde).toBe(h.jefe)
        // Nadie juega de los dos lados.
        expect(nivel.rivales.filter((r) => nivel.companieros.includes(r)), donde).toEqual([])
        expect(new Set(elenco.map((p) => p.id)).size, donde).toBe(elenco.length)
        expect(nivel.frases, donde).toHaveLength(3)
        expect(nivel.recompensas.length, donde).toBeGreaterThan(0)
        for (const r of nivel.recompensas) expect(nombreRecompensa(r), `${donde}: ${r}`).not.toBe(r)
      })
      // El último nivel da la baraja y la mesa del departamento; las barajas no se repiten.
      const ultimo = h.niveles[h.niveles.length - 1]!.recompensas
      expect(ultimo, d.id).toContain(idMesa(d.id as never))
      const baraja = ultimo.find((r) => r.startsWith('baraja:'))!
      expect(baraja, d.id).toBeTruthy()
      expect(barajas.has(baraja), baraja).toBe(false)
      barajas.add(baraja)
    }
    expect(barajas.size).toBe(19)
  })

  it('las piezas de los departamentos se ganan ahí: no salen en la vitrina', () => {
    const premios = CATALOGO_TIENDA.filter((i) => i.recompensa)
    expect(premios).toHaveLength(28)
    const ganables = new Set(Object.values(HISTORIAS).flatMap((h) => h!.niveles.flatMap((n) => n.recompensas)))
    for (const p of premios) expect(ganables.has(p.id), p.nombre).toBe(true)
    for (let d = 1; d <= 60; d++) {
      const dia = `2026-12-${String((d % 28) + 1).padStart(2, '0')}`
      for (const i of vitrinaDelDia(`${dia}-${d}`)) expect(i.recompensa, i.nombre).toBeUndefined()
    }
    expect(buscarItem(premios[0]!.id)?.recompensa).toBe('Artigas')
  })

  it('las monedas como premio', () => {
    expect(monedasDeRecompensa(idMonedas(150))).toBe(150)
    expect(monedasDeRecompensa(idBaraja('costa'))).toBe(0)
    expect(monedasDeRecompensa('monedas:mil')).toBe(0)
    expect(nombreRecompensa(idMonedas(100))).toBe('100 monedas')
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

  it('el mapa: cada departamento con su rival y su progreso', async () => {
    servidorFalso({ rocha: [1, 2] })
    comoAdmin()
    app('/historia')
    const rocha = await screen.findByRole('button', { name: /Rocha.*2 de 5 niveles/ })
    expect((rocha as HTMLButtonElement).disabled).toBe(false)
    expect((screen.getByRole('button', { name: /Montevideo.*0 de 3 niveles/ }) as HTMLButtonElement).disabled).toBe(false)
    expect(screen.queryByText(/Próximamente/)).toBeNull()
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
    // Están todos: los rivales arriba y tu equipo (vos y tu compañero) abajo.
    const nombre = (id: string) => PERSONAJES.find((p) => p.id === id)!.nombre
    const rivales = screen.getByLabelText('Rivales')
    for (const id of nivel.rivales) expect(within(rivales).getByText(nombre(id))).toBeTruthy()
    const tuyos = screen.getByLabelText('Tu equipo')
    expect(within(tuyos).getByText(nombre(nivel.companieros[0]!))).toBeTruthy()
    expect(within(tuyos).getByText(leerPerfil().apodo || 'Vos')).toBeTruthy()
    // El que habla pasa al frente; los demás no.
    const habla = () => [...document.querySelectorAll('.previa-figura.habla .previa-figura-nombre')].map((e) => e.textContent)
    await screen.findByText(nivel.frases[0]!)
    expect(habla()).toEqual([nombre('pescador')])
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    // Después saluda Nico, el compañero de Julio.
    await screen.findByText(PERSONAJES.find((p) => p.id === 'surfista')!.saludo)
    expect(habla()).toEqual([nombre('surfista')])
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    await screen.findByText(nivel.frases[1]!)
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    // Te toca: elegís qué decir, y lo decís vos.
    const turno = dialogoDelNivel(nivel, 2).find((t) => t.quien === null)!
    expect(screen.queryByRole('button', { name: 'Seguir' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: turno.quien === null ? turno.opciones[1] : '' }))
    await screen.findByText(turno.quien === null ? turno.opciones[1] : '')
    expect(habla()).toEqual([leerPerfil().apodo || 'Vos'])
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    // Te da ánimo tu compañero, y Julio cierra.
    await screen.findByText(PERSONAJES.find((p) => p.id === 'hincha')!.saludo)
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
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

/** Una sala online de mentira: lo que llega lo decide el test. */
function conexionFalsa() {
  let oyente: ((m: MensajeServidor) => void) | null = null
  const c = {
    tipo: 'online' as const,
    roomId: 'NIVEL',
    enviar: () => {},
    escuchar: (o: (m: MensajeServidor) => void) => {
      oyente = o
      return () => (oyente = null)
    },
    salir: () => {},
  }
  return { c: c as Conexion, llegar: (m: MensajeServidor) => act(() => oyente!(m)) }
}

describe('cooperativo', () => {
  it('"Jugar con un amigo" está en los niveles de equipos, no en los mano a mano', async () => {
    servidorFalso({ rocha: [1] })
    comoAdmin()
    app('/historia/rocha/1')
    await screen.findByRole('heading', { name: ROCHA.niveles[0]!.lugar })
    await recorrerPrevia(1)
    await screen.findByRole('button', { name: '¡A jugar!' })
    expect(screen.queryByRole('button', { name: 'Jugar con un amigo' })).toBeNull()
    cleanup()
    app('/historia/rocha/2')
    await screen.findByRole('heading', { name: ROCHA.niveles[1]!.lugar })
    await recorrerPrevia(2)
    expect(await screen.findByRole('button', { name: 'Jugar con un amigo' })).toBeTruthy()
  })

  it('la sala de espera del nivel: dónde y contra quién, los lugares rivales del elenco y sin configurar', async () => {
    const f = conexionFalsa()
    act(() => useJuego.getState().conectar(f.c))
    const nivel = ROCHA.niveles[3]!
    const sala: InfoSala = {
      codigo: 'NIVEL',
      publica: false,
      fase: 'esperando',
      formato: '3v3',
      config: crearConfig({ formato: '3v3' }),
      botsEnVacios: true,
      nivelBots: nivel.nivelBots,
      ayudas: true,
      senias: SENIAS_DEFAULT,
      tiempos: { turnoS: 30, primeraJugadaS: 60 },
      cartasJugadas: 'quedan',
      tirarReyes: 'no',
      voz: false,
      mesa: 'rocha',
      baraja: 'propia',
      chatEquipo: true,
      lugares: Array.from({ length: 6 }, (_, a) => ({
        asiento: a,
        tipo: a === 0 ? ('humano' as const) : ('libre' as const),
        apodo: a === 0 ? 'Luis' : '',
        avatar: null,
        conectado: a === 0,
        anfitrion: a === 0,
      })),
      yo: 0,
      revancha: [],
      historia: { departamento: 'rocha', nivel: 4 },
    }
    render(
      <MemoryRouter initialEntries={['/sala']}>
        <Routes>
          <Route path="/sala" element={<Sala />} />
        </Routes>
      </MemoryRouter>,
    )
    f.llegar({ tipo: 'sala', datos: sala })
    expect(await screen.findByRole('heading', { name: 'Rocha · Nivel 4' })).toBeTruthy()
    expect(screen.getByText(/Julio, Nico y Luna contra ustedes/)).toBeTruthy()
    expect(screen.getByLabelText('Lugar 2: Julio, rival del nivel')).toBeTruthy()
    // El nivel manda: no hay mesa ni reglas para cambiar.
    expect(screen.queryByRole('button', { name: /Cambiar/ })).toBeNull()
    expect(document.documentElement.dataset.lugar).toBe('rocha')
  })

  it('en cooperativo, lo que te tocó lo dice el servidor (y no se pide a la API)', async () => {
    const pedidos = servidorFalso()
    comoAdmin()
    render(
      <MemoryRouter>
        <FinHistoria jugado={{ departamento: 'rocha', nivel: 2 }} ganamos revancha={() => {}} online />
      </MemoryRouter>,
    )
    expect(screen.getByText('Anotando el nivel…')).toBeTruthy()
    act(() => useJuego.setState({ premioHistoria: { nuevas: [...ROCHA.niveles[1]!.recompensas], anotado: true } }))
    expect(screen.getByText(/Impermeable amarillo/)).toBeTruthy()
    act(() => useJuego.setState({ premioHistoria: { nuevas: [], anotado: false } }))
    expect(screen.getByText(/primero ganá el nivel anterior/)).toBeTruthy()
    expect(pedidos.some((p) => p.url.endsWith('/historia/ganar'))).toBe(false)
  })
})

