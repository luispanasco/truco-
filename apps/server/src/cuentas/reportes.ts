import {
  esTipoReporte,
  MAX_DESCRIPCION_REPORTE,
  MAX_REPORTES_POR_HORA,
  type ContextoReporte,
  type RepeticionPartida,
  type ReporteListado,
  type TipoReporte,
} from '@truco/shared'
import type { Base } from './base'
import { salasVivas } from '../salasVivas'

/** Un reporte que no se acepta (el motivo va a la persona). */
export class ReporteRechazo extends Error {
  constructor(
    motivo: string,
    readonly estado = 400,
  ) {
    super(motivo)
  }
}

const HORA_MS = 60 * 60 * 1000

/** Cuántos reportes mandó cada IP o invitado en la última hora (en memoria: alcanza para frenar el abuso). */
export class LimiteReportes {
  private veces = new Map<string, number[]>()
  constructor(
    private readonly tope = MAX_REPORTES_POR_HORA,
    private readonly ahora = () => Date.now(),
  ) {}

  /** Anota uno para cada clave; false si alguna ya llegó al tope (y entonces no anota nada). */
  permitir(claves: string[]): boolean {
    const t = this.ahora()
    const vigentes = claves.map((c) => (this.veces.get(c) ?? []).filter((x) => t - x < HORA_MS))
    if (vigentes.some((v) => v.length >= this.tope)) return false
    claves.forEach((c, i) => this.veces.set(c, [...vigentes[i]!, t]))
    return true
  }
}

const texto = (x: unknown, max: number) => (typeof x === 'string' ? x.trim().slice(0, max) : '')

/**
 * Guarda un reporte. Con una partida online, el servidor le agrega la repetición de la sala (si
 * sigue abierta y quien reporta jugó en ella). Devuelve el id.
 */
export async function guardarReporte(base: Base, cuerpo: unknown, cuentaId: string | null): Promise<number> {
  const b = (cuerpo ?? {}) as Record<string, unknown>
  if (!esTipoReporte(b.tipo)) throw new ReporteRechazo('Elegí qué tipo de problema es')
  const tipo: TipoReporte = b.tipo
  if (b.descripcion !== undefined && typeof b.descripcion !== 'string') throw new ReporteRechazo('La descripción no es válida')
  if (typeof b.descripcion === 'string' && b.descripcion.length > MAX_DESCRIPCION_REPORTE) {
    throw new ReporteRechazo(`La descripción es muy larga (hasta ${MAX_DESCRIPCION_REPORTE} letras)`)
  }
  const invitadoId = texto(b.invitadoId, 64)
  if (invitadoId.length < 8) throw new ReporteRechazo('Falta el ID de invitado')
  const apodo = texto(b.apodo, 40) || 'Sin apodo'
  const contexto = (b.contexto && typeof b.contexto === 'object' && !Array.isArray(b.contexto) ? b.contexto : {}) as ContextoReporte
  const online = contexto.online
  if (online && typeof online.sala === 'string') {
    contexto.repeticionServidor = salasVivas.get(online.sala)?.repeticionPara({ invitadoId, cuentaId }) ?? null
  }
  // Si la cuenta no existe todavía (nunca entró por la API), se guarda sin cuenta.
  const [cuenta] = cuentaId ? await base.consultar<{ id: string }>('select id from cuentas where id = $1', [cuentaId]) : []
  const [f] = await base.consultar<{ id: number }>(
    'insert into reportes (tipo, descripcion, cuenta_id, invitado_id, apodo, contexto) values ($1, $2, $3, $4, $5, $6) returning id',
    [tipo, texto(b.descripcion, MAX_DESCRIPCION_REPORTE), cuenta?.id ?? null, invitadoId, apodo, JSON.stringify(contexto)],
  )
  return Number(f!.id)
}

interface FilaReporte {
  id: number
  fecha: Date | string
  tipo: TipoReporte
  descripcion: string
  cuenta_id: string | null
  email: string | null
  invitado_id: string
  apodo: string
  ruta: string | null
  version: string | null
  modo: string | null
  sala: string | null
  con_repeticion: boolean
}

/** Los últimos reportes, del más nuevo al más viejo (sin el contexto entero: pesa). */
export async function listarReportes(base: Base, limite = 200): Promise<ReporteListado[]> {
  const filas = await base.consultar<FilaReporte>(
    `select r.id, r.fecha, r.tipo, r.descripcion, r.cuenta_id, c.email, r.invitado_id, r.apodo,
            r.contexto->>'ruta' as ruta, r.contexto->>'version' as version,
            r.contexto->'local'->>'modo' as modo, r.contexto->'online'->>'sala' as sala,
            (jsonb_typeof(r.contexto->'local'->'repeticion') = 'object'
              or jsonb_typeof(r.contexto->'repeticionServidor') = 'object') as con_repeticion
     from reportes r left join cuentas c on c.id = r.cuenta_id
     order by r.id desc limit $1`,
    [limite],
  )
  const MODOS: Record<string, string> = { compu: 'Contra la compu', historia: 'Modo historia', examen: 'Examen del tutorial' }
  return filas.map((f) => ({
    id: Number(f.id),
    fecha: new Date(f.fecha).toISOString(),
    tipo: f.tipo,
    descripcion: f.descripcion,
    apodo: f.apodo,
    cuentaId: f.cuenta_id,
    email: f.email,
    invitadoId: f.invitado_id,
    ruta: f.ruta,
    version: f.version,
    donde: f.modo ? (MODOS[f.modo] ?? f.modo) : f.sala ? `Online (sala ${f.sala})` : 'Fuera de una partida',
    conRepeticion: f.con_repeticion === true,
  }))
}

/** Un reporte entero (con su contexto). */
export async function reporteCompleto(base: Base, id: unknown): Promise<Record<string, unknown>> {
  const n = typeof id === 'string' ? Number(id) : id
  if (typeof n !== 'number' || !Number.isSafeInteger(n) || n <= 0) throw new ReporteRechazo('Ese reporte no existe', 404)
  const [f] = await base.consultar<Record<string, unknown>>('select * from reportes where id = $1', [n])
  if (!f) throw new ReporteRechazo('Ese reporte no existe', 404)
  return f
}

/** La partida de un reporte, para el visor de repeticiones: la del servidor (online) o la local. */
export async function repeticionDeReporte(base: Base, id: unknown): Promise<RepeticionPartida> {
  const contexto = (await reporteCompleto(base, id)).contexto as ContextoReporte
  const r = contexto.repeticionServidor ?? contexto.local?.repeticion
  if (!r) throw new ReporteRechazo('Ese reporte no trae la partida', 404)
  return r
}
