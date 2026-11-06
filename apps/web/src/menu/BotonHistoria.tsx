import { useEffect } from 'react'
import {
  buscarDepartamento,
  codificarAvatar,
  DEPARTAMENTOS,
  departamentoSiguiente,
  departamentosCompletos,
  HISTORIAS,
  PERSONAJES,
} from '@truco/shared'
import { Avatar } from '../componentes/Avatar'
import { cargarHistoria, useHistoria } from '../cuenta/historia'
import '../estilos-departamentos.css'

/**
 * La entrada al modo historia en la pantalla Jugar: grande, con el fondo del departamento donde
 * seguís (al principio, Montevideo), su rival asomando y cuánto llevás recorrido.
 */
export function BotonHistoria({ alTocar }: { alTocar: () => void }) {
  const progreso = useHistoria((s) => s.progreso)
  useEffect(() => void cargarHistoria().catch(() => {}), [])
  const siguiente = progreso ? departamentoSiguiente(progreso) : 'montevideo'
  const dep = buscarDepartamento(siguiente ?? 'montevideo')!
  const jefe = PERSONAJES.find((p) => p.id === HISTORIAS[dep.id]?.jefe)
  const completos = progreso ? departamentosCompletos(progreso) : 0
  const empezaste = progreso !== null && Object.keys(progreso).length > 0
  const detalle =
    siguiente === null
      ? '¡Recorriste todo Uruguay!'
      : empezaste
        ? `Seguí en ${dep.nombre}: ${jefe?.nombre ?? 'tu rival'} te espera`
        : `Arrancá en ${dep.nombre}: ${jefe?.nombre ?? 'tu rival'} te espera`
  return (
    <button type="button" className="boton-historia-grande" data-fondo={dep.id} onClick={alTocar}>
      <span className="boton-historia-texto">
        <small>Recorré Uruguay</small>
        <strong>Modo historia</strong>
        <span>{detalle}</span>
        <span className="boton-historia-avance">
          <span className="boton-historia-barra" aria-hidden="true">
            <span style={{ width: `${(completos / DEPARTAMENTOS.length) * 100}%` }} />
          </span>
          {completos} de {DEPARTAMENTOS.length} departamentos
        </span>
      </span>
      {jefe && (
        <span className="boton-historia-rival" aria-hidden="true">
          <Avatar codigo={codificarAvatar(jefe.avatar)} encuadre="busto" />
        </span>
      )}
    </button>
  )
}
