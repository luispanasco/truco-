import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import {
  AVATAR_BASE,
  CAPAS_AVATAR,
  avatarAlAzar,
  codificarAvatar,
  esGratis,
  leerAvatar,
  type InfoSala,
  type MensajesServidor,
} from '@truco/shared'
import { EditorAvatar } from '../src/componentes/EditorAvatar'
import { TarjetaPerfil, usePerfil } from '../src/componentes/TarjetaPerfil'
import { ConexionLocal } from '../src/conexion/local'
import { leerPerfil } from '../src/perfil'

const BASE = codificarAvatar(AVATAR_BASE)

/** El editor con su estado, como lo usa el perfil; `cambios` junta los códigos que se guardaron. */
function Editor({ inicial = BASE, cambios }: { inicial?: string; cambios: string[] }) {
  const [codigo, setCodigo] = useState(inicial)
  return (
    <EditorAvatar
      codigo={codigo}
      apodo="Luis"
      alCambiar={(c) => {
        cambios.push(c)
        setCodigo(c)
      }}
    />
  )
}

const grande = () => document.querySelector('.editor-avatar-grande svg')

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('editor de avatar', () => {
  it('elegir una pieza gratis cambia el código', async () => {
    const cambios: string[] = []
    render(<Editor cambios={cambios} />)
    await waitFor(() => expect(grande()).toBeTruthy())
    fireEvent.click(screen.getByRole('tab', { name: 'Ojos' }))
    const tercera = screen.getByRole('radio', { name: 'Ojos 3' })
    expect(tercera.getAttribute('aria-checked')).toBe('false')
    fireEvent.click(tercera)
    expect(leerAvatar(cambios.at(-1))).toEqual({ ...AVATAR_BASE, ojos: 2 })
    expect(screen.getByRole('radio', { name: 'Ojos 3' }).getAttribute('aria-checked')).toBe('true')
    expect(grande()!.getAttribute('data-avatar')).toBe(cambios.at(-1))
  })

  it('los colores se eligen con muestras', () => {
    const cambios: string[] = []
    render(<Editor cambios={cambios} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Pelo' }))
    const colores = screen.getByRole('radiogroup', { name: 'Color de pelo' })
    fireEvent.click(within(colores).getByRole('radio', { name: 'Color 4' }))
    expect(leerAvatar(cambios.at(-1))!.colorPelo).toBe(3)
  })

  it('las piezas de la tienda muestran el precio y no se pueden elegir', () => {
    const cambios: string[] = []
    render(<Editor cambios={cambios} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Pelo' }))
    const paga = screen.getByRole('radio', { name: /^Peinado 13: 100 monedas/ })
    expect(paga.getAttribute('aria-disabled')).toBe('true')
    expect(paga.textContent).toContain('100')
    expect(paga.querySelector('.candado')).toBeTruthy()
    fireEvent.click(paga)
    expect(cambios).toHaveLength(0)
    expect(screen.getByRole('status').textContent).toContain('Pronto en la tienda')
    expect(screen.getByText(/Pronto en la tienda\.$/, { selector: '.editor-tienda' })).toBeTruthy()

    // El mate (accesorio) también es de la tienda.
    fireEvent.click(screen.getByRole('tab', { name: 'Accesorio' }))
    fireEvent.click(screen.getByRole('radio', { name: /^Mate: 300 monedas/ }))
    expect(cambios).toHaveLength(0)
  })

  it('"Al azar" arma avatares solo con piezas gratis', () => {
    const cambios: string[] = []
    render(<Editor cambios={cambios} />)
    for (let i = 0; i < 40; i++) fireEvent.click(screen.getByRole('button', { name: 'Al azar' }))
    expect(new Set(cambios).size).toBeGreaterThan(30)
    for (const codigo of cambios) {
      const a = leerAvatar(codigo)!
      for (const capa of CAPAS_AVATAR) expect(esGratis(capa, a[capa])).toBe(true)
    }
  })

  it('"Ver una seña" pone el gesto en el avatar grande un momento', async () => {
    render(<Editor cambios={[]} />)
    await waitFor(() => expect(grande()).toBeTruthy())
    vi.useFakeTimers()
    fireEvent.click(screen.getByRole('button', { name: 'Ver una seña' }))
    expect(grande()!.getAttribute('data-gesto')).toBe('pieza2')
    expect(screen.getByText('Levantar las cejas')).toBeTruthy()
    act(() => vi.advanceTimersByTime(2500))
    expect(grande()!.hasAttribute('data-gesto')).toBe(false)
    // La siguiente es otra seña.
    fireEvent.click(screen.getByRole('button', { name: 'Ver una seña' }))
    expect(grande()!.getAttribute('data-gesto')).toBe('pieza4')
  })
})

describe('el avatar en el perfil', () => {
  beforeEach(() => localStorage.clear())

  it('los emojis de antes pasan a un avatar armado desde el apodo, y queda guardado', () => {
    localStorage.setItem('truco.perfil', JSON.stringify({ invitadoId: 'inv-1', apodo: 'Luis', avatar: '🧉' }))
    const p = leerPerfil()
    expect(p.avatar).toBe(codificarAvatar(avatarAlAzar('Luis')))
    expect(JSON.parse(localStorage.getItem('truco.perfil')!).avatar).toBe(p.avatar)
  })

  it('sin apodo, se arma desde el id de invitado', () => {
    localStorage.setItem('truco.perfil', JSON.stringify({ invitadoId: 'inv-2', apodo: '', avatar: '🦉' }))
    expect(leerPerfil().avatar).toBe(codificarAvatar(avatarAlAzar('inv-2')))
  })

  it('un perfil nuevo arranca con un avatar gratis, el mismo en cada lectura', () => {
    const p = leerPerfil()
    const a = leerAvatar(p.avatar)!
    for (const capa of CAPAS_AVATAR) expect(esGratis(capa, a[capa])).toBe(true)
    expect(leerPerfil().avatar).toBe(p.avatar)
  })

  it('un avatar válido se respeta; las piezas de la tienda vuelven a las gratis', () => {
    const propio = codificarAvatar({ ...AVATAR_BASE, ojos: 5, boca: 3 })
    localStorage.setItem('truco.perfil', JSON.stringify({ invitadoId: 'inv-3', apodo: 'Ana', avatar: propio }))
    expect(leerPerfil().avatar).toBe(propio)
    localStorage.setItem('truco.perfil', JSON.stringify({ invitadoId: 'inv-3', apodo: 'Ana', avatar: codificarAvatar({ ...AVATAR_BASE, accesorio: 1 }) }))
    expect(leerPerfil().avatar).toBe(BASE)
  })

  it('desde la tarjeta del perfil se abre el editor y lo elegido queda guardado', async () => {
    localStorage.setItem('truco.perfil', JSON.stringify({ invitadoId: 'inv-4', apodo: 'Luis', avatar: BASE }))
    function Tarjeta() {
      const [perfil, cambiar] = usePerfil()
      return <TarjetaPerfil perfil={perfil} cambiar={cambiar} />
    }
    render(<Tarjeta />)
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar tu avatar' }))
    const editor = screen.getByRole('dialog', { name: 'Tu avatar' })
    fireEvent.click(within(editor).getByRole('tab', { name: 'Boca' }))
    fireEvent.click(within(editor).getByRole('radio', { name: 'Boca 2' }))
    expect(leerAvatar(leerPerfil().avatar)).toEqual({ ...AVATAR_BASE, boca: 1 })
    fireEvent.click(within(editor).getByRole('button', { name: 'Listo' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(document.querySelector('.perfil-avatar svg')?.getAttribute('data-avatar')).toBe(leerPerfil().avatar))
  })
})

describe('contra la compu', () => {
  it('cada bot tiene un avatar fijo desde su nombre, y la persona el de su perfil', async () => {
    const mio = codificarAvatar({ ...AVATAR_BASE, ojos: 4 })
    const c = new ConexionLocal({ apodo: 'Luis', avatar: mio, formato: '2v2', nivelBots: 'facil', demoraBots: [0, 0], semilla: 5 })
    const sala = await new Promise<InfoSala>((ok) =>
      c.escuchar((m) => {
        if (m.tipo === 'sala') ok(m.datos as MensajesServidor['sala'])
      }),
    )
    c.salir()
    expect(sala.lugares[0]!.avatar).toBe(mio)
    for (const l of sala.lugares.slice(1)) expect(l.avatar).toBe(codificarAvatar(avatarAlAzar(l.apodo, false)))
  })
})
