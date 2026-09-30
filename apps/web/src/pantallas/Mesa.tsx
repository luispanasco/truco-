import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { mismaCarta, type Accion, type Carta as TCarta } from '@truco/engine'
import { GESTO, SIGNIFICADO, esPiezaOMata } from '../senias'
import { Acciones } from '../componentes/Acciones'
import { Asiento, Avatar } from '../componentes/Asiento'
import { Carta } from '../componentes/Carta'
import { Fosforos } from '../componentes/Fosforos'
import { Mazo } from '../componentes/Mazo'
import { useJuego } from '../estado'

/**
 * Hacia dónde queda cada jugador visto desde el centro (x a la derecha, y hacia abajo), por
 * cantidad de jugadores y posición relativa. Las cartas tiradas llegan desde ahí.
 */
const DIRECCION: Record<number, [number, number][]> = {
  2: [[0, 1], [0, -1]],
  4: [[0, 1], [1, 0], [0, -1], [-1, 0]],
  6: [[0, 1], [0.8, 0.6], [0.8, -0.6], [0, -1], [-0.8, -0.6], [-0.8, 0.6]],
}
/** Distancia (px) desde la que llega volando una carta tirada. */
const VUELO = 170
const DURACION = 0.3

function direccion(n: number, pos: number): [number, number] {
  return DIRECCION[n]?.[pos] ?? [0, 1]
}

