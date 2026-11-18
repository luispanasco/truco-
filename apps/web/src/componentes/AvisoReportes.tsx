import { useCallback, useEffect, useState } from 'react'
import { PREMIO_REPORTE, textoTipoReporte, type AvisoReporte } from '@truco/shared'
import { useCuenta } from '../cuenta/cuenta'
import { avisosDeReportes, marcarAvisosVistos } from '../reportes'
import { Moneda } from '../tienda/Probador'
import { Hoja } from './Hoja'
import '../estilos-reportes.css'

/** Para quién ya se pidieron los avisos en esta visita (la cuenta o el invitado): al volver al inicio no se piden de nuevo. */
let pedidosPara: string | null = null

/**
 * Al abrir la app: si arreglamos algo que reportaste, el agradecimiento (con el mensaje del admin)
 * y, con cuenta, las monedas que ya se sumaron a tu saldo. Al cerrarlo no vuelve a salir.
 */
export function AvisoReportes() {
  const estado = useCuenta((s) => s.estado)
  const cuentaId = useCuenta((s) => s.cuenta?.id ?? null)
  const [avisos, setAvisos] = useState<AvisoReporte[]>([])
  const listo = estado === 'adentro' || estado === 'afuera' || estado === 'apagadas'

  useEffect(() => {
    // Sin servidor de cuentas no hay reportes guardados.
    if (!listo || estado === 'apagadas') return
    const quien = cuentaId ?? 'invitado'
    if (pedidosPara === quien) return
    pedidosPara = quien
    let vigente = true
    avisosDeReportes().then(
      (a) => vigente && setAvisos(a),
      () => {},
    )
    return () => {
      vigente = false
    }
  }, [listo, estado, cuentaId])

  const cerrar = useCallback(() => {
    void marcarAvisosVistos(avisos.map((a) => a.id)).catch(() => {})
    setAvisos([])
  }, [avisos])

  if (avisos.length === 0) return null
  const premio = avisos.reduce((t, a) => t + a.premio, 0)
  return (
    <Hoja titulo={avisos.length > 1 ? '¡Gracias por tus reportes!' : '¡Gracias por tu reporte!'} alCerrar={cerrar} clase="hoja-menu hoja-aviso-reporte" claseFondo="hoja-fija">
      <div className="aviso-reporte">
        {avisos.map((a) => (
          <div key={a.id} className="aviso-reporte-item">
            <small>Nos avisaste:</small>
            <p className="aviso-reporte-cita">“{a.descripcion || textoTipoReporte(a.tipo)}”</p>
            <p>{a.mensaje}</p>
          </div>
        ))}
        {premio > 0 ? (
          <span className="aviso-reporte-premio" aria-label={`Ganaste ${premio} monedas`}>
            +{premio} <Moneda />
          </span>
        ) : (
          !cuentaId && <small>Con una cuenta, la próxima vez te llevás {PREMIO_REPORTE} monedas.</small>
        )}
        <button type="button" className="boton boton-grande boton-relieve" onClick={cerrar}>
          ¡Buenísimo!
        </button>
      </div>
    </Hoja>
  )
}

/** Para los tests: que se vuelvan a pedir. */
export function olvidarAvisosPedidos() {
  pedidosPara = null
}
