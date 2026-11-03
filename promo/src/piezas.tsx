import type { CSSProperties, ReactNode } from 'react'
import { AbsoluteFill, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { COLOR, LETRA_TEXTO, LETRA_TITULO } from './marca'

/** Cuánto entró un elemento que aparece en el cuadro `desde`, con un rebote (0 → 1, se pasa un poco). */
export function useEntrada(desde: number, config: { damping?: number; stiffness?: number; mass?: number } = {}) {
  const cuadro = useCurrentFrame()
  const { fps } = useVideoConfig()
  return spring({ frame: cuadro - desde, fps, config: { damping: 10, stiffness: 170, mass: 0.7, ...config } })
}

/**
 * Un celular con un clip de la app adentro (grabado a 390 × 844, así que la pantalla tiene esa
 * proporción). `recorte` es el segundo del clip donde empieza; `velocidad`, para apurar lo lento.
 */
export function Celular({
  clip,
  recorte = 0,
  velocidad = 1,
  alto = 1080,
  desde = 0,
  inclinacion = 0,
  zoom,
  style,
}: {
  clip: string
  recorte?: number
  velocidad?: number
  alto?: number
  desde?: number
  inclinacion?: number
  /** Acercarse a una parte de la pantalla (`origen` en %, como transform-origin) entre dos cuadros. */
  zoom?: { escala: number; origen: string; desde: number; hasta: number }
  style?: CSSProperties
}) {
  const { fps } = useVideoConfig()
  const cuadro = useCurrentFrame()
  const e = useEntrada(desde, { damping: 14, stiffness: 120 })
  const acerca = zoom
    ? spring({ frame: cuadro - zoom.desde, fps, config: { damping: 18, stiffness: 90 } }) -
      spring({ frame: cuadro - zoom.hasta, fps, config: { damping: 18, stiffness: 90 } })
    : 0
  const ancho = (alto * 390) / 844
  const marco = alto * 0.022
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        width: ancho + marco * 2,
        height: alto + marco * 2,
        marginLeft: -(ancho / 2 + marco),
        borderRadius: alto * 0.07,
        padding: marco,
        background: 'linear-gradient(160deg, #3a3a3a, #111 40%, #222)',
        boxShadow: '0 40px 80px rgb(0 0 0 / 0.55), inset 0 0 0 3px rgb(255 255 255 / 0.08)',
        transform: `translateY(${(1 - e) * 500}px) rotate(${inclinacion * e + (1 - e) * 8}deg) scale(${0.9 + 0.1 * e})`,
        opacity: Math.min(1, e * 2),
        ...style,
      }}
    >
      <div style={{ width: '100%', height: '100%', borderRadius: alto * 0.052, overflow: 'hidden', background: '#000' }}>
        <OffthreadVideo
          src={staticFile(`clips/${clip}`)}
          muted
          trimBefore={Math.round(recorte * fps)}
          playbackRate={velocidad}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: zoom ? `scale(${1 + (zoom.escala - 1) * acerca})` : undefined,
            transformOrigin: zoom?.origen,
          }}
        />
      </div>
    </div>
  )
}

/**
 * Un título que entra de golpe en el cuadro `desde` (cada renglón un pulso después del anterior).
 * Los renglones con `*asteriscos*` van en amarillo.
 */
export function Titulo({
  renglones,
  desde,
  paso = 8,
  tam = 96,
  y = 230,
  style,
}: {
  renglones: string[]
  desde: number
  paso?: number
  tam?: number
  y?: number
  style?: CSSProperties
}) {
  return (
    <div style={{ position: 'absolute', top: y, left: 70, right: 70, textAlign: 'center', ...style }}>
      {renglones.map((r, i) => (
        <Renglon key={i} texto={r} desde={desde + i * paso} tam={tam} />
      ))}
    </div>
  )
}

function Renglon({ texto, desde, tam }: { texto: string; desde: number; tam: number }) {
  const e = useEntrada(desde)
  const resaltado = texto.startsWith('*') && texto.endsWith('*')
  return (
    <div
      style={{
        fontFamily: LETRA_TITULO,
        fontSize: tam,
        lineHeight: 1.05,
        color: resaltado ? COLOR.acento : COLOR.papel,
        textShadow: `0 6px 0 ${COLOR.panoOscuro}, 0 14px 30px rgb(0 0 0 / 0.45)`,
        transform: `scale(${0.4 + 0.6 * e}) translateY(${(1 - e) * 40}px)`,
        opacity: Math.min(1, e * 1.6),
        textWrap: 'balance',
      }}
    >
      {resaltado ? texto.slice(1, -1) : texto}
    </div>
  )
}

