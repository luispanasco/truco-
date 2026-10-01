/**
 * Levanta el juego (servidor + web) y abre un túnel de Cloudflare para que
 * entren desde afuera de tu red, sin tocar el router. Uso: pnpm compartir
 *
 * Necesita cloudflared: winget install Cloudflare.cloudflared
 * El link cambia cada vez que se corre, y anda mientras esto quede abierto.
 */
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'

const PUERTO_WEB = 5173

function buscarCloudflared() {
  const instalados = ['C:\\Program Files (x86)\\cloudflared\\cloudflared.exe', 'C:\\Program Files\\cloudflared\\cloudflared.exe']
  return instalados.find((r) => existsSync(r)) ?? 'cloudflared'
}

const procesos = []
function cerrarTodo() {
  for (const p of procesos) p.kill()
  process.exit()
}
process.on('SIGINT', cerrarTodo)
process.on('SIGTERM', cerrarTodo)

async function esperarWeb() {
  for (let i = 0; i < 120; i++) {
    if (await webAndando()) return
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('La web no levantó en el puerto 5173.')
}

async function webAndando() {
  try {
    await fetch(`http://localhost:${PUERTO_WEB}/`)
    return true
  } catch {
    return false
  }
}

// Si ya está corriendo (por ejemplo, con pnpm dev en otra terminal), se usa ese.
if (await webAndando()) {
  console.log('El juego ya está corriendo: solo abro el túnel.')
} else {
  console.log('Levantando el servidor y la web…')
  const dev = spawn('pnpm', ['dev'], { stdio: ['ignore', 'ignore', 'inherit'], shell: true })
  procesos.push(dev)
  dev.on('exit', (codigo) => {
    console.error(`El juego se cerró (código ${codigo}).`)
    cerrarTodo()
  })
}

await esperarWeb()
console.log('Abriendo el túnel…')

const tunel = spawn(buscarCloudflared(), ['tunnel', '--no-autoupdate', '--url', `http://localhost:${PUERTO_WEB}`])
procesos.push(tunel)
tunel.on('error', () => {
  console.error('No encontré cloudflared. Instalalo con: winget install Cloudflare.cloudflared')
  cerrarTodo()
})
tunel.on('exit', () => {
  console.error('El túnel se cerró.')
  cerrarTodo()
})

let avisado = false
const leer = (datos) => {
  const link = String(datos).match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/)
  if (link && !avisado) {
    avisado = true
    console.log(`\n  Pasales este link:  ${link[0]}\n`)
    console.log('  (Puede tardar unos segundos en andar. Ctrl+C para cerrar todo.)\n')
  }
}
tunel.stdout.on('data', leer)
tunel.stderr.on('data', leer)
