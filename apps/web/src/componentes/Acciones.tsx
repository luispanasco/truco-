import { describirAccion } from '@truco/shared'
import type { Accion, VistaPartida } from '@truco/engine'

type Grupo = 'respuesta' | 'envido' | 'flor' | 'truco'

function grupoDe(a: Accion): Grupo | null {
  switch (a.tipo) {
    case 'responder':
    case 'declararTanto':
    case 'pedirVer':
    case 'noPedirVer':
      return 'respuesta'
    case 'cantarEnvido':
      return 'envido'
    case 'cantarFlor':
      return 'flor'
    case 'cantarTruco':
      return 'truco'
    default:
      return null
  }
}

/**
 * Dentro de un grupo de envidos o de flores, del segundo botón en adelante se muestra
 * la versión corta ("Envido | Real | Falta"); el nombre accesible queda completo.
 */
const CORTO: Record<string, string> = {
  realEnvido: 'Real',
  faltaEnvido: 'Falta',
  contraflorAlResto: 'Al resto',
}

function claseDe(a: Accion): string {
  if (a.tipo === 'responder') return a.respuesta === 'quiero' ? ' accion-si' : ' accion-no'
  return ''
}

/**
 * Botonera de cantos y respuestas: solo lo que el motor permite en este momento.
 * Arriba las respuestas (si hay algo que contestar); abajo los cantos, agrupados
 * (truco, envidos, flores). Nunca más de dos filas: si no entran, la fila se desliza.
 */
export function Acciones({ vista, alElegir }: { vista: VistaPartida; alElegir: (a: Accion) => void }) {
  const acciones = vista.accionesValidas.filter((a) => grupoDe(a) !== null)
  const de = (g: Grupo) => acciones.filter((a) => grupoDe(a) === g)
  const respuestas = de('respuesta')
  const cantos = (['truco', 'envido', 'flor'] as const).map((g) => de(g)).filter((g) => g.length > 0)

  const boton = (a: Accion, i: number, corto = false) => {
    const texto = describirAccion(vista, a)
    const visible = corto && 'canto' in a && CORTO[a.canto] ? CORTO[a.canto] : texto
    return (
      <button
        key={i}
        type="button"
        className={`boton-accion accion-${a.tipo}${claseDe(a)}`}
        aria-label={visible !== texto ? texto : undefined}
        onClick={() => alElegir(a)}
      >
        {visible}
      </button>
    )
  }

  if (respuestas.length === 0 && cantos.length === 0) return null
  return (
    <div className="acciones" role="group" aria-label="Cantos">
      {respuestas.length > 0 && <div className="acciones-fila acciones-respuestas">{respuestas.map((a, i) => boton(a, i))}</div>}
      {cantos.length > 0 && (
        <div className="acciones-fila">
          {cantos.map((g) => (
            <div key={grupoDe(g[0]!)} className={`acciones-grupo grupo-${grupoDe(g[0]!)}`}>
              {g.map((a, i) => boton(a, i, i > 0))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/** Irse al mazo: discreto, aparte de la botonera para no tocarlo sin querer. */
export function BotonMazo({ vista, alElegir }: { vista: VistaPartida; alElegir: (a: Accion) => void }) {
  const mazo = vista.accionesValidas.find((a) => a.tipo === 'irseAlMazo')
  if (!mazo) return null
  return (
    <button type="button" className="boton-mazo" aria-label="Irse al mazo" onClick={() => alElegir(mazo)}>
      Mazo
    </button>
  )
}
