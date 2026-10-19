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
      return a.tapada ? `Pasar (el ${nombreCarta(a.carta)} va tapado)` : `Jugar el ${nombreCarta(a.carta)}`
    case 'cantarTruco': {
      const tr = vista.mano.enfrentamientos[vista.mano.actual]!.truco
      const nivel = (tr.pendiente?.nivel ?? tr.valor) + 1
      return nivel === 2 ? 'Truco' : nivel === 3 ? 'Quiero retruco' : 'Quiero vale cuatro'
    }
    case 'cantarEnvido': {
      // Contra un truco sin contestar, el envido se juega primero.
      const e = vista.mano.enfrentamientos[vista.mano.actual]!
      const primero = e.envido.estado === 'libre' && e.truco.pendiente !== null
      return primero ? `${TEXTO_CANTO[a.canto]} va primero` : TEXTO_CANTO[a.canto]!
    }
    case 'cantarFlor':
      return a.yTruco ? 'Flor y truco' : TEXTO_CANTO[a.canto]!
    case 'responder': {
      // A la contraflor se contesta "con flor quiero" o "con flor me achico".
      const e = vista.mano.enfrentamientos[vista.mano.actual]!
      if (a.cantaLaMesa) return 'Quiero, ¡canta la mesa!'
      if (e.flor.estado === 'pendiente') return a.respuesta === 'quiero' ? 'Con flor quiero' : 'Con flor me achico'
      return a.respuesta === 'quiero' ? 'Quiero' : 'No quiero'
    }
    case 'declararTanto':
      return a.tanto === 'sonBuenas' ? 'Son buenas' : `Decir mi tanto: ${a.tanto}`
    case 'irseAlMazo':
      return 'Irse al mazo'
    case 'pedirVer':
      return 'Pedir ver los tantos'
    case 'noPedirVer':
      return 'No pedir ver'
    case 'mandar':
      return a.que === 'tocar' ? 'Mandar a tocar' : 'Mandar a gritar'
    case 'cortar':
      return TEXTO_CORTE[a.corte]
    case 'mostrarFlor':
      return `Tirar el ${nombreCarta(a.carta)}`
  }
}

export const TEXTO_CORTE = {
  convencional: 'Cortar',
  sacarMuestra: 'Sacar la muestra',
  darAlMano: 'Se la doy al mano',
} as const

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
      if (ev.tapada) return `  ${nombre(ev.asiento)} pasa${ev.carta ? ` (el ${nombreCarta(ev.carta)}, tapado)` : ''}`
      return `  ${nombre(ev.asiento)} juega ${ev.carta ? `el ${nombreCarta(ev.carta)}` : 'una carta por abajo'}`
    case 'vueltaTerminada':
      return `  → Vuelta ${ev.indice + 1}: ${ev.resultado === 'parda' ? 'parda' : gana(ev.resultado, 'la')}`
    case 'cantoTruco':
      return `  ${nombre(ev.asiento)}: ¡${TEXTO_CANTO[ev.canto]}!`
    case 'cantoFlor':
      // "Flor y truco": el truco viene en el evento siguiente.
      return ev.yTruco ? `  ${nombre(ev.asiento)}: ¡Flor y truco!` : `  ${nombre(ev.asiento)}: ¡${TEXTO_CANTO[ev.canto]}!`
    case 'cantoEnvido':
      return `  ${nombre(ev.asiento)}: ${ev.primeroEstaElEnvido ? 'Envido va primero. ' : ''}¡${TEXTO_CANTO[ev.canto]}!`
    case 'respuesta':
      if (ev.cantaLaMesa) return `  ${nombre(ev.asiento)}: Quiero, ¡canta la mesa!`
      if (ev.a === 'flor') return `  ${nombre(ev.asiento)}: ${ev.respuesta === 'quiero' ? 'Con flor quiero' : 'Con flor me achico'}`
      return `  ${nombre(ev.asiento)}: ${ev.respuesta === 'quiero' ? 'Quiero' : 'No quiero'}`
    case 'tantoDeclarado':
      return `  ${nombre(ev.asiento)}: ${ev.tanto === null ? 'Son buenas' : ev.tanto}`
    case 'envidoResuelto':
      return `  → El envido ${gana(ev.ganador, 'lo')}`
    case 'florMostrada':
      return `  ${nombre(ev.asiento)} tira el ${nombreCarta(ev.carta)}: ${ev.suma}`
    case 'florResuelta': {
      const tantos = ev.tantos.map((t) => `${nombre(t.asiento)} ${t.tanto < 0 ? 'sin flor' : t.tanto}`).join(', ')
      return `  → ${tantos}. La ${ev.alResto ? 'contraflor al resto' : 'contraflor'} ${gana(ev.ganador, 'la')}`
    }
    case 'envidoAnulado':
      return '  → Con flor, el envido queda anulado'
    case 'alMazo':
      return `  ${nombre(ev.asiento)} se va al mazo${ev.solo ? ' (el equipo sigue)' : ''}`
    case 'orden':
      return `  ${nombre(ev.asiento)} manda a ${nombre(ev.a)} a ${ev.que === 'tocar' ? 'tocar' : 'gritar'}`
    case 'esperandoCorte':
      return `
━━━━━━━━ Mano ${ev.numero} · corta ${nombre(ev.asiento)} ━━━━━━━━`
    case 'corte':
      return `  ${nombre(ev.asiento)}: ${TEXTO_CORTE[ev.corte]}`
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
