import type { CSSProperties, ReactNode } from 'react'
import { AbsoluteFill, Html5Audio, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { Cantos, Gancho, Presentacion, Reparto, Senias } from './escenas'
import { COLOR, LETRA_TEXTO, LETRA_TITULO, Logo, Pano } from './marca'
import { Bajada, Celular, Destello, Globo, Pastilla, Titulo, useEntrada } from './piezas'
import { pulso } from './ritmo'

/**
 * El reel del lanzamiento con testers (2026-11-11): lo de siempre (la partida, los cantos, las
 * señas) y lo nuevo (el tutorial con Don Queiroz, el modo historia en Rocha, los mazos y las mesas
 * de los departamentos, la tienda y los grupos). Misma música que el primero, pero más larga
 * (public/musica-lanzamiento.mp3: el tema desde su primer compás, 58 s con fundido), y cada escena
 * empieza en un pulso. Los clips nuevos se grabaron a 390 × 844 (3×) con Playwright.
 */
export const DURACION_LANZAMIENTO = pulso(110) // ≈ 57,9 s

/** Lo que se ve arriba de los títulos: Instagram tapa los primeros ~220 px y los últimos ~400. */
const ARRIBA = 215

type Tramo = { clip: string; recorte?: number; velocidad?: number; pulsos: number }

/**
 * Un celular que pasa por varios clips sin salir de cuadro: cada tramo dura `pulsos` y corta en
 * un pulso. Entra una sola vez, como `Celular`.
 */
function CelularTramos({ tramos, alto = 1060, inclinacion = 0, style }: { tramos: Tramo[]; alto?: number; inclinacion?: number; style?: CSSProperties }) {
  const e = useEntrada(0, { damping: 14, stiffness: 120 })
  const ancho = (alto * 390) / 844
  const marco = alto * 0.022
  let desde = 0
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
      <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: alto * 0.052, overflow: 'hidden', background: '#000' }}>
        {tramos.map((t, i) => {
          const de = pulso(desde)
          desde += t.pulsos
          const hasta = pulso(desde)
          return (
            <Sequence key={i} from={de} durationInFrames={hasta - de} layout="none">
              <Pantalla {...t} />
            </Sequence>
          )
        })}
      </div>
    </div>
  )
}

function Pantalla({ clip, recorte = 0, velocidad = 1 }: Tramo) {
  const { fps } = useVideoConfig()
  return (
    <OffthreadVideo
      src={staticFile(`clips/${clip}`)}
      muted
      trimBefore={Math.round(recorte * fps)}
      playbackRate={velocidad}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
    />
  )
}

/** Un título que cambia a mitad de escena: el primero hasta `cambia`, el segundo desde ahí. */
function TitulosQueCambian({ antes, despues, cambia, tam = 88 }: { antes: string[]; despues: string[]; cambia: number; tam?: number }) {
  const cuadro = useCurrentFrame()
  return cuadro < cambia ? (
    <Titulo renglones={antes} desde={1} paso={pulso(1)} tam={tam} y={ARRIBA} />
  ) : (
    <Titulo renglones={despues} desde={cambia} paso={pulso(0.5)} tam={tam} y={ARRIBA} />
  )
}

/** Un globo que se va a los `hasta` cuadros (para los que acompañan un solo tramo). */
function GloboTramo({ desde, hasta, ...resto }: { desde: number; hasta: number } & Omit<Parameters<typeof Globo>[0], 'desde'>) {
  const cuadro = useCurrentFrame()
  if (cuadro >= hasta) return null
  return <Globo desde={desde} {...resto} />
}

/**
 * La apertura del primero (la carta que cae y "¡TRUCO!") con una cinta de "¡Ya salió!" arriba,
 * a la vista desde el cuadro 0: es el que Instagram muestra antes de que arranque.
 */
export function GanchoLanzamiento() {
  const cuadro = useCurrentFrame()
  const latido = 1 + 0.03 * Math.sin(cuadro / 4)
  return (
    <AbsoluteFill>
      <Gancho />
      <div style={{ position: 'absolute', top: 245, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            fontFamily: LETRA_TITULO,
            fontSize: 76,
            color: COLOR.tinta,
            background: COLOR.acento,
            border: `6px solid ${COLOR.tinta}`,
            borderRadius: 999,
            padding: '14px 50px',
            boxShadow: '0 12px 0 rgb(0 0 0 / 0.3)',
            transform: `rotate(-3deg) scale(${latido})`,
          }}
        >
          ¡Ya salió!
        </div>
      </div>
    </AbsoluteFill>
  )
}

