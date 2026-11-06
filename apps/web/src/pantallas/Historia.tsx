import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import {
  buscarDepartamento,
  codificarAvatar,
  DEPARTAMENTOS,
  HISTORIAS,
  nivelAbierto,
  nivelesPorTamanio,
  nombreRecompensa,
  PERSONAJES,
  type IdDepartamento,
} from '@truco/shared'
import { Avatar } from '../componentes/Avatar'
import { FORMATOS, NIVELES } from '../componentes/FormularioSala'
import { iniciarCuenta, useCuenta } from '../cuenta/cuenta'
import { cargarHistoria, useHistoria } from '../cuenta/historia'
import { conexionHistoria } from '../menu/contraLaCompu'
import { leerPerfil } from '../perfil'
import { useJuego } from '../estado'
import { ConexionOnline, motivoError } from '../conexion/online'
import { datosUnirse } from '../componentes/Online'
import '../estilos-historia.css'

const NOMBRE_FORMATO = Object.fromEntries(FORMATOS.map(([f, , corto]) => [f, corto]))
const NOMBRE_NIVEL = Object.fromEntries(NIVELES)
const personaje = (id: string) => PERSONAJES.find((p) => p.id === id)!

/**
 * Mientras se arma, el modo historia es solo para el admin: trae su progreso del servidor. Si se
 * entra directo por la dirección, arranca la cuenta (y mientras tanto, `cargando`).
 */
function useHistoriaDelAdmin(): { admin: boolean; cargando: boolean; progreso: ReturnType<typeof useHistoria.getState>['progreso'] } {
  const estado = useCuenta((s) => s.estado)
  const admin = useCuenta((s) => s.estado === 'adentro' && s.cuenta?.admin === true)
  const progreso = useHistoria((s) => s.progreso)
  useEffect(() => void iniciarCuenta(), [])
  useEffect(() => {
    if (admin) void cargarHistoria().catch(() => {})
  }, [admin])
  return { admin, cargando: estado === 'cargando' || estado === 'entrando', progreso }
}

function Cargando() {
  return (
    <main className="historia historia-cerrada">
      <p role="status">Cargando…</p>
    </main>
  )
}

function EnPreparacion() {
  const navegar = useNavigate()
  return (
    <main className="historia historia-cerrada">
      <h1>Modo historia</h1>
      <p>Se está armando: muy pronto vas a poder recorrer Uruguay jugando al truco.</p>
      <button type="button" className="boton" onClick={() => navegar('/')}>
        Volver
      </button>
    </main>
  )
}

function Volver({ a, texto = 'Volver' }: { a: string; texto?: string }) {
  const navegar = useNavigate()
  return (
    <button type="button" className="historia-volver" onClick={() => navegar(a)}>
      <span aria-hidden="true">‹</span> {texto}
    </button>
  )
}

/** El mapa: los 19 departamentos, cada uno por su cuenta. Los que todavía no están dicen "Próximamente". */
export function Historia() {
  const navegar = useNavigate()
  const { admin, cargando, progreso } = useHistoriaDelAdmin()
  if (!admin) return cargando ? <Cargando /> : <EnPreparacion />
  return (
    <main className="historia">
      <Volver a="/" texto="Inicio" />
      <header className="historia-cabecera">
        <h1>Modo historia</h1>
        <p>Recorré Uruguay jugando al truco. Cada departamento tiene su rival, sus niveles y sus premios.</p>
      </header>
      <ul className="historia-departamentos">
        {DEPARTAMENTOS.map((d) => {
          const historia = HISTORIAS[d.id]
          const niveles = historia?.niveles.length ?? nivelesPorTamanio(d.km2)
          const ganados = progreso?.[d.id]?.length ?? 0
          return (
            <li key={d.id}>
              <button
                type="button"
                className={`historia-departamento${historia ? '' : ' cerrado'}`}
                data-fondo={d.id}
                disabled={!historia}
                onClick={() => navegar(`/historia/${d.id}`)}
              >
                {historia && (
                  <span className="historia-departamento-avatar" aria-hidden="true">
                    <Avatar codigo={codificarAvatar(personaje(historia.jefe).avatar)} encuadre="cara" />
                  </span>
                )}
                <strong>{d.nombre}</strong>
                <small>{historia ? `${ganados} de ${niveles} niveles` : `Próximamente · ${niveles} niveles`}</small>
              </button>
            </li>
          )
        })}
      </ul>
    </main>
  )
}

