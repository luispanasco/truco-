import { useState } from 'react'
import { AVATARES, guardarPerfil, leerPerfil, type Perfil } from '../perfil'
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
  const [eligiendoAvatar, setEligiendoAvatar] = useState(false)
  return (
    <section className="tarjeta perfil">
      <button
        type="button"
        className="perfil-avatar"
        aria-label="Elegir avatar"
        aria-expanded={eligiendoAvatar}
        onClick={() => setEligiendoAvatar((v) => !v)}
      >
        {perfil.avatar}
        <span className="perfil-editar">✎</span>
      </button>
      <label className="perfil-apodo">
        <span>Tu apodo</span>
        <input value={perfil.apodo} maxLength={20} placeholder="¿Cómo te dicen?" onChange={(e) => cambiar({ apodo: e.target.value })} />
      </label>
      {eligiendoAvatar && (
        <div className="avatares" role="radiogroup" aria-label="Avatar">
          {AVATARES.map((a) => (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={perfil.avatar === a}
              className={`avatar-opcion${perfil.avatar === a ? ' elegido' : ''}`}
              onClick={() => {
                cambiar({ avatar: a })
                setEligiendoAvatar(false)
              }}
            >
              {a}
            </button>
          ))}
        </div>
      )}
      <SelectorBaraja baraja={perfil.baraja} alElegir={(b) => cambiar({ baraja: b })} />
    </section>
  )
}
