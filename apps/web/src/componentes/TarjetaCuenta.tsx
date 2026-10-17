import { useEffect, useState, type FormEvent } from 'react'
import { entrarConEmail, entrarConGoogle, iniciarCuenta, salir, useCuenta } from '../cuenta/cuenta'
import { MensajeError } from './Online'

/**
 * Tu cuenta: entrar guarda tus cosas (y, más adelante, tus monedas) para cualquier dispositivo.
 * Si el servidor no tiene cuentas, no se muestra y se juega como invitado.
 */
export function TarjetaCuenta() {
  const { estado, cuenta, modo, error, linkEnviado } = useCuenta()
  const [email, setEmail] = useState('')
  useEffect(() => void iniciarCuenta(), [])

  if (estado === 'cargando' || estado === 'apagadas') return null

  if (estado === 'adentro' && cuenta) {
    return (
      <section className="tarjeta cuenta">
        <h2>Tu cuenta</h2>
        <p className="cuenta-quien">
          Entraste como <strong>{cuenta.email ?? cuenta.apodo}</strong>. Tu perfil se guarda en la cuenta.
        </p>
        <button type="button" className="boton boton-secundario" onClick={() => void salir()}>
          Salir de la cuenta
        </button>
      </section>
    )
  }

  const enviar = (e: FormEvent) => {
    e.preventDefault()
    void entrarConEmail(email)
  }
  const entrando = estado === 'entrando'

  return (
    <section className="tarjeta cuenta">
      <h2>
        Tu cuenta {modo === 'prueba' && <span className="insignia">prueba</span>}
      </h2>
      <p className="nota-izq">Entrá para no perder tu perfil ni lo que ganes, y jugar desde cualquier dispositivo.</p>
      {modo === 'supabase' && (
        <button type="button" className="boton" disabled={entrando} onClick={() => void entrarConGoogle()}>
          Entrar con Google
        </button>
      )}
      {linkEnviado ? (
        <p className="nota-izq" role="status">
          Te mandamos un link a <strong>{linkEnviado}</strong>. Abrilo desde este dispositivo para entrar.
        </p>
      ) : (
        <form className="cuenta-email" onSubmit={enviar}>
          <label className="perfil-apodo">
            <span>{modo === 'prueba' ? 'Email (login de prueba, sin contraseña)' : 'O con tu email, sin contraseña'}</span>
            <input
              type="email"
              value={email}
              autoComplete="email"
              placeholder="vos@ejemplo.com"
              onChange={(e) => {
                setEmail(e.target.value)
                useCuenta.setState({ error: null })
              }}
            />
          </label>
          <button type="submit" className="boton boton-secundario" disabled={entrando || email.trim() === ''}>
            {entrando ? 'Entrando…' : modo === 'prueba' ? 'Entrar' : 'Mandarme el link'}
          </button>
        </form>
      )}
      {error && <MensajeError>{error}</MensajeError>}
    </section>
  )
}
