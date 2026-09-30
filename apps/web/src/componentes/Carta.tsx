import type { Carta as TCarta, Palo } from '@truco/engine'

/** Provisoria (tramo D1): número y símbolo del palo. En el tramo D2 se reemplaza por el SVG definitivo. */
const SIMBOLO: Record<Palo, string> = { espada: '🗡️', basto: '🪵', oro: '🪙', copa: '🏆' }
const NOMBRE_PALO: Record<Palo, string> = { espada: 'espadas', basto: 'bastos', oro: 'oros', copa: 'copas' }

interface Props {
  carta?: TCarta
  oculta?: boolean
  tam?: 'chica' | 'mesa' | 'normal' | 'grande'
  jugable?: boolean
  resaltada?: boolean
  ganadora?: boolean
  alTocar?: () => void
}

export function Carta({ carta, oculta, tam = 'normal', jugable, resaltada, ganadora, alTocar }: Props) {
  const clases = ['carta', `carta-${tam}`, oculta || !carta ? 'carta-dorso' : `palo-${carta.palo}`]
  if (jugable) clases.push('carta-jugable')
  if (resaltada) clases.push('carta-resaltada')
  if (ganadora) clases.push('carta-ganadora')
  if (oculta || !carta) return <div className={clases.join(' ')} aria-label="carta boca abajo" />
  const etiqueta = `${carta.numero} de ${NOMBRE_PALO[carta.palo]}`
  const contenido = (
    <>
      <span className="carta-numero">{carta.numero}</span>
      <span className="carta-palo">{SIMBOLO[carta.palo]}</span>
      <span className="carta-numero carta-numero-abajo">{carta.numero}</span>
    </>
  )
  return alTocar ? (
    <button type="button" className={clases.join(' ')} onClick={alTocar} disabled={!jugable} aria-label={`Jugar el ${etiqueta}`}>
      {contenido}
    </button>
  ) : (
    <div className={clases.join(' ')} aria-label={etiqueta}>
      {contenido}
    </div>
  )
}
