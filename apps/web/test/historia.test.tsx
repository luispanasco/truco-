import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { crearConfig } from '@truco/engine'
import {
  barajaGratis,
  barriosDe,
  buscarItem,
  CATALOGO_TIENDA,
  DEPARTAMENTOS,
  DEPARTAMENTOS_PUBLICADOS,
  barajaDeDepartamento,
  SENIAS_DEFAULT,
  type InfoSala,
  departamentoAbierto,
  departamentoSiguiente,
  despedidaDelBarrio,
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
  nivelDeHistoria,
  nivelesPorTamanio,
  nombreRecompensa,
  permisosDe,
  recompensasDelDepartamento,
  VECINOS,
  vitrinaDelDia,
  DONDE_DIPLOMA,
  type ProgresoHistoria,
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
import { DepartamentoHistoria, DespedidaBarrio, DespedidaDepartamento, Historia, PreviaNivel, SegundoTramoHistoria } from '../src/pantallas/Historia'
import { useJuego } from '../src/estado'
import { PortadaHistoria } from '../src/menu/PortadaHistoria'

const ROCHA = HISTORIAS.rocha!
const BARRIOS = barriosDe(ROCHA)
const PALOMA = BARRIOS[0]!
const ULTIMO = BARRIOS.at(-1)!
const hasta = (n: number) => Array.from({ length: n }, (_, i) => i + 1)
/** Rocha con los barrios completos (todos o hasta el `n`, sin incluir). */
const rochaCompleta = (n = BARRIOS.length): ProgresoHistoria =>
  Object.fromEntries(BARRIOS.slice(0, n).map((b) => [`rocha/${b.id}`, hasta(b.niveles.length)]))

/** Un servidor de cuentas falso con el modo historia: lo que se ganó y lo que se pidió. */
function servidorFalso(progreso: ProgresoHistoria = {}) {
  const pedidos: { url: string; cuerpo: unknown }[] = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const cuerpo = init?.body ? JSON.parse(String(init.body)) : undefined
      pedidos.push({ url, cuerpo })
      if (url.endsWith('/historia')) return Response.json({ progreso })
      if (url.endsWith('/historia/ganar')) {
        const { departamento, barrio = '', nivel } = cuerpo as { departamento: 'rocha'; barrio?: string; nivel: number }
        const clave = barrio ? `${departamento}/${barrio}` : departamento
        progreso[clave] = [...new Set([...(progreso[clave] ?? []), nivel])]
        const premios = nivelDeHistoria(departamento, nivel, barrio)!.recompensas
        return Response.json({ progreso, nuevas: premios, inventario: premios })
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
        <Route path="/historia/:departamento/:segundo" element={<SegundoTramoHistoria />} />
        <Route path="/historia/:departamento/:barrio/despedida" element={<DespedidaBarrio />} />
        <Route path="/historia/:departamento/:barrio/:nivel" element={<PreviaNivel />} />
        <Route path="*" element={<Ruta />} />
      </Routes>
    </MemoryRouter>,
  )
}

/** El final de un nivel, en una ruta (para ver adónde llevan los botones). */
function fin(nivel: number, ganamos: boolean, revancha = () => {}, barrio = PALOMA.id) {
  return render(
    <MemoryRouter initialEntries={['/mesa']}>
      <Routes>
        <Route path="/mesa" element={<FinHistoria jugado={{ departamento: 'rocha', barrio, nivel }} ganamos={ganamos} revancha={revancha} />} />
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
  const dialogo = dialogoDelNivel(PALOMA.niveles[n - 1]!, n)
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
  it('19 departamentos; Rocha va por barrios y cada nivel tiene su elenco, con el personaje del barrio', () => {
    expect(DEPARTAMENTOS).toHaveLength(19)
    expect([nivelesPorTamanio(530), nivelesPorTamanio(9_008), nivelesPorTamanio(15_438)]).toEqual([3, 4, 5])
    expect(BARRIOS.map((b) => b.nombre)).toEqual(['La Paloma', 'La Pedrera', 'Cabo Polonio', 'Aguas Dulces, Valizas y Castillos', 'Punta del Diablo', 'Santa Teresa y Chuy'])
    for (const b of BARRIOS)
      for (const nivel of b.niveles) {
        const elenco = elencoDelNivel(nivel)
        expect(elenco).toHaveLength({ '1v1': 1, '2v2': 3, '3v3': 5 }[nivel.formato])
        // En el 1 se sienta el personaje del barrio.
        expect(elenco[0]!.id).toBe(b.jefe)
        expect(nivel.frases.length).toBeGreaterThanOrEqual(2)
        for (const r of nivel.recompensas) expect(nombreRecompensa(r)).not.toBe(r)
      }
    expect(nombreRecompensa(idBaraja('costa'))).toBe('Baraja Costa Uruguaya')
  })

  it('los 19 departamentos se juegan: sus niveles, su elenco, la dificultad que sube y sus premios', () => {
    const DIFICULTAD = ['facil', 'medio', 'dificil', 'muyDificil', 'master']
    const barajas = new Set<string>()
    for (const d of DEPARTAMENTOS) {
      const h = HISTORIAS[d.id]!
      expect(h, d.id).toBeTruthy()
      // Los que no tienen barrios: los niveles por tamaño y la dificultad que sube de a uno.
      if (!h.barrios) {
        expect(h.niveles, d.id).toHaveLength(nivelesPorTamanio(d.km2))
        const dificultades = h.niveles.map((n) => DIFICULTAD.indexOf(n.nivelBots))
        expect(dificultades, d.id).toEqual([...dificultades].sort((a, b) => a - b))
        expect(new Set(dificultades).size, d.id).toBe(dificultades.length)
      }
      for (const b of barriosDe(h))
        b.niveles.forEach((nivel, i) => {
          const donde = `${d.id} ${b.id} ${i + 1}`
          const elenco = elencoDelNivel(nivel)
          expect(elenco, donde).toHaveLength({ '1v1': 1, '2v2': 3, '3v3': 5 }[nivel.formato])
          expect(elenco.every(Boolean), donde).toBe(true)
          expect(elenco[0]!.id, donde).toBe(b.jefe)
          // Nadie juega de los dos lados.
          expect(nivel.rivales.filter((r) => nivel.companieros.includes(r)), donde).toEqual([])
          expect(new Set(elenco.map((p) => p.id)).size, donde).toBe(elenco.length)
          expect(nivel.frases, donde).toHaveLength(3)
          expect(nivel.recompensas.length, donde).toBeGreaterThan(0)
          for (const r of nivel.recompensas) expect(nombreRecompensa(r), `${donde}: ${r}`).not.toBe(r)
        })
      // El último nivel da la baraja y la mesa del departamento; las barajas no se repiten.
      const ultimo = barriosDe(h).at(-1)!.niveles.at(-1)!.recompensas
      expect(ultimo, d.id).toContain(idMesa(d.id as never))
      const baraja = ultimo.find((r) => r.startsWith('baraja:'))!
      expect(baraja, d.id).toBeTruthy()
      expect(barajas.has(baraja), baraja).toBe(false)
      barajas.add(baraja)
    }
    expect(barajas.size).toBe(19)
  })

  it('las piezas de los departamentos se ganan ahí: no salen en la vitrina', () => {
    // Los Naipes también son premio, pero del tutorial (al recibirte).
    const premios = CATALOGO_TIENDA.filter((i) => i.recompensa && i.recompensa !== DONDE_DIPLOMA)
    expect(premios).toHaveLength(28)
    const ganables = new Set(Object.values(HISTORIAS).flatMap((h) => recompensasDelDepartamento(h!)))
    for (const p of premios) expect(ganables.has(p.id), p.nombre).toBe(true)
    for (let d = 1; d <= 60; d++) {
      const dia = `2026-12-${String((d % 28) + 1).padStart(2, '0')}`
      for (const i of vitrinaDelDia(`${dia}-${d}`)) expect(i.recompensa, i.nombre).toBeUndefined()
    }
    expect(buscarItem(premios[0]!.id)?.recompensa).toBe('Artigas')
  })

  it('se arranca en Rocha, el único publicado; el admin tiene todo abierto', () => {
    expect(DEPARTAMENTOS_PUBLICADOS).toEqual(['rocha'])
    expect(DEPARTAMENTOS.filter((d) => departamentoAbierto({}, d.id)).map((d) => d.id)).toEqual(['rocha'])
    expect(departamentoSiguiente({})).toBe('rocha')
    // Completar Rocha no abre a sus vecinos mientras no estén publicados.
    const conRocha = rochaCompleta()
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
    for (const nivel of BARRIOS.flatMap((b) => b.niveles)) {
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

  it('cada lugar (y cada barrio) queda dentro de Uruguay y tiene su resumen', () => {
    const adentro = ([lat, lon]: readonly [number, number], que: string) => {
      expect(lat, que).toBeGreaterThan(-35.1)
      expect(lat, que).toBeLessThan(-30)
      expect(lon, que).toBeGreaterThan(-58.5)
      expect(lon, que).toBeLessThan(-53)
    }
    for (const h of Object.values(HISTORIAS))
      for (const b of barriosDe(h!)) {
        adentro(b.donde, b.nombre)
        for (const n of b.niveles) {
          adentro(n.donde, n.lugar)
          expect(n.resumen.length, n.lugar).toBeGreaterThan(10)
        }
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
    expect((await screen.findByRole('button', { name: /Rocha · 0 de 32 niveles/ })).getAttribute('aria-disabled')).toBeNull()
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

  it('el mapa de Uruguay: cada departamento con su progreso; al tocar uno, su presentación (los barrios) y después su mapa', async () => {
    servidorFalso({ 'rocha/la-paloma': [1, 2] })
    comoAdmin()
    app('/historia')
    const rocha = await screen.findByRole('button', { name: /Rocha · 2 de 32 niveles/ })
    // El admin tiene todo abierto.
    expect(screen.getByRole('button', { name: /Montevideo · 0 de 3 niveles/ }).getAttribute('aria-disabled')).toBeNull()
    fireEvent.click(rocha)
    // Después del zoom y las nubes, la presentación: el departamento y sus barrios, con quién te espera.
    const presentacion = await screen.findByRole('dialog', { name: 'Llegaste a Rocha' }, { timeout: 4000 })
    for (const b of BARRIOS) expect(within(presentacion).getByText(b.nombre)).toBeTruthy()
    expect(within(presentacion).getByText('Nico el Surfista · 6 niveles')).toBeTruthy()
    fireEvent.click(within(presentacion).getByRole('button', { name: 'Ver el mapa' }))
    expect(screen.getByRole('heading', { name: 'Rocha' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Mapa del departamento' })).toBeTruthy()
  })

  it('Rocha: un punto por barrio; al entrar, el que sigue; los que faltan, cerrados', async () => {
    servidorFalso(rochaCompleta(1))
    comoAdmin(false)
    app('/historia/rocha')
    // Completaste La Paloma: sigue La Pedrera.
    await waitFor(() => expect((screen.getByRole('button', { name: 'Entrar a La Pedrera' }) as HTMLButtonElement).disabled).toBe(false))
    expect(screen.getByText('Nilda la Ballenera')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Barrio 1 · La Paloma' }))
    expect(screen.getByText('✓ Completo')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Barrio 3 · Cabo Polonio' }))
    expect((screen.getByRole('button', { name: 'Entrar a Cabo Polonio' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText(/Se abre al completar el barrio anterior/)).toBeTruthy()
    // De fondo, el primer nivel del barrio elegido.
    expect(document.querySelector('main')!.dataset.barrio).toBe('cabo-polonio')
    fireEvent.click(screen.getByRole('button', { name: 'Barrio 2 · La Pedrera' }))
    fireEvent.click(screen.getByRole('button', { name: 'Entrar a La Pedrera' }))
    // La primera vez, la presentación del barrio.
    expect(await screen.findByRole('dialog', { name: 'Llegaste a La Pedrera' })).toBeTruthy()
  })

  it('un barrio: un punto por nivel en el mapa; se elige y se ve qué es, su premio y si se juega', async () => {
    servidorFalso({ 'rocha/la-paloma': [1] })
    comoAdmin(false)
    app('/historia/rocha/la-paloma')
    // Al entrar, el que sigue.
    await waitFor(() => expect((screen.getByRole('button', { name: 'Jugar el nivel 2' }) as HTMLButtonElement).disabled).toBe(false))
    expect(screen.getByRole('heading', { name: 'La Paloma' })).toBeTruthy()
    expect(screen.getByText(PALOMA.niveles[1]!.resumen)).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: `Nivel 1 · ${PALOMA.niveles[0]!.lugar}` }))
    expect(screen.getByRole('button', { name: 'Volver a jugar el nivel 1' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: `Nivel 3 · ${PALOMA.niveles[2]!.lugar}` }))
    expect((screen.getByRole('button', { name: 'Jugar el nivel 3' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(screen.getByRole('button', { name: `Nivel 6 · ${PALOMA.niveles[5]!.lugar}` }))
    expect(screen.getByText(/Premio: Mesa La Paloma/)).toBeTruthy()
    // "Volver" lleva a los barrios de Rocha.
    expect(screen.getByRole('button', { name: 'Rocha' })).toBeTruthy()
    cleanup()
    // El último nivel del último barrio: la baraja y la mesa de Rocha.
    servidorFalso(rochaCompleta(BARRIOS.length - 1))
    app(`/historia/rocha/${ULTIMO.id}`)
    await screen.findByRole('heading', { name: ULTIMO.nombre })
    fireEvent.click(screen.getByRole('button', { name: `Nivel 6 · ${ULTIMO.niveles[5]!.lugar}` }))
    expect(screen.getByText(/Premio: Mesa Santa Teresa y Baraja Costa Uruguaya y Mesa Rocha/)).toBeTruthy()
  })

  it('la previa: el rival dice sus frases de a una y "¡A jugar!" arranca el nivel en su mesa', async () => {
    servidorFalso({ 'rocha/la-paloma': [1] })
    comoAdmin()
    app('/historia/rocha/la-paloma/2')
    const nivel = PALOMA.niveles[1]!
    expect(await screen.findByRole('heading', { name: nivel.lugar })).toBeTruthy()
    expect(screen.getByText('Rocha · La Paloma · Nivel 2')).toBeTruthy()
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
    expect(habla()).toEqual([nombre('surfista')])
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    // Nico cuenta lo del lugar, los dos datos seguidos.
    for (const dato of nivel.datos!) {
      await screen.findByText(dato.texto)
      expect(screen.getByText(/¿Sabías que…\?/)).toBeTruthy()
      fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    }
    // Después saluda Toto, el compañero de Nico.
    await screen.findByText(PERSONAJES.find((p) => p.id === 'delpuerto')!.saludo)
    expect(habla()).toEqual([nombre('delpuerto')])
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
    // Te da ánimo tu compañera, y Nico cierra.
    await screen.findByText(PERSONAJES.find((p) => p.id === 'guardavidas')!.saludo)
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    await screen.findByText(nivel.frases.at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: '¡A jugar!' }))
    expect(screen.getByTestId('ruta').textContent).toBe('/mesa')
    const conexion = useJuego.getState().conexion as ConexionLocal
    expect(conexion.historia).toEqual({ departamento: 'rocha', barrio: 'la-paloma', nivel: 2 })
  })

  it('el admin tiene todos los barrios y niveles abiertos', async () => {
    servidorFalso({})
    comoAdmin()
    app('/historia/rocha')
    await waitFor(() => expect((screen.getByRole('button', { name: 'Entrar a La Paloma' }) as HTMLButtonElement).disabled).toBe(false))
    fireEvent.click(screen.getByRole('button', { name: 'Barrio 6 · Santa Teresa y Chuy' }))
    expect((screen.getByRole('button', { name: 'Entrar a Santa Teresa y Chuy' }) as HTMLButtonElement).disabled).toBe(false)
    cleanup()
    app('/historia/rocha/santa-teresa-y-chuy/6')
    expect(await screen.findByRole('heading', { name: ULTIMO.niveles[5]!.lugar })).toBeTruthy()
  })

  it('un nivel o un barrio cerrado no se puede abrir por la dirección', async () => {
    servidorFalso({})
    comoAdmin(false)
    app('/historia/rocha/la-paloma/3')
    await waitFor(() => expect(screen.getByText(/Se está armando/)).toBeTruthy())
    cleanup()
    app('/historia/rocha/la-pedrera')
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
  it('sienta al elenco del nivel en su lugar, en la mesa de su barrio y con la baraja de Rocha, a los puntos del nivel', async () => {
    const sala = await new Promise<Extract<MensajeServidor, { tipo: 'sala' }>['datos']>((resolve) => {
      const c = conexionHistoria(leerPerfil(), { departamento: 'rocha', barrio: 'la-paloma', nivel: 4 })
      c.escuchar((m) => {
        if (m.tipo !== 'sala') return
        c.salir()
        resolve(m.datos)
      })
    })
    const elenco = elencoDelNivel(PALOMA.niveles[3]!)
    expect(sala.lugares.slice(1).map((l) => l.apodo)).toEqual(elenco.map((p) => p.nombre))
    expect(sala.mesa).toBe('la-paloma')
    // La baraja del departamento (la que se gana al final), aunque elegiste otra.
    expect(sala.baraja).toBe('costa')
    expect(barajaDeDepartamento('artigas')).toBe('artigas')
    expect(sala.formato).toBe('3v3')
    expect(sala.config.puntosPartida).toBe(30)
    expect(sala.nivelBots).toBe('medio')
  })

  it('al ganar el último de Rocha, se anota y se ven las recompensas; la escena del final lleva a la despedida del barrio', async () => {
    const pedidos = servidorFalso({ ...rochaCompleta(BARRIOS.length - 1), [`rocha/${ULTIMO.id}`]: hasta(5) })
    comoAdmin()
    fin(6, true, () => {}, ULTIMO.id)
    const premios = await screen.findByRole('status')
    await waitFor(() => expect(within(premios).getByText(/Baraja Costa Uruguaya/)).toBeTruthy())
    expect(within(premios).getByText(/Mesa Rocha/)).toBeTruthy()
    expect(pedidos.find((p) => p.url.endsWith('/historia/ganar'))!.cuerpo).toEqual({ departamento: 'rocha', barrio: ULTIMO.id, nivel: 6 })
    // "Seguir": la escena en la Fortaleza, con lo que dice Cleusa al perder (es mano a mano: sin compañero).
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    const escena = screen.getByRole('dialog', { name: 'Ganaste en La Fortaleza de Santa Teresa' })
    expect(within(escena).getByText(ULTIMO.niveles[5]!.alFinal!.ganaste)).toBeTruthy()
    const loQueGanaste = within(escena).getByRole('region', { name: 'Lo que ganaste' })
    expect(within(loQueGanaste).getByText(/Baraja Costa Uruguaya/)).toBeTruthy()
    expect(within(escena).queryByRole('button', { name: 'Siguiente nivel' })).toBeNull()
    fireEvent.click(within(escena).getByRole('button', { name: 'Despedirte de Santa Teresa y Chuy' }))
    expect(screen.getByTestId('ruta').textContent).toBe(`/historia/rocha/${ULTIMO.id}/despedida`)
  })

  it('al ganar uno del medio: el rival te reconoce, tu compañera festeja y sigue el siguiente nivel', async () => {
    servidorFalso({ 'rocha/la-paloma': [1] })
    comoAdmin()
    fin(2, true)
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    const escena = screen.getByRole('dialog', { name: `Ganaste en ${PALOMA.niveles[1]!.lugar}` })
    const [rival, companiero] = escenaDelFinal(PALOMA.niveles[1]!, 2, true)
    expect(within(escena).getByText(rival!.texto)).toBeTruthy()
    // Mientras hablan no están los botones; "Saltar" va directo al final.
    expect(within(escena).queryByRole('button', { name: 'Siguiente nivel' })).toBeNull()
    fireEvent.click(within(escena).getByRole('button', { name: 'Seguir' }))
    expect(await within(escena).findByText(companiero!.texto)).toBeTruthy()
    expect(within(escena).queryByRole('button', { name: 'Saltar' })).toBeNull()
    await within(escena).findByText(/Traje de neoprene/)
    fireEvent.click(within(escena).getByRole('button', { name: 'Siguiente nivel' }))
    expect(screen.getByTestId('ruta').textContent).toBe('/historia/rocha/la-paloma/3')
  })

  it('al perder no se anota nada: el rival te gasta, tu compañera te da ánimo y revancha o volver', async () => {
    const pedidos = servidorFalso()
    comoAdmin()
    const revancha = vi.fn()
    fin(2, false, revancha)
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    const escena = screen.getByRole('dialog', { name: `Perdiste en ${PALOMA.niveles[1]!.lugar}` })
    const [rival, companiero] = escenaDelFinal(PALOMA.niveles[1]!, 2, false)
    expect(within(escena).getByText(rival!.texto)).toBeTruthy()
    fireEvent.click(within(escena).getByRole('button', { name: 'Saltar' }))
    expect(await within(escena).findByText(companiero!.texto)).toBeTruthy()
    expect(within(escena).queryByRole('region', { name: 'Lo que ganaste' })).toBeNull()
    fireEvent.click(within(escena).getByRole('button', { name: 'Revancha' }))
    expect(revancha).toHaveBeenCalled()
    expect(pedidos.some((p) => p.url.endsWith('/historia/ganar'))).toBe(false)
  })

  it('el último nivel de un barrio, repetido, no vuelve a despedirse: Volver al barrio', async () => {
    servidorFalso(rochaCompleta(1))
    comoAdmin()
    vi.mocked(fetch).mockImplementation(async (url) =>
      String(url).endsWith('/historia/ganar') ? Response.json({ progreso: rochaCompleta(1), nuevas: [], inventario: [] }) : Response.json({ progreso: {} }),
    )
    fin(6, true)
    await screen.findByText('Este nivel ya lo tenías ganado.')
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    const escena = screen.getByRole('dialog')
    expect(within(escena).queryByRole('button', { name: /Despedirte/ })).toBeNull()
    const volver = within(escena).getByRole('button', { name: 'Volver a La Paloma' })
    expect(volver.className).toContain('boton-grande')
    fireEvent.click(volver)
    expect(screen.getByTestId('ruta').textContent).toBe('/historia/rocha/la-paloma')
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

describe('las despedidas', () => {
  it('los textos: cada personaje tiene lo suyo para el final y cada departamento y barrio su despedida', () => {
    for (const p of PERSONAJES) {
      expect(p.siGana.length, p.id).toBeGreaterThan(0)
      expect(p.siPierde.length, p.id).toBeGreaterThan(0)
    }
    for (const d of DEPARTAMENTOS) {
      const h = HISTORIAS[d.id]!
      expect(h.despedida.length, d.id).toBeGreaterThanOrEqual(2)
      for (const b of barriosDe(h)) expect(b.despedida.length, `${d.id} ${b.id}`).toBeGreaterThanOrEqual(2)
      // Sin "alFinal", el rival dice lo de su personaje.
      const sinTexto = barriosDe(h)
        .flatMap((b) => b.niveles)
        .find((n) => !n.alFinal)
      if (sinTexto) {
        const jefe = PERSONAJES.find((p) => p.id === sinTexto.rivales[0])!
        expect(escenaDelFinal(sinTexto, 1, true)[0]!.texto).toBe(jefe.siPierde)
        expect(escenaDelFinal(sinTexto, 1, false)[0]!.texto).toBe(jefe.siGana)
      }
    }
    // Rocha: Julio primero y después los de cada barrio; Julio abre y cierra.
    const elenco = elencoDelDepartamento(ROCHA)
    expect(elenco).toEqual(['pescador', 'surfista', 'ballenera', 'farera', 'palafito', 'cambista'])
    const charla = despedidaDelDepartamento(ROCHA)
    expect(charla[0]!.quien).toBe('pescador')
    expect(charla.at(-1)!.quien).toBe('pescador')
    expect(charla).toHaveLength(elenco.length - 1 + ROCHA.despedida.length)
  })

  it('al completar un barrio: te despiden los de ahí, lo que te llevás y el barrio que sigue', async () => {
    servidorFalso(rochaCompleta(1))
    comoAdmin(false)
    app('/historia/rocha/la-paloma/despedida')
    const charla = despedidaDelBarrio(PALOMA)
    for (const [i, turno] of charla.entries()) {
      expect(await screen.findByText(turno.texto)).toBeTruthy()
      if (i < charla.length - 1) fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    const llevas = screen.getByRole('region', { name: 'Te llevás de La Paloma' })
    // Las piezas una vez cada una y las monedas, sumadas.
    const monedas = PALOMA.niveles.flatMap((n) => n.recompensas).reduce((s, r) => s + monedasDeRecompensa(r), 0)
    expect(within(llevas).getByText(new RegExp(`${monedas} monedas`))).toBeTruthy()
    expect(within(llevas).getByText(/Tabla de surf/)).toBeTruthy()
    const destinos = screen.getByRole('region', { name: 'Próximos destinos' })
    expect(within(destinos).getByText('La Pedrera')).toBeTruthy()
    expect(within(destinos).getByText('¡Abierto!')).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Seguir a La Pedrera' }))
    expect(screen.getByRole('button', { name: 'Entrar a La Pedrera' })).toBeTruthy()
  })

  it('al completar Rocha: te despiden, ves lo que te llevás y los próximos destinos; "Seguir viaje" vuelve al mapa con la ruta', async () => {
    servidorFalso(rochaCompleta())
    comoAdmin(false)
    app('/historia/rocha/despedida')
    const charla = despedidaDelDepartamento(ROCHA)
    for (const [i, turno] of charla.entries()) {
      expect(await screen.findByText(turno.texto)).toBeTruthy()
      if (i < charla.length - 1) fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Seguir' }))
    const llevas = screen.getByRole('region', { name: 'Te llevás de Rocha' })
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
   }, 15_000)

  it('sin completar el departamento no hay despedida; completo, se vuelve a ver desde el departamento', async () => {
    servidorFalso(rochaCompleta(2))
    comoAdmin(false)
    const { unmount } = app('/historia/rocha/despedida')
    expect(await screen.findByText(/Se está armando/)).toBeTruthy()
    unmount()
    useHistoria.setState({ progreso: null })
    servidorFalso(rochaCompleta())
    app('/historia/rocha')
    fireEvent.click(await screen.findByRole('button', { name: 'Ver la despedida' }))
    expect(await screen.findByText(despedidaDelDepartamento(ROCHA)[0]!.texto)).toBeTruthy()
  })
})

describe('cooperativo', () => {
  it('"Jugar con un amigo" está en los niveles de equipos, no en los mano a mano', async () => {
    servidorFalso({ 'rocha/la-paloma': [1] })
    comoAdmin()
    app('/historia/rocha/la-paloma/1')
    await screen.findByRole('heading', { name: PALOMA.niveles[0]!.lugar })
    await recorrerPrevia(1)
    await screen.findByRole('button', { name: '¡A jugar!' })
    expect(screen.queryByRole('button', { name: 'Jugar con un amigo' })).toBeNull()
    cleanup()
    app('/historia/rocha/la-paloma/2')
    await screen.findByRole('heading', { name: PALOMA.niveles[1]!.lugar })
    await recorrerPrevia(2)
    expect(await screen.findByRole('button', { name: 'Jugar con un amigo' })).toBeTruthy()
  })

  it('la sala de espera del nivel: dónde y contra quién, los lugares rivales del elenco y sin configurar', async () => {
    const f = conexionFalsa()
    act(() => useJuego.getState().conectar(f.c))
    const nivel = PALOMA.niveles[3]!
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
      historia: { departamento: 'rocha', barrio: 'la-paloma', nivel: 4 },
    }
    render(
      <MemoryRouter initialEntries={['/sala']}>
        <Routes>
          <Route path="/sala" element={<Sala />} />
        </Routes>
      </MemoryRouter>,
    )
    f.llegar({ tipo: 'sala', datos: sala })
    expect(await screen.findByRole('heading', { name: 'Rocha · La Paloma · Nivel 4' })).toBeTruthy()
    expect(screen.getByText(/Nico, Toto y Doña Marta contra ustedes/)).toBeTruthy()
    expect(screen.getByLabelText('Lugar 2: Nico, rival del nivel')).toBeTruthy()
    // El nivel manda: no hay mesa ni reglas para cambiar.
    expect(screen.queryByRole('button', { name: /Cambiar/ })).toBeNull()
    // De fondo, el lugar del nivel.
    expect(document.documentElement.dataset.lugar).toBe('rocha')
    expect(document.documentElement.dataset.barrio).toBe('la-paloma')
    expect(document.documentElement.dataset.nivel).toBe('4')
  })

  it('en cooperativo, lo que te tocó lo dice el servidor (y no se pide a la API)', async () => {
    const pedidos = servidorFalso()
    comoAdmin()
    render(
      <MemoryRouter>
        <FinHistoria jugado={{ departamento: 'rocha', barrio: 'la-paloma', nivel: 2 }} ganamos revancha={() => {}} online />
      </MemoryRouter>,
    )
    expect(screen.getByText('Anotando el nivel…')).toBeTruthy()
    act(() => useJuego.setState({ premioHistoria: { nuevas: [...PALOMA.niveles[1]!.recompensas], anotado: true } }))
    expect(screen.getByText(/Traje de neoprene/)).toBeTruthy()
    act(() => useJuego.setState({ premioHistoria: { nuevas: [], anotado: false } }))
    expect(screen.getByText(/primero ganá el nivel anterior/)).toBeTruthy()
    expect(pedidos.some((p) => p.url.endsWith('/historia/ganar'))).toBe(false)
  })
})
