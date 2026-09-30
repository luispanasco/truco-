import { describirAccion } from '@truco/shared'
import type { Accion, VistaPartida } from '@truco/engine'

/** Botones de canto y respuesta: solo los que el motor permite en este momento. */
export function Acciones({ vista, alElegir }: { vista: VistaPartida; alElegir: (a: Accion) => void }) {
  const acciones = vista.accionesValidas.filter((a) => a.tipo !== 'jugarCarta')
  const principales = acciones.filter((a) => a.tipo !== 'irseAlMazo')
  const mazo = acciones.find((a) => a.tipo === 'irseAlMazo')
  return (
    <div className="acciones">
      {principales.map((a, i) => (
        <button
          key={i}
          type="button"
          className={`boton-accion accion-${a.tipo}${a.tipo === 'responder' && a.respuesta === 'noQuiero' ? ' accion-no' : ''}`}
          onClick={() => alElegir(a)}
        >
          {describirAccion(vista, a)}
        </button>
      ))}
      {mazo && (
        <button type="button" className="boton-accion accion-mazo" onClick={() => alElegir(mazo)}>
          Mazo
        </button>
      )}
    </div>
  )
}
