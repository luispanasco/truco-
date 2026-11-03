import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion'
import { COLOR, LETRA_TEXTO, LETRA_TITULO, Logo, Pano } from './marca'
import { Bajada, Celular, Globo, Pastilla, Titulo, useEntrada } from './piezas'
import { pulso } from './ritmo'

/**
 * Los clips de la app (public/clips, grabados a 390 × 844): el archivo y el segundo donde empieza
 * lo que se usa. Cada escena empieza en un pulso, así que `pulso(n)` cuenta desde su principio.
 */
export const CLIPS = {
  // Corte del mazo, reparto, la muestra (11 de oros) y en la mano el 4 de oros, pieza.
  reparto: { clip: 'reparto.mp4', recorte: 1.8, velocidad: 1 },
  // ¡Truco! (0,9 s), ¡Quiero retruco! (2,7 s), ¡Quiero vale cuatro! (4,4 s), ¡Quiero! (5,8 s): a 1,65× caen en los pulsos 1, 3, 5 y 7.
  cantos: { clip: 'cantos-truco.mp4', recorte: 0, velocidad: 1.65 },
  // Vista "sentados": el compañero (arriba) hace la seña del 4 de la muestra de 3,3 a 5,6 s (después, la perica).
  senias: { clip: 'senias-piezas.mp4', recorte: 2.4, velocidad: 1 },
  // Gorro, sombrero de gaucho, camisetas, poncho y bufanda.
  avatar: { clip: 'avatar.mp4', recorte: 1.2, velocidad: 1.6 },
  // Boliche → Azul → Bordó → Pizarra → Celeste.
  mesas: { clip: 'mesas.mp4', recorte: 0.6, velocidad: 2 },
}

/** Lo que se ve arriba de los títulos: Instagram tapa los primeros ~220 px y los últimos ~400. */
const ARRIBA = 215

/** El golpe. Una carta que cae de golpe sobre el paño y el grito. */
export function Gancho() {
  const cuadro = useCurrentFrame()
  // La carta ya viene cayendo en el cuadro 0: es el que Instagram muestra antes de que arranque.
  const carta = useEntrada(-4, { damping: 13, stiffness: 260, mass: 0.6 })
  const grito = useEntrada(pulso(1), { damping: 7, stiffness: 260, mass: 0.5 })
  const pregunta = useEntrada(pulso(2) + 2, { damping: 14 })
  // El sacudón del grito: unos cuadros que se apagan.
  const t = cuadro - pulso(1)
  const sacudon = t >= 0 && t < 9 ? (9 - t) * 2.2 : 0
  return (
    <Pano oscuro={0.3}>
      <AbsoluteFill style={{ transform: `translate(${Math.sin(cuadro * 2.7) * sacudon}px, ${Math.cos(cuadro * 3.1) * sacudon}px)` }}>
        <svg
          viewBox="-120 -170 240 340"
          style={{
            position: 'absolute',
            left: 540 - 230,
            top: 760 - 330,
            width: 460,
            height: 660,
            transform: `scale(${3 - 2 * carta}) rotate(${-14 + (1 - carta) * 30}deg)`,
            opacity: Math.min(1, carta * 4),
            filter: 'drop-shadow(0 30px 40px rgb(0 0 0 / 0.5))',
          }}
        >
          <rect x="-100" y="-150" width="200" height="300" rx="16" fill={COLOR.dorso} stroke={COLOR.dorsoDetalle} strokeWidth="4" />
          <rect x="-86" y="-136" width="172" height="272" rx="10" fill="none" stroke={COLOR.dorsoDetalle} strokeWidth="3" />
          <circle r="40" fill={COLOR.dorso} stroke={COLOR.dorsoDetalle} strokeWidth="5" />
          <path d="M0,-30 L9,-9 L30,0 L9,9 L0,30 L-9,9 L-30,0 L-9,-9 Z" fill={COLOR.dorsoDetalle} />
        </svg>
        <div
          style={{
            position: 'absolute',
            top: 640,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: LETRA_TITULO,
            fontSize: 230,
            color: COLOR.acento,
            WebkitTextStroke: `10px ${COLOR.tinta}`,
            paintOrder: 'stroke fill',
            textShadow: `0 16px 0 ${COLOR.tinta}`,
            transform: `rotate(-7deg) scale(${grito > 0 ? 2.4 - 1.4 * grito : 0})`,
            opacity: Math.min(1, grito * 3),
          }}
        >
          ¡TRUCO!
        </div>
        <div
          style={{
            position: 'absolute',
            top: 1010,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontFamily: LETRA_TEXTO,
            fontWeight: 900,
            fontSize: 64,
            color: COLOR.papel,
            opacity: pregunta,
            transform: `translateY(${(1 - pregunta) * 30}px)`,
            textShadow: '0 4px 16px rgb(0 0 0 / 0.6)',
          }}
        >
          ¿Quién quiere?
        </div>
      </AbsoluteFill>
    </Pano>
  )
}

