import { useState } from 'react'
import { fuerza, mismaCarta, nombreCarta, type Carta as TCarta } from '@truco/engine'
import { Carta } from '../componentes/Carta'
import { explicar, ganadora, manoParaOrdenar, muestraAlAzar, parParaComparar, type Azar } from './cartas'

/**
 * Los ejercicios del tutorial. Cada uno le pasa a Don Queiroz lo que tiene que decir (`alDecir`:
 * si estuvo bien, por qué no) y avisa al terminar con la cantidad de errores (`alListo`).
 */
interface Props {
  alDecir: (texto: string) => void
  alListo: (errores: number) => void
  azar?: Azar
}

/** Una carta que se toca, con su nombre para los lectores de pantalla. */
function CartaTocable({ carta, estado, alTocar, deshabilitada }: { carta: TCarta; estado?: 'bien' | 'mal' | 'gana'; alTocar: () => void; deshabilitada?: boolean }) {
  return (
    <button
      type="button"
      className={`tutorial-carta${estado ? ` ${estado}` : ''}`}
      aria-label={`El ${nombreCarta(carta)}`}
      aria-pressed={estado === 'bien' ? true : undefined}
      disabled={deshabilitada}
      onClick={alTocar}
    >
      <Carta carta={carta} tam="grande" />
    </button>
  )
}

/** La muestra, al costado, como en la mesa. */
export function Muestra({ carta }: { carta: TCarta }) {
  return (
    <div className="tutorial-muestra" aria-label={`Muestra: ${nombreCarta(carta)}`}>
      <small aria-hidden="true">Muestra</small>
      <Carta carta={carta} tam="mesa" />
    </div>
  )
}

/** Tocar todas las cartas que cumplen algo; tocar una que no, es un error (y Don Queiroz dice por qué). */
export function Buscar({
  cartas,
  muestra,
  es,
  porQueNo,
  alDecir,
  alListo,
}: Props & { cartas: TCarta[]; muestra?: TCarta; es: (c: TCarta) => boolean; porQueNo: (c: TCarta) => string }) {
  const [tocadas, setTocadas] = useState<TCarta[]>([])
  const [mal, setMal] = useState<TCarta | null>(null)
  const [errores, setErrores] = useState(0)
  const faltan = cartas.filter((c) => es(c) && !tocadas.some((t) => mismaCarta(t, c))).length
  const tocar = (c: TCarta) => {
    if (tocadas.some((t) => mismaCarta(t, c))) return
    if (!es(c)) {
      setErrores((e) => e + 1)
      setMal(c)
      alDecir(porQueNo(c))
      return
    }
    setMal(null)
    setTocadas((t) => [...t, c])
    if (faltan === 1) {
      alDecir('¡Las encontraste todas! Muy bien.')
      alListo(errores)
    } else alDecir(`¡Esa! Te ${faltan - 1 === 1 ? 'falta una' : `faltan ${faltan - 1}`}.`)
  }
  return (
    <div className="tutorial-ejercicio">
      {muestra && <Muestra carta={muestra} />}
      <div className="tutorial-cartas">
        {cartas.map((c) => {
          const bien = tocadas.some((t) => mismaCarta(t, c))
          return (
            <CartaTocable
              key={`${c.numero}-${c.palo}`}
              carta={c}
              estado={bien ? 'bien' : mal && mismaCarta(mal, c) ? 'mal' : undefined}
              deshabilitada={faltan === 0}
              alTocar={() => tocar(c)}
            />
          )
        })}
      </div>
    </div>
  )
}

