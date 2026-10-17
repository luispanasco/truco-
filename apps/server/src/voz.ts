import type { Client } from 'colyseus'
import {
  ICE_DEFAULT,
  MAX_EN_VOZ,
  MOTIVO_SIN_VOZ,
  type CandidatoIce,
  type EstadoVoz,
  type MensajesCliente,
  type ParticipanteVoz,
  type SenalVoz,
  type ServidorIce,
} from '@truco/shared'
import { LimiteFrecuencia } from './chat'

/**
 * Servidores ICE que se les pasan a los clientes. Por defecto, un STUN público
 * (`ICE_DEFAULT`); con `TRUCO_ICE_SERVERS` se reemplazan por una lista JSON de RTCIceServer.
 *
 * Para agregar un TURN (para redes que no dejan conectarse directo, como algunas de oficina o
 * de datos móviles), se levanta un coturn y se pone en el entorno, junto con el STUN:
 *
 *   TRUCO_ICE_SERVERS='[{"urls":"stun:stun.l.google.com:19302"},
 *     {"urls":["turn:turn.ejemplo.uy:3478?transport=udp","turns:turn.ejemplo.uy:5349"],
 *      "username":"truco","credential":"la-clave"}]'
 *
 * Con un usuario y clave fijos, cualquiera que abra la app los ve: alcanza para empezar. Más
 * adelante conviene credenciales que vencen (el `use-auth-secret` de coturn), armadas acá
 * para cada cliente.
 */
export function servidoresIceDelEntorno(env: Record<string, string | undefined> = process.env): ServidorIce[] {
  const crudo = env.TRUCO_ICE_SERVERS
  if (!crudo) return ICE_DEFAULT
  try {
    const lista = JSON.parse(crudo) as unknown
    if (!Array.isArray(lista)) throw new Error('no es una lista')
    const validos = lista.filter(esServidorIce)
    if (validos.length === 0) throw new Error('ningún servidor sirve')
    return validos.map((s) => ({
      urls: s.urls,
      ...(typeof s.username === 'string' ? { username: s.username } : {}),
      ...(typeof s.credential === 'string' ? { credential: s.credential } : {}),
    }))
  } catch (e) {
    console.error(`TRUCO_ICE_SERVERS no se pudo leer (${e instanceof Error ? e.message : e}); se usa el STUN público`)
    return ICE_DEFAULT
  }
}

/**
 * Los servidores ICE de ahora: los del entorno, o los del TURN de Cloudflare cuando está
 * configurado (ver `prenderTurnCloudflare`). Cada sala los lee al avisar quién está en la voz.
 */
let iceActual: ServidorIce[] | null = null

export function servidoresIceActuales(): ServidorIce[] {
  return iceActual ?? servidoresIceDelEntorno()
}

/** Cada cuánto se piden credenciales nuevas al TURN de Cloudflare (duran el doble). */
const RENOVAR_TURN_MS = 12 * 60 * 60 * 1000

/**
 * TURN de Cloudflare (Realtime → TURN Server en el panel de Cloudflare; 1000 GB por mes gratis):
 * con `TRUCO_TURN_ID` y `TRUCO_TURN_TOKEN` el servidor pide credenciales que vencen a las 24 h
 * y las renueva cada 12 h. Así la voz anda aunque la red no deje conectarse directo (datos
 * móviles, redes de oficina, Wi-Fi que aísla a los dispositivos). Devuelve si quedó prendido.
 */
