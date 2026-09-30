/**
 * Prueba de humo: levanta el servidor de verdad (con Node, no con Vitest) y le conecta
 * un cliente real por WebSocket. Detecta problemas de instalación que los tests no ven,
 * como dos copias de @colyseus/core en node_modules ("seat reservation expired").
 * Si falla: rm -rf node_modules packages/*\/node_modules apps/*\/node_modules && pnpm install
 */
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Client } from '@colyseus/sdk'
import { crearServidor } from '../src/servidor'

const puerto = 2590 + Math.floor(Math.random() * 9)
const servidor = crearServidor({ dirDatos: mkdtempSync(join(tmpdir(), 'truco-humo-')) })
await servidor.listen(puerto)

let ok = false
try {
  const cliente = new Client(`ws://localhost:${puerto}`)
  const sala = await cliente.create('privada', { invitadoId: 'prueba-de-humo-1', apodo: 'Humo' })
  ok = /^[A-Z0-9]{5}$/.test(sala.roomId)
  await sala.leave(true)
  console.log(ok ? `Prueba de humo OK: sala ${sala.roomId}` : `Código de sala inesperado: ${sala.roomId}`)
} catch (e) {
  console.error(`Prueba de humo FALLÓ: ${(e as Error).message}`)
  console.error('Probá reinstalar las dependencias desde cero (ver el comentario de scripts/humo.ts).')
}
// Sin process.exit: en Windows, forzar la salida mientras se cierran conexiones aborta el proceso.
process.exitCode = ok ? 0 : 1
await servidor.gracefullyShutdown(false).catch(() => {})
// Por si algo queda abierto, se termina igual al rato.
setTimeout(() => process.kill(process.pid, 'SIGTERM'), 2000).unref()
