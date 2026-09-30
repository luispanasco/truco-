/**
 * Partidas bot contra bot.
 * Uso: pnpm simular --a dificil --b medio --n 1000 --formato 2v2 [--semilla 1] [--procesos 8]
 *
 * Con --procesos, las partidas se reparten en varios procesos; el resultado es el
 * mismo que jugándolas en uno solo.
 */
import { spawn } from 'node:child_process'
import { availableParallelism } from 'node:os'
import { fileURLToPath } from 'node:url'
import type { Formato } from '@truco/engine'
import { enfrentar, type Nivel } from '../src'

function arg(nombre: string, porDefecto: string): string {
  const i = process.argv.indexOf(`--${nombre}`)
  return i >= 0 ? (process.argv[i + 1] ?? porDefecto) : porDefecto
}

const a = arg('a', 'dificil') as Nivel
const b = arg('b', 'medio') as Nivel
const n = Number(arg('n', '100'))
const formato = arg('formato', '1v1') as Formato
const semilla = Number(arg('semilla', '1'))

// Modo trabajador: juega un tramo y devuelve cuántas ganó A.
const desde = arg('desde', '')
if (desde !== '') {
  const r = enfrentar(a, b, n, formato, semilla, {}, Number(desde))
  process.stdout.write(String(r.ganadasA))
} else {
  const procesos = Math.max(1, Math.min(Number(arg('procesos', String(Math.min(8, availableParallelism())))), n))
  const inicio = Date.now()
  const tramos = Array.from({ length: procesos }, (_, k) => {
    const d = Math.floor((n * k) / procesos)
    return { desde: d, cantidad: Math.floor((n * (k + 1)) / procesos) - d }
  })
  const script = fileURLToPath(import.meta.url)
  const resultados = await Promise.all(
    tramos.map(
      (t) =>
        new Promise<number>((resolve, reject) => {
          const hijo = spawn(process.execPath, [
            ...process.execArgv,
            script,
            ...['--a', a, '--b', b, '--formato', formato, '--semilla', String(semilla)],
            ...['--n', String(t.cantidad), '--desde', String(t.desde)],
          ])
          let salida = ''
          let error = ''
          hijo.stdout.on('data', (d) => (salida += d))
          hijo.stderr.on('data', (d) => (error += d))
          hijo.on('close', (codigo) => (codigo === 0 ? resolve(Number(salida)) : reject(new Error(error))))
        }),
    ),
  )
  const ganadas = resultados.reduce((s, x) => s + x, 0)
  const p = ganadas / n
  const margen = 1.96 * Math.sqrt((p * (1 - p)) / n)
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`
  const ms = Date.now() - inicio
  console.log(`${a} contra ${b} · ${formato} · ${n} partidas · semilla ${semilla}`)
  console.log(`Gana ${a}: ${ganadas} (${pct(p)} ± ${pct(margen)})`)
  console.log(`Tiempo: ${(ms / 1000).toFixed(1)} s en ${procesos} procesos`)
}
