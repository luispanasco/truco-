import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { Nivel } from '@truco/bots'
import type { Formato } from '@truco/engine'
import { ConexionLocal } from '../conexion/local'
import { useJuego } from '../estado'
import { AVATARES, guardarPerfil, leerPerfil } from '../perfil'

const FORMATOS: [Formato, string][] = [
  ['1v1', '1 contra 1'],
  ['2v2', '2 contra 2'],
  ['3v3', '3 contra 3'],
]
const NIVELES: [Nivel, string][] = [
  ['facil', 'Fácil'],
  ['medio', 'Medio'],
  ['dificil', 'Difícil'],
]

export function Inicio() {
  const navegar = useNavigate()
  const [perfil, setPerfil] = useState(leerPerfil)
  const cambiar = (p: Partial<typeof perfil>) => setPerfil((x) => ({ ...x, ...p }))
  const apodo = perfil.apodo.trim()

  const jugarContraBots = () => {
    guardarPerfil(perfil)
    useJuego.getState().conectar(
      new ConexionLocal({ apodo, avatar: perfil.avatar, formato: perfil.formato, nivelBots: perfil.nivelBots, ayudas: true }),
    )
    navegar('/mesa')
  }

  return (
    <div className="pantalla-inicio">
      <h1>
        Truco <span>uruguayo</span>
      </h1>

      <label className="campo">
        <span>Tu apodo</span>
        <input
          value={perfil.apodo}
          maxLength={20}
          placeholder="¿Cómo te dicen?"
          onChange={(e) => cambiar({ apodo: e.target.value })}
        />
      </label>

      <div className="campo">
        <span>Avatar</span>
        <div className="avatares" role="radiogroup" aria-label="Avatar">
          {AVATARES.map((a) => (
            <button
              key={a}
              type="button"
              role="radio"
              aria-checked={perfil.avatar === a}
              className={`avatar-opcion${perfil.avatar === a ? ' elegido' : ''}`}
              onClick={() => cambiar({ avatar: a })}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div className="campo">
        <span>Formato</span>
        <div className="segmentado">
          {FORMATOS.map(([f, t]) => (
            <button key={f} type="button" className={perfil.formato === f ? 'elegido' : ''} onClick={() => cambiar({ formato: f })}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="campo">
        <span>Nivel de los bots</span>
        <div className="segmentado">
          {NIVELES.map(([nv, t]) => (
            <button key={nv} type="button" className={perfil.nivelBots === nv ? 'elegido' : ''} onClick={() => cambiar({ nivelBots: nv })}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <button type="button" className="boton boton-grande" disabled={!apodo} onClick={jugarContraBots}>
        Jugar contra bots
      </button>
      <button type="button" className="boton boton-secundario" disabled title="Llega en el tramo D3">
        Crear sala online (pronto)
      </button>
      <button type="button" className="boton boton-secundario" disabled title="Llega en el tramo D3">
        Unirme con código (pronto)
      </button>
      {!apodo && <p className="nota">Poné un apodo para jugar.</p>}
    </div>
  )
}
