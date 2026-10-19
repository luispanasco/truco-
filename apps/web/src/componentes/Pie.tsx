import { mismaCarta, nombreCarta, type Accion, type QueManda, type VistaPartida } from '@truco/engine'
import { TEXTO_ORDEN } from '@truco/shared'
import { Carta } from './Carta'

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

/** El orden de los botones de cada compañero (los de "vamos a" y las cartas van aparte). */
const ORDEN_BOTONES: QueManda[] = ['dejala', 'matala', 'jugaAlgo', 'veni', 'tocar', 'gritar']

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
 * Lo del pie (2v2 y 3v3, fuera del pica-pica). A tus bots les mandás: tocás una de sus cartas
 * ("tirá el 3") o les decís "dejala" (la más baja), "matala" (la más alta), "jugá algo" (la del
 * medio), "vení", "vamos a X", "tocá" o "gritá"; no juegan hasta que les digas (salvo la flor). A
 * una persona solo se lo insinuás: decide ella. Flota sobre el borde del paño y se cierra al elegir.
 */
export function PanelPie({ vista, apodo, alElegir, alCerrar, esperando = null }: Props) {
  const op = opcionesDelPie(vista)
  if (!op || op.companieros.length === 0) return null
  const elegir = (a: Accion) => () => {
    alElegir(a)
    alCerrar?.()
  }
  // El que espera tu orden, primero.
  const companieros = [...op.companieros].sort((x, y) => Number(y === esperando) - Number(x === esperando))
  return (
    <div className="panel-pie" role="group" aria-label="Lo que les decís como pie">
      {companieros.map((c) => {
        const suyas = op.mandar.filter((m) => m.a === c)
        const bot = vista.mano.misBots.find((b) => b.asiento === c)
        const cartas = bot ? bot.cartas.filter((carta) => suyas.some((m) => m.que === 'carta' && m.carta && mismaCarta(m.carta, carta))) : []
        const botones = ORDEN_BOTONES.flatMap((que) => suyas.filter((m) => m.que === que))
        const vamos = suyas.filter((m) => m.que === 'vamosA')
        return (
          <div key={c} className={`pie-companiero${c === esperando ? ' espera' : ''}`}>
            <span className="pie-nombre">
              {c === esperando ? `${apodo(c)} espera: ¿qué juega?` : bot ? `A ${apodo(c)}` : `A ${apodo(c)} (se lo insinuás)`}
            </span>
            {cartas.length > 0 && (
              <span className="pie-cartas">
                {cartas.map((carta) => {
                  const a = suyas.find((m) => m.que === 'carta' && m.carta && mismaCarta(m.carta, carta))!
                  return (
                    <button key={`${carta.numero}${carta.palo}`} type="button" className="pie-carta" aria-label={`Tirá el ${nombreCarta(carta)}`} onClick={elegir(a)}>
                      <Carta carta={carta} tam="chica" />
                    </button>
                  )
                })}
              </span>
            )}
            <span className="pie-botones">
              {botones.map((m) => (
                <button key={m.que} type="button" className={`boton-pie manda-${m.que}`} onClick={elegir(m)}>
                  {TEXTO_ORDEN[m.que]('', '')}
                </button>
              ))}
              {vamos.map((m) => (
                <button key={`vamos-${m.vamosA}`} type="button" className="boton-pie manda-vamosA" onClick={elegir(m)}>
                  {TEXTO_ORDEN.vamosA('', apodo(m.vamosA!))}
                </button>
              ))}
            </span>
          </div>
        )
      })}
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
