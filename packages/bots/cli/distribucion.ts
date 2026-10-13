/** Mide cómo se reparten los puntos por mano entre bots difíciles (para la tabla de equidad). */
import { apply, crearPartida, esperandoA, vistaPara, type Formato } from '@truco/engine'
import { crearBot } from '../src'

const formato = (process.argv[2] ?? '1v1') as Formato
const n = formato === '1v1' ? 2 : formato === '2v2' ? 4 : 6
const cuenta = new Map<string, number>()
let manos = 0
for (let s = 0; s < 150; s++) {
  const bots = Array.from({ length: n }, (_, a) => crearBot('dificil', s * 31 + a))
  let estado = crearPartida({ jugadores: bots.map((_, i) => ({ id: `j${i}`, nombre: `${i}` })), semilla: s, config: { formato } })
  while (estado.ganador === null) {
    const a = esperandoA(estado)[0]!
    const r = apply(estado, bots[a]!.decidir(vistaPara(estado, `j${a}`)))
    if (!r.ok) throw new Error(r.motivo)
    for (const ev of r.eventos) {
      if (ev.tipo !== 'enfrentamientoTerminado' || r.estado.mano.picaPica) continue
      const p = [...ev.resultado.puntosTanto]
      p[ev.resultado.ganador] = p[ev.resultado.ganador]! + ev.resultado.puntosTruco
      // Desde el equipo 0 y desde el 1: la tabla es simétrica.
      for (const [x, y] of [[p[0], p[1]], [p[1], p[0]]]) cuenta.set(`${x},${y}`, (cuenta.get(`${x},${y}`) ?? 0) + 1)
      manos++
    }
    estado = r.estado
  }
}
const filas = [...cuenta].map(([k, c]) => [k, c / (2 * manos)] as const).filter(([, p]) => p >= 0.002).sort((a, b) => b[1] - a[1])
console.log(manos, JSON.stringify(filas.map(([k, p]) => [...k.split(',').map(Number), Number(p.toFixed(4))])))
