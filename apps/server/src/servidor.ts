import { resolve } from 'node:path'
import { defineRoom, defineServer, playground, type ServerOptions } from 'colyseus'
import { SALAS } from '@truco/shared'
import { Archivo } from './registro'
import { SalaTruco, TIEMPOS_DEFAULT, type Tiempos } from './SalaTruco'

export interface OpcionesServidor {
  tiempos?: Partial<Tiempos>
  /** Carpeta para partidas y reportes. */
  dirDatos?: string
  /** Página de prueba de Colyseus en /playground (solo para desarrollo). */
  playground?: boolean
}

export function crearServidor(op: OpcionesServidor = {}) {
  const tiempos = { ...TIEMPOS_DEFAULT, ...op.tiempos }
  const archivo = new Archivo(op.dirDatos ?? resolve('datos'))

  class SalaPrivada extends SalaTruco {
    override tiempos = tiempos
    override archivo = archivo
  }
  class SalaPublica extends SalaPrivada {
    override publica = true
  }

  return defineServer({
    ...(op.playground ? { express: (app: Parameters<NonNullable<ServerOptions['express']>>[0]) => void app.use('/playground', playground()) } : {}),
    rooms: {
      [SALAS.privada]: defineRoom(SalaPrivada),
      [SALAS.publica]: defineRoom(SalaPublica),
    },
  })
}
