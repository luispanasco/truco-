import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { MENSAJE_SOLUCIONADO, pasosDeRepeticion, type AvisoReporte, type ReporteEnviado, type ReporteListado } from '@truco/shared'
import { ConexionLocal } from '../src/conexion/local'
import { useCuenta } from '../src/cuenta/cuenta'
import { useJuego } from '../src/estado'
import { Mesa } from '../src/pantallas/Mesa'
import { AdminReportes } from '../src/pantallas/AdminReportes'
import { AvisoReportes, olvidarAvisosPedidos } from '../src/componentes/AvisoReportes'
import { Ajustes } from '../src/menu/Ajustes'
import { guardarPerfil, leerPerfil } from '../src/perfil'

let pedidos: { url: string; metodo: string; cuerpo: unknown; auth: string | null }[] = []
let falla = false
let avisos: AvisoReporte[] = []
let saldoAvisos: number | undefined

const LISTA: ReporteListado[] = [
  {
    id: 7,
    fecha: '2026-11-10T21:30:00Z',
    tipo: 'bot',
    descripcion: 'El bot se fue al mazo con flor',
    apodo: 'Luis',
    cuentaId: null,
    email: null,
    invitadoId: 'invitado-123456',
    ruta: '/mesa',
    version: 'abc123 (2026-11-10)',
    donde: 'Contra la compu',
    conRepeticion: true,
    solucionado: null,
    premio: 0,
  },
  {
    id: 6,
    fecha: '2026-11-10T20:00:00Z',
    tipo: 'visual',
    descripcion: '',
    apodo: 'Ana',
    cuentaId: 'a',
    email: 'ana@ejemplo.com',
    invitadoId: 'invitado-654321',
    ruta: '/',
    version: null,
    donde: 'Fuera de una partida',
    conRepeticion: false,
    solucionado: null,
    premio: 0,
  },
]

function servidor() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const headers = (init?.headers ?? {}) as Record<string, string>
      pedidos.push({ url, metodo: init?.method ?? 'GET', cuerpo: typeof init?.body === 'string' ? JSON.parse(init.body) : null, auth: headers.authorization ?? null })
      if (url.endsWith('/reportes') && init?.method === 'POST') {
        return falla ? Response.json({ motivo: 'Falló la base de datos' }, { status: 500 }) : Response.json({ id: 1 })
      }
      if (url.endsWith('/reportes')) return Response.json({ reportes: LISTA })
      if (url.includes('/reportes/avisos?')) return Response.json({ avisos, ...(saldoAvisos === undefined ? {} : { saldo: saldoAvisos }) })
      const solucionar = /\/reportes\/(\d+)\/solucionar$/.exec(url)
      if (solucionar) {
        const { premiar } = JSON.parse(init!.body as string) as { premiar: boolean }
        const conCuenta = LISTA.find((r) => r.id === Number(solucionar[1]))!.cuentaId !== null
        return Response.json({ solucionado: '2026-11-18T13:00:00Z', premio: conCuenta && premiar ? 100 : 0 })
      }
      return Response.json({ ok: true })
    }),
  )
}

function Ruta() {
  return <p data-testid="ruta">{useLocation().pathname}</p>
}

beforeEach(() => {
  // Un perfil guardado: el ID de invitado es siempre el mismo.
  guardarPerfil(leerPerfil())
  pedidos = []
  falla = false
  avisos = []
  saldoAvisos = undefined
  olvidarAvisosPedidos()
  servidor()
})
afterEach(() => {
  act(() => useJuego.getState().salir())
  useCuenta.setState({ estado: 'afuera', token: null, cuenta: null })
  vi.unstubAllGlobals()
  cleanup()
})

const reportesMandados = () => pedidos.filter((p) => p.url.endsWith('/reportes') && p.metodo === 'POST').map((p) => p.cuerpo as ReporteEnviado)

