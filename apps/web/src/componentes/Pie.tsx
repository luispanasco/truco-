import type { Accion, VistaPartida } from '@truco/engine'
import type { Sugerencia } from '@truco/bots'

interface Props {
  vista: VistaPartida
  apodo: (asiento: number) => string
  alSugerir: (s: Sugerencia) => void
  alElegir: (a: Accion) => void
  /** Después de elegir algo (el panel se cierra). */
  alCerrar?: () => void
}

/** Si sos el pie del duelo en curso: a quiénes les podés sugerir y a quiénes mandar a tocar o gritar. */
export function opcionesDelPie(vista: VistaPartida) {
  const yo = vista.yo.asiento
  const e = vista.mano.enfrentamientos[vista.mano.actual]!
  if (vista.ganador !== null || vista.mano.cortando !== null || e.lideres[yo % 2] !== yo || e.fin) return null
  return {
    // "Vamos a X" es siempre a un compañero.
    otros: e.participantes.filter((a) => a !== yo && a % 2 === yo % 2 && !e.retirados.includes(a)),
    mandar: vista.accionesValidas.filter((a): a is Extract<Accion, { tipo: 'mandar' }> => a.tipo === 'mandar'),
  }
}

/**
 * El botón "Pie", chico, junto a "Mazo": abre lo que decís como pie. No ocupa una fila: así
 * nunca empuja ni tapa los cantos. Marcado si podés mandar a tocar o a gritar.
 */
export function BotonPie({ vista, abierto, alCambiar }: { vista: VistaPartida; abierto: boolean; alCambiar: (abierto: boolean) => void }) {
  const op = opcionesDelPie(vista)
  if (!op) return null
  return (
    <button
      type="button"
      className={`boton-mazo boton-abrir-pie${abierto ? ' activo' : ''}${op.mandar.length > 0 ? ' con-ordenes' : ''}`}
      aria-expanded={abierto}
      aria-label={op.mandar.length > 0 ? 'Pie: podés mandar a tocar o a gritar' : 'Lo que decís como pie'}
      onClick={() => alCambiar(!abierto)}
    >
      Pie
    </button>
  )
}

/**
 * Lo del pie (2v2 y 3v3, fuera del pica-pica): sugerencias en voz alta a tus compañeros ("Vení",
 * "Vamos a X") y, si en la mesa los toques y gritos los decide el pie, mandar a tocar o a gritar.
 * Solo aparece si sos vos el que lidera el equipo. En la mesa sale flotando sobre el borde del
 * paño, en una fila que se desliza, y se cierra al elegir.
 */
export function PanelPie({ vista, apodo, alSugerir, alElegir, alCerrar }: Props) {
  const op = opcionesDelPie(vista)
  if (!op) return null
  const elegir = (f: () => void) => () => {
    f()
    alCerrar?.()
  }
  return (
    <div className="panel-pie" role="group" aria-label="Lo que decís como pie">
      <button type="button" className="boton-pie" onClick={elegir(() => alSugerir({ tipo: 'veni' }))}>
        Vení
      </button>
      {op.otros.map((a) => (
        <button key={`vamos-${a}`} type="button" className="boton-pie" onClick={elegir(() => alSugerir({ tipo: 'vamosA', asiento: a }))}>
          Vamos a {apodo(a)}
        </button>
      ))}
      {op.mandar.map((a) => (
        <button key={`${a.que}-${a.a}`} type="button" className={`boton-pie manda-${a.que}`} onClick={elegir(() => alElegir(a))}>
          {a.que === 'tocar' ? 'Tocá' : 'Gritá'}, {apodo(a.a)}
        </button>
      ))}
    </div>
  )
}

/** Pasar en la tercera: prendido, la próxima carta que tocás va tapada. */
export function BotonPasar({ vista, activo, alCambiar }: { vista: VistaPartida; activo: boolean; alCambiar: (activo: boolean) => void }) {
  const puede = vista.accionesValidas.some((a) => a.tipo === 'jugarCarta' && a.tapada === true)
  if (!puede) return null
  return (
    <button
      type="button"
      className={`boton-mazo boton-pasar${activo ? ' activo' : ''}`}
      aria-pressed={activo}
      onClick={() => alCambiar(!activo)}
      title="La carta que toques va tapada y no gana la vuelta"
    >
      {activo ? 'Elegí cuál pasás' : 'Pasar'}
    </button>
  )
}
