import { useState } from 'react'
import { type Accion, type QueManda, type VistaPartida } from '@truco/engine'
import { TEXTO_ORDEN } from '@truco/shared'

type Mandar = Extract<Accion, { tipo: 'mandar' }>

interface Props {
  vista: VistaPartida
  apodo: (asiento: number) => string
  alElegir: (a: Accion) => void
  /** Después de elegir algo (el panel se cierra). */
  alCerrar?: () => void
  /** El compañero bot que espera que le digas qué jugar (se muestra primero y resaltado). */
  esperando?: number | null
}

/** El orden de los botones de cada compañero (los de "vamos a" van aparte). */
/** Los botones de cada compañero en dos filas: qué carta juega, y lo que se dice en voz alta. */
const FILA_CARTA: QueManda[] = ['dejala', 'matala', 'jugaAlgo', 'callado']
const FILA_VOZ: QueManda[] = ['veni', 'tocar', 'gritar']

/** Si sos el pie del duelo en curso: a quiénes les podés decir algo y qué. */
export function opcionesDelPie(vista: VistaPartida) {
  const yo = vista.yo.asiento
  const e = vista.mano.enfrentamientos[vista.mano.actual]!
  if (vista.ganador !== null || vista.mano.cortando !== null || e.lideres[yo % 2] !== yo || e.fin) return null
  const mandar = vista.accionesValidas.filter((a): a is Mandar => a.tipo === 'mandar')
  const companieros = e.participantes.filter((a) => mandar.some((m) => m.a === a))
  return { mandar, companieros }
}

/**
 * El botón "Pie", chico, junto a "Mazo": abre lo que les decís a tus compañeros. No ocupa una fila:
 * así nunca empuja ni tapa los cantos. Marcado cuando tu bot espera que le digas qué jugar.
 */
export function BotonPie({
  vista,
  abierto,
  alCambiar,
  esperando = null,
}: {
  vista: VistaPartida
  abierto: boolean
  alCambiar: (abierto: boolean) => void
  esperando?: number | null
}) {
  const op = opcionesDelPie(vista)
  if (!op || op.companieros.length === 0) return null
  return (
    <button
      type="button"
      className={`boton-mazo boton-abrir-pie${abierto ? ' activo' : ''}${esperando !== null ? ' con-ordenes' : ''}`}
      aria-expanded={abierto}
      aria-label={esperando !== null ? 'Pie: tu bot espera que le digas qué jugar' : 'Lo que les decís como pie'}
      onClick={() => alCambiar(!abierto)}
    >
      Pie
    </button>
  )
}

/**
 * Lo del pie (2v2 y 3v3, fuera del pica-pica): a tus compañeros les decís "dejala" (la más baja),
 * "matala" (la más alta), "jugá algo" (la del medio), "vení", "vamos a X", "tocá" o "gritá". Sus
 * cartas no las ves. Tus bots no juegan hasta que les digas (salvo la flor); a una persona solo se
 * lo insinuás: decide ella. Flota sobre el borde del paño y se cierra al elegir.
 *
 * Para no tapar la mesa, muestra los botones de un compañero por vez, en dos filas (qué carta y
 * qué se dice). Con dos compañeros, arriba van sus nombres para cambiar de uno al otro; arranca
 * en el que espera tu orden.
 */
export function PanelPie({ vista, apodo, alElegir, alCerrar, esperando = null }: Props) {
  const op = opcionesDelPie(vista)
  const [elegido, setElegido] = useState<number | null>(null)
  if (!op || op.companieros.length === 0) return null
  const elegir = (a: Accion) => () => {
    alElegir(a)
    alCerrar?.()
  }
  const companieros = op.companieros
  const c = elegido !== null && companieros.includes(elegido) ? elegido : esperando !== null && companieros.includes(esperando) ? esperando : companieros[0]!
  const suyas = op.mandar.filter((m) => m.a === c)
  const de = (fila: QueManda[]) => fila.flatMap((que) => suyas.filter((m) => m.que === que))
  const vamos = suyas.filter((m) => m.que === 'vamosA')
  const boton = (m: Mandar) => (
    <button key={m.que} type="button" className={`boton-pie manda-${m.que}`} onClick={elegir(m)}>
      {TEXTO_ORDEN[m.que]('')}
    </button>
  )
  return (
    <div className="panel-pie" role="group" aria-label="Lo que les decís como pie">
      {companieros.length > 1 ? (
        <div className="pie-pestanias" role="tablist" aria-label="A quién le decís">
          {companieros.map((x) => (
            <button
              key={x}
              type="button"
              role="tab"
              aria-selected={x === c}
              className={`pie-pestania${x === c ? ' elegida' : ''}${x === esperando ? ' espera' : ''}`}
              onClick={() => setElegido(x)}
            >
              {apodo(x)}
              {x === esperando && <span className="pie-espera"> · ¿qué juega?</span>}
            </button>
          ))}
        </div>
      ) : (
        c === esperando && <span className="pie-nombre espera">¿Qué juega?</span>
      )}
      <div className={`pie-companiero${c === esperando ? ' espera' : ''}`} role="group" aria-label={`A ${apodo(c)}`}>
        <span className="pie-botones">{de(FILA_CARTA).map(boton)}</span>
        <span className="pie-botones">
          {de(FILA_VOZ).map(boton)}
          {vamos.map((m) => (
            <button key={`vamos-${m.vamosA}`} type="button" className="boton-pie manda-vamosA" onClick={elegir(m)}>
              {TEXTO_ORDEN.vamosA(apodo(m.vamosA!))}
            </button>
          ))}
        </span>
      </div>
    </div>
  )
}

/** Pasar en la tercera: prendido, la próxima carta que tocás va tapada. */
export function BotonPasar({ vista, activo, alCambiar }: { vista: VistaPartida; activo: boolean; alCambiar: (activo: boolean) => void }) {
  const puede = vista.accionesValidas.some((a) => a.tipo === 'jugarCarta' && a.tapada === true)
  if (!puede) return null
  return (
    <button
      type="button"
      className={`boton-mazo boton-pasar${activo ? ' activo' : ''}`}
      aria-pressed={activo}
      onClick={() => alCambiar(!activo)}
      title="La carta que toques va tapada y no gana la vuelta"
    >
      {activo ? 'Elegí cuál pasás' : 'Pasar'}
    </button>
  )
}
