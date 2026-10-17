import { useEffect, useState } from 'react'
import type { Formato } from '@truco/engine'
import { Avatar } from '../componentes/Avatar'
import { Segmentado } from '../componentes/FormularioSala'
import { CabeceraOnline, MensajeError } from '../componentes/Online'
import { direccionApi, iniciarCuenta, useCuenta } from '../cuenta/cuenta'

interface Fila {
  posicion: number
  cuentaId: string
  apodo: string
  avatar: string | null
  puntos: number
  partidas: number
  ganadas: number
}

interface Ranking {
  formato: Formato
  minimo: number
  filas: Fila[]
  yo: (Fila & { enRanking: boolean }) | null
}

/** El ranking por formato. El Elo solo se mueve en partidas entre personas con cuenta. */
export function Ranking() {
  const [formato, setFormato] = useState<Formato>('1v1')
  const [datos, setDatos] = useState<Ranking | null>(null)
  const [error, setError] = useState<string | null>(null)
  const token = useCuenta((s) => s.token)
  useEffect(() => void iniciarCuenta(), [])

  useEffect(() => {
    let vigente = true
    setDatos(null)
    setError(null)
    fetch(`${direccionApi()}/ranking?formato=${formato}`, token ? { headers: { authorization: `Bearer ${token}` } } : {})
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status))
        const d = (await r.json()) as Ranking
        if (vigente) setDatos(d)
      })
      .catch(() => vigente && setError('No se pudo traer el ranking. ¿Está prendido el servidor?'))
    return () => {
      vigente = false
    }
  }, [formato, token])

  const yo = datos?.yo ?? null
  const yoEnLista = yo !== null && datos!.filas.some((f) => f.cuentaId === yo.cuentaId)

  return (
    <div className="pantalla-inicio pantalla-online">
      <CabeceraOnline titulo="Ranking" />
      <section className="tarjeta">
        <Segmentado
          titulo="Formato"
          valor={formato}
          opciones={[
            ['1v1', '1 vs 1'],
            ['2v2', '2 vs 2'],
            ['3v3', '3 vs 3'],
          ]}
          alCambiar={setFormato}
        />
        <p className="nota-izq">
          Solo cuentan las partidas entre personas con cuenta, nunca contra la compu. Para aparecer hay que jugar {datos?.minimo ?? 5}.
        </p>
        {error && <MensajeError>{error}</MensajeError>}
        {!datos && !error && <p className="nota">Cargando…</p>}
        {datos && datos.filas.length === 0 && <p className="nota">Todavía no hay nadie en el ranking de este formato.</p>}
        {datos && datos.filas.length > 0 && (
          <ol className="ranking">
            {datos.filas.map((f) => (
              <FilaRanking key={f.cuentaId} fila={f} propia={f.cuentaId === yo?.cuentaId} />
            ))}
          </ol>
        )}
        {yo && !yoEnLista && (
          <>
            <p className="nota-izq">Vos:</p>
            <ol className="ranking">
              <FilaRanking fila={yo} propia />
            </ol>
            {!yo.enRanking && (
              <p className="nota-izq">
                Llevás {yo.partidas} de {datos!.minimo} partidas para entrar al ranking.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  )
}

function FilaRanking({ fila, propia }: { fila: Fila; propia: boolean }) {
  return (
    <li className={`ranking-fila${propia ? ' propia' : ''}`}>
      <span className="ranking-posicion">{fila.posicion}</span>
      <span className="ranking-avatar">
        <Avatar codigo={fila.avatar} apodo={fila.apodo} />
      </span>
      <span className="ranking-apodo">
        {fila.apodo}
        <small>
          {fila.ganadas} ganadas de {fila.partidas}
        </small>
      </span>
      <strong className="ranking-puntos">{fila.puntos}</strong>
    </li>
  )
}
