import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { LARGO_CODIGO } from '@truco/shared'
import { CabeceraOnline, datosUnirse, destinoAlEntrar, MensajeError } from '../componentes/Online'
import { TarjetaPerfil, usePerfil } from '../componentes/TarjetaPerfil'
import { ConexionOnline, motivoError } from '../conexion/online'
import { useJuego } from '../estado'

/** Entrar a una sala privada con el código que pasó el anfitrión. */
export function Unirme() {
  const navegar = useNavigate()
  const [perfil, cambiarPerfil] = usePerfil()
  const [pedirApodo] = useState(() => !perfil.apodo.trim())
  const [codigo, setCodigo] = useState('')
  const [entrando, setEntrando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const apodo = perfil.apodo.trim()
  const completo = codigo.length === LARGO_CODIGO

  const entrar = async (e: FormEvent) => {
    e.preventDefault()
    if (!completo || !apodo || entrando) return
    setEntrando(true)
    setError(null)
    try {
      const c = await ConexionOnline.unirse(codigo, datosUnirse(perfil))
      useJuego.getState().conectar(c)
      navegar(destinoAlEntrar())
    } catch (err) {
      setError(motivoError(err))
      setEntrando(false)
    }
  }

  return (
    <div className="pantalla-inicio pantalla-online">
      <CabeceraOnline titulo="Unirme con código" />
      {pedirApodo && <TarjetaPerfil perfil={perfil} cambiar={cambiarPerfil} />}
      <form className="tarjeta" onSubmit={entrar}>
        <label className="campo-codigo">
          <span>Código de la sala</span>
          <input
            value={codigo}
            maxLength={LARGO_CODIGO}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            placeholder="ABC23"
            aria-invalid={error !== null}
            onChange={(e) => {
              setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
              setError(null)
            }}
          />
        </label>
        <p className="nota-izq">Son {LARGO_CODIGO} letras y números. Te lo pasa quien creó la sala.</p>
        {error && <MensajeError>{error}</MensajeError>}
        <button type="submit" className="boton boton-grande" disabled={!completo || !apodo || entrando}>
          {entrando ? 'Entrando…' : 'Entrar'}
        </button>
        {!apodo && <p className="nota">Poné tu apodo para entrar.</p>}
      </form>
    </div>
  )
}
