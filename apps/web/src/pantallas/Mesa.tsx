import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { mismaCarta, type Accion, type Carta as TCarta } from '@truco/engine'
import { seniaDeCarta, seniasDeMano, type Senia } from '@truco/bots'
import { MOTIVO_SENIA_TARDE, yaJugoEnLaMano } from '@truco/shared'
import { esPiezaOMata } from '../senias'
import { Acciones, BotonMazo } from '../componentes/Acciones'
import { Asiento, Avatar, MarcaMano } from '../componentes/Asiento'
import { CartasEnMesa } from '../componentes/CartasEnMesa'
import { BotonChat, PanelChat, useNoLeidos } from '../componentes/Chat'
import { EstadoConexion } from '../componentes/EstadoConexion'
import { GloboDeChat, useGlobosChat } from '../componentes/GlobosChat'
import { Fosforos } from '../componentes/Fosforos'
import { ManoOjeable } from '../componentes/ManoOjeable'
import { Mazo } from '../componentes/Mazo'
import { MenuJugador, useSilenciados } from '../componentes/MenuJugador'
import { AnilloReloj, RelojPropio } from '../componentes/Reloj'
import { useGestos } from '../componentes/Cara'
import { AvisoSeniaHecha, BotonSenias, PanelSenias, seniasRapidas, TiraSenias } from '../componentes/Senias'
import type { ConexionOnline } from '../conexion/online'
import { useJuego } from '../estado'
import { leerPerfil } from '../perfil'
import '../estilos-mesa-online.css'

