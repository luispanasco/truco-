import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import {
  buscarDepartamento,
  codificarAvatar,
  DEPARTAMENTO_INICIAL,
  DEPARTAMENTOS,
  departamentoSiguiente,
  departamentosCompletos,
  HISTORIAS,
  PERSONAJES,
  type IdDepartamento,
} from '@truco/shared'
import { Avatar } from '../componentes/Avatar'
import { useCuenta } from '../cuenta/cuenta'
import { cargarHistoria, useHistoria } from '../cuenta/historia'

/** Cada cuánto pasa al departamento siguiente el carrusel de fondos. */
const PASO_MS = 4500

/** El paisaje del departamento, el vertical (la portada es más alta que ancha). */
const fondo = (id: string) => `/departamentos/${id}-vertical.webp`

/**
 * La portada del modo historia en Jugar: de fondo pasan los paisajes de los departamentos (con un
 * zoom lento, como un documental), con el nombre del que se ve; adelante, cuánto recorriste, el
 * rival que te toca y "Seguir en…". El carrusel anda solo mientras la portada está a la vista.
 */
export function PortadaHistoria({ activa, alSeguir, alVerMapa }: { activa: boolean; alSeguir: (id: IdDepartamento) => void; alVerMapa: () => void }) {
  const sinMovimiento = useReducedMotion() ?? false
  const adentro = useCuenta((s) => s.estado === 'adentro')
  const admin = useCuenta((s) => s.estado === 'adentro' && s.cuenta?.admin === true)
  const progreso = useHistoria((s) => s.progreso)
  useEffect(() => {
    if (adentro) void cargarHistoria().catch(() => {})
  }, [adentro])
  const siguiente = progreso ? departamentoSiguiente(progreso, admin) : DEPARTAMENTO_INICIAL
  const dep = buscarDepartamento(siguiente ?? DEPARTAMENTO_INICIAL)!
  const jefe = PERSONAJES.find((p) => p.id === HISTORIAS[dep.id]?.jefe)
  const completos = progreso ? departamentosCompletos(progreso) : 0
  const empezaste = progreso !== null && Object.keys(progreso).length > 0
  // El carrusel arranca por el que sigue y después recorre todos.
  const orden = useMemo(() => [dep.id, ...DEPARTAMENTOS.map((d) => d.id).filter((id) => id !== dep.id)], [dep.id])
  const [k, setK] = useState(0)
  const actual = orden[k % orden.length]!

  useEffect(() => {
    if (!activa || sinMovimiento) return
    // El siguiente, ya pedido: así el cambio no parpadea.
    const img = new Image()
    img.src = fondo(orden[(k + 1) % orden.length]!)
    const t = setTimeout(() => setK((x) => x + 1), PASO_MS)
    return () => clearTimeout(t)
  }, [activa, sinMovimiento, k, orden])

  return (
    <section className="portada-historia" aria-label="Modo historia">
      <div className="portada-historia-fondos" aria-hidden="true">
        <AnimatePresence initial={false}>
          <motion.img
            key={actual}
            src={fondo(actual)}
            alt=""
            className="portada-historia-fondo"
            initial={{ opacity: 0, scale: 1.12 }}
            animate={{ opacity: 1, scale: sinMovimiento ? 1.12 : 1 }}
            exit={{ opacity: 0 }}
            transition={{ opacity: { duration: 1.1 }, scale: { duration: (PASO_MS + 1500) / 1000, ease: 'linear' } }}
          />
        </AnimatePresence>
      </div>
      <span className="portada-historia-lugar" aria-live="polite">
        <span aria-hidden="true">📍</span> {buscarDepartamento(actual)?.nombre}
      </span>
      <div className="portada-historia-contenido">
        <small className="portada-historia-sobre">Recorré Uruguay</small>
        <h2>Modo historia</h2>
        <p>
          {siguiente === null
            ? completos === DEPARTAMENTOS.length
              ? '¡Recorriste todo Uruguay!'
              : 'Completaste todo lo que está abierto: muy pronto se suman más departamentos.'
            : `${empezaste ? 'Seguí' : 'Arrancá'} en ${dep.nombre}: ${jefe?.nombre ?? 'tu rival'} te espera.`}
        </p>
        <div className="portada-historia-avance">
          <span className="boton-historia-barra" aria-hidden="true">
            <span style={{ width: `${(completos / DEPARTAMENTOS.length) * 100}%` }} />
          </span>
          {completos} de {DEPARTAMENTOS.length} departamentos
        </div>
        <div className="portada-historia-botones">
          <button type="button" className="boton-jugar-grande" onClick={() => alSeguir(dep.id as IdDepartamento)}>
            {siguiente === null ? 'Ver el mapa' : `${empezaste ? 'Seguir' : 'Arrancar'} en ${dep.nombre}`}
          </button>
          <button type="button" className="boton boton-secundario" onClick={alVerMapa}>
            Ver el mapa
          </button>
        </div>
      </div>
      {jefe && (
        <span className="portada-historia-rival" aria-hidden="true">
          <Avatar codigo={codificarAvatar(jefe.avatar)} encuadre="busto" />
        </span>
      )}
    </section>
  )
}
