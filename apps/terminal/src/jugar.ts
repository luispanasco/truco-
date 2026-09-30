/**
 * Cliente de terminal para jugar online contra el servidor.
 * Uso: pnpm jugar [--servidor ws://localhost:2567] [--apodo Luis] [--id <invitadoId>]
 *
 * Con --id se puede volver a una partida con el mismo ID de invitado.
 */
import { randomUUID } from 'node:crypto'
import { createInterface } from 'node:readline'
import { stdin, stdout } from 'node:process'
import { Client } from '@colyseus/sdk'
import { nombreCarta, type Evento, type Formato, type VistaPartida } from '@truco/engine'
import { GESTO, SENIAS, SIGNIFICADO, type Nivel, type Senia } from '@truco/bots'
import { SALAS, type InfoSala, type MensajeChat, type MensajesCliente, type MensajesServidor } from '@truco/shared'
import { describirAccion, describirEvento } from '@truco/shared'

function arg(nombre: string): string | undefined {
  const i = process.argv.indexOf(`--${nombre}`)
  return i >= 0 ? process.argv[i + 1] : undefined
}

// ── Lectura de líneas (funciona en la terminal y con entrada por pipe) ──
const rl = createInterface({ input: stdin })
const lineas: string[] = []
const esperandoLinea: ((l: string | null) => void)[] = []
let alEscribir: ((linea: string) => void) | null = null
let entradaCerrada = false
rl.on('line', (l) => {
  if (esperandoLinea.length > 0) esperandoLinea.shift()!(l)
  else if (alEscribir) alEscribir(l)
  else lineas.push(l)
})
rl.on('close', () => {
  entradaCerrada = true
  for (const r of esperandoLinea.splice(0)) r(null)
})
function preguntar(texto: string): Promise<string> {
  stdout.write(texto)
  if (lineas.length > 0) return Promise.resolve(lineas.shift()!)
  if (entradaCerrada) process.exit(0)
  return new Promise((r) => esperandoLinea.push((l) => (l === null ? process.exit(0) : r(l))))
}
async function elegir<T>(titulo: string, opciones: [string, T][]): Promise<T> {
  console.log(titulo)
  opciones.forEach(([t], i) => console.log(`  ${i + 1}. ${t}`))
  for (;;) {
    const r = opciones[Number(await preguntar('> ')) - 1]
    if (r) return r[1]
    console.log('Elegí uno de los números.')
  }
}

// ── Estado del cliente ──
let sala: InfoSala | null = null
let vista: VistaPartida | null = null
let opcionesMostradas = ''
let venceEn: number | null = null

const yo = () => sala?.yo ?? vista?.yo.asiento ?? -1
const nombre = (a: number) => {
  const l = sala?.lugares[a]
  const apodo = l?.apodo || `Jugador ${a + 1}`
  return a === yo() ? `${apodo} (vos)` : apodo
}
const enEquipos = () => (sala?.lugares.length ?? 2) > 2
const equipo = (e: 0 | 1) => (e === yo() % 2 ? (enEquipos() ? 'nosotros' : 'vos') : enEquipos() ? 'ellos' : nombre(1 - yo()))
/** "la ganamos", "la ganan ellos", "la ganás vos", "la gana Nami". */
const gana = (e: 0 | 1, objeto: string) => {
  if (e === yo() % 2) return enEquipos() ? `${objeto} ganamos nosotros` : `${objeto} ganás vos`
  return enEquipos() ? `${objeto} ganan ellos` : `${objeto} gana ${nombre(1 - yo())}`
}

const AYUDA = `
Comandos (en cualquier momento):
  <número>        elegir una de las opciones
  /c <texto>      chat general          /e <texto>   chat de equipo
  /s              ver señas             /s <número>  hacer una seña
  /mesa           volver a ver la mesa  /salir       salir
  iniciar         empezar la partida (anfitrión)
  bot             en la cola pública, jugar contra un bot`

