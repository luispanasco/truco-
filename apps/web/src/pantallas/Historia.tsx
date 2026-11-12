import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router'
import { motion, useReducedMotion } from 'motion/react'
import {
  barrioAbierto,
  barrioCompleto,
  barriosDe,
  buscarBarrio,
  buscarDepartamento,
  codificarAvatar,
  DEPARTAMENTOS,
  DEPARTAMENTO_INICIAL,
  departamentoAbierto,
  departamentoCompleto,
  departamentoPublicado,
  departamentosCompletos,
  despedidaDelBarrio,
  despedidaDelDepartamento,
  dialogoDelNivel,
  elencoDelBarrio,
  elencoDelDepartamento,
  ganadosDelBarrio,
  HISTORIAS,
  idMonedas,
  monedasDeRecompensa,
  nivelAbierto,
  nivelesDelDepartamento,
  nivelesGanados,
  nombreRecompensa,
  PERSONAJES,
  recompensasDelDepartamento,
  VECINOS,
  type Barrio,
  type IdDepartamento,
  type TurnoEscena,
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
import { rutaBarrio, rutaNivel } from '../historia/rutas'
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
 * Lo que sigue de `/historia/<departamento>/`: un número es un nivel (de los departamentos sin
 * barrios); si no, un barrio.
 */
export function SegundoTramoHistoria() {
  const { segundo } = useParams()
  return /^\d+$/.test(segundo ?? '') ? <PreviaNivel /> : <BarrioHistoria />
}

/**
 * Un departamento: llegando desde el mapa, primero su presentación (con las nubes que se abren).
 * Si tiene barrios, su mapa con los barrios; si no, sus niveles (ver `VistaNiveles`).
 */
export function DepartamentoHistoria() {
  const { departamento } = useParams()
  const ubicacion = useLocation()
  const { adentro, admin, cargando, progreso } = useHistoriaDeLaCuenta()
  const [presentando, setPresentando] = useState(() => (ubicacion.state as { desdeMapa?: boolean } | null)?.desdeMapa === true)
  const dep = buscarDepartamento(departamento)
  const historia = dep && HISTORIAS[dep.id]
  if (!adentro) return cargando ? <Cargando /> : <SinCuenta />
  if (!dep || !historia) return <EnPreparacion />
  if (progreso && !departamentoAbierto(progreso, dep.id, admin)) return <EnPreparacion />
  const barrios = historia.barrios
  if (presentando) {
    const lugares = barrios
      ? barrios.map((b) => ({ nombre: b.nombre, resumen: `${personaje(b.jefe).nombre} ${personaje(b.jefe).titulo} · ${b.niveles.length} niveles` }))
      : historia.niveles.map((n) => ({ nombre: n.lugar, resumen: n.resumen }))
    return (
      <PresentacionDepartamento
        nombre={dep.nombre}
        presentacion={historia.presentacion}
        lugares={lugares}
        departamento={dep.id}
        alTerminar={() => setPresentando(false)}
      />
    )
  }
  return barrios ? (
    <VistaBarrios departamento={dep.id as IdDepartamento} />
  ) : (
    <VistaNiveles departamento={dep.id as IdDepartamento} barrio={barriosDe(historia)[0]!} />
  )
}

/**
 * Un barrio: llegando desde el departamento, primero su presentación. Después, sus niveles. Se
 * entra si está abierto (completaste el anterior).
 */
export function BarrioHistoria() {
  const { departamento, segundo } = useParams()
  const ubicacion = useLocation()
  const { adentro, admin, cargando, progreso } = useHistoriaDeLaCuenta()
  const [presentando, setPresentando] = useState(() => (ubicacion.state as { desdeMapa?: boolean } | null)?.desdeMapa === true)
  const dep = buscarDepartamento(departamento)
  const barrio = dep && buscarBarrio(dep.id, segundo)
  if (!adentro) return cargando ? <Cargando /> : <SinCuenta />
  if (!dep || !barrio || !barrio.id) return <EnPreparacion />
  if (progreso && (!departamentoAbierto(progreso, dep.id, admin) || !barrioAbierto(progreso, dep.id, barrio.id, admin))) return <EnPreparacion />
  if (presentando)
    return (
      <PresentacionDepartamento
        nombre={barrio.nombre}
        presentacion={barrio.presentacion}
        lugares={barrio.niveles.map((n) => ({ nombre: n.lugar, resumen: n.resumen }))}
        departamento={dep.id}
        barrio={barrio.id}
        alTerminar={() => setPresentando(false)}
      />
    )
  return <VistaNiveles departamento={dep.id as IdDepartamento} barrio={barrio} />
}

/**
 * Los barrios de un departamento: el mapa con un punto por barrio, unidos en el orden en que se
 * abren, y el elegido (al entrar, el que sigue) con su personaje, cuántos niveles ganaste y
 * "Entrar". De fondo, el primer nivel del elegido.
 */
function VistaBarrios({ departamento }: { departamento: IdDepartamento }) {
  const navegar = useNavigate()
  const { admin, progreso } = useHistoriaDeLaCuenta()
  const [elegido, setElegido] = useState<number | null>(null)
  const dep = buscarDepartamento(departamento)!
  const historia = HISTORIAS[departamento]!
  const barrios = barriosDe(historia)
  const completos = progreso ? barrios.flatMap((b, i) => (barrioCompleto(progreso, departamento, b) ? [i + 1] : [])) : []
  const abiertos = progreso ? barrios.flatMap((b, i) => (barrioAbierto(progreso, departamento, b.id, admin) ? [i + 1] : [])) : []
  const k = elegido ?? abiertos.find((a) => !completos.includes(a)) ?? barrios.length
  const barrio = barrios[k - 1]!
  const jefe = personaje(barrio.jefe)
  const completo = completos.includes(k)
  const abierto = abiertos.includes(k)
  const ganados = progreso ? ganadosDelBarrio(progreso, departamento, barrio.id).filter((n) => n <= barrio.niveles.length).length : 0
  return (
    <main className="historia historia-lugar" data-fondo={departamento} data-barrio={barrio.id} data-nivel={1}>
      <Volver a="/historia" texto="Mapa" />
      <header className="historia-rival">
        <span className="historia-rival-avatar" aria-hidden="true">
          <Avatar codigo={codificarAvatar(personaje(historia.jefe).avatar)} encuadre="busto" />
        </span>
        <div>
          <h1>{dep.nombre}</h1>
          <p className="historia-rival-nombre">{barrios.length} barrios</p>
          <p>
            {progreso ? nivelesGanados(progreso, departamento) : 0} de {nivelesDelDepartamento(historia)} niveles
          </p>
        </div>
      </header>
      <MapaDepartamento
        departamento={departamento}
        niveles={barrios.map((b) => ({ lugar: b.nombre, donde: b.donde }))}
        ganados={completos}
        abiertos={abiertos}
        elegido={k}
        alElegir={setElegido}
        etiqueta="Barrio"
      />
      <article className={`historia-nivel historia-barrio${completo ? ' ganado' : ''}${abierto ? '' : ' cerrado'}`} aria-live="polite">
        <span className="historia-nivel-numero historia-barrio-avatar" aria-hidden="true">
          <Avatar codigo={codificarAvatar(jefe.avatar)} encuadre="busto" />
        </span>
        <span className="historia-nivel-texto">
          <strong>{barrio.nombre}</strong>
          <small>
            {jefe.nombre} {jefe.titulo}
          </small>
          <small className="historia-nivel-resumen">{barrio.presentacion}</small>
          <small className="historia-premio">
            {completo ? '✓ Completo' : abierto ? `${ganados} de ${barrio.niveles.length} niveles` : '🔒 Se abre al completar el barrio anterior'}
          </small>
        </span>
        <button
          type="button"
          className="boton"
          disabled={!abierto}
          aria-label={`Entrar a ${barrio.nombre}`}
          onClick={() => navegar(rutaBarrio(departamento, barrio.id), { state: { desdeMapa: ganados === 0 } })}
        >
          {abierto ? 'Entrar' : 'Cerrado'}
        </button>
      </article>
      {progreso && departamentoCompleto(progreso, departamento) && (
        <button type="button" className="boton boton-secundario historia-ver-despedida" onClick={() => navegar(`/historia/${departamento}/despedida`)}>
          Ver la despedida
        </button>
      )}
    </main>
  )
}

/**
 * Los niveles de un barrio (o de un departamento sin barrios): su rival, el mapa con sus lugares
 * unidos por el camino de los niveles, y el nivel elegido (al entrar, el que sigue) con lo que es,
 * cómo se juega, su premio y "Jugar".
 */
function VistaNiveles({ departamento, barrio }: { departamento: IdDepartamento; barrio: Barrio }) {
  const navegar = useNavigate()
  const { admin, progreso } = useHistoriaDeLaCuenta()
  const [elegido, setElegido] = useState<number | null>(null)
  const dep = buscarDepartamento(departamento)!
  const conBarrio = barrio.id !== ''
  const jefe = personaje(barrio.jefe)
  const ganados = progreso ? ganadosDelBarrio(progreso, departamento, barrio.id) : []
  const numeros = barrio.niveles.map((_, i) => i + 1)
  const abiertos = progreso ? numeros.filter((n) => nivelAbierto(progreso, departamento, n, barrio.id, admin)) : []
  const n = elegido ?? abiertos.find((a) => !ganados.includes(a)) ?? barrio.niveles.length
  const nivel = barrio.niveles[n - 1]!
  const ganado = ganados.includes(n)
  const abierto = abiertos.includes(n)
  const completo = !!progreso && barrioCompleto(progreso, departamento, barrio)
  return (
    <main className="historia historia-lugar" data-fondo={departamento} {...(conBarrio ? { 'data-barrio': barrio.id } : {})} data-nivel={n}>
      <Volver a={conBarrio ? rutaBarrio(departamento) : '/historia'} texto={conBarrio ? dep.nombre : 'Mapa'} />
      <header className="historia-rival">
        <span className="historia-rival-avatar" aria-hidden="true">
          <Avatar codigo={codificarAvatar(jefe.avatar)} encuadre="busto" />
        </span>
        <div>
          <h1>{barrio.nombre}</h1>
          <p className="historia-rival-nombre">
            {jefe.nombre} {jefe.titulo}
          </p>
          <p>
            {ganados.filter((g) => g <= barrio.niveles.length).length} de {barrio.niveles.length} niveles
          </p>
        </div>
      </header>
      <MapaDepartamento departamento={departamento} niveles={barrio.niveles} ganados={ganados} abiertos={abiertos} elegido={n} alElegir={setElegido} />
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
          onClick={() => navegar(rutaNivel(departamento, barrio.id, n))}
        >
          {ganado ? 'Repetir' : abierto ? 'Jugar' : 'Cerrado'}
        </button>
      </article>
      {completo && (
        <button
          type="button"
          className="boton boton-secundario historia-ver-despedida"
          onClick={() => navegar(conBarrio ? `${rutaBarrio(departamento, barrio.id)}/despedida` : `/historia/${departamento}/despedida`)}
        >
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
  // En `/historia/<departamento>/<n>` el nivel llega como `segundo`; en los barrios, como `nivel`.
  const { departamento, barrio: idBarrio = '', nivel: textoNivel, segundo } = useParams()
  const { adentro, admin, cargando, progreso } = useHistoriaDeLaCuenta()
  const sinMovimiento = useReducedMotion() ?? false
  const [paso, setPaso] = useState(0)
  const [respuesta, setRespuesta] = useState<string | null>(null)
  const [conAmigo, setConAmigo] = useState<{ creando: boolean; error: string | null }>({ creando: false, error: null })
  const dep = buscarDepartamento(departamento)
  const barrio = dep && buscarBarrio(dep.id, idBarrio)
  const n = Number(textoNivel ?? segundo)
  const nivel = barrio?.niveles[n - 1]
  if (!adentro) return cargando ? <Cargando /> : <SinCuenta />
  if (!dep || !barrio || !nivel) return <EnPreparacion />
  // Sin el departamento abierto o el anterior ganado no se juega (si el progreso todavía no llegó, se espera).
  if (progreso && (!departamentoAbierto(progreso, dep.id, admin) || !nivelAbierto(progreso, dep.id, n, barrio.id, admin))) return <EnPreparacion />

  const dialogo = dialogoDelNivel(nivel, n)
  const turno = dialogo[paso]!
  const ultimo = paso >= dialogo.length - 1
  // Tu turno: hasta que elegís, el globo pregunta; después dice lo que elegiste.
  const eligiendo = turno.quien === null && respuesta === null
  const quienHabla = turno.quien
  const esDato = turno.quien !== null && turno.dato === true
  const texto = turno.quien === null ? (respuesta ?? '¿Qué le decís?') : turno.texto
  const seguir = () => setPaso((p) => p + 1)

  const jugado = { departamento: dep.id as IdDepartamento, ...(barrio.id ? { barrio: barrio.id } : {}), nivel: n }
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
    <main className="historia-previa" data-fondo={dep.id} {...(barrio.id ? { 'data-barrio': barrio.id } : {})} data-nivel={n}>
      <button type="button" className="historia-saltar" onClick={jugar}>
        Saltar <span aria-hidden="true">›</span>
      </button>
      <header className="historia-previa-titulo">
        <small>
          {barrio.id ? `${dep.nombre} · ${barrio.nombre}` : dep.nombre} · Nivel {n}
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

/** Un próximo destino en la despedida: un departamento vecino o el barrio que sigue. */
interface Destino {
  id: string
  nombre: string
  estado: 'abierto' | 'cerrado' | 'pronto'
}

/**
 * La escena de una despedida (de un departamento o de un barrio): los de ahí se juntan y te
 * desean buen viaje; después, todo lo que te llevás y los próximos destinos. El botón del final
 * (`seguir`) cierra con las nubes si `conNubes`.
 */
function EscenaDespedida({
  nombre,
  fondo,
  dialogo,
  elenco,
  premios,
  destinos,
  sinDestinos,
  seguir,
  conNubes,
}: {
  nombre: string
  fondo: { departamento: string; barrio?: string; nivel: number }
  dialogo: readonly TurnoEscena[]
  elenco: readonly string[]
  premios: readonly string[]
  destinos: readonly Destino[]
  /** Lo que se dice si no hay ningún destino abierto. */
  sinDestinos: string
  seguir: { texto: string; alHacer: () => void }
  conNubes: boolean
}) {
  const sinMovimiento = useReducedMotion() ?? false
  const [paso, setPaso] = useState<PasoDespedida>('charla')
  const [turno, setTurno] = useState(0)
  const actual = dialogo[turno]!
  const hayAbierto = destinos.some((v) => v.estado === 'abierto')
  // Las monedas, sumadas en un solo renglón; lo demás, una vez cada cosa.
  const monedas = premios.reduce((s, r) => s + monedasDeRecompensa(r), 0)
  const lista = [...new Set(premios.filter((r) => monedasDeRecompensa(r) === 0)), ...(monedas > 0 ? [idMonedas(monedas)] : [])]
  const entra = (i: number) =>
    sinMovimiento ? {} : { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, transition: { delay: 0.2 + i * 0.3, duration: 0.35 } }
  return (
    <main
      className="historia-previa historia-despedida"
      data-fondo={fondo.departamento}
      {...(fondo.barrio ? { 'data-barrio': fondo.barrio } : {})}
      data-nivel={fondo.nivel}
    >
      {paso === 'charla' && (
        <button type="button" className="historia-saltar" onClick={() => setPaso('premios')}>
          Saltar <span aria-hidden="true">›</span>
        </button>
      )}
      <header className="historia-previa-titulo">
        <small>¡Completaste {nombre}!</small>
        <h1>Hasta la próxima</h1>
      </header>
      {paso === 'charla' ? (
        <>
          <div className="previa-escena">
            <div className="previa-fila" aria-label={`Los de ${nombre}`}>
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
            <motion.section className="escena-premios" aria-label={`Te llevás de ${nombre}`} {...entra(0)}>
              <h2>Te llevás de {nombre}</h2>
              <ul>
                {lista.map((r, i) => (
                  <motion.li key={r} {...entra(i + 1)}>
                    <span aria-hidden="true">{r.startsWith('monedas:') ? '🪙' : '🎁'}</span> {nombreRecompensa(r)}
                  </motion.li>
                ))}
              </ul>
            </motion.section>
            {destinos.length > 0 && (
              <motion.section className="escena-premios despedida-destinos" aria-label="Próximos destinos" {...entra(2)}>
                <h2>Próximos destinos</h2>
                <ul>
                  {destinos.map((v) => (
                    <li key={v.id} className={v.estado}>
                      {v.nombre}
                      <small>{v.estado === 'abierto' ? '¡Abierto!' : v.estado === 'cerrado' ? '🔒 Cerrado' : 'Próximamente'}</small>
                    </li>
                  ))}
                </ul>
                {!hayAbierto && <p className="nota">{sinDestinos}</p>}
              </motion.section>
            )}
          </div>
          <footer className="historia-previa-pie">
            <button
              type="button"
              className="boton boton-grande"
              disabled={paso === 'nubes'}
              onClick={() => (conNubes ? setPaso('nubes') : seguir.alHacer())}
            >
              {seguir.texto}
            </button>
          </footer>
        </>
      )}
      {paso === 'nubes' && <Nubes modo="cerrar" alTerminar={seguir.alHacer} />}
    </main>
  )
}

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
  const dep = buscarDepartamento(departamento)
  const historia = dep && HISTORIAS[dep.id]
  if (!adentro) return cargando ? <Cargando /> : <SinCuenta />
  if (!dep || !historia) return <EnPreparacion />
  // Hasta que lo completás no hay despedida (el admin la ve igual).
  if (progreso && !admin && !departamentoCompleto(progreso, dep.id)) return <EnPreparacion />

  const id = dep.id as IdDepartamento
  const ultimo = barriosDe(historia).at(-1)!
  const vecinos: Destino[] = VECINOS[id].map((v) => ({
    id: v,
    nombre: buscarDepartamento(v)!.nombre,
    estado: progreso && departamentoAbierto(progreso, v, admin) ? 'abierto' : departamentoPublicado(v) ? 'cerrado' : 'pronto',
  }))
  return (
    <EscenaDespedida
      nombre={dep.nombre}
      fondo={{ departamento: id, ...(ultimo.id ? { barrio: ultimo.id } : {}), nivel: ultimo.niveles.length }}
      dialogo={despedidaDelDepartamento(historia)}
      elenco={elencoDelDepartamento(historia)}
      premios={recompensasDelDepartamento(historia)}
      destinos={vecinos}
      sinDestinos="Los próximos destinos se abren muy pronto."
      seguir={{ texto: 'Seguir viaje', alHacer: () => navegar('/historia', { state: { desde: id } }) }}
      conNubes
    />
  )
}

/**
 * La despedida al completar un barrio: los del barrio te despiden, lo que te llevás de ahí y el
 * barrio que sigue. Si era el último y completaste el departamento, sigue la despedida del
 * departamento; si no, se vuelve a sus barrios.
 */
export function DespedidaBarrio() {
  const navegar = useNavigate()
  const { departamento, barrio: idBarrio } = useParams()
  const { adentro, admin, cargando, progreso } = useHistoriaDeLaCuenta()
  const dep = buscarDepartamento(departamento)
  const historia = dep && HISTORIAS[dep.id]
  const barrio = dep && buscarBarrio(dep.id, idBarrio)
  if (!adentro) return cargando ? <Cargando /> : <SinCuenta />
  if (!dep || !historia || !barrio || !barrio.id) return <EnPreparacion />
  const id = dep.id as IdDepartamento
  if (progreso && !admin && !barrioCompleto(progreso, id, barrio)) return <EnPreparacion />

  const barrios = barriosDe(historia)
  const siguiente = barrios[barrios.indexOf(barrio) + 1]
  const destinos: Destino[] = siguiente
    ? [{ id: siguiente.id, nombre: siguiente.nombre, estado: progreso && barrioAbierto(progreso, id, siguiente.id) ? 'abierto' : 'cerrado' }]
    : []
  const terminaste = !!progreso && departamentoCompleto(progreso, id)
  return (
    <EscenaDespedida
      nombre={barrio.nombre}
      fondo={{ departamento: id, barrio: barrio.id, nivel: barrio.niveles.length }}
      dialogo={despedidaDelBarrio(barrio)}
      elenco={elencoDelBarrio(barrio)}
      premios={barrio.niveles.flatMap((n) => n.recompensas)}
      destinos={destinos}
      sinDestinos="El barrio que sigue se abre cuando completás este."
      seguir={
        terminaste && !siguiente
          ? { texto: `Despedirte de ${dep.nombre}`, alHacer: () => navegar(`/historia/${id}/despedida`) }
          : { texto: siguiente ? `Seguir a ${siguiente.nombre}` : `Volver a ${dep.nombre}`, alHacer: () => navegar(rutaBarrio(id)) }
      }
      conNubes={false}
    />
  )
}
