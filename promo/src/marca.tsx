import type { CSSProperties, ReactNode } from 'react'
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import { loadFont as cargarAlfa } from '@remotion/google-fonts/AlfaSlabOne'
import { loadFont as cargarNunito } from '@remotion/google-fonts/Nunito'

/** Los colores y las letras de la app (apps/web/src/estilos.css) y el logo de public/icono.svg. */
export const COLOR = {
  panoClaro: '#2a8048',
  pano: '#1f6b3a',
  panoOscuro: '#154d29',
  madera: '#6b4226',
  maderaClara: '#8a5a36',
  dorso: '#8b1e1e',
  dorsoDetalle: '#d9b36c',
  papel: '#fbf6ea',
  tinta: '#1d1a16',
  acento: '#f2c14e',
  oro: '#b8860b',
}

export const LETRA_TITULO = cargarAlfa().fontFamily
export const LETRA_TEXTO = cargarNunito('normal', { weights: ['700', '800', '900'] }).fontFamily

/** El paño de la mesa, con una viñeta de madera en los bordes. */
export function Pano({ children, oscuro = 0 }: { children?: ReactNode; oscuro?: number }) {
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(ellipse 85% 60% at 50% 42%, ${COLOR.panoClaro}, ${COLOR.pano} 55%, ${COLOR.panoOscuro} 100%)`,
      }}
    >
      <AbsoluteFill style={{ boxShadow: `inset 0 0 220px 40px rgb(30 15 5 / 0.55)` }} />
      {oscuro > 0 && <AbsoluteFill style={{ background: `rgb(0 0 0 / ${oscuro})` }} />}
      {children}
    </AbsoluteFill>
  )
}

/** Los 24 rayos del sol del logo (los mismos de public/icono.svg), centrados en (0, 0). */
const RAYOS =
  'M61.8,-5.4L205.0,0.0L61.8,5.4ZM61.1,10.8L144.9,38.8L58.3,21.2ZM56.2,26.2L177.5,102.5L50.8,35.6ZM47.5,39.9L106.1,106.1L39.9,47.5ZM35.6,50.8L102.5,177.5L26.2,56.2ZM21.2,58.3L38.8,144.9L10.8,61.1ZM5.4,61.8L0.0,205.0L-5.4,61.8ZM-10.8,61.1L-38.8,144.9L-21.2,58.3ZM-26.2,56.2L-102.5,177.5L-35.6,50.8ZM-39.9,47.5L-106.1,106.1L-47.5,39.9ZM-50.8,35.6L-177.5,102.5L-56.2,26.2ZM-58.3,21.2L-144.9,38.8L-61.1,10.8ZM-61.8,5.4L-205.0,0.0L-61.8,-5.4ZM-61.1,-10.8L-144.9,-38.8L-58.3,-21.2ZM-56.2,-26.2L-177.5,-102.5L-50.8,-35.6ZM-47.5,-39.9L-106.1,-106.1L-39.9,-47.5ZM-35.6,-50.8L-102.5,-177.5L-26.2,-56.2ZM-21.2,-58.3L-38.8,-144.9L-10.8,-61.1ZM-5.4,-61.8L-0.0,-205.0L5.4,-61.8ZM10.8,-61.1L38.8,-144.9L21.2,-58.3ZM26.2,-56.2L102.5,-177.5L35.6,-50.8ZM39.9,-47.5L106.1,-106.1L47.5,-39.9ZM50.8,-35.6L177.5,-102.5L56.2,-26.2ZM58.3,-21.2L144.9,-38.8L61.1,-10.8Z'

/** Degradés compartidos: van una sola vez por SVG que los use. */
function Degrades() {
  return (
    <defs>
      <radialGradient id="degrade-sol" cx="50%" cy="50%" r="50%">
        <stop offset="0" stopColor="#fff3c4" />
        <stop offset="0.35" stopColor="#f2c14e" />
        <stop offset="1" stopColor="#d4902a" />
      </radialGradient>
      <linearGradient id="degrade-moneda" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffd86b" />
        <stop offset="0.55" stopColor="#e0a82e" />
        <stop offset="1" stopColor="#b47d14" />
      </linearGradient>
      <filter id="sombra-carta" x="-25%" y="-25%" width="150%" height="150%">
        <feDropShadow dx="0" dy="8" stdDeviation="9" floodColor="#000" floodOpacity="0.45" />
      </filter>
    </defs>
  )
}

export function Sol({ giro = 0, escala = 1 }: { giro?: number; escala?: number }) {
  return (
    <g transform={`scale(${escala}) rotate(${giro})`}>
      <path d={RAYOS} fill="url(#degrade-sol)" />
      <circle r="66" fill="url(#degrade-sol)" stroke="#c9871f" strokeWidth="3" />
    </g>
  )
}

function Moneda({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(1.4)`}>
      <circle r="20" fill="url(#degrade-moneda)" stroke="#8a5f0a" strokeWidth="2.5" />
      <circle r="12.5" fill="none" stroke="#8a5f0a" strokeWidth="1.8" />
      <circle r="4" fill="#8a5f0a" />
    </g>
  )
}

