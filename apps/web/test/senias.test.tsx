import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { apply, crearConfig, crearPartida, esperandoA, vistaPara, type EstadoPartida } from '@truco/engine'
import { GESTO, SIGNIFICADO, seniasDeMano, type Senia } from '@truco/bots'
import { MOTIVO_SENIA_TARDE, SENIAS_DEFAULT, type ConfigSenias, type InfoSala, type MensajesCliente } from '@truco/shared'
import type { Conexion, MensajeServidor } from '../src/conexion/tipos'
import { DURACION_GESTO } from '../src/componentes/Cara'
import { useJuego } from '../src/estado'
import { Mesa } from '../src/pantallas/Mesa'

function App() {
  return (
    <MemoryRouter initialEntries={['/mesa']}>
      <Routes>
        <Route path="/" element={<div>Inicio</div>} />
        <Route path="/mesa" element={<Mesa />} />
      </Routes>
    </MemoryRouter>
  )
}

afterEach(() => {
  act(() => useJuego.getState().salir())
  cleanup()
  sessionStorage.clear()
})

/** Conexión de mentira "online": el test decide qué llega y ve lo que se manda. */
function conexionFalsa() {
  let oyente: ((m: MensajeServidor) => void) | null = null
  const enviados: { tipo: keyof MensajesCliente; datos: unknown }[] = []
  const c = {
    tipo: 'online' as const,
    roomId: 'SALA2',
    enviar: (tipo: keyof MensajesCliente, datos: unknown) => void enviados.push({ tipo, datos }),
    escuchar: (o: (m: MensajeServidor) => void) => {
      oyente = o
      return () => (oyente = null)
    },
    salir: () => {},
  }
  return { c: c as Conexion, enviados, llegar: (m: MensajeServidor) => act(() => oyente!(m)) }
}

const APODOS = ['Luis', 'Ana', 'Pepe', 'Rita']

/** Un 2v2 entre personas, visto desde el asiento al que le toca (o desde quien acaba de jugar). */
function partida2v2({ senias = SENIAS_DEFAULT, ayudas = true, jugada = false }: { senias?: ConfigSenias; ayudas?: boolean; jugada?: boolean } = {}) {
  const config = crearConfig({ formato: '2v2' })
  let estado: EstadoPartida | null = null
  let yo = 0
  // Busca un reparto en el que quien empieza pueda tirar una carta (sin flor de por medio).
  for (let semilla = 1; semilla < 100 && !estado; semilla++) {
    const e = crearPartida({ jugadores: APODOS.map((n, a) => ({ id: `j${a}`, nombre: n })), semilla, config, reparte: 3 })
    yo = esperandoA(e)[0]!
    const v = vistaPara(e, `j${yo}`)
    const carta = v.accionesValidas.find((a) => a.tipo === 'jugarCarta')
    if (!carta) continue
    if (!jugada) estado = e
    else {
      const r = apply(e, carta)
      if (r.ok) estado = r.estado
    }
  }
  const sala: InfoSala = {
    codigo: 'SALA2',
    publica: false,
    fase: 'jugando',
    formato: '2v2',
    config,
    botsEnVacios: false,
    nivelBots: 'medio',
    ayudas,
    senias,
    chatEquipo: true,
    lugares: APODOS.map((apodo, a) => ({ asiento: a, tipo: 'humano' as const, apodo, avatar: '🧉', conectado: true, anfitrion: a === 0 })),
    yo,
    revancha: [],
  }
  return { sala, vista: vistaPara(estado!, `j${yo}`), yo }
}

async function entrar(datos: ReturnType<typeof partida2v2>) {
  const f = conexionFalsa()
  act(() => useJuego.getState().conectar(f.c))
  render(<App />)
  f.llegar({ tipo: 'sala', datos: datos.sala })
  f.llegar({ tipo: 'vista', datos: datos.vista })
  await waitFor(() => expect(screen.getByLabelText('Mazo y muestra')).toBeTruthy())
  return f
}

