import { useState } from 'react'
import { MAX_DESCRIPCION_REPORTE, TIPOS_REPORTE, type TipoReporte } from '@truco/shared'
import { useJuego } from '../estado'
import { mandarReporte } from '../reportes'
import { Hoja } from './Hoja'
import '../estilos-reportes.css'

/**
 * Reportar un problema (los testers): qué tipo de problema, una descripción si querés, y se manda
 * con la partida adjunta, sin salir de la mesa.
 */
export function HojaReporte({ alCerrar, fija = false }: { alCerrar: () => void; fija?: boolean }) {
  const [tipo, setTipo] = useState<TipoReporte | null>(null)
  const [descripcion, setDescripcion] = useState('')
  const [estado, setEstado] = useState<'editando' | 'mandando' | 'listo'>('editando')
  const [error, setError] = useState<string | null>(null)
  const enPartida = useJuego((s) => s.conexion !== null)

  const mandar = async () => {
    if (!tipo) return
    setEstado('mandando')
    setError(null)
    try {
      await mandarReporte(tipo, descripcion)
      setEstado('listo')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo mandar.')
      setEstado('editando')
    }
  }

  return (
    <Hoja titulo="Reportar un problema" alCerrar={alCerrar} clase="hoja-menu hoja-reporte" claseFondo={fija ? 'hoja-fija' : ''}>
      {estado === 'listo' ? (
        <div className="reporte-gracias" role="status">
          <p>¡Gracias! Lo vamos a mirar.</p>
          <button type="button" className="boton boton-grande" onClick={alCerrar}>
            Listo
          </button>
        </div>
      ) : (
        <form
          className="reporte-form"
          onSubmit={(e) => {
            e.preventDefault()
            void mandar()
          }}
        >
          <div className="campo">
            <span id="reporte-tipo">¿Qué pasó?</span>
            <div className="reporte-tipos" role="radiogroup" aria-labelledby="reporte-tipo">
              {TIPOS_REPORTE.map((t) => (
                <button key={t.id} type="button" role="radio" aria-checked={tipo === t.id} className={tipo === t.id ? 'elegido' : ''} onClick={() => setTipo(t.id)}>
                  {t.texto}
                </button>
              ))}
            </div>
          </div>
          <label className="perfil-apodo">
            <span>Contanos qué viste (opcional)</span>
            <textarea
              value={descripcion}
              maxLength={MAX_DESCRIPCION_REPORTE}
              rows={4}
              placeholder="Qué hiciste y qué esperabas que pasara"
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </label>
          <small className="nota-izq">
            {enPartida ? 'Se manda con lo que pasó en la partida, para poder verla de nuevo.' : 'Se manda con la versión de la app y tu navegador.'}
          </small>
          {error && (
            <p className="error-online" role="alert">
              {error} Probá de nuevo.
            </p>
          )}
          <button type="submit" className="boton boton-grande" disabled={!tipo || estado === 'mandando'}>
            {estado === 'mandando' ? 'Mandando…' : error ? 'Reintentar' : 'Mandar'}
          </button>
        </form>
      )}
    </Hoja>
  )
}
