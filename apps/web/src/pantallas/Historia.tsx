import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { motion, useReducedMotion } from 'motion/react'
import {
  buscarDepartamento,
  codificarAvatar,
  DEPARTAMENTOS,
  DEPARTAMENTO_INICIAL,
  departamentoAbierto,
  departamentoCompleto,
  departamentoPublicado,
  departamentosCompletos,
  despedidaDelDepartamento,
  dialogoDelNivel,
  elencoDelDepartamento,
  HISTORIAS,
  nivelAbierto,
  nombreRecompensa,
  PERSONAJES,
  recompensasDelDepartamento,
  VECINOS,
  type IdDepartamento,
} from '@truco/shared'
import { Avatar } from '../componentes/Avatar'
import { TarjetaCuenta } from '../componentes/TarjetaCuenta'
import { FORMATOS, NIVELES } from '../componentes/FormularioSala'
import { iniciarCuenta, useCuenta } from '../cuenta/cuenta'
import { cargarHistoria, useHistoria } from '../cuenta/historia'
import { conexionHistoria } from '../menu/contraLaCompu'
import { leerPerfil } from '../perfil'
import { useJuego } from '../estado'
import { ConexionOnline, motivoError } from '../conexion/online'
import { datosUnirse } from '../componentes/Online'
import { MapaUruguay } from '../historia/MapaUruguay'
import { MapaDepartamento } from '../historia/MapaDepartamento'
import { PresentacionDepartamento } from '../historia/PresentacionDepartamento'
import { Nubes } from '../historia/Nubes'
import { alMedio, FiguraDe, FiguraVos, Globo, nombreDe } from '../historia/Escena'
import '../estilos-historia.css'
import '../estilos-niveles.css'

const NOMBRE_FORMATO = Object.fromEntries(FORMATOS.map(([f, , corto]) => [f, corto]))
const NOMBRE_NIVEL = Object.fromEntries(NIVELES)
const personaje = (id: string) => PERSONAJES.find((p) => p.id === id)!

/**
 * El modo historia se juega con cuenta (el progreso y los premios se guardan ahí): trae tu progreso
 * del servidor. Si se entra directo por la dirección, arranca la cuenta (y mientras tanto,
 * `cargando`). El admin tiene todos los departamentos abiertos; los demás, los publicados.
 */
function useHistoriaDeLaCuenta(): { adentro: boolean; admin: boolean; cargando: boolean; progreso: ReturnType<typeof useHistoria.getState>['progreso'] } {
  const estado = useCuenta((s) => s.estado)
  const adentro = estado === 'adentro'
  const admin = useCuenta((s) => s.estado === 'adentro' && s.cuenta?.admin === true)
  const progreso = useHistoria((s) => s.progreso)
  useEffect(() => void iniciarCuenta(), [])
  useEffect(() => {
    if (adentro) void cargarHistoria().catch(() => {})
  }, [adentro])
  return { adentro, admin, cargando: estado === 'cargando' || estado === 'entrando', progreso }
}

function Cargando() {
  return (
    <main className="historia historia-cerrada">
      <p role="status">Cargando…</p>
    </main>
  )
}

