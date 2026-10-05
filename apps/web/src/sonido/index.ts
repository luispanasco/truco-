import type { Evento } from '@truco/engine'
import { useAjustesSonido } from './ajustes'
import { Reproductor } from './reproductor'
import { packElegido, urlDeVoz, type CantoVoz, type PackVoces, PACKS_VOCES } from './voces'

/** Efectos de la mesa (public/sonidos, ver CREDITOS.md). Con varios archivos, se alternan. */
export const EFECTOS = {
  repartir: ['/sonidos/repartir.ogg'],
  carta: ['/sonidos/carta-1.ogg', '/sonidos/carta-2.ogg'],
  vuelta: ['/sonidos/vuelta.ogg'],
  punto: ['/sonidos/punto.ogg'],
} as const

export type Efecto = keyof typeof EFECTOS

/** El "tic" de cada fósforo que se suma, como quien los va poniendo; más de estos ya cansa. */
const TICS_MAXIMOS = 6
const ENTRE_TICS_MS = 110
/** El fin de vuelta llega junto con la última carta: suena después, para que se oigan los dos. */
const RETRASO_VUELTA_MS = 280

let reproductor = new Reproductor()
let packs: readonly PackVoces[] = PACKS_VOCES
const vueltas: Record<string, number> = {}

/** Para los tests: otro reproductor (de mentira) y otros packs. */
export function usarReproductor(r: Reproductor, otrosPacks: readonly PackVoces[] = PACKS_VOCES): void {
  reproductor = r
  packs = otrosPacks
}

export function hayVoces(): boolean {
  return packs.some((p) => Object.keys(p.archivos).length > 0)
}

export function sonarEfecto(efecto: Efecto, retrasoMs = 0): boolean {
  const { efectos, volumen } = useAjustesSonido.getState()
  if (!efectos) return false
  const archivos = EFECTOS[efecto]
  const i = vueltas[efecto] ?? 0
  vueltas[efecto] = (i + 1) % archivos.length
  return reproductor.reproducir(archivos[i]!, volumen, retrasoMs)
}

/** La voz de uno o más cantos seguidos, si el pack los tiene (si falta alguno, se saltea). */
export function sonarCanto(...cantos: CantoVoz[]): boolean {
  const { voz, volumen, pack: id } = useAjustesSonido.getState()
  const pack = voz ? packElegido(id, packs) : null
  if (!pack) return false
  const urls = cantos.map((c) => urlDeVoz(pack, c)).filter((u): u is string => u !== null)
  return reproductor.serie(urls, volumen)
}

/**
 * Lo que suena con cada evento de la mesa. `puntosAntes` es el tanteador antes del evento
 * (para saber cuántos fósforos se suman).
 */
export function sonarEvento(ev: Evento, puntosAntes: readonly [number, number] = [0, 0]): void {
  switch (ev.tipo) {
    case 'manoRepartida':
      sonarEfecto('repartir')
      break
    case 'cartaJugada':
      sonarEfecto('carta')
      break
    case 'vueltaTerminada':
      sonarEfecto('vuelta', RETRASO_VUELTA_MS)
      break
    case 'puntos': {
      const sumados = Math.max(0, ev.puntos[0] - puntosAntes[0]) + Math.max(0, ev.puntos[1] - puntosAntes[1])
      for (let i = 0; i < Math.min(sumados, TICS_MAXIMOS); i++) sonarEfecto('punto', i * ENTRE_TICS_MS)
      break
    }
    case 'cantoTruco':
    case 'cantoFlor':
      sonarCanto(ev.canto)
      break
    case 'cantoEnvido':
      if (ev.primeroEstaElEnvido) sonarCanto('envidoVaPrimero', ev.canto)
      else sonarCanto(ev.canto)
      break
    case 'respuesta':
      sonarCanto(ev.respuesta)
      break
    case 'tantoDeclarado':
      if (ev.tanto === null) sonarCanto('sonBuenas')
      break
  }
}

let preparado = false

/**
 * Espera el primer toque o tecla para habilitar el audio (los navegadores no dejan sonar
 * nada antes) y ahí mismo precarga los efectos. Se llama una vez al arrancar la app.
 */
export function prepararSonido(): void {
  if (preparado || typeof window === 'undefined') return
  preparado = true
  let precargado = false
  // Se queda escuchando: en el celular el audio se vuelve a dormir al salir de la app, y
  // el próximo toque lo despierta.
  const alInteractuar = () => {
    reproductor.desbloquear()
    if (precargado || !reproductor.desbloqueado) return
    precargado = true
    reproductor.precargar(Object.values(EFECTOS).flat())
  }
  for (const e of ['pointerdown', 'keydown', 'touchend']) window.addEventListener(e, alInteractuar, { capture: true, passive: true })
}
