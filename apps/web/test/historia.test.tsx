import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { crearConfig } from '@truco/engine'
import {
  barajaGratis,
  buscarItem,
  CATALOGO_TIENDA,
  DEPARTAMENTOS,
  DEPARTAMENTOS_PUBLICADOS,
  barajaDeDepartamento,
  SENIAS_DEFAULT,
  type InfoSala,
  departamentoAbierto,
  departamentoSiguiente,
  despedidaDelDepartamento,
  dialogoDelNivel,
  elencoDelDepartamento,
  elencoDelNivel,
  escenaDelFinal,
  PERSONAJES,
  HISTORIAS,
  idBaraja,
  idMesa,
  idMonedas,
  monedasDeRecompensa,
  nivelesPorTamanio,
  nombreRecompensa,
  permisosDe,
  VECINOS,
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
import { DepartamentoHistoria, DespedidaDepartamento, Historia, PreviaNivel } from '../src/pantallas/Historia'
import { useJuego } from '../src/estado'
import { PortadaHistoria } from '../src/menu/PortadaHistoria'

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
        <Route path="/historia/:departamento/despedida" element={<DespedidaDepartamento />} />
        <Route path="/historia/:departamento/:nivel" element={<PreviaNivel />} />
        <Route path="*" element={<Ruta />} />
      </Routes>
    </MemoryRouter>,
  )
}

