import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import type { Carta as TCarta } from '@truco/engine'
import type { InfoSala, LugarPublico, MensajesServidor } from '@truco/shared'
import type { ReyesEnCurso } from '../estado'
import type { VistaMesa } from '../perfil'
import { aLocal, centro } from '../perspectiva'
import { asientosDespuesDeReyes, MOVER_REYES_MS, planReyes, VUELO_REYES_MS } from '../tiradaReyes'
import { Asiento, Avatar } from './Asiento'
import { Carta } from './Carta'
import { Fosforos } from './Fosforos'
import { PilaMazo, posicionMazo } from './Mazo'
import { estiloAsiento, PanioEnPerspectiva, useMesaEnPerspectiva } from './Perspectiva'
import '../estilos-mesa-cartas.css'

/** Cuánto tarda en salir cada carta de la tirada. */
const PASO_S = 0.35

/** "Ana", "Ana y Beto", "Ana, Beto y Caro". */
function enLista(nombres: string[]): string {
  return nombres.length <= 1 ? (nombres[0] ?? '') : `${nombres.slice(0, -1).join(', ')} y ${nombres.at(-1)}`
}

/**
 * La tirada de reyes en un cuadro: el respaldo con movimiento reducido (en la mesa no se anima
 * nada). Las cartas salen de a una, frente a cada jugador, hasta el rey que reparte (y, con
 * equipos, los que van juntos). Se cierra sola.
 */
export function TiradaDeReyes({
  reyes,
  alCerrar,
}: {
  reyes: MensajesServidor['reyes']
  alCerrar: () => void
}) {
  const apodo = (a: number) => reyes.apodos[a] ?? `Jugador ${a + 1}`
  const reducido = useReducedMotion()
  const duracion = (reducido ? 0 : reyes.tiradas.length * PASO_S) + 2.8
  useEffect(() => {
    const t = setTimeout(alCerrar, duracion * 1000)
    return () => clearTimeout(t)
  }, [alCerrar, duracion])
  const primero = reyes.tiradas.find((t) => t.carta.numero === 12)
  return (
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby="reyes-titulo" onClick={alCerrar}>
      <div className="modal-caja reyes-caja" onClick={(ev) => ev.stopPropagation()}>
        <h2 id="reyes-titulo" className="modal-titulo">
          Tirando reyes
        </h2>
        <ol className="reyes-tiradas">
          {reyes.tiradas.map((t, i) => (
            <motion.li
              key={i}
              className={`reyes-tirada${t.carta.numero === 12 ? ' rey' : ''}`}
              initial={reducido ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * PASO_S, duration: 0.25 }}
            >
              <Carta carta={t.carta} tam="chica" />
              <span>{apodo(t.asiento)}</span>
            </motion.li>
          ))}
        </ol>
        <motion.p
          className="modal-texto"
          initial={reducido ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reyes.tiradas.length * PASO_S }}
        >
          {primero && <>Reparte {apodo(primero.asiento)}.</>}
          {reyes.equipos && <> Van juntos: {reyes.equipos.map(apodo).join(', ')}.</>}
        </motion.p>
        <div className="modal-botones">
          <button type="button" className="boton boton-grande" onClick={alCerrar}>
            Listo
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Una carta de la tirada: sale boca arriba del mazo y vuela hasta quedar frente a su jugador
 * (se mide en pantalla desde el mazo, así sirve en cualquier mesa y tamaño).
 */
