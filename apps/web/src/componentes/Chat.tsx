import { useEffect, useRef, useState } from 'react'
import { LIMITES, type CanalChat, type InfoSala, type MensajeChat } from '@truco/shared'
import { Hoja } from './Hoja'

/** Frases de un toque: se mandan al canal que esté abierto. */
export const FRASES_RAPIDAS = [
  '¡Quiero!',
  'No quiero',
  '¡Truco!',
  'Buena mano',
  'Bien jugado',
  '¡Qué suerte!',
  'Dale que va',
  'Jugá, che',
  'Me voy al mazo',
  'Gracias',
]

const hora = (ms: number) => new Date(ms).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit', hour12: false })

/**
 * Mensajes sin leer: los ajenos (y no silenciados) que llegaron después de la última vez
 * que se cerró el panel. Con el panel abierto no cuenta nada.
 */
export function useNoLeidos(chat: MensajeChat[], yo: number, silenciados: ReadonlySet<number>, abierto: boolean) {
  const [leidoHasta, setLeidoHasta] = useState(0)
  const ultima = chat[chat.length - 1]?.hora ?? 0
  const noLeidos = abierto ? 0 : chat.filter((m) => m.de !== yo && m.hora > leidoHasta && !silenciados.has(m.de)).length
  return { noLeidos, marcarLeidos: () => setLeidoHasta((h) => Math.max(h, ultima)) }
}

/** Globito del chat, con la cantidad de mensajes sin leer. */
export function BotonChat({ noLeidos, alTocar }: { noLeidos: number; alTocar: () => void }) {
  return (
    <button
      type="button"
      className="boton-salir boton-chat"
      onClick={alTocar}
      aria-label={noLeidos > 0 ? `Chat, ${noLeidos} sin leer` : 'Chat'}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-4.2 3.6c-.5.4-1.3.1-1.3-.6V16h0A2.5 2.5 0 0 1 4 13.5z" />
      </svg>
      {noLeidos > 0 && <span className="contador">{noLeidos > 9 ? '9+' : noLeidos}</span>}
    </button>
  )
}

interface Props {
  sala: InfoSala
  yo: number
  chat: MensajeChat[]
  silenciados: ReadonlySet<number>
  alEnviar: (texto: string, canal: CanalChat) => void
  /** Tocar el apodo de otra persona (solo online y humanos): abre su menú. */
  alTocarJugador?: (asiento: number) => void
  alCerrar: () => void
}

export function PanelChat({ sala, yo, chat, silenciados, alEnviar, alTocarJugador, alCerrar }: Props) {
  const [canal, setCanal] = useState<CanalChat>('general')
  const [texto, setTexto] = useState('')
  const lista = useRef<HTMLOListElement>(null)
  const visibles = chat.filter((m) => (m.canal === canal || !sala.chatEquipo) && !(m.de !== yo && silenciados.has(m.de)))

  // Siempre a la vista el último mensaje.
  useEffect(() => {
    const l = lista.current
    if (l) l.scrollTop = l.scrollHeight
  }, [visibles.length, canal])

  const mandar = (t: string) => {
    const limpio = t.trim()
    if (!limpio) return
    alEnviar(limpio, canal)
  }

  const pestanias = sala.chatEquipo && (
    <div className="chat-pestanias segmentado" role="tablist" aria-label="Canal">
      {(['general', 'equipo'] as const).map((c) => (
        <button key={c} type="button" role="tab" aria-selected={canal === c} className={canal === c ? 'elegido' : ''} onClick={() => setCanal(c)}>
          {c === 'general' ? 'General' : 'Equipo'}
        </button>
      ))}
    </div>
  )

  return (
    <Hoja titulo="Chat" alCerrar={alCerrar} clase="hoja-chat" cabecera={pestanias}>
      <ol className="chat-lista" ref={lista} aria-live="polite">
        {visibles.length === 0 && <li className="chat-vacio">{canal === 'equipo' ? 'Acá hablás solo con tu equipo.' : 'Todavía no hay mensajes. ¡Saludá!'}</li>}
        {visibles.map((m, i) => {
          const propio = m.de === yo
          const tocable = !propio && alTocarJugador && sala.lugares[m.de]?.tipo === 'humano'
          return (
            <li key={`${m.hora}-${m.de}-${i}`} className={`chat-mensaje${propio ? ' propio' : ''}${m.de % 2 === yo % 2 ? ' nuestro' : ''}`}>
              <div className="chat-meta">
                {propio ? (
                  <span className="chat-apodo">Vos</span>
                ) : tocable ? (
                  <button type="button" className="chat-apodo tocable" onClick={() => alTocarJugador(m.de)}>
                    {m.apodo}
                  </button>
                ) : (
                  <span className="chat-apodo">{m.apodo}</span>
                )}
                <time className="chat-hora">{hora(m.hora)}</time>
              </div>
              <div className="chat-texto">{m.texto}</div>
            </li>
          )
        })}
      </ol>
      <div className="chat-frases" aria-label="Frases rápidas">
        {FRASES_RAPIDAS.map((f) => (
          <button key={f} type="button" onClick={() => mandar(f)}>
            {f}
          </button>
        ))}
      </div>
      <form
        className="chat-campo"
        onSubmit={(e) => {
          e.preventDefault()
          mandar(texto)
          setTexto('')
        }}
      >
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={LIMITES.largoChat}
          placeholder={canal === 'equipo' ? 'Mensaje para tu equipo' : 'Escribí un mensaje'}
          aria-label="Mensaje"
          enterKeyHint="send"
        />
        <button type="submit" className="boton" disabled={!texto.trim()}>
          Enviar
        </button>
      </form>
    </Hoja>
  )
}
