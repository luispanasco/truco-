import { accionesValidas, esperandoA } from './acciones'
import type { Carta } from './cartas'
import type { ConfigSala } from './config'
import type { Accion, Enfrentamiento, Equipo, EstadoPartida, FlorCantada, Jugador, Verificacion } from './tipos'

export interface VistaFlorCantada extends Omit<FlorCantada, 'tantoDeclarado'> {
  /** Se conoce recién cuando termina el enfrentamiento. */
  tantoDeclarado: number | null
}

export interface VistaEnfrentamiento extends Omit<Enfrentamiento, 'flor'> {
  flor: Omit<Enfrentamiento['flor'], 'cantadas'> & { cantadas: VistaFlorCantada[] }
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
    muestra: Carta
    picaPica: boolean
    actual: number
    misCartas: Carta[]
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
      muestra: mano.muestra,
      picaPica: mano.picaPica,
      actual: mano.actual,
      misCartas: mano.cartas[yo.asiento] ?? [],
      miTanto: { envido: tanto.envidoReal, flor: tanto.florReal },
      enfrentamientos: mano.enfrentamientos.map(
        (e): VistaEnfrentamiento => ({
          ...e,
          flor: {
            ...e.flor,
            cantadas: e.flor.cantadas.map((f) => ({ ...f, tantoDeclarado: e.resultado ? f.tantoDeclarado : null })),
          },
        }),
      ),
      verificacion: mano.verificacion,
    },
    esperandoA: esperandoA(estado),
    accionesValidas: accionesValidas(estado, jugadorId),
  })
}