export async function prenderTurnCloudflare(
  env: Record<string, string | undefined> = process.env,
  pedir: typeof fetch = fetch,
): Promise<boolean> {
  const id = env.TRUCO_TURN_ID
  const token = env.TRUCO_TURN_TOKEN
  if (!id || !token) return false
  const renovar = async () => {
    try {
      const r = await pedir(`https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(id)}/credentials/generate-ice-servers`, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ ttl: 2 * RENOVAR_TURN_MS / 1000 }),
      })
      if (!r.ok) throw new Error(`respondió ${r.status}`)
      const { iceServers } = (await r.json()) as { iceServers?: unknown }
      const lista = (Array.isArray(iceServers) ? iceServers : [iceServers]).filter(esServidorIce).map((s) => ({
        // Cloudflare también ofrece el puerto 53, que los navegadores bloquean y solo demora.
        urls: (Array.isArray(s.urls) ? s.urls : [s.urls]).filter((u) => !/:53(\?|$)/.test(u)),
        ...(typeof s.username === 'string' ? { username: s.username } : {}),
        ...(typeof s.credential === 'string' ? { credential: s.credential } : {}),
      }))
      if (lista.length === 0) throw new Error('no vino ningún servidor')
      iceActual = lista
      return true
    } catch (e) {
      console.error(`No se pudieron pedir credenciales al TURN de Cloudflare (${e instanceof Error ? e.message : e}); la voz sigue con STUN`)
      return false
    }
  }
  const ok = await renovar()
  setInterval(() => void renovar(), RENOVAR_TURN_MS).unref()
  return ok
}

/** Solo para tests: vuelve a los servidores del entorno. */
export function olvidarTurnParaTests() {
  iceActual = null
}

function esServidorIce(x: unknown): x is ServidorIce {
  if (!x || typeof x !== 'object') return false
  const urls = (x as { urls?: unknown }).urls
  const esUrl = (u: unknown) => typeof u === 'string' && /^(stuns?|turns?):/.test(u)
  return esUrl(urls) || (Array.isArray(urls) && urls.length > 0 && urls.every(esUrl))
}

/** Topes de lo que se reenvía: una descripción de audio sola anda por los 2 a 4 KB. */
const LARGO_MAX_SDP = 20_000
const LARGO_MAX_CANDIDATO = 1_000

/** La señal con solo lo que corresponde, o null si no sirve. */
export function validarSenal(x: unknown): SenalVoz | null {
  if (!x || typeof x !== 'object') return null
  const s = x as Record<string, unknown>
  if (s.tipo === 'oferta' || s.tipo === 'respuesta') {
    return typeof s.sdp === 'string' && s.sdp.length > 0 && s.sdp.length <= LARGO_MAX_SDP ? { tipo: s.tipo, sdp: s.sdp } : null
  }
  if (s.tipo !== 'candidato') return null
  if (s.candidato === null) return { tipo: 'candidato', candidato: null }
  const c = s.candidato as Partial<Record<keyof CandidatoIce, unknown>> | undefined
  if (!c || typeof c !== 'object' || typeof c.candidate !== 'string' || c.candidate.length > LARGO_MAX_CANDIDATO) return null
  return {
    tipo: 'candidato',
    candidato: {
      candidate: c.candidate,
      sdpMid: typeof c.sdpMid === 'string' ? c.sdpMid.slice(0, 64) : null,
      sdpMLineIndex: typeof c.sdpMLineIndex === 'number' && Number.isInteger(c.sdpMLineIndex) ? c.sdpMLineIndex : null,
    },
  }
}

/** Lo que el chat de voz necesita saber de la sala. */
export interface AccesoSala {
  /** Si la sala tiene chat de voz (privada y con la opción prendida). */
  activa(): boolean
  /** El asiento de la persona conectada con esa sesión, o null si no tiene lugar. */
  asientoDe(sessionId: string): number | null
  clientes(): Iterable<Client>
}

/**
 * El chat de voz de una sala: quién lo activó y el reenvío de la señalización. El audio no
 * pasa nunca por acá; va directo entre los navegadores.
 */
export class VozDeSala {
  /** Por sesión: su número en la voz. */
  private participantes = new Map<string, number>()
  private siguienteId = 1
  private limitesVoz = new Map<string, LimiteFrecuencia>()
  private limitesSenal = new Map<string, LimiteFrecuencia>()

  constructor(
    private readonly sala: AccesoSala,
    /** Fijos (para tests); si no, los de ahora (`servidoresIceActuales`). */
    private readonly iceFijos: ServidorIce[] | null = null,
  ) {}

