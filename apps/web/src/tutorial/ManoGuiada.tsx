import { useEffect, useRef, useState } from 'react'
import { apply, enfrentamientoActual, mismaCarta, nombreCarta, type CantoEnvido, type Carta as TCarta, type EstadoPartida, type Evento } from '@truco/engine'
import { Carta } from '../componentes/Carta'
import { Muestra } from './Ejercicios'
import { aAccion, esDelRival, mismaMovida, partidaGuiada, RIVAL, VOS, type ManoGuiada, type Movida } from './guion'

/**
 * Una mano guiada en la pizarra: Don Queiroz arriba (juega solo, según el guion), las tres vueltas
 * en el medio, lo que vale la mano y tus cartas abajo. Lo que hay que hacer lo pide Don Queiroz;
 * si hacés otra cosa te explica por qué no, cuenta un error y probás de nuevo.
 */

/** Lo que tarda Don Queiroz en jugar, para que se vea qué hizo. */
export const PAUSA_RIVAL = 900

type Lado = 'vos' | 'rival'
const lado = (asiento: number): Lado => (asiento === 0 ? 'vos' : 'rival')

const NOMBRE_TRUCO = { 2: 'Truco', 3: 'Retruco', 4: 'Vale cuatro' } as const
const NOMBRE_ENVIDO: Record<CantoEnvido, string> = { envido: 'Envido', realEnvido: 'Real envido', faltaEnvido: 'Falta envido' }

/** Lo que se ve de la mano, armado con los eventos del motor (al terminar, el motor ya repartió otra). */
interface Vista {
  vueltas: { vos?: TCarta; rival?: TCarta; gana?: Lado | 'parda' }[]
  /** Lo último que dijo cada uno. */
  dicho: Partial<Record<Lado, string>>
  valor: number
  pendiente: { nivel: 2 | 3 | 4; quien: Lado } | null
  envido: { cantos: CantoEnvido[]; estado: 'cantado' | 'querido' | 'noQuerido' | 'resuelto' | null; ganador: Lado | null }
  fin: { ganador: Lado; truco: number; tanto: [number, number] } | null
}

const VISTA_INICIAL: Vista = { vueltas: [{}], dicho: {}, valor: 1, pendiente: null, envido: { cantos: [], estado: null, ganador: null }, fin: null }

function registrar(v: Vista, eventos: Evento[]): Vista {
  const r: Vista = { ...v, vueltas: v.vueltas.map((x) => ({ ...x })), dicho: { ...v.dicho }, envido: { ...v.envido, cantos: [...v.envido.cantos] } }
  for (const ev of eventos) {
    switch (ev.tipo) {
      case 'cartaJugada': {
        if (r.vueltas.at(-1)!.gana) r.vueltas.push({})
        r.vueltas.at(-1)![lado(ev.asiento)] = ev.carta ?? undefined
        delete r.dicho[lado(ev.asiento)]
        break
      }
      case 'vueltaTerminada':
        r.vueltas.at(-1)!.gana = ev.resultado === 'parda' ? 'parda' : lado(ev.resultado)
        break
      case 'cantoTruco': {
        const nivel = ev.canto === 'truco' ? 2 : ev.canto === 'retruco' ? 3 : 4
        // Subir es querer lo anterior.
        if (r.pendiente) r.valor = r.pendiente.nivel
        r.pendiente = { nivel, quien: lado(ev.asiento) }
        r.dicho[lado(ev.asiento)] = `¡${NOMBRE_TRUCO[nivel]}!`
        break
      }
      case 'cantoEnvido':
        r.envido.cantos.push(ev.canto)
        r.envido.estado = 'cantado'
        r.dicho[lado(ev.asiento)] = ev.primeroEstaElEnvido ? `¡El envido va primero! ¡${NOMBRE_ENVIDO[ev.canto]}!` : `¡${NOMBRE_ENVIDO[ev.canto]}!`
        break
      case 'respuesta':
        r.dicho[lado(ev.asiento)] = ev.respuesta === 'quiero' ? 'Quiero' : 'No quiero'
        if (ev.a === 'truco') {
          if (ev.respuesta === 'quiero' && r.pendiente) r.valor = r.pendiente.nivel
          r.pendiente = null
        } else if (ev.a === 'envido') {
          r.envido.estado = ev.respuesta === 'quiero' ? 'querido' : 'noQuerido'
          if (ev.respuesta === 'noQuiero') r.envido.ganador = lado(ev.asiento) === 'vos' ? 'rival' : 'vos'
        }
        break
      case 'tantoDeclarado':
        r.dicho[lado(ev.asiento)] = ev.tanto === null ? 'Son buenas' : `Tengo ${ev.tanto}`
        break
      case 'envidoResuelto':
        r.envido.estado = 'resuelto'
        r.envido.ganador = lado(ev.ganador)
        break
      case 'alMazo':
        r.dicho[lado(ev.asiento)] = 'Me voy al mazo'
        break
      case 'enfrentamientoTerminado':
        r.fin = { ganador: lado(ev.resultado.ganador), truco: ev.resultado.puntosTruco, tanto: ev.resultado.puntosTanto }
        r.pendiente = null
        break
    }
  }
  return r
}

