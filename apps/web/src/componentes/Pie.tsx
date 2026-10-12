import type { Accion, VistaPartida } from '@truco/engine'
import type { Sugerencia } from '@truco/bots'

interface Props {
  vista: VistaPartida
  apodo: (asiento: number) => string
  alSugerir: (s: Sugerencia) => void
  alElegir: (a: Accion) => void
}

/**
 * Lo del pie (2v2 y 3v3, fuera del pica-pica): sugerencias en voz alta a tus compañeros ("Vení",
 * "Vamos a X") y, si en la mesa los toques y gritos los decide el pie, mandar a tocar o a gritar.
 * Solo aparece si sos vos el que lidera el equipo.
 */
export function PanelPie({ vista, apodo, alSugerir, alElegir }: Props) {
  const yo = vista.yo.asiento
  const e = vista.mano.enfrentamientos[vista.mano.actual]!
  if (vista.ganador !== null || e.lideres[yo % 2] !== yo || e.fin) return null
  const otros = e.participantes.filter((a) => a !== yo && !e.retirados.includes(a))
  const mandar = vista.accionesValidas.filter((a): a is Extract<Accion, { tipo: 'mandar' }> => a.tipo === 'mandar')
  return (
    <div className="panel-pie" role="group" aria-label="Lo que decís como pie">
      <button type="button" className="boton-pie" onClick={() => alSugerir({ tipo: 'veni' })}>
        Vení
      </button>
      {otros.map((a) => (
        <button key={`vamos-${a}`} type="button" className="boton-pie" onClick={() => alSugerir({ tipo: 'vamosA', asiento: a })}>
          Vamos a {apodo(a)}
        </button>
      ))}
      {mandar.map((a) => (
        <button key={`${a.que}-${a.a}`} type="button" className={`boton-pie manda-${a.que}`} onClick={() => alElegir(a)}>
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
