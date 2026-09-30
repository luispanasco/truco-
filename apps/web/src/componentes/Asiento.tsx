import type { LugarPublico } from '@truco/shared'
import { Carta } from './Carta'
import { AnilloReloj } from './Reloj'
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
  /** Solo online, si le toca: cuándo vence su turno (ms desde epoch). */
  venceEn?: number | null
  silenciado?: boolean
  /** Solo online y para personas: tocar el nombre abre su menú. */
  alTocarNombre?: () => void
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

export function Asiento({ lugar, posicion, cartasEnMano, esCompaniero, leToca, esMano, participa, globo, venceEn, silenciado, alTocarNombre }: Props) {
  // Una persona que se desconectó conserva el lugar; mientras tanto juega un bot por ella.
  const desconectado = lugar.tipo === 'humano' && !lugar.conectado
  const conReloj = leToca && venceEn != null
  const nombre = (
    <>
      <span className="asiento-apodo">{lugar.apodo}</span>
      {silenciado && (
        <span className="asiento-silenciado" title="Silenciado" aria-label="silenciado">
          🔇
        </span>
      )}
    </>
  )
  return (
    <div
      className={`asiento pos-${posicion}${leToca ? ' le-toca' : ''}${conReloj ? ' con-reloj' : ''}${esCompaniero ? ' companiero' : ' rival'}${participa ? '' : ' fuera'}${desconectado ? ' desconectado' : ''}`}
    >
      {globo && (
        <div key={globo.id} className="globo">
          {globo.texto}
        </div>
      )}
      <div className="asiento-avatar">
        <Avatar lugar={lugar} />
        {conReloj && <AnilloReloj venceEn={venceEn} />}
        {esMano && <MarcaMano />}
      </div>
      {alTocarNombre ? (
        <button type="button" className="asiento-nombre tocable" onClick={alTocarNombre} aria-label={`Opciones para ${lugar.apodo}`}>
          {nombre}
        </button>
      ) : (
        <div className="asiento-nombre">{nombre}</div>
      )}
      {desconectado && <span className="asiento-bot">juega un bot</span>}
      <div className="asiento-cartas">
        {Array.from({ length: cartasEnMano }, (_, i) => (
          <Carta key={i} oculta tam="chica" />
        ))}
      </div>
    </div>
  )
}
