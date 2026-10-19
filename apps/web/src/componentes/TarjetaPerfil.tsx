import { useCallback, useEffect, useRef, useState } from 'react'
import { guardarPerfil, leerPerfil, observarPerfil, type Perfil } from '../perfil'
import { Avatar } from './Avatar'
import { EditorAvatar } from './EditorAvatar'
import { Hoja } from './Hoja'
import { SelectorBaraja } from './SelectorBaraja'

/**
 * El perfil de este navegador; se guarda mientras se edita, así sobrevive a recargar la página.
 * Todas las partes de la pantalla que lo usan se enteran de cada cambio (en el menú, el banner,
 * la tienda y los ajustes lo cambian a la vez), y al entrar a la cuenta, lo guardado en ella
 * reemplaza lo de este navegador.
 */
export function usePerfil(): [Perfil, (p: Partial<Perfil>) => void] {
  const [perfil, setPerfil] = useState(leerPerfil)
  // El último perfil guardado, para que dos cambios seguidos no se pisen.
  const actual = useRef(perfil)
  useEffect(
    () =>
      observarPerfil((p) => {
        actual.current = p
        setPerfil(p)
      }),
    [],
  )
  const cambiar = useCallback((p: Partial<Perfil>) => {
    const nuevo = { ...actual.current, ...p }
    actual.current = nuevo
    guardarPerfil(nuevo)
    // Por si no hay nadie escuchando todavía (el efecto corre después del primer dibujo).
    setPerfil(nuevo)
  }, [])
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
          <EditorAvatar
            codigo={perfil.avatar}
            apodo={perfil.apodo}
            alCambiar={(avatar) => cambiar({ avatar })}
            tiendaDesbloqueada={perfil.tiendaDesbloqueada}
          />
          <button type="button" className="boton" onClick={cerrar}>
            Listo
          </button>
        </Hoja>
      )}
      <SelectorBaraja baraja={perfil.baraja} alElegir={(b) => cambiar({ baraja: b })} />
    </section>
  )
}
