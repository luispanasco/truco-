import { useRecorrido } from './bandera'

/** En Ajustes: vuelve a abrir el recorrido de bienvenida con Don Queiroz. */
export function VerRecorrido() {
  const ver = useRecorrido((s) => s.ver)
  return (
    <button type="button" className="boton boton-secundario" onClick={ver}>
      Ver el recorrido de nuevo
    </button>
  )
}