async function main() {
  const servidor = arg('servidor') ?? 'ws://localhost:2567'
  const invitadoId = arg('id') ?? randomUUID()
  console.log('Truco uruguayo online')
  const apodo = arg('apodo') ?? ((await preguntar('Tu apodo: ')).trim() || 'Anónimo')

  const cliente = new Client(servidor)
  const modo = await elegir('¿Qué querés hacer?', [
    ['Crear una sala privada', 'crear'],
    ['Unirme a una sala con código', 'unirme'],
    ['Buscar partida 1v1 con desconocidos', 'cola'],
  ] as const)

  let room
  try {
    if (modo === 'crear') {
      const formato = await elegir<Formato>('Formato:', [
        ['1 contra 1', '1v1'],
        ['2 contra 2', '2v2'],
        ['3 contra 3', '3v3'],
      ])
      const nivelBots = await elegir<Nivel>('Nivel de los bots en los lugares vacíos:', [
        ['Fácil', 'facil'],
        ['Medio', 'medio'],
        ['Difícil', 'dificil'],
      ])
      room = await cliente.create(SALAS.privada, { invitadoId, apodo, config: { formato }, nivelBots })
    } else if (modo === 'unirme') {
      const codigo = (await preguntar('Código de la sala: ')).trim().toUpperCase()
      room = await cliente.joinById(codigo, { invitadoId, apodo })
    } else {
      room = await cliente.joinOrCreate(SALAS.publica, { invitadoId, apodo })
      console.log('Buscando rival... (si tarda, te ofrezco jugar contra un bot)')
    }
  } catch (e) {
    console.log(`No se pudo entrar: ${(e as Error).message}`)
    console.log(`¿Está el servidor prendido? (pnpm servidor) · ${servidor}`)
    process.exit(1)
  }
  console.log(`Tu ID de invitado: ${invitadoId}  (para volver: pnpm jugar --id ${invitadoId})`)
  console.log(AYUDA)

  const enviar = <K extends keyof MensajesCliente>(tipo: K, datos: MensajesCliente[K]) => room.send(tipo, datos)

  room.onMessage('*', (tipo: string | number, datos: unknown) => {
    const t = tipo as keyof MensajesServidor
    if (t === 'sala') alSala(datos as InfoSala)
    else if (t === 'eventos') {
      for (const ev of datos as Evento[]) {
        const txt = describirEvento(ev, nombre, equipo, gana)
        if (txt) console.log(txt)
      }
    } else if (t === 'vista') alVista(datos as VistaPartida)
    else if (t === 'turno') venceEn = (datos as MensajesServidor['turno']).venceEn
    else if (t === 'chat') {
      const m = datos as MensajeChat
      console.log(`  💬 [${m.canal}] ${m.de === yo() ? 'vos' : m.apodo}: ${m.texto}`)
    } else if (t === 'senia') {
      const s = datos as MensajesServidor['senia']
      console.log(`  👀 ${nombre(s.de)} te hace una seña: ${GESTO[s.senia].toLowerCase()} (${SIGNIFICADO[s.senia]})`)
    } else if (t === 'error') {
      console.log(`  ⚠ ${(datos as MensajesServidor['error']).motivo}`)
      // Se puede volver a elegir: se muestran de nuevo las opciones.
      opcionesMostradas = ''
      if (vista) alVista(vista)
    }
    else if (t === 'ofrecerBot') console.log('\nNo aparece nadie todavía. Escribí "bot" para jugar contra un bot, o seguí esperando.')
  })
  room.onLeave(() => {
    console.log('Saliste de la sala.')
    process.exit(0)
  })

  alEscribir = (linea) => {
    const l = linea.trim()
    if (l === '') return
    if (l === '/salir') void room.leave(true)
    else if (l === '/mesa') mostrarMesa(true)
    else if (l === '/ayuda') console.log(AYUDA)
    else if (l === 'iniciar') enviar('iniciar', {})
    else if (l === 'bot') enviar('jugarContraBot', {})
    else if (l.startsWith('/c ')) enviar('chat', { texto: l.slice(3), canal: 'general' })
    else if (l.startsWith('/e ')) enviar('chat', { texto: l.slice(3), canal: 'equipo' })
    else if (l === '/s') SENIAS.forEach((s, i) => console.log(`  ${i + 1}. ${GESTO[s]} → ${SIGNIFICADO[s]}`))
    else if (l.startsWith('/s ')) {
      const senia: Senia | undefined = SENIAS[Number(l.slice(3)) - 1]
      if (senia) {
        enviar('senia', { senia })
        console.log(`  (le hiciste la seña: ${GESTO[senia].toLowerCase()})`)
      } else console.log('  Esa seña no existe: /s para ver la lista')
    } else if (/^\d+$/.test(l)) {
      const accion = vista?.accionesValidas[Number(l) - 1]
      if (accion && vista?.esperandoA.includes(yo())) enviar('accion', { accion })
      else console.log('  Ahora no te toca, o ese número no es una opción.')
    } else console.log('  No entendí. /ayuda para ver los comandos.')
  }
  for (const l of lineas.splice(0)) alEscribir(l)
}

