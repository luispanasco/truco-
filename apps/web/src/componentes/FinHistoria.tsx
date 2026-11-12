import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { buscarDepartamento, HISTORIAS, nombreRecompensa } from '@truco/shared'
import type { NivelJugado } from '../conexion/tipos'
import { ganarNivelHistoria } from '../cuenta/historia'
import { useJuego } from '../estado'
import { EscenaFinal, type Premio } from '../historia/EscenaFinal'
import '../estilos-historia.css'

/**
 * El final de un nivel del modo historia, en el cartel del final: al ganar se anota (una sola vez)
 * y se ven las recompensas. "Seguir" abre la escena del final (el rival y tu compañero dicen lo
 * suyo) y ahí están los botones: al siguiente nivel, a la despedida (si con este completaste el
 * departamento), la revancha (la de siempre) o de vuelta al departamento.
 */
export function FinHistoria({
  jugado,
  ganamos,
  revancha,
  online = false,
  pediRevancha = false,
}: {
  jugado: NivelJugado
  ganamos: boolean
  revancha: () => void
  /** En cooperativo, el nivel lo anota el servidor y avisa qué te tocó. */
  online?: boolean
  pediRevancha?: boolean
}) {
  const navegar = useNavigate()
  const [anotado, setAnotado] = useState<Premio>({ estado: 'anotando' })
  const [escena, setEscena] = useState(false)
  const delServidor = useJuego((s) => s.premioHistoria)
  const premio: Premio = !online
    ? anotado
    : !delServidor
      ? { estado: 'anotando' }
      : delServidor.anotado
        ? { estado: 'listo', nuevas: delServidor.nuevas }
        : { estado: 'error', motivo: 'No se te anotó: primero ganá el nivel anterior' }
  const historia = HISTORIAS[jugado.departamento]
  const hayOtro = !!historia && jugado.nivel < historia.niveles.length
  const departamento = buscarDepartamento(jugado.departamento)?.nombre ?? 'el mapa'
  // Con este nivel completaste el departamento (la primera vez: hay premios nuevos): toca despedirse.
  const completaste = ganamos && !hayOtro && premio.estado === 'listo' && premio.nuevas.length > 0

  useEffect(() => {
    if (!ganamos || online) return
    let vigente = true
    ganarNivelHistoria(jugado.departamento, jugado.nivel, jugado.barrio ?? '').then(
      (nuevas) => vigente && setAnotado({ estado: 'listo', nuevas }),
      (e: unknown) => vigente && setAnotado({ estado: 'error', motivo: e instanceof Error ? e.message : 'No se pudo anotar' }),
    )
    return () => {
      vigente = false
    }
  }, [ganamos, online, jugado.departamento, jugado.barrio, jugado.nivel])

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
                    <li key={id}>
                      {id.startsWith('monedas:') ? '🪙' : '🎁'} {nombreRecompensa(id)}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>Este nivel ya lo tenías ganado.</p>
            ))}
        </div>
      )}
      <div className="modal-botones">
        <button type="button" className="boton boton-grande" onClick={() => setEscena(true)}>
          Seguir
        </button>
        <button type="button" className="boton boton-secundario" onClick={() => ir(`/historia/${jugado.departamento}`)}>
          Volver a {departamento}
        </button>
      </div>
      {escena && (
        <EscenaFinal
          jugado={jugado}
          ganamos={ganamos}
          premio={premio}
          botones={
            <>
              {completaste ? (
                <button type="button" className="boton boton-grande" onClick={() => ir(`/historia/${jugado.departamento}/despedida`)}>
                  Despedirte de {departamento}
                </button>
              ) : ganamos && hayOtro ? (
                <button type="button" className="boton boton-grande" onClick={() => ir(`/historia/${jugado.departamento}/${jugado.nivel + 1}`)}>
                  Siguiente nivel
                </button>
              ) : !ganamos ? (
                <button type="button" className="boton boton-grande" onClick={revancha} disabled={pediRevancha}>
                  {pediRevancha ? 'Esperando a los demás…' : 'Revancha'}
                </button>
              ) : null}
              <button
                type="button"
                className={`boton ${ganamos && !hayOtro && !completaste ? 'boton-grande' : 'boton-secundario'}`}
                onClick={() => ir(`/historia/${jugado.departamento}`)}
              >
                Volver a {departamento}
              </button>
            </>
          }
        />
      )}
    </>
  )
}
