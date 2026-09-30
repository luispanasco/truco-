// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { mismaCarta, siguienteAleatorio, type Carta, type Formato, type VistaPartida } from '@truco/engine'
import { ConexionLocal } from '../src/conexion/local'
import type { MensajeServidor } from '../src/conexion/tipos'

/** Juega una partida entera contra bots, eligiendo al azar cuando le toca. */
function jugarPartida(formato: Formato, semilla: number): Promise<{ vista: VistaPartida; mensajes: MensajeServidor[] }> {
  const c = new ConexionLocal({ apodo: 'Test', avatar: null, formato, nivelBots: 'medio', demoraBots: [0, 0], semilla })
  const mensajes: MensajeServidor[] = []
  let rng = semilla
  return new Promise((resolve, reject) => {
    const limite = setTimeout(() => reject(new Error('La partida no terminó')), 20_000)
    c.escuchar((m) => {
      mensajes.push(m)
      if (m.tipo !== 'vista') return
      const v = m.datos
      if (v.ganador !== null) {
        clearTimeout(limite)
        c.salir()
        resolve({ vista: v, mensajes })
        return
      }
      if (!v.esperandoA.includes(0) || v.accionesValidas.length === 0) return
      const opciones = v.accionesValidas.filter((a) => a.tipo !== 'irseAlMazo')
      let r: number
      ;[r, rng] = siguienteAleatorio(rng)
      c.enviar('accion', { accion: opciones[Math.floor(r * opciones.length)] ?? v.accionesValidas[0]! })
    })
  })
}

function cartasDentro(x: unknown, out: Carta[] = []): Carta[] {
  if (Array.isArray(x)) for (const y of x) cartasDentro(y, out)
  else if (x !== null && typeof x === 'object') {
    const o = x as Record<string, unknown>
    if (typeof o.numero === 'number' && typeof o.palo === 'string') out.push(o as unknown as Carta)
    else for (const v of Object.values(o)) cartasDentro(v, out)
  }
  return out
}

describe('conexión local', () => {
  for (const formato of ['1v1', '2v2', '3v3'] as Formato[]) {
    it(`juega una partida ${formato} entera contra bots`, async () => {
      const { vista, mensajes } = await jugarPartida(formato, 11)
      expect(Math.max(...vista.puntos)).toBe(30)
      const salas = mensajes.filter((m) => m.tipo === 'sala')
      expect(salas[salas.length - 1]!.datos).toMatchObject({ fase: 'terminada', yo: 0 })
      // Cada vista es de la persona y no trae cartas ajenas sin jugar.
      for (const m of mensajes) {
        if (m.tipo !== 'vista') continue
        const v = m.datos
        const publicas = [
          ...v.mano.misCartas,
          v.mano.muestra,
          ...v.mano.enfrentamientos.flatMap((e) => e.vueltas.flatMap((vu) => vu.jugadas.map((j) => j.carta))),
        ]
        expect(cartasDentro(v).filter((c) => !publicas.some((p) => mismaCarta(p, c)))).toEqual([])
      }
    }, 30_000)
  }

  it('en 2v2 la persona recibe las señas de su compañero bot', async () => {
    const { mensajes } = await jugarPartida('2v2', 5)
    const senias = mensajes.filter((m) => m.tipo === 'senia')
    expect(senias.length).toBeGreaterThan(0)
    expect(senias.every((m) => m.tipo === 'senia' && m.datos.de === 2)).toBe(true)
  }, 30_000)

  it('una jugada inválida devuelve el motivo', async () => {
    const c = new ConexionLocal({ apodo: 'Test', avatar: null, formato: '1v1', nivelBots: 'facil', demoraBots: [0, 0], semilla: 3 })
    const error = await new Promise<string>((resolve) => {
      c.escuchar((m) => {
        if (m.tipo === 'error') resolve(m.datos.motivo)
      })
      c.enviar('accion', { accion: { tipo: 'responder', jugador: 'j0', respuesta: 'quiero' } })
    })
    c.salir()
    expect(error).toBe('No hay nada que responder')
  })
})
