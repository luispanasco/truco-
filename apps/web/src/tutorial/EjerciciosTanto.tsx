import { useState } from 'react'
import { nombreCarta } from '@truco/engine'
import { Carta } from '../componentes/Carta'
import { Muestra } from './Ejercicios'
import type { Azar } from './cartas'
import { explicarEnvido, explicarFlor, explicarTieneFlor, manoEnvido, manoFlor, manoTieneFlor, tieneFlorLa, type ManoTanto } from './manosTanto'

/**
 * Los ejercicios del envido y la flor: no se muestra el tanto, se carga. Cada ronda trae una mano
 * (y la muestra, si hay); si el número está mal, Don Queiroz hace la cuenta paso a paso.
 */
interface Props {
  alDecir: (texto: string) => void
  alListo: (errores: number) => void
  azar?: Azar
}

/** La mano, con la muestra al costado. */
function Mano({ mano }: { mano: ManoTanto }) {
  return (
    <div className="tutorial-mano-tanto">
      {mano.muestra && <Muestra carta={mano.muestra} />}
      <div className="tutorial-cartas" role="list" aria-label="Tu mano">
        {mano.mano.map((c) => (
          <span key={`${c.numero}-${c.palo}`} role="listitem" aria-label={`El ${nombreCarta(c)}`}>
            <Carta carta={c} tam="grande" />
          </span>
        ))}
      </div>
    </div>
  )
}

/** Las rondas: cuál va, la respuesta y los errores; "Otra" arma la mano siguiente. */
function useRondas(rondas: number, nueva: () => ManoTanto) {
  const [ronda, setRonda] = useState(0)
  const [mano, setMano] = useState(nueva)
  const [errores, setErrores] = useState(0)
  const otra = () => {
    setRonda((r) => r + 1)
    setMano(nueva())
  }
  return { ronda, mano, errores, setErrores, otra, ultima: ronda === rondas - 1 }
}

/** "Cargá el envido" (o la flor): se escribe el número con el teclado y se carga. */
export function Cargar({ que, rondas, conMuestra, alDecir, alListo, azar = Math.random }: Props & { que: 'envido' | 'flor'; rondas: number; conMuestra: boolean }) {
  const nueva = () => (que === 'envido' ? manoEnvido(azar, conMuestra) : manoFlor(azar, conMuestra))
  const { ronda, mano, errores, setErrores, otra, ultima } = useRondas(rondas, nueva)
  const [numero, setNumero] = useState('')
  const [cargado, setCargado] = useState<'bien' | 'mal' | null>(null)
  const { texto, total } = que === 'envido' ? explicarEnvido(mano) : explicarFlor(mano)
  const tocar = (d: string) => setNumero((n) => (n.length < 2 ? (n === '0' ? d : n + d) : n))
  const cargar = () => {
    const bien = Number(numero) === total
    const err = bien ? errores : errores + 1
    setErrores(err)
    setCargado(bien ? 'bien' : 'mal')
    alDecir(bien ? `¡Eso! ${total}. ${texto}` : `No, no son ${numero}. ${texto}`)
    if (ultima) alListo(err)
  }
  const siguiente = () => {
    otra()
    setNumero('')
    setCargado(null)
    alDecir(que === 'envido' ? '¿Y con esta? Cargá el envido.' : '¿Y esta flor? ¿Cuánto suma?')
  }
  return (
    <div className="tutorial-ejercicio">
      <p className="tutorial-ronda">
        {ronda + 1} de {rondas}
      </p>
      <Mano mano={mano} />
      <div className="tutorial-cargar">
        <output className={`tutorial-cargar-numero${cargado ? ` ${cargado}` : ''}`} aria-label={`Tu ${que}`} aria-live="off">
          {numero || '–'}
          {cargado === 'mal' && <small> era {total}</small>}
        </output>
        <div className="tutorial-teclado" role="group" aria-label="Teclado">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((d) => (
            <button key={d} type="button" className="boton boton-secundario" disabled={cargado !== null} onClick={() => tocar(d)}>
              {d}
            </button>
          ))}
          <button type="button" className="boton boton-secundario" aria-label="Borrar" disabled={cargado !== null || numero === ''} onClick={() => setNumero((n) => n.slice(0, -1))}>
            ⌫
          </button>
          <button type="button" className="boton tutorial-teclado-cargar" disabled={cargado !== null || numero === ''} onClick={cargar}>
            Cargar
          </button>
        </div>
      </div>
      {cargado !== null && !ultima && (
        <button type="button" className="boton" onClick={siguiente}>
          Otra
        </button>
      )}
    </div>
  )
}

/** "¿Tiene flor o no?": dos botones y la explicación. */
export function TieneFlor({ rondas, alDecir, alListo, azar = Math.random }: Props & { rondas: number }) {
  const { ronda, mano, errores, setErrores, otra, ultima } = useRondas(rondas, () => manoTieneFlor(azar))
  const [respuesta, setRespuesta] = useState<boolean | null>(null)
  const tiene = tieneFlorLa(mano)
  const responder = (r: boolean) => {
    setRespuesta(r)
    const err = r === tiene ? errores : errores + 1
    setErrores(err)
    alDecir(`${r === tiene ? '¡Bien!' : 'No…'} ${explicarTieneFlor(mano)}`)
    if (ultima) alListo(err)
  }
  const siguiente = () => {
    otra()
    setRespuesta(null)
    alDecir('¿Y esta? ¿Tiene flor?')
  }
  const clase = (r: boolean) => `boton ${respuesta !== null && r === tiene ? 'tutorial-opcion-bien' : 'boton-secundario'}`
  return (
    <div className="tutorial-ejercicio">
      <p className="tutorial-ronda">
        {ronda + 1} de {rondas}
      </p>
      <Mano mano={mano} />
      <div className="tutorial-si-no">
        <button type="button" className={clase(true)} disabled={respuesta !== null} onClick={() => responder(true)}>
          Tiene flor
        </button>
        <button type="button" className={clase(false)} disabled={respuesta !== null} onClick={() => responder(false)}>
          No tiene
        </button>
      </div>
      {respuesta !== null && !ultima && (
        <button type="button" className="boton" onClick={siguiente}>
          Otra
        </button>
      )}
    </div>
  )
}
