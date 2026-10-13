/** Cuánto tarda en decidir cada nivel: el peor caso y el promedio, por formato. */
import { apply, crearPartida, esperandoA, vistaPara, type Formato } from '@truco/engine'
import { crearBot, type Nivel } from '../src'

const nivel = (process.argv[2] ?? 'master') as Nivel
for (const formato of ['1v1', '2v2', '3v3'] as Formato[]) {
  const n = formato === '1v1' ? 2 : formato === '2v2' ? 4 : 6
  let max = 0
  let total = 0
  let decisiones = 0
  for (let s = 0; s < 3; s++) {
    const bots = Array.from({ length: n }, (_, a) => crearBot(nivel, s * 31 + a))
    let estado = crearPartida({ jugadores: bots.map((_, i) => ({ id: `j${i}`, nombre: `${i}` })), semilla: s, config: { formato } })
    while (estado.ganador === null) {
      const a = esperandoA(estado)[0]!
      const t0 = performance.now()
      const accion = bots[a]!.decidir(vistaPara(estado, `j${a}`))
      const ms = performance.now() - t0
      max = Math.max(max, ms)
      total += ms
      decisiones++
      const r = apply(estado, accion)
      if (!r.ok) throw new Error(r.motivo)
      estado = r.estado
    }
  }
  console.log(`${nivel} ${formato}: promedio ${(total / decisiones).toFixed(0)} ms, peor ${max.toFixed(0)} ms (${decisiones} decisiones)`)
}
