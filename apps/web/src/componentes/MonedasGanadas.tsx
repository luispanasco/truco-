import type { MovimientoMonedas } from '@truco/shared'
import { useJuego } from '../estado'

const TEXTO: Record<MovimientoMonedas['tipo'], string> = {
  partida: 'Partida terminada',
  victoria: 'Por ganarla',
  bonusDiario: 'Primera del día',
  compra: 'Compra',
  ajuste: 'Ajuste',
}

/** Al terminar la partida, lo que cobraste (si entraste con tu cuenta) y cómo quedó tu saldo. */
export function MonedasGanadas() {
  const monedas = useJuego((s) => s.monedas)
  const elo = useJuego((s) => s.elo)
  if (!monedas) return null
  const diferencia = elo ? elo.despues - elo.antes : 0
  const total = monedas.movimientos.reduce((s, m) => s + m.monto, 0)
  return (
    <div className="fin-monedas" aria-label="Monedas">
      {total > 0 ? (
        <>
          <p className="fin-monedas-total">
            <span aria-hidden="true">🪙</span> +{total}
          </p>
          <ul>
            {monedas.movimientos.map((m) => (
              <li key={m.tipo}>
                {TEXTO[m.tipo]} <strong>+{m.monto}</strong>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>Por hoy ya juntaste todas las monedas que se pueden ganar.</p>
      )}
      <p className="fin-monedas-saldo">Tenés {monedas.saldo} monedas</p>
      {elo && (
        <p className="fin-elo">
          Elo {elo.formato}: {elo.antes} → <strong>{elo.despues}</strong> ({diferencia >= 0 ? '+' : ''}
          {diferencia})
        </p>
      )}
    </div>
  )
}
