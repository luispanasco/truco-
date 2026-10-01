import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, renderHook } from '@testing-library/react'
import type { MensajeChat } from '@truco/shared'
import { duracionGloboChat, GloboDeChat, SALIDA_GLOBO_CHAT, useGlobosChat } from '../src/componentes/GlobosChat'

const msj = (de: number, texto: string, hora: number): MensajeChat => ({ de, apodo: `J${de}`, texto, canal: 'general', hora })
const ninguno = new Set<number>()

beforeEach(() => vi.useFakeTimers())
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('useGlobosChat', () => {
  it('muestra cada mensaje nuevo unos segundos y después se va con la animación de salida', () => {
    const { result, rerender } = renderHook(({ chat }) => useGlobosChat(chat, ninguno), { initialProps: { chat: [] as MensajeChat[] } })
    rerender({ chat: [msj(1, 'Hola', 1)] })
    expect(result.current[1]).toMatchObject({ texto: 'Hola', saliendo: false })
    act(() => vi.advanceTimersByTime(duracionGloboChat('Hola')))
    expect(result.current[1]?.saliendo).toBe(true)
    act(() => vi.advanceTimersByTime(SALIDA_GLOBO_CHAT))
    expect(result.current[1]).toBeUndefined()
  })

  it('el mensaje nuevo de la misma persona reemplaza al anterior y vuelve a contar', () => {
    const { result, rerender } = renderHook(({ chat }) => useGlobosChat(chat, ninguno), { initialProps: { chat: [] as MensajeChat[] } })
    const a = msj(1, 'Hola', 1)
    rerender({ chat: [a] })
    act(() => vi.advanceTimersByTime(3000))
    rerender({ chat: [a, msj(1, 'Che', 2), msj(0, 'Buenas', 3)] })
    expect(result.current[1]?.texto).toBe('Che')
    expect(result.current[0]?.texto).toBe('Buenas')
    // El timer del primero ya no lo saca.
    act(() => vi.advanceTimersByTime(2000))
    expect(result.current[1]).toMatchObject({ texto: 'Che', saliendo: false })
  })

  it('no muestra lo que ya estaba al entrar ni lo de silenciados', () => {
    const viejo = msj(1, 'De antes', 1)
    const { result, rerender } = renderHook(({ chat, sil }) => useGlobosChat(chat, sil), {
      initialProps: { chat: [viejo], sil: new Set([2]) as ReadonlySet<number> },
    })
    expect(result.current).toEqual({})
    rerender({ chat: [viejo, msj(2, 'Silenciado', 2)], sil: new Set([2]) })
    expect(result.current).toEqual({})
  })

  it('los mensajes largos duran más, con tope', () => {
    expect(duracionGloboChat('Buena mano')).toBe(4000)
    expect(duracionGloboChat('x'.repeat(65))).toBe(6000)
    expect(duracionGloboChat('x'.repeat(300))).toBe(8000)
  })
})

describe('GloboDeChat', () => {
  it('dice quién habla (para lectores de pantalla) y marca el canal del equipo', () => {
    const { container } = render(
      <GloboDeChat globo={{ id: 1, apodo: 'Caro', texto: 'Tengo flor', canal: 'equipo', saliendo: false }} apilado />,
    )
    const g = container.querySelector('.globo-chat')!
    expect(g.getAttribute('role')).toBe('status')
    expect(g.textContent).toBe('Caro: Tengo flor')
    expect(g.classList.contains('equipo')).toBe(true)
    expect(g.classList.contains('apilado')).toBe(true)
  })
})