/** El texto del botón: el truco dice cuál toca (truco, retruco o vale cuatro). */
function textoBoton(m: Movida, estado: EstadoPartida): string {
  switch (m.tipo) {
    case 'truco': {
      const t = enfrentamientoActual(estado).truco
      const nivel = Math.min(4, (t.pendiente ? t.pendiente.nivel : t.valor) + 1) as 2 | 3 | 4
      return NOMBRE_TRUCO[nivel]
    }
    case 'envido':
      return NOMBRE_ENVIDO[m.canto]
    case 'quiero':
      return 'Quiero'
    case 'noQuiero':
      return 'No quiero'
    case 'tanto':
      return m.tanto === 'sonBuenas' ? 'Son buenas' : `Tengo ${m.tanto}`
    case 'mazo':
      return 'Me voy al mazo'
    case 'carta':
      return nombreCarta(m.carta)
  }
}

const quien = (l: Lado) => (l === 'vos' ? 'vos' : 'Don Queiroz')

/** Lo que vale la mano y cómo va el envido, en una línea cada uno. */
function Marcador({ v }: { v: Vista }) {
  const { envido: env, fin } = v
  const truco = fin
    ? `Mano para ${quien(fin.ganador)}: +${fin.truco}`
    : v.pendiente
      ? `${NOMBRE_TRUCO[v.pendiente.nivel]} sin contestar (vale ${v.pendiente.nivel})`
      : v.valor === 1
        ? 'La mano vale 1'
        : `${NOMBRE_TRUCO[v.valor as 2 | 3 | 4]} querido: vale ${v.valor}`
  const cantos = env.cantos.map((c) => NOMBRE_ENVIDO[c]).join(' + ')
  const envido =
    env.estado === null
      ? null
      : fin && env.ganador
        ? `${cantos}: +${fin.tanto[env.ganador === 'vos' ? 0 : 1]} para ${quien(env.ganador)}`
        : env.estado === 'cantado'
          ? `${cantos} sin contestar`
          : env.estado === 'querido'
            ? `${cantos} querido: se dicen los tantos`
            : env.estado === 'noQuerido'
              ? `${cantos} no querido: para ${quien(env.ganador!)}`
              : `${cantos}: lo gana ${quien(env.ganador!)}`
  return (
    <div className={`guiada-marcador${fin ? ' fin' : ''}`} aria-label="Lo que vale la mano">
      <span>{truco}</span>
      {envido && <span>{envido}</span>}
    </div>
  )
}

const NOMBRE_VUELTA = ['1ª', '2ª', '3ª']

/** Las tres vueltas: arriba la carta de Don Queiroz, abajo la tuya, y quién la ganó. */
function Vueltas({ v }: { v: Vista }) {
  return (
    <ol className="guiada-vueltas" aria-label="Vueltas">
      {NOMBRE_VUELTA.map((nombre, i) => {
        const vu = v.vueltas[i]
        const gana = vu?.gana
        const texto = gana === 'vos' ? 'Ganaste' : gana === 'rival' ? 'Ganó él' : gana === 'parda' ? 'Parda' : ''
        return (
          <li key={nombre} className={`guiada-vuelta${gana ? ` gana-${gana}` : ''}`} aria-label={`${nombre} vuelta${texto ? `: ${texto}` : ''}`}>
            <span className="guiada-hueco">{vu?.rival && <Carta carta={vu.rival} tam="mesa" ganadora={gana === 'rival'} />}</span>
            <span className="guiada-hueco">{vu?.vos && <Carta carta={vu.vos} tam="mesa" ganadora={gana === 'vos'} />}</span>
            <small>
              {nombre}
              {texto && ` · ${texto}`}
            </small>
          </li>
        )
      })}
    </ol>
  )
}

interface Props {
  mano: ManoGuiada
  alDecir: (texto: string) => void
  alListo: (errores: number) => void
}

