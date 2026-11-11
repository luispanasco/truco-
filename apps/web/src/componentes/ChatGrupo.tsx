import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { SENIAS, type Senia } from '@truco/bots'
import { LARGO_MENSAJE_GRUPO, type MensajeGrupo } from '@truco/shared'
import { Avatar } from './Avatar'
import { MensajeError } from './Online'
import { borrarDelChat, chatGrupo, mandarAlChat, marcarChatVisto } from '../cuenta/grupos'
import { NOMBRE_EMOTE } from '../senias'

/** Cada cuánto se pide lo nuevo mientras el chat está abierto. */
export const CADA_CHAT_MS = 3500
/** Cada tantas vueltas se trae todo de nuevo (así desaparecen los mensajes que alguien borró). */
const VUELTAS_PARA_TODO = 10

const sinMovimiento = () => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/** "14:05" (y, si no es de hoy, "3/11 14:05"). */
export function horaDe(iso: string, ahora = new Date()): string {
  const d = new Date(iso)
  const hora = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`
  return d.toDateString() === ahora.toDateString() ? hora : `${d.getDate()}/${d.getMonth() + 1} ${hora}`
}

/**
 * La cara del avatar haciendo una seña, que la repite de vez en cuando (cada una a su ritmo, así
 * no se mueven todas juntas). Con movimiento reducido queda quieta en la pose.
 */
export function CaraConSenia({ codigo, apodo, senia, cada = 5000 }: { codigo: string | null; apodo: string; senia: Senia; cada?: number }) {
  const [vuelta, setVuelta] = useState(0)
  useEffect(() => {
    if (sinMovimiento()) return
    const t = setInterval(() => setVuelta((v) => v + 1), cada)
    return () => clearInterval(t)
  }, [cada])
  return <Avatar key={vuelta} codigo={codigo} apodo={apodo} gesto={senia} encuadre="cara" />
}

/**
 * El chat del grupo: textos y emotes (una seña hecha por el avatar de quien la manda, con su
 * nombre abajo). Mientras está abierto pide lo nuevo cada unos segundos y lo que se ve deja de
 * ser novedad. Tus mensajes van a la derecha; los borra quien los mandó, el líder o los capitanes.
 */
export function ChatGrupo({
  grupo,
  yo,
  miAvatar,
  miApodo,
  modera,
}: {
  grupo: string
  yo: string | null
  miAvatar: string | null
  miApodo: string
  modera: boolean
}) {
  const [mensajes, setMensajes] = useState<MensajeGrupo[] | null>(null)
  const [texto, setTexto] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [senias, setSenias] = useState(false)
  const [elegido, setElegido] = useState<number | null>(null)
  const [mandando, setMandando] = useState(false)
  const lista = useRef<HTMLOListElement>(null)
  const caja = useRef<HTMLElement>(null)
  const ultimo = useRef(0)
  const vueltas = useRef(0)

  /** Suma lo que llegó (sin repetir) o, con `todo`, reemplaza la lista entera. */
  const sumar = useCallback(
    (nuevos: MensajeGrupo[], todo = false) => {
      setMensajes((ya) => {
        const base = todo || !ya ? [] : ya
        const ids = new Set(base.map((m) => m.id))
        return [...base, ...nuevos.filter((m) => !ids.has(m.id))].sort((a, b) => a.id - b.id)
      })
      const mayor = Math.max(0, ...nuevos.map((m) => m.id))
      if (mayor > ultimo.current) ultimo.current = mayor
      if (mayor > 0) marcarChatVisto(grupo, mayor)
    },
    [grupo],
  )

  const traer = useCallback(async () => {
    const todo = ultimo.current === 0 || ++vueltas.current % VUELTAS_PARA_TODO === 0
    try {
      const r = await chatGrupo(grupo, todo ? undefined : ultimo.current)
      sumar(r.mensajes, todo)
    } catch {
      setMensajes((m) => m ?? [])
      setError((e) => e ?? 'No se pudo traer el chat.')
    }
  }, [grupo, sumar])

  useEffect(() => {
    ultimo.current = 0
    vueltas.current = 0
    setMensajes(null)
    void traer()
    const t = setInterval(() => void traer(), CADA_CHAT_MS)
    return () => clearInterval(t)
  }, [traer])

  // Al abrir las señas (o el chat), que se vea la caja entera: la lista, la grilla y el campo.
  useEffect(() => {
    caja.current?.scrollIntoView?.({ block: 'end', behavior: sinMovimiento() ? 'auto' : 'smooth' })
  }, [senias, mensajes === null])

  // Al llegar algo, se baja hasta el último.
  const cuantos = mensajes?.length ?? 0
  const ultimoId = mensajes?.at(-1)?.id ?? 0
  useEffect(() => {
    const l = lista.current
    if (l) l.scrollTop = l.scrollHeight
  }, [cuantos, ultimoId, senias])

  const mandar = async (m: { texto: string } | { senia: Senia }) => {
    setMandando(true)
    try {
      sumar([await mandarAlChat(grupo, m)])
      setError(null)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo mandar.')
      return false
    } finally {
      setMandando(false)
    }
  }
  const alMandar = async (e: FormEvent) => {
    e.preventDefault()
    const limpio = texto.trim()
    if (!limpio || mandando) return
    if (await mandar({ texto: limpio })) setTexto('')
  }
  const borrar = async (id: number) => {
    try {
      await borrarDelChat(grupo, id)
      setMensajes((ms) => ms?.filter((m) => m.id !== id) ?? null)
      setElegido(null)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo borrar.')
    }
  }

  return (
    <section className={`tarjeta chatg-grupo${senias ? ' con-senias' : ''}`} aria-label="Chat del grupo" ref={caja}>
      <ol className="chatg-lista" ref={lista} aria-live="polite">
        {mensajes === null && <li className="chatg-vacio">Cargando el chat…</li>}
        {mensajes?.length === 0 && <li className="chatg-vacio">Todavía no escribió nadie. ¡Mandá el primero (o una seña)!</li>}
        {mensajes?.map((m) => {
          const mio = m.autor.id === yo
          const puedeBorrar = mio || modera
          return (
            <li key={m.id} className={`chatg-mensaje${mio ? ' mio' : ''}${m.tipo === 'emote' ? ' emote' : ''}`}>
              <span className="chatg-cara">
                <Avatar codigo={m.autor.avatar} apodo={m.autor.apodo} encuadre="cara" />
              </span>
              <div className="chatg-globo">
                <span className="chatg-quien">
                  <b>{mio ? 'Vos' : m.autor.apodo}</b> <time dateTime={m.creado}>{horaDe(m.creado)}</time>
                  {puedeBorrar && (
                    <button
                      type="button"
                      className="chatg-opciones"
                      aria-label="Opciones del mensaje"
                      aria-expanded={elegido === m.id}
                      onClick={() => setElegido(elegido === m.id ? null : m.id)}
                    >
                      ⋯
                    </button>
                  )}
                </span>
                {m.tipo === 'texto' ? (
                  <p className="chatg-texto">{m.texto}</p>
                ) : (
                  <figure className="chatg-emote">
                    <span className="chatg-emote-cara">
                      <CaraConSenia codigo={m.autor.avatar} apodo={m.autor.apodo} senia={m.senia} cada={4200 + (m.id % 7) * 500} />
                    </span>
                    <figcaption>{NOMBRE_EMOTE[m.senia]}</figcaption>
                  </figure>
                )}
                {elegido === m.id && (
                  <button
                    type="button"
                    className="boton boton-peligro chatg-borrar"
                    ref={(b) => b?.scrollIntoView?.({ block: 'nearest' })}
                    onClick={() => void borrar(m.id)}
                  >
                    Borrar
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ol>

      {error && <MensajeError>{error}</MensajeError>}

      {senias && (
        <div className="chatg-senias" role="group" aria-label="Mandar una seña">
          {SENIAS.map((s, i) => (
            <button
              key={s}
              type="button"
              className="chatg-senia"
              disabled={mandando}
              onClick={() => void mandar({ senia: s }).then((ok) => ok && setSenias(false))}
            >
              <span className="chatg-senia-cara">
                <CaraConSenia codigo={miAvatar} apodo={miApodo} senia={s} cada={3600 + i * 170} />
              </span>
              <span className="chatg-senia-nombre">{NOMBRE_EMOTE[s]}</span>
            </button>
          ))}
        </div>
      )}

      <form className="chatg-escribir" onSubmit={(e) => void alMandar(e)}>
        <button
          type="button"
          className={`chatg-boton-senias${senias ? ' abierto' : ''}`}
          aria-label={senias ? 'Cerrar las señas' : 'Mandar una seña'}
          aria-expanded={senias}
          onClick={() => setSenias(!senias)}
        >
          😜
        </button>
        <input
          type="text"
          value={texto}
          maxLength={LARGO_MENSAJE_GRUPO}
          placeholder="Escribí al grupo…"
          aria-label="Mensaje al grupo"
          enterKeyHint="send"
          onChange={(e) => setTexto(e.target.value)}
        />
        <button type="submit" className="boton" disabled={!texto.trim() || mandando}>
          Mandar
        </button>
      </form>
    </section>
  )
}