const abrir = () => {
  fireEvent.click(screen.getByRole('button', { name: 'Hacer una seña' }))
  return screen.getByRole('dialog', { name: 'Señas' })
}
const nombre = (s: Senia) => `${GESTO[s]} (${SIGNIFICADO[s]})`
const seniasEnviadas = (enviados: { tipo: string; datos: unknown }[]) =>
  enviados.filter((e) => e.tipo === 'senia').map((e) => (e.datos as MensajesCliente['senia']).senia)

describe('cara de señas', () => {
  it('tocar cada parte de la cara manda la seña que corresponde', async () => {
    const { enviados } = await entrar(partida2v2())
    const zonas: [string, Senia][] = [
      [nombre('pieza2'), 'pieza2'],
      [nombre('perico'), 'perico'],
      [nombre('perica'), 'perica'],
      [nombre('pieza5'), 'pieza5'],
      [nombre('unoBravo'), 'unoBravo'],
      [nombre('sieteBravo'), 'sieteBravo'],
      [nombre('flor'), 'flor'],
    ]
    for (const [etiqueta, senia] of zonas) {
      const panel = abrir()
      fireEvent.click(within(panel).getByRole('button', { name: etiqueta }))
      expect(seniasEnviadas(enviados).at(-1)).toBe(senia)
      // La cara hace el gesto y dice qué se mandó.
      expect(panel.querySelector('.cara-grande')!.getAttribute('data-gesto')).toBe(senia)
      expect(panel.querySelector('.senias-hecha')!.textContent).toContain(SIGNIFICADO[senia])
      fireEvent.click(within(panel).getByRole('button', { name: 'Cerrar' }))
    }
    expect(seniasEnviadas(enviados)).toEqual(zonas.map(([, s]) => s))
  })

  it('la boca abre un menú corto con sus cinco señas', async () => {
    const { enviados } = await entrar(partida2v2())
    const panel = abrir()
    const boca = within(panel).getByRole('button', { name: 'Boca: más señas' })
    fireEvent.click(boca)
    expect(boca.getAttribute('aria-expanded')).toBe('true')
    const menu = within(panel).getByRole('group', { name: 'Señas con la boca' })
    expect(within(menu).getAllByRole('button')).toHaveLength(5)
    fireEvent.click(within(menu).getByRole('button', { name: nombre('unoFalso') }))
    expect(seniasEnviadas(enviados)).toEqual(['unoFalso'])
    // Después de mostrar el gesto, la hoja se cierra sola.
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Señas' })).toBeNull(), { timeout: 3000 })
    expect(screen.getByText(/Le hiciste la seña: sacar la lengua/)).toBeTruthy()
  })

  it('con ayudas se marcan las señas de tus cartas; sin ayudas, ninguna', async () => {
    const datos = partida2v2()
    await entrar(datos)
    const mias = seniasDeMano(datos.vista.mano.misCartas, datos.vista.mano.muestra)
    const panel = abrir()
    const marcadas = [...panel.querySelectorAll('.sugerida')].map((b) => b.getAttribute('aria-label'))
    const DE_BOCA: Senia[] = ['pieza4', 'tres', 'dosComun', 'unoFalso', 'flor']
    for (const s of mias) {
      if (s === 'flor') expect(marcadas).toContain(nombre('flor'))
      else if (DE_BOCA.includes(s)) expect(marcadas).toContain('Boca: más señas')
      else expect(marcadas).toContain(nombre(s))
    }
    if (mias.length === 0) expect(within(panel).getByText(/Tus cartas no tienen seña/)).toBeTruthy()
    act(() => useJuego.getState().salir())
    cleanup()

    await entrar(partida2v2({ ayudas: false }))
    expect(abrir().querySelectorAll('.sugerida')).toHaveLength(0)
  })

  it('con "antesDeJugar", después de tirar tu carta el botón queda deshabilitado', async () => {
    await entrar(partida2v2({ senias: { ...SENIAS_DEFAULT, momento: 'antesDeJugar' }, jugada: true }))
    const boton = screen.getByRole('button', { name: 'Hacer una seña' }) as HTMLButtonElement
    expect(boton.disabled).toBe(true)
    expect(boton.title).toBe(MOTIVO_SENIA_TARDE)
  })

  it('con "libre", después de tirar tu carta se sigue pudiendo', async () => {
    await entrar(partida2v2({ jugada: true }))
    expect((screen.getByRole('button', { name: 'Hacer una seña' }) as HTMLButtonElement).disabled).toBe(false)
  })
})

