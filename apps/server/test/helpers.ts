import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { boot, type ColyseusTestServer } from '@colyseus/testing'
import { mismaCarta, siguienteAleatorio, type Carta, type VistaPartida } from '@truco/engine'
import type { InfoSala, MensajesCliente, MensajesServidor, OpcionesCrearSala, OpcionesUnirse } from '@truco/shared'
import { crearServidor, type OpcionesServidor } from '../src/servidor'
import type { SalaTruco } from '../src/SalaTruco'

/** Levanta un servidor de prueba. Cada archivo de tests usa su propio puerto, porque corren en paralelo. */
export async function levantar(
  puerto: number,
  op: OpcionesServidor = {},
): Promise<{ colyseus: ColyseusTestServer; dirDatos: string }> {
  const dirDatos = mkdtempSync(join(tmpdir(), 'truco-'))
  // Sin la pausa con la que un bot cumple una orden del pie (salvo que el test la pida), así las partidas no se alargan.
  const colyseus = await boot(crearServidor({ dirDatos, ...op, tiempos: { esperaOrdenMs: [0, 0], ...op.tiempos } }), puerto)
  return { colyseus, dirDatos }
}

type SdkRoom = Awaited<ReturnType<ColyseusTestServer['sdk']['joinById']>>

let contador = 0

/** Un jugador humano simulado: se conecta de verdad y guarda todo lo que recibe. */
export class Jugador {
  sala: InfoSala | null = null
  vista: VistaPartida | null = null
  vistas: VistaPartida[] = []
  recibidos: { tipo: keyof MensajesServidor; datos: unknown }[] = []
  private esperas: (() => void)[] = []
  private autoRng: number | null = null

  private constructor(
    readonly room: SdkRoom,
    readonly invitadoId: string,
  ) {
    room.onMessage('*', (tipo: string | number, datos: unknown) => {
      const t = tipo as keyof MensajesServidor
      this.recibidos.push({ tipo: t, datos })
      if (t === 'sala') this.sala = datos as InfoSala
      if (t === 'vista') {
        this.vista = datos as VistaPartida
        this.vistas.push(this.vista)
        this.jugarSiLeToca()
      }
      // Como un cliente real: si el servidor rechazó la jugada (por ejemplo, por el
      // límite de acciones por segundo), vuelve a intentar al rato.
      if (t === 'error' && this.autoRng !== null) setTimeout(() => this.jugarSiLeToca(), 150)
      for (const f of this.esperas.splice(0)) f()
    })
  }

  static nuevoId(): string {
    return `invitado-${++contador}-${Date.now()}`
  }

  static async crear(colyseus: ColyseusTestServer, opciones: Partial<OpcionesCrearSala> = {}, nombre = 'privada') {
    const invitadoId = opciones.invitadoId ?? Jugador.nuevoId()
    const room = await colyseus.sdk.create(nombre, { invitadoId, apodo: 'Anfitrión', ...opciones })
    return new Jugador(room, invitadoId)
  }

  static async unirse(
    colyseus: ColyseusTestServer,
    roomId: string,
    invitadoId = Jugador.nuevoId(),
    apodo = 'Invitado',
    opciones: Partial<OpcionesUnirse> = {},
  ) {
    const room = await colyseus.sdk.joinById(roomId, { invitadoId, apodo, ...opciones })
    return new Jugador(room, invitadoId)
  }

  static async cola(colyseus: ColyseusTestServer, opciones: Partial<OpcionesUnirse> = {}) {
    const invitadoId = Jugador.nuevoId()
    const room = await colyseus.sdk.joinOrCreate('publica', { invitadoId, apodo: 'Desconocido', ...opciones })
    return new Jugador(room, invitadoId)
  }

  enviar<K extends keyof MensajesCliente>(tipo: K, datos: MensajesCliente[K]) {
    this.room.send(tipo, datos)
  }

  de<K extends keyof MensajesServidor>(tipo: K): MensajesServidor[K][] {
    return this.recibidos.filter((m) => m.tipo === tipo).map((m) => m.datos as MensajesServidor[K])
  }