/** Un globo de canto, como los de la mesa: amarillo, con la colita, que entra con un rebote. */
export function Globo({
  texto,
  desde,
  x,
  y,
  giro = 0,
  tam = 84,
  colita = 'izquierda',
}: {
  texto: string
  desde: number
  x: number
  y: number
  giro?: number
  tam?: number
  colita?: 'izquierda' | 'derecha'
}) {
  const e = useEntrada(desde, { damping: 8, stiffness: 220, mass: 0.6 })
  const cuadro = useCurrentFrame()
  const latido = cuadro >= desde ? 1 + 0.025 * Math.sin((cuadro - desde) / 3) : 1
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-50%, -50%) rotate(${giro}deg) scale(${e * latido})`,
        opacity: Math.min(1, e * 3),
      }}
    >
      <div
        style={{
          position: 'relative',
          padding: `${tam * 0.22}px ${tam * 0.45}px`,
          background: COLOR.acento,
          border: `7px solid ${COLOR.tinta}`,
          borderRadius: tam * 0.6,
          boxShadow: `0 12px 0 rgb(0 0 0 / 0.25)`,
          fontFamily: LETRA_TITULO,
          fontSize: tam,
          color: COLOR.tinta,
          whiteSpace: 'nowrap',
          lineHeight: 1,
        }}
      >
        {texto}
        <div
          style={{
            position: 'absolute',
            bottom: -tam * 0.42,
            [colita === 'izquierda' ? 'left' : 'right']: tam * 0.5,
            width: 0,
            height: 0,
            borderLeft: `${tam * 0.22}px solid transparent`,
            borderRight: `${tam * 0.22}px solid transparent`,
            borderTop: `${tam * 0.45}px solid ${COLOR.tinta}`,
            transform: `skewX(${colita === 'izquierda' ? -20 : 20}deg)`,
          }}
        />
      </div>
    </div>
  )
}

/** Una pastilla (para los modos: "1 vs 1"…), que entra en el cuadro `desde`. */
export function Pastilla({ children, desde, style }: { children: ReactNode; desde: number; style?: CSSProperties }) {
  const e = useEntrada(desde)
  return (
    <div
      style={{
        fontFamily: LETRA_TITULO,
        fontSize: 92,
        color: COLOR.tinta,
        background: COLOR.papel,
        border: `6px solid ${COLOR.dorsoDetalle}`,
        borderRadius: 999,
        padding: '18px 56px',
        boxShadow: '0 14px 0 rgb(0 0 0 / 0.3)',
        transform: `scale(${e}) rotate(${(1 - e) * -12}deg)`,
        opacity: Math.min(1, e * 2),
        ...style,
      }}
    >
      {children}
    </div>
  )
}

/** Un fogonazo blanco que se apaga, para marcar un golpe de la música. */
export function Destello({ en, dura = 6, fuerza = 0.7 }: { en: number; dura?: number; fuerza?: number }) {
  const cuadro = useCurrentFrame()
  const o = interpolate(cuadro, [en, en + dura], [fuerza, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  if (cuadro < en || o <= 0) return null
  return <AbsoluteFill style={{ background: COLOR.papel, opacity: o, pointerEvents: 'none' }} />
}

/** Un texto chico de apoyo (Nunito). */
export function Bajada({ children, desde, y, tam = 46 }: { children: ReactNode; desde: number; y: number; tam?: number }) {
  const e = useEntrada(desde, { damping: 16 })
  return (
    <div
      style={{
        position: 'absolute',
        top: y,
        left: 80,
        right: 80,
        textAlign: 'center',
        fontFamily: LETRA_TEXTO,
        fontWeight: 900,
        fontSize: tam,
        letterSpacing: '0.04em',
        color: COLOR.papel,
        textShadow: '0 3px 12px rgb(0 0 0 / 0.5)',
        opacity: e,
        transform: `translateY(${(1 - e) * 30}px)`,
      }}
    >
      {children}
    </div>
  )
}
