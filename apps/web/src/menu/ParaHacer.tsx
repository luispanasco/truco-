import { useEffect, useState } from 'react'
import { paraCobrar, type DestinoMision, type MisionDeLista } from '@truco/shared'
import { useCuenta } from '../cuenta/cuenta'
import { cargarMisiones, cobrarMision, useMisiones } from '../cuenta/misiones'

/** Cuántas de las de una vez se muestran a la vez (las demás aparecen cuando cobrás). */
const DE_UNA_VEZ_A_LA_VISTA = 2

/** "en 5 h", "en 40 min". */
function enCuanto(iso: string, ahora = Date.now()): string {
  const min = Math.max(1, Math.round((Date.parse(iso) - ahora) / 60_000))
  return min < 60 ? `en ${min} min` : `en ${Math.round(min / 60)} h`
}

/**
 * "Para hacer": las misiones que dan monedas. Arriba, los primeros pasos (de una vez: las que ya
 * cumpliste primero); abajo, las tres del día. Cada una con su avance y "Cobrar" (si la cumpliste)
 * o "Ir" (lleva a donde se hace). Sin cuenta, invita a entrar.
 */
export function ParaHacer({ alIr, alEntrar }: { alIr: (destino: DestinoMision) => void; alEntrar: () => void }) {
  const adentro = useCuenta((s) => s.estado === 'adentro')
  const estado = useMisiones((s) => s.estado)
  const [error, setError] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  useEffect(() => {
    if (!adentro) return
    cargarMisiones().then(
      () => setError(false),
      () => setError(true),
    )
  }, [adentro])

  if (!adentro) {
    return (
      <section className="tarjeta para-hacer para-hacer-afuera" aria-labelledby="para-hacer">
        <h2 id="para-hacer">Para hacer</h2>
        <p className="nota-izq">Con tu cuenta, cada día tenés misiones que dan monedas para la tienda.</p>
        <button type="button" className="boton boton-secundario" onClick={alEntrar}>
          Entrar a tu cuenta
        </button>
      </section>
    )
  }
  if (!estado) return error ? null : <section className="tarjeta para-hacer" aria-busy="true" aria-label="Para hacer" />

  // Las de una vez: primero las que ya cumpliste, y no más de dos a la vista.
  const deUnaVez = [...estado.deUnaVez].sort((a, b) => Number(paraCobrar(b)) - Number(paraCobrar(a))).slice(0, DE_UNA_VEZ_A_LA_VISTA)
  const cobrar = async (m: MisionDeLista) => {
    try {
      const premio = await cobrarMision(m.id)
      setAviso(`¡+${premio} monedas!`)
    } catch (e) {
      setAviso(e instanceof Error ? e.message : 'No se pudo cobrar')
    }
  }
  const fila = (m: MisionDeLista) => (
    <li key={m.id} className={`mision${m.cobrada ? ' cobrada' : paraCobrar(m) ? ' cumplida' : ''}`}>
      <span className="mision-texto">
        <span>{m.texto}</span>
        <span className="mision-avance" aria-hidden="true">
          <span style={{ width: `${(m.avance / m.meta) * 100}%` }} />
        </span>
        <small>
          {m.avance} de {m.meta} · 🪙 {m.premio}
        </small>
      </span>
      {m.cobrada ? (
        <span className="mision-hecha" aria-label="Cobrada">
          ✓
        </span>
      ) : paraCobrar(m) ? (
        <button type="button" className="boton mision-boton" aria-label={`Cobrar ${m.premio} monedas: ${m.texto}`} onClick={() => void cobrar(m)}>
          Cobrar
        </button>
      ) : (
        <button type="button" className="boton boton-secundario mision-boton" aria-label={`Ir: ${m.texto}`} onClick={() => alIr(m.ir)}>
          Ir
        </button>
      )}
    </li>
  )
  return (
    <section className="tarjeta para-hacer" aria-labelledby="para-hacer">
      <h2 id="para-hacer">Para hacer</h2>
      {deUnaVez.length > 0 && (
        <>
          <span className="para-hacer-grupo">Primeros pasos</span>
          <ul className="misiones">{deUnaVez.map(fila)}</ul>
        </>
      )}
      <span className="para-hacer-grupo">
        De hoy <small>· cambian {enCuanto(estado.cambian)}</small>
      </span>
      <ul className="misiones">{estado.delDia.map(fila)}</ul>
      {aviso && (
        <p className="nota-izq para-hacer-aviso" role="status">
          {aviso}
        </p>
      )}
    </section>
  )
}
