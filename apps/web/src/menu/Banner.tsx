import { useEffect, useState } from 'react'
import type { Formato } from '@truco/engine'
import { Avatar } from '../componentes/Avatar'
import { direccionApi, iniciarCuenta, useCuenta } from '../cuenta/cuenta'
import type { Perfil } from '../perfil'
import { BanderaUruguay } from './BanderaUruguay'
import { IconoAjustes, IconoLobby } from './Iconos'

/** El Elo con el que arranca cualquiera (como en el servidor, `ELO.inicial`). */
export const ELO_INICIAL = 1200

/**
 * Tu Elo en un formato, del ranking (`yo`). Sin partidas con Elo todavía, el servidor no te
 * devuelve: es el inicial. `null` mientras carga, sin cuenta o si el servidor no responde.
 */
export function useElo(formato: Formato): { puntos: number; partidas: number } | null {
  const token = useCuenta((s) => (s.estado === 'adentro' ? s.token : null))
  const [elo, setElo] = useState<{ formato: Formato; puntos: number; partidas: number } | null>(null)
  useEffect(() => {
    if (!token) return
    let vigente = true
    fetch(`${direccionApi()}/ranking?formato=${formato}`, { headers: { authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status))
        const { yo } = (await r.json()) as { yo: { puntos: number; partidas: number } | null }
        if (vigente) setElo({ formato, puntos: yo?.puntos ?? ELO_INICIAL, partidas: yo?.partidas ?? 0 })
      })
      .catch(() => {})
    return () => {
      vigente = false
    }
  }, [formato, token])
  // Al cambiar de formato no se muestra el del anterior mientras llega el nuevo.
  return token && elo?.formato === formato ? elo : null
}

const NOMBRE_FORMATO: Record<Formato, string> = { '1v1': '1 vs 1', '2v2': '2 vs 2', '3v3': '3 vs 3' }

/**
 * El banner fijo arriba del menú, como en los juegos de celular: tu avatar (tocándolo se edita
 * el avatar y el apodo), tu apodo, tus monedas y tu Elo del formato que jugás, la bandera y el
 * engranaje de los ajustes. Sin cuenta, invita a entrar. Va sin fondo, flotando sobre el paño.
 */
export function Banner({
  perfil,
  alEditarPerfil,
  alEntrar,
  alAjustes,
  alTienda,
}: {
  perfil: Perfil
  alEditarPerfil: () => void
  alEntrar: () => void
  alAjustes: () => void
  alTienda: () => void
}) {
  const { estado, saldo } = useCuenta()
  useEffect(() => void iniciarCuenta(), [])
  const elo = useElo(perfil.formato)
  const apodo = perfil.apodo.trim()

  return (
    <header className="banner">
      <div className="banner-fila">
        <button type="button" className="perfil-avatar banner-avatar" aria-label="Cambiar tu avatar" aria-haspopup="dialog" onClick={alEditarPerfil}>
          <Avatar codigo={perfil.avatar} apodo={perfil.apodo} />
          <span className="perfil-editar" aria-hidden="true">
            ✎
          </span>
        </button>
        <div className="banner-quien">
          <div className="banner-nombre">
            <BanderaUruguay clase="banner-bandera" />
            <button type="button" className="banner-apodo" aria-haspopup="dialog" onClick={alEditarPerfil}>
              {apodo || <em>Poné tu apodo</em>}
            </button>
          </div>
          {estado === 'adentro' ? (
            <div className="banner-datos">
              <button
                type="button"
                className="banner-dato banner-monedas"
                aria-label={`${saldo ?? 0} monedas. Ir a la tienda`}
                onClick={alTienda}
              >
                <span className="banner-moneda" aria-hidden="true" /> {saldo ?? '…'}
              </button>
              <span
                className={`banner-dato banner-elo${elo && elo.partidas === 0 ? ' sin-partidas' : ''}`}
                title={elo && elo.partidas === 0 ? 'Todavía sin partidas con Elo: arrancás con 1200' : undefined}
              >
                <IconoLobby clase="banner-copa" /> {elo?.puntos ?? '…'} <small>Elo {NOMBRE_FORMATO[perfil.formato]}</small>
              </span>
            </div>
          ) : estado === 'afuera' || estado === 'entrando' ? (
            <button type="button" className="banner-entrar" onClick={alEntrar}>
              Entrar a tu cuenta
            </button>
          ) : (
            <span className="banner-invitado">{estado === 'cargando' ? '…' : 'Jugás como invitado'}</span>
          )}
        </div>
        <button type="button" className="banner-ajustes" aria-label="Ajustes" aria-haspopup="dialog" onClick={alAjustes}>
          <IconoAjustes />
        </button>
      </div>
    </header>
  )
}
