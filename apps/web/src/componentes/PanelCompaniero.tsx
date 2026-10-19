import { useEffect, useState } from 'react'
import { SENIAS, type Senia } from '@truco/bots'
import type { LugarPublico } from '@truco/shared'
import { GESTO, significadoDe } from '../senias'
import { Avatar } from './Asiento'
import { Hoja } from './Hoja'
import { Interruptor } from './Interruptor'
import { CORTO } from './Senias'
import '../estilos-senias.css'

type SeniaLlegada = { de: number; senia: Senia; mano: number; tanto?: number }

/** Lo que te marcó un compañero en una mano: sin repetir, en el orden en que te lo hizo. */
export function seniasMarcadas(senias: readonly SeniaLlegada[], de: number, mano: number): Senia[] {
  return [...new Set(senias.filter((s) => s.de === de && s.mano === mano).map((s) => s.senia))]
}

/** El envido que te marcó un compañero en una mano (el último número que llegó), o undefined. */
export function envidoMarcado(senias: readonly SeniaLlegada[], de: number, mano: number): number | undefined {
  let tanto: number | undefined
  for (const s of senias) if (s.de === de && s.mano === mano && s.senia === 'envido' && s.tanto !== undefined) tanto = s.tanto
  return tanto
}

/** Una seña del resumen, con su número si es la de envido. */
export interface Marca {
  senia: Senia
  tanto?: number
}

/**
 * El resumen de lo que te marcó un compañero en la mano: sin repetir, primero el envido (con
 * su número), después las cartas de mayor a menor como en la lista de señas, y la flor al final.
 */
export function resumenDe(senias: readonly SeniaLlegada[], de: number, mano: number): Marca[] {
  const orden = (s: Senia) => (s === 'envido' ? -1 : SENIAS.indexOf(s))
  const tanto = envidoMarcado(senias, de, mano)
  return seniasMarcadas(senias, de, mano)
    .sort((a, b) => orden(a) - orden(b))
    .map((senia) => (senia === 'envido' && tanto !== undefined ? { senia, tanto } : { senia }))
}

/** Texto cortito de cada seña para el resumen sobre el avatar (el completo va en el título). */
const BREVE: Record<Senia, string> = {
  pieza2: 'Pieza 2',
  pieza4: 'Pieza 4',
  pieza5: 'Pieza 5',
  perico: 'Perico',
  perica: 'Perica',
  unoBravo: '1 esp/bas',
  sieteBravo: '7 esp/oro',
  tres: 'Un 3',
  dosComun: 'Un 2',
  unoFalso: '1 cop/oro',
  flor: 'Flor',
  envido: 'Envido',
}
const breve = (m: Marca) => (m.senia === 'envido' && m.tanto !== undefined ? `Envido ${m.tanto}` : BREVE[m.senia])

/**
 * Cartelito sobre el avatar de un compañero con lo que te marcó en esta mano ("🤔 Envido 27 ·
 * 💋 Pieza 4 · 🐸 Flor"). Es una preferencia de cada uno (apagada de entrada); solo lo ve quien
 * recibió las señas. Sin señas no se muestra nada.
 */
export function ResumenSenias({
  marcas,
  apodo,
  lado,
}: {
  marcas: readonly Marca[]
  apodo: string
  /** Para no tapar el mazo (o la muestra) cuando quedan donde va el resumen: al otro lado. */
  lado?: 'derecha'
}) {
  if (marcas.length === 0) return null
  const completo = marcas.map((m) => significadoDe(m.senia, m.tanto)).join(', ')
  return (
    <div className={`resumen-senias${lado ? ` resumen-${lado}` : ''}`} role="note" aria-label={`${apodo} te marcó: ${completo}`} title={completo}>
      {marcas.map((m) => (
        <span key={m.senia} className={`resumen-senia${m.senia === 'envido' ? ' envido' : ''}`} aria-hidden="true">
          <span className={`resumen-icono${CORTO[m.senia].espejo ? ' espejo' : ''}`}>{CORTO[m.senia].icono}</span>
          {breve(m)}
        </span>
      ))}
    </div>
  )
}

/**
 * Al tocar el avatar de un compañero: las señas que te hizo en esta mano, traducidas a
 * cartas, y el botón para pedirle que te las repita (un bot las repite enseguida; a una
 * persona le aparece un aviso).
 */
export function PanelCompaniero({
  lugar,
  marcadas,
  envido,
  esBot,
  cerrado = null,
  pedido,
  alPedir,
  alCerrar,
  resumen,
  alCambiarResumen,
}: {
  lugar: LugarPublico
  marcadas: readonly Senia[]
  /** El envido que te marcó (si te hizo esa seña). */
  envido?: number
  /** Un bot, o quien no está y juega un bot por él. */
  esBot: boolean
  /** Motivo por el que ya no se le pueden pedir señas en esta mano, o null. */
  cerrado?: string | null
  /** Si ya se lo pediste hace poco (hay que esperar para volver a pedir). */
  pedido: boolean
  alPedir: () => void
  alCerrar: () => void
  /** Tu preferencia: el resumen de señas sobre los compañeros (se cambia desde acá en la mesa). */
  resumen?: boolean
  alCambiarResumen?: (v: boolean) => void
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
                  <b>{significadoDe(s, envido)}</b>
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
      {alCambiarResumen && (
        <Interruptor
          activo={!!resumen}
          alCambiar={alCambiarResumen}
          titulo="Resumen de señas sobre los compañeros"
          detalle="Un cartelito arriba de cada compañero con lo que te marcó en la mano. Solo lo ves vos"
        />
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
