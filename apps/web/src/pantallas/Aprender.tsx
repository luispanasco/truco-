import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { motion, useReducedMotion } from 'motion/react'
import { codificarAvatar, estrellasPorErrores, LECCIONES, leccionAbierta, MAESTRO, proximaLeccion, type IdLeccion } from '@truco/shared'
import { Carta } from '../componentes/Carta'
import { Figura } from '../historia/Escena'
import { Buscar, Comparar, Muestra, Ordenar, Pregunta } from '../tutorial/Ejercicios'
import { Cargar, TieneFlor } from '../tutorial/EjerciciosTanto'
import { AdivinarSenia, EmpezarExamen, GestoMaestro, MesaEquipo } from '../tutorial/EjerciciosEquipo'
import { AL_TERMINAR, pasosDe, type Paso, type Pizarra } from '../tutorial/lecciones'
import { useTutorial } from '../tutorial/progreso'
import { JugarManoGuiada } from '../tutorial/ManoGuiada'
import '../estilos-historia.css'
import '../estilos-tutorial.css'

/** Don Queiroz con su globo: lo que dice cambia con cada paso (y se anuncia). */
export function Maestro({ texto, clave }: { texto: string; clave: string }) {
  const quieto = useReducedMotion() ?? false
  return (
    <div className="tutorial-maestro">
      <Figura codigo={codificarAvatar(MAESTRO.avatar)} nombre={MAESTRO.nombre} habla quieto={quieto} />
      {/* Con cada frase nueva el globo entra de nuevo (la clave cambia). */}
      <motion.div
        key={clave}
        className="tutorial-globo"
        role="status"
        initial={quieto ? false : { opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.18 }}
      >
        <p>{texto}</p>
      </motion.div>
    </div>
  )
}

/** Las estrellas de una lección (las que faltan, apagadas). */
function Estrellas({ cuantas, grandes = false }: { cuantas: number; grandes?: boolean }) {
  return (
    <span className={`tutorial-estrellas${grandes ? ' grandes' : ''}`} aria-label={`${cuantas} de 3 estrellas`}>
      {[1, 2, 3].map((i) => (
        <span key={i} aria-hidden="true" className={i <= cuantas ? 'llena' : ''}>
          ★
        </span>
      ))}
    </span>
  )
}

/**
 * "Aprendé a jugar": la ruta de lecciones con Don Queiroz. Cada una se abre al terminar la
 * anterior; las que todavía no están dicen "Próximamente".
 */
export function Aprender() {
  const navegar = useNavigate()
  const progreso = useTutorial((s) => s.progreso)
  const proxima = proximaLeccion(progreso)
  const hechas = LECCIONES.filter((l) => progreso[l.id] !== undefined).length
  const saludo =
    hechas === 0
      ? '¡Bienvenido, gurí! Arrancamos por el principio: tocá la primera lección.'
      : progreso.examen !== undefined
        ? '¡Ya te recibiste de truquero! Repasá lo que quieras, que la puerta está abierta.'
        : proxima
        ? `Vamos bien. Te espera "${proxima.titulo}".`
        : 'Por ahora es todo lo que hay. Las lecciones que faltan las estoy preparando.'
  return (
    <main className="historia tutorial">
      <button type="button" className="historia-volver" onClick={() => navegar('/')}>
        <span aria-hidden="true">‹</span> Inicio
      </button>
      <header className="historia-cabecera">
        <h1>Aprendé a jugar</h1>
        <p className="historia-avance">
          {hechas} de {LECCIONES.length} lecciones
        </p>
      </header>
      <Maestro texto={saludo} clave="saludo" />
      <ol className="tutorial-ruta">
        {LECCIONES.map((l, i) => {
          const estrellas = progreso[l.id]
          const abierta = leccionAbierta(progreso, l.id)
          const estado = estrellas !== undefined ? 'hecha' : abierta ? 'abierta' : l.disponible ? 'cerrada' : 'pronto'
          return (
            <li key={l.id} className={`tutorial-parada ${estado}${proxima?.id === l.id ? ' proxima' : ''}`}>
              <button type="button" disabled={!abierta} onClick={() => navegar(`/aprender/${l.id}`)} aria-label={`Lección ${i + 1}: ${l.titulo}`}>
                <span className="tutorial-parada-numero" aria-hidden="true">
                  {estado === 'hecha' ? '✓' : estado === 'cerrada' ? '🔒' : i + 1}
                </span>
                <span className="tutorial-parada-texto">
                  <strong>{l.titulo}</strong>
                  <small>{estado === 'pronto' ? 'Próximamente' : l.resumen}</small>
                </span>
                {estrellas !== undefined && <Estrellas cuantas={estrellas} />}
              </button>
            </li>
          )
        })}
      </ol>
      {progreso.examen !== undefined && (
        <button type="button" className="boton boton-grande" onClick={() => navegar('/aprender/diploma')}>
          🎓 Ver tu diploma
        </button>
      )}
    </main>
  )
}