/** El logo armándose, y la bajada. */
export function Presentacion() {
  return (
    <Pano>
      <Logo desde={0} style={{ position: 'absolute', left: 60, top: 420, width: 960 }} />
      <Bajada desde={pulso(3)} y={1230} tam={54}>
        El truco de acá, en tu celular
      </Bajada>
    </Pano>
  )
}

/** Un clip con su título arriba (las escenas de la partida). */
function EscenaClip({ renglones, clip, children, inclinacion = 0 }: { renglones: string[]; clip: keyof typeof CLIPS; children?: React.ReactNode; inclinacion?: number }) {
  return (
    <Pano>
      <Titulo renglones={renglones} desde={1} paso={pulso(1)} tam={92} y={ARRIBA} />
      <Celular {...CLIPS[clip]} alto={1060} desde={0} inclinacion={inclinacion} style={{ top: 455 }} />
      {children}
    </Pano>
  )
}

/** La partida de verdad: reparto y muestra. */
export function Reparto() {
  return <EscenaClip renglones={['Con muestra,', '*piezas y flor*']} clip="reparto" inclinacion={-2} />
}

/** Los cantos, con los globos de la mesa entrando en los pulsos. */
export function Cantos() {
  return (
    <EscenaClip renglones={['Cantá como', '*en el boliche*']} clip="cantos" inclinacion={2}>
      <Globo texto="¡Truco!" desde={pulso(1)} x={290} y={1340} giro={-6} />
      <Globo texto="¡Quiero retruco!" desde={pulso(3)} x={700} y={740} giro={5} tam={70} colita="derecha" />
      <Globo texto="¡Quiero vale cuatro!" desde={pulso(5)} x={560} y={1040} giro={-3} tam={68} />
    </EscenaClip>
  )
}

/** Las señas del compañero, con zoom a su avatar mientras la hace. */
export function Senias() {
  return (
    <Pano>
      <Titulo renglones={['Con las señas', '*de siempre*']} desde={1} paso={pulso(1)} tam={92} y={ARRIBA} />
      <Celular {...CLIPS.senias} alto={1060} desde={0} inclinacion={-2} zoom={{ escala: 2, origen: '50% 12%', desde: 14, hasta: 200 }} style={{ top: 455 }} />
      <Globo texto="¡El 4 de la muestra!" desde={pulso(2)} x={540} y={1330} giro={-4} tam={64} />
    </Pano>
  )
}

/** Los modos de juego, al ritmo. */
export function Modos() {
  const cuadro = useCurrentFrame()
  return (
    <Pano>
      <Titulo renglones={['Contra la compu', '*o con amigos*']} desde={1} paso={pulso(0.5)} tam={92} y={ARRIBA} />
      <div style={{ position: 'absolute', top: 580, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 46 }}>
        {['1 vs 1', '2 vs 2', '3 vs 3'].map((m, i) => (
          <Pastilla key={m} desde={pulso(1 + i)} style={{ rotate: `${[-4, 3, -2][i]}deg`, translate: `${Math.sin((cuadro + i * 20) / 14) * 8}px 0` }}>
            {m}
          </Pastilla>
        ))}
      </div>
    </Pano>
  )
}

