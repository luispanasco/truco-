import { resolve } from 'node:path'
import { defineRoom, defineServer } from 'colyseus'
import { SALAS } from '@truco/shared'
import { Archivo } from './registro'
import { SalaTruco, TIEMPOS_DEFAULT, type Tiempos } from './SalaTruco'

export interface OpcionesServidor {
  tiempos?: Partial<Tiempos>
  /** Carpeta para partidas y reportes. */
  dirDatos?: string
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
    rooms: {
      [SALAS.privada]: defineRoom(SalaPrivada),
      [SALAS.publica]: defineRoom(SalaPublica),
    },
  })
}
