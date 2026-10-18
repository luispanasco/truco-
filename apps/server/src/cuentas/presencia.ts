/**
 * Quién está conectado y dónde (en memoria: se pierde al reiniciar el servidor, y está bien).
 * La web avisa que sigue abierta con un latido; las salas avisan quién entra y quién sale.
 * También guarda las invitaciones a una sala, que viajan en la respuesta al latido.
 */

/** Pasado este tiempo sin latido, alguien se da por desconectado. */
export const VIGENCIA_LATIDO_MS = 70_000
/** Una invitación que no se vio en este tiempo ya no se muestra. */
export const VIGENCIA_INVITACION_MS = 5 * 60_000

export type EstadoAmigo = 'desconectado' | 'conectado' | 'enSala' | 'jugando'

export interface Invitacion {
  de: string
  apodo: string
  sala: string
  hora: number
}

/** Lo que una sala dice de quien está sentado en ella. */
export interface EnSala {
  /** El código de la sala privada (null en la cola pública: ahí no se puede invitar ni unirse). */
  codigo: string | null
  jugando: () => boolean
}

export class Presencia {
  private latidos = new Map<string, number>()
  private salas = new Map<string, EnSala>()
  private invitaciones = new Map<string, Invitacion[]>()

  constructor(private readonly ahora: () => number = Date.now) {}

  latido(cuentaId: string) {
    this.latidos.set(cuentaId, this.ahora())
  }

  entrarASala(cuentaId: string, sala: EnSala) {
    this.salas.set(cuentaId, sala)
  }

  /** Sale de la sala, si es la que tenía anotada (pudo haber entrado a otra). */
  salirDeSala(cuentaId: string, sala: EnSala) {
    if (this.salas.get(cuentaId) === sala) this.salas.delete(cuentaId)
  }

  estado(cuentaId: string): { estado: EstadoAmigo; sala: string | null } {
    const sala = this.salas.get(cuentaId)
    if (sala) return { estado: sala.jugando() ? 'jugando' : 'enSala', sala: sala.jugando() ? null : sala.codigo }
    const ultimo = this.latidos.get(cuentaId)
    return { estado: ultimo !== undefined && this.ahora() - ultimo < VIGENCIA_LATIDO_MS ? 'conectado' : 'desconectado', sala: null }
  }

  /** La sala privada en la que está esperando, si hay. */
  salaDe(cuentaId: string): string | null {
    const sala = this.salas.get(cuentaId)
    return sala && !sala.jugando() ? sala.codigo : null
  }

  invitar(a: string, invitacion: Omit<Invitacion, 'hora'>) {
    const vigentes = this.vigentes(a).filter((i) => !(i.de === invitacion.de && i.sala === invitacion.sala))
    this.invitaciones.set(a, [...vigentes, { ...invitacion, hora: this.ahora() }].slice(-5))
  }

  /** Las invitaciones que tiene: se entregan una sola vez. */
  tomarInvitaciones(cuentaId: string): Invitacion[] {
    const vigentes = this.vigentes(cuentaId)
    this.invitaciones.delete(cuentaId)
    return vigentes
  }

  private vigentes(cuentaId: string): Invitacion[] {
    return (this.invitaciones.get(cuentaId) ?? []).filter((i) => this.ahora() - i.hora < VIGENCIA_INVITACION_MS)
  }
}
