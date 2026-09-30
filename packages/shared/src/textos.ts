import { nombreCarta, type Accion, type Evento, type VistaPartida } from '@truco/engine'

export const TEXTO_CANTO: Record<string, string> = {
  truco: 'Truco',
  retruco: 'Quiero retruco',
  valeCuatro: 'Quiero vale cuatro',
  envido: 'Envido',
  realEnvido: 'Real envido',
  faltaEnvido: 'Falta envido',
  flor: 'Flor',
  contraflor: 'Contraflor',
  contraflorAlResto: 'Contraflor al resto',
}

export function describirAccion(vista: VistaPartida, a: Accion): string {
  switch (a.tipo) {
    case 'jugarCarta':
      return `Jugar el ${nombreCarta(a.carta)}`
    case 'cantarTruco': {
      const tr = vista.mano.enfrentamientos[vista.mano.actual]!.truco
      const nivel = (tr.pendiente?.nivel ?? tr.valor) + 1
      return nivel === 2 ? 'Truco' : nivel === 3 ? 'Quiero retruco' : 'Quiero vale cuatro'
    }
    case 'cantarEnvido':
    case 'cantarFlor':
      return TEXTO_CANTO[a.canto]!
    case 'responder':
      return a.respuesta === 'quiero' ? 'Quiero' : 'No quiero'
    case 'declararTanto':
      return a.tanto === 'sonBuenas' ? 'Son buenas' : `Decir mi tanto: ${a.tanto}`
    case 'irseAlMazo':
      return 'Irse al mazo'
    case 'pedirVer':
      return 'Pedir ver los tantos'
    case 'noPedirVer':
      return 'No pedir ver'
  }
}

/**
 * Texto de un evento de la mesa. `nombre` da el apodo de cada asiento, `equipo` el
 * nombre corto de cada equipo y `gana(e, verbo)` arma la frase ("la ganamos", "la ganan ellos").
 */
export function describirEvento(
  ev: Evento,
  nombre: (asiento: number) => string,
  equipo: (e: 0 | 1) => string,
  gana: (e: 0 | 1, objeto: string) => string,
): string | null {
  switch (ev.tipo) {
    case 'manoRepartida':
      return `\n━━━━━━━━ Mano ${ev.numero}${ev.picaPica ? ' · pica-pica' : ''} · muestra: ${nombreCarta(ev.muestra)} · es mano ${nombre(ev.mano)} ━━━━━━━━`
    case 'enfrentamientoIniciado':
      return ev.indice > 0 ? `\n── Duelo ${ev.indice + 1}: ${ev.participantes.map(nombre).join(' contra ')} ──` : null
    case 'cartaJugada':
      return `  ${nombre(ev.asiento)} juega el ${nombreCarta(ev.carta)}`
    case 'vueltaTerminada':
      return `  → Vuelta ${ev.indice + 1}: ${ev.resultado === 'parda' ? 'parda' : gana(ev.resultado, 'la')}`
    case 'cantoTruco':
    case 'cantoFlor':
      return `  ${nombre(ev.asiento)}: ¡${TEXTO_CANTO[ev.canto]}!`
    case 'cantoEnvido':
      return `  ${nombre(ev.asiento)}: ${ev.primeroEstaElEnvido ? 'Primero está el envido. ' : ''}¡${TEXTO_CANTO[ev.canto]}!`
    case 'respuesta':
      return `  ${nombre(ev.asiento)}: ${ev.respuesta === 'quiero' ? 'Quiero' : 'No quiero'}`
    case 'tantoDeclarado':
      return `  ${nombre(ev.asiento)}: ${ev.tanto === null ? 'Son buenas' : ev.tanto}`
    case 'envidoResuelto':
      return `  → El envido ${gana(ev.ganador, 'lo')}`
    case 'envidoAnulado':
      return '  → Con flor, el envido queda anulado'
    case 'alMazo':
      return `  ${nombre(ev.asiento)} se va al mazo`
    case 'enfrentamientoTerminado': {
      const r = ev.resultado
      const tanto = r.puntosTanto.some((p) => p > 0)
        ? ` · tanto: ${equipo(0)} ${r.puntosTanto[0]}, ${equipo(1)} ${r.puntosTanto[1]}`
        : ''
      const lineas = [`  ✔ Truco: ${r.puntosTruco} ${r.puntosTruco === 1 ? 'punto' : 'puntos'}, ${gana(r.ganador, 'los')}${tanto}`]
      for (const t of r.revelados) {
        lineas.push(`    ${nombre(t.asiento)} tenía ${t.flor !== null ? `flor de ${t.flor}` : `${t.envido} de envido`}`)
      }
      return lineas.join('\n')
    }
    case 'puntos':
      return `  Puntos: ${equipo(0)} ${ev.puntos[0]} · ${equipo(1)} ${ev.puntos[1]}`
    case 'partidaTerminada':
      return `\n🏆 ¡Partida terminada! ${mayuscula(gana(ev.ganador, 'la'))} (${equipo(0)} ${ev.puntos[0]}, ${equipo(1)} ${ev.puntos[1]}).`
    default:
      return null
  }
}

const mayuscula = (t: string) => t.charAt(0).toUpperCase() + t.slice(1)
