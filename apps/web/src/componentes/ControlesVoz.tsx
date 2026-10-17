import { useEffect, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { useShallow } from 'zustand/react/shallow'
import { useJuego } from '../estado'
import { useVoz, vozPosible } from '../voz/estado'
import type { EstadoPar } from '../voz/malla'
import { Interruptor } from './Interruptor'
import '../estilos-voz.css'

/** Si en esta mesa hay chat de voz: online, en una sala que lo tiene y con un navegador que puede. */
export function useHayVoz(): boolean {
  const online = useJuego((s) => s.conexion?.tipo === 'online')
  const conVoz = useJuego((s) => s.sala?.voz === true)
  return online && conVoz && vozPosible()
}

/** Lo de la voz que muestran el botón y el panel (sin los niveles, que cambian todo el tiempo). */
function useControles() {
  return useVoz(
    useShallow((s) => ({
      activa: s.activa,
      pidiendo: s.pidiendo,
      microfono: s.microfono,
      abierto: s.abierto,
      pulsar: s.pulsar,
      pares: s.pares,
      silenciados: s.silenciados,
      aviso: s.aviso,
      activar: s.activar,
      desactivar: s.desactivar,
      cambiarAbierto: s.cambiarAbierto,
      cambiarPulsar: s.cambiarPulsar,
    })),
  )
}

const TEXTO_PAR: Record<EstadoPar, string> = {
  conectando: 'conectando…',
  conectado: 'conectado',
  cortado: 'no se pudo conectar',
}

/**
 * El botón de la voz, en el marcador. La primera vez la activa (recién ahí se pide el
 * micrófono); después abre el panel: micrófono abierto o cerrado, mantener apretado para
 * hablar, quién está y salir. Con "mantener para hablar" aparece el botón Hablar.
 */
export function ControlesVoz() {
  const hayVoz = useHayVoz()
  const v = useControles()
  const [abierto, setAbierto] = useState(false)
  // Si no se pudo usar el micrófono, el aviso se ve enseguida en el panel.
  useEffect(() => {
    if (v.aviso) setAbierto(true)
  }, [v.aviso])
  if (!hayVoz) return null

  const conMicrofono = v.microfono === 'listo'
  const estado = !v.activa ? 'apagada' : !conMicrofono ? 'sin-microfono' : v.pulsar ? 'pulsar' : v.abierto ? 'abierta' : 'cerrada'
  const etiqueta = {
    apagada: 'Activar la voz',
    'sin-microfono': 'Chat de voz: solo escuchás',
    pulsar: 'Chat de voz: mantené apretado Hablar',
    abierta: 'Chat de voz: micrófono abierto',
    cerrada: 'Chat de voz: micrófono cerrado',
  }[estado]
  const tocar = () => {
    if (v.pidiendo) return
    if (!v.activa) void v.activar()
    else setAbierto((a) => !a)
  }

  return (
    <>
      <button
        type="button"
        className={`boton-sonido boton-voz voz-${estado}${v.pidiendo ? ' pidiendo' : ''}`}
        aria-label={etiqueta}
        title={etiqueta}
        aria-expanded={v.activa ? abierto : undefined}
        onClick={tocar}
      >
        <span aria-hidden="true">🎙</span>
      </button>
      {abierto && (v.activa || v.aviso) && <PanelVoz alCerrar={() => setAbierto(false)} />}
      {v.activa && conMicrofono && v.pulsar && <BotonHablar />}
    </>
  )
}

function PanelVoz({ alCerrar }: { alCerrar: () => void }) {
  const v = useControles()
  const lugares = useJuego((s) => s.sala?.lugares ?? [])
  const apodo = (a: number) => lugares[a]?.apodo ?? `Jugador ${a + 1}`
  const conMicrofono = v.microfono === 'listo'
  // Va directo en el body: el marcador arma su propia capa y la mano quedaba por encima.
  return createPortal(
    <div className="menu-jugador-fondo panel-voz-fondo" onClick={alCerrar}>
      <div className="panel-voz" role="dialog" aria-modal="true" aria-label="Chat de voz" onClick={(e) => e.stopPropagation()}>
        <h3 className="panel-voz-titulo">Chat de voz</h3>
        {v.aviso && (
          <p className="panel-voz-aviso" role="alert">
            {v.aviso}
          </p>
        )}
        {v.activa && conMicrofono && !v.pulsar && (
          <button type="button" className={`boton panel-voz-mute${v.abierto ? '' : ' cerrado'}`} aria-pressed={!v.abierto} onClick={() => v.cambiarAbierto(!v.abierto)}>
            {v.abierto ? 'Cerrar el micrófono' : 'Abrir el micrófono'}
          </button>
        )}
        {v.activa && conMicrofono && (
          <Interruptor
            activo={v.pulsar}
            alCambiar={v.cambiarPulsar}
            titulo="Mantener apretado para hablar"
            detalle="El micrófono se abre solo mientras apretás el botón Hablar"
          />
        )}
        {v.activa && (
          <ul className="panel-voz-lista" aria-label="En la voz">
            {v.pares.length === 0 && <li className="panel-voz-vacio">Todavía no hay nadie más en la voz.</li>}
            {v.pares.map((p) => (
              <li key={p.id} data-estado={p.estado}>
                <span>{apodo(p.asiento)}</span>
                <small>
                  {v.silenciados.includes(p.asiento) ? 'silenciado' : p.estado === 'conectado' && p.conAudio ? 'se escucha' : TEXTO_PAR[p.estado]}
                </small>
              </li>
            ))}
          </ul>
        )}
        <div className="panel-voz-botones">
          {v.activa && (
            <button
              type="button"
              className="boton boton-secundario"
              onClick={() => {
                v.desactivar()
                alCerrar()
              }}
            >
              Salir de la voz
            </button>
          )}
          <button type="button" className="menu-jugador-cancelar" onClick={alCerrar}>
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

/** Mantener apretado para hablar: flota sobre la mesa, a mano del pulgar. */
function BotonHablar() {
  const pulsando = useVoz((s) => s.pulsando)
  const cambiar = useVoz((s) => s.cambiarPulsando)
  // Si se va el botón (o la pantalla) con el dedo apretado, el micrófono se cierra.
  useEffect(() => () => cambiar(false), [cambiar])
  return createPortal(
    <button
      type="button"
      className={`boton-hablar${pulsando ? ' pulsando' : ''}`}
      aria-pressed={pulsando}
      aria-label="Mantené apretado para hablar"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture?.(e.pointerId)
        cambiar(true)
      }}
      onPointerUp={() => cambiar(false)}
      onPointerCancel={() => cambiar(false)}
      onLostPointerCapture={() => cambiar(false)}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          cambiar(true)
        }
      }}
      onKeyUp={(e) => {
        if (e.key === ' ' || e.key === 'Enter') cambiar(false)
      }}
      onBlur={() => cambiar(false)}
    >
      <span aria-hidden="true">🎙</span>
      {pulsando ? 'Hablando' : 'Hablar'}
    </button>,
    document.body,
  )
}

