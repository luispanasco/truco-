import { appendFile, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Accion, ConfigSala, Equipo } from '@truco/engine'
import type { MensajeChat } from '@truco/shared'

/**
 * Registro de una partida: con la semilla, la configuración y las acciones se
 * reproduce entera con el motor, para repeticiones y para revisar reclamos.
 */
export interface RegistroPartida {
  sala: string
  inicio: string
  fin: string | null
  semilla: number
  /** Asiento que repartió la primera mano (en las revanchas va rotando). */
  reparte: number
  config: ConfigSala
  jugadores: { asiento: number; apodo: string; tipo: 'humano' | 'bot'; invitadoId: string | null }[]
  acciones: { ms: number; asiento: number; accion: Accion; porBot: boolean }[]
  resultado: { ganador: Equipo; puntos: [number, number] } | { abandonada: true } | null
}

export interface Reporte {
  sala: string
  hora: string
  de: { asiento: number; invitadoId: string | null }
  a: { asiento: number; invitadoId: string | null; apodo: string }
  motivo: string
  /** Últimos mensajes del reportado, para tener contexto. */
  mensajes: MensajeChat[]
}

export class Archivo {
  constructor(private readonly dir: string) {}

  async guardarPartida(r: RegistroPartida): Promise<void> {
    const dir = join(this.dir, 'partidas')
    await mkdir(dir, { recursive: true })
    const nombre = `${r.inicio.replace(/[:.]/g, '-')}-${r.sala}.json`
    await writeFile(join(dir, nombre), JSON.stringify(r, null, 1))
  }

  async guardarReporte(r: Reporte): Promise<void> {
    await mkdir(this.dir, { recursive: true })
    await appendFile(join(this.dir, 'reportes.jsonl'), JSON.stringify(r) + '\n')
  }
}