const MONEDAS: Record<number, [number, number][]> = {
  2: [
    [100, 95],
    [100, 205],
  ],
  4: [
    [65, 95],
    [135, 95],
    [65, 205],
    [135, 205],
  ],
  5: [
    [65, 95],
    [135, 95],
    [100, 150],
    [65, 205],
    [135, 205],
  ],
}

/** Una pieza de oro (2, 4 o 5), en un lienzo de 200 × 300 como las cartas de la app. */
export function CartaOro({ numero }: { numero: 2 | 4 | 5 }) {
  return (
    <g>
      <rect x="1.5" y="1.5" width="197" height="297" rx="16" fill={COLOR.papel} stroke="#b9ab8c" strokeWidth="3" />
      <rect x="14" y="14" width="172" height="272" rx="2" fill="none" stroke={COLOR.oro} strokeWidth="3" />
      {MONEDAS[numero]!.map(([x, y], i) => (
        <Moneda key={i} x={x} y={y} />
      ))}
      <text x="31" y="52" fontFamily={LETRA_TITULO} fontSize="30" fill={COLOR.oro} textAnchor="middle">
        {numero}
      </text>
      <text x="169" y="274" fontFamily={LETRA_TITULO} fontSize="30" fill={COLOR.oro} textAnchor="middle" transform="rotate(180 169 263)">
        {numero}
      </text>
    </g>
  )
}

/**
 * El logo animado desde el cuadro `desde`: sale el sol, se abre el abanico (2, 4 y 5 de oro, como
 * en la mano) y cae la cinta con el nombre. `conCinta` en false deja solo el emblema.
 */
export function Logo({ desde = 0, style, conCinta = true, girar = true }: { desde?: number; style?: CSSProperties; conCinta?: boolean; girar?: boolean }) {
  const cuadro = useCurrentFrame() - desde
  const { fps } = useVideoConfig()
  const sol = spring({ frame: cuadro, fps, config: { damping: 12, stiffness: 120 } })
  const abre = (i: number) => spring({ frame: cuadro - 5 - i * 3, fps, config: { damping: 11, stiffness: 140 } })
  const cinta = spring({ frame: cuadro - 30, fps, config: { damping: 9, stiffness: 160, mass: 0.8 } })
  const sub = interpolate(cuadro, [44, 58], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const giro = girar ? cuadro * 0.35 : 0
  const cartas: { n: 2 | 4 | 5; ang: number; dx: number; dy: number }[] = [
    { n: 2, ang: -22, dx: -38, dy: 0 },
    { n: 4, ang: 0, dx: 0, dy: -5 },
    { n: 5, ang: 22, dx: 38, dy: 0 },
  ]
  return (
    <svg viewBox="0 0 600 460" style={{ overflow: 'visible', ...style }}>
      <Degrades />
      <g transform="translate(300 180)">
        <Sol giro={giro} escala={sol} />
      </g>
      <g transform="translate(300 318) scale(0.74)">
        {cartas.map((c, i) => {
          const p = abre(i)
          return (
            <g key={c.n} transform={`translate(${c.dx * p} ${c.dy}) rotate(${c.ang * p}) translate(-100 ${-290 + (1 - p) * 120})`} opacity={Math.min(1, p * 2)} filter="url(#sombra-carta)">
              <CartaOro numero={c.n} />
            </g>
          )
        })}
      </g>
      {conCinta && (
        <g transform={`translate(0 ${(1 - cinta) * -260})`} opacity={Math.min(1, cinta * 3)}>
          <path d="M112,334 H34 L58,371 L34,408 H112 Z" fill="#5e1212" stroke={COLOR.dorsoDetalle} strokeWidth="3" strokeLinejoin="round" />
          <path d="M488,334 H566 L542,371 L566,408 H488 Z" fill="#5e1212" stroke={COLOR.dorsoDetalle} strokeWidth="3" strokeLinejoin="round" />
          <path d="M92,394 L112,408 V394 Z M508,394 L488,408 V394 Z" fill="#3d0b0b" />
          <rect x="92" y="318" width="416" height="76" rx="6" fill={COLOR.dorso} stroke={COLOR.dorsoDetalle} strokeWidth="3" />
          <rect x="100" y="326" width="400" height="60" rx="3" fill="none" stroke={COLOR.dorsoDetalle} strokeWidth="1.5" opacity="0.6" />
          <text x="300" y="382" textAnchor="middle" fontFamily={LETRA_TITULO} fontSize="58" letterSpacing="6" fill="#3d0b0b">
            TRUCO
          </text>
          <text x="300" y="378" textAnchor="middle" fontFamily={LETRA_TITULO} fontSize="58" letterSpacing="6" fill={COLOR.papel}>
            TRUCO
          </text>
        </g>
      )}
      {conCinta && (
        <text
          x="300"
          y="446"
          textAnchor="middle"
          fontFamily={LETRA_TEXTO}
          fontWeight={900}
          fontSize="22"
          letterSpacing={4 + sub * 6}
          fill={COLOR.acento}
          opacity={sub}
        >
          URUGUAYO
        </text>
      )}
    </svg>
  )
}
