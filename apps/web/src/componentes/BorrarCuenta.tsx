import { useState } from 'react'
import { borrarCuenta } from '../cuenta/cuenta'
import { MensajeError } from './Online'

/**
 * Borrar la cuenta, en dos pasos: el botón y después la confirmación con lo que se pierde. Va en
 * la tarjeta de la cuenta y en la página /borrar-cuenta (Google Play pide las dos).
 */
export function BorrarCuenta({ alBorrar }: { alBorrar?: () => void }) {
  const [confirmando, setConfirmando] = useState(false)
  const [borrando, setBorrando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const borrar = async () => {
    setBorrando(true)
    setError(null)
    const motivo = await borrarCuenta()
    setBorrando(false)
    if (motivo) setError(motivo)
    else alBorrar?.()
  }

  if (!confirmando) {
    return (
      <button type="button" className="boton-texto borrar-cuenta" onClick={() => setConfirmando(true)}>
        Borrar mi cuenta
      </button>
    )
  }
  return (
    <div className="borrar-cuenta-confirmar" role="alertdialog" aria-labelledby="borrar-cuenta-titulo">
      <h3 id="borrar-cuenta-titulo">¿Borrar tu cuenta?</h3>
      <p className="nota-izq">
        Se borran para siempre tus monedas, lo que compraste, tu Elo, tus amigos, tu progreso del modo historia y tus mensajes en los
        grupos. Si sos líder de un grupo, el liderazgo pasa a otro miembro. No se puede deshacer.
      </p>
      <div className="botones-fila">
        <button type="button" className="boton boton-peligro" disabled={borrando} onClick={() => void borrar()}>
          {borrando ? 'Borrando…' : 'Sí, borrar todo'}
        </button>
        <button type="button" className="boton boton-secundario" disabled={borrando} onClick={() => setConfirmando(false)}>
          Cancelar
        </button>
      </div>
      {error && <MensajeError>{error}</MensajeError>}
    </div>
  )
}
