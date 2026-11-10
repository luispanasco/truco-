import { Cuadrado, cuadradosPorMitad, enCuadrados, mitades } from './Fosforos'
import { Hoja } from './Hoja'

/** Cómo se dice el tanteador: "12 malas", "3 buenas" (pasada la mitad se cuenta de nuevo). */
export function tramoDe(puntos: number, malas: number): string {
  if (puntos <= 0) return 'sin puntos'
  if (puntos <= malas) return `${puntos} ${puntos === 1 ? 'mala' : 'malas'}`
  const b = Math.min(puntos, 2 * malas) - malas
  return `${b} ${b === 1 ? 'buena' : 'buenas'}`
}

/** Nombres largos (un apodo en 1 contra 1) se cortan para que entren en la columna. */
const corto = (s: string) => (s.length > 11 ? `${s.slice(0, 10)}…` : s)

interface Equipo {
  nombre: string
  puntos: number
}

/**
 * El anotador grande, como en la mesa: una columna de fósforos por equipo, de a 5 en cuadraditos,
 * con la raya de la mitad que separa las malas de las buenas.
 */
export function DibujoAnotador({ nosotros, ellos, malas }: { nosotros: Equipo; ellos: Equipo; malas: number }) {
  const k = cuadradosPorMitad(malas)
  const arriba = 30
  const linea = arriba + k * 23 + 2
  const alto = linea + 5 + k * 23 + 2
  const columna = (eq: Equipo, x: number, clase: string) => {
    const { enMalas, enBuenas } = mitades(eq.puntos, malas)
    return (
      <g className={`anotador-columna ${clase}`}>
        <text className="anotador-nombre" x={x + 10} y="9" textAnchor="middle">
          {corto(eq.nombre)}
        </text>
        <text className="anotador-puntos" x={x + 10} y="23" textAnchor="middle">
          {eq.puntos}
        </text>
        {enCuadrados(enMalas, malas).map((c, i) => (
          <Cuadrado key={`m${i}`} cantidad={c} x={x} y={arriba + i * 23} />
        ))}
        {enCuadrados(enBuenas, malas).map((c, i) => (
          <Cuadrado key={`b${i}`} cantidad={c} x={x} y={linea + 5 + i * 23} />
        ))}
      </g>
    )
  }
  return (
    <svg
      viewBox={`0 0 120 ${alto}`}
      className="anotador-dibujo"
      role="img"
      aria-label={`${nosotros.nombre}: ${tramoDe(nosotros.puntos, malas)}. ${ellos.nombre}: ${tramoDe(ellos.puntos, malas)}.`}
    >
      {columna(nosotros, 20, 'nosotros')}
      {columna(ellos, 80, 'ellos')}
      <line className="anotador-mitad" x1="4" y1={linea} x2="116" y2={linea} />
      <text className="anotador-tramo" x="60" y={linea - 4} textAnchor="middle">
        MALAS
      </text>
      <text className="anotador-tramo" x="60" y={linea + 9} textAnchor="middle">
        BUENAS
      </text>
    </svg>
  )
}

/** Al tocar el marcador de la mesa: el anotador con fósforos, a cuánto se juega y cómo va cada uno. */
export function Anotador({
  nosotros,
  ellos,
  malas,
  partida,
  alCerrar,
}: {
  nosotros: Equipo
  ellos: Equipo
  malas: number
  /** A cuánto se juega (30 o 40). */
  partida: number
  alCerrar: () => void
}) {
  return (
    <Hoja titulo="Anotador" alCerrar={alCerrar} clase="hoja-anotador">
      <DibujoAnotador nosotros={nosotros} ellos={ellos} malas={malas} />
      <p className="anotador-pie">
        A {partida}: los primeros {malas} son las malas y los otros {partida - malas}, las buenas.
      </p>
      <button type="button" className="boton boton-grande" onClick={alCerrar}>
        Volver a la mesa
      </button>
    </Hoja>
  )
}
