/** De dónde salen los puntos: experto (equipo A) contra difícil. Uso: tsx cli/desglose.ts formato n */
import { apply, cantidadJugadores, crearPartida, esperandoA, vistaPara, type Formato } from '@truco/engine'
import { crearBot } from '../src'

const formato = (process.argv[2] ?? '1v1') as Formato
const n = Number(process.argv[3] ?? 100)
const nivel = (process.argv[4] ?? 'master') as 'master'
const jug = cantidadJugadores(formato)
const neto = new Map<string, number>()
const sumar = (k: string, v: number) => neto.set(k, (neto.get(k) ?? 0) + v)
let manos = 0
for (let i = 0; i < n; i++) {
  const eqA = i % 2
  const bots = Array.from({ length: jug }, (_, a) => crearBot(a % 2 === eqA ? nivel : ((process.argv[5] ?? 'dificil') as 'dificil'), i * 97 + a))
  let estado = crearPartida({ jugadores: bots.map((_, k) => ({ id: `j${k}`, nombre: `${k}` })), semilla: i, config: { formato } })
  while (estado.ganador === null) {
    const a = esperandoA(estado)[0]!
    const r = apply(estado, bots[a]!.decidir(vistaPara(estado, `j${a}`)))
    if (!r.ok) throw new Error(r.motivo)
    const e = estado.mano.enfrentamientos[estado.mano.actual]!
    for (const ev of r.eventos) {
      if (ev.tipo !== 'enfrentamientoTerminado') continue
      manos++
      const res = ev.resultado
      const signo = (eq: number) => (eq === eqA ? 1 : -1)
      const tanto = res.puntosTanto[eqA]! - res.puntosTanto[1 - eqA]!
      const conFlor = r.estado.mano.numero !== estado.mano.numero || true
      const fl = e.flor.cantadas.length > 0 || (r.estado.mano.enfrentamientos[ev.indice]?.flor.cantadas.length ?? 0) > 0
      if (conFlor) sumar(fl ? 'flor' : 'envido', tanto)
      const tr = (estado.mano.enfrentamientos[ev.indice] ?? e).truco
      const canto = tr.valor > 1 && tr.puedeSubir !== null ? (tr.puedeSubir === eqA ? ' (cantó difícil)' : ' (cantó experto)') : ''
      sumar(`truco ${res.motivo} v${res.puntosTruco}${res.motivo === 'vueltas' ? canto : ''}`, signo(res.ganador) * res.puntosTruco)
      if (res.motivo === 'vueltas' && res.puntosTruco > 1) sumar(`  cuenta v${res.puntosTruco}${canto}`, 1)
    }
    estado = r.estado
  }
  sumar('partidas ganadas', estado.ganador === eqA ? 1 : 0)
}
console.log(formato, nivel, 'manos', manos)
for (const [k, v] of [...neto].sort((x, y) => x[1] - y[1])) console.log(`  ${k}: ${v} (${(v / manos).toFixed(3)} por mano)`)
