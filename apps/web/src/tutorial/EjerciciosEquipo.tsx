import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import type { Senia } from '@truco/bots'
import { codificarAvatar, MAESTRO } from '@truco/shared'
import { Avatar } from '../componentes/Avatar'
import { useJuego } from '../estado'
import { conexionExamen } from '../menu/contraLaCompu'
import { leerPerfil } from '../perfil'
import type { Azar } from './cartas'
import { QUE_ANUNCIA, SENIAS_TUTORIAL } from './lecciones-equipo'

/** Como en Ejercicios.tsx: lo que dice Don Queiroz y el aviso al terminar (con los errores). */
interface Props {
  alDecir: (texto: string) => void
  alListo: (errores: number) => void
  azar?: Azar
}

const CARA_MAESTRO = codificarAvatar(MAESTRO.avatar)
/** Cada cuánto repite la seña (dura 1,7 s y descansa un poco). */
const REPETIR_MS = 2600

/** La cara de Don Queiroz haciendo una seña, una y otra vez (con `vez` vuelve a empezar). */
function CaraConSenia({ senia, vez = 0 }: { senia: Senia; vez?: number }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setN((x) => x + 1), REPETIR_MS)
    return () => clearInterval(t)
  }, [senia, vez])
  return (
    <div className="equipo-cara" role="img" aria-label="Don Queiroz haciendo una seña">
      <Avatar key={`${senia}-${vez}-${n}`} codigo={CARA_MAESTRO} gesto={senia} encuadre="cara" clase="cara-grande" />
    </div>
  )
}

/** Una seña explicada: no hay nada que hacer, solo mirar. */
export function GestoMaestro({ senia, alListo }: Props & { senia: Senia }) {
  useEffect(() => alListo(0), []) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="tutorial-ejercicio">
      <CaraConSenia senia={senia} />
      <p className="tutorial-leyenda">{QUE_ANUNCIA[senia]}</p>
    </div>
  )
}

/** La mesa de arriba. Los lugares van en el orden en que se juega, empezando por el de arriba. */
const LUGARES: Record<4 | 6, [number, number][]> = {
  4: [
    [50, 14],
    [14, 50],
    [50, 86],
    [86, 50],
  ],
  6: [
    [50, 12],
    [17, 31],
    [17, 69],
    [50, 88],
    [83, 69],
    [83, 31],
  ],
}

export function MesaEquipo({ jugadores, marcar, alListo }: Props & { jugadores: 4 | 6; marcar: 'equipos' | 'pie' }) {
  useEffect(() => alListo(0), []) // eslint-disable-line react-hooks/exhaustive-deps
  const lugares = LUGARES[jugadores]
  // Vos, abajo. Tu equipo es el de los lugares pares contando desde vos.
  const yo = jugadores === 4 ? 2 : 3
  const nombre = (i: number) => (i === yo ? 'Vos' : (i - yo) % 2 === 0 ? 'Compañero' : 'Rival')
  const pie = (i: number) => marcar === 'pie' && i >= jugadores - 2
  return (
    <div className="tutorial-ejercicio">
      <div className={`equipo-mesa n-${jugadores}`} role="list" aria-label={marcar === 'pie' ? 'La mesa, en el orden en que se juega' : 'La mesa, con los dos equipos'}>
        {lugares.map(([x, y], i) => {
          const nuestro = (i - yo) % 2 === 0
          return (
            <div
              key={i}
              role="listitem"
              className={`equipo-lugar ${nuestro ? 'nosotros' : 'ellos'}${i === yo ? ' yo' : ''}${pie(i) ? ' pie' : ''}`}
              style={{ left: `${x}%`, top: `${y}%` }}
            >
              <span className="equipo-ficha">{marcar === 'pie' ? i + 1 : nuestro ? 'N' : 'E'}</span>
              <small>
                {nombre(i)}
                {marcar === 'pie' && i === 0 ? ' · mano' : ''}
                {marcar === 'pie' && i === jugadores - 1 ? ' · reparte' : ''}
              </small>
              {pie(i) && <b className="equipo-pie">PIE</b>}
            </div>
          )
        })}
        <span className="equipo-pano" aria-hidden="true" />
      </div>
      <p className="tutorial-leyenda">{marcar === 'pie' ? 'Los números: el orden en que se juega' : 'Nosotros (N) y ellos (E), intercalados'}</p>
    </div>
  )
}

