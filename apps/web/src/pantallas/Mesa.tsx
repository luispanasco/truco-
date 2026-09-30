import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { mismaCarta, type Accion, type Carta as TCarta } from '@truco/engine'
import type { Senia } from '@truco/bots'
import { GESTO, SIGNIFICADO, esPiezaOMata } from '../senias'
import { Acciones, BotonMazo } from '../componentes/Acciones'
import { Asiento, Avatar, MarcaMano } from '../componentes/Asiento'
import { Carta } from '../componentes/Carta'
import { BotonChat, PanelChat, useNoLeidos } from '../componentes/Chat'
import { EstadoConexion } from '../componentes/EstadoConexion'
import { Fosforos } from '../componentes/Fosforos'
import { Mazo } from '../componentes/Mazo'
import { MenuJugador, useSilenciados } from '../componentes/MenuJugador'
import { AnilloReloj, RelojPropio } from '../componentes/Reloj'
import { BotonSenias, PanelSenias } from '../componentes/Senias'
import type { ConexionOnline } from '../conexion/online'
import { useJuego } from '../estado'
import '../estilos-mesa-online.css'

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
  const { sala, vista, mesa, globos, registro, chat, senias, error, turno, finDeMano, conexion, enviar, salir } = useJuego()
  const [aviso, setAviso] = useState<string | null>(null)
  const [confirmarSalida, setConfirmarSalida] = useState(false)
  // Paneles de la mesa: chat y señas (hojas desde abajo) y el menú sobre otro jugador.
  const [panel, setPanel] = useState<'chat' | 'senias' | null>(null)
  const [menuDe, setMenuDe] = useState<number | null>(null)
  const [seniaHecha, setSeniaHecha] = useState<{ texto: string; id: number } | null>(null)
  const online = conexion?.tipo === 'online'
  const { silenciados, cambiar: cambiarSilencio } = useSilenciados(online ? (conexion as ConexionOnline).roomId : null)
  const { noLeidos, marcarLeidos } = useNoLeidos(chat, sala?.yo ?? 0, silenciados, panel === 'chat')
  const cerrarPanel = useCallback(() => setPanel(null), [])

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

  useEffect(() => {
    if (!seniaHecha) return
    const t = setTimeout(() => setSeniaHecha(null), 2500)
    return () => clearTimeout(t)
  }, [seniaHecha])

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
  const nombreNuestro = enEquipos ? 'Nosotros' : 'Vos'
  const nombreEllos = (enEquipos ? 'Ellos' : sala.lugares[1 - yo]?.apodo) ?? 'Ellos'
  const ganamos = vista.ganador === nuestro
  const salirDeLaMesa = () => {
    salir()
    navegar('/')
  }
  // Señas: solo si en el duelo actual hay compañeros (en equipos y fuera del pica-pica).
  const hayCompanieros = enEquipos && !vista.mano.picaPica && vista.ganador === null
  const hacerSenia = (s: Senia) => {
    enviar('senia', { senia: s })
    setPanel(null)
    setSeniaHecha({ texto: GESTO[s].toLowerCase(), id: Date.now() })
  }
  // Menú de jugador: solo online y solo sobre otras personas.
  const menuPara = (a: number) => (online && a !== yo && sala.lugares[a]?.tipo === 'humano' ? () => setMenuDe(a) : undefined)
  const lugarMenu = menuDe !== null ? sala.lugares[menuDe] : undefined
  // Reloj del turno (solo online, cuando el juego espera a una persona).
  const miReloj = meToca && turno.asientos.includes(yo) ? turno.venceEn : null
  // Revancha online: cuántas personas la pidieron, de las que siguen conectadas.
  const humanos = sala.lugares.filter((l) => l.tipo === 'humano' && l.conectado).length
  const pediRevancha = sala.revancha.includes(yo)
  const textoRevancha =
    !online || humanos <= 1 ? 'Revancha' : pediRevancha ? 'Esperando a los demás…' : `Revancha ${sala.revancha.length}/${humanos}`

  return (
    <div className={`pantalla-mesa n-${n}`}>
      <header className="marcador">
        <div className="marcador-filas">
          <div className="marcador-fila nosotros">
            <span className="marcador-nombre">{nombreNuestro}</span>
            <Fosforos puntos={pn} malas={vista.config.puntosMalas} />
            <strong className="marcador-puntos">{pn}</strong>
          </div>
          <div className="marcador-fila ellos">
            <span className="marcador-nombre">{nombreEllos}</span>
            <Fosforos puntos={pe} malas={vista.config.puntosMalas} />
            <strong className="marcador-puntos">{pe}</strong>
          </div>
        </div>
        <div className="marcador-centro">
          <span className="marcador-mano">
            Mano <b>{vista.mano.numero}</b>
          </span>
          {(e.truco.valor > 1 || vista.mano.picaPica) && (
            <div className="marcador-chips">
              {e.truco.valor > 1 && <span className="marcador-valor">vale {e.truco.valor}</span>}
              {vista.mano.picaPica && <span className="marcador-valor pica">pica-pica</span>}
            </div>
          )}
        </div>
        <div className="marcador-botones">
          <BotonChat noLeidos={noLeidos} alTocar={() => setPanel('chat')} />
          <button type="button" className="boton-salir" onClick={() => setConfirmarSalida(true)} aria-label="Salir de la mesa">
            ✕
          </button>
        </div>
      </header>
      <EstadoConexion alIrAlInicio={salirDeLaMesa} />

      <main className="tapete">
        <div className="registro" aria-live="polite">
          {registro.slice(-3).map((l) => (
            <div key={l.id}>{l.texto.replace(/[━─]+/g, '').trim()}</div>
          ))}
        </div>
        <div className="avisos">
          {aviso && <div className="aviso aviso-error">{aviso}</div>}
          {seniaHecha && (
            <div className="aviso aviso-senia" key={seniaHecha.id} role="status">
              <span aria-hidden="true">😉</span> Le hiciste la seña: {seniaHecha.texto}
            </div>
          )}
          {seniaVisible && (
            <div className="aviso aviso-senia" key={seniaVisible.id}>
              <span aria-hidden="true">👀</span> <b>{sala.lugares[seniaVisible.de]?.apodo}</b>: {GESTO[seniaVisible.senia].toLowerCase()}{' '}
              <span className="aviso-detalle">({SIGNIFICADO[seniaVisible.senia]})</span>
            </div>
          )}
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
              venceEn={turno.venceEn}
              silenciado={silenciados.has(l.asiento)}
              alTocarNombre={menuPara(l.asiento)}
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

      <section className={`mi-lugar${meToca ? ' le-toca' : ''}${miReloj !== null ? ' con-reloj' : ''}${participa(yo) ? '' : ' fuera'}`}>
        {globos[yo] && (
          <div key={globos[yo]!.id} className="globo globo-yo">
            {globos[yo]!.texto}
          </div>
        )}
        <div className="mi-info">
          <div className="asiento-avatar">
            <Avatar lugar={lugarYo} tam="chico" />
            {miReloj !== null && <AnilloReloj venceEn={miReloj} />}
            {e.mano === yo && <MarcaMano />}
          </div>
          <span className="mi-nombre">{lugarYo.apodo}</span>
          {sala.ayudas && (
            <span className="mi-tanto">
              <span className="mi-tanto-etiqueta">envido </span>
              <b>{vista.mano.miTanto.envido}</b>
              {vista.mano.miTanto.flor !== null && <strong className="mi-flor">flor {vista.mano.miTanto.flor}</strong>}
            </span>
          )}
          <span className="mi-estado">
            {meToca && (miReloj !== null ? <RelojPropio venceEn={miReloj} /> : <span className="te-toca">Te toca</span>)}
            {!participa(yo) && <span className="te-toca espera">Esperás tu duelo</span>}
            {hayCompanieros && <BotonSenias alTocar={() => setPanel('senias')} />}
            {!finDeMano && <BotonMazo vista={vista} alElegir={jugar} />}
          </span>
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
        <div className="mi-lugar-pie">
          {finDeMano ? (
            // Durante la pausa entre manos, el resultado va donde estaban los botones: no tapa la mesa.
            <div className="fin-de-mano" role="status">
              {finDeMano.split('\n').map((l, i) => (
                <div key={i}>{l.trim().replace(/^✔\s*/, '')}</div>
              ))}
            </div>
          ) : (
            <Acciones vista={vista} alElegir={jugar} />
          )}
        </div>
      </section>

      {vista.ganador !== null && (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="fin-titulo">
          <div className={`modal-caja fin-caja ${ganamos ? 'fin-ganada' : 'fin-perdida'}`}>
            <div className="fin-emblema" aria-hidden="true">
              {ganamos ? '🏆' : '🧉'}
            </div>
            <h2 id="fin-titulo" className="modal-titulo fin-titulo">
              {ganamos ? (enEquipos ? '¡Ganaron!' : '¡Ganaste!') : enEquipos ? 'Perdieron' : 'Perdiste'}
            </h2>
            <p className="modal-texto">{ganamos ? 'Partida ganada' : 'Esta vez no se dio'} · a {vista.config.puntosPartida} puntos</p>
            <div className="fin-resultado" aria-label="Resultado final">
              <div className={`fin-equipo nosotros${ganamos ? ' gano' : ''}`}>
                <span>{nombreNuestro}</span>
                <strong>{pn}</strong>
              </div>
              <span className="fin-guion" aria-hidden="true">–</span>
              <div className={`fin-equipo ellos${ganamos ? '' : ' gano'}`}>
                <span>{nombreEllos}</span>
                <strong>{pe}</strong>
              </div>
            </div>
            <div className="modal-botones">
              <button type="button" className="boton boton-grande" onClick={() => enviar('revancha', {})} disabled={online && pediRevancha}>
                {textoRevancha}
              </button>
              <button type="button" className="boton boton-secundario" onClick={salirDeLaMesa}>
                Volver al inicio
              </button>
            </div>
          </div>
        </div>
      )}

      {panel === 'chat' && (
        <PanelChat
          sala={sala}
          yo={yo}
          chat={chat}
          silenciados={silenciados}
          alEnviar={(texto, canal) => enviar('chat', { texto, canal })}
          alTocarJugador={online ? (a) => setMenuDe(a) : undefined}
          alCerrar={() => {
            marcarLeidos()
            setPanel(null)
          }}
        />
      )}
      {panel === 'senias' && hayCompanieros && <PanelSenias alElegir={hacerSenia} alCerrar={cerrarPanel} />}
      {lugarMenu && (
        <MenuJugador
          key={menuDe}
          lugar={lugarMenu}
          silenciado={silenciados.has(lugarMenu.asiento)}
          alSilenciar={(silenciar) => {
            enviar('silenciar', { asiento: lugarMenu.asiento, silenciar })
            cambiarSilencio(lugarMenu.asiento, silenciar)
          }}
          alReportar={(motivo) => enviar('reportar', { asiento: lugarMenu.asiento, motivo })}
          alCerrar={() => setMenuDe(null)}
        />
      )}

      {confirmarSalida && (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="salir-titulo">
          <div className="modal-caja">
            <div className="fin-emblema chico" aria-hidden="true">
              🚪
            </div>
            <h2 id="salir-titulo" className="modal-titulo">
              ¿Abandonar la partida?
            </h2>
            <p className="modal-texto">{vista.ganador === null ? 'La partida en curso se pierde.' : 'Volvés al inicio.'}</p>
            <div className="modal-botones">
              <button type="button" className="boton boton-peligro" onClick={salirDeLaMesa}>
                Abandonar
              </button>
              <button type="button" className="boton boton-secundario" onClick={() => setConfirmarSalida(false)}>
                Seguir jugando
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