/** "¿No sabés jugar? Don Queiroz te enseña": la ruta de lecciones, cargar el envido y el diploma. */
export function Aprender() {
  return (
    <Pano>
      <TitulosQueCambian antes={['¿No sabés jugar?']} despues={['Don Queiroz', '*te enseña*']} cambia={pulso(3)} tam={92} />
      <CelularTramos
        inclinacion={-2}
        style={{ top: 455 }}
        tramos={[
          // Jugar → "¿Primera vez? Aprendé a jugar" → la ruta (5 de 11) y baja.
          { clip: 'aprender-ruta.mp4', recorte: 0.4, velocidad: 1.8, pulsos: 5 },
          // La lección del envido: 7 y 4 de bastos y el 4 de espadas; carga 31 y "¡Eso!".
          { clip: 'aprender-envido.mp4', recorte: 1.9, velocidad: 1.2, pulsos: 6 },
          // El diploma: "Te recibiste de truquero".
          { clip: 'aprender-diploma.mp4', recorte: 1.3, velocidad: 1, pulsos: 4 },
        ]}
      />
      <GloboTramo texto="¡Cargá el envido!" desde={pulso(6)} hasta={pulso(11)} x={540} y={640} giro={-4} tam={62} />
      <GloboTramo texto="¡Te recibís!" desde={pulso(11.5)} hasta={pulso(15)} x={540} y={1390} giro={3} tam={70} />
    </Pano>
  )
}

/** "Recorré Uruguay": el mapa, Rocha con su camino punteado, la previa y la mesa de Rocha. */
export function Historia() {
  return (
    <Pano>
      <TitulosQueCambian antes={['Recorré', '*Uruguay*']} despues={['Arrancá en Rocha…', '*y se vienen más*']} cambia={pulso(9)} tam={88} />
      <CelularTramos
        inclinacion={2}
        style={{ top: 455 }}
        tramos={[
          // Jugar → Modo historia (la portada con el faro) → el mapa, con Rocha abierta.
          { clip: 'historia-mapa.mp4', recorte: 0.6, velocidad: 1.7, pulsos: 5 },
          // El mapa de Rocha: el camino punteado, dorado en los dos niveles ganados.
          { clip: 'historia-nivel.mp4', recorte: 0.2, velocidad: 1, pulsos: 4 },
          // La previa de La Pedrera: Julio el Pescador habla y Luis contesta.
          { clip: 'historia-nivel.mp4', recorte: 4.4, velocidad: 1.7, pulsos: 5 },
          // La mesa de Rocha (el faro bordado y el marco de sogas): ¡Flor! y ¡Truco!
          { clip: 'historia-nivel.mp4', recorte: 33.6, velocidad: 1.2, pulsos: 6 },
        ]}
      />
      <GloboTramo texto="¡Flor!" desde={pulso(15.5)} hasta={pulso(20)} x={300} y={1400} giro={-6} tam={80} />
    </Pano>
  )
}

/** Mazos y mesas de cada departamento, de a dos celulares. */
export function Mazos() {
  return (
    <Pano>
      <Titulo renglones={['Mazos y mesas', '*de cada rincón*']} desde={0} paso={pulso(1) / 2} tam={88} y={ARRIBA} />
      {/* Costa Uruguaya, Colonial, Grabado Nocturno, Artigas y Paysandú; después "Ver las cartas". */}
      <CelularTramos
        alto={900}
        inclinacion={-7}
        style={{ top: 520, marginLeft: -490 }}
        tramos={[
          { clip: 'barajas.mp4', recorte: 1.6, velocidad: 2, pulsos: 6 },
          { clip: 'barajas.mp4', recorte: 12.6, velocidad: 1.6, pulsos: 3 },
        ]}
      />
      {/* Los paños: Rocha (el faro y las sogas), Colonia, Maldonado, Tacuarembó y Rocha otra vez. */}
      <Sequence from={3} layout="none">
        <Celular clip="mesas-nuevas.mp4" recorte={1.4} velocidad={2.1} alto={900} desde={0} inclinacion={7} style={{ top: 560, marginLeft: -15 }} />
      </Sequence>
    </Pano>
  )
}

/** La tienda: "¿Cómo gano monedas?", la vitrina de hoy y el probador. */
export function Tienda() {
  return (
    <Pano>
      <Titulo renglones={['Juntá monedas', '*y lucite*']} desde={1} paso={pulso(1)} tam={92} y={ARRIBA} />
      <Celular clip="tienda.mp4" recorte={0.6} velocidad={1.7} alto={1060} desde={0} inclinacion={-2} style={{ top: 455 }} />
    </Pano>
  )
}

/** Los grupos: armar el tuyo y el muro con las partidas. */
export function Grupos() {
  return (
    <Pano>
      <Titulo renglones={['Jugá con', '*tu barra*']} desde={1} paso={pulso(1)} tam={92} y={ARRIBA} />
      <CelularTramos
        inclinacion={2}
        style={{ top: 455 }}
        tramos={[
          // Crear grupo: la foto, "Los del Boliche" y BOL.
          { clip: 'grupo-crear.mp4', recorte: 0.7, velocidad: 1.9, pulsos: 4 },
          // Grupos → Los del Boliche → el muro con las partidas entre ellos.
          { clip: 'grupo-muro.mp4', recorte: 1.1, velocidad: 1.9, pulsos: 5 },
        ]}
      />
    </Pano>
  )
}

