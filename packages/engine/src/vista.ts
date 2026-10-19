import { accionesValidas, esperandoA } from './acciones'
import type { Carta } from './cartas'
import type { ConfigSala } from './config'
import { esPieza } from './jerarquia'
import { equipoDe, esBotMandado, liderDe } from './reglas'
import { ORDENES_PRIVADAS } from './tipos'
import type {
  Accion,
  CartasMostradas,
  Enfrentamiento,
  Equipo,
  EstadoPartida,
  Evento,
  FlorCantada,
  Jugada,
  Jugador,
  ResultadoEnfrentamiento,
  Verificacion,
  Vuelta,
} from './tipos'

export interface VistaFlorCantada extends Omit<FlorCantada, 'tantoDeclarado'> {
  /** Se conoce recién cuando termina el enfrentamiento. */
  tantoDeclarado: number | null
}

/** Una carta jugada: null si no la podés ver (tapada, o pieza de otro duelo en el pica-pica). */
export interface VistaJugada extends Omit<Jugada, 'carta'> {
  carta: Carta | null
}

export interface VistaVuelta extends Omit<Vuelta, 'jugadas'> {
  jugadas: VistaJugada[]
}

export interface VistaEnfrentamiento extends Omit<Enfrentamiento, 'flor' | 'vueltas'> {
  flor: Omit<Enfrentamiento['flor'], 'cantadas'> & { cantadas: VistaFlorCantada[] }
  vueltas: VistaVuelta[]
  /** Quién lidera cada equipo (el pie); null en 1v1 y en el pica-pica. */
  lideres: [number | null, number | null]
}

export interface VistaPartida {
  yo: Jugador
  config: ConfigSala
  jugadores: (Jugador & { cartasEnMano: number })[]
  puntos: [number, number]
  ganador: Equipo | null
  mano: {
    numero: number
    reparte: number
    mano: number
    /** Quién tiene que cortar; mientras tanto no hay cartas ni muestra. */
    cortando: number | null
    muestra: Carta | null
    picaPica: boolean
    actual: number
    misCartas: Carta[]
    /** Si sos el pie de bots: sus cartas (las ves para decirles qué tirar). Nunca las de una persona. */
    misBots: { asiento: number; cartas: Carta[] }[]
    /** Tu tanto real; el de los demás no se muestra hasta la verificación. */
    miTanto: { envido: number; flor: number | null }
    enfrentamientos: VistaEnfrentamiento[]
    verificacion: Verificacion | null
  }
  esperandoA: number[]
  accionesValidas: Accion[]
}

/** Lo que el jugador puede ver: nunca cartas ajenas sin jugar ni el estado del generador. */
export function vistaPara(estado: EstadoPartida, jugadorId: string): VistaPartida {
  const yo = estado.jugadores.find((j) => j.id === jugadorId)
  if (!yo) throw new Error('Jugador desconocido')
  const { mano } = estado
  const tanto = mano.tantos[yo.asiento]!
  const cortando = mano.cortando !== null
  return structuredClone({
    yo,
    config: estado.config,
    jugadores: estado.jugadores.map((j) => ({ ...j, cartasEnMano: mano.cartas[j.asiento]?.length ?? 0 })),
    puntos: estado.puntos,
    ganador: estado.ganador,
    mano: {
      numero: mano.numero,
      reparte: mano.reparte,
      mano: mano.mano,
      cortando: mano.cortando,
      muestra: cortando ? null : mano.muestra,
      picaPica: mano.picaPica,
      actual: mano.actual,
      misCartas: mano.cartas[yo.asiento] ?? [],
      misBots: (() => {
        const e = mano.enfrentamientos[mano.actual]
        if (!e || cortando) return []
        return e.participantes
          .filter((x) => x !== yo.asiento && equipoDe(x) === yo.equipo && esBotMandado(estado, e, x) && liderDe(estado, e, yo.equipo) === yo.asiento)
          .map((x) => ({ asiento: x, cartas: mano.cartas[x] ?? [] }))
      })(),
      miTanto: { envido: tanto.envidoReal, flor: tanto.florReal },
      enfrentamientos: mano.enfrentamientos.map((e): VistaEnfrentamiento => {
        // En el pica-pica las piezas de los duelos ajenos van por abajo.
        const ajeno = mano.picaPica && !e.participantes.includes(yo.asiento)
        const oculta = (j: Jugada) => (j.tapada && j.asiento !== yo.asiento) || (ajeno && esPieza(j.carta, mano.muestra))
        return {
          ...e,
          vueltas: e.vueltas.map((v) => ({ ...v, jugadas: v.jugadas.map((j) => (oculta(j) ? { ...j, carta: null } : j)) })),
          flor: {
            ...e.flor,
            cantadas: e.flor.cantadas.map((f) => ({ ...f, tantoDeclarado: e.resultado || e.flor.ganador !== null ? f.tantoDeclarado : null })),
          },
          resultado: e.resultado && ajeno ? sinPiezas(e.resultado, mano.muestra) : e.resultado,
          lideres: [liderDe(estado, e, 0), liderDe(estado, e, 1)],
          // Lo que el pie le dice a alguien de qué carta tirar lo ven solo el pie y ese (lo de voz alta, todos).
          ordenes: e.ordenes.filter(
            (o) => !ORDENES_PRIVADAS.includes(o.que) || o.asiento === yo.asiento || liderDe(estado, e, equipoDe(o.asiento)) === yo.asiento,
          ),
        }
      }),
      verificacion: mano.verificacion,
    },
    esperandoA: esperandoA(estado),
    accionesValidas: accionesValidas(estado, jugadorId),
  })
}

/**
 * Los eventos que puede ver el asiento: las cartas tapadas y las piezas de otros duelos del
 * pica-pica llegan sin carta, y las cartas que se dan vuelta al final no muestran esas piezas.
 */
export function eventosPara(eventos: readonly Evento[], asiento: number): Evento[] {
  // Las órdenes del pie de qué carta tirar las ven solo el pie y el que la recibe.
  const ajena = (ev: Evento) => ev.tipo === 'orden' && ORDENES_PRIVADAS.includes(ev.que) && ev.asiento !== asiento && ev.a !== asiento
  return eventos.filter((ev) => !ajena(ev)).map((ev): Evento => {
    if (ev.tipo === 'cartaJugada') {
      const { ocultaPara, ...resto } = ev
      return ocultaPara?.includes(asiento) ? { ...resto, carta: null } : resto
    }
    if (ev.tipo === 'enfrentamientoTerminado' && ev.picaPica && !ev.participantes.includes(asiento)) {
      return { ...ev, resultado: sinPiezas(ev.resultado, ev.muestra) }
    }
    return ev
  })
}

function sinPiezas(r: ResultadoEnfrentamiento, muestra: Carta): ResultadoEnfrentamiento {
  const mostradas: CartasMostradas[] = r.mostradas
    .map((m) => ({ ...m, cartas: m.cartas.filter((c) => !esPieza(c, muestra)) }))
    .filter((m) => m.cartas.length > 0)
  return { ...r, mostradas }
}
