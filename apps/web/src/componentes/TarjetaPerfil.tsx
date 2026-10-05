import { useCallback, useState } from 'react'
import { guardarPerfil, leerPerfil, type Perfil } from '../perfil'
import { Avatar } from './Avatar'
import { EditorAvatar } from './EditorAvatar'
import { Hoja } from './Hoja'
import { SelectorBaraja } from './SelectorBaraja'

/** El perfil de este navegador; se guarda mientras se edita, así sobrevive a recargar la página. */
export function usePerfil(): [Perfil, (p: Partial<Perfil>) => void] {
  const [perfil, setPerfil] = useState(leerPerfil)
  const cambiar = (p: Partial<Perfil>) =>
    setPerfil((x) => {
      const nuevo = { ...x, ...p }
      guardarPerfil(nuevo)
      return nuevo
    })
  return [perfil, cambiar]
}

/** Avatar y apodo (lo que ven los demás en la mesa) y la baraja con la que ves las cartas. */
export function TarjetaPerfil({ perfil, cambiar }: { perfil: Perfil; cambiar: (p: Partial<Perfil>) => void }) {
  const [editando, setEditando] = useState(false)
  const cerrar = useCallback(() => setEditando(false), [])
  return (
    <section className="tarjeta perfil">
      <button
        type="button"
        className="perfil-avatar"
        aria-label="Cambiar tu avatar"
        aria-haspopup="dialog"
        onClick={() => setEditando(true)}
      >
        <Avatar codigo={perfil.avatar} apodo={perfil.apodo} />
        <span className="perfil-editar" aria-hidden="true">
          ✎
        </span>
      </button>
      <label className="perfil-apodo">
        <span>Tu apodo</span>
        <input value={perfil.apodo} maxLength={20} placeholder="¿Cómo te dicen?" onChange={(e) => cambiar({ apodo: e.target.value })} />
      </label>
      {editando && (
        <Hoja titulo="Tu avatar" alCerrar={cerrar} clase="hoja-avatar" claseFondo="hoja-fija">
          <EditorAvatar codigo={perfil.avatar} apodo={perfil.apodo} alCambiar={(avatar) => cambiar({ avatar })} />
          <button type="button" className="boton" onClick={cerrar}>
            Listo
          </button>
        </Hoja>
      )}
      <SelectorBaraja baraja={perfil.baraja} alElegir={(b) => cambiar({ baraja: b })} />
    </section>
  )
}
