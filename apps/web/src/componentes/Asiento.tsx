import { avatarAlAzar, codificarAvatar, leerAvatar, type LugarPublico } from '@truco/shared'
import { GESTO, SIGNIFICADO } from '../senias'
import type { GestoActivo } from '../gestos'
import { Avatar as Dibujo } from './Avatar'
import { Carta } from './Carta'
import { AnilloReloj } from './Reloj'
import type { Globo } from '../estado'
import '../estilos-senias.css'
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
  /**
   * Arriba de todo: hacia dónde sale el chat. Al costado derecho, salvo que ahí hable otro
   * (en 3v3); si hablan los dos costados, abajo, debajo del canto.
   */
  ladoChat?: 'derecha' | 'izquierda' | 'abajo'
  /** El chat va debajo de sus cartas (arriba se toparía con el de enfrente y el marcador). */
  chatAbajo?: boolean
  /** Mesa de bustos: se lo ve de medio cuerpo, asomando detrás del paño. */
  busto?: boolean
}

/**
 * El código del avatar de un lugar. Los bots (y quien todavía tiene un emoji de los de
 * antes) no traen uno: se les arma uno con el apodo, siempre el mismo para el mismo apodo.
 */
export function avatarDeLugar(lugar: Pick<LugarPublico, 'avatar' | 'apodo'>): string {
  return lugar.avatar && leerAvatar(lugar.avatar) ? lugar.avatar : codificarAvatar(avatarAlAzar(lugar.apodo))
}

/**
 * El avatar del jugador, acercado a la cara (o de medio cuerpo, en la mesa de bustos).
 * Mientras hace una seña, el mismo avatar se agranda, se acerca más a la cara y hace el
 * gesto; después vuelve.
 */
export function Avatar({
  lugar,
  tam = 'normal',
  gesto,
  busto = false,
}: {
  lugar: LugarPublico
  tam?: 'normal' | 'chico'
  gesto?: GestoActivo
  busto?: boolean
}) {
  return (
    <div className={`avatar avatar-${busto ? 'busto' : tam}${gesto ? ' con-gesto' : ''}`} data-gesto={gesto?.gesto}>
      {/* La clave reinicia la animación con cada gesto (aunque se repita el mismo). */}
      <Dibujo
        key={gesto?.id ?? 'quieto'}
        codigo={avatarDeLugar(lugar)}
        apodo={lugar.apodo}
        gesto={gesto?.gesto}
        encuadre={busto ? 'busto' : 'cara'}
      />
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
  ladoChat = 'derecha',
  chatAbajo = false,
  busto = false,
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
  // A los costados: qué va arriba del avatar y qué debajo de las cartas (en orden, de la persona hacia afuera).
  const cercaArriba = globoCanto
  const cercaAbajo = globoCanto ? null : globoSenia
  const globoChat = (apilado: boolean) => (chat ? <GloboDeChat key={chat.id} globo={chat} apilado={apilado} /> : null)
  const pilaArriba = [cercaArriba, chatAbajo ? null : globoChat(!!cercaArriba)]
  const pilaAbajo = [cercaAbajo, chatAbajo ? globoChat(!!cercaAbajo) : null]
  return (
    <div
      className={`asiento pos-${posicion}${leToca ? ' le-toca' : ''}${conReloj ? ' con-reloj' : ''}${esCompaniero ? ' companiero' : ' rival'}${participa ? '' : ' fuera'}${desconectado ? ' desconectado' : ''}${globo || chat || gesto ? ' con-globo' : ''}${gesto ? ' con-gesto' : ''}`}
    >
      {arriba && ladoChat === 'abajo' && chat ? (
        // Hablan también los dos costados de arriba: el chat cuelga debajo del canto.
        <div className="asiento-globos abajo">
          {globoCanto ?? globoSenia}
          <GloboDeChat key={chat.id} globo={chat} apilado={!!(globoCanto ?? globoSenia)} />
        </div>
      ) : arriba ? (
        // Arriba de todo, el canto cuelga debajo de sus cartas y el chat sale al costado del avatar.
        <>
          {globoCanto ?? globoSenia}
          {chat && <GloboDeChat key={chat.id} globo={chat} lateral={ladoChat === 'izquierda' ? 'izquierda' : 'derecha'} />}
        </>
      ) : (
        <>
          {/* A los costados, canto y chat se apilan arriba del avatar: el canto, pegado a la persona. */}
          {(pilaArriba[0] || pilaArriba[1]) && (
            <div className="asiento-globos">
              {pilaArriba[0]}
              {pilaArriba[1]}
            </div>
          )}
          {/* Debajo de sus cartas: la seña y, en los costados de arriba del 3v3, el chat. */}
          {pilaAbajo[1] ? (
            <div className="asiento-globos abajo">
              {pilaAbajo[0]}
              {pilaAbajo[1]}
            </div>
          ) : (
            pilaAbajo[0]
          )}
        </>
      )}
      <div className="asiento-avatar">
        <Avatar lugar={lugar} gesto={gesto} busto={busto} />
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
