/**
 * Reportes de problemas (los testers): el tipo, una descripción y, solo, lo que hace falta para
 * ver qué pasó (la partida para repetirla, la vista, el registro, el navegador). Los mira el admin.
 */

import type { RepeticionPartida } from './repeticion'

export const TIPOS_REPORTE = [
  { id: 'reglas', texto: 'Reglas o puntos mal' },
  { id: 'trabado', texto: 'Se trabó o no responde' },
  { id: 'bot', texto: 'Un bot hizo algo raro' },
  { id: 'visual', texto: 'Se ve mal' },
  { id: 'otro', texto: 'Otro' },
] as const

export type TipoReporte = (typeof TIPOS_REPORTE)[number]['id']

export const esTipoReporte = (x: unknown): x is TipoReporte => TIPOS_REPORTE.some((t) => t.id === x)

export const textoTipoReporte = (tipo: string) => TIPOS_REPORTE.find((t) => t.id === tipo)?.texto ?? tipo

export const MAX_DESCRIPCION_REPORTE = 1000
/** Tope del cuerpo entero (con la repetición y la vista). */
export const MAX_BYTES_REPORTE = 1_000_000
/** Cuántos reportes por hora deja mandar a cada IP o invitado. */
export const MAX_REPORTES_POR_HORA = 10

/** Lo que se adjunta solo. Todo es opcional: fuera de una partida va solo lo del navegador. */
export interface ContextoReporte {
  version?: string
  navegador?: string
  pantalla?: string
  ruta?: string
  /** Una partida contra la compu: la repetición entera hasta ahora, la vista y el registro. */
  local?: { modo: 'compu' | 'historia' | 'examen'; repeticion: RepeticionPartida | null }
  /** Una partida online: la sala y tu asiento (la repetición la pone el servidor). */
  online?: { sala: string; codigo: string | null; asiento: number }
  /** La que arma el servidor con lo que registró la sala (si todavía estaba abierta). */
  repeticionServidor?: RepeticionPartida | null
  vista?: unknown
  registro?: string[]
}

/** Lo que manda la web. */
export interface ReporteEnviado {
  tipo: TipoReporte
  descripcion: string
  invitadoId: string
  apodo: string
  contexto: ContextoReporte
}

/** Un reporte en la lista del admin (sin la repetición, que se pide aparte). */
export interface ReporteListado {
  id: number
  fecha: string
  tipo: TipoReporte
  descripcion: string
  apodo: string
  cuentaId: string | null
  email: string | null
  invitadoId: string
  ruta: string | null
  version: string | null
  donde: string
  conRepeticion: boolean
}
