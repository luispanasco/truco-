import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { codificarAvatar, MAESTRO } from '@truco/shared'
import { Avatar } from '../componentes/Avatar'
import { useJuego } from '../estado'
import { useTutorial } from './progreso'
import '../estilos-tutorial.css'

const CARA_MAESTRO = codificarAvatar(MAESTRO.avatar)
/** Lo que se queda el cartel del principio si no lo tocás. */
const CARTEL_MS = 7000

/** Don Queiroz chiquito con lo que dice (en la mesa del examen). */
function Dice({ texto, clase = '' }: { texto: string; clase?: string }) {
  return (
    <div className={`examen-dice ${clase}`}>
      <span className="examen-cara" aria-hidden="true">
        <Avatar codigo={CARA_MAESTRO} encuadre="cara" />
      </span>
      <p>
        <strong>{MAESTRO.nombre}:</strong> {texto}
      </p>
    </div>
  )
}

/** Al empezar el examen: Don Queiroz se sienta a mirar. Se va solo (o al tocarlo). */
export function CartelExamen() {
  const [visto, setVisto] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisto(true), CARTEL_MS)
    return () => clearTimeout(t)
  }, [])
  if (visto) return null
  return (
    <div className="examen-cartel" role="status" onClick={() => setVisto(true)}>
      <Dice texto="¡Arrancó el examen! A 20 puntos. Las ayudas te marcan las piezas y las matas. Yo te miro, eh." />
      <button type="button" className="examen-cerrar" aria-label="Cerrar el cartel de Don Queiroz">
        ✕
      </button>
    </div>
  )
}

/**
 * El final del examen, en el cartel del final. Si ganaste te recibís: la lección queda hecha con 3
 * estrellas y se va al diploma. Si perdiste no se anota: ánimo y revancha.
 */
export function FinExamen({ ganamos, revancha }: { ganamos: boolean; revancha: () => void }) {
  const navegar = useNavigate()
  const terminar = useTutorial((s) => s.terminar)
  useEffect(() => {
    if (ganamos) terminar('examen', 3)
  }, [ganamos, terminar])
  const ir = (a: string) => {
    useJuego.getState().salir()
    navegar(a)
  }
  return (
    <>
      <Dice
        clase="examen-fin"
        texto={
          ganamos
            ? '¡Eso es jugar al truco, gurí! Te ganaste el diploma.'
            : '¡Casi! Así se aprende: perdiendo unas cuantas. Dale que la revancha sale mejor.'
        }
      />
      <div className="modal-botones">
        {ganamos ? (
          <button type="button" className="boton boton-grande" onClick={() => ir('/aprender/diploma')}>
            Ver tu diploma
          </button>
        ) : (
          <button type="button" className="boton boton-grande" onClick={revancha}>
            Revancha
          </button>
        )}
        <button type="button" className="boton boton-secundario" onClick={() => ir('/aprender')}>
          Volver a las lecciones
        </button>
      </div>
    </>
  )
}
