// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { mismaCarta, siguienteAleatorio, type Carta, type Formato, type VistaPartida } from '@truco/engine'
import { MOTIVO_SENIA_TARDE, MOTIVO_SIN_SENIAS, yaJugoEnLaMano } from '@truco/shared'
import { ConexionLocal, type OpcionesLocal } from '../src/conexion/local'
import type { MensajeServidor } from '../src/conexion/tipos'

/** Juega una partida entera contra bots, eligiendo al azar cuando le toca. */
function jugarPartida(
  formato: Formato,
  semilla: number,
  extra: Partial<OpcionesLocal> = {},
): Promise<{ vista: VistaPartida; mensajes: MensajeServidor[] }> {
  const c = new ConexionLocal({ apodo: 'Test', avatar: null, formato, nivelBots: 'medio', demoraBots: [0, 0], semilla, ...extra })
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
          // Las que se dieron vuelta al terminar (flor o envido ganado) son públicas.
          ...v.mano.enfrentamientos.flatMap((e) => e.resultado?.mostradas.flatMap((m) => m.cartas) ?? []),
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

  it('con "gestoYCarta" y probabilidad 1, la persona pesca todas las señas de los bots rivales', async () => {
    const { mensajes } = await jugarPartida('2v2', 5, { senias: { pescar: 'gestoYCarta', probabilidadPescar: 1 } })
    const pescadas = mensajes.flatMap((m) => (m.tipo === 'seniaPescada' ? [m.datos] : []))
    expect(pescadas.length).toBeGreaterThan(0)
    expect(pescadas.every((p) => p.de % 2 === 1 && p.senia !== null)).toBe(true)
  }, 30_000)

  it('con "gesto" se pesca sin saber la seña, y con probabilidad 0 no se pesca nada', async () => {
    const gesto = await jugarPartida('2v2', 5, { senias: { pescar: 'gesto', probabilidadPescar: 1 } })
    const pescadas = gesto.mensajes.flatMap((m) => (m.tipo === 'seniaPescada' ? [m.datos] : []))
    expect(pescadas.length).toBeGreaterThan(0)
    expect(pescadas.every((p) => p.senia === null)).toBe(true)
    const nada = await jugarPartida('2v2', 5, { senias: { pescar: 'gestoYCarta', probabilidadPescar: 0 } })
    expect(nada.mensajes.some((m) => m.tipo === 'seniaPescada')).toBe(false)
  }, 60_000)

  it('con "antesDeJugar", después de tirar la primera carta la seña se rechaza', async () => {
    const c = new ConexionLocal({
      apodo: 'Test',
      avatar: null,
      formato: '2v2',
      nivelBots: 'facil',
      demoraBots: [0, 0],
      semilla: 8,
      senias: { pescar: 'nunca', momento: 'antesDeJugar' },
    })
    const errores: string[] = []
    let jugue = false
    await new Promise<void>((resolve, reject) => {
      const limite = setTimeout(() => reject(new Error('No se llegó a jugar')), 10_000)
      c.escuchar((m) => {
        if (m.tipo === 'error') {
          errores.push(m.datos.motivo)
          clearTimeout(limite)
          resolve()
        }
        if (m.tipo !== 'vista' || jugue) return
        const v = m.datos
        if (yaJugoEnLaMano(v.mano, 0)) {
          jugue = true
          c.enviar('senia', { senia: 'tres' })
          return
        }
        if (!v.esperandoA.includes(0)) return
        // Antes de jugar, la seña pasa sin error.
        c.enviar('senia', { senia: 'pieza2' })
        const accion = v.accionesValidas.find((a) => a.tipo === 'jugarCarta') ?? v.accionesValidas.find((a) => a.tipo !== 'irseAlMazo')!
        c.enviar('accion', { accion })
      })
    })
    c.salir()
    expect(errores).toEqual([MOTIVO_SENIA_TARDE])
  })

  it('sin señas, los bots no hacen ni reciben ninguna y la de la persona se rechaza', async () => {
    const senias = { habilitadas: false, pescar: 'gestoYCarta', probabilidadPescar: 1 } as const
    const { mensajes } = await jugarPartida('2v2', 5, { senias })
    expect(mensajes.some((m) => m.tipo === 'senia' || m.tipo === 'seniaPescada')).toBe(false)
    const sala = mensajes.find((m) => m.tipo === 'sala')
    expect(sala?.tipo === 'sala' && sala.datos.senias.habilitadas).toBe(false)

    const c = new ConexionLocal({ apodo: 'Test', avatar: null, formato: '2v2', nivelBots: 'dificil', demoraBots: [0, 0], semilla: 8, senias })
    // Lo que tiene cada bot para decidir: nada, en ninguna mano.
    const recibidas = () => (c as unknown as { senias: Record<number, unknown>[] }).senias
    const motivo = await new Promise<string>((resolve) => {
      c.escuchar((m) => {
        if (m.tipo === 'error') resolve(m.datos.motivo)
        if (m.tipo === 'vista' && m.datos.esperandoA.includes(0)) c.enviar('senia', { senia: 'tres' })
      })
    })
    expect(recibidas().every((s) => Object.keys(s).length === 0)).toBe(true)
    c.salir()
    expect(motivo).toBe(MOTIVO_SIN_SENIAS)
  })

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
