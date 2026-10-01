import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { boot, type ColyseusTestServer } from '@colyseus/testing'
import { mismaCarta, siguienteAleatorio, type Carta, type VistaPartida } from '@truco/engine'
import type { InfoSala, MensajesCliente, MensajesServidor, OpcionesCrearSala } from '@truco/shared'
import { crearServidor, type OpcionesServidor } from '../src/servidor'
import type { SalaTruco } from '../src/SalaTruco'

/** Levanta un servidor de prueba. Cada archivo de tests usa su propio puerto, porque corren en paralelo. */
export async function levantar(
  puerto: number,
  op: OpcionesServidor = {},
): Promise<{ colyseus: ColyseusTestServer; dirDatos: string }> {
  const dirDatos = mkdtempSync(join(tmpdir(), 'truco-'))
  const colyseus = await boot(crearServidor({ dirDatos, ...op }), puerto)
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

  static async unirse(colyseus: ColyseusTestServer, roomId: string, invitadoId = Jugador.nuevoId(), apodo = 'Invitado') {
    const room = await colyseus.sdk.joinById(roomId, { invitadoId, apodo })
    return new Jugador(room, invitadoId)
  }

  static async cola(colyseus: ColyseusTestServer) {
    const invitadoId = Jugador.nuevoId()
    const room = await colyseus.sdk.joinOrCreate('publica', { invitadoId, apodo: 'Desconocido' })
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

  private jugarSiLeToca() {
    const v = this.vista
    if (this.autoRng === null || !v || v.ganador !== null) return
    if (!v.esperandoA.includes(v.yo.asiento) || v.accionesValidas.length === 0) return
    const sinMazo = v.accionesValidas.filter((a) => a.tipo !== 'irseAlMazo')
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
  ]
  return cartasDentro(v).filter((c) => !publicas.some((p) => mismaCarta(p, c)))
}

export const esperarMs = (ms: number) => new Promise((r) => setTimeout(r, ms))