describe('reportar un problema', () => {
  it('desde la mesa: se elige el tipo, se manda con la partida local y se sigue jugando', async () => {
    act(() =>
      useJuego.getState().conectar(new ConexionLocal({ apodo: 'Luis', avatar: '🧉', formato: '1v1', nivelBots: 'facil', demoraBots: [0, 0], semilla: 21 })),
    )
    render(
      <MemoryRouter initialEntries={['/mesa']}>
        <Routes>
          <Route path="/mesa" element={<Mesa />} />
        </Routes>
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getByText('Te toca')).toBeTruthy(), { timeout: 5000 })
    // Que haya alguna jugada en la repetición: tirar una carta.
    fireEvent.click(screen.getByRole('button', { name: 'Ver todas' }))
    const jugables = screen.getAllByLabelText(/^Jugar el /).filter((b) => !(b as HTMLButtonElement).disabled)
    fireEvent.click(jugables[0]!)
    await waitFor(() => expect(useJuego.getState().vista!.mano.misCartas).toHaveLength(2), { timeout: 5000 })

    // La ✕ abre el menú; desde ahí, reportar.
    fireEvent.click(screen.getByRole('button', { name: 'Salir de la mesa' }))
    fireEvent.click(screen.getByRole('button', { name: '🐞 Reportar un problema' }))
    const hoja = screen.getByRole('dialog', { name: 'Reportar un problema' })
    const mandar = screen.getByRole('button', { name: 'Mandar' }) as HTMLButtonElement
    // Sin tipo no se manda.
    expect(mandar.disabled).toBe(true)
    fireEvent.click(screen.getByRole('radio', { name: 'Un bot hizo algo raro' }))
    expect(mandar.disabled).toBe(false)
    fireEvent.change(hoja.querySelector('textarea')!, { target: { value: 'El bot jugó raro' } })
    fireEvent.click(mandar)
    await waitFor(() => expect(screen.getByText('¡Gracias! Lo vamos a mirar.')).toBeTruthy())

    const [r] = reportesMandados()
    expect(r!.tipo).toBe('bot')
    expect(r!.descripcion).toBe('El bot jugó raro')
    expect(r!.apodo).toBe('Luis')
    expect(r!.invitadoId).toBe(leerPerfil().invitadoId)
    expect(r!.contexto.ruta).toBe('/')
    expect(typeof r!.contexto.version).toBe('string')
    expect(r!.contexto.navegador).toBeTruthy()
    expect(r!.contexto.local!.modo).toBe('compu')
    expect(r!.contexto.vista).toBeTruthy()
    expect(Array.isArray(r!.contexto.registro)).toBe(true)
    // La partida viaja entera: se vuelve a jugar con el motor y llega a la misma vista.
    const rep = r!.contexto.local!.repeticion!
    expect(rep.semilla).toBe(21)
    expect(rep.acciones.length).toBeGreaterThan(0)
    expect(rep.acciones.some((a) => a.asiento === 0 && a.accion.tipo === 'jugarCarta')).toBe(true)
    const pasos = pasosDeRepeticion(rep)
    expect(pasos.length).toBe(rep.acciones.length + 1)
    expect(pasos.at(-1)!.estado.mano.cartas[0]).toHaveLength(useJuego.getState().vista!.mano.misCartas.length)

    // Se sigue en la mesa.
    fireEvent.click(screen.getByRole('button', { name: 'Listo' }))
    expect(screen.queryByRole('dialog', { name: 'Reportar un problema' })).toBeNull()
    expect(useJuego.getState().conexion).not.toBeNull()
  })

  it('desde Ajustes, fuera de una partida; si falla, se ve el error y se reintenta', async () => {
    falla = true
    const perfil = leerPerfil()
    render(
      <MemoryRouter>
        <Ajustes perfil={perfil} cambiar={() => {}} />
      </MemoryRouter>,
    )
    // Sin ser admin no se ve el acceso a los reportes.
    expect(screen.queryByRole('button', { name: /Ver los reportes/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '🐞 Reportar un problema' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Se ve mal' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mandar' }))
    await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Falló la base de datos'))
    falla = false
    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    await waitFor(() => expect(screen.getByText('¡Gracias! Lo vamos a mirar.')).toBeTruthy())
    const r = reportesMandados().at(-1)!
    expect(r.tipo).toBe('visual')
    expect(r.contexto.local).toBeUndefined()
    expect(r.contexto.online).toBeUndefined()
    expect(reportesMandados()).toHaveLength(2)
  })

  it('con tu cuenta, el reporte va con la sesión', async () => {
    useCuenta.setState({ estado: 'adentro', token: 'prueba:ana@ejemplo.com', cuenta: { id: 'a', email: 'ana@ejemplo.com', apodo: 'Ana', avatar: null, preferencias: {}, nueva: false } })
    render(
      <MemoryRouter>
        <Ajustes perfil={leerPerfil()} cambiar={() => {}} />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: '🐞 Reportar un problema' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Otro' }))
    fireEvent.click(screen.getByRole('button', { name: 'Mandar' }))
    await waitFor(() => expect(reportesMandados()).toHaveLength(1))
    const p = pedidos.find((x) => x.metodo === 'POST')!
    expect(p.auth).toBe('Bearer prueba:ana@ejemplo.com')
    expect(reportesMandados()[0]!.apodo).toBe('Ana')
  })
})

