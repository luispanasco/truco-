import type { LugarPublico } from '@truco/shared'
import { Carta } from './Carta'
import type { Globo } from '../estado'

interface Props {
  lugar: LugarPublico
  /** Posición en la mesa relativa a quien mira (0 = abajo, en sentido antihorario). */
  posicion: number
  cartasEnMano: number
  esCompaniero: boolean
  leToca: boolean
  esMano: boolean
  /** false en pica-pica si no juega el duelo actual. */
  participa: boolean
  globo?: Globo
}

export function Avatar({ lugar, tam = 'normal' }: { lugar: LugarPublico; tam?: 'normal' | 'chico' }) {
  const contenido = lugar.avatar ?? (lugar.tipo === 'bot' ? '🤖' : lugar.apodo.slice(0, 1).toUpperCase())
  return <div className={`avatar avatar-${tam}`}>{contenido}</div>
}

/** La "M" de mano, como ficha sobre el avatar. */
export function MarcaMano() {
  return (
    <span className="marca-mano" title="Es mano" aria-label="Es mano">
      M
    </span>
  )
}

export function Asiento({ lugar, posicion, cartasEnMano, esCompaniero, leToca, esMano, participa, globo }: Props) {
  return (
    <div
      className={`asiento pos-${posicion}${leToca ? ' le-toca' : ''}${esCompaniero ? ' companiero' : ' rival'}${participa ? '' : ' fuera'}`}
    >
      {globo && (
        <div key={globo.id} className="globo">
          {globo.texto}
        </div>
      )}
      <div className="asiento-avatar">
        <Avatar lugar={lugar} />
        {esMano && <MarcaMano />}
      </div>
      <div className="asiento-nombre">
        <span className="asiento-apodo">{lugar.apodo}</span>
        {lugar.tipo === 'humano' && !lugar.conectado && <span title="Desconectado"> 📴</span>}
      </div>
      <div className="asiento-cartas">
        {Array.from({ length: cartasEnMano }, (_, i) => (
          <Carta key={i} oculta tam="chica" />
        ))}
      </div>
    </div>
  )
}