/** Sin cuenta: para jugar, entrás acá mismo (y al entrar, sigue donde ibas). */
function SinCuenta() {
  const navegar = useNavigate()
  return (
    <main className="historia historia-cerrada">
      <h1>Modo historia</h1>
      <p>Para recorrer Uruguay jugando al truco, entrá a tu cuenta: ahí se guarda tu avance y lo que vas ganando.</p>
      <TarjetaCuenta sinEnlaces />
      <button type="button" className="boton boton-secundario" onClick={() => navegar('/')}>
        Volver
      </button>
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

/** El mapa de Uruguay: se elige el departamento (los cerrados, con candado; el admin los tiene todos abiertos). */
export function Historia() {
  const navegar = useNavigate()
  const desde = (useLocation().state as { desde?: IdDepartamento } | null)?.desde
  const { adentro, admin, cargando, progreso } = useHistoriaDeLaCuenta()
  if (!adentro) return cargando ? <Cargando /> : <SinCuenta />
  const completos = progreso ? departamentosCompletos(progreso) : 0
  return (
    <main className="historia historia-mapa">
      <Volver a="/" texto="Inicio" />
      <header className="historia-cabecera">
        <h1>Modo historia</h1>
        <p>
          Recorré Uruguay jugando al truco. Arrancás en {buscarDepartamento(DEPARTAMENTO_INICIAL)!.nombre}; los demás departamentos se van
          abriendo de a poco.
        </p>
        <p className="historia-avance">
          {completos} de {DEPARTAMENTOS.length} departamentos
        </p>
      </header>
      {progreso ? (
        <MapaUruguay
          progreso={progreso}
          todoAbierto={admin}
          desde={desde}
          alElegir={(id) => navegar(`/historia/${id}`, { state: { desdeMapa: true } })}
        />
      ) : (
        <p role="status">Cargando…</p>
      )}
      {desde && <Nubes modo="abrir" />}
    </main>
  )
}

/**
 * Un departamento: llegando desde el mapa, primero su presentación (con las nubes que se abren).
 * Después su rival, el mapa con sus lugares unidos por el camino de los niveles, y el nivel
 * elegido (al entrar, el que sigue) con lo que es, cómo se juega, su premio y "Jugar".
 */
export function DepartamentoHistoria() {
  const navegar = useNavigate()
  const { departamento } = useParams()
  const ubicacion = useLocation()
  const { adentro, admin, cargando, progreso } = useHistoriaDeLaCuenta()
  const [presentando, setPresentando] = useState(() => (ubicacion.state as { desdeMapa?: boolean } | null)?.desdeMapa === true)
  const [elegido, setElegido] = useState<number | null>(null)
  const dep = buscarDepartamento(departamento)
  const historia = dep && HISTORIAS[dep.id]
  if (!adentro) return cargando ? <Cargando /> : <SinCuenta />
  if (!dep || !historia) return <EnPreparacion />
  if (progreso && !departamentoAbierto(progreso, dep.id, admin)) return <EnPreparacion />
  if (presentando) return <PresentacionDepartamento nombre={dep.nombre} historia={historia} alTerminar={() => setPresentando(false)} />

  const jefe = personaje(historia.jefe)
  const ganados = progreso?.[dep.id] ?? []
  const numeros = historia.niveles.map((_, i) => i + 1)
  const abiertos = progreso ? numeros.filter((n) => nivelAbierto(progreso, dep.id, n)) : []
  const n = elegido ?? abiertos.find((a) => !ganados.includes(a)) ?? historia.niveles.length
  const nivel = historia.niveles[n - 1]!
  const ganado = ganados.includes(n)
  const abierto = abiertos.includes(n)
  return (
    <main className="historia historia-lugar" data-fondo={dep.id} data-nivel={n}>
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
          <p>
            {ganados.length} de {historia.niveles.length} niveles
          </p>
        </div>
      </header>
      <MapaDepartamento
        departamento={dep.id as IdDepartamento}
        niveles={historia.niveles}
        ganados={ganados}
        abiertos={abiertos}
        elegido={n}
        alElegir={setElegido}
      />
      <article className={`historia-nivel${ganado ? ' ganado' : ''}${abierto ? '' : ' cerrado'}`} aria-live="polite">
        <span className="historia-nivel-numero" aria-hidden="true">
          {ganado ? '✓' : abierto ? n : '🔒'}
        </span>
        <span className="historia-nivel-texto">
          <strong>
            Nivel {n} · {nivel.lugar}
          </strong>
          <small className="historia-nivel-resumen">{nivel.resumen}</small>
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
          {ganado ? 'Repetir' : abierto ? 'Jugar' : 'Cerrado'}
        </button>
      </article>
      {progreso && departamentoCompleto(progreso, dep.id) && (
        <button type="button" className="boton boton-secundario historia-ver-despedida" onClick={() => navegar(`/historia/${dep.id}/despedida`)}>
          Ver la despedida
        </button>
      )}
    </main>
  )
}

/**
 * La previa de un nivel: los rivales arriba y tu equipo abajo (vos al medio), en el lugar. Charlan
 * de a uno: el que habla pasa al frente y los demás quedan atrás, en penumbra. En un momento
 * contestás vos, eligiendo qué decir. Se puede saltar.
 */
export function PreviaNivel() {
  const navegar = useNavigate()
  const { departamento, nivel: textoNivel } = useParams()
  const { adentro, admin, cargando, progreso } = useHistoriaDeLaCuenta()
  const sinMovimiento = useReducedMotion() ?? false
  const [paso, setPaso] = useState(0)
  const [respuesta, setRespuesta] = useState<string | null>(null)
  const [conAmigo, setConAmigo] = useState<{ creando: boolean; error: string | null }>({ creando: false, error: null })
  const dep = buscarDepartamento(departamento)
  const historia = dep && HISTORIAS[dep.id]
  const n = Number(textoNivel)
  const nivel = historia?.niveles[n - 1]
  if (!adentro) return cargando ? <Cargando /> : <SinCuenta />
  if (!dep || !historia || !nivel) return <EnPreparacion />
  // Sin el departamento abierto o el anterior ganado no se juega (si el progreso todavía no llegó, se espera).
  if (progreso && (!departamentoAbierto(progreso, dep.id, admin) || !nivelAbierto(progreso, dep.id, n))) return <EnPreparacion />

  const dialogo = dialogoDelNivel(nivel, n)
  const turno = dialogo[paso]!
  const ultimo = paso >= dialogo.length - 1
  // Tu turno: hasta que elegís, el globo pregunta; después dice lo que elegiste.
  const eligiendo = turno.quien === null && respuesta === null
  const quienHabla = turno.quien
  const esDato = turno.quien !== null && turno.dato === true
  const texto = turno.quien === null ? (respuesta ?? '¿Qué le decís?') : turno.texto
  const seguir = () => setPaso((p) => p + 1)

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
  const figuraDe = (id: string) => <FiguraDe key={id} id={id} habla={quienHabla === id} quieto={sinMovimiento} />
  const vos = <FiguraVos key="vos" habla={quienHabla === null} quieto={sinMovimiento} />
  return (
    <main className="historia-previa" data-fondo={dep.id} data-nivel={n}>
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
      <div className="previa-escena">
        <div className="previa-fila" aria-label="Rivales">
          {alMedio(nivel.rivales).map(figuraDe)}
        </div>
        <Globo
          clave={`${paso}-${respuesta ?? ''}`}
          quien={nombreDe(quienHabla)}
          desdeAbajo={quienHabla === null}
          clase={esDato ? 'dato' : ''}
          extra={esDato && <span className="historia-globo-dato"> · ¿Sabías que…?</span>}
          quieto={sinMovimiento}
        >
          {texto}
        </Globo>
        <div className="previa-fila previa-tuyos" aria-label="Tu equipo">
          {alMedio([null, ...nivel.companieros]).map((id) => (id === null ? vos : figuraDe(id)))}
        </div>
      </div>
      <footer className="historia-previa-pie">
        {eligiendo ? (
          <div className="previa-opciones" role="group" aria-label="Qué le decís">
            {turno.opciones.map((o) => (
              <button key={o} type="button" className="boton boton-secundario" onClick={() => setRespuesta(o)}>
                {o}
              </button>
            ))}
          </div>
        ) : ultimo ? (
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
          <button type="button" className="boton boton-grande" onClick={seguir}>
            Seguir
          </button>
        )}
      </footer>
    </main>
  )
}

type PasoDespedida = 'charla' | 'premios' | 'nubes'

/**
 * La despedida al completar un departamento: los de ahí se juntan y te desean buen viaje; después,
 * todo lo que te llevás y los próximos destinos (los vecinos: abiertos o, si todavía no están
 * publicados, próximamente). "Seguir viaje" cierra las nubes y vuelve al mapa de Uruguay, con la
 * ruta marcada. Se ve al ganar el último nivel y, después, desde el departamento.
 */
export function DespedidaDepartamento() {
  const navegar = useNavigate()
  const { departamento } = useParams()
  const { adentro, admin, cargando, progreso } = useHistoriaDeLaCuenta()
  const sinMovimiento = useReducedMotion() ?? false
  const [paso, setPaso] = useState<PasoDespedida>('charla')
  const [turno, setTurno] = useState(0)
  const dep = buscarDepartamento(departamento)
  const historia = dep && HISTORIAS[dep.id]
  if (!adentro) return cargando ? <Cargando /> : <SinCuenta />
  if (!dep || !historia) return <EnPreparacion />
  // Hasta que lo completás no hay despedida (el admin la ve igual).
  if (progreso && !admin && !departamentoCompleto(progreso, dep.id)) return <EnPreparacion />

  const id = dep.id as IdDepartamento
  const dialogo = despedidaDelDepartamento(historia)
  const actual = dialogo[turno]!
  const elenco = elencoDelDepartamento(historia)
  const vecinos = VECINOS[id].map((v) => ({
    id: v,
    nombre: buscarDepartamento(v)!.nombre,
    estado: progreso && departamentoAbierto(progreso, v, admin) ? 'abierto' : departamentoPublicado(v) ? 'cerrado' : 'pronto',
  }))
  const hayAbierto = vecinos.some((v) => v.estado === 'abierto')
  const entra = (i: number) =>
    sinMovimiento ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.2 + i * 0.3, duration: 0.35 } }
  return (
    <main className="historia-previa historia-despedida" data-fondo={id} data-nivel={historia.niveles.length}>
      {paso === 'charla' && (
        <button type="button" className="historia-saltar" onClick={() => setPaso('premios')}>
          Saltar <span aria-hidden="true">›</span>
        </button>
      )}
      <header className="historia-previa-titulo">
        <small>¡Completaste {dep.nombre}!</small>
        <h1>Hasta la próxima</h1>
      </header>
      {paso === 'charla' ? (
        <>
          <div className="previa-escena">
            <div className="previa-fila" aria-label={`Los de ${dep.nombre}`}>
              {alMedio(elenco).map((p) => (
                <FiguraDe key={p} id={p} habla={actual.quien === p} quieto={sinMovimiento} />
              ))}
            </div>
            <Globo clave={String(turno)} quien={nombreDe(actual.quien)} desdeAbajo={false} quieto={sinMovimiento}>
              {actual.texto}
            </Globo>
            <div className="previa-fila previa-tuyos">
              <FiguraVos habla={false} quieto={sinMovimiento} />
            </div>
          </div>
          <footer className="historia-previa-pie">
            <button
              type="button"
              className="boton boton-grande"
              onClick={() => (turno >= dialogo.length - 1 ? setPaso('premios') : setTurno((t) => t + 1))}
            >
              Seguir
            </button>
          </footer>
        </>
      ) : (
        <>
          <div className="despedida-resumen">
            <motion.section className="escena-premios" aria-label={`Te llevás de ${dep.nombre}`} {...entra(0)}>
              <h2>Te llevás de {dep.nombre}</h2>
              <ul>
                {recompensasDelDepartamento(historia).map((r, i) => (
                  <motion.li key={r} {...entra(i + 1)}>
                    <span aria-hidden="true">{r.startsWith('monedas:') ? '🪙' : '🎁'}</span> {nombreRecompensa(r)}
                  </motion.li>
                ))}
              </ul>
            </motion.section>
            <motion.section className="escena-premios despedida-destinos" aria-label="Próximos destinos" {...entra(2)}>
              <h2>Próximos destinos</h2>
              <ul>
                {vecinos.map((v) => (
                  <li key={v.id} className={v.estado}>
                    {v.nombre}
                    <small>{v.estado === 'abierto' ? '¡Abierto!' : v.estado === 'cerrado' ? '🔒 Cerrado' : 'Próximamente'}</small>
                  </li>
                ))}
              </ul>
              {!hayAbierto && <p className="nota">Los próximos destinos se abren muy pronto.</p>}
            </motion.section>
          </div>
          <footer className="historia-previa-pie">
            <button type="button" className="boton boton-grande" disabled={paso === 'nubes'} onClick={() => setPaso('nubes')}>
              Seguir viaje
            </button>
          </footer>
        </>
      )}
      {paso === 'nubes' && <Nubes modo="cerrar" alTerminar={() => navegar('/historia', { state: { desde: id } })} />}
    </main>
  )
}
