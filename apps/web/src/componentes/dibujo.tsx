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
/** Altura del medio del dibujo: de ahí para abajo espadas y bastos van invertidos. */
const MEDIO = (DIBUJO_DESDE + DIBUJO_HASTA) / 2
const COLS = [66, 134]
export const DISPOSICION: Record<number, [number, number][]> = {
  1: [[100, MEDIO]],
  2: [
    [100, 136],
    [100, 218],
  ],
  3: [
    [100, 124],
    [100, MEDIO],
    [100, 230],
  ],
  4: [
    [COLS[0]!, 128],
    [COLS[1]!, 128],
    [COLS[0]!, 226],
    [COLS[1]!, 226],
  ],
  5: [
    [COLS[0]!, 124],
    [COLS[1]!, 124],
    [100, MEDIO],
    [COLS[0]!, 230],
    [COLS[1]!, 230],
  ],
  6: [
    [COLS[0]!, 122],
    [COLS[1]!, 122],
    [COLS[0]!, MEDIO],
    [COLS[1]!, MEDIO],
    [COLS[0]!, 232],
    [COLS[1]!, 232],
  ],
  7: [
    [COLS[0]!, 119],
    [COLS[1]!, 119],
    [100, 152],
    [COLS[0]!, 185],
    [COLS[1]!, 185],
    [COLS[0]!, 235],
    [COLS[1]!, 235],
  ],
}
const TAM_SIMBOLO: Record<number, number> = { 1: 118, 2: 74, 3: 52, 4: 56, 5: 50, 6: 46, 7: 42 }

/** Tamaño de cada palo según la carta. Los anchos (1 de espadas y de bastos) son finos: van más grandes. */
export function tamSimbolo(palo: Palo, numero: number): number {
  return numero === 1 && (palo === 'espada' || palo === 'basto') ? 150 : (TAM_SIMBOLO[numero] ?? 42)
}

function Palos({ palo, numero }: { palo: Palo; numero: number }) {
  const puntos = DISPOSICION[numero] ?? []
  const tam = tamSimbolo(palo, numero)
  // En la mitad de abajo, espadas y bastos van invertidos, como en la baraja.
  const invertir = palo === 'espada' || palo === 'basto'
  return (
    <>
      {puntos.map(([x, y], i) => (
        <Simbolo key={i} palo={palo} x={x} y={y} tam={tam} rot={invertir && numero > 1 && y > MEDIO ? 180 : 0} />
      ))}
    </>
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
  const hueco = 14
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
