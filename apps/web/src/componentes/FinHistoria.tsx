import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { buscarDepartamento, HISTORIAS, nombreRecompensa } from '@truco/shared'
import type { NivelJugado } from '../conexion/tipos'
import { ganarNivelHistoria } from '../cuenta/historia'
import { useJuego } from '../estado'
import '../estilos-historia.css'

type Premio = { estado: 'anotando' } | { estado: 'listo'; nuevas: string[] } | { estado: 'error'; motivo: string }

/**
 * El final de un nivel del modo historia, en el cartel del final: al ganar se anota (una sola vez)
 * y se ven las recompensas; los botones llevan al siguiente nivel o de vuelta al departamento. Al
 * perder, la revancha es la de siempre.
 */
export function FinHistoria({ jugado, ganamos, revancha }: { jugado: NivelJugado; ganamos: boolean; revancha: () => void }) {
  const navegar = useNavigate()
  const [premio, setPremio] = useState<Premio>({ estado: 'anotando' })
  const historia = HISTORIAS[jugado.departamento]
  const hayOtro = !!historia && jugado.nivel < historia.niveles.length
  const departamento = buscarDepartamento(jugado.departamento)?.nombre ?? 'el mapa'

  useEffect(() => {
    if (!ganamos) return
    let vigente = true
    ganarNivelHistoria(jugado.departamento, jugado.nivel).then(
      (nuevas) => vigente && setPremio({ estado: 'listo', nuevas }),
      (e: unknown) => vigente && setPremio({ estado: 'error', motivo: e instanceof Error ? e.message : 'No se pudo anotar' }),
    )
    return () => {
      vigente = false
    }
  }, [ganamos, jugado.departamento, jugado.nivel])

  const ir = (a: string) => {
    useJuego.getState().salir()
    navegar(a)
  }

  return (
    <>
      {ganamos && (
        <div className="fin-historia" role="status">
          {premio.estado === 'anotando' && <p>Anotando el nivel…</p>}
          {premio.estado === 'error' && <p>⚠ {premio.motivo}</p>}
          {premio.estado === 'listo' &&
            (premio.nuevas.length > 0 ? (
              <>
                <p>
                  <strong>¡Ganaste!</strong>
                </p>
                <ul>
                  {premio.nuevas.map((id) => (
                    <li key={id}>🎁 {nombreRecompensa(id)}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p>Este nivel ya lo tenías ganado.</p>
            ))}
        </div>
      )}
      <div className="modal-botones">
        {ganamos && hayOtro ? (
          <button type="button" className="boton boton-grande" onClick={() => ir(`/historia/${jugado.departamento}/${jugado.nivel + 1}`)}>
            Siguiente nivel
          </button>
        ) : !ganamos ? (
          <button type="button" className="boton boton-grande" onClick={revancha}>
            Revancha
          </button>
        ) : null}
        <button type="button" className={`boton ${ganamos && !hayOtro ? 'boton-grande' : 'boton-secundario'}`} onClick={() => ir(`/historia/${jugado.departamento}`)}>
          Volver a {departamento}
        </button>
      </div>
    </>
  )
}
