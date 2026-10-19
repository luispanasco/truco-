import { enfrentamientoActual, floresPorCantar, florSinCantarDelEquipo, validar } from './apply'
import { equipoDe, equipoQueCanto, liderDe, otroEquipo, pendienteActual, siguienteDeclarante, siguienteEnMesa } from './reglas'
import type { Accion, CantoEnvido, CantoFlor, EstadoPartida, QueManda, TipoCorte } from './tipos'

const CANTOS_ENVIDO: CantoEnvido[] = ['envido', 'realEnvido', 'faltaEnvido']
const CANTOS_FLOR: CantoFlor[] = ['flor', 'contraflor', 'contraflorAlResto']
const CORTES: TipoCorte[] = ['convencional', 'sacarMuestra', 'darAlMano']
const ORDENES: QueManda[] = ['tocar', 'gritar']

/**
 * Acciones que el jugador puede hacer ahora. Sirve para mostrar solo los botones
 * permitidos y para que los bots elijan. En modo sucio, declarar un tanto distinto
 * al real también es válido aunque no aparezca en esta lista.
 */
export function accionesValidas(estado: EstadoPartida, jugadorId: string): Accion[] {
  const jugador = estado.jugadores.find((j) => j.id === jugadorId)
  if (!jugador || estado.ganador !== null) return []
  const jugadorAccion = { jugador: jugadorId }
  const misCartas = estado.mano.cartas[jugador.asiento] ?? []
  const companieros = estado.jugadores.filter((j) => j.equipo === jugador.equipo && j.asiento !== jugador.asiento)
  const candidatas: Accion[] = [
    ...CORTES.map((corte) => ({ tipo: 'cortar' as const, ...jugadorAccion, corte })),
    { tipo: 'responder', ...jugadorAccion, respuesta: 'quiero' },
    { tipo: 'responder', ...jugadorAccion, respuesta: 'noQuiero' },
    { tipo: 'responder', ...jugadorAccion, respuesta: 'quiero', cantaLaMesa: true },
    ...misCartas.map((carta) => ({ tipo: 'mostrarFlor' as const, ...jugadorAccion, carta })),
    { tipo: 'declararTanto', ...jugadorAccion, tanto: estado.mano.tantos[jugador.asiento]?.envidoReal ?? 0 },
    { tipo: 'declararTanto', ...jugadorAccion, tanto: 'sonBuenas' },
    { tipo: 'pedirVer', ...jugadorAccion },
    { tipo: 'noPedirVer', ...jugadorAccion },
    ...misCartas.map((carta) => ({ tipo: 'jugarCarta' as const, ...jugadorAccion, carta })),
    ...misCartas.map((carta) => ({ tipo: 'jugarCarta' as const, ...jugadorAccion, carta, tapada: true })),
    ...CANTOS_FLOR.map((canto) => ({ tipo: 'cantarFlor' as const, ...jugadorAccion, canto })),
    { tipo: 'cantarFlor', ...jugadorAccion, canto: 'flor', yTruco: true },
    ...companieros.flatMap((c) => ORDENES.map((que) => ({ tipo: 'mandar' as const, ...jugadorAccion, a: c.asiento, que }))),
    ...CANTOS_ENVIDO.map((canto) => ({ tipo: 'cantarEnvido' as const, ...jugadorAccion, canto })),
    { tipo: 'cantarTruco', ...jugadorAccion },
    { tipo: 'irseAlMazo', ...jugadorAccion },
  ]
  return candidatas.filter((acc) => validar(estado, acc) === null)
}

/**
 * Asientos de quienes el juego está esperando: el que tiene el turno, el equipo que
 * tiene que responder un canto, el que tiene que declarar, el que tiene que cantar la flor o los
 * que pueden pedir ver.
 * Irse al mazo o cantar la flor se puede también fuera de esta lista.
 */
export function esperandoA(estado: EstadoPartida): number[] {
  if (estado.ganador !== null) return []
  if (estado.mano.cortando !== null) return [estado.mano.cortando]
  const e = enfrentamientoActual(estado)
  const v = estado.mano.verificacion
  if (v) return e.participantes.filter((a) => v.pendientes.includes(equipoDe(a)))
  const enMesa = siguienteEnMesa(e)
  if (enMesa !== null) return [enMesa]
  const porCantar = floresPorCantar(estado, e)
  if (porCantar.length > 0) return [porCantar[0]!]
  const pend = pendienteActual(e)
  if (pend === 'declaracion') {
    const sig = siguienteDeclarante(e)
    return sig === null ? [] : [sig]
  }
  if (pend) {
    const responde = otroEquipo(equipoQueCanto(e, pend))
    // A la contraflor contesta solo el que tiene flor (en orden desde el mano); los demás esperan.
    if (pend === 'flor') {
      return e.participantes.filter((a) => equipoDe(a) === responde && !e.retirados.includes(a) && e.flor.cantadas.some((f) => f.asiento === a))
    }
    // Al envido no lo contesta el equipo: lo anula el que tiene flor, cantándola.
    const conFlor = pend === 'envido' ? florSinCantarDelEquipo(estado, e, responde) : []
    if (conFlor.length > 0) return conFlor
    // Con "toques y gritos del pie", al truco y al envido contesta el pie.
    const lider = liderDe(estado, e, responde)
    if (estado.config.toquesYGritos === 'pie' && lider !== null) return [lider]
    return e.participantes.filter((a) => equipoDe(a) === responde && !e.retirados.includes(a))
  }
  return e.turno === null ? [] : [e.turno]
}
