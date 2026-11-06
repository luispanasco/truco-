import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import type { EntradaMuro, MuroGrupo as TMuroGrupo } from '@truco/shared'
import { Avatar } from './Avatar'
import { muroGrupo } from '../cuenta/grupos'
import { useJuego } from '../estado'

const NOMBRE_FORMATO = { '1v1': '1 vs 1', '2v2': '2 vs 2', '3v3': '3 vs 3' } as const

/** "hace 5 min", "hace 2 h", "ayer"… */
export function hace(iso: string, ahora = Date.now()): string {
  const min = Math.max(0, Math.round((ahora - Date.parse(iso)) / 60_000))
  if (min < 1) return 'recién'
  if (min < 60) return `hace ${min} min`
  const h = Math.round(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.round(h / 24)
  return d === 1 ? 'ayer' : `hace ${d} días`
}

/**
 * El muro del grupo: las salas que mandaron los miembros (para sumarse) y los resultados de las
 * partidas jugadas entre ellos, con su repetición; y la tabla de quién gana más. Se actualiza solo.
 */
export function MuroGrupo({ grupo }: { grupo: string }) {
  const [muro, setMuro] = useState<TMuroGrupo | null>(null)
  const [error, setError] = useState(false)
  const cargar = useCallback(async () => {
    try {
      setMuro(await muroGrupo(grupo))
      setError(false)
    } catch {
      setError(true)
    }
  }, [grupo])
  useEffect(() => {
    void cargar()
    const t = setInterval(() => void cargar(), 20_000)
    return () => clearInterval(t)
  }, [cargar])

  if (!muro) return <p className="nota-izq">{error ? 'No se pudo traer el muro.' : 'Cargando el muro…'}</p>
  return (
    <>
      {muro.ranking.length > 0 && (
        <section className="tarjeta grupo-tabla" aria-labelledby="grupo-tabla">
          <h2 id="grupo-tabla">Tabla del grupo</h2>
          <ol className="tabla-grupo">
            {muro.ranking.slice(0, 5).map((f, i) => (
              <li key={f.cuentaId}>
                <span className={`tabla-puesto puesto-${i + 1}`}>{i + 1}</span>
                <span className="tabla-avatar">
                  <Avatar codigo={f.avatar} apodo={f.apodo} />
                </span>
                <span className="tabla-nombre">{f.apodo}</span>
                <span className="tabla-numeros">
                  <strong>{f.ganadas}</strong> de {f.jugadas}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
      <section className="grupo-muro" aria-labelledby="grupo-muro">
        <h2 id="grupo-muro" className="grupo-muro-titulo">
          Muro
        </h2>
        {muro.entradas.length === 0 ? (
          <p className="nota-izq muro-vacio">
            Todavía no hay nada. Armá una sala y mandala al grupo, o jueguen una partida entre ustedes: el resultado aparece acá, con su
            repetición.
          </p>
        ) : (
          <ul className="muro">
            {muro.entradas.map((e) => (
              <EntradaDelMuro key={e.id} entrada={e} />
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

function EntradaDelMuro({ entrada: e }: { entrada: EntradaMuro }) {
  const navegar = useNavigate()
  if (e.tipo === 'invitacion') {
    const unirse = () => {
      // Si estabas en otra sala, se sale antes de entrar a la nueva.
      if (useJuego.getState().conexion) useJuego.getState().salir()
      navegar(`/s/${e.datos.codigo}`)
    }
    return (
      <li className="muro-entrada muro-invitacion">
        <span className="muro-avatar">
          <Avatar codigo={e.autor.avatar} apodo={e.autor.apodo} />
        </span>
        <span className="muro-texto">
          <strong>{e.autor.apodo}</strong> armó un {NOMBRE_FORMATO[e.datos.formato]} a {e.datos.puntos}
          <small>
            Sala {e.datos.codigo} · {hace(e.creado)}
          </small>
        </span>
        <button type="button" className="boton muro-boton" onClick={unirse}>
          Unirme
        </button>
      </li>
    )
  }
  const d = e.datos
  const nombres = (equipo: 0 | 1) => d.equipos[equipo].map((j) => j.apodo).join(' y ')
  const [gana, pierde] = d.ganador === 0 ? [0, 1] as const : [1, 0] as const
  return (
    <li className="muro-entrada muro-resultado">
      <span className="muro-trofeo" aria-hidden="true">
        🏆
      </span>
      <span className="muro-texto">
        <span>
          <strong>{nombres(gana)}</strong> le {d.equipos[gana].length > 1 ? 'ganaron' : 'ganó'} a {nombres(pierde)}
        </span>
        <span className="muro-tanteo">
          {d.puntos[gana]} a {d.puntos[pierde]}
        </span>
        <small>
          {NOMBRE_FORMATO[d.formato]} a {d.puntosPartida} · {hace(e.creado)}
        </small>
      </span>
      {d.repeticion && (
        <button type="button" className="boton boton-secundario muro-boton" onClick={() => navegar(`/repeticion/${d.repeticion}`)}>
          Ver repetición
        </button>
      )}
    </li>
  )
}