/** El final de un nivel, en una ruta (para ver adónde llevan los botones). */
function fin(nivel: number, ganamos: boolean, revancha = () => {}) {
  return render(
    <MemoryRouter initialEntries={['/mesa']}>
      <Routes>
        <Route path="/mesa" element={<FinHistoria jugado={{ departamento: 'rocha', nivel }} ganamos={ganamos} revancha={revancha} />} />
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

  it('se arranca en Rocha, el único publicado; el admin tiene todo abierto', () => {
    const completo = (id: keyof typeof HISTORIAS) => HISTORIAS[id]!.niveles.map((_, i) => i + 1)
    expect(DEPARTAMENTOS_PUBLICADOS).toEqual(['rocha'])
    expect(DEPARTAMENTOS.filter((d) => departamentoAbierto({}, d.id)).map((d) => d.id)).toEqual(['rocha'])
    expect(departamentoSiguiente({})).toBe('rocha')
    // Completar Rocha no abre a sus vecinos mientras no estén publicados.
    const conRocha = { rocha: completo('rocha') }
    expect(DEPARTAMENTOS.filter((d) => departamentoAbierto(conRocha, d.id)).map((d) => d.id)).toEqual(['rocha'])
    expect(departamentoSiguiente(conRocha)).toBeNull()
    // El admin: todo abierto, y lo que empezó va primero.
    expect(departamentoAbierto({}, 'artigas', true)).toBe(true)
    expect(departamentoSiguiente({ ...conRocha, 'san-jose': [1] }, true)).toBe('san-jose')
    // Los vecinos van de ida y vuelta, y todos se pueden alcanzar desde Montevideo.
    for (const d of DEPARTAMENTOS) for (const v of VECINOS[d.id]) expect(VECINOS[v], `${d.id}-${v}`).toContain(d.id)
    const alcanzados = new Set<string>(['montevideo'])
    for (let cambio = true; cambio; ) {
      cambio = false
      for (const d of [...alcanzados]) for (const v of VECINOS[d as keyof typeof VECINOS]) if (!alcanzados.has(v)) (alcanzados.add(v), (cambio = true))
    }
    expect(alcanzados.size).toBe(19)
  })

  it('los datos de los lugares: con su fuente, en la voz del rival y marcados en la charla', () => {
    for (const nivel of ROCHA.niveles) {
      expect(nivel.datos, nivel.lugar).toHaveLength(2)
      for (const d of nivel.datos!) expect(d.fuente, d.texto).toMatch(/^https:\/\//)
      // Juntos, después del saludo del rival: no se mezclan con la charla.
      const dialogo = dialogoDelNivel(nivel, 1)
      const datos = dialogo.slice(1, 1 + nivel.datos!.length)
      expect(datos.map((t) => (t.quien !== null && t.dato ? t.texto : ''))).toEqual(nivel.datos!.map((d) => d.texto))
      expect(dialogo.filter((t) => t.quien !== null && t.dato)).toHaveLength(nivel.datos!.length)
    }
    // Los de la segunda tanda también tienen los suyos, con su fuente.
    for (const id of ['artigas', 'canelones', 'cerro-largo'] as const)
      for (const nivel of HISTORIAS[id]!.niveles) {
        expect(nivel.datos, nivel.lugar).toHaveLength(2)
        for (const d of nivel.datos!) expect(d.fuente, d.texto).toMatch(/^https:\/\//)
      }
    expect(HISTORIAS.colonia!.niveles[0]!.datos).toHaveLength(2)
    // Sin datos, la charla es la de siempre.
    const sinDatos = HISTORIAS.colonia!.niveles[1]!
    expect(dialogoDelNivel(sinDatos, 1).some((t) => t.quien !== null && t.dato)).toBe(false)
  })

  it('cada lugar queda dentro de Uruguay y tiene su resumen', () => {
    for (const h of Object.values(HISTORIAS))
      for (const n of h!.niveles) {
        const [lat, lon] = n.donde
        expect(lat, n.lugar).toBeGreaterThan(-35.1)
        expect(lat, n.lugar).toBeLessThan(-30)
        expect(lon, n.lugar).toBeGreaterThan(-58.5)
        expect(lon, n.lugar).toBeLessThan(-53)
        expect(n.resumen.length, n.lugar).toBeGreaterThan(10)
      }
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
  it('sin ser admin: Rocha abierto y los demás, próximamente', async () => {
    servidorFalso()
    comoAdmin(false)
    app('/historia')
    expect((await screen.findByRole('button', { name: /Rocha · 0 de 5 niveles/ })).getAttribute('aria-disabled')).toBeNull()
    expect(screen.getByRole('button', { name: /Montevideo · próximamente/ }).getAttribute('aria-disabled')).toBe('true')
    cleanup()
    // Por la dirección, un departamento sin publicar está en preparación.
    app('/historia/artigas')
    expect(await screen.findByText(/Se está armando/)).toBeTruthy()
  })

  it('sin cuenta, pide entrar', () => {
    servidorFalso()
    useCuenta.setState({ estado: 'afuera', cuenta: null, token: null })
    app('/historia')
    expect(screen.getByText(/entrá a tu cuenta/)).toBeTruthy()
  })

  it('el mapa de Uruguay: cada departamento con su progreso; al tocar uno, su presentación y después su mapa', async () => {
    servidorFalso({ rocha: [1, 2] })
    comoAdmin()
    app('/historia')
    const rocha = await screen.findByRole('button', { name: /Rocha · 2 de 5 niveles/ })
    // El admin tiene todo abierto.
    expect(screen.getByRole('button', { name: /Montevideo · 0 de 3 niveles/ }).getAttribute('aria-disabled')).toBeNull()
    fireEvent.click(rocha)
    // Después del zoom y las nubes, la presentación: el departamento y sus lugares, con lo que es cada uno.
    const presentacion = await screen.findByRole('dialog', { name: 'Llegaste a Rocha' }, { timeout: 4000 })
    for (const n of ROCHA.niveles) {
      expect(within(presentacion).getByText(n.lugar)).toBeTruthy()
      expect(within(presentacion).getByText(n.resumen)).toBeTruthy()
    }
    fireEvent.click(within(presentacion).getByRole('button', { name: 'Ver el mapa' }))
    expect(screen.getByRole('heading', { name: 'Rocha' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Mapa del departamento' })).toBeTruthy()
  })

  it('Rocha: un punto por nivel en el mapa; se elige y se ve qué es, su premio y si se juega', async () => {
    servidorFalso({ rocha: [1] })
    comoAdmin()
    app('/historia/rocha')
    // Al entrar, el que sigue.
    await waitFor(() => expect((screen.getByRole('button', { name: 'Jugar el nivel 2' }) as HTMLButtonElement).disabled).toBe(false))
    expect(screen.getByText(ROCHA.niveles[1]!.resumen)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: `Nivel 1 · ${ROCHA.niveles[0]!.lugar}` }))
    expect(screen.getByRole('button', { name: 'Volver a jugar el nivel 1' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: `Nivel 3 · ${ROCHA.niveles[2]!.lugar}` }))
    expect((screen.getByRole('button', { name: 'Jugar el nivel 3' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: `Nivel 5 · ${ROCHA.niveles[4]!.lugar}` }))
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
    // Julio cuenta lo del lugar, los dos datos seguidos.
    for (const dato of nivel.datos!) {
      await screen.findByText(dato.texto)
      expect(screen.getByText(/¿Sabías que…\?/)).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    }
    // Después saluda Nico, el compañero de Julio.
    await screen.findByText(PERSONAJES.find((p) => p.id === 'surfista')!.saludo)
    expect(habla()).toEqual([nombre('surfista')])
    expect(screen.queryByText(/¿Sabías que…\?/)).toBeNull()
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

describe('la portada en Jugar', () => {
  it('dice dónde seguir, cuánto recorriste y lleva al departamento o al mapa', async () => {
    servidorFalso({ montevideo: [1, 2, 3], canelones: [1] })
    comoAdmin()
    const seguir = vi.fn()
    const mapa = vi.fn()
    render(<PortadaHistoria activa={false} alSeguir={seguir} alVerMapa={mapa} />)
    fireEvent.click(await screen.findByRole('button', { name: 'Seguir en Canelones' }))
    expect(seguir).toHaveBeenCalledWith('canelones')
    expect(screen.getByText('1 de 19 departamentos')).toBeTruthy()
    // De fondo arranca por el que sigue.
    expect(screen.getByText('Canelones', { selector: '.portada-historia-lugar' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Ver el mapa' }))
    expect(mapa).toHaveBeenCalled()
  })
})

describe('la partida de un nivel', () => {
  it('sienta al elenco del nivel en su lugar, en la mesa y con la baraja de Rocha, a los puntos del nivel', async () => {
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
    // La baraja del departamento (la que se gana al final), aunque elegiste otra.
    expect(sala.baraja).toBe('costa')
    expect(barajaDeDepartamento('artigas')).toBe('artigas')
    expect(sala.formato).toBe('3v3')
    expect(sala.config.puntosPartida).toBe(30)
    expect(sala.nivelBots).toBe('muyDificil')
  })

  it('al ganar el último, se anota y se ven las recompensas; la escena del final lleva a la despedida (no hay "Siguiente")', async () => {
    const pedidos = servidorFalso({ rocha: [1, 2, 3, 4] })
    comoAdmin()
    fin(5, true)
    const premios = await screen.findByRole('status')
    await waitFor(() => expect(within(premios).getByText(/Baraja Costa Uruguaya/)).toBeTruthy())
    expect(within(premios).getByText(/Mesa Rocha/)).toBeTruthy()
    expect(pedidos.find((p) => p.url.endsWith('/historia/ganar'))!.cuerpo).toEqual({ departamento: 'rocha', nivel: 5 })
    // "Seguir": la escena en la Fortaleza, con lo que dice Julio al perder (es mano a mano: sin compañero).
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    const escena = screen.getByRole('dialog', { name: 'Ganaste en La Fortaleza de Santa Teresa' })
    expect(within(escena).getByText(ROCHA.niveles[4]!.alFinal!.ganaste)).toBeTruthy()
    const loQueGanaste = within(escena).getByRole('region', { name: 'Lo que ganaste' })
    expect(within(loQueGanaste).getByText(/Baraja Costa Uruguaya/)).toBeTruthy()
    expect(within(escena).queryByRole('button', { name: 'Siguiente nivel' })).toBeNull()
    fireEvent.click(within(escena).getByRole('button', { name: 'Despedirte de Rocha' }))
    expect(screen.getByTestId('ruta').textContent).toBe('/historia/rocha/despedida')
  })

  it('al ganar uno del medio: el rival te reconoce, tu compañero festeja y sigue el siguiente nivel', async () => {
    servidorFalso({ rocha: [1] })
    comoAdmin()
    fin(2, true)
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    const escena = screen.getByRole('dialog', { name: 'Ganaste en La Paloma' })
    const [rival, companiero] = escenaDelFinal(ROCHA.niveles[1]!, 2, true)
    expect(within(escena).getByText(rival!.texto)).toBeTruthy()
    // Mientras hablan no están los botones; "Saltar" va directo al final.
    expect(within(escena).queryByRole('button', { name: 'Siguiente nivel' })).toBeNull()
    fireEvent.click(within(escena).getByRole('button', { name: 'Seguir' }))
    expect(await within(escena).findByText(companiero!.texto)).toBeTruthy()
    expect(within(escena).queryByRole('button', { name: 'Saltar' })).toBeNull()
    await within(escena).findByText(/Impermeable amarillo/)
    fireEvent.click(within(escena).getByRole('button', { name: 'Siguiente nivel' }))
    expect(screen.getByTestId('ruta').textContent).toBe('/historia/rocha/3')
  })

  it('al perder no se anota nada: el rival te gasta, tu compañero te da ánimo y revancha o volver', async () => {
    const pedidos = servidorFalso()
    comoAdmin()
    const revancha = vi.fn()
    fin(2, false, revancha)
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    const escena = screen.getByRole('dialog', { name: 'Perdiste en La Paloma' })
    expect(within(escena).getByText(ROCHA.niveles[1]!.alFinal!.perdiste)).toBeTruthy()
    fireEvent.click(within(escena).getByRole('button', { name: 'Saltar' }))
    expect(await within(escena).findByText(escenaDelFinal(ROCHA.niveles[1]!, 2, false)[1]!.texto)).toBeTruthy()
    expect(within(escena).queryByRole('region', { name: 'Lo que ganaste' })).toBeNull()
    fireEvent.click(within(escena).getByRole('button', { name: 'Revancha' }))
    expect(revancha).toHaveBeenCalled()
    expect(pedidos.some((p) => p.url.endsWith('/historia/ganar'))).toBe(false)
  })

  it('el último nivel repetido no vuelve a despedirse: Volver al departamento', async () => {
    servidorFalso({ rocha: [1, 2, 3, 4, 5] })
    comoAdmin()
    vi.mocked(fetch).mockImplementation(async (url) =>
      String(url).endsWith('/historia/ganar') ? Response.json({ progreso: { rocha: [1, 2, 3, 4, 5] }, nuevas: [], inventario: [] }) : Response.json({ progreso: {} }),
    )
    fin(5, true)
    await screen.findByText('Este nivel ya lo tenías ganado.')
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    const escena = screen.getByRole('dialog')
    expect(within(escena).queryByRole('button', { name: /Despedirte/ })).toBeNull()
    expect(within(escena).getByRole('button', { name: 'Volver a Rocha' }).className).toContain('boton-grande')
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

describe('la despedida de un departamento', () => {
  it('los textos: cada personaje tiene lo suyo para el final y cada departamento su despedida', () => {
    for (const p of PERSONAJES) {
      expect(p.siGana.length, p.id).toBeGreaterThan(0)
      expect(p.siPierde.length, p.id).toBeGreaterThan(0)
    }
    for (const d of DEPARTAMENTOS) {
      const h = HISTORIAS[d.id]!
      expect(h.despedida.length, d.id).toBeGreaterThanOrEqual(2)
      // Sin "alFinal", el rival dice lo de su personaje.
      const sinTexto = h.niveles.find((n) => !n.alFinal)
      if (sinTexto) {
        const jefe = PERSONAJES.find((p) => p.id === sinTexto.rivales[0])!
        expect(escenaDelFinal(sinTexto, 1, true)[0]!.texto).toBe(jefe.siPierde)
        expect(escenaDelFinal(sinTexto, 1, false)[0]!.texto).toBe(jefe.siGana)
      }
    }
    // Rocha: los de la costa (Julio, Nico y Luna); Julio abre y cierra.
    expect(elencoDelDepartamento(ROCHA)).toEqual(['pescador', 'surfista', 'hippie'])
    const charla = despedidaDelDepartamento(ROCHA)
    expect(charla.map((t) => t.quien)).toEqual(['pescador', 'surfista', 'hippie', 'pescador', 'pescador'])
  })

  it('te despiden, ves lo que te llevás y los próximos destinos; "Seguir viaje" vuelve al mapa con la ruta', async () => {
    servidorFalso({ rocha: [1, 2, 3, 4, 5] })
    comoAdmin(false)
    app('/historia/rocha/despedida')
    const charla = despedidaDelDepartamento(ROCHA)
    for (const [i, turno] of charla.entries()) {
      expect(await screen.findByText(turno.texto)).toBeTruthy()
      if (i < charla.length - 1) fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    const llevas = screen.getByRole('region', { name: 'Te llevás de Rocha' })
    expect(within(llevas).getAllByRole('listitem')).toHaveLength(ROCHA.niveles.flatMap((n) => n.recompensas).length)
    expect(within(llevas).getByText(/Baraja Costa Uruguaya/)).toBeTruthy()
    // Los vecinos de Rocha, todavía sin publicar.
    const destinos = screen.getByRole('region', { name: 'Próximos destinos' })
    expect(within(destinos).getAllByRole('listitem').map((li) => li.firstChild!.textContent)).toEqual(['Lavalleja', 'Maldonado', 'Treinta y Tres'])
    expect(within(destinos).getAllByText('Próximamente')).toHaveLength(3)
    expect(within(destinos).getByText(/se abren muy pronto/)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Seguir viaje' }))
    // Las nubes se cierran y se vuelve al mapa de Uruguay, con la ruta a los vecinos.
    await screen.findByRole('group', { name: 'Mapa de Uruguay' }, { timeout: 4000 })
    expect(document.querySelectorAll('.mapa-ruta')).toHaveLength(VECINOS.rocha.length)
  })

  it('sin completar el departamento no hay despedida; completo, se vuelve a ver desde el departamento', async () => {
    servidorFalso({ rocha: [1, 2] })
    comoAdmin(false)
    const { unmount } = app('/historia/rocha/despedida')
    expect(await screen.findByText(/Se está armando/)).toBeTruthy()
    unmount()
    useHistoria.setState({ progreso: null })
    servidorFalso({ rocha: [1, 2, 3, 4, 5] })
    app('/historia/rocha')
    fireEvent.click(await screen.findByRole('button', { name: 'Ver la despedida' }))
    expect(await screen.findByText(despedidaDelDepartamento(ROCHA)[0]!.texto)).toBeTruthy()
  })
})

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
    // De fondo, el lugar del nivel.
    expect(document.documentElement.dataset.lugar).toBe('rocha')
    expect(document.documentElement.dataset.nivel).toBe('4')
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

