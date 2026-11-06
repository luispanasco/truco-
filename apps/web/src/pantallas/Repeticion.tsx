import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { enfrentamientoActual } from '@truco/engine'
import { describirEvento, pasosDeRepeticion, type PasoRepeticion, type RepeticionPartida } from '@truco/shared'
import { Carta } from '../componentes/Carta'
import { CabeceraOnline } from '../componentes/Online'
import { iniciarCuenta, useCuenta } from '../cuenta/cuenta'
import { repeticionDeGrupo } from '../cuenta/grupos'
import '../estilos-grupos.css'

const NOMBRE_FORMATO = { '1v1': '1 vs 1', '2v2': '2 vs 2', '3v3': '3 vs 3' } as const
/** Cuánto dura cada jugada cuando se reproduce sola. */
const PASO_MS = 1100

/**
 * La repetición de una partida del muro de un grupo: se vuelve a jugar con el motor (con la semilla
 * y las acciones) y se ve con las cartas de todos boca arriba: la muestra, las vueltas de la mano y
 * lo que va pasando. Se avanza de a una jugada, de a una mano o sola.
 */
export function Repeticion() {
  const { id = '' } = useParams()
  const navegar = useNavigate()
  const estado = useCuenta((s) => s.estado)
  const [datos, setDatos] = useState<RepeticionPartida | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [i, setI] = useState(0)
  const [sola, setSola] = useState(false)
  useEffect(() => void iniciarCuenta(), [])
  useEffect(() => {
    if (estado !== 'adentro') return
    repeticionDeGrupo(id).then(setDatos, (e: unknown) => setError(e instanceof Error ? e.message : 'No se pudo traer la repetición'))
  }, [estado, id])
  const pasos = useMemo(() => (datos ? pasosDeRepeticion(datos) : []), [datos])
  // Dónde empieza cada mano (para saltar de a una).
  const manos = useMemo(() => pasos.flatMap((p, k) => (k === 0 || p.estado.mano.numero !== pasos[k - 1]!.estado.mano.numero ? [k] : [])), [pasos])

  useEffect(() => {
    if (!sola) return
    if (i >= pasos.length - 1) return setSola(false)
    const t = setTimeout(() => setI((x) => Math.min(x + 1, pasos.length - 1)), PASO_MS)
    return () => clearTimeout(t)
  }, [sola, i, pasos.length])

  const volver = () => navegar(-1)
  if (!datos || pasos.length === 0) {
    return (
      <div className="pantalla-inicio pantalla-online">
        <CabeceraOnline titulo="Repetición" alVolver={volver} />
        <section className="tarjeta">
          <p className="nota-izq">{estado !== 'adentro' && estado !== 'cargando' && estado !== 'entrando' ? 'Para ver la repetición, entrá a tu cuenta.' : (error ?? 'Cargando…')}</p>
        </section>
      </div>
    )
  }

  const paso = pasos[i]!
  const nombre = (a: number) => datos.jugadores.find((j) => j.asiento === a)?.apodo ?? `Jugador ${a + 1}`
  const equipo = (e: 0 | 1) => datos.jugadores.filter((j) => j.asiento % 2 === e).map((j) => j.apodo).join(' y ')
  const manoActual = manos.filter((m) => m <= i).length
  const irMano = (delta: number) => {
    const actual = manos.filter((m) => m <= i).length - 1
    const destino = manos[Math.max(0, Math.min(manos.length - 1, actual + delta))]!
    setSola(false)
    setI(destino)
  }
  const mover = (delta: number) => {
    setSola(false)
    setI((x) => Math.max(0, Math.min(pasos.length - 1, x + delta)))
  }
  return (
    <div className="pantalla-inicio pantalla-online pantalla-repeticion">
      <CabeceraOnline titulo="Repetición" alVolver={volver} />
      <p className="nota-izq repeticion-fecha">
        {NOMBRE_FORMATO[datos.config.formato]} a {datos.config.puntosPartida} · {new Date(datos.fecha).toLocaleDateString('es-UY', { day: 'numeric', month: 'long' })}
      </p>
      <section className="repeticion-marcador" aria-label="Tanteo">
        {([0, 1] as const).map((e) => (
          <div key={e} className={`repeticion-equipo${paso.estado.ganador === e ? ' gano' : ''}`}>
            <span>{equipo(e)}</span>
            <strong>{paso.estado.puntos[e]}</strong>
          </div>
        ))}
      </section>
      <MesaDeRepeticion paso={paso} nombre={nombre} />
      <LoQuePaso pasos={pasos} hasta={i} nombre={nombre} equipo={equipo} />
      <div className="repeticion-controles" role="group" aria-label="Controles de la repetición">
        <button type="button" className="boton boton-secundario" onClick={() => irMano(-1)} aria-label="Mano anterior">
          ⏮
        </button>
        <button type="button" className="boton boton-secundario" onClick={() => mover(-1)} aria-label="Jugada anterior">
          ◀
        </button>
        <button type="button" className="boton" onClick={() => setSola(!sola)} aria-label={sola ? 'Pausar' : 'Reproducir'}>
          {sola ? '⏸' : '▶'}
        </button>
        <button type="button" className="boton boton-secundario" onClick={() => mover(1)} aria-label="Jugada siguiente">
          ▶❘
        </button>
        <button type="button" className="boton boton-secundario" onClick={() => irMano(1)} aria-label="Mano siguiente">
          ⏭
        </button>
      </div>
      <p className="nota-izq repeticion-progreso" role="status">
        Mano {manoActual} de {manos.length} · jugada {i} de {pasos.length - 1}
      </p>
    </div>
  )
}