function CartaDeReyes({ carta, giro }: { carta: TCarta; giro: number }) {
  const ref = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const el = ref.current
    const pila = el?.closest('.tapete')?.querySelector('.mazo-reyes .mazo-pila')
    if (!el || !pila || typeof el.animate !== 'function') return
    // En perspectiva la carta está en el paño inclinado: el recorrido se mide en el paño sin
    // inclinar, y la carta va por el aire (hacia la cámara) antes de caer.
    const panio = el.closest<HTMLElement>('.panio')
    const a = panio ? aLocal(panio, centro(pila)) : null
    const b = panio ? aLocal(panio, centro(el)) : null
    const [p, q] = a && b ? [a, b] : [centro(pila), centro(el)]
    const [dx, dy] = [p[0] - q[0], p[1] - q[1]]
    const anim = el.animate(
      a && b
        ? [
            { transform: `translate3d(${dx}px, ${dy}px, 0px) rotate(-8deg) scale(0.9)` },
            { transform: `translate3d(${dx * 0.45}px, ${dy * 0.45}px, 50px) rotate(${giro / 2}deg) scale(0.95)`, offset: 0.45 },
            { transform: `translate3d(0px, 0px, 0px) rotate(${giro}deg) scale(1)` },
          ]
        : [
            { transform: `translate(${dx}px, ${dy}px) rotate(-8deg) scale(0.9)` },
            { transform: `translate(0px, 0px) rotate(${giro}deg) scale(1)` },
          ],
      { duration: VUELO_REYES_MS, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)', fill: 'backwards' },
    )
    return () => anim.cancel()
  }, [giro])
  const rey = carta.numero === 12
  return (
    <div ref={ref} className={`reyes-vuelo${rey ? ' rey' : ''}`} style={{ rotate: `${giro}deg` }}>
      <Carta carta={carta} tam="mesa" ganadora={rey} />
    </div>
  )
}

type Etapa = 'tirada' | 'levantar' | 'mover' | 'aviso'

interface PropsMesa {
  reyes: ReyesEnCurso
  /** La sala ya con los lugares nuevos. */
  sala: InfoSala
  vistaMesa: VistaMesa
  alTerminar: () => void
}

/**
 * La tirada de reyes en la mesa, antes de la primera mano: del mazo sale una carta boca arriba
 * frente a cada jugador, en orden, hasta el rey (con equipos, hasta el último rey, salteando a
 * los que ya sacaron). Si con equipos al azar cambiaron los compañeros, los avatares se van a sus
 * lugares nuevos. Al final, quién reparte; y arranca la mano.
 */
