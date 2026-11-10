/**
 * Dibujo de la baraja española en SVG, hecho por código (figuras estilizadas).
 * Todo en un lienzo de 200 × 300. Cada palo se dibuja en una caja de 100 × 100
 * centrada en el origen, y se ubica con `translate` + `scale`.
 */
import type { Numero, Palo } from '@truco/engine'
import type { ReactNode } from 'react'
import { ZONA_DIBUJO_DESDE, ZONA_INDICE } from '../ojeo'

export const COLOR_PALO: Record<Palo, string> = {
  oro: '#b8860b',
  copa: '#a8232a',
  espada: '#1f4e8c',
  basto: '#2f6b2a',
}

const ORO = '#e0a82e'
const ORO_OSCURO = '#8a5f0a'
const PIEL = '#f1c9a5'

// ── Palos ──────────────────────────────────────────────────────────────

function Oro() {
  return (
    <g>
      <circle r="46" fill={ORO} stroke={ORO_OSCURO} strokeWidth="4" />
      <circle r="35" fill="none" stroke={ORO_OSCURO} strokeWidth="3" />
      <polygon
        points="0,-26 6,-9 24,-9 10,2 15,20 0,9 -15,20 -10,2 -24,-9 -6,-9"
        fill="#fff3c4"
        stroke={ORO_OSCURO}
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </g>
  )
}

function Copa() {
  return (
    <g stroke="#6b1016" strokeWidth="3" strokeLinejoin="round">
      <path d="M-36,-40 H36 C36,-2 18,14 0,16 C-18,14 -36,-2 -36,-40 Z" fill="#c0392b" />
      <rect x="-38" y="-46" width="76" height="9" rx="4" fill={ORO} stroke={ORO_OSCURO} />
      <path d="M-20,-24 H20" stroke="#f5c6c1" strokeWidth="3" fill="none" />
      <rect x="-6" y="15" width="12" height="20" fill={ORO} stroke={ORO_OSCURO} />
      <ellipse cy="24" rx="11" ry="5" fill={ORO} stroke={ORO_OSCURO} />
      <path d="M-28,47 Q0,30 28,47 Z" fill={ORO} stroke={ORO_OSCURO} />
    </g>
  )
}

function Espada() {
  return (
    <g strokeLinejoin="round">
      <path d="M0,-52 L8,-38 L8,16 L-8,16 L-8,-38 Z" fill="#dfe7f0" stroke="#3c4a5c" strokeWidth="3" />
      <path d="M0,-40 V12" stroke="#9fb0c4" strokeWidth="2.5" />
      <rect x="-26" y="15" width="52" height="9" rx="4" fill={ORO} stroke={ORO_OSCURO} strokeWidth="3" />
      <rect x="-6" y="24" width="12" height="17" fill="#1f4e8c" stroke="#10294a" strokeWidth="3" />
      <circle cy="46" r="7" fill={ORO} stroke={ORO_OSCURO} strokeWidth="3" />
    </g>
  )
}

function Basto() {
  return (
    <g strokeLinejoin="round">
      <path
        d="M-9,48 L-15,-26 Q-17,-48 0,-49 Q17,-48 15,-26 L9,48 Q0,53 -9,48 Z"
        fill="#9a6a3a"
        stroke="#4d3016"
        strokeWidth="3"
      />
      <path d="M-4,-40 Q-8,0 -3,40" stroke="#c49563" strokeWidth="3" fill="none" />
      <circle cx="8" cy="-20" r="4" fill="#4d3016" />
      <circle cx="-9" cy="4" r="4" fill="#4d3016" />
      <circle cx="6" cy="26" r="3.5" fill="#4d3016" />
      <path d="M14,-34 Q30,-44 32,-28 Q22,-26 14,-34 Z" fill="#3f8f35" stroke="#1f4d1a" strokeWidth="2" />
      <path d="M-14,-12 Q-32,-18 -30,-2 Q-20,-2 -14,-12 Z" fill="#3f8f35" stroke="#1f4d1a" strokeWidth="2" />
    </g>
  )
}

const SIMBOLO: Record<Palo, () => ReactNode> = { oro: Oro, copa: Copa, espada: Espada, basto: Basto }