export function Mesa() {
  const navegar = useNavigate()
  const { sala, vista, mesa, mostradas, globos, registro, chat, senias, pescadas, error, turno, finDeMano, conexion, enviar, salir } =
    useJuego()
  const [aviso, setAviso] = useState<string | null>(null)
  const [confirmarSalida, setConfirmarSalida] = useState(false)
  // Paneles de la mesa: chat y señas (hojas desde abajo) y el menú sobre otro jugador.
  const [panel, setPanel] = useState<'chat' | 'senias' | null>(null)
  const [menuDe, setMenuDe] = useState<number | null>(null)
  const [seniaHecha, setSeniaHecha] = useState<{ senia: Senia; id: number } | null>(null)
  // Señas rápidas: las que ya hiciste en esta mano (quedan marcadas) y si ya abriste la mano
  // (mientras está apilada para ojear, la tira no delata tus cartas).
  const [hechas, setHechas] = useState<{ mano: number; senias: Senia[] }>({ mano: 0, senias: [] })
  const [abiertaEn, setAbiertaEn] = useState<number | null>(null)
  // Las señas de compañeros y las pescadas a rivales se ven como gestos en sus avatares.
  const llegadasSenias = useMemo(() => [...senias, ...pescadas].sort((x, y) => x.id - y.id), [senias, pescadas])
  const gestos = useGestos(llegadasSenias)
  const online = conexion?.tipo === 'online'
  const { silenciados, cambiar: cambiarSilencio } = useSilenciados(online ? (conexion as ConexionOnline).roomId : null)
  const { noLeidos, marcarLeidos } = useNoLeidos(chat, sala?.yo ?? 0, silenciados, panel === 'chat')
  const cerrarPanel = useCallback(() => setPanel(null), [])
  // Cada mensaje nuevo del chat sale, unos segundos, como globito de quien lo mandó.
  const globosChat = useGlobosChat(chat, silenciados)

  useEffect(() => {
    if (!useJuego.getState().conexion) navegar('/')
  }, [navegar])

  // Los errores (y los avisos de la propia mesa) se muestran un rato y se van.
  const timerAviso = useRef<ReturnType<typeof setTimeout> | null>(null)
  const mostrarAviso = useCallback((texto: string) => {
    if (timerAviso.current) clearTimeout(timerAviso.current)
    setAviso(texto)
    timerAviso.current = setTimeout(() => setAviso(null), 2500)
  }, [])
  useEffect(() => () => clearTimeout(timerAviso.current ?? undefined), [])
  useEffect(() => {
    if (error) mostrarAviso(`⚠ ${error.motivo}`)
  }, [error, mostrarAviso])

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
  // Las que di vuelta al terminar (flor o envido) también quedan en la mesa y no en la mano.
  const misMostradas = mostradas.find((m) => m.asiento === yo)?.cartas ?? []
  const misCartas = vista.mano.misCartas.filter(
    (c) => !mesa.jugadas.some((j) => j.asiento === yo && mismaCarta(j.carta, c)) && !misMostradas.some((x) => mismaCarta(x, c)),
  )
  // Las de los demás: sin la última que tiraron (en la pausa) ni las que dieron vuelta.
  const enManoDe = (a: number) => {
    const enVista = e.vueltas.reduce((t, v) => t + v.jugadas.filter((j) => j.asiento === a).length, 0)
    const sinVista = Math.max(0, mesa.jugadas.filter((j) => j.asiento === a).length - enVista)
    const dadas = mostradas.find((m) => m.asiento === a)?.cartas.length ?? 0
    return Math.max(0, vista.jugadores[a]!.cartasEnMano - sinVista - dadas)
  }
  // En 3 contra 3, el chat del de enfrente sale hacia el costado donde no canta nadie: los
  // cantos de los costados de arriba llegan hasta su altura.
  const hablaEn = (pos: number) => !!globos[(yo + pos) % n]
  const ladoChatArriba: 'derecha' | 'izquierda' | 'abajo' =
    n !== 6 || !hablaEn(2) ? 'derecha' : !hablaEn(4) ? 'izquierda' : 'abajo'
  // El mazo en la esquina de abajo a la izquierda (repartió el de tu derecha): tus globos se corren.
  const mazoAbajoIzq = (n === 4 && rel(vista.mano.reparte) === 3) || (n === 6 && rel(vista.mano.reparte) === 5)
  const nuestro = yo % 2
  const [pn, pe] = [vista.puntos[nuestro as 0 | 1], vista.puntos[(1 - nuestro) as 0 | 1]]
  const enEquipos = n > 2
  const lugarYo = sala.lugares[yo]!
  const nombreNuestro = enEquipos ? 'Nosotros' : 'Vos'
  const nombreEllos = (enEquipos ? 'Ellos' : sala.lugares[1 - yo]?.apodo) ?? 'Ellos'
  const ganamos = vista.ganador === nuestro
  const salirDeLaMesa = () => {
    salir()
    navegar('/')
  }
  // Señas: solo si la mesa se juega con señas y en el duelo actual hay compañeros (en equipos
  // y fuera del pica-pica).
  const conSenias = sala.senias.habilitadas !== false
  const hayCompanieros = conSenias && enEquipos && !vista.mano.picaPica && vista.ganador === null
  // La cara de señas se cierra sola después de mostrar el gesto.
  const hacerSenia = (s: Senia) => {
    enviar('senia', { senia: s })
    setSeniaHecha({ senia: s, id: Date.now() })
    const numero = vista.mano.numero
    setHechas((h) => ({ mano: numero, senias: h.mano === numero ? [...new Set([...h.senias, s])] : [s] }))
  }
  const seniasCerradas = sala.senias.momento === 'antesDeJugar' && yaJugoEnLaMano(vista.mano, yo) ? MOTIVO_SENIA_TARDE : null
  // Mantener apretada una carta hace su seña.
  const seniaDeMiCarta = (c: TCarta) => {
    const s = seniaDeCarta(c, vista.mano.muestra)
    if (seniasCerradas) mostrarAviso(`⚠ ${seniasCerradas}`)
    else if (!s) mostrarAviso('Esa carta no tiene seña')
    else hacerSenia(s)
  }
  const ojear = leerPerfil().ojear
  const manoAbierta = !ojear || misCartas.length !== 3 || abiertaEn === vista.mano.numero
  const conTira = hayCompanieros && !finDeMano && misCartas.length > 0 && manoAbierta
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
          <AvisoSeniaHecha hecha={seniaHecha} />
        </div>

        {sala.lugares
          .filter((l) => l.asiento !== yo)
          .map((l) => (
            <Asiento
              key={l.asiento}
              lugar={l}
              posicion={rel(l.asiento)}
              cartasEnMano={enManoDe(l.asiento)}
              esCompaniero={l.asiento % 2 === yo % 2}
              leToca={turno.asientos.includes(l.asiento) && participa(l.asiento)}
              esMano={e.mano === l.asiento}
              participa={participa(l.asiento)}
              globo={globos[l.asiento]}
              venceEn={turno.venceEn}
              silenciado={silenciados.has(l.asiento)}
              alTocarNombre={menuPara(l.asiento)}
              gesto={conSenias ? gestos[l.asiento] : undefined}
              chat={globosChat[l.asiento]}
              arriba={rel(l.asiento) * 2 === n}
              ladoChat={ladoChatArriba}
              // Y los de los costados de arriba hablan debajo de sus cartas: arriba está el de enfrente.
              chatAbajo={n === 6 && (rel(l.asiento) === 2 || rel(l.asiento) === 4)}
            />
          ))}

        <Mazo muestra={vista.mano.muestra} n={n} reparteRel={rel(vista.mano.reparte)} />

        <CartasEnMesa
          n={n}
          rel={rel}
          mesa={mesa}
          mostradas={mostradas}
          apodo={(a) => sala.lugares[a]?.apodo ?? `Jugador ${a + 1}`}
          nuestro={nuestro}
        />
      </main>

      <section className={`mi-lugar${meToca ? ' le-toca' : ''}${miReloj !== null ? ' con-reloj' : ''}${participa(yo) ? '' : ' fuera'}`}>
        {/* Mis globos (canto y chat) salen de mi avatar, apilados como los de los demás. */}
        {(globos[yo] || globosChat[yo]) && (
          <div className={`asiento-globos mis-globos${mazoAbajoIzq ? ' corridos' : ''}`}>
            {globos[yo] && (
              <div key={globos[yo]!.id} className="globo globo-yo">
                {globos[yo]!.texto}
              </div>
            )}
            {globosChat[yo] && <GloboDeChat key={globosChat[yo]!.id} globo={globosChat[yo]!} apilado={!!globos[yo]} />}
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
            {hayCompanieros && <BotonSenias alTocar={() => setPanel('senias')} cerrado={seniasCerradas} />}
            {!finDeMano && <BotonMazo vista={vista} alElegir={jugar} />}
          </span>
        </div>
        {/* La tira de señas va a los costados de la mano (no en una fila aparte): la mesa no se achica. */}
        <div className="mi-mano-zona">
          {conTira && (
            <TiraSenias
              rapidas={seniasRapidas(misCartas, vista.mano.muestra)}
              hechas={hechas.mano === vista.mano.numero ? hechas.senias : []}
              cerrado={seniasCerradas}
              alHacer={hacerSenia}
              alRechazar={(motivo) => mostrarAviso(`⚠ ${motivo}`)}
            />
          )}
          {/* La clave es el número de mano: en cada reparto las cartas entran de nuevo y se vuelven a ojear. */}
          <ManoOjeable
            key={vista.mano.numero}
            className="mi-mano"
            cartas={misCartas}
            ojeoActivado={ojear}
            onAbrir={() => setAbiertaEn(vista.mano.numero)}
            abrirAlTocar={meToca}
            reparto
            jugable={puedeJugar}
            resaltada={(c) => sala.ayudas && esPiezaOMata(c, vista.mano.muestra)}
            alTocar={jugarCarta}
            alMantener={hayCompanieros && !finDeMano ? seniaDeMiCarta : undefined}
          />
        </div>
        <div className="mi-lugar-pie">
          {finDeMano ? (
            // Durante la pausa entre manos, el resultado va donde estaban los botones (y crece sobre la mano): no tapa la mesa.
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
      {panel === 'senias' && hayCompanieros && (
        <PanelSenias
          alElegir={hacerSenia}
          alCerrar={cerrarPanel}
          sugeridas={sala.ayudas ? seniasDeMano(vista.mano.misCartas, vista.mano.muestra) : null}
          config={sala.senias}
          cerrado={seniasCerradas}
        />
      )}
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