export function TiradaEnMesa({ reyes, sala, vistaMesa, alTerminar }: PropsMesa) {
  const n = reyes.apodos.length
  const perspectiva = vistaMesa === 'perspectiva'
  const { ref: refTapete, medidas } = useMesaEnPerspectiva(perspectiva, n)
  const nuevo = useMemo(() => asientosDespuesDeReyes(reyes.apodos, reyes.lugaresAntes, sala.lugares), [reyes, sala.lugares])
  const yoViejo = reyes.yoAntes
  const yoNuevo = sala.yo ?? nuevo[yoViejo] ?? 0
  const relViejo = (a: number) => (a - yoViejo + n) % n
  const relNuevo = (a: number) => (nuevo[a]! - yoNuevo + n) % n
  const seMueven = reyes.apodos.some((_, a) => relViejo(a) !== relNuevo(a))
  // El plan se arma una vez, al empezar: la sala puede cambiar en el medio (alguien se desconecta).
  const [plan] = useState(() => planReyes(reyes.tiradas, seMueven))
  const [dadas, setDadas] = useState(0)
  const [etapa, setEtapa] = useState<Etapa>('tirada')
  const terminar = useRef(alTerminar)
  terminar.current = alTerminar

  useEffect(() => {
    const timers = plan.salidas.map((t, i) => setTimeout(() => setDadas(i + 1), t))
    timers.push(setTimeout(() => setEtapa('levantar'), plan.levantar))
    if (plan.mover !== null) timers.push(setTimeout(() => setEtapa('mover'), plan.mover))
    timers.push(setTimeout(() => setEtapa('aviso'), plan.aviso))
    timers.push(setTimeout(() => terminar.current(), plan.fin))
    return () => timers.forEach(clearTimeout)
  }, [plan])

  // Los avatares que cambian de lugar se deslizan de donde estaban al lugar nuevo (FLIP: se
  // mide antes y después de cambiar de posición, y se anima la diferencia).
  const movido = etapa === 'mover' || (etapa === 'aviso' && plan.mover !== null)
  const tapete = useRef<HTMLElement | null>(null)
  const antes = useRef<Map<string, DOMRect>>(new Map())
  if (!movido && tapete.current) {
    antes.current = new Map(
      [...tapete.current.querySelectorAll<HTMLElement>('.asiento[data-asiento]')].map((el) => [el.dataset.asiento!, el.getBoundingClientRect()]),
    )
  }
  useLayoutEffect(() => {
    if (!movido || !tapete.current) return
    const animaciones: Animation[] = []
    tapete.current.querySelectorAll<HTMLElement>('.asiento[data-asiento]').forEach((el) => {
      const r0 = antes.current.get(el.dataset.asiento!)
      if (!r0 || typeof el.animate !== 'function') return
      const r1 = el.getBoundingClientRect()
      const [dx, dy] = [r0.left - r1.left, r0.top - r1.top]
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
      const opciones = { duration: MOVER_REYES_MS, easing: 'cubic-bezier(0.45, 0, 0.25, 1)' }
      const panio = perspectiva ? tapete.current!.querySelector('.panio')?.getBoundingClientRect() : undefined
      if (!panio) {
        animaciones.push(el.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0px 0px' }], opciones))
        return
      }
      // En perspectiva caminan alrededor de la mesa (no la cruzan): a mitad de camino pasan por
      // afuera del paño. Y crecen o se achican según se acerquen o se alejen.
      const [cx, cy] = [panio.left + panio.width / 2, panio.top + panio.height / 2]
      const [x0, y0] = [r0.left + r0.width / 2, r0.top + r0.height / 2]
      const [x1, y1] = [r1.left + r1.width / 2, r1.top + r1.height / 2]
      const [mx, my] = [(x0 + x1) / 2 - cx, (y0 + y1) / 2 - cy]
      const largo = Math.hypot(mx, my)
      // Si cruzaban por el medio, dan la vuelta por el lado de lejos.
      const [ux, uy] = largo > 20 ? [mx / largo, my / largo] : [0, -1]
      const radio = Math.max(largo, Math.min(panio.width, panio.height) * 0.62)
      const [px, py] = [cx + ux * radio - x1, cy + uy * radio - y1]
      const escala = r0.height / Math.max(1, r1.height)
      animaciones.push(
        el.animate(
          [
            { translate: `${dx}px ${dy}px`, scale: `${escala}` },
            { translate: `${px}px ${py}px`, scale: `${(escala + 1) / 2}`, offset: 0.5 },
            { translate: '0px 0px', scale: '1' },
          ],
          opciones,
        ),
      )
    })
    // Si el efecto se vuelve a correr, las animaciones siguen: no se cortan a mitad de camino.
  }, [movido, perspectiva])

  const lugarDe = (a: number): LugarPublico =>
    sala.lugares[nuevo[a]!] ?? { asiento: a, tipo: 'bot', apodo: reyes.apodos[a] ?? `Jugador ${a + 1}`, avatar: null, conectado: true, anfitrion: false }
  const pos = (a: number) => (movido ? relNuevo(a) : relViejo(a))
  const yo = lugarDe(yoViejo)
  const reparte = sala.lugares[reyes.reparte]?.apodo ?? reyes.apodos[reyes.tiradas.find((t) => t.carta.numero === 12)?.asiento ?? 0]
  // El mazo de la tirada, a la derecha del que tira (el anterior al primero que recibe).
  const tira = ((reyes.tiradas[0]?.asiento ?? 0) - 1 + n) % n
  const enEquipos = n > 2
  const rival = reyes.apodos.map((_, a) => a).find((a) => a !== yoViejo)
  const nombreEllos = enEquipos ? 'Ellos' : rival !== undefined ? lugarDe(rival).apodo : 'Ellos'
  const malas = sala.config.puntosMalas
  // Cuántas cartas lleva cada uno: las de abajo asoman un poco, como una pila.
  const delMismo = reyes.tiradas.map((t, i) => reyes.tiradas.slice(0, i).filter((x) => x.asiento === t.asiento).length)
  const aviso = etapa === 'aviso'
  const mazoYTirada = (
    <>
      <motion.div
        className={`mazo mazo-reyes${n === 6 ? ' mazo-chico' : ''}`}
        style={posicionMazo(n, relViejo(tira), perspectiva)}
        aria-label="Mazo"
        initial={false}
        animate={{ opacity: etapa === 'tirada' ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <PilaMazo />
      </motion.div>

      <motion.div
        className="centro cartas-en-mesa tirada-reyes"
        aria-label="Cartas de la tirada de reyes"
        initial={false}
        animate={{ opacity: etapa === 'tirada' ? 1 : 0, scale: etapa === 'tirada' ? 1 : 0.96 }}
        transition={{ duration: 0.3 }}
      >
        {reyes.tiradas.slice(0, dadas).map((t, i) => (
          <div
            key={i}
            className={`jugada pos-${relViejo(t.asiento)}`}
            // Arriba del mazo (z-index 1), como las jugadas.
            style={{ '--vuelta': 1 + Math.min(delMismo[i]!, 6) * 0.14, zIndex: i + 2 } as CSSProperties}
            aria-label={`${reyes.apodos[t.asiento] ?? ''}: ${t.carta.numero === 12 ? 'rey' : 'carta'}`}
          >
            <CartaDeReyes carta={t.carta} giro={((i * 37) % 13) - 6} />
          </div>
        ))}
      </motion.div>
    </>
  )

  return (
    <div className={`pantalla-mesa n-${n}${vistaMesa === 'sentados' ? ' mesa-bustos' : ''}${perspectiva ? ' mesa-perspectiva' : ''} tirando-reyes`}>
      <header className="marcador">
        <div className="marcador-filas">
          <div className="marcador-fila nosotros">
            <span className="marcador-nombre">{enEquipos ? 'Nosotros' : 'Vos'}</span>
            <Fosforos puntos={0} malas={malas} />
            <strong className="marcador-puntos">0</strong>
          </div>
          <div className="marcador-fila ellos">
            <span className="marcador-nombre">{nombreEllos}</span>
            <Fosforos puntos={0} malas={malas} />
            <strong className="marcador-puntos">0</strong>
          </div>
        </div>
        <div className="marcador-centro">
          <span className="marcador-mano">Tirando reyes</span>
        </div>
      </header>

      <main
        className="tapete"
        ref={(el) => {
          tapete.current = el
          refTapete(el)
        }}
      >
        {reyes.apodos.map((_, a) =>
          a === yoViejo ? null : (
            <Asiento
              key={a}
              lugar={lugarDe(a)}
              posicion={pos(a)}
              cartasEnMano={0}
              esCompaniero={pos(a) % 2 === 0}
              leToca={false}
              esMano={false}
              participa
              arriba={pos(a) * 2 === n}
              busto={vistaMesa !== 'circulos'}
              estilo={perspectiva ? estiloAsiento(medidas, pos(a)) : undefined}
            />
          ),
        )}

        {/* En perspectiva, el mazo y las cartas de la tirada se apoyan en el paño inclinado. */}
        {perspectiva ? <PanioEnPerspectiva n={n}>{mazoYTirada}</PanioEnPerspectiva> : mazoYTirada}

        {aviso && (
          <motion.div
            className="reyes-aviso"
            role="status"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
          >
            <b>{reyes.reparte === yoNuevo ? 'Repartís vos' : `Reparte ${reparte}`}</b>
            {reyes.equipos && (
              <span>
                {/* Los apodos de la tirada: los mismos de la sala, aunque hayan cambiado de lugar. */}
                Juntos: {enLista(reyes.equipos.map((a) => reyes.apodos[a] ?? `Jugador ${a + 1}`))}
              </span>
            )}
          </motion.div>
        )}
      </main>

      <section className="mi-lugar">
        <div className="mi-info">
          <div className="asiento-avatar">
            <Avatar lugar={yo} tam="chico" />
          </div>
          <div className="mi-quien">
            <span className="mi-nombre">{yo.apodo}</span>
          </div>
        </div>
        {/* El lugar de la mano y de la botonera, vacíos: así el paño no salta cuando arranca la mano. */}
        <div className="mi-mano-zona">
          <div className="mi-mano mano-ojeable mano-abanico" />
        </div>
        <div className="mi-lugar-pie" />
      </section>
    </div>
  )
}