/**
 * El anillo de quien habla, sobre su avatar (también el tuyo): crece con el nivel del audio.
 * Se ve solo si activaste la voz y esa persona está en ella.
 */
export function AnilloVoz({ asiento }: { asiento: number }) {
  const activa = useVoz((s) => s.activa)
  const enVoz = useVoz((s) => s.enVoz.includes(asiento))
  const nivel = useVoz((s) => s.niveles[asiento] ?? 0)
  const silenciado = useVoz((s) => s.silenciados.includes(asiento))
  if (!activa || !enVoz) return null
  return (
    <span
      className={`anillo-voz${nivel > 0 ? ' hablando' : ''}${silenciado ? ' silenciado' : ''}`}
      style={{ '--nivel': nivel } as CSSProperties}
      data-nivel={nivel}
      aria-hidden="true"
    >
      {silenciado && <span className="anillo-voz-mute">🔇</span>}
    </span>
  )
}

/** En el menú de otro jugador: dejar de escuchar su voz (solo vos), si los dos están en la voz. */
export function OpcionVozJugador({ asiento, alCerrar }: { asiento: number; alCerrar: () => void }) {
  const activa = useVoz((s) => s.activa)
  const enVoz = useVoz((s) => s.enVoz.includes(asiento))
  const silenciado = useVoz((s) => s.silenciados.includes(asiento))
  const silenciar = useVoz((s) => s.silenciar)
  if (!activa || !enVoz) return null
  return (
    <button
      type="button"
      onClick={() => {
        silenciar(asiento, !silenciado)
        alCerrar()
      }}
    >
      <span aria-hidden="true">{silenciado ? '🔈' : '🙉'}</span>
      {silenciado ? 'Volver a escuchar su voz' : 'Silenciar su voz'}
    </button>
  )
}