describe('reportes del admin', () => {
  it('el admin ve el acceso en Ajustes y la lista, con "Ver la partida"', async () => {
    useCuenta.setState({
      estado: 'adentro',
      token: 'prueba:admin@ejemplo.com',
      cuenta: { id: 'x', email: 'admin@ejemplo.com', apodo: 'Admin', avatar: null, preferencias: {}, nueva: false, admin: true },
    })
    render(
      <MemoryRouter initialEntries={['/ajustes']}>
        <Routes>
          <Route path="/ajustes" element={<Ajustes perfil={leerPerfil()} cambiar={() => {}} />} />
          <Route path="/admin/reportes" element={<AdminReportes />} />
          <Route path="*" element={<Ruta />} />
        </Routes>
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: /Ver los reportes/ }))
    await waitFor(() => expect(screen.getByText('El bot se fue al mazo con flor')).toBeTruthy())
    expect(screen.getByText('Un bot hizo algo raro')).toBeTruthy()
    expect(screen.getByText('Se ve mal')).toBeTruthy()
    expect(screen.getByText(/ana@ejemplo\.com/)).toBeTruthy()
    expect(screen.getByText(/Contra la compu/)).toBeTruthy()
    // Solo el que trae la partida tiene el botón.
    const ver = screen.getAllByRole('button', { name: 'Ver la partida' })
    expect(ver).toHaveLength(1)
    expect(pedidos.find((p) => p.url.endsWith('/reportes'))!.auth).toBe('Bearer prueba:admin@ejemplo.com')
    fireEvent.click(ver[0]!)
    expect(screen.getByTestId('ruta').textContent).toBe('/admin/reportes/7/partida')
  })

  it('sin ser admin, la pantalla no muestra nada', () => {
    useCuenta.setState({ estado: 'adentro', token: 'prueba:ana@ejemplo.com', cuenta: { id: 'a', email: 'ana@ejemplo.com', apodo: 'Ana', avatar: null, preferencias: {}, nueva: false } })
    render(
      <MemoryRouter>
        <AdminReportes />
      </MemoryRouter>,
    )
    expect(screen.getByText('Esta pantalla es solo para el admin.')).toBeTruthy()
    expect(pedidos.some((p) => p.url.endsWith('/reportes'))).toBe(false)
  })
})

