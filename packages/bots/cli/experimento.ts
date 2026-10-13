/** Experto con ajustes a medida contra el difícil (para calibrar). Uso: tsx cli/experimento.ts '<json ajustes>' n formato */
import { cantidadJugadores, type Formato } from '@truco/engine'
import { crearBot, jugarPartida } from '../src'
import { crearBotCon } from '../src/bot'
import { AJUSTES_MUY_DIFICIL, crearExperto } from '../src/experto'

const parcial = JSON.parse(process.argv[2] ?? '{}')
const n = Number(process.argv[3] ?? 200)
const formato = (process.argv[4] ?? '1v1') as Formato
const rival = (process.argv[5] ?? 'dificil') as 'dificil'
const jugadores = cantidadJugadores(formato)
let gana = 0
for (let i = 0; i < n; i++) {
  const s = (7 * 7919 + i * 104729) >>> 0
  const eq = i % 2
  const bots = Array.from({ length: jugadores }, (_, a) =>
    a % 2 === eq ? crearBotCon('muyDificil', crearExperto({ ...AJUSTES_MUY_DIFICIL, ...parcial }), s + a) : crearBot(rival, s + a * 31337),
  )
  const r = jugarPartida({ bots, semilla: s, config: { formato }, reparte: Math.floor(i / 2) % 2 === 0 ? jugadores - 1 : 0 })
  if (r.ganador === eq) gana++
}
console.log(JSON.stringify(parcial), formato, `${((100 * gana) / n).toFixed(1)}%`)