  get servidoresIce(): ServidorIce[] {
    return this.iceFijos ?? servidoresIceActuales()
  }

  /** Entrar o salir de la voz. Devuelve el motivo si se rechaza. */
  cambiar(client: Client, { activa }: MensajesCliente['voz']): string | null {
    if (!limitar(this.limitesVoz, client, 6, 10_000)) return 'Esperá un poco antes de volver a cambiar la voz'
    if (activa !== true) {
      this.salir(client)
      return null
    }
    if (!this.sala.activa()) return MOTIVO_SIN_VOZ
    if (this.sala.asientoDe(client.sessionId) === null) return 'Para hablar tenés que estar en la mesa'
    if (!this.participantes.has(client.sessionId) && this.participantes.size >= MAX_EN_VOZ) {
      return `En la voz ya hay ${MAX_EN_VOZ} personas`
    }
    // Al volver a entrar (por ejemplo, después de reconectarse) se le da un número nuevo: los
    // demás arman la conexión con él de cero.
    this.participantes.set(client.sessionId, this.siguienteId++)
    this.difundir()
    return null
  }

  /** Se fue, se le cortó la conexión o salió de la voz: los demás cierran la conexión con él. */
  salir(client: Client) {
    if (this.participantes.delete(client.sessionId)) this.difundir()
  }

  /** Reenvía la señal solo al destinatario, si los dos están en la voz. Devuelve el motivo si se rechaza. */
  reenviar(client: Client, { a, senal }: MensajesCliente['senalVoz']): string | null {
    // Al armar cada conexión van varios candidatos seguidos; con 5 personas más, bastantes.
    if (!limitar(this.limitesSenal, client, 150, 10_000)) return 'Demasiadas señales de voz seguidas'
    if (!this.sala.activa()) return MOTIVO_SIN_VOZ
    const de = this.participantes.get(client.sessionId)
    if (de === undefined || this.sala.asientoDe(client.sessionId) === null) return 'Primero activá la voz'
    const destino = [...this.participantes].find(([, id]) => id === a)?.[0]
    const cliente = destino !== undefined && this.sala.asientoDe(destino) !== null ? buscar(this.sala.clientes(), destino) : undefined
    if (!cliente || destino === client.sessionId) return 'Esa persona no está en la voz'
    const limpia = validarSenal(senal)
    if (!limpia) return 'Señal de voz inválida'
    cliente.send('senalVoz', { de, senal: limpia })
    return null
  }

  /** Les cuenta a todos quién está en la voz (con los asientos de ahora: pueden cambiar en la espera). */
  difundir() {
    // Si la sala dejó de tener voz o alguien ya no tiene lugar, sale de la voz.
    for (const sessionId of [...this.participantes.keys()]) {
      if (!this.sala.activa() || this.sala.asientoDe(sessionId) === null) this.participantes.delete(sessionId)
    }
    const participantes: ParticipanteVoz[] = [...this.participantes].map(([sessionId, id]) => ({ id, asiento: this.sala.asientoDe(sessionId)! }))
    for (const client of this.sala.clientes()) {
      const estado: EstadoVoz = {
        activa: this.sala.activa(),
        yo: this.participantes.get(client.sessionId) ?? null,
        participantes,
        servidoresIce: this.servidoresIce,
      }
      client.send('voz', estado)
    }
  }

  /** Solo para tests: los números en la voz, por sesión. */
  participantesParaTests(): ReadonlyMap<string, number> {
    return this.participantes
  }
}

function buscar(clientes: Iterable<Client>, sessionId: string): Client | undefined {
  for (const c of clientes) if (c.sessionId === sessionId) return c
  return undefined
}

function limitar(mapa: Map<string, LimiteFrecuencia>, client: Client, maximo: number, ventanaMs: number): boolean {
  let l = mapa.get(client.sessionId)
  if (!l) mapa.set(client.sessionId, (l = new LimiteFrecuencia(maximo, ventanaMs)))
  return l.permitir()
}