/** Las salas privadas (con el código para los amigos) y el chat de voz. */
export function Salas() {
  const cuadro = useCurrentFrame()
  const codigo = useEntrada(pulso(1))
  const amigos = [
    { nombre: 'Ana', color: '#c0392b' },
    { nombre: 'Beto', color: '#1f4e8c' },
    { nombre: 'Caro', color: '#b8860b' },
  ]
  const mic = useEntrada(pulso(4.5))
  return (
    <Pano>
      <Titulo renglones={['Salas privadas', '*con chat de voz*']} desde={1} paso={pulso(0.5)} tam={92} y={ARRIBA} />
      {/* La tarjeta con el código de la sala, como en la sala de espera. */}
      <div
        style={{
          position: 'absolute',
          top: 520,
          left: 150,
          right: 150,
          padding: '34px 0 40px',
          borderRadius: 36,
          background: COLOR.papel,
          border: `6px solid ${COLOR.dorsoDetalle}`,
          boxShadow: '0 18px 0 rgb(0 0 0 / 0.3)',
          textAlign: 'center',
          transform: `scale(${codigo}) rotate(${(1 - codigo) * -10 - 2}deg)`,
          opacity: Math.min(1, codigo * 2),
        }}
      >
        <div style={{ fontFamily: LETRA_TEXTO, fontWeight: 900, fontSize: 40, color: COLOR.madera, letterSpacing: '0.08em' }}>CÓDIGO DE LA SALA</div>
        <div style={{ fontFamily: LETRA_TITULO, fontSize: 132, color: COLOR.tinta, letterSpacing: '0.14em', lineHeight: 1.1 }}>K7Q2M</div>
      </div>
      {/* Los amigos que entran, uno por pulso. */}
      <div style={{ position: 'absolute', top: 860, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 56 }}>
        {amigos.map((a, i) => (
          <Amigo key={a.nombre} {...a} desde={pulso(2 + i * 0.75)} />
        ))}
      </div>
      {/* El micrófono, con las ondas de la voz. */}
      <div style={{ position: 'absolute', top: 1140, left: 0, right: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 34, opacity: mic, transform: `scale(${mic})` }}>
        <div style={{ position: 'relative', width: 150, height: 150 }}>
          {[0, 1, 2].map((k) => {
            const t = ((cuadro + k * 14) % 42) / 42
            return (
              <div
                key={k}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: '50%',
                  border: `5px solid ${COLOR.acento}`,
                  transform: `scale(${1 + t * 0.9})`,
                  opacity: 1 - t,
                }}
              />
            )
          })}
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: COLOR.acento, display: 'grid', placeItems: 'center', fontSize: 78 }}>🎙️</div>
        </div>
        <div style={{ fontFamily: LETRA_TEXTO, fontWeight: 900, fontSize: 52, color: COLOR.papel, textShadow: '0 4px 14px rgb(0 0 0 / 0.5)', lineHeight: 1.1 }}>
          ¡Hablá mientras
          <br />
          jugás!
        </div>
      </div>
    </Pano>
  )
}

function Amigo({ nombre, color, desde }: { nombre: string; color: string; desde: number }) {
  const e = useEntrada(desde, { damping: 9 })
  return (
    <div style={{ display: 'grid', justifyItems: 'center', gap: 12, transform: `scale(${e}) translateY(${(1 - e) * 60}px)`, opacity: Math.min(1, e * 2) }}>
      <div
        style={{
          width: 150,
          height: 150,
          borderRadius: '50%',
          background: color,
          border: `6px solid ${COLOR.papel}`,
          boxShadow: '0 10px 0 rgb(0 0 0 / 0.25)',
          display: 'grid',
          placeItems: 'center',
          fontFamily: LETRA_TITULO,
          fontSize: 76,
          color: COLOR.papel,
        }}
      >
        {nombre[0]}
      </div>
      <div style={{ fontFamily: LETRA_TEXTO, fontWeight: 900, fontSize: 40, color: COLOR.papel }}>{nombre}</div>
    </div>
  )
}

/** Avatar y mesas, de a dos celulares. */
export function Cosmeticos() {
  return (
    <Pano>
      <Titulo renglones={['Armá tu avatar', '*y tu mesa*']} desde={0} paso={pulso(1) / 2} tam={88} y={ARRIBA} />
      <Celular {...CLIPS.avatar} alto={900} desde={0} inclinacion={-7} style={{ top: 520, marginLeft: -490 }} />
      <Celular {...CLIPS.mesas} alto={900} desde={3} inclinacion={7} style={{ top: 560, marginLeft: -15 }} />
    </Pano>
  )
}

/** El cierre, con el logo y a dónde ir. */
export function Cierre() {
  const cuadro = useCurrentFrame()
  const arroba = useEntrada(pulso(6))
  const brillo = interpolate(Math.sin(cuadro / 6), [-1, 1], [0.85, 1])
  return (
    <Pano>
      <Logo desde={0} style={{ position: 'absolute', left: 150, top: 230, width: 780 }} />
      <Titulo renglones={['*¡Ya salió la beta!*']} desde={pulso(3)} tam={104} y={890} />
      <Bajada desde={pulso(4)} y={1030} tam={50}>
        Gratis para Android
      </Bajada>
      <Bajada desde={pulso(5)} y={1095} tam={40}>
        Próximamente para iPhone
      </Bajada>
      <div
        style={{
          position: 'absolute',
          top: 1185,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          transform: `scale(${arroba})`,
          opacity: arroba,
        }}
      >
        <div
          style={{
            fontFamily: LETRA_TEXTO,
            fontWeight: 900,
            fontSize: 58,
            color: COLOR.tinta,
            background: COLOR.acento,
            borderRadius: 999,
            padding: '14px 44px',
            boxShadow: `0 10px 0 rgb(0 0 0 / 0.3)`,
            filter: `brightness(${brillo})`,
          }}
        >
          @truco_uruguayo
        </div>
      </div>
      <Bajada desde={pulso(7)} y={1320} tam={44}>
        Bajala desde el link en la bio
      </Bajada>
    </Pano>
  )
}
