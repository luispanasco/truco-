import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import type { DetalleGrupo, MensajeGrupo, ResumenGrupo } from '@truco/shared'
import { Grupo } from '../src/pantallas/Grupo'
import { PanelGrupos } from '../src/menu/PanelGrupos'
import { CADA_CHAT_MS } from '../src/componentes/ChatGrupo'
import { useCuenta } from '../src/cuenta/cuenta'
import { cargarGrupos, useGrupos } from '../src/cuenta/grupos'

let pedidos: { metodo: string; url: string; cuerpo: Record<string, unknown> | null }[] = []
let chat: MensajeGrupo[] = []
let ultimoChat: number | null = null
let siguiente = 100

const ana = { id: 'a', apodo: 'Ana', avatar: null }
const beto = { id: 'b', apodo: 'Beto', avatar: null }
const texto = (id: number, autor: MensajeGrupo['autor'], t: string): MensajeGrupo => ({ id, creado: new Date().toISOString(), autor, tipo: 'texto', texto: t, senia: null })
const emote = (id: number, autor: MensajeGrupo['autor'], senia: 'perico' | 'unoBravo' | 'flor'): MensajeGrupo => ({
  id,
  creado: new Date().toISOString(),
  autor,
  tipo: 'emote',
  texto: null,
  senia,
})

const resumen: ResumenGrupo = {
  id: 'g1',
  nombre: 'Los del Boliche',
  sigla: 'BOL',
  descripcion: '',
  ingreso: 'abierto',
  cupo: null,
  convocan: 'todos',
  miembros: 2,
  foto: null,
  rol: 'miembro',
  pedido: false,
}
const detalle: DetalleGrupo = {
  ...resumen,
  lista: [
    { ...ana, rol: 'miembro', desde: '2026-11-01T00:00:00Z', estado: 'conectado', sala: null },
    { ...beto, rol: 'lider', desde: '2026-11-01T00:00:00Z', estado: 'conectado', sala: null },
  ],
  codigo: null,
  solicitudes: null,
}

function servidor() {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init?: RequestInit) => {
      const metodo = init?.method ?? 'GET'
      const cuerpo = init?.body && typeof init.body === 'string' ? (JSON.parse(init.body) as Record<string, unknown>) : null
      pedidos.push({ metodo, url, cuerpo })
      if (url.endsWith('/grupos')) return Response.json({ tuyos: [{ ...resumen, ultimoChat, ultimoMuro: null }], buscar: [], quedan: 5 })
      if (url.endsWith('/grupos/detalle')) return Response.json(detalle)
      if (url.endsWith('/grupos/muro')) return Response.json({ entradas: [], ranking: [] })
      const enChat = /\/grupos\/g1\/chat(\?desde=(\d+))?$/.exec(url)
      if (enChat && metodo === 'GET') {
        const desde = Number(enChat[2] ?? 0)
        return Response.json({ mensajes: chat.filter((m) => m.id > desde) })
      }
      if (enChat && metodo === 'POST') {
        const m = cuerpo!.senia ? emote(++siguiente, ana, cuerpo!.senia as 'perico') : texto(++siguiente, ana, cuerpo!.texto as string)
        chat.push(m)
        return Response.json(m)
      }
      if (/\/grupos\/g1\/chat\/\d+$/.test(url) && metodo === 'DELETE') {
        const id = Number(url.split('/').at(-1))
        chat = chat.filter((m) => m.id !== id)
        return Response.json({ ok: true })
      }
      return Response.json({ ok: true })
    }),
  )
}

