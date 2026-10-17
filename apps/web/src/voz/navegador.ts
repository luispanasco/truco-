import { nivelDeRms, type EntornoVoz, type Medidor, type Reproductor } from './malla'

/** Si el navegador puede hacer chat de voz (WebRTC). Sin esto, el botón de la voz no aparece. */
export function hayVozEnElNavegador(): boolean {
  return typeof RTCPeerConnection !== 'undefined'
}

type ConstructorAudio = typeof AudioContext

/**
 * Lo de verdad: RTCPeerConnection, getUserMedia, un <audio> por persona y un AnalyserNode
 * para medir el nivel (el anillo de quien habla).
 */
export function crearEntornoNavegador(): EntornoVoz {
  let contexto: AudioContext | null = null
  const contextoAudio = (): AudioContext | null => {
    const Clase = (globalThis.AudioContext ?? (globalThis as { webkitAudioContext?: ConstructorAudio }).webkitAudioContext) as
      | ConstructorAudio
      | undefined
    if (!Clase) return null
    contexto ??= new Clase()
    // Se crea con el toque que activa la voz, así que el navegador lo deja sonar.
    if (contexto.state === 'suspended') void contexto.resume().catch(() => {})
    return contexto
  }
  // Se crea ya: el pedido del micrófono y la primera medición pueden llegar fuera del toque.
  contextoAudio()

  return {
    crearConexion: (config) => new RTCPeerConnection(config),

    async pedirMicrofono() {
      if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error('Sin micrófono'), { name: 'NotSupportedError' })
      return navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      })
    },

    reproducir(stream): Reproductor {
      // Va por un <audio> (no por WebAudio): en Chrome, el audio que llega por WebRTC no suena
      // si no está enganchado a un elemento.
      const audio = new Audio()
      audio.autoplay = true
      audio.srcObject = stream
      void audio.play().catch(() => {})
      return {
        silenciar: (s) => {
          audio.muted = s
        },
        cerrar: () => {
          audio.pause()
          audio.srcObject = null
        },
      }
    },

    medir(stream): Medidor | null {
      const ctx = contextoAudio()
      if (!ctx || stream.getAudioTracks().length === 0) return null
      try {
        const fuente = ctx.createMediaStreamSource(stream)
        const analizador = ctx.createAnalyser()
        analizador.fftSize = 512
        fuente.connect(analizador)
        const muestras = new Float32Array(analizador.fftSize)
        return {
          nivel: () => {
            analizador.getFloatTimeDomainData(muestras)
            let suma = 0
            for (const m of muestras) suma += m * m
            return nivelDeRms(Math.sqrt(suma / muestras.length))
          },
          soltar: () => fuente.disconnect(),
        }
      } catch {
        return null
      }
    },

    cerrar() {
      void contexto?.close().catch(() => {})
      contexto = null
    },
  }
}
