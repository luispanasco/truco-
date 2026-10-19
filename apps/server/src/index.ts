import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { crearServidor } from './servidor'
import { cuentasDelEntorno } from './cuentas/entorno'
import { prenderTurnCloudflare } from './voz'

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..')
// Las claves de Supabase van en apps/server/.env (no se sube a git; ver INSTRUCTIVO-CUENTAS.md).
try {
  process.loadEnvFile(resolve(raiz, '.env'))
} catch {
  // Sin .env: se usan las variables del entorno, o la base local y el login de prueba.
}

const puerto = Number(process.env.PORT ?? 2567)
const desarrollo = process.env.NODE_ENV !== 'production'
// Para probar más rápido: TRUCO_BOT_MS=0 (demora de los bots) y TRUCO_TURNO_MS (tiempo por turno).
// TRUCO_TURNO_MS pisa los tiempos que elige cada sala, también el de la primera jugada del mano.
const botMs = process.env.TRUCO_BOT_MS ? Number(process.env.TRUCO_BOT_MS) : undefined
const turnoMs = process.env.TRUCO_TURNO_MS ? Number(process.env.TRUCO_TURNO_MS) : undefined
// TRUCO_TIENDA_DE_PRUEBA=0 deja de aceptar lo pago a quien desbloqueó la tienda de prueba (ver servidor.ts).
const conTurn = await prenderTurnCloudflare()
console.log(conTurn ? 'Voz: con el TURN de Cloudflare.' : 'Voz: solo STUN (sin TRUCO_TURN_ID y TRUCO_TURN_TOKEN, algunas redes no conectan).')
const cuentas = await cuentasDelEntorno(process.env, resolve(raiz, 'datos', 'base')).catch((e: unknown) => {
  console.error(`No se pudo conectar con la base de datos (${e instanceof Error ? e.message : e}). ¿Estás con VPN o en una red que lo bloquea?`)
  process.exit(1)
})
const servidor = crearServidor({
  playground: desarrollo,
  cuentas,
  tiempos: {
    ...(botMs !== undefined ? { botMinMs: botMs, botMaxMs: botMs, pausaVueltaMs: botMs, pausaManoMs: botMs } : {}),
    ...(turnoMs !== undefined ? { turnoMs } : {}),
  },
})
await servidor.listen(puerto)
console.log(`Servidor de truco escuchando en ws://localhost:${puerto}`)
console.log(
  !cuentas
    ? 'Cuentas apagadas (falta DATABASE_URL o SUPABASE_URL).'
    : `Cuentas: ${process.env.DATABASE_URL ? 'PostgreSQL' : 'base local de prueba'}, ${cuentas.loginDePrueba ? 'login de prueba' : 'Supabase'}.`,
)
if (desarrollo) console.log(`Playground para probar a mano: http://localhost:${puerto}/playground`)
