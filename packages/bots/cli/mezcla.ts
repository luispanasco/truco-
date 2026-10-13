/** Difícil con algunas decisiones del experto, contra el difícil puro. Uso: tsx cli/mezcla.ts claves n formato */
import { cantidadJugadores, type Formato } from '@truco/engine'
import { crearBot, jugarPartida } from '../src'
import { crearBotCon, type Estrategia } from '../src/bot'
import { crearDificil } from '../src/dificil'
import { AJUSTES_MUY_DIFICIL, crearExperto } from '../src/experto'

const claves = (process.argv[2] ?? '').split(',') as (keyof Estrategia)[]
const n = Number(process.argv[3] ?? 200)
const formato = (process.argv[4] ?? '1v1') as Formato
const desde = Number(process.argv[5] ?? 0)
const ajustes = JSON.parse(process.argv[6] ?? '{}')
const jugadores = cantidadJugadores(formato)
let gana = 0
for (let i = desde; i < desde + n; i++) {
  const s = (7 * 7919 + i * 104729) >>> 0
  const eq = i % 2
  const bots = Array.from({ length: jugadores }, (_, a) => {
    if (a % 2 !== eq) return crearBot('dificil', s + a * 31337)
    const base = crearDificil(false)
    const exp = crearExperto({ ...AJUSTES_MUY_DIFICIL, temperatura: 0, ...ajustes })
    const mezcla: Estrategia = { ...base }
    for (const k of claves) (mezcla as unknown as Record<string, unknown>)[k] = exp[k]
    return crearBotCon('muyDificil', mezcla, s + a)
  })
  const r = jugarPartida({ bots, semilla: s, config: { formato }, reparte: Math.floor(i / 2) % 2 === 0 ? jugadores - 1 : 0 })
  if (r.ganador === eq) gana++
}
console.log(`${gana}/${n}`)