/** Un departamento: su rival, la presentación y los niveles (cada uno se abre al ganar el anterior). */
export function DepartamentoHistoria() {
  const navegar = useNavigate()
  const { departamento } = useParams()
  const { admin, cargando, progreso } = useHistoriaDelAdmin()
  const dep = buscarDepartamento(departamento)
  const historia = dep && HISTORIAS[dep.id]
  if (!admin) return cargando ? <Cargando /> : <EnPreparacion />
  if (!dep || !historia) return <EnPreparacion />
  const jefe = personaje(historia.jefe)
  const ganados = progreso?.[dep.id] ?? []
  return (
    <main className="historia historia-lugar" data-fondo={dep.id}>
      <Volver a="/historia" texto="Mapa" />
      <header className="historia-rival">
        <span className="historia-rival-avatar" aria-hidden="true">
          <Avatar codigo={codificarAvatar(jefe.avatar)} encuadre="busto" />
        </span>
        <div>
          <h1>{dep.nombre}</h1>
          <p className="historia-rival-nombre">
            {jefe.nombre} {jefe.titulo}
          </p>
          <p>{historia.presentacion}</p>
        </div>
      </header>
      <ol className="historia-niveles">
        {historia.niveles.map((nivel, i) => {
          const n = i + 1
          const ganado = ganados.includes(n)
          const abierto = progreso !== null && nivelAbierto(progreso, dep.id, n)
          return (
            <li key={n} className={`historia-nivel${ganado ? ' ganado' : ''}${abierto ? '' : ' cerrado'}`}>
              <span className="historia-nivel-numero" aria-hidden="true">
                {ganado ? '✓' : abierto ? n : '🔒'}
              </span>
              <span className="historia-nivel-texto">
                <strong>
                  Nivel {n} · {nivel.lugar}
                </strong>
                <small>
                  {NOMBRE_FORMATO[nivel.formato]} · {NOMBRE_NIVEL[nivel.nivelBots]} · a {nivel.puntos}
                </small>
                <small className="historia-premio">
                  {ganado ? 'Ganaste: ' : 'Premio: '}
                  {nivel.recompensas.map(nombreRecompensa).join(' y ')}
                </small>
              </span>
              <button
                type="button"
                className="boton"
                disabled={!abierto}
                aria-label={`${ganado ? 'Volver a jugar' : 'Jugar'} el nivel ${n}`}
                onClick={() => navegar(`/historia/${dep.id}/${n}`)}
              >
                {ganado ? 'Repetir' : 'Jugar'}
              </button>
            </li>
          )
        })}
      </ol>
    </main>
  )
}

/**
 * La previa de un nivel: el rival en el lugar, con lo que dice (un globo por vez), y a jugar. Se
 * puede saltar.
 */
export function PreviaNivel() {
  const navegar = useNavigate()
  const { departamento, nivel: textoNivel } = useParams()
  const { admin, cargando, progreso } = useHistoriaDelAdmin()
  const [frase, setFrase] = useState(0)
  const [conAmigo, setConAmigo] = useState<{ creando: boolean; error: string | null }>({ creando: false, error: null })
  const dep = buscarDepartamento(departamento)
  const historia = dep && HISTORIAS[dep.id]
  const n = Number(textoNivel)
  const nivel = historia?.niveles[n - 1]
  if (!admin && cargando) return <Cargando />
  if (!admin || !dep || !historia || !nivel) return <EnPreparacion />
  // Sin el anterior ganado no se juega (si el progreso todavía no llegó, se espera).
  if (progreso && !nivelAbierto(progreso, dep.id, n)) return <EnPreparacion />

  const rival = personaje(nivel.rivales[0]!)
  const ultima = frase >= nivel.frases.length - 1
  const jugado = { departamento: dep.id as IdDepartamento, nivel: n }
  const jugar = () => {
    useJuego.getState().conectar(conexionHistoria(leerPerfil(), jugado))
    navegar('/mesa')
  }
  // En 2v2 y 3v3 se puede jugar con un amigo: se arma una sala privada del nivel y se le pasa el código.
  const jugarConAmigo = async () => {
    setConAmigo({ creando: true, error: null })
    try {
      const c = await ConexionOnline.crearSala({ ...datosUnirse(leerPerfil()), historia: jugado })
      useJuego.getState().conectar(c)
      navegar('/sala')
    } catch (e) {
      setConAmigo({ creando: false, error: motivoError(e) })
    }
  }
  return (
    <main className="historia-previa" data-fondo={dep.id}>
      <button type="button" className="historia-saltar" onClick={jugar}>
        Saltar <span aria-hidden="true">›</span>
      </button>
      <header className="historia-previa-titulo">
        <small>
          {dep.nombre} · Nivel {n}
        </small>
        <h1>{nivel.lugar}</h1>
        <p>
          {NOMBRE_FORMATO[nivel.formato]} · {NOMBRE_NIVEL[nivel.nivelBots]} · a {nivel.puntos} puntos
        </p>
      </header>
      <div className="historia-previa-escena">
        <AnimatePresence mode="wait">
          <motion.p
            key={frase}
            className="historia-globo"
            role="status"
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            {nivel.frases[frase]}
          </motion.p>
        </AnimatePresence>
        <motion.span
          className="historia-previa-avatar"
          aria-hidden="true"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        >
          <Avatar codigo={codificarAvatar(rival.avatar)} encuadre="busto" />
        </motion.span>
        <p className="historia-previa-nombre">
          {rival.nombre} {rival.titulo}
        </p>
      </div>
      <footer className="historia-previa-pie">
        {ultima ? (
          <>
            <button type="button" className="boton boton-grande" onClick={jugar}>
              ¡A jugar!
            </button>
            {nivel.formato !== '1v1' && (
              <button type="button" className="boton boton-secundario" disabled={conAmigo.creando} onClick={() => void jugarConAmigo()}>
                {conAmigo.creando ? 'Armando la sala…' : 'Jugar con un amigo'}
              </button>
            )}
            {conAmigo.error && <p role="alert">⚠ {conAmigo.error}</p>}
          </>
        ) : (
          <button type="button" className="boton boton-grande" onClick={() => setFrase((f) => f + 1)}>
            Seguir
          </button>
        )}
      </footer>
    </main>
  )
}