describe('gestos en los avatares', () => {
  const avatarDe = (apodo: string) =>
    screen.getAllByText(apodo).find((el) => el.closest('.asiento'))!.closest('.asiento')!.querySelector('.avatar')!

  it('la seña de un compañero se ve como gesto en su avatar y después vuelve el ícono', async () => {
    const datos = partida2v2()
    const { llegar } = await entrar(datos)
    const companiero = (datos.yo + 2) % 4
    llegar({ tipo: 'senia', datos: { de: companiero, senia: 'pieza2' } })
    const avatar = avatarDe(APODOS[companiero]!)
    expect(avatar.querySelector('.avatar-gesto')!.getAttribute('data-gesto')).toBe('pieza2')
    expect(avatar.querySelector('svg.cara')!.getAttribute('data-gesto')).toBe('pieza2')
    // El texto queda como apoyo, en un globito al lado del avatar.
    expect(avatar.closest('.asiento')!.querySelector('.globo-senia')!.textContent).toContain('2 de la muestra')
    await waitFor(() => expect(avatar.querySelector('.avatar-gesto')).toBeNull(), { timeout: DURACION_GESTO + 1500 })
    expect(avatar.textContent).toContain('🧉')
  })

  it('varias señas seguidas se hacen de a una', async () => {
    const datos = partida2v2()
    const { llegar } = await entrar(datos)
    const companiero = (datos.yo + 2) % 4
    llegar({ tipo: 'senia', datos: { de: companiero, senia: 'perico' } })
    llegar({ tipo: 'senia', datos: { de: companiero, senia: 'tres' } })
    const gesto = () => avatarDe(APODOS[companiero]!).querySelector('.avatar-gesto')?.getAttribute('data-gesto')
    expect(gesto()).toBe('perico')
    await waitFor(() => expect(gesto()).toBe('tres'), { timeout: DURACION_GESTO + 1000 })
  })

  it('una seña pescada sin carta: el rival disimula y el globito no dice cuál', async () => {
    const datos = partida2v2()
    const { llegar } = await entrar(datos)
    const rival = (datos.yo + 1) % 4
    llegar({ tipo: 'seniaPescada', datos: { de: rival, senia: null } })
    expect(avatarDe(APODOS[rival]!).querySelector('.avatar-gesto')!.getAttribute('data-gesto')).toBe('disimulo')
    const globo = screen.getByText(/le hizo una seña a su compañero/).closest('.globo')!
    expect(globo.classList.contains('pescada')).toBe(true)
    expect(globo.closest('.asiento')!.textContent).toContain(APODOS[rival])
    expect(globo.querySelector('b')).toBeNull()
  })

  it('una seña pescada con carta: se ve el gesto y lo que significa', async () => {
    const datos = partida2v2()
    const { llegar } = await entrar(datos)
    const rival = (datos.yo + 3) % 4
    llegar({ tipo: 'seniaPescada', datos: { de: rival, senia: 'perica' } })
    expect(avatarDe(APODOS[rival]!).querySelector('.avatar-gesto')!.getAttribute('data-gesto')).toBe('perica')
    const globo = avatarDe(APODOS[rival]!).closest('.asiento')!.querySelector('.globo-senia')!
    expect(globo.classList.contains('pescada')).toBe(true)
    expect(globo.textContent).toContain('perica')
  })
})