describe('reportes solucionados', () => {
  const comoAdmin = () =>
    useCuenta.setState({
      estado: 'adentro',
      token: 'prueba:admin@ejemplo.com',
      cuenta: { id: 'x', email: 'admin@ejemplo.com', apodo: 'Admin', avatar: null, preferencias: {}, nueva: false, admin: true },
    })

  it('el admin lo marca solucionado con el mensaje y el premio; a un invitado no se le ofrece', async () => {
    comoAdmin()
    render(
      <MemoryRouter>
        <AdminReportes />
      </MemoryRouter>,
    )
    await waitFor(() => expect(screen.getAllByRole('button', { name: 'Marcar solucionado' })).toHaveLength(2))
    // El de Luis es de un invitado: sin monedas.
    fireEvent.click(screen.getAllByRole('button', { name: 'Marcar solucionado' })[0]!)
    const deLuis = screen.getByRole('group', { name: 'Solucionar el reporte 7' })
    expect(deLuis.querySelector('input[type=checkbox]')).toBeNull()
    expect(deLuis.textContent).toContain('no tiene dónde cobrar')
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    // El de Ana tiene cuenta: el mensaje viene escrito y el premio, marcado.
    fireEvent.click(screen.getAllByRole('button', { name: 'Marcar solucionado' })[1]!)
    const deAna = screen.getByRole('group', { name: 'Solucionar el reporte 6' })
    const texto = deAna.querySelector('textarea')!
    expect(texto.value).toBe(MENSAJE_SOLUCIONADO)
    expect((screen.getByRole('checkbox', { name: 'Darle 100 monedas' }) as HTMLInputElement).checked).toBe(true)
    fireEvent.change(texto, { target: { value: 'Arreglado, ¡gracias Ana!' } })
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar' }))
    await waitFor(() => expect(screen.getByText(/Solucionado el .* · \+100 monedas/)).toBeTruthy())
    const p = pedidos.find((x) => x.url.endsWith('/reportes/6/solucionar'))!
    expect(p.metodo).toBe('POST')
    expect(p.auth).toBe('Bearer prueba:admin@ejemplo.com')
    expect(p.cuerpo).toEqual({ mensaje: 'Arreglado, ¡gracias Ana!', premiar: true })
    expect(screen.getAllByRole('button', { name: 'Marcar solucionado' })).toHaveLength(1)
  })

  it('con cuenta: el inicio muestra el agradecimiento con las monedas, actualiza el saldo y al cerrarlo no vuelve', async () => {
    useCuenta.setState({ estado: 'adentro', token: 'prueba:pepe@ejemplo.com', saldo: 20, cuenta: { id: 'p', email: 'pepe@ejemplo.com', apodo: 'Pepe', avatar: null, preferencias: {}, nueva: false } })
    avisos = [{ id: 5, tipo: 'bot', descripcion: 'Cacho tiene como 5 cartas', mensaje: MENSAJE_SOLUCIONADO, premio: 100 }]
    saldoAvisos = 120
    render(<AvisoReportes />)
    const hoja = await screen.findByRole('dialog', { name: '¡Gracias por tu reporte!' })
    expect(hoja.textContent).toContain('“Cacho tiene como 5 cartas”')
    expect(hoja.textContent).toContain(MENSAJE_SOLUCIONADO)
    expect(screen.getByLabelText('Ganaste 100 monedas')).toBeTruthy()
    expect(useCuenta.getState().saldo).toBe(120)
    const pedido = pedidos.find((x) => x.url.includes('/reportes/avisos?'))!
    expect(pedido.auth).toBe('Bearer prueba:pepe@ejemplo.com')
    expect(pedido.url).toContain(`invitado=${leerPerfil().invitadoId}`)

    fireEvent.click(screen.getByRole('button', { name: '¡Buenísimo!' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(pedidos.some((x) => x.url.endsWith('/reportes/avisos/vistos'))).toBe(true))
    expect(pedidos.find((x) => x.url.endsWith('/reportes/avisos/vistos'))!.cuerpo).toEqual({ ids: [5], invitadoId: leerPerfil().invitadoId })
    // Al volver al inicio no se piden otra vez.
    cleanup()
    render(<AvisoReportes />)
    expect(pedidos.filter((x) => x.url.includes('/reportes/avisos?'))).toHaveLength(1)
  })

  it('sin cuenta: gracias sin monedas, y la invitación a hacerse una', async () => {
    useCuenta.setState({ estado: 'afuera', token: null, cuenta: null })
    avisos = [{ id: 3, tipo: 'trabado', descripcion: '', mensaje: 'Ya no se traban las señas.', premio: 0 }]
    render(<AvisoReportes />)
    const hoja = await screen.findByRole('dialog', { name: '¡Gracias por tu reporte!' })
    expect(hoja.textContent).toContain('“Se trabó o no responde”')
    expect(hoja.textContent).toContain('Ya no se traban las señas.')
    expect(hoja.textContent).toContain('Con una cuenta, la próxima vez te llevás 100 monedas.')
    expect(screen.queryByLabelText(/Ganaste/)).toBeNull()
    expect(pedidos.find((x) => x.url.includes('/reportes/avisos?'))!.auth).toBeNull()
  })

  it('sin reportes arreglados no aparece nada', async () => {
    useCuenta.setState({ estado: 'afuera', token: null, cuenta: null })
    render(<AvisoReportes />)
    await waitFor(() => expect(pedidos.some((x) => x.url.includes('/reportes/avisos?'))).toBe(true))
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})