/** Mezcla (Fisher-Yates) con el azar dado. */
function mezclar<T>(lista: readonly T[], azar: Azar): T[] {
  const a = [...lista]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a
}

/** Una ronda: la seña y tres opciones (la buena y dos más), mezcladas. Sin repetir la anterior. */
function ronda(azar: Azar, antes: Senia | null): { senia: Senia; opciones: Senia[] } {
  const senia = mezclar(SENIAS_TUTORIAL.filter((s) => s !== antes), azar)[0]!
  const otras = mezclar(SENIAS_TUTORIAL.filter((s) => s !== senia), azar).slice(0, 2)
  return { senia, opciones: mezclar([senia, ...otras], azar) }
}

/** Rondas de "¿qué seña te hizo?": Don Queiroz hace el gesto y elegís qué anuncia. */
export function AdivinarSenia({ rondas, alDecir, alListo, azar = Math.random }: Props & { rondas: number }) {
  const [n, setN] = useState(0)
  const [actual, setActual] = useState(() => ronda(azar, null))
  const [respuesta, setRespuesta] = useState<Senia | null>(null)
  const [errores, setErrores] = useState(0)
  const ultima = n === rondas - 1
  const elegir = (s: Senia) => {
    setRespuesta(s)
    const bien = s === actual.senia
    const err = bien ? errores : errores + 1
    setErrores(err)
    alDecir(bien ? `¡Bien! ${QUE_ANUNCIA[s]}.` : `No… Esa seña es ${QUE_ANUNCIA[actual.senia].toLowerCase()}.`)
    if (ultima) alListo(err)
  }
  const otra = () => {
    setN((x) => x + 1)
    setActual(ronda(azar, actual.senia))
    setRespuesta(null)
    alDecir('¿Y esta?')
  }
  return (
    <div className="tutorial-ejercicio">
      <p className="tutorial-ronda">
        {n + 1} de {rondas}
      </p>
      <CaraConSenia senia={actual.senia} vez={n} />
      <div className="tutorial-opciones" role="group" aria-label="¿Qué te dijo?">
        {actual.opciones.map((s) => (
          <button
            key={s}
            type="button"
            className={`boton ${respuesta !== null && s === actual.senia ? 'tutorial-opcion-bien' : respuesta === s ? 'equipo-opcion-mal' : 'boton-secundario'}`}
            disabled={respuesta !== null}
            onClick={() => elegir(s)}
          >
            {QUE_ANUNCIA[s]}
          </button>
        ))}
      </div>
      {respuesta !== null && !ultima && (
        <button type="button" className="boton" onClick={otra}>
          Otra seña
        </button>
      )}
    </div>
  )
}

/** El examen: lo que se juega y el botón para ir a la mesa. */
export function EmpezarExamen() {
  const navegar = useNavigate()
  const jugar = () => {
    useJuego.getState().conectar(conexionExamen(leerPerfil()))
    navegar('/mesa')
  }
  return (
    <div className="tutorial-ejercicio">
      <ul className="equipo-examen-datos">
        <li>🃏 Mano a mano contra la compu</li>
        <li>🌱 Nivel fácil</li>
        <li>🎯 A 20 puntos (10 malas y 10 buenas)</li>
        <li>💡 Con las ayudas prendidas</li>
      </ul>
      <button type="button" className="boton boton-grande" onClick={jugar}>
        ¡A la mesa!
      </button>
    </div>
  )
}