export function Simbolo({ palo, x, y, tam, rot = 0 }: { palo: Palo; x: number; y: number; tam: number; rot?: number }) {
  const S = SIMBOLO[palo]
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${tam / 100})`}>
      <S />
    </g>
  )
}

// ── Distribución de los palos (1 al 7) ────────────────────────────────

/*
 * Arriba de todo van los cortes del marco (el palo), después una franja vacía y recién ahí el
 * número en las dos esquinas (ZONA_CORTES, ZONA_SEPARACION y ZONA_INDICE, en ojeo.ts): así al
 * ojear se puede asomar solo el palo, y después el número. El dibujo empieza por debajo
 * (ZONA_DIBUJO_DESDE) y termina antes del número de abajo.
 */
const LIENZO_ALTO = 300
/** Primera y última altura (del lienzo) que puede ocupar el dibujo. */
export const DIBUJO_DESDE = ZONA_DIBUJO_DESDE * LIENZO_ALTO
export const DIBUJO_HASTA = 258
/** Altura del medio del dibujo. */
const MEDIO = (DIBUJO_DESDE + DIBUJO_HASTA) / 2

/** Un palo en la carta: dónde va su centro, de qué tamaño y girado cuántos grados (0: punta o cabeza arriba). */
export interface PaloEnCarta {
  x: number
  y: number
  tam: number
  rot: number
}

const p = (x: number, y: number, tam: number, rot = 0): PaloEnCarta => ({ x, y, tam, rot })

/*
 * Como en las barajas de siempre (Fournier, El Cid, Grimaud), cada palo tiene su disposición:
 *
 * - Oros y copas: el 2 en columna; el 3 en diagonal (arriba a la izquierda, al medio a la
 *   derecha, abajo a la izquierda); el 4 en las esquinas; el 5, las esquinas y uno más grande al
 *   medio; el 6 en dos columnas de a tres; el 7, dos arriba, uno al medio un poco más arriba y dos
 *   filas de a dos.
 * - Espadas: largas y derechas. El 2 y el 3, verticales de punta a punta, una sí y una no al revés;
 *   el 4, en las esquinas apuntando al medio (una X abierta); el 5, cuatro en las esquinas y una
 *   acostada al medio; el 6, dos filas de a tres; el 7, el 6 con una acostada al medio. Fuera del
 *   2 y el 3, la empuñadura va hacia afuera y la punta hacia el medio.
 * - Bastos: el 2, dos parados; el 3, cruzados (uno parado y dos en diagonal, como una X con un palo
 *   al medio); el 4, en las esquinas, en diagonal; el 5, el 4 con uno acostado al medio; el 6 y el
 *   7, como las espadas. La cabeza (lo grueso) va hacia afuera.
 */
const ORO_O_COPA: Record<number, PaloEnCarta[]> = {
  2: [p(100, 136, 72), p(100, 218, 72)],
  3: [p(62, 130, 60), p(138, MEDIO, 60), p(62, 224, 60)],
  4: [p(58, 132, 58), p(142, 132, 58), p(58, 220, 58), p(142, 220, 58)],
  5: [p(54, 126, 48), p(146, 126, 48), p(100, MEDIO, 62), p(54, 222, 48), p(146, 222, 48)],
  6: [p(64, 124, 46), p(136, 124, 46), p(64, 174, 46), p(136, 174, 46), p(64, 224, 46), p(136, 224, 46)],
  7: [p(60, 117, 42), p(140, 117, 42), p(100, 147, 42), p(60, 182, 42), p(140, 182, 42), p(60, 224, 42), p(140, 224, 42)],
}

/**
 * Seis parados en dos filas de a tres, con lo ancho (la empuñadura o la cabeza del basto) hacia
 * afuera: el 6 y, con uno acostado al medio, el 7. `rot` es el giro de la fila de arriba (la de
 * abajo va al revés).
 */
const dosFilas = (tam: number, arriba: number, abajo: number, rot: number) => [
  p(52, arriba, tam, rot),
  p(100, arriba, tam, rot),
  p(148, arriba, tam, rot),
  p(52, abajo, tam, rot + 180),
  p(100, abajo, tam, rot + 180),
  p(148, abajo, tam, rot + 180),
]

const ESPADAS: Record<number, PaloEnCarta[]> = {
  2: [p(64, MEDIO, 136, 180), p(136, MEDIO, 136)],
  3: [p(46, MEDIO, 120), p(100, MEDIO, 120, 180), p(154, MEDIO, 120)],
  4: [p(64, 135, 88, 135), p(136, 135, 88, -135), p(64, 213, 88, 45), p(136, 213, 88, -45)],
  5: [p(56, 136, 70, 180), p(144, 136, 70, 180), p(100, MEDIO, 72, 90), p(56, 212, 70), p(144, 212, 70)],
  6: dosFilas(70, 134, 212, 180),
  7: [...dosFilas(56, 126, 218, 180), p(100, MEDIO, 72, 90)],
}

const BASTOS: Record<number, PaloEnCarta[]> = {
  2: [p(62, MEDIO, 140), p(138, MEDIO, 140)],
  // Cruzados: primero los dos en diagonal y arriba, el parado.
  3: [p(100, MEDIO, 150, -40), p(100, MEDIO, 150, 40), p(100, MEDIO, 146)],
  4: [p(66, 137, 82, -45), p(134, 137, 82, 45), p(66, 211, 82, -135), p(134, 211, 82, 135)],
  5: [p(60, 132, 70, -45), p(140, 132, 70, 45), p(100, MEDIO, 76, 90), p(60, 216, 70, -135), p(140, 216, 70, 135)],
  6: dosFilas(70, 134, 212, 0),
  7: [...dosFilas(56, 126, 218, 0), p(100, MEDIO, 72, 90)],
}

const DISPOSICIONES: Record<Palo, Record<number, PaloEnCarta[]>> = { oro: ORO_O_COPA, copa: ORO_O_COPA, espada: ESPADAS, basto: BASTOS }

/** Dónde va cada palo en las cartas del 2 al 7 (los ases son dibujos propios: ver `As`). */
export function disposicion(palo: Palo, numero: number): PaloEnCarta[] {
  return DISPOSICIONES[palo][numero] ?? []
}

/**
 * Lo que ocupa cada palo desde su centro, sin girar (a tamaño 100): medio ancho y medio alto. Las
 * espadas y los bastos son largos y finos.
 */
export const MEDIDA_PALO: Record<Palo, { ancho: number; alto: number }> = {
  oro: { ancho: 48, alto: 48 },
  copa: { ancho: 38, alto: 47 },
  espada: { ancho: 26, alto: 53 },
  basto: { ancho: 32, alto: 50 },
}

function Palos({ palo, numero }: { palo: Palo; numero: number }) {
  if (numero === 1) return <As palo={palo} />
  return (
    <>
      {disposicion(palo, numero).map(({ x, y, tam, rot }, i) => (
        <Simbolo key={i} palo={palo} x={x} y={y} tam={tam} rot={rot} />
      ))}
    </>
  )
}

// ── Los ases ──────────────────────────────────────────────────────────

/*
 * Como en las barajas de siempre, los cuatro ases son dibujos únicos y no el palo agrandado: la
 * espada y el basto (las dos cartas más altas del truco) con cintas y fuerza; el oro, una medalla
 * con el Sol de Mayo, laureles y cinta; la copa, una copa de lujo con tapa. Cada uno se dibuja
 * alrededor del origen, en una caja de 156 × 158, y se pone en el medio de la zona del dibujo.
 */
const CELESTE = '#4f9fd8'
const CELESTE_OSCURO = '#1f5f92'
const MADERA = '#9a6a3a'
const MADERA_OSCURA = '#4d3016'
const HOJA = '#3f8f35'
const HOJA_OSCURA = '#1f4d1a'

/** Una hoja (de laurel o de basto) que sale del punto (x, y) hacia arriba, girada `rot` grados. */
function Hoja({ x, y, rot, largo = 14 }: { x: number; y: number; rot: number; largo?: number }) {
  return (
    <path
      transform={`translate(${x} ${y}) rotate(${rot})`}
      d={`M0,0 Q${largo * 0.45},${-largo * 0.5} 0,${-largo} Q${-largo * 0.45},${-largo * 0.5} 0,0 Z`}
      fill={HOJA}
      stroke={HOJA_OSCURA}
      strokeWidth="1.5"
    />
  )
}

/** Las hojas de cada rama del laurel (x, y y giro), del lado izquierdo; el derecho es su espejo. */
const LAUREL: [number, number, number][] = [
  [-6, 64, -70],
  [-22, 60, -60],
  [-37, 51, -48],
  [-50, 38, -36],
  [-59, 22, -22],
  [-64, 5, -10],
]

/** Los rayos del Sol de Mayo: dieciséis, alternando largos y cortos. */
const RAYOS_SOL_DE_MAYO = Array.from({ length: 16 }, (_, i) => {
  const a = (i * Math.PI) / 8
  const largo = i % 2 === 0 ? 38 : 31
  const punto = (r: number, da: number) => `${(Math.cos(a + da) * r).toFixed(1)},${(Math.sin(a + da) * r).toFixed(1)}`
  return `M${punto(17, -0.17)} L${punto(largo, 0)} L${punto(17, 0.17)} Z`
}).join(' ')

function AsDeOros() {
  return (
    <g strokeLinejoin="round">
      {/* Las dos ramas de laurel, de abajo hacia los costados. */}
      {([1, -1] as const).map((lado) => (
        <g key={lado} transform={`scale(${lado} 1)`}>
          <path d="M8,66 Q-58,58 -66,-4" fill="none" stroke={HOJA_OSCURA} strokeWidth="3" />
          {LAUREL.map(([x, y, r]) => (
            <g key={y}>
              <Hoja x={x} y={y} rot={r} largo={16} />
              <Hoja x={x} y={y} rot={r + 75} largo={13} />
            </g>
          ))}
        </g>
      ))}
      {/* La medalla con el Sol de Mayo. */}
      <circle cy="-6" r="56" fill={ORO} stroke={ORO_OSCURO} strokeWidth="4" />
      <circle cy="-6" r="48" fill="none" stroke={ORO_OSCURO} strokeWidth="2" strokeDasharray="3 4" />
      <g transform="translate(0 -6)">
        <path d={RAYOS_SOL_DE_MAYO} fill="#fff3c4" stroke={ORO_OSCURO} strokeWidth="1.5" />
        <circle r="17" fill="#fff3c4" stroke={ORO_OSCURO} strokeWidth="2" />
        <circle cx="-6" cy="-3" r="2" fill={ORO_OSCURO} />
        <circle cx="6" cy="-3" r="2" fill={ORO_OSCURO} />
        <path d="M-6,6 Q0,11 6,6" fill="none" stroke={ORO_OSCURO} strokeWidth="2" strokeLinecap="round" />
        <path d="M0,-1 L-1.5,3 H1.5" fill="none" stroke={ORO_OSCURO} strokeWidth="1.5" />
      </g>
      {/* La cinta de abajo, con sus puntas. */}
      <path d="M-62,58 L-48,52 L-48,74 L-62,80 L-56,69 Z" fill={COLOR_PALO.oro} stroke={ORO_OSCURO} strokeWidth="2" />
      <path d="M62,58 L48,52 L48,74 L62,80 L56,69 Z" fill={COLOR_PALO.oro} stroke={ORO_OSCURO} strokeWidth="2" />
      <path d="M-50,50 Q0,62 50,50 L50,72 Q0,84 -50,72 Z" fill="#fff3c4" stroke={ORO_OSCURO} strokeWidth="2.5" />
      <path d="M-34,63 Q0,72 34,63" fill="none" stroke={ORO_OSCURO} strokeWidth="1.5" strokeDasharray="4 3" />
    </g>
  )
}

function AsDeCopas() {
  return (
    <g strokeLinejoin="round">
      {/* El pie y el tallo, con su nudo. */}
      <path d="M-46,74 Q0,56 46,74 Q46,80 0,80 Q-46,80 -46,74 Z" fill={ORO} stroke={ORO_OSCURO} strokeWidth="3" />
      <path d="M-30,64 Q0,52 30,64 L18,58 Q0,50 -18,58 Z" fill={ORO} stroke={ORO_OSCURO} strokeWidth="2.5" />
      <rect x="-8" y="16" width="16" height="40" fill={ORO} stroke={ORO_OSCURO} strokeWidth="3" />
      <ellipse cy="36" rx="16" ry="9" fill={ORO} stroke={ORO_OSCURO} strokeWidth="3" />
      <circle cy="36" r="4" fill={COLOR_PALO.copa} stroke="#6b1016" strokeWidth="1.5" />
      {/* El cáliz, con una guarda y piedras. */}
      <path d="M-54,-34 H54 C54,4 28,22 0,24 C-28,22 -54,4 -54,-34 Z" fill="#c0392b" stroke="#6b1016" strokeWidth="3.5" />
      <path d="M-46,-18 Q0,-6 46,-18" fill="none" stroke={ORO} strokeWidth="4" />
      {[-30, -10, 10, 30].map((x) => (
        <circle key={x} cx={x} cy={-11 + Math.abs(x) * 0.12} r="4.5" fill={ORO} stroke={ORO_OSCURO} strokeWidth="1.5" />
      ))}
      <path d="M-26,2 Q0,18 26,2" fill="none" stroke="#f5c6c1" strokeWidth="3" strokeLinecap="round" />
      {/* El borde y la tapa con su remate. */}
      <rect x="-58" y="-42" width="116" height="10" rx="5" fill={ORO} stroke={ORO_OSCURO} strokeWidth="3" />
      <path d="M-44,-42 Q-40,-66 0,-68 Q40,-66 44,-42 Z" fill="#c0392b" stroke="#6b1016" strokeWidth="3" />
      <path d="M-30,-48 Q0,-58 30,-48" fill="none" stroke={ORO} strokeWidth="3" />
      <rect x="-5" y="-76" width="10" height="9" fill={ORO} stroke={ORO_OSCURO} strokeWidth="2" />
      <circle cy="-80" r="6" fill={ORO} stroke={ORO_OSCURO} strokeWidth="2.5" />
    </g>
  )
}

/** La cinta del as de espadas: sale de la cruz y se enrosca dos veces en la hoja. */
const CINTA_ESPADA = 'M-34,30 Q-44,14 -12,6 Q34,-6 22,-28 Q10,-48 -24,-52'

function AsDeEspadas() {
  return (
    <g strokeLinejoin="round" strokeLinecap="round" transform="rotate(12)">
      {/* La hoja, larga y ancha en la base, con su canal. */}
      <path d="M0,-84 L12,-66 L10,30 L-10,30 L-12,-66 Z" fill="#dfe7f0" stroke="#3c4a5c" strokeWidth="3" />
      <path d="M0,-70 V26" stroke="#9fb0c4" strokeWidth="3.5" />
      {/* La cinta celeste y blanca, por detrás de la cruz, con sus dos puntas. */}
      <path d="M-24,-52 Q-44,-56 -56,-44 L-46,-44 L-52,-32 Q-40,-44 -24,-46 Z" fill={CELESTE} stroke={CELESTE_OSCURO} strokeWidth="2" />
      <path d="M-34,30 Q-52,40 -56,58 L-48,50 L-42,62 Q-44,44 -30,36 Z" fill={CELESTE} stroke={CELESTE_OSCURO} strokeWidth="2" />
      <path d={CINTA_ESPADA} fill="none" stroke={CELESTE_OSCURO} strokeWidth="10" />
      <path d={CINTA_ESPADA} fill="none" stroke={CELESTE} strokeWidth="7" />
      <path d={CINTA_ESPADA} fill="none" stroke="#ffffff" strokeWidth="2" />
      {/* La cruz, derecha, con las puntas enruladas y una piedra al medio. */}
      <rect x="-46" y="30" width="92" height="11" rx="5" fill={ORO} stroke={ORO_OSCURO} strokeWidth="3" />
      <circle cx="-48" cy="35.5" r="8" fill={ORO} stroke={ORO_OSCURO} strokeWidth="3" />
      <circle cx="48" cy="35.5" r="8" fill={ORO} stroke={ORO_OSCURO} strokeWidth="3" />
      <circle cx="-48" cy="35.5" r="3" fill={ORO_OSCURO} />
      <circle cx="48" cy="35.5" r="3" fill={ORO_OSCURO} />
      <circle cy="35.5" r="5" fill={COLOR_PALO.espada} stroke="#10294a" strokeWidth="1.5" />
      {/* El puño, forrado, y el pomo. */}
      <rect x="-8" y="41" width="16" height="26" rx="3" fill={COLOR_PALO.espada} stroke="#10294a" strokeWidth="3" />
      <path d="M-8,48 L8,52 M-8,55 L8,59 M-8,62 L8,66" stroke={ORO} strokeWidth="2" />
      <circle cy="75" r="10" fill={ORO} stroke={ORO_OSCURO} strokeWidth="3" />
      <circle cy="75" r="4" fill={COLOR_PALO.espada} />
    </g>
  )
}

/** La cinta del as de bastos: una vuelta alrededor del garrote, de frente. */
const CINTA_BASTO = 'M-26,-2 Q0,10 26,-12'

function AsDeBastos() {
  return (
    <g strokeLinejoin="round" strokeLinecap="round" transform="rotate(-14) scale(1.08)">
      {/* El garrote: cabeza gruesa arriba, nudoso, y la punta fina abajo. */}
      <path
        d="M-11,72 Q-14,40 -18,8 Q-26,-12 -22,-30 Q-30,-46 -24,-60 Q-14,-76 4,-76 Q24,-74 26,-58 Q32,-44 24,-28 Q28,-8 18,10 Q14,42 9,72 Q0,78 -11,72 Z"
        fill={MADERA}
        stroke={MADERA_OSCURA}
        strokeWidth="3.5"
      />
      <path d="M-4,-62 Q-12,-20 -4,30 Q-2,52 -3,66" fill="none" stroke="#c49563" strokeWidth="4" />
      <path d="M10,-54 Q14,-30 8,-6" fill="none" stroke="#c49563" strokeWidth="2.5" />
      {/* Los nudos. */}
      <ellipse cx="12" cy="-40" rx="5" ry="6" fill={MADERA_OSCURA} />
      <ellipse cx="-12" cy="-18" rx="4.5" ry="5.5" fill={MADERA_OSCURA} />
      <ellipse cx="8" cy="26" rx="4" ry="5" fill={MADERA_OSCURA} />
      <ellipse cx="-7" cy="50" rx="3" ry="4" fill={MADERA_OSCURA} />
      {/* Ramas cortadas, con sus hojas. */}
      <path d="M22,-26 L38,-36 L40,-30 L24,-20 Z" fill={MADERA} stroke={MADERA_OSCURA} strokeWidth="2.5" />
      <Hoja x={38} y={-34} rot={40} largo={20} />
      <Hoja x={36} y={-32} rot={95} largo={16} />
      <path d="M-18,22 L-34,14 L-36,20 L-20,28 Z" fill={MADERA} stroke={MADERA_OSCURA} strokeWidth="2.5" />
      <Hoja x={-34} y={16} rot={-50} largo={20} />
      <Hoja x={-32} y={18} rot={-110} largo={15} />
      <Hoja x={-12} y={-74} rot={-20} largo={18} />
      <Hoja x={-10} y={-72} rot={-70} largo={14} />
      {/* La cinta roja: la vuelta de frente y las dos puntas colgando. */}
      <path d="M-26,-2 Q-40,14 -42,36 L-34,28 L-28,40 Q-30,18 -20,6 Z" fill="#c0392b" stroke="#6b1016" strokeWidth="2" />
      <path d="M26,-12 Q42,-2 46,18 L38,12 L34,24 Q34,6 22,-4 Z" fill="#c0392b" stroke="#6b1016" strokeWidth="2" />
      <path d={CINTA_BASTO} fill="none" stroke="#6b1016" strokeWidth="11" />
      <path d={CINTA_BASTO} fill="none" stroke="#c0392b" strokeWidth="7" />
      <path d={CINTA_BASTO} fill="none" stroke="#f0a59d" strokeWidth="1.5" />
    </g>
  )
}

const ASES: Record<Palo, () => ReactNode> = { oro: AsDeOros, copa: AsDeCopas, espada: AsDeEspadas, basto: AsDeBastos }

/** El as, en el medio de la zona del dibujo. */
function As({ palo }: { palo: Palo }) {
  const A = ASES[palo]
  return (
    <g transform={`translate(100 ${MEDIO})`}>
      <A />
    </g>
  )
}

// ── Figuras (10 sota, 11 caballo, 12 rey), estilizadas ────────────────

/**
 * Las figuras se dibujaron en un recuadro de y=60 a 244: se achican para que entren en la zona
 * del dibujo (abajo pueden bajar un poco más: el número de abajo queda a un costado).
 */
const FIGURA_ARRIBA = DIBUJO_DESDE + 2
const FIGURA_ESCALA = (DIBUJO_HASTA - FIGURA_ARRIBA) / 184

function Figura({ palo, numero }: { palo: Palo; numero: 10 | 11 | 12 }) {
  const c = COLOR_PALO[palo]
  return (
    <g transform={`translate(100 ${FIGURA_ARRIBA}) scale(${FIGURA_ESCALA}) translate(-100 -60)`}>
      <rect x="48" y="60" width="104" height="184" rx="10" fill="#fff8e6" stroke={c} strokeWidth="2" />
      {numero === 12 && (
        // Rey: corona, barba y manto.
        <g>
          <path d="M60,238 L72,142 Q100,128 128,142 L140,238 Z" fill={c} stroke="#2b2118" strokeWidth="2.5" />
          <path d="M72,142 Q100,168 128,142" fill="none" stroke={ORO} strokeWidth="5" />
          <circle cx="100" cy="112" r="22" fill={PIEL} stroke="#2b2118" strokeWidth="2.5" />
          <path d="M80,118 Q100,150 120,118 Q110,132 100,132 Q90,132 80,118 Z" fill="#8d5a3a" stroke="#2b2118" strokeWidth="2" />
          <path d="M78,94 L82,70 L92,84 L100,64 L108,84 L118,70 L122,94 Z" fill={ORO} stroke={ORO_OSCURO} strokeWidth="2.5" />
          <circle cx="92" cy="108" r="2.2" fill="#2b2118" />
          <circle cx="108" cy="108" r="2.2" fill="#2b2118" />
        </g>
      )}
      {numero === 11 && (
        // Caballo: cabeza de caballo con crin y montura.
        <g>
          <path
            d="M70,236 L78,160 Q70,120 96,96 Q112,82 132,92 L146,118 Q140,126 130,122 L120,116 Q118,150 128,236 Z"
            fill="#9a6a3a"
            stroke="#2b2118"
            strokeWidth="2.5"
          />
          <path d="M96,96 Q84,118 80,160 Q74,140 82,112 Q88,98 96,96 Z" fill="#3b2614" />
          <circle cx="122" cy="104" r="3" fill="#2b2118" />
          <path d="M84,176 H124 V196 H84 Z" fill={c} stroke="#2b2118" strokeWidth="2.5" />
          <path d="M84,186 H124" stroke={ORO} strokeWidth="3" />
        </g>
      )}
      {numero === 10 && (
        // Sota: paje con boina y túnica.
        <g>
          <path d="M66,238 L78,150 Q100,140 122,150 L134,238 Z" fill={c} stroke="#2b2118" strokeWidth="2.5" />
          <path d="M100,150 V238" stroke={ORO} strokeWidth="3" />
          <circle cx="100" cy="120" r="21" fill={PIEL} stroke="#2b2118" strokeWidth="2.5" />
          <path d="M76,108 Q100,82 126,104 L124,112 Q100,100 78,114 Z" fill={c} stroke="#2b2118" strokeWidth="2.5" />
          <circle cx="126" cy="104" r="5" fill={ORO} stroke={ORO_OSCURO} strokeWidth="2" />
          <circle cx="92" cy="122" r="2.2" fill="#2b2118" />
          <circle cx="108" cy="122" r="2.2" fill="#2b2118" />
        </g>
      )}
      {/* El palo que sostiene la figura. */}
      <Simbolo palo={palo} x={numero === 11 ? 64 : 138} y={numero === 11 ? 214 : 200} tam={46} />
    </g>
  )
}

// ── Marco con la "pinta" ──────────────────────────────────────────────

/** Cortes del marco arriba y abajo: oros ninguno, copas uno, espadas dos, bastos tres. */
const CORTES: Record<Palo, number> = { oro: 0, copa: 1, espada: 2, basto: 3 }

function Marco({ palo }: { palo: Palo }) {
  const c = COLOR_PALO[palo]
  const cortes = CORTES[palo]
  const [x0, x1, y0, y1] = [14, 186, 14, 286]
  // Como en las barajas antiguas: el hueco es cerca del 15 % del largo de la línea.
  const hueco = 25
  const tramos: [number, number][] = []
  let desde = x0
  for (let i = 1; i <= cortes; i++) {
    const centro = x0 + ((x1 - x0) * i) / (cortes + 1)
    tramos.push([desde, centro - hueco / 2])
    desde = centro + hueco / 2
  }
  tramos.push([desde, x1])
  return (
    <g stroke={c} strokeWidth="3" strokeLinecap="round">
      <line x1={x0} y1={y0} x2={x0} y2={y1} />
      <line x1={x1} y1={y0} x2={x1} y2={y1} />
      {tramos.map(([a, b], i) => (
        <g key={i}>
          <line x1={a} y1={y0} x2={b} y2={y0} />
          <line x1={a} y1={y1} x2={b} y2={y1} />
        </g>
      ))}
    </g>
  )
}

// ── Carta completa y dorso ────────────────────────────────────────────

/** Recuadro del número de arriba: ocupa la ZONA_INDICE, con un margen de 1 para cada lado. */
const NUMERO_Y = ZONA_INDICE.desde * LIENZO_ALTO + 1
const NUMERO_ALTO = (ZONA_INDICE.hasta - ZONA_INDICE.desde) * LIENZO_ALTO - 2
/** Columnas de los números de arriba: hacia adentro para que los de dos cifras no pisen el marco. */
const NUMERO_X = [40, 160]

export function Frente({ palo, numero }: { palo: Palo; numero: Numero }) {
  const c = COLOR_PALO[palo]
  const esFigura = numero >= 10
  return (
    <svg viewBox="0 0 200 300" className="carta-svg" aria-hidden="true">
      <rect x="1.5" y="1.5" width="197" height="297" rx="16" fill="#fbf6ea" stroke="#b9ab8c" strokeWidth="3" />
      <Marco palo={palo} />
      {esFigura ? <Figura palo={palo} numero={numero as 10 | 11 | 12} /> : <Palos palo={palo} numero={numero} />}
      <g fill={c} fontFamily="Georgia, 'Times New Roman', serif" fontWeight="700" textAnchor="middle">
        {/* El número en las dos esquinas de arriba, separado de los cortes (ZONA_INDICE). */}
        {NUMERO_X.map((x) => (
          <g key={x}>
            <rect x={x - 22} y={NUMERO_Y} width="44" height={NUMERO_ALTO} rx="6" fill="#fbf6ea" />
            <text x={x} y={NUMERO_Y + 34} fontSize="44" letterSpacing={numero >= 10 ? -3 : 0}>
              {numero}
            </text>
          </g>
        ))}
        <g transform="rotate(180 164 266)">
          <rect x="146" y="250" width="36" height="34" rx="6" fill="#fbf6ea" />
          <text x="164" y="278" fontSize="34" letterSpacing={numero >= 10 ? -2 : 0}>
            {numero}
          </text>
        </g>
      </g>
    </svg>
  )
}

export function Dorso() {
  return (
    <svg viewBox="0 0 200 300" className="carta-svg" aria-hidden="true">
      <defs>
        <pattern id="trama-dorso" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="16" height="16" className="dorso-fondo" />
          <path d="M0,8 H16 M8,0 V16" className="dorso-linea" strokeWidth="2" />
        </pattern>
      </defs>
      <rect x="1.5" y="1.5" width="197" height="297" rx="16" className="dorso-fondo dorso-borde" strokeWidth="3" />
      <rect x="16" y="16" width="168" height="268" rx="10" fill="url(#trama-dorso)" className="dorso-borde" strokeWidth="3" />
      <circle cx="100" cy="150" r="34" className="dorso-fondo dorso-borde" strokeWidth="4" />
      <path d="M100,124 L108,144 L128,150 L108,156 L100,176 L92,156 L72,150 L92,144 Z" className="dorso-detalle" />
    </svg>
  )
}
