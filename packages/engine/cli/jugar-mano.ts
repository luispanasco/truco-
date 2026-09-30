/**
 * Jugá una mano de truco 1v1 en la terminal contra un rival que elige al azar.
 * Uso: pnpm cli [semilla]
 */
import { createInterface } from 'node:readline'
import { stdin, stdout } from 'node:process'
import {
  accionesValidas,
  apply,
  crearPartida,
  enfrentamientoActual,
  esperandoA,
  nombreCarta,
  siguienteAleatorio,
  vistaPara,
  type Accion,
  type EstadoPartida,
  type Evento,
} from '../src'

const YO = 'vos'
const RIVAL = 'rival'
const NOMBRES = ['Vos', 'Rival']

const TEXTO_CANTO: Record<string, string> = {
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

function describirAccion(estado: EstadoPartida, a: Accion): string {
  switch (a.tipo) {
    case 'jugarCarta':
      return `Jugar el ${nombreCarta(a.carta)}`
    case 'cantarTruco': {
      const tr = enfrentamientoActual(estado).truco
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

function describirEvento(ev: Evento): string | null {
  const quien = (asiento: number) => NOMBRES[asiento]!
  switch (ev.tipo) {
    case 'cartaJugada':
      return `${quien(ev.asiento)}: ${nombreCarta(ev.carta)}`
    case 'vueltaTerminada':
      return `  → Vuelta ${ev.indice + 1}: ${ev.resultado === 'parda' ? 'parda' : `gana ${NOMBRES[ev.resultado]}`}`
    case 'cantoTruco':
    case 'cantoFlor':
      return `${quien(ev.asiento)}: ¡${TEXTO_CANTO[ev.canto]}!`
    case 'cantoEnvido':
      return `${quien(ev.asiento)}: ${ev.primeroEstaElEnvido ? 'Primero está el envido. ' : ''}¡${TEXTO_CANTO[ev.canto]}!`
    case 'respuesta':
      return `${quien(ev.asiento)}: ${ev.respuesta === 'quiero' ? 'Quiero' : 'No quiero'}`
    case 'tantoDeclarado':
      return `${quien(ev.asiento)}: ${ev.tanto === null ? 'Son buenas' : ev.tanto}`
    case 'envidoResuelto':
      return `  → El envido es para ${NOMBRES[ev.ganador]}`
    case 'envidoAnulado':
      return '  → Con flor, el envido queda anulado'
    case 'alMazo':
      return `${quien(ev.asiento)} se va al mazo`
    case 'enfrentamientoTerminado': {
      const r = ev.resultado
      const tanto = r.puntosTanto.some((p) => p > 0)
        ? `; tanto: Vos ${r.puntosTanto[0]}, Rival ${r.puntosTanto[1]}`
        : ''
      const revelados = r.revelados.map((t) => `${quien(t.asiento)} tenía ${t.flor !== null ? `flor de ${t.flor}` : t.envido}`)
      return [
        `\nFin de la mano: ${NOMBRES[r.ganador]} gana ${r.puntosTruco} de truco${tanto}.`,
        ...revelados.map((x) => `  ${x}`),
      ].join('\n')
    }
    case 'partidaTerminada':
      return `\n¡Partida terminada! Gana ${NOMBRES[ev.ganador]}.`
    default:
      return null
  }
}

function mostrarMesa(estado: EstadoPartida) {
  const v = vistaPara(estado, YO)
  const e = v.mano.enfrentamientos[v.mano.actual]!
  const truco = e.truco.valor > 1 ? ` · la mano vale ${e.truco.valor}` : ''
  console.log(`\nMuestra: ${nombreCarta(v.mano.muestra)}${truco}`)
  const flor = v.mano.miTanto.flor !== null ? ` · ¡tenés flor de ${v.mano.miTanto.flor}!` : ''
  console.log(`Tus cartas: ${v.mano.misCartas.map(nombreCarta).join(', ')} · tu envido: ${v.mano.miTanto.envido}${flor}`)
}

async function main() {
  const semilla = Number(process.argv[2] ?? Date.now()) >>> 0
  let estado = crearPartida({
    jugadores: [
      { id: YO, nombre: 'Vos' },
      { id: RIVAL, nombre: 'Rival' },
    ],
    semilla,
    reparte: Math.random() < 0.5 ? 0 : 1,
  })
  // Cola de líneas: funciona igual en la terminal y con la entrada por pipe.
  const rl = createInterface({ input: stdin })
  const lineas: string[] = []
  const esperandoLinea: ((l: string | null) => void)[] = []
  let cerrado = false
  rl.on('line', (l) => (esperandoLinea.length > 0 ? esperandoLinea.shift()!(l) : lineas.push(l)))
  rl.on('close', () => {
    cerrado = true
    for (const r of esperandoLinea.splice(0)) r(null)
  })
  const preguntar = (texto: string): Promise<string | null> => {
    stdout.write(texto)
    if (lineas.length > 0) return Promise.resolve(lineas.shift()!)
    if (cerrado) return Promise.resolve(null)
    return new Promise((r) => esperandoLinea.push(r))
  }
  let rng = semilla ^ 0x9e3779b9

  console.log(`Truco uruguayo · semilla ${semilla}`)
  console.log(estado.mano.mano === 0 ? 'Sos mano.' : 'Es mano el rival.')
  mostrarMesa(estado)

  const numeroMano = estado.mano.numero
  while (estado.ganador === null && estado.mano.numero === numeroMano) {
    const esperando = esperandoA(estado)
    let accion: Accion
    if (esperando.includes(0)) {
      const opciones = accionesValidas(estado, YO)
      console.log('')
      opciones.forEach((a, i) => console.log(`  ${i + 1}. ${describirAccion(estado, a)}`))
      const txt = await preguntar('¿Qué hacés? ')
      if (txt === null) break
      const elegida = opciones[Number(txt) - 1]
      if (!elegida) {
        console.log('Elegí uno de los números.')
        continue
      }
      accion = elegida
    } else {
      const opciones = accionesValidas(estado, RIVAL).filter((a) => a.tipo !== 'irseAlMazo')
      let r: number
      ;[r, rng] = siguienteAleatorio(rng)
      accion = opciones[Math.floor(r * opciones.length)] ?? { tipo: 'irseAlMazo', jugador: RIVAL }
    }
    const res = apply(estado, accion)
    if (!res.ok) {
      console.log(`No se puede: ${res.motivo}`)
      continue
    }
    estado = res.estado
    for (const ev of res.eventos) {
      if (ev.tipo === 'manoRepartida') break
      const txt = describirEvento(ev)
      if (txt) console.log(txt)
    }
    if (estado.mano.numero === numeroMano && res.eventos.some((ev) => ev.tipo === 'vueltaTerminada')) {
      mostrarMesa(estado)
    }
  }
  console.log(`\nPuntos: Vos ${estado.puntos[0]} · Rival ${estado.puntos[1]}`)
  rl.close()
}

main()