  /** Espera hasta que se cumpla la condición (se revisa con cada mensaje que llega). */
  async esperar(condicion: () => boolean, ms = 10_000, que = 'la condición'): Promise<void> {
    const limite = Date.now() + ms
    while (!condicion()) {
      const resto = limite - Date.now()
      if (resto <= 0) throw new Error(`Se esperó ${ms} ms por ${que}`)
      await new Promise<void>((resolve) => {
        const t = setTimeout(resolve, Math.min(resto, 200))
        this.esperas.push(() => {
          clearTimeout(t)
          resolve()
        })
      })
    }
  }

  /** Juega solo, al azar entre sus acciones válidas (casi nunca al mazo). */
  autoJugar(semilla = 1) {
    this.autoRng = semilla >>> 0
    this.jugarSiLeToca()
  }

  dejarDeJugar() {
    this.autoRng = null
  }

  private jugarSiLeToca() {
    const v = this.vista
    if (this.autoRng === null || !v || v.ganador !== null) return
    // Como pie de un bot: cuando le toca a él, le dice qué carta jugar.
    const e = v.mano.enfrentamientos[v.mano.actual]
    const bot = v.esperandoA.length === 1 && v.mano.misBots.some((b) => b.asiento === v.esperandoA[0]) ? v.esperandoA[0]! : null
    // Solo cuando le toca jugar (no si tiene que declarar o contestar) y todavía no le dijo nada.
    const leTocaJugar =
      bot !== null && e?.turno === bot && e.envido.estado !== 'declarando' && !e.truco.pendiente && e.flor.estado !== 'pendiente' && !e.ordenes.some((o) => o.asiento === bot)
    if (bot !== null && !leTocaJugar) return
    if (bot !== null) {
      const ordenes = v.accionesValidas.filter((a) => a.tipo === 'mandar' && a.a === bot && a.que !== 'tocar' && a.que !== 'gritar')
      if (ordenes.length === 0) return
      const [r, sig] = siguienteAleatorio(this.autoRng)
      this.autoRng = sig
      this.enviar('accion', { accion: ordenes[Math.floor(r * ordenes.length)]! })
      return
    }
    if (!v.esperandoA.includes(v.yo.asiento) || v.accionesValidas.length === 0) return
    // Las órdenes del pie se dan arriba, cuando le toca al bot: acá no (si no, se repetirían sin jugar).
    const sinMazo = v.accionesValidas.filter((a) => a.tipo !== 'irseAlMazo' && a.tipo !== 'mandar')
    const opciones = sinMazo.length > 0 ? sinMazo : v.accionesValidas
    const [r, sig] = siguienteAleatorio(this.autoRng)
    this.autoRng = sig
    this.enviar('accion', { accion: opciones[Math.floor(r * opciones.length)]! })
  }
}

export function salaEnServidor(colyseus: ColyseusTestServer, roomId: string): SalaTruco {
  return colyseus.getRoomById(roomId) as unknown as SalaTruco
}

function cartasDentro(x: unknown, out: Carta[] = []): Carta[] {
  if (Array.isArray(x)) for (const y of x) cartasDentro(y, out)
  else if (x !== null && typeof x === 'object') {
    const o = x as Record<string, unknown>
    if (typeof o.numero === 'number' && typeof o.palo === 'string') out.push(o as unknown as Carta)
    else for (const v of Object.values(o)) cartasDentro(v, out)
  }
  return out
}

/** Cartas de la vista que no son propias, ni la muestra, ni jugadas: deberían ser ninguna. */
export function cartasAjenasEnVista(v: VistaPartida): Carta[] {
  const publicas = [
    ...v.mano.misCartas,
    v.mano.muestra,
    ...v.mano.enfrentamientos.flatMap((e) => e.vueltas.flatMap((vu) => vu.jugadas.map((j) => j.carta))),
    // Las que se dieron vuelta al terminar (flor o envido ganado) son públicas.
    ...v.mano.enfrentamientos.flatMap((e) => e.resultado?.mostradas.flatMap((m) => m.cartas) ?? []),
    // Las de los bots que manda (si es su pie): las ve para decirles qué tirar.
    ...v.mano.misBots.flatMap((b) => b.cartas),
    // Y las que se tiraron al cantar la mesa.
    ...v.mano.enfrentamientos.flatMap((e) => Object.values(e.flor.mesa?.mostradas ?? {}).flat()),
  ]
  return cartasDentro(v).filter((c) => !publicas.some((p) => p !== null && mismaCarta(p, c)))
}

export const esperarMs = (ms: number) => new Promise((r) => setTimeout(r, ms))