/** Lo que se ve en la pizarra mientras Don Queiroz explica. */
function VerPizarra({ pizarra }: { pizarra: Pizarra }) {
  return (
    <div className="tutorial-pizarra-contenido">
      {pizarra.dibujo && (
        <span className="tutorial-dibujo" aria-hidden="true">
          {pizarra.dibujo}
        </span>
      )}
      {pizarra.muestra && <Muestra carta={pizarra.muestra} />}
      {pizarra.cartas && (
        <div className="tutorial-cartas" role="list" aria-label="Cartas">
          {pizarra.cartas.map((c) => (
            <span key={`${c.numero}-${c.palo}`} role="listitem">
              <Carta carta={c} tam={pizarra.cartas!.length > 5 ? 'mesa' : 'grande'} />
            </span>
          ))}
        </div>
      )}
      {pizarra.leyenda && <p className="tutorial-leyenda">{pizarra.leyenda}</p>}
    </div>
  )
}

/** Lo primero que dice Don Queiroz en cada paso. */
const textoDe = (p: Paso) => (p.tipo === 'dice' ? p.texto : p.tipo === 'pregunta' ? p.pregunta : p.consigna)

/** Una lección, de cero cada vez que se entra (también al pasar a la siguiente). */
export function LeccionTutorial() {
  const { leccion } = useParams()
  return <Leccion key={leccion} leccion={leccion} />
}

