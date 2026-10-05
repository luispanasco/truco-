/**
 * Procesa las grabaciones de un pack de voces de los cantos y las deja listas para la app.
 *
 * Uso (desde apps/web):
 *   node scripts/voces.mjs <carpeta con las grabaciones> <id del pack> ["Nombre del pack"] [--formato webm|ogg]
 *
 * Ejemplo:
 *   node scripts/voces.mjs ~/Grabaciones/luis luis "Luis" --formato webm
 *
 * - Las grabaciones (wav, m4a, ogg, mp3, webm, flac) van nombradas por canto. Se aceptan con
 *   guiones, espacios o mayúsculas: "truco.wav", "vale-cuatro.m4a", "Real envido.wav",
 *   "contraflor al resto.ogg", "no quiero.wav", "son buenas.wav", "envido va primero.wav".
 *   Cantos: truco, retruco, valeCuatro, envido, realEnvido, faltaEnvido, flor, contraflor,
 *   contraflorAlResto, quiero, noQuiero, sonBuenas, envidoVaPrimero. No hace falta grabarlos
 *   todos: el que falta queda solo con el globo de texto.
 * - Con ffmpeg: recorta el silencio del principio y del final, normaliza el volumen (todas
 *   las voces suenan parejo) y pasa a mono. Sale public/voces/<id>/<canto>.webm (Opus, 48 kbps)
 *   o .ogg (Vorbis) con --formato ogg.
 * - Al final imprime el pack para pegar en src/sonido/voces.ts (PACKS_VOCES).
 *
 * Necesita ffmpeg en el PATH (si no está, el script explica cómo instalarlo).
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { basename, dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const CANTOS = [
  'truco',
  'retruco',
  'valeCuatro',
  'envido',
  'realEnvido',
  'faltaEnvido',
  'flor',
  'contraflor',
  'contraflorAlResto',
  'quiero',
  'noQuiero',
  'sonBuenas',
  'envidoVaPrimero',
]
const EXTENSIONES = ['.wav', '.m4a', '.ogg', '.mp3', '.webm', '.flac', '.aac', '.opus']

/** Silencio: lo que esté por debajo de esto al principio y al final se corta. */
const UMBRAL_SILENCIO = '-45dB'
/** Volumen parejo (EBU R128): -16 LUFS es lo habitual para voces en el celular. */
const NORMALIZAR = 'loudnorm=I=-16:TP=-1.5:LRA=11'

const CODECS = {
  webm: ['-c:a', 'libopus', '-b:a', '48k', '-ar', '48000'],
  ogg: ['-c:a', 'libvorbis', '-q:a', '4', '-ar', '44100'],
}

function salir(mensaje) {
  console.error(mensaje)
  process.exit(1)
}

// --- Argumentos ---
const args = process.argv.slice(2)
let formato = 'webm'
const i = args.indexOf('--formato')
if (i >= 0) {
  formato = args[i + 1]
  args.splice(i, 2)
}
const [carpeta, id, nombre = id] = args
if (!carpeta || !id) {
  salir('Uso: node scripts/voces.mjs <carpeta con las grabaciones> <id del pack> ["Nombre del pack"] [--formato webm|ogg]')
}
if (!(formato in CODECS)) salir(`Formato desconocido: ${formato}. Usá webm u ogg.`)
if (!/^[a-z0-9-]+$/.test(id)) salir(`El id del pack va en minúsculas, sin espacios (por ejemplo "luis" o "voz-1"): "${id}" no sirve.`)
if (!existsSync(carpeta) || !statSync(carpeta).isDirectory()) salir(`No encuentro la carpeta ${carpeta}.`)

// --- ffmpeg ---
const prueba = spawnSync('ffmpeg', ['-version'], { encoding: 'utf8' })
if (prueba.error || prueba.status !== 0) {
  salir(`No encuentro ffmpeg, que hace falta para recortar y normalizar las grabaciones.

Cómo instalarlo:
  Windows:  winget install Gyan.FFmpeg     (o: choco install ffmpeg)
  macOS:    brew install ffmpeg
  Linux:    sudo apt install ffmpeg       (o el gestor de tu distribución)

Después cerrá y volvé a abrir la terminal (para que tome el PATH) y corré de nuevo este script.`)
}

// --- Grabaciones ---
const clave = (texto) => texto.toLowerCase().replace(/[^a-z]/g, '')
const porClave = new Map(CANTOS.map((c) => [clave(c), c]))
const encontrados = new Map()
for (const archivo of readdirSync(carpeta)) {
  const ext = extname(archivo).toLowerCase()
  if (!EXTENSIONES.includes(ext)) continue
  const canto = porClave.get(clave(basename(archivo, extname(archivo))))
  if (!canto) {
    console.warn(`  (salteo "${archivo}": no es el nombre de ningún canto)`)
    continue
  }
  if (encontrados.has(canto)) console.warn(`  (hay dos grabaciones de ${canto}: uso "${archivo}")`)
  encontrados.set(canto, join(carpeta, archivo))
}
if (encontrados.size === 0) salir(`No hay grabaciones con nombre de canto en ${carpeta}. Nombres válidos: ${CANTOS.join(', ')}.`)

const aqui = dirname(fileURLToPath(import.meta.url))
const destino = resolve(aqui, '..', 'public', 'voces', id)
mkdirSync(destino, { recursive: true })

// Recorta el silencio de adelante, da vuelta el audio para recortar el de atrás, y normaliza.
const recorte = `silenceremove=start_periods=1:start_threshold=${UMBRAL_SILENCIO}:start_silence=0.05`
const filtro = [recorte, 'areverse', recorte, 'areverse', NORMALIZAR].join(',')

const archivos = {}
for (const canto of CANTOS) {
  const entrada = encontrados.get(canto)
  if (!entrada) continue
  const salida = join(destino, `${canto}.${formato}`)
  const r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-i', entrada, '-af', filtro, '-ac', '1', ...CODECS[formato], salida], {
    encoding: 'utf8',
  })
  if (r.status !== 0) salir(`ffmpeg falló con ${entrada}:\n${r.stderr}`)
  archivos[canto] = `${canto}.${formato}`
  console.log(`  ${canto.padEnd(18)} ← ${basename(entrada)}  (${Math.round(statSync(salida).size / 1024)} KiB)`)
}

const faltan = CANTOS.filter((c) => !archivos[c])
console.log(`\nListo: ${Object.keys(archivos).length} cantos en public/voces/${id}/.`)
if (faltan.length > 0) console.log(`Sin grabar (quedan solo con el globo): ${faltan.join(', ')}.`)
console.log(`\nPegá esto en PACKS_VOCES (src/sonido/voces.ts):\n`)
console.log(`  ${JSON.stringify({ id, nombre, archivos }, null, 2).replace(/\n/g, '\n  ')},`)
