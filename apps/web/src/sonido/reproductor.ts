/**
 * Reproductor de sonidos cortos con Web Audio: los archivos se bajan y decodifican una vez y
 * después suenan sin demora. Los navegadores no dejan sonar nada hasta que la persona toca la
 * página, así que hasta `desbloquear()` (que se llama desde un toque) no suena nada.
 */

/** Más de estos a la vez ya es ruido: el que sobra no suena. */
const MAXIMO_A_LA_VEZ = 4
/** El mismo archivo dos veces en menos de esto suena una sola (dos cartas que llegan juntas). */
const SEPARACION_MINIMA_MS = 60

export interface OpcionesReproductor {
  /** Crea el contexto de audio (en los tests, uno de mentira). null si el navegador no tiene. */
  crearContexto?: () => AudioContext | null
  /** Baja un archivo. */
  bajar?: (url: string) => Promise<ArrayBuffer>
  ahora?: () => number
}

function contextoDelNavegador(): AudioContext | null {
  const Clase =
    typeof window === 'undefined'
      ? undefined
      : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
  return Clase ? new Clase() : null
}

async function bajarConFetch(url: string): Promise<ArrayBuffer> {
  const r = await fetch(url)
  if (!r.ok) throw new Error(`No se pudo bajar ${url}`)
  return r.arrayBuffer()
}

export class Reproductor {
  private contexto: AudioContext | null = null
  private buffers = new Map<string, Promise<AudioBuffer | null>>()
  private ultimaVez = new Map<string, number>()
  private sonando = 0
  private readonly crearContexto: () => AudioContext | null
  private readonly bajar: (url: string) => Promise<ArrayBuffer>
  private readonly ahora: () => number

  constructor(opciones: OpcionesReproductor = {}) {
    this.crearContexto = opciones.crearContexto ?? contextoDelNavegador
    this.bajar = opciones.bajar ?? bajarConFetch
    this.ahora = opciones.ahora ?? (() => performance.now())
  }

  get desbloqueado(): boolean {
    return this.contexto !== null
  }

  /** Llamar desde un toque o una tecla: crea (o despierta) el contexto de audio. */
  desbloquear(): void {
    try {
      this.contexto ??= this.crearContexto()
      if (this.contexto?.state === 'suspended') void this.contexto.resume()
    } catch {
      this.contexto = null
    }
  }

  /** Baja y decodifica de antemano, para que el primer sonido no llegue tarde. */
  precargar(urls: readonly string[]): void {
    for (const url of urls) void this.buffer(url)
  }

  private buffer(url: string): Promise<AudioBuffer | null> {
    const contexto = this.contexto
    if (!contexto) return Promise.resolve(null)
    let b = this.buffers.get(url)
    if (!b) {
      b = this.bajar(url)
        .then((datos) => contexto.decodeAudioData(datos))
        .catch(() => {
          // Si falla (sin red, formato que el navegador no lee), se puede volver a intentar.
          this.buffers.delete(url)
          return null
        })
      this.buffers.set(url, b)
    }
    return b
  }

  /**
   * Hace sonar un archivo (con `retrasoMs` de espera). Devuelve si se va a reproducir: no
   * suena si no está desbloqueado, con volumen 0, o si el mismo archivo acaba de sonar.
   */
  reproducir(url: string, volumen: number, retrasoMs = 0): boolean {
    return this.serie([url], volumen, retrasoMs)
  }

  /** Varios archivos uno atrás del otro (por ejemplo "Envido va primero" y "Real envido"). */
  serie(urls: readonly string[], volumen: number, retrasoMs = 0): boolean {
    const contexto = this.contexto
    if (!contexto || volumen <= 0 || urls.length === 0) return false
    const ahora = this.ahora() + retrasoMs
    const primero = urls[0]!
    if (ahora - (this.ultimaVez.get(primero) ?? -Infinity) < SEPARACION_MINIMA_MS) return false
    this.ultimaVez.set(primero, ahora)
    void Promise.all(urls.map((u) => this.buffer(u))).then((buffers) => {
      if (this.sonando >= MAXIMO_A_LA_VEZ) return
      let cuando = contexto.currentTime + retrasoMs / 1000
      for (const b of buffers) {
        if (!b) continue
        const fuente = contexto.createBufferSource()
        const ganancia = contexto.createGain()
        fuente.buffer = b
        ganancia.gain.value = volumen
        fuente.connect(ganancia).connect(contexto.destination)
        this.sonando++
        fuente.onended = () => {
          this.sonando--
        }
        fuente.start(cuando)
        cuando += b.duration
      }
    })
    return true
  }
}