function alSala(nueva: InfoSala) {
  const antes = sala
  sala = nueva
  if (nueva.fase === 'esperando') {
    const cambio = JSON.stringify(antes?.lugares) !== JSON.stringify(nueva.lugares)
    if (!cambio && antes) return
    console.log('')
    if (nueva.codigo) console.log(`Sala ${nueva.codigo} · ${nueva.formato} · compartí el código para que se unan`)
    for (const l of nueva.lugares) {
      const quien = l.tipo === 'libre' ? '(libre)' : `${l.apodo}${l.asiento === nueva.yo ? ' (vos)' : ''}${l.anfitrion ? ' ★' : ''}`
      console.log(`  Lugar ${l.asiento + 1} · equipo ${(l.asiento % 2) + 1} · ${quien}`)
    }
    const soyAnfitrion = nueva.lugares[nueva.yo ?? -1]?.anfitrion
    if (!nueva.publica) {
      console.log(
        soyAnfitrion
          ? 'Escribí "iniciar" cuando estén todos (los lugares libres se llenan con bots).'
          : 'Esperando que el anfitrión (★) empiece.',
      )
    }
  } else if (antes && antes.fase !== nueva.fase && nueva.fase === 'jugando') {
    console.log('\n¡Empieza la partida!')
    console.log(nueva.lugares.map((l) => `${nombre(l.asiento)} [equipo ${(l.asiento % 2) + 1}]`).join(' · '))
  }
  for (const l of nueva.lugares) {
    const antesL = antes?.lugares[l.asiento]
    if (nueva.fase === 'jugando' && antesL && l.tipo === 'humano' && antesL.conectado !== l.conectado) {
      console.log(`  ${l.conectado ? '🔌 Volvió' : '📴 Se desconectó'} ${l.apodo}${l.conectado ? '' : ' (juega un bot por él)'}`)
    }
  }
}

function alVista(v: VistaPartida) {
  const nuevaMano = vista?.mano.numero !== v.mano.numero
  vista = v
  if (nuevaMano) mostrarMesa(false)
  if (v.ganador !== null) {
    console.log('Escribí /salir para terminar.')
    return
  }
  const meToca = v.esperandoA.includes(v.yo.asiento) && v.accionesValidas.length > 0
  const clave = JSON.stringify(v.accionesValidas) + v.mano.numero + JSON.stringify(v.mano.misCartas)
  if (!meToca) {
    opcionesMostradas = ''
    return
  }
  if (clave === opcionesMostradas) return
  opcionesMostradas = clave
  mostrarMesa(true)
  const segundos = venceEn ? Math.max(0, Math.round((venceEn - Date.now()) / 1000)) : null
  console.log(`\n  Te toca${segundos ? ` (${segundos} s)` : ''}:`)
  v.accionesValidas.forEach((a, i) => console.log(`    ${i + 1}. ${describirAccion(v, a)}`))
}

function mostrarMesa(breve: boolean) {
  const v = vista
  if (!v) return
  const e = v.mano.enfrentamientos[v.mano.actual]!
  const truco = e.truco.valor > 1 ? ` · la mano vale ${e.truco.valor}` : ''
  if (!breve) console.log(`  Puntos: ${equipo(0)} ${v.puntos[0]} · ${equipo(1)} ${v.puntos[1]}`)
  console.log(`  Muestra: ${nombreCarta(v.mano.muestra)}${truco}`)
  const flor = v.mano.miTanto.flor !== null ? ` · ¡tenés flor de ${v.mano.miTanto.flor}!` : ''
  console.log(`  Tus cartas: ${v.mano.misCartas.map(nombreCarta).join(', ') || '(ninguna)'} · envido ${v.mano.miTanto.envido}${flor}`)
}

main()