export function Mesa() {
  const navegar = useNavigate()
  const { sala, vista, mesa, globos, registro, senias, error, turno, finDeMano, enviar, salir } = useJuego()
  const [aviso, setAviso] = useState<string | null>(null)
  const [confirmarSalida, setConfirmarSalida] = useState(false)

  useEffect(() => {
    if (!useJuego.getState().conexion) navegar('/')
  }, [navegar])

  // Los errores y las señas se muestran un rato y se van.
  useEffect(() => {
    if (!error) return
    setAviso(`⚠ ${error.motivo}`)
    const t = setTimeout(() => setAviso(null), 2500)
    return () => clearTimeout(t)
  }, [error])
  const ultimaSenia = senias[senias.length - 1]
  const [seniaVisible, setSeniaVisible] = useState<typeof ultimaSenia>(undefined)
  useEffect(() => {
    if (!ultimaSenia) return
    setSeniaVisible(ultimaSenia)
    const t = setTimeout(() => setSeniaVisible(undefined), 3500)
    return () => clearTimeout(t)
  }, [ultimaSenia])

  if (!sala || !vista) return <div className="cargando">Repartiendo…</div>

  const yo = vista.yo.asiento
  const n = vista.jugadores.length
  const rel = (a: number) => (a - yo + n) % n
  const e = vista.mano.enfrentamientos[vista.mano.actual]!
  const participa = (a: number) => e.participantes.includes(a)
  // Durante la pausa entre manos no se juega: la vista todavía es la de la mano que terminó.
  const meToca = vista.esperandoA.includes(yo) && vista.ganador === null && !finDeMano
  const jugar = (a: Accion) => enviar('accion', { accion: a })
  const jugarCarta = (c: TCarta) => {
    const a = vista.accionesValidas.find((x) => x.tipo === 'jugarCarta' && mismaCarta(x.carta, c))
    if (a) jugar(a)
  }
  const puedeJugar = (c: TCarta) =>
    !finDeMano &&
    vista.accionesValidas.some((x) => x.tipo === 'jugarCarta' && mismaCarta(x.carta, c))
  // En la pausa entre manos la vista todavía no trae la última jugada: no mostrar dos veces la carta.
  const misCartas = vista.mano.misCartas.filter(
    (c) => !mesa.jugadas.some((j) => j.asiento === yo && mismaCarta(j.carta, c)),
  )
  const nuestro = yo % 2
  const [pn, pe] = [vista.puntos[nuestro as 0 | 1], vista.puntos[(1 - nuestro) as 0 | 1]]
  const enEquipos = n > 2
  const vueltas = e.vueltas.filter((v) => v.resultado !== null)
  const lugarYo = sala.lugares[yo]!
  const salirDeLaMesa = () => {
    salir()
    navegar('/')
  }

  return (
    <div className={`pantalla-mesa n-${n}`}>
      <header className="marcador">
        <div className="marcador-filas">
          <div className="marcador-fila nosotros">
            <span className="marcador-nombre">{enEquipos ? 'Nosotros' : 'Vos'}</span>
            <Fosforos puntos={pn} malas={vista.config.puntosMalas} />
            <strong>{pn}</strong>
          </div>
          <div className="marcador-fila ellos">
            <span className="marcador-nombre">{enEquipos ? 'Ellos' : sala.lugares[1 - yo]?.apodo}</span>
            <Fosforos puntos={pe} malas={vista.config.puntosMalas} />
            <strong>{pe}</strong>
          </div>
        </div>
        <div className="marcador-centro">
          <span className="marcador-mano">Mano {vista.mano.numero}</span>
          {e.truco.valor > 1 && <div className="marcador-valor">vale {e.truco.valor}</div>}
          {vista.mano.picaPica && <div className="marcador-valor">pica-pica</div>}
        </div>
        <button type="button" className="boton-salir" onClick={() => setConfirmarSalida(true)} aria-label="Salir de la mesa">
          ✕
        </button>
      </header>

      <main className="tapete">
        <div className="registro" aria-live="polite">
          {registro.slice(-3).map((l) => (
            <div key={l.id}>{l.texto}</div>
          ))}
        </div>

        {sala.lugares
          .filter((l) => l.asiento !== yo)
          .map((l) => (
            <Asiento
              key={l.asiento}
              lugar={l}
              posicion={rel(l.asiento)}
              cartasEnMano={vista.jugadores[l.asiento]!.cartasEnMano}
              esCompaniero={l.asiento % 2 === yo % 2}
              leToca={turno.asientos.includes(l.asiento) && participa(l.asiento)}
              esMano={e.mano === l.asiento}
              participa={participa(l.asiento)}
              globo={globos[l.asiento]}
            />
          ))}

        <Mazo muestra={vista.mano.muestra} n={n} reparteRel={rel(vista.mano.reparte)} />

        <div className="centro">
          {/* Las jugadas se ubican con transform en CSS; lo animado va en un envoltorio adentro. */}
          <AnimatePresence>
            {mesa.jugadas.map((j) => {
              const [dx, dy] = direccion(n, rel(j.asiento))
              return (
                <div key={`${j.asiento}-${j.carta.numero}-${j.carta.palo}`} className={`jugada pos-${rel(j.asiento)}`}>
                  <motion.div
                    className="jugada-vuelo"
                    // Llega desde el lado de quien la tiró, un poco girada.
                    initial={{ x: dx * VUELO, y: dy * VUELO, rotate: (dx || 1) * 14, opacity: 0 }}
                    animate={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                    // Al levantar la mesa se achica y se va hacia el centro.
                    exit={{ x: -dx * 30, y: -dy * 30, scale: 0.6, opacity: 0 }}
                    transition={{ duration: DURACION, ease: 'easeOut' }}
                  >
                    <Carta carta={j.carta} tam="mesa" ganadora={mesa.cerrada && mesa.ganador === j.asiento} />
                  </motion.div>
                </div>
              )
            })}
          </AnimatePresence>
          {vueltas.length > 0 && (
            <div className="vueltas" aria-label="Resultado de las vueltas">
              {vueltas.map((v, i) => (
                <span key={i} className={v.resultado === 'parda' ? 'parda' : v.resultado === nuestro ? 'ganada' : 'perdida'}>
                  {v.resultado === 'parda' ? '=' : v.resultado === nuestro ? '✔' : '✘'}
                </span>
              ))}
            </div>
          )}
        </div>
      </main>

      <section className={`mi-lugar${meToca ? ' le-toca' : ''}${participa(yo) ? '' : ' fuera'}`}>
        {globos[yo] && (
          <div key={globos[yo]!.id} className="globo globo-yo">
            {globos[yo]!.texto}
          </div>
        )}
        <div className="mi-info">
          <Avatar lugar={lugarYo} tam="chico" />
          <span className="mi-nombre">
            {lugarYo.apodo}
            {e.mano === yo && <span className="marca-mano">M</span>}
          </span>
          {sala.ayudas && (
            <span className="mi-tanto">
              envido {vista.mano.miTanto.envido}
              {vista.mano.miTanto.flor !== null && <strong> · ¡flor de {vista.mano.miTanto.flor}!</strong>}
            </span>
          )}
          {meToca && <span className="te-toca">Te toca</span>}
          {!participa(yo) && <span className="te-toca espera">Esperás tu duelo</span>}
        </div>
        <div className="mi-mano">
          {misCartas.map((c, i) => (
            // La clave lleva el número de mano: en cada reparto las cartas entran de nuevo, escalonadas.
            <motion.div
              key={`${vista.mano.numero}-${c.numero}-${c.palo}`}
              className="mano-reparto"
              initial={{ y: -90, scale: 0.7, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              transition={{ duration: DURACION, ease: 'easeOut', delay: i * 0.08 }}
            >
              <Carta
                carta={c}
                tam="grande"
                jugable={puedeJugar(c)}
                resaltada={sala.ayudas && esPiezaOMata(c, vista.mano.muestra)}
                alTocar={() => jugarCarta(c)}
              />
            </motion.div>
          ))}
        </div>
        {!finDeMano && <Acciones vista={vista} alElegir={jugar} />}
      </section>

      {finDeMano && (
        // Durante la pausa entre manos, el resultado se muestra arriba, sin tapar la mesa.
        <div className="fin-de-mano" role="status">
          {finDeMano.split('\n').map((l, i) => (
            <div key={i}>{l.trim().replace(/^✔\s*/, '')}</div>
          ))}
        </div>
      )}
      {aviso && <div className="aviso">{aviso}</div>}
      {seniaVisible && (
        <div className="aviso aviso-senia" key={seniaVisible.id}>
          👀 {sala.lugares[seniaVisible.de]?.apodo}: {GESTO[seniaVisible.senia].toLowerCase()} ({SIGNIFICADO[seniaVisible.senia]})
        </div>
      )}

      {vista.ganador !== null && (
        <div className="fin">
          <div className="fin-caja">
            <h2>{vista.ganador === nuestro ? (enEquipos ? '¡Ganaron!' : '¡Ganaste!') : enEquipos ? 'Perdieron' : 'Perdiste'}</h2>
            <p>
              {enEquipos ? 'Nosotros' : 'Vos'} {pn} · {enEquipos ? 'Ellos' : sala.lugares[1 - yo]?.apodo} {pe}
            </p>
            <button type="button" className="boton" onClick={() => enviar('revancha', {})}>
              Revancha
            </button>
            <button type="button" className="boton boton-secundario" onClick={salirDeLaMesa}>
              Volver al inicio
            </button>
          </div>
        </div>
      )}

      {confirmarSalida && (
        <div className="fin" role="dialog" aria-modal="true" aria-label="Abandonar la partida">
          <div className="fin-caja">
            <h2 className="titulo-dialogo">¿Abandonar la partida?</h2>
            <p>{vista.ganador === null ? 'La partida en curso se pierde.' : 'Volvés al inicio.'}</p>
            <button type="button" className="boton boton-peligro" onClick={salirDeLaMesa}>
              Abandonar
            </button>
            <button type="button" className="boton boton-secundario" onClick={() => setConfirmarSalida(false)}>
              Seguir jugando
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
