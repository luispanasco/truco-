import { useCallback, useEffect, useState } from 'react'
import { create } from 'zustand'
import { PREMIO_REPORTE, textoTipoReporte, type AvisoReporte } from '@truco/shared'
import { useCuenta } from '../cuenta/cuenta'
import { avisosDeReportes, marcarAvisosVistos } from '../reportes'
import { Moneda } from '../tienda/Probador'
import { Hoja } from './Hoja'
import '../estilos-reportes.css'

/** Si ya no hay (o ya se cerró) el aviso de reportes: las novedades esperan a que termine. */
export const useAvisoReportes = create<{ terminado: boolean }>(() => ({ terminado: false }))
const terminar = () => useAvisoReportes.setState({ terminado: true })

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
    if (!listo) return
    if (estado === 'apagadas') return terminar()
    const quien = cuentaId ?? 'invitado'
    if (pedidosPara === quien) return
    pedidosPara = quien
    let vigente = true
    avisosDeReportes().then(
      (a) => {
        // Si ya se fue del inicio, el aviso sale la próxima vez que abra la app.
        if (a.length === 0 || !vigente) terminar()
        else setAvisos(a)
      },
      terminar,
    )
    return () => {
      vigente = false
    }
  }, [listo, estado, cuentaId])

  const cerrar = useCallback(() => {
    void marcarAvisosVistos(avisos.map((a) => a.id)).catch(() => {})
    setAvisos([])
    terminar()
  }, [avisos])

  if (avisos.length === 0) return null
  const premio = avisos.reduce((t, a) => t + a.premio, 0)
  return (
    <Hoja titulo={avisos.length > 1 ? '¡Gracias por tus reportes!' : '¡Gracias por tu reporte!'} alCerrar={cerrar} clase="hoja-menu hoja-aviso-reporte" claseFondo="hoja-fija">
      {/* Con varios reportes no entra: lo largo se desliza adentro y el botón queda a la vista. */}
      <div className="hoja-menu-contenido">
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
        </div>
      </div>
      <button type="button" className="boton boton-grande boton-relieve aviso-reporte-listo" onClick={cerrar}>
        ¡Buenísimo!
      </button>
    </Hoja>
  )
}

/** Para los tests: que se vuelvan a pedir. */
export function olvidarAvisosPedidos() {
  pedidosPara = null
  useAvisoReportes.setState({ terminado: false })
}