/** Online o contra la compu: el Lobby, Tríos y una mesa de 3 vs 3 con las señas. */
export function ModosLanzamiento() {
  const cuadro = useCurrentFrame()
  return (
    <Pano>
      <Titulo renglones={['Online o', '*contra la compu*']} desde={1} paso={pulso(1)} tam={92} y={ARRIBA} />
      <Celular clip="modos.mp4" recorte={0.5} velocidad={1.6} alto={1000} desde={0} inclinacion={-4} style={{ top: 470, marginLeft: -400 }} />
      <div style={{ position: 'absolute', top: 640, left: 640, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 60 }}>
        {['1 vs 1', '2 vs 2', '3 vs 3'].map((m, i) => (
          <Pastilla key={m} desde={pulso(2 + i)} style={{ fontSize: 66, padding: '14px 36px', rotate: `${[-4, 3, -2][i]}deg`, translate: `${Math.sin((cuadro + i * 20) / 14) * 6}px 0` }}>
            {m}
          </Pastilla>
        ))}
      </div>
    </Pano>
  )
}

/** El cierre, como el de la segunda versión: en iPhone, por ahora desde la web. */
export function CierreLanzamiento() {
  const arroba = useEntrada(pulso(6))
  const cuadro = useCurrentFrame()
  const brillo = 0.925 + 0.075 * Math.sin(cuadro / 6)
  return (
    <Pano>
      <Logo desde={0} style={{ position: 'absolute', left: 150, top: 230, width: 780 }} />
      <Titulo renglones={['*¡Ya salió la beta!*']} desde={pulso(3)} tam={104} y={890} />
      <Bajada desde={pulso(4)} y={1030} tam={50}>
        Gratis para Android
      </Bajada>
      <Bajada desde={pulso(5)} y={1095} tam={40}>
        En iPhone, jugá desde la web
      </Bajada>
      <div style={{ position: 'absolute', top: 1185, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `scale(${arroba})`, opacity: arroba }}>
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

/** Las escenas, cada una desde un pulso de la música; el reel dura 110 pulsos. */
const ESCENAS: { desde: number; hasta: number; Escena: () => ReactNode }[] = [
  { desde: pulso(0), hasta: pulso(4), Escena: GanchoLanzamiento },
  { desde: pulso(4), hasta: pulso(10), Escena: Presentacion },
  { desde: pulso(10), hasta: pulso(16), Escena: Reparto },
  { desde: pulso(16), hasta: pulso(23), Escena: Cantos },
  { desde: pulso(23), hasta: pulso(38), Escena: Aprender },
  { desde: pulso(38), hasta: pulso(58), Escena: Historia },
  { desde: pulso(58), hasta: pulso(67), Escena: Mazos },
  { desde: pulso(67), hasta: pulso(74), Escena: Tienda },
  { desde: pulso(74), hasta: pulso(83), Escena: Grupos },
  { desde: pulso(83), hasta: pulso(92), Escena: ModosLanzamiento },
  { desde: pulso(92), hasta: pulso(98), Escena: Senias },
  { desde: pulso(98), hasta: DURACION_LANZAMIENTO, Escena: CierreLanzamiento },
]

/** Los ruidos de cartas de la app (Kenney, CC0), en los golpes. */
const EFECTOS: { en: number; sonido: string; volumen?: number }[] = [
  { en: 0, sonido: 'carta-1.ogg' },
  { en: pulso(1), sonido: 'vuelta.ogg' },
  { en: pulso(4) + 5, sonido: 'repartir.ogg' },
  { en: pulso(4) + 30, sonido: 'carta-2.ogg' },
  { en: pulso(17), sonido: 'carta-1.ogg', volumen: 0.6 },
  { en: pulso(19), sonido: 'carta-2.ogg', volumen: 0.6 },
  { en: pulso(21), sonido: 'carta-1.ogg', volumen: 0.6 },
  { en: pulso(23 + 9), sonido: 'punto.ogg' },
  { en: pulso(38 + 15.5), sonido: 'carta-2.ogg', volumen: 0.6 },
  { en: pulso(83 + 2), sonido: 'punto.ogg' },
  { en: pulso(83 + 3), sonido: 'punto.ogg' },
  { en: pulso(83 + 4), sonido: 'punto.ogg' },
  { en: pulso(98) + 5, sonido: 'repartir.ogg' },
  { en: pulso(101), sonido: 'carta-2.ogg' },
]

/** `conMusica` en false deja solo los ruidos de cartas, para ponerle un tema de Instagram encima. */
export function Lanzamiento({ conMusica = true }: { conMusica?: boolean }) {
  return (
    <AbsoluteFill style={{ background: '#154d29' }}>
      {ESCENAS.map(({ desde, hasta, Escena }) => (
        <Sequence key={desde} from={desde} durationInFrames={hasta - desde}>
          <Escena />
        </Sequence>
      ))}
      {ESCENAS.slice(1).map(({ desde }) => (
        <Destello key={desde} en={desde} dura={5} fuerza={0.35} />
      ))}
      {conMusica && <Html5Audio src={staticFile('musica-lanzamiento.mp3')} volume={0.9} />}
      {EFECTOS.map(({ en, sonido, volumen = 0.8 }, i) => (
        <Sequence key={i} from={en} durationInFrames={45}>
          <Html5Audio src={staticFile(`sfx/${sonido}`)} volume={volumen} />
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}
