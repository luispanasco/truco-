import { useNavigate } from 'react-router'
import { codificarAvatar, LECCIONES, MAESTRO, proximaLeccion } from '@truco/shared'
import { Avatar } from '../componentes/Avatar'
import { useTutorial } from './progreso'
import '../estilos-tutorial.css'

/**
 * La entrada al tutorial en Jugar: si nunca lo empezaste, Don Queiroz te invita ("¿Primera vez?");
 * si ya arrancaste, dice por dónde vas.
 */
export function TarjetaAprender() {
  const navegar = useNavigate()
  const progreso = useTutorial((s) => s.progreso)
  const hechas = LECCIONES.filter((l) => progreso[l.id] !== undefined).length
  const proxima = proximaLeccion(progreso)
  const primera = hechas === 0
  return (
    <button type="button" className={`tarjeta-aprender${primera ? ' primera' : ''}`} onClick={() => navegar('/aprender')}>
      <span className="tarjeta-aprender-cara" aria-hidden="true">
        <Avatar codigo={codificarAvatar(MAESTRO.avatar)} encuadre="cara" />
      </span>
      <span className="tarjeta-aprender-texto">
        <strong>{primera ? '¿Primera vez? Aprendé a jugar' : 'Aprendé a jugar'}</strong>
        <small>
          {primera
            ? `${MAESTRO.nombre} te enseña desde cero, con ejemplos.`
            : `${hechas} de ${LECCIONES.length} lecciones${proxima ? ` · Sigue: ${proxima.titulo}` : ''}`}
        </small>
      </span>
    </button>
  )
}