/** La mesa de la repetición: la muestra, las cartas que le quedan a cada uno y las vueltas de la mano. */
function MesaDeRepeticion({ paso, nombre }: { paso: PasoRepeticion; nombre: (a: number) => string }) {
  const { estado } = paso
  const e = enfrentamientoActual(estado)
  const asientos = estado.jugadores.map((j) => j.asiento)
  return (
    <section className="repeticion-mesa" aria-label="La mesa">
      <div className="repeticion-muestra">
        <small>Muestra</small>
        {estado.mano.muestra && <Carta carta={estado.mano.muestra} tam="chica" />}
      </div>
      <ul className="repeticion-jugadores">
        {asientos.map((a) => (
          <li key={a} className={`repeticion-jugador equipo-${a % 2}${e.mano === a ? ' es-mano' : ''}`}>
            <span className="repeticion-nombre">
              {nombre(a)}
              {e.mano === a && <small> · mano</small>}
            </span>
            <span className="repeticion-cartas" aria-label={`Cartas de ${nombre(a)}`}>
              {(estado.mano.cartas[a] ?? []).map((c) => (
                <Carta key={`${c.numero}-${c.palo}`} carta={c} tam="chica" />
              ))}
            </span>
          </li>
        ))}
      </ul>
      <ol className="repeticion-vueltas" aria-label="Vueltas de la mano">
        {e.vueltas.map((v, k) => (
          <li key={k}>
            <small>Vuelta {k + 1}</small>
            <span className="repeticion-jugadas">
              {v.jugadas.map((j) => (
                <span key={j.asiento} className={`repeticion-jugada equipo-${j.asiento % 2}`} title={nombre(j.asiento)}>
                  <Carta carta={j.carta} tam="chica" oculta={j.tapada} />
                  <small>{nombre(j.asiento)}</small>
                </span>
              ))}
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** Las últimas jugadas, en palabras (como el registro de la mesa). */
function LoQuePaso({
  pasos,
  hasta,
  nombre,
  equipo,
}: {
  pasos: PasoRepeticion[]
  hasta: number
  nombre: (a: number) => string
  equipo: (e: 0 | 1) => string
}) {
  const lineas: string[] = []
  for (let k = hasta; k > 0 && lineas.length < 4; k--) {
    const textos = pasos[k]!.eventos
      .map((ev) => describirEvento(ev, nombre, equipo, (e, objeto) => `${objeto} ganan ${equipo(e)}`))
      .filter((t): t is string => !!t)
      .map((t) => t.trim().split('\n')[0]!.replace(/[━─]+/g, '').trim())
      .filter(Boolean)
    lineas.unshift(...textos.reverse().slice(0, 4 - lineas.length).reverse())
  }
  return (
    <ul className="repeticion-registro" aria-live="polite">
      {lineas.length === 0 ? <li>Se reparte la primera mano.</li> : lineas.map((l, k) => <li key={`${hasta}-${k}`}>{l}</li>)}
    </ul>
  )
}
