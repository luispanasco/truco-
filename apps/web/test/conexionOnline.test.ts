// @vitest-environment node
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { crearServidor } from '@truco/server/src/servidor'
import { ConexionOnline, motivoError } from '../src/conexion/online'
import type { MensajeServidor } from '../src/conexion/tipos'

const PUERTO = 2576
let servidor: ReturnType<typeof crearServidor>

beforeAll(async () => {
  vi.stubEnv('VITE_SERVIDOR', `ws://localhost:${PUERTO}`)
  servidor = crearServidor({
    dirDatos: mkdtempSync(join(tmpdir(), 'truco-web-')),
    tiempos: { botMinMs: 0, botMaxMs: 0, pausaVueltaMs: 0, pausaManoMs: 0 },
  })
  await servidor.listen(PUERTO)
})
afterAll(async () => {
  vi.unstubAllEnvs()
  await servidor.gracefullyShutdown(false).catch(() => {})
})

/** Junta los mensajes y permite esperar uno que cumpla una condición. */
function registrar(c: ConexionOnline) {
  const mensajes: MensajeServidor[] = []
  const esperas: (() => void)[] = []
  c.escuchar((m) => {
    mensajes.push(m)
    for (const f of esperas.splice(0)) f()
  })
  const esperar = async (cond: (m: MensajeServidor[]) => boolean, ms = 8000) => {
    const hasta = Date.now() + ms
    while (!cond(mensajes)) {
      if (Date.now() > hasta) throw new Error('No llegó lo esperado')
      await new Promise<void>((r) => {
        esperas.push(r)
        setTimeout(r, 100)
      })
    }
  }
  return { mensajes, esperar }
}

describe('conexión online', () => {
  it('crea una sala, otro entra con el código y el anfitrión la empieza', async () => {
    const a = await ConexionOnline.crearSala({ invitadoId: 'web-test-anfitrion', apodo: 'Ana', config: { formato: '2v2' } })
    const ra = registrar(a)
    // La primera `sala` llega aunque se escuche después de conectar.
    await ra.esperar((ms) => ms.some((m) => m.tipo === 'sala'))
    const codigo = a.roomId
    expect(codigo).toMatch(/^[A-Z0-9]{5}$/)

    const b = await ConexionOnline.unirse(codigo.toLowerCase(), { invitadoId: 'web-test-invitado', apodo: 'Beto' })
    const rb = registrar(b)
    await rb.esperar((ms) => ms.some((m) => m.tipo === 'sala' && m.datos.yo === 1))

    a.enviar('iniciar', {})
    await rb.esperar((ms) => ms.some((m) => m.tipo === 'vista'))
    const vista = rb.mensajes.find((m) => m.tipo === 'vista')!
    expect(vista.tipo === 'vista' && vista.datos.yo.asiento).toBe(1)
    a.salir()
    b.salir()
  })

  it('entrar a un código que no existe da un error entendible', async () => {
    const error = await ConexionOnline.unirse('ZZZZZ', { invitadoId: 'web-test-x', apodo: 'X' }).catch((e) => e)
    expect(motivoError(error)).toBe('No existe una sala con ese código.')
  })
})
