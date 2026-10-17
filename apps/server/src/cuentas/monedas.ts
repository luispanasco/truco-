import type { Base } from './base'

/**
 * Cuánto se gana. Los montos se ajustan con datos reales de uso (ver la especificación,
 * "Economía"); el tope diario es para que no convenga juntar monedas jugando contra uno mismo.
 */
export const ECONOMIA = {
  /** Por terminar una partida. */
  partida: 10,
  /** Extra por ganarla. */
  victoria: 10,
  /** La primera partida terminada del día. */
  bonusDiario: 30,
  /** Contra bots se cobra esta parte de la partida y la victoria (el bonus diario va entero). */
  factorBots: 0.3,
  /** Lo máximo que se gana jugando en un día (sin contar compras ni ajustes). */
  topeDiario: 300,
}

/** Uruguay no tiene horario de verano desde 2015: el día va de medianoche a medianoche UTC−3. */
const HUSO_URUGUAY_MS = -3 * 60 * 60 * 1000

/** Cuándo empezó (en hora de Uruguay) el día de `ahora`. */
export function inicioDelDia(ahora: Date): Date {
  const local = ahora.getTime() + HUSO_URUGUAY_MS
  return new Date(local - (((local % 86_400_000) + 86_400_000) % 86_400_000) - HUSO_URUGUAY_MS)
}

export type TipoMovimiento = 'partida' | 'victoria' | 'bonusDiario' | 'compra' | 'ajuste'

export interface Movimiento {
  tipo: TipoMovimiento
  monto: number
}

/** Quién cobra por una partida terminada. Quien abandonó no está acá: no cobra nada. */
export interface Cobro {
  cuentaId: string
  gano: boolean
  /** Si todos los rivales eran personas. Si no, se cobra la parte de bots. */
  contraGente: boolean
}

export async function saldo(base: Base, cuentaId: string): Promise<number> {
  const [r] = await base.consultar<{ saldo: number }>('select coalesce(sum(monto), 0)::int as saldo from movimientos where cuenta_id = $1', [cuentaId])
  return r?.saldo ?? 0
}

export async function ultimosMovimientos(base: Base, cuentaId: string, cuantos = 20) {
  return base.consultar<Movimiento & { creado: string }>(
    'select tipo, monto, creado from movimientos where cuenta_id = $1 order by id desc limit $2',
    [cuentaId, cuantos],
  )
}

/**
 * Paga una partida terminada (`partida` la identifica: si se vuelve a pagar, no se cobra dos
 * veces). Devuelve lo que cobró y cómo quedó el saldo.
 */
export async function pagarPartida(base: Base, partida: string, c: Cobro, ahora = new Date()): Promise<{ movimientos: Movimiento[]; saldo: number }> {
  return base.transaccion(async (b) => {
    // Una partida a la vez por cuenta, así el tope del día se cuenta bien.
    await b.consultar('select id from cuentas where id = $1 for update', [c.cuentaId])
    const desde = inicioDelDia(ahora)
    const hoy = await b.consultar<{ tipo: TipoMovimiento; monto: number; partida: string | null }>(
      `select tipo, monto, partida from movimientos
       where cuenta_id = $1 and creado >= $2 and tipo in ('partida', 'victoria', 'bonusDiario')`,
      [c.cuentaId, desde.toISOString()],
    )
    const movimientos: Movimiento[] = []
    if (!hoy.some((m) => m.partida === partida)) {
      const factor = c.contraGente ? 1 : ECONOMIA.factorBots
      const deseados: Movimiento[] = [
        { tipo: 'partida', monto: Math.round(ECONOMIA.partida * factor) },
        ...(c.gano ? [{ tipo: 'victoria' as const, monto: Math.round(ECONOMIA.victoria * factor) }] : []),
        ...(hoy.some((m) => m.tipo === 'bonusDiario') ? [] : [{ tipo: 'bonusDiario' as const, monto: ECONOMIA.bonusDiario }]),
      ]
      let queda = ECONOMIA.topeDiario - hoy.reduce((s, m) => s + m.monto, 0)
      for (const m of deseados) {
        const monto = Math.min(m.monto, Math.max(0, queda))
        if (monto <= 0) continue
        queda -= monto
        movimientos.push({ tipo: m.tipo, monto })
        await b.consultar('insert into movimientos (cuenta_id, monto, tipo, partida, creado) values ($1, $2, $3, $4, $5)', [
          c.cuentaId,
          monto,
          m.tipo,
          partida,
          ahora.toISOString(),
        ])
      }
    }
    return { movimientos, saldo: await saldo(b, c.cuentaId) }
  })
}
