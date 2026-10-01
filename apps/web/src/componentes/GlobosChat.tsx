import { useEffect, useRef, useState } from 'react'
import type { CanalChat, MensajeChat } from '@truco/shared'

/** El globito de chat que sale de un jugador en la mesa. */
export interface GloboChat {
  id: number
  apodo: string
  texto: string
  canal: CanalChat
  /** Ya se está yendo (dura lo que la animación de salida). */
  saliendo: boolean
}

/** Lo que tarda en irse: la animación de salida del CSS (.globo-chat.saliendo). */
export const SALIDA_GLOBO_CHAT = 350

/** Cuánto se ve un mensaje: unos 4 s, y más si es largo (hasta 8 s). */
export function duracionGloboChat(texto: string): number {
  return Math.min(8000, 4000 + Math.max(0, texto.length - 25) * 50)
}

let contador = 0

/**
 * Cada mensaje nuevo del chat aparece unos segundos como globito al lado de quien lo mandó.
 * Si la misma persona manda otro, reemplaza al anterior. Los de silenciados no aparecen, y
 * los que ya estaban al entrar a la mesa tampoco (esos quedan en el historial).
 */
export function useGlobosChat(chat: MensajeChat[], silenciados: ReadonlySet<number>): Record<number, GloboChat> {
  const [globos, setGlobos] = useState<Record<number, GloboChat>>({})
  // El último mensaje ya mirado (por referencia: el store agrega objetos nuevos al final).
  const visto = useRef<MensajeChat | undefined>(chat[chat.length - 1])
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>[]>())

  useEffect(() => {
    const desde = visto.current ? chat.lastIndexOf(visto.current) + 1 : 0
    // Si el último visto ya no está (llegaron muchos de golpe), alcanza con los más nuevos.
    const nuevos = desde > 0 || !visto.current ? chat.slice(desde) : chat.slice(-6)
    visto.current = chat[chat.length - 1]
    for (const m of nuevos) {
      if (silenciados.has(m.de)) continue
      const id = ++contador
      for (const t of timers.current.get(m.de) ?? []) clearTimeout(t)
      setGlobos((g) => ({ ...g, [m.de]: { id, apodo: m.apodo, texto: m.texto, canal: m.canal, saliendo: false } }))
      const dura = duracionGloboChat(m.texto)
      timers.current.set(m.de, [
        setTimeout(() => setGlobos((g) => (g[m.de]?.id === id ? { ...g, [m.de]: { ...g[m.de]!, saliendo: true } } : g)), dura),
        setTimeout(
          () =>
            setGlobos((g) => {
              if (g[m.de]?.id !== id) return g
              const { [m.de]: _, ...resto } = g
              return resto
            }),
          dura + SALIDA_GLOBO_CHAT,
        ),
      ])
    }
  }, [chat, silenciados])

  // Al silenciar a alguien, su globo se va en el momento.
  useEffect(() => {
    setGlobos((g) => {
      const quedan = Object.entries(g).filter(([a]) => !silenciados.has(Number(a)))
      return quedan.length === Object.keys(g).length ? g : Object.fromEntries(quedan)
    })
  }, [silenciados])

  useEffect(() => {
    const t = timers.current
    return () => {
      for (const lista of t.values()) for (const x of lista) clearTimeout(x)
      t.clear()
    }
  }, [])

  return globos
}

/**
 * El globito: texto cortado a tres líneas, con la colita hacia quien habla.
 * `apilado`: hay un canto en el mismo lugar (el canto va pegado a la persona y este, más afuera, sin colita).
 */
export function GloboDeChat({ globo, apilado = false, lateral = false }: { globo: GloboChat; apilado?: boolean; lateral?: boolean }) {
  return (
    <div
      className={`globo globo-chat${globo.canal === 'equipo' ? ' equipo' : ''}${apilado ? ' apilado' : ''}${lateral ? ' lateral' : ''}${globo.saliendo ? ' saliendo' : ''}`}
      role="status"
      title={globo.texto}
    >
      <span className="solo-lector">{globo.apodo}: </span>
      <span className="globo-chat-texto">{globo.texto}</span>
    </div>
  )
}
