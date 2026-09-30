/** Un sí/no con título y explicación corta, como los ajustes del celular. */
export function Interruptor({
  activo,
  alCambiar,
  titulo,
  detalle,
}: {
  activo: boolean
  alCambiar: (v: boolean) => void
  titulo: string
  detalle: string
}) {
  return (
    <label className="interruptor">
      <span>
        <strong>{titulo}</strong>
        <small>{detalle}</small>
      </span>
      <input type="checkbox" role="switch" checked={activo} onChange={(e) => alCambiar(e.target.checked)} />
      <span className="interruptor-pista" aria-hidden="true" />
    </label>
  )
}
