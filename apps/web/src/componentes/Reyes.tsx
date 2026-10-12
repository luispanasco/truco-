import { useEffect } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { MensajesServidor } from '@truco/shared'
import { Carta } from './Carta'

/** Cuánto tarda en salir cada carta de la tirada. */
const PASO_S = 0.35

/**
 * La tirada de reyes antes de la primera partida: las cartas salen de a una, frente a cada
 * jugador, hasta el rey que reparte (y, con equipos, los que van juntos). Se cierra sola.
 */
export function TiradaDeReyes({
  reyes,
  alCerrar,
}: {
  reyes: MensajesServidor['reyes']
  alCerrar: () => void
}) {
  const apodo = (a: number) => reyes.apodos[a] ?? `Jugador ${a + 1}`
  const reducido = useReducedMotion()
  const duracion = (reducido ? 0 : reyes.tiradas.length * PASO_S) + 2.8
  useEffect(() => {
    const t = setTimeout(alCerrar, duracion * 1000)
    return () => clearTimeout(t)
  }, [alCerrar, duracion])
  const primero = reyes.tiradas.find((t) => t.carta.numero === 12)
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="reyes-titulo" onClick={alCerrar}>
      <div className="modal-caja reyes-caja" onClick={(ev) => ev.stopPropagation()}>
        <h2 id="reyes-titulo" className="modal-titulo">
          Tirando reyes
        </h2>
        <ol className="reyes-tiradas">
          {reyes.tiradas.map((t, i) => (
            <motion.li
              key={i}
              className={`reyes-tirada${t.carta.numero === 12 ? ' rey' : ''}`}
              initial={reducido ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * PASO_S, duration: 0.25 }}
            >
              <Carta carta={t.carta} tam="chica" />
              <span>{apodo(t.asiento)}</span>
            </motion.li>
          ))}
        </ol>
        <motion.p
          className="modal-texto"
          initial={reducido ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reyes.tiradas.length * PASO_S }}
        >
          {primero && <>Reparte {apodo(primero.asiento)}.</>}
          {reyes.equipos && <> Van juntos: {reyes.equipos.map(apodo).join(', ')}.</>}
        </motion.p>
        <div className="modal-botones">
          <button type="button" className="boton boton-grande" onClick={alCerrar}>
            Listo
          </button>
        </div>
      </div>
    </div>
  )
}
