import { useEffect, useState } from 'react'
import type { Senia } from '@truco/bots'
import type { LugarPublico } from '@truco/shared'
import { GESTO, SIGNIFICADO } from '../senias'
import { Avatar } from './Asiento'
import { Hoja } from './Hoja'
import { CORTO } from './Senias'
import '../estilos-senias.css'

/** Lo que te marcó un compañero en una mano: sin repetir, en el orden en que te lo hizo. */
export function seniasMarcadas(senias: readonly { de: number; senia: Senia; mano: number }[], de: number, mano: number): Senia[] {
  return [...new Set(senias.filter((s) => s.de === de && s.mano === mano).map((s) => s.senia))]
}

/**
 * Al tocar el avatar de un compañero: las señas que te hizo en esta mano, traducidas a
 * cartas, y el botón para pedirle que te las repita (un bot las repite enseguida; a una
 * persona le aparece un aviso).
 */
export function PanelCompaniero({
  lugar,
  marcadas,
  esBot,
  cerrado = null,
  pedido,
  alPedir,
  alCerrar,
}: {
  lugar: LugarPublico
  marcadas: readonly Senia[]
  /** Un bot, o quien no está y juega un bot por él. */
  esBot: boolean
  /** Motivo por el que ya no se le pueden pedir señas en esta mano, o null. */
  cerrado?: string | null
  /** Si ya se lo pediste hace poco (hay que esperar para volver a pedir). */
  pedido: boolean
  alPedir: () => void
  alCerrar: () => void
}) {
  return (
    <Hoja titulo={`Señas de ${lugar.apodo}`} alCerrar={alCerrar} clase="hoja-companiero">
      <div className="companiero-marcadas">
        <Avatar lugar={lugar} />
        <div>
          <p className="companiero-titulo">Te marcó en esta mano</p>
          {marcadas.length > 0 ? (
            <ul className="companiero-lista">
              {marcadas.map((s) => (
                <li key={s} title={GESTO[s]}>
                  <span className={`senia-rapida-icono${CORTO[s].espejo ? ' espejo' : ''}`} aria-hidden="true">
                    {CORTO[s].icono}
                  </span>
                  <b>{SIGNIFICADO[s]}</b>
                  <small>{GESTO[s].toLowerCase()}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p className="senias-ayuda companiero-nada">No te hizo señas en esta mano.</p>
          )}
        </div>
      </div>
      {cerrado ? (
        <p className="senias-nota">{cerrado}</p>
      ) : (
        <>
          <button type="button" className="boton boton-grande" onClick={alPedir} disabled={pedido}>
            {pedido ? 'Ya le pediste, esperá un poco' : 'Pedile que te repita'}
          </button>
          <p className="senias-ayuda">
            {esBot ? 'Te las vuelve a hacer enseguida.' : `A ${lugar.apodo} le aparece un aviso para que te las vuelva a hacer.`}
          </p>
        </>
      )}
    </Hoja>
  )
}

/** Cuánto queda a la vista el pedido de un compañero. */
const DURACION_PEDIDO = 8000

/**
 * Aviso arriba del paño cuando un compañero te pide que le repitas las señas. Si ya le
 * hiciste alguna en esta mano, "Repetir" se las vuelve a mandar; si no, abre la cara.
 */
export function AvisoPedidoSenias({
  pedido,
  apodo,
  puedeRepetir,
  cerrado = null,
  alRepetir,
  alAbrirSenias,
}: {
  pedido: { de: number; id: number } | null
  apodo: (asiento: number) => string
  /** Si ya le hiciste señas en esta mano. */
  puedeRepetir: boolean
  cerrado?: string | null
  alRepetir: () => void
  alAbrirSenias: () => void
}) {
  const [visible, setVisible] = useState<{ de: number; id: number } | null>(null)
  useEffect(() => {
    if (!pedido) return
    setVisible(pedido)
    const t = setTimeout(() => setVisible(null), DURACION_PEDIDO)
    return () => clearTimeout(t)
  }, [pedido])
  if (!visible) return null
  const cerrar = () => setVisible(null)
  return (
    <div className="aviso aviso-pedido-senias" key={visible.id} role="status">
      <span>
        <span aria-hidden="true">🙏 </span>
        <b>{apodo(visible.de)}</b> te pidió que le repitas las señas
      </span>
      {cerrado ? (
        <small>{cerrado}</small>
      ) : (
        <span className="aviso-botones">
          <button
            type="button"
            className="boton"
            onClick={() => {
              if (puedeRepetir) alRepetir()
              else alAbrirSenias()
              cerrar()
            }}
          >
            {puedeRepetir ? 'Repetir' : 'Hacer señas'}
          </button>
          <button type="button" className="boton boton-secundario" onClick={cerrar} aria-label="Cerrar el aviso">
            ✕
          </button>
        </span>
      )}
    </div>
  )
}