/** Una pregunta con opciones: con la equivocada se puede volver a probar. */
export function Pregunta({ opciones, correcta, bien, mal, alDecir, alListo }: Props & { opciones: string[]; correcta: number; bien: string; mal: string }) {
  const [descartadas, setDescartadas] = useState<number[]>([])
  const [listo, setListo] = useState(false)
  const elegir = (i: number) => {
    if (i === correcta) {
      setListo(true)
      alDecir(bien)
      alListo(descartadas.length)
    } else {
      setDescartadas((d) => [...d, i])
      alDecir(mal)
    }
  }
  return (
    <div className="tutorial-ejercicio tutorial-opciones">
      {opciones.map((o, i) => (
        <button
          key={o}
          type="button"
          className={`boton ${listo && i === correcta ? 'tutorial-opcion-bien' : 'boton-secundario'}`}
          disabled={listo || descartadas.includes(i)}
          onClick={() => elegir(i)}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

/** Rondas de "¿cuál gana?": se toca la más alta o "Son iguales". Después de cada una, la explicación. */
export function Comparar({ rondas, conMuestra, alDecir, alListo, azar = Math.random }: Props & { rondas: number; conMuestra: boolean }) {
  const nueva = () => {
    const muestra = conMuestra ? muestraAlAzar(azar) : null
    return { muestra, par: parParaComparar(azar, muestra) }
  }
  const [ronda, setRonda] = useState(0)
  const [{ muestra, par }, setJuego] = useState(nueva)
  const [respuesta, setRespuesta] = useState<'a' | 'b' | 'parda' | null>(null)
  const [errores, setErrores] = useState(0)
  const correcta = ganadora(par[0], par[1], muestra)
  const ultima = ronda === rondas - 1
  const responder = (r: 'a' | 'b' | 'parda') => {
    setRespuesta(r)
    const err = r === correcta ? errores : errores + 1
    setErrores(err)
    alDecir(`${r === correcta ? '¡Bien!' : 'No…'} ${explicar(par[0], par[1], muestra)}`)
    if (ultima) alListo(err)
  }
  const otra = () => {
    setRonda((r) => r + 1)
    setJuego(nueva())
    setRespuesta(null)
    alDecir('¿Y acá?')
  }
  const estado = (lado: 'a' | 'b') => (respuesta === null ? undefined : correcta === lado ? 'gana' : respuesta === lado ? 'mal' : undefined)
  return (
    <div className="tutorial-ejercicio">
      <p className="tutorial-ronda">
        {ronda + 1} de {rondas}
      </p>
      {muestra && <Muestra carta={muestra} />}
      <div className="tutorial-cartas tutorial-par" role="group" aria-label="¿Cuál gana?">
        <CartaTocable carta={par[0]} estado={estado('a')} deshabilitada={respuesta !== null} alTocar={() => responder('a')} />
        <span className="tutorial-contra" aria-hidden="true">
          vs
        </span>
        <CartaTocable carta={par[1]} estado={estado('b')} deshabilitada={respuesta !== null} alTocar={() => responder('b')} />
      </div>
      <button
        type="button"
        className={`boton ${respuesta !== null && correcta === 'parda' ? 'tutorial-opcion-bien' : 'boton-secundario'}`}
        disabled={respuesta !== null}
        onClick={() => responder('parda')}
      >
        Son iguales (parda)
      </button>
      {respuesta !== null && !ultima && (
        <button type="button" className="boton" onClick={otra}>
          Otra
        </button>
      )}
    </div>
  )
}

/** Rondas de ordenar tres cartas con muestra, tocándolas de la más alta a la más baja. */
export function Ordenar({ rondas, alDecir, alListo, azar = Math.random }: Props & { rondas: number }) {
  const nueva = () => {
    const muestra = muestraAlAzar(azar)
    return { muestra, mano: manoParaOrdenar(azar, muestra) }
  }
  const [ronda, setRonda] = useState(0)
  const [{ muestra, mano }, setJuego] = useState(nueva)
  const [elegidas, setElegidas] = useState<TCarta[]>([])
  const [mal, setMal] = useState<TCarta | null>(null)
  const [errores, setErrores] = useState(0)
  const quedan = mano.filter((c) => !elegidas.some((e) => mismaCarta(e, c)))
  const completa = quedan.length === 0
  const tocar = (c: TCarta) => {
    const mejor = quedan.reduce((m, x) => (fuerza(x, muestra) > fuerza(m, muestra) ? x : m))
    if (!mismaCarta(c, mejor)) {
      setErrores((e) => e + 1)
      setMal(c)
      alDecir(`Esa no todavía: ${explicar(mejor, c, muestra)}`)
      return
    }
    setMal(null)
    const ya = [...elegidas, c]
    setElegidas(ya)
    if (ya.length === mano.length) {
      alDecir('¡Bien ordenada! Así la tenés que ver en la mano.')
      if (ronda === rondas - 1) alListo(errores)
    } else alDecir(ya.length === 1 ? 'Esa es la más alta. ¿Y después?' : 'Bien. ¿Y la última?')
  }
  const otra = () => {
    setRonda((r) => r + 1)
    setJuego(nueva())
    setElegidas([])
    setMal(null)
    alDecir('Otra mano. De la más alta a la más baja.')
  }
  return (
    <div className="tutorial-ejercicio">
      <p className="tutorial-ronda">
        {ronda + 1} de {rondas}
      </p>
      <Muestra carta={muestra} />
      <div className="tutorial-cartas">
        {mano.map((c) => {
          const i = elegidas.findIndex((e) => mismaCarta(e, c))
          return (
            <div key={`${c.numero}-${c.palo}`} className="tutorial-orden">
              <CartaTocable
                carta={c}
                estado={i >= 0 ? 'bien' : mal && mismaCarta(mal, c) ? 'mal' : undefined}
                deshabilitada={i >= 0 || completa}
                alTocar={() => tocar(c)}
              />
              <span className="tutorial-orden-numero" aria-hidden="true">
                {i >= 0 ? i + 1 : ''}
              </span>
            </div>
          )
        })}
      </div>
      {completa && ronda < rondas - 1 && (
        <button type="button" className="boton" onClick={otra}>
          Otra
        </button>
      )}
    </div>
  )
}