export function JugarManoGuiada({ mano, alDecir, alListo }: Props) {
  const { guion } = mano
  const [estado, setEstado] = useState(() => partidaGuiada(mano))
  const [i, setI] = useState(0)
  const [vista, setVista] = useState(VISTA_INICIAL)
  const [mal, setMal] = useState<Movida | null>(null)
  const errores = useRef(0)
  const paso = guion[i]
  const tuTurno = paso !== undefined && !esDelRival(paso)

  const aplicar = (m: Movida, jugador: string) => {
    const r = apply(estado, aAccion(m, jugador))
    // El guion está probado contra el motor (test/tutorialMano.test.tsx): no debería pasar.
    if (!r.ok) throw new Error(`Guion inválido en el paso ${i}: ${r.motivo}`)
    setEstado(r.estado)
    setVista((v) => registrar(v, r.eventos))
    setMal(null)
    setI(i + 1)
    const sigue = guion[i + 1]
    if (sigue === undefined) {
      alDecir(mano.fin)
      alListo(errores.current)
    } else if (!esDelRival(sigue)) alDecir(sigue.pide)
  }

  // Don Queiroz juega solo, después de una pausa.
  useEffect(() => {
    if (!paso || !esDelRival(paso)) return
    const t = setTimeout(() => aplicar(paso.rival, RIVAL), PAUSA_RIVAL)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i])

  const hacer = (m: Movida) => {
    if (!paso || esDelRival(paso)) return
    if (!mismaMovida(m, paso.espera)) {
      errores.current += 1
      setMal(m)
      alDecir(typeof paso.mal === 'function' ? paso.mal(m) : paso.mal)
      return
    }
    aplicar(m, VOS)
  }

  const jugadas = (l: Lado) => vista.vueltas.map((x) => x[l]).filter((c): c is TCarta => c !== undefined)
  const tuyas = mano.vos.filter((c) => !jugadas('vos').some((j) => mismaCarta(j, c)))
  const delRival = mano.rival.length - jugadas('rival').length
  const esMal = (m: Movida) => mal !== null && mismaMovida(mal, m)
  const conBotones = guion.some((p) => !esDelRival(p) && (p.botones?.length ?? 0) > 0)

  return (
    <div className="guiada">
      <div className="guiada-jugador rival">
        <div className="guiada-nombre">
          <strong>Don Queiroz</strong>
          {mano.mano === 'rival' && <span className="guiada-es-mano">mano</span>}
        </div>
        <div className="guiada-centro">
          <div className="guiada-dorsos" aria-label={`Don Queiroz tiene ${delRival} ${delRival === 1 ? 'carta' : 'cartas'}`}>
            {Array.from({ length: vista.fin ? 0 : delRival }, (_, k) => (
              <Carta key={k} oculta tam="chica" />
            ))}
          </div>
          {vista.dicho.rival && (
            <p className="guiada-dicho" aria-label={`Don Queiroz dice: ${vista.dicho.rival}`}>
              {vista.dicho.rival}
            </p>
          )}
        </div>
        <Muestra carta={mano.muestra} />
      </div>
      <Vueltas v={vista} />
      <Marcador v={vista} />
      <div className="guiada-jugador vos">
        <div className="guiada-nombre">
          <strong>Vos</strong>
          {mano.mano === 'vos' && <span className="guiada-es-mano">mano</span>}
        </div>
        {vista.dicho.vos && (
          <p className="guiada-dicho" aria-label={`Vos decís: ${vista.dicho.vos}`}>
            {vista.dicho.vos}
          </p>
        )}
      </div>
      <div className="guiada-mano" role="group" aria-label="Tus cartas">
        {tuyas.map((c) => {
          const m: Movida = { tipo: 'carta', carta: c }
          return (
            <button
              key={`${c.numero}-${c.palo}`}
              type="button"
              className={`tutorial-carta${esMal(m) ? ' mal' : ''}`}
              aria-label={`Tirar el ${nombreCarta(c)}`}
              disabled={!tuTurno}
              onClick={() => hacer(m)}
            >
              <Carta carta={c} tam="grande" />
            </button>
          )
        })}
      </div>
      {/* El lugar de los botones queda guardado toda la mano (que no salten las cartas); si la mano no tiene cantos, no va. */}
      {conBotones && (
        <div className="guiada-botones">
          {tuTurno &&
            paso.botones?.map((b) => (
              <button key={JSON.stringify(b)} type="button" className={`boton boton-secundario${esMal(b) ? ' guiada-mal' : ''}`} onClick={() => hacer(b)}>
                {textoBoton(b, estado)}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