/** Una lección: Don Queiroz explica paso a paso y los ejercicios se hacen tocando. Al final, las estrellas. */
function Leccion({ leccion }: { leccion: string | undefined }) {
  const navegar = useNavigate()
  const progreso = useTutorial((s) => s.progreso)
  const terminar = useTutorial((s) => s.terminar)
  const i = LECCIONES.findIndex((l) => l.id === leccion)
  const datos = LECCIONES[i]
  const pasos = useMemo(() => (datos ? pasosDe(datos.id) : null), [datos])
  const [n, setN] = useState(0)
  const [errores, setErrores] = useState(0)
  const [listo, setListo] = useState(false)
  const [dicho, setDicho] = useState<{ texto: string; vez: number } | null>(null)
  const [estrellas, setEstrellas] = useState<1 | 2 | 3 | null>(null)

  if (!datos || !pasos || !leccionAbierta(progreso, datos.id)) {
    return (
      <main className="historia tutorial">
        <h1>Esa lección todavía no está abierta</h1>
        <button type="button" className="boton" onClick={() => navegar('/aprender')}>
          Ir a las lecciones
        </button>
      </main>
    )
  }

  const paso = pasos[n]!
  const decir = (texto: string) => setDicho((d) => ({ texto, vez: (d?.vez ?? 0) + 1 }))
  const alListo = (e: number) => {
    setErrores((x) => x + e)
    setListo(true)
  }
  const seguir = () => {
    if (n < pasos.length - 1) {
      setN(n + 1)
      setListo(false)
      setDicho(null)
      return
    }
    const est = estrellasPorErrores(errores)
    terminar(datos.id, est)
    setEstrellas(est)
  }
  const siguiente = LECCIONES[i + 1]
  const props = { alDecir: decir, alListo }

  return (
    <main className="historia tutorial tutorial-leccion">
      <button type="button" className="historia-volver" onClick={() => navegar('/aprender')}>
        <span aria-hidden="true">‹</span> Lecciones
      </button>
      <header className="tutorial-leccion-titulo">
        <small>Lección {i + 1}</small>
        <h1>{datos.titulo}</h1>
        {estrellas === null && (
          <div className="tutorial-avance" role="progressbar" aria-label="Avance de la lección" aria-valuemin={0} aria-valuemax={pasos.length} aria-valuenow={n + 1}>
            <span style={{ width: `${((n + 1) / pasos.length) * 100}%` }} />
          </div>
        )}
      </header>
      {estrellas !== null ? (
        <>
          <section className="tutorial-pizarra tutorial-resultado" aria-label="Lección terminada">
            <h2>¡Lección terminada!</h2>
            <Estrellas cuantas={estrellas} grandes />
          </section>
          <Maestro texto={AL_TERMINAR[estrellas]} clave="fin" />
          <footer className="tutorial-pie">
            {siguiente && leccionAbierta(progreso, siguiente.id) && (
              <button type="button" className="boton boton-grande" onClick={() => navegar(`/aprender/${siguiente.id}`)}>
                Siguiente: {siguiente.titulo}
              </button>
            )}
            <button type="button" className="boton boton-secundario" onClick={() => navegar('/aprender')}>
              Volver a las lecciones
            </button>
          </footer>
        </>
      ) : (
        <>
          <section className="tutorial-pizarra" key={n}>
            {paso.tipo === 'dice' && paso.pizarra && <VerPizarra pizarra={paso.pizarra} />}
            {paso.tipo === 'buscar' && <Buscar {...props} cartas={paso.cartas} muestra={paso.muestra} es={paso.es} porQueNo={paso.porQueNo} />}
            {paso.tipo === 'pregunta' && <Pregunta {...props} opciones={paso.opciones} correcta={paso.correcta} bien={paso.bien} mal={paso.mal} />}
            {paso.tipo === 'comparar' && <Comparar {...props} rondas={paso.rondas} conMuestra={paso.conMuestra} />}
            {paso.tipo === 'ordenar' && <Ordenar {...props} rondas={paso.rondas} />}
            {paso.tipo === 'cargar' && <Cargar {...props} que={paso.que} rondas={paso.rondas} conMuestra={paso.conMuestra} />}
            {paso.tipo === 'tieneFlor' && <TieneFlor {...props} rondas={paso.rondas} />}
            {paso.tipo === 'mano' && <JugarManoGuiada {...props} mano={paso.mano} />}
            {paso.tipo === 'mesa' && <MesaEquipo {...props} jugadores={paso.jugadores} marcar={paso.marcar} />}
            {paso.tipo === 'gesto' && <GestoMaestro {...props} senia={paso.senia} />}
            {paso.tipo === 'senias' && <AdivinarSenia {...props} rondas={paso.rondas} />}
            {paso.tipo === 'examen' && <EmpezarExamen />}
          </section>
          <Maestro texto={dicho?.texto ?? textoDe(paso)} clave={`${n}-${dicho?.vez ?? 0}`} />
          {/* En el examen, el botón es el de ir a la mesa: se termina al ganar la partida. */}
          {paso.tipo !== 'examen' && (
            <footer className="tutorial-pie">
              <button type="button" className="boton boton-grande" disabled={paso.tipo !== 'dice' && !listo} onClick={seguir}>
                {n === pasos.length - 1 ? 'Terminar' : 'Seguir'}
              </button>
            </footer>
          )}
        </>
      )}
    </main>
  )
}
