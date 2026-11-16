import type { ReactNode } from 'react'
import { AbsoluteFill, Html5Audio, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame, useVideoConfig } from 'remotion'
import { COLOR, LETRA_TEXTO, Logo, Pano } from './marca'
import { pulso } from './ritmo'

/**
 * El reel con todo, segunda versión (2026-11-16). La primera parecía hecha por una máquina: cada
 * escena era la misma plantilla (título amarillo, celular inclinado, globos que rebotan) y los
 * clips iban a ×3. Esta va como la editaría alguien a mano: la grabación de la app grande y
 * derecha, cortes secos en los pulsos, textos tipo subtítulo con un fundido corto y nada que
 * rebote. Diez escenas de 4 a 8 s, sobre la madera del boliche. Misma música (58 s).
 */
export const DURACION_COMPLETO = pulso(110) // ≈ 57,9 s

/** La grabación de la app (390 × 844) va a 1560 px de alto, centrada, con las puntas redondeadas. */
const ALTO = 1560
const ANCHO = (ALTO * 390) / 844
const ARRIBA = 330

type Tramo = { clip: string; recorte: number; velocidad?: number; pulsos: number }

/** Un fundido corto (6 cuadros) a la entrada y a la salida. */
function useFundido(desde: number, hasta: number) {
  const cuadro = useCurrentFrame()
  return interpolate(cuadro, [desde, desde + 6, hasta - 6, hasta], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
}

/**
 * La pantalla de la app, que pasa por varios clips con cortes secos. Se acerca apenas (4 %) a lo
 * largo de la escena, para que no quede quieta.
 */
function Pantalla({ tramos, duracion }: { tramos: Tramo[]; duracion: number }) {
  const cuadro = useCurrentFrame()
  const { fps } = useVideoConfig()
  const acerca = interpolate(cuadro, [0, duracion], [1, 1.04])
  let desde = 0
  return (
    <div
      style={{
        position: 'absolute',
        top: ARRIBA,
        left: (1080 - ANCHO) / 2,
        width: ANCHO,
        height: ALTO,
        borderRadius: 34,
        overflow: 'hidden',
        background: '#000',
        boxShadow: '0 30px 70px rgb(0 0 0 / 0.55)',
      }}
    >
      <div style={{ position: 'absolute', inset: 0, transform: `scale(${acerca})`, transformOrigin: '50% 40%' }}>
        {tramos.map((t, i) => {
          const de = pulso(desde)
          desde += t.pulsos
          return (
            <Sequence key={i} from={de} durationInFrames={pulso(desde) - de} layout="none">
              <OffthreadVideo
                src={staticFile(`clips/${t.clip}`)}
                muted
                trimBefore={Math.round(t.recorte * fps)}
                playbackRate={t.velocidad ?? 1}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </Sequence>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Un subtítulo arriba de la pantalla, en una franja oscura: el renglón grande y, si hay, uno más
 * chico. Lo que va entre `*asteriscos*` sale en amarillo.
 */
function Leyenda({ grande, chico, desde, hasta }: { grande: string; chico?: string; desde: number; hasta: number }) {
  const o = useFundido(desde, hasta)
  if (o <= 0) return null
  return (
    <div style={{ position: 'absolute', top: 228, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: o, zIndex: 2 }}>
      <div
        style={{
          maxWidth: 900,
          padding: '20px 34px 22px',
          borderRadius: 22,
          background: 'rgb(24 12 4 / 0.82)',
          textAlign: 'center',
          fontFamily: LETRA_TEXTO,
          color: COLOR.papel,
          boxShadow: '0 10px 30px rgb(0 0 0 / 0.35)',
          textWrap: 'balance',
        }}
      >
        <div style={{ fontWeight: 900, fontSize: 58, lineHeight: 1.12 }}>
          <Resaltado texto={grande} />
        </div>
        {chico && (
          <div style={{ fontWeight: 800, fontSize: 38, lineHeight: 1.2, marginTop: 8, opacity: 0.92 }}>
            <Resaltado texto={chico} />
          </div>
        )}
      </div>
    </div>
  )
}

function Resaltado({ texto }: { texto: string }) {
  return (
    <>
      {texto.split('*').map((parte, i) =>
        i % 2 === 1 ? (
          <span key={i} style={{ color: COLOR.acento }}>
            {parte}
          </span>
        ) : (
          parte
        ),
      )}
    </>
  )
}

type Texto = { grande: string; chico?: string; desde: number; hasta: number }

/** Una escena: la pantalla con sus clips y los subtítulos, en pulsos contados desde su principio. */
function escena(tramos: Tramo[], textos: Texto[]) {
  const duracion = pulso(tramos.reduce((s, t) => s + t.pulsos, 0))
  return function Escena() {
    return (
      <Pano>
        <Pantalla tramos={tramos} duracion={duracion} />
        {textos.map((t, i) => (
          <Leyenda key={i} {...t} desde={pulso(t.desde)} hasta={Math.min(duracion, pulso(t.hasta))} />
        ))}
      </Pano>
    )
  }
}

/** Una mano de verdad: el reparto con la muestra y la pieza, y después truco, retruco y vale cuatro. */
const Partida = escena(
  [
    { clip: 'reparto.mp4', recorte: 1.8, pulsos: 6 },
    { clip: 'cantos-truco.mp4', recorte: 0.5, velocidad: 1.2, pulsos: 8 },
  ],
  [
    { grande: 'Truco *uruguayo*, no argentino', chico: 'Con muestra, piezas y flor', desde: 0, hasta: 6 },
    { grande: 'Truco, retruco y *vale cuatro*', chico: 'Como se canta en el boliche', desde: 6, hasta: 14 },
  ],
)

const Online = escena(
  [
    // El Lobby: "Buscar rival" y "Buscando rival…".
    { clip: 'online.mp4', recorte: 1.5, velocidad: 1.2, pulsos: 6 },
    // La mesa contra Marta, otra persona: ¡Truco! y ¡Quiero!
    { clip: 'online.mp4', recorte: 14.6, pulsos: 5 },
  ],
  [
    { grande: 'Jugá *online* con gente de verdad', chico: 'O contra la compu, cuando quieras', desde: 0, hasta: 6 },
    { grande: 'Buscá rival al toque', chico: 'O armá sala para 2 vs 2 y 3 vs 3', desde: 6, hasta: 11 },
  ],
)

const Aprender = escena(
  [
    { clip: 'aprender-ruta.mp4', recorte: 1.2, velocidad: 1.3, pulsos: 4 },
    { clip: 'aprender-envido.mp4', recorte: 2.5, velocidad: 1.2, pulsos: 5 },
  ],
  [{ grande: '¿No sabés jugar?', chico: 'Don Queiroz te enseña desde cero', desde: 0, hasta: 9 }],
)

const Historia = escena(
  [
    // Los barrios de Rocha en redondeles con las fotos, y tocar Cabo Polonio.
    { clip: 'historia-barrios.mp4', recorte: 8.6, pulsos: 8 },
    // El mapa de Cabo Polonio: la flecha al nivel 1, volar hasta él y tocar el nivel 3.
    { clip: 'historia-mapa-barrio.mp4', recorte: 4, velocidad: 1.4, pulsos: 8 },
  ],
  [
    { grande: '*Modo historia*', chico: 'Rocha, barrio por barrio', desde: 0, hasta: 8 },
    { grande: '32 lugares de verdad', chico: 'Del faro de La Paloma a la Fortaleza de Santa Teresa', desde: 8, hasta: 16 },
  ],
)

const Previa = escena(
  [
    // Celeste la Farera habla antes de jugar.
    { clip: 'historia-previa.mp4', recorte: 3, velocidad: 1.3, pulsos: 5 },
    // La mesa del Cabo (el faro y los lobos): envido, quiero y 31.
    { clip: 'historia-previa.mp4', recorte: 14.8, velocidad: 1.6, pulsos: 7 },
  ],
  [
    { grande: 'En cada lugar te espera *alguien de ahí*', desde: 0, hasta: 5 },
    { grande: 'Y cada barrio tiene *su mesa*', desde: 5, hasta: 12 },
  ],
)

const PanosYMazos = escena(
  [
    // La Paloma, La Pedrera y Cabo Polonio.
    { clip: 'panos.mp4', recorte: 6, velocidad: 2, pulsos: 5 },
    // Oriental, Costa Uruguaya, Colonial y Grabado Nocturno.
    { clip: 'mazos.mp4', recorte: 3.5, velocidad: 2.2, pulsos: 4 },
  ],
  [{ grande: 'Paños y mazos *de todo el país*', desde: 0, hasta: 9 }],
)

const Avatar = escena(
  [{ clip: 'avatar-peinados.mp4', recorte: 2.3, velocidad: 2, pulsos: 8 }],
  [{ grande: 'Armá *tu avatar*', chico: 'Pelo, cara, ropa, gorro…', desde: 0, hasta: 8 }],
)

const Amigos = escena(
  [
    // Aceptar a Lucía y unirse a la sala de Beto.
    { clip: 'amigos.mp4', recorte: 5, velocidad: 1.6, pulsos: 5 },
    // "¿Un truquito a la noche?" y "¡De una!".
    { clip: 'grupo-chat.mp4', recorte: 3.8, velocidad: 1.8, pulsos: 7 },
  ],
  [
    { grande: 'Sumá *amigos*', chico: 'Y entrá a su mesa con un toque', desde: 0, hasta: 5 },
    { grande: 'Armá el grupo *de la barra*', chico: 'Con su chat y sus partidas', desde: 5, hasta: 12 },
  ],
)

const Google = escena(
  [{ clip: 'cuenta-google.mp4', recorte: 1.9, pulsos: 9 }],
  [{ grande: 'Entrá con tu cuenta de *Google*', chico: 'Y tu progreso te sigue a cualquier celular', desde: 0, hasta: 9 }],
)

/** El cierre: el logo quieto, a dónde bajarla y la cuenta. */
function Cierre() {
  const linea = (desde: number) => useFundido(desde, pulso(20))
  const a = linea(pulso(2))
  const b = linea(pulso(3.5))
  return (
    <Pano>
      <Logo desde={-60} girar={false} style={{ position: 'absolute', left: 150, top: 300, width: 780 }} />
      <div style={{ position: 'absolute', top: 960, left: 0, right: 0, textAlign: 'center', fontFamily: LETRA_TEXTO, color: COLOR.papel }}>
        <div style={{ fontWeight: 900, fontSize: 64, opacity: a }}>Gratis en Android y en la web</div>
        <div style={{ fontWeight: 900, fontSize: 54, color: COLOR.acento, marginTop: 40, opacity: b }}>@truco_uruguayo</div>
        <div style={{ fontWeight: 800, fontSize: 38, marginTop: 18, opacity: b }}>El link está en la bio</div>
      </div>
    </Pano>
  )
}

/** Las escenas, cada una desde un pulso de la música; el reel dura 110 pulsos. */
const ESCENAS: { pulsos: number; Escena: () => ReactNode }[] = [
  { pulsos: 14, Escena: Partida },
  { pulsos: 11, Escena: Online },
  { pulsos: 9, Escena: Aprender },
  { pulsos: 16, Escena: Historia },
  { pulsos: 12, Escena: Previa },
  { pulsos: 9, Escena: PanosYMazos },
  { pulsos: 8, Escena: Avatar },
  { pulsos: 12, Escena: Amigos },
  { pulsos: 9, Escena: Google },
  { pulsos: 10, Escena: Cierre },
]

/** Pocos ruidos de cartas (Kenney, CC0): el reparto, el truco y el cierre. */
const EFECTOS: { en: number; sonido: string; volumen?: number }[] = [
  { en: 2, sonido: 'repartir.ogg', volumen: 0.6 },
  { en: pulso(7), sonido: 'carta-1.ogg', volumen: 0.5 },
  { en: pulso(100) + 4, sonido: 'carta-2.ogg', volumen: 0.6 },
]

/** `conMusica` en false deja solo los ruidos de cartas, para ponerle un tema de Instagram encima. */
export function Completo({ conMusica = true }: { conMusica?: boolean }) {
  let desde = 0
  return (
    <AbsoluteFill style={{ background: COLOR.fondoOscuro }}>
      {ESCENAS.map(({ pulsos, Escena }, i) => {
        const de = pulso(desde)
        desde += pulsos
        return (
          <Sequence key={i} from={de} durationInFrames={pulso(desde) - de}>
            <Escena />
          </Sequence>
        )
      })}
      {conMusica && <Html5Audio src={staticFile('musica-lanzamiento.mp3')} volume={0.9} />}
      {EFECTOS.map(({ en, sonido, volumen = 0.8 }, i) => (
        <Sequence key={i} from={en} durationInFrames={45}>
          <Html5Audio src={staticFile(`sfx/${sonido}`)} volume={volumen} />
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}
