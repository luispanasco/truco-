import type { LugarPublico } from '@truco/shared'
import { GESTO, SIGNIFICADO } from '../senias'
import { Cara, type GestoActivo } from './Cara'
import { Carta } from './Carta'
import { AnilloReloj } from './Reloj'
import type { Globo } from '../estado'
import { GloboDeChat, type GloboChat } from './GlobosChat'

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
  /** Último mensaje de chat que mandó, mientras se ve. */
  chat?: GloboChat
  /** El asiento de enfrente, arriba de todo: el chat le sale al costado del avatar. */
  arriba?: boolean
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

export function Asiento({
  lugar,
  posicion,
  cartasEnMano,
  esCompaniero,
  leToca,
  esMano,
  participa,
  globo,
  venceEn,
  silenciado,
  alTocarNombre,
  gesto,
  chat,
  arriba = false,
}: Props) {
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
  const globoCanto = globo ? (
    <div key={globo.id} className="globo">
      {globo.texto}
    </div>
  ) : null
  const globoSenia = gesto ? <GloboSenia key={gesto.id} gesto={gesto} esCompaniero={esCompaniero} /> : null
  return (
    <div
      className={`asiento pos-${posicion}${leToca ? ' le-toca' : ''}${conReloj ? ' con-reloj' : ''}${esCompaniero ? ' companiero' : ' rival'}${participa ? '' : ' fuera'}${desconectado ? ' desconectado' : ''}${globo || chat ? ' con-globo' : ''}`}
    >
      {arriba ? (
        // Arriba de todo, el canto cuelga debajo de sus cartas y el chat sale al costado del avatar.
        <>
          {globoCanto ?? globoSenia}
          {chat && <GloboDeChat key={chat.id} globo={chat} lateral />}
        </>
      ) : (
        <>
          {/* A los costados, canto y chat se apilan arriba del avatar: el canto, pegado a la persona. */}
          {(globoCanto || chat) && (
            <div className="asiento-globos">
              {globoCanto}
              {chat && <GloboDeChat key={chat.id} globo={chat} apilado={!!globoCanto} />}
            </div>
          )}
          {!globoCanto && globoSenia}
        </>
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
