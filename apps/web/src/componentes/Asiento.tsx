import type { LugarPublico } from '@truco/shared'
import { GESTO, SIGNIFICADO } from '../senias'
import { Cara, type GestoActivo } from './Cara'
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
  /** Seña que está haciendo (un compañero, o un rival al que se la pescaste). */
  gesto?: GestoActivo
}

/**
 * El ícono del jugador. Mientras hace una seña, el ícono le deja lugar a una cara que
 * hace el gesto (cejas que suben, guiño…) y después vuelve.
 */
export function Avatar({ lugar, tam = 'normal', gesto }: { lugar: LugarPublico; tam?: 'normal' | 'chico'; gesto?: GestoActivo }) {
  const contenido = lugar.avatar ?? (lugar.tipo === 'bot' ? '🤖' : lugar.apodo.slice(0, 1).toUpperCase())
  return (
    <div className={`avatar avatar-${tam}${gesto ? ' con-gesto' : ''}`}>
      {contenido}
      {gesto && (
        <span key={gesto.id} className="avatar-gesto" data-gesto={gesto.gesto}>
          <Cara gesto={gesto.gesto} />
        </span>
      )}
    </div>
  )
}

/**
 * El texto de apoyo de una seña, chiquito al lado del avatar (el gesto es lo principal).
 * Del compañero se ve qué anuncia; del rival, solo lo que la sala deja pescar.
 */
function GloboSenia({ gesto, esCompaniero }: { gesto: GestoActivo; esCompaniero: boolean }) {
  const g = gesto.gesto
  const titulo = g === 'disimulo' ? undefined : `${GESTO[g]}: ${SIGNIFICADO[g]}`
  return (
    <div className={`globo globo-senia${esCompaniero ? '' : ' pescada'}`} role="status" title={titulo}>
      <span aria-hidden="true">{esCompaniero ? '👀 ' : '🕵 '}</span>
      {g === 'disimulo' ? 'le hizo una seña a su compañero' : <b>{SIGNIFICADO[g]}</b>}
    </div>
  )
}

/** La "M" de mano, como ficha sobre el avatar. */
export function MarcaMano() {
  return (
    <span className="marca-mano" title="Es mano" aria-label="Es mano">
      M
    </span>
  )
}

export function Asiento({ lugar, posicion, cartasEnMano, esCompaniero, leToca, esMano, participa, globo, venceEn, silenciado, alTocarNombre, gesto }: Props) {
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
      {globo ? (
        <div key={globo.id} className="globo">
          {globo.texto}
        </div>
      ) : (
        gesto && <GloboSenia key={gesto.id} gesto={gesto} esCompaniero={esCompaniero} />
      )}
      <div className="asiento-avatar">
        <Avatar lugar={lugar} gesto={gesto} />
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