function montar(ruta = '/grupos/g1') {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/" element={<PanelGrupos alEntrar={() => {}} />} />
        <Route path="/grupos/:id" element={<Grupo />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function abrirChat() {
  fireEvent.click(await screen.findByRole('tab', { name: /Chat/ }))
  return screen.findByRole('region', { name: 'Chat del grupo' })
}

beforeEach(() => {
  pedidos = []
  chat = [texto(1, beto, '¿Quién se prende a un partido?')]
  ultimoChat = 1
  siguiente = 100
  localStorage.clear()
  useGrupos.setState({ lista: null, vistos: {}, chatVisto: {} })
  useCuenta.setState({ estado: 'adentro', token: 'prueba:ana@ejemplo.com', cuenta: { id: 'a', email: 'ana@ejemplo.com', apodo: 'Ana', avatar: null, preferencias: {}, nueva: false } })
  servidor()
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
  useGrupos.setState({ lista: null })
})

describe('el chat del grupo', () => {
  it('muestra los mensajes y manda un texto (los tuyos a la derecha)', async () => {
    montar()
    const caja = await abrirChat()
    expect(await within(caja).findByText('¿Quién se prende a un partido?')).toBeTruthy()
    expect(within(caja).getByText('Beto')).toBeTruthy()
    const mandar = within(caja).getByRole('button', { name: 'Mandar' }) as HTMLButtonElement
    expect(mandar.disabled).toBe(true)
    fireEvent.change(within(caja).getByLabelText('Mensaje al grupo'), { target: { value: '  Yo me prendo  ' } })
    fireEvent.click(mandar)
    const mio = await within(caja).findByText('Yo me prendo')
    expect(mio.closest('.chatg-mensaje')!.className).toContain('mio')
    const post = pedidos.find((p) => p.metodo === 'POST' && p.url.endsWith('/grupos/g1/chat'))
    expect(post?.cuerpo).toEqual({ texto: 'Yo me prendo' })
    expect((within(caja).getByLabelText('Mensaje al grupo') as HTMLInputElement).value).toBe('')
  })

  it('manda un emote desde la grilla de señas y se ve con su nombre', async () => {
    montar()
    const caja = await abrirChat()
    fireEvent.click(within(caja).getByRole('button', { name: 'Mandar una seña' }))
    const grilla = within(caja).getByRole('group', { name: 'Mandar una seña' })
    // Las 12 señas, cada una con tu avatar haciendo el gesto.
    expect(within(grilla).getAllByRole('button')).toHaveLength(12)
    fireEvent.click(within(grilla).getByRole('button', { name: /La espadilla o el bastillo/ }))
    await waitFor(() => expect(within(caja).queryByRole('group', { name: 'Mandar una seña' })).toBeNull())
    expect(pedidos.find((p) => p.metodo === 'POST' && p.url.endsWith('/chat'))?.cuerpo).toEqual({ senia: 'unoBravo' })
    const nombre = await within(caja).findByText('¡La espadilla o el bastillo!')
    const mensaje = nombre.closest('.chatg-mensaje')!
    expect(mensaje.className).toContain('emote')
    expect(mensaje.className).toContain('mio')
    expect(mensaje.querySelector('.chatg-emote-cara [data-gesto="unoBravo"]')).toBeTruthy()
  })

  it('pide lo nuevo cada unos segundos (desde el último) y se borra lo propio', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    montar()
    const caja = await abrirChat()
    await within(caja).findByText('¿Quién se prende a un partido?')
    chat.push(emote(2, beto, 'perico'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CADA_CHAT_MS + 50)
    })
    expect(await within(caja).findByText('¡Perico!')).toBeTruthy()
    expect(pedidos.some((p) => p.url.endsWith('/grupos/g1/chat?desde=1'))).toBe(true)
    // Lo de otro (sin ser líder ni capitán) no se puede borrar; lo tuyo sí.
    expect(within(caja).queryByRole('button', { name: 'Opciones del mensaje' })).toBeNull()
    chat.push(texto(3, ana, 'Me equivoqué'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(CADA_CHAT_MS + 50)
    })
    await within(caja).findByText('Me equivoqué')
    fireEvent.click(within(caja).getByRole('button', { name: 'Opciones del mensaje' }))
    fireEvent.click(within(caja).getByRole('button', { name: 'Borrar' }))
    await waitFor(() => expect(within(caja).queryByText('Me equivoqué')).toBeNull())
    expect(pedidos.some((p) => p.metodo === 'DELETE' && p.url.endsWith('/grupos/g1/chat/3'))).toBe(true)
  })

  it('avisa los mensajes nuevos en la lista de grupos y en la pestaña, y se apaga al leerlos', async () => {
    await cargarGrupos()
    montar('/')
    expect(await screen.findByText('Mensajes')).toBeTruthy()
    cleanup()
    montar()
    const pestania = await screen.findByRole('tab', { name: /Chat/ })
    expect(pestania.querySelector('.grupo-pestania-punto')).toBeTruthy()
    await abrirChat()
    await waitFor(() => expect(useGrupos.getState().chatVisto.g1).toBe(1))
    expect(JSON.parse(localStorage.getItem('truco.chatVisto')!)).toEqual({ g1: 1 })
    cleanup()
    montar('/')
    await screen.findByText('Los del Boliche')
    expect(screen.queryByText('Mensajes')).toBeNull()
  })
})
