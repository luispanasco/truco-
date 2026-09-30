import { crearServidor } from './servidor'

const puerto = Number(process.env.PORT ?? 2567)
const desarrollo = process.env.NODE_ENV !== 'production'
// Para probar más rápido: TRUCO_BOT_MS=0 (demora de los bots) y TRUCO_TURNO_MS (tiempo por turno).
const botMs = process.env.TRUCO_BOT_MS ? Number(process.env.TRUCO_BOT_MS) : undefined
const turnoMs = process.env.TRUCO_TURNO_MS ? Number(process.env.TRUCO_TURNO_MS) : undefined
const servidor = crearServidor({
  playground: desarrollo,
  tiempos: {
    ...(botMs !== undefined ? { botMinMs: botMs, botMaxMs: botMs, pausaVueltaMs: botMs, pausaManoMs: botMs } : {}),
    ...(turnoMs !== undefined ? { turnoMs } : {}),
  },
})
await servidor.listen(puerto)
console.log(`Servidor de truco escuchando en ws://localhost:${puerto}`)
if (desarrollo) console.log(`Playground para probar a mano: http://localhost:${puerto}/playground`)
