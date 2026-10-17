import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineRoom, defineServer, playground, type ServerOptions } from 'colyseus'
import { SALAS } from '@truco/shared'
import { Archivo } from './registro'
import { rutasCuentas, type Cuentas } from './cuentas/api'
import { SalaTruco, TIEMPOS_DEFAULT, type Tiempos } from './SalaTruco'

export interface OpcionesServidor {
  tiempos?: Partial<Tiempos>
  /** Carpeta para partidas y reportes. */
  dirDatos?: string
  /** Página de prueba de Colyseus en /playground (solo para desarrollo). */
  playground?: boolean
  /** Aceptar lo pago a quien desbloqueó la tienda de prueba; por defecto, según el entorno. */
  tiendaDePrueba?: boolean
  /** Cuentas, monedas y tienda (fase 2); sin esto se juega solo como invitado. */
  cuentas?: Cuentas | null
}

/**
 * `TRUCO_TIENDA_DE_PRUEBA`: prendida por defecto mientras estemos en la fase 1 (sin tienda),
 * así se puede probar todo lo pago; '0' la apaga. En la fase 2 se apaga y solo vale lo comprado.
 */
export function tiendaDePruebaDelEntorno(env: Record<string, string | undefined> = process.env): boolean {
  if (env.TRUCO_TIENDA_DE_PRUEBA !== undefined) return env.TRUCO_TIENDA_DE_PRUEBA !== '0'
  // Fase 2: con la tienda de verdad, la de prueba queda solo para desarrollar.
  return env.NODE_ENV !== 'production'
}

export function crearServidor(op: OpcionesServidor = {}) {
  const tiempos = { ...TIEMPOS_DEFAULT, ...op.tiempos }
  const tiendaDePrueba = op.tiendaDePrueba ?? tiendaDePruebaDelEntorno()
  // Por defecto, apps/server/datos, sin importar desde qué carpeta se arranque el servidor.
  const archivo = new Archivo(op.dirDatos ?? resolve(dirname(fileURLToPath(import.meta.url)), '..', 'datos'))

  class SalaPrivada extends SalaTruco {
    override tiempos = tiempos
    override archivo = archivo
    override tiendaDePrueba = tiendaDePrueba
    override cuentas = op.cuentas ?? null
  }
  class SalaPublica extends SalaPrivada {
    override publica = true
  }

  return defineServer({
    express: (app: Parameters<NonNullable<ServerOptions['express']>>[0]) => {
      app.use('/api', rutasCuentas(op.cuentas ?? null))
      if (op.playground) app.use('/playground', playground())
    },
    rooms: {
      [SALAS.privada]: defineRoom(SalaPrivada),
      [SALAS.publica]: defineRoom(SalaPublica),
    },
  })
}
