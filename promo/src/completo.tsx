import type { ReactNode } from 'react'
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame } from 'remotion'
import { CLIPS, Gancho } from './escenas'
import { ARRIBA, CelularTramos, GloboTramo, TitulosQueCambian } from './lanzamiento'
import { COLOR, LETRA_TEXTO, LETRA_TITULO, Logo, Pano } from './marca'
import { Bajada, Celular, Destello, Globo, Titulo, useEntrada } from './piezas'
import { pulso } from './ritmo'

/**
 * El reel con todo, tercera versión (2026-11-16). Vuelve al estilo de la primera (celular
 * centrado con su marco, entradas con rebote, títulos grandes, globos y destellos), que al
 * usuario le gustaba más que la segunda, pero con menos escenas y más tiempo para cada una: los
 * clips van a velocidad real o hasta 1,6×. Truco uruguayo, sin compararlo con nada. Suma el
 * online y la entrada con Google. Sobre la madera del boliche; misma música (58 s).
 */
export const DURACION_COMPLETO = pulso(110) // ≈ 57,9 s

/** La apertura del primero, con la cinta de "Truco uruguayo" arriba desde el cuadro 0. */
function GanchoCompleto() {
  const cuadro = useCurrentFrame()
  const latido = 1 + 0.03 * Math.sin(cuadro / 4)
  return (
    <AbsoluteFill>
      <Gancho />
      <div style={{ position: 'absolute', top: 245, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
        <div
          style={{
            fontFamily: LETRA_TITULO,
            fontSize: 70,
            color: COLOR.tinta,
            background: COLOR.acento,
            border: `6px solid ${COLOR.tinta}`,
            borderRadius: 999,
            padding: '14px 50px',
            boxShadow: '0 12px 0 rgb(0 0 0 / 0.3)',
            transform: `rotate(-3deg) scale(${latido})`,
          }}
        >
          Truco uruguayo
        </div>
      </div>
    </AbsoluteFill>
  )
}

function Presentacion() {
  return (
    <Pano>
      <Logo desde={0} style={{ position: 'absolute', left: 60, top: 420, width: 960 }} />
      <Bajada desde={pulso(3)} y={1230} tam={54}>
        El truco uruguayo, en tu celular
      </Bajada>
    </Pano>
  )
}

/** El reparto: la muestra y una pieza en la mano. */
function Reparto() {
  return (
    <Pano>
      <Titulo renglones={['Con muestra,', '*piezas y flor*']} desde={1} paso={pulso(1)} tam={96} y={ARRIBA} />
      <Celular clip="reparto.mp4" recorte={1.2} alto={1060} desde={0} inclinacion={-2} style={{ top: 455 }} />
      <Globo texto="¡Tengo pieza!" desde={pulso(5)} x={560} y={1370} giro={-4} tam={66} />
    </Pano>
  )
}

/** Los cantos a 1,2×: ¡Truco! (0,9 s), retruco (2,7 s), vale cuatro (4,4 s) y ¡Quiero! (5,8 s). */
function Cantos() {
  return (
    <Pano>
      <Titulo renglones={['Cantá como', '*en el boliche*']} desde={1} paso={pulso(1)} tam={92} y={ARRIBA} />
      <Celular clip={CLIPS.cantos.clip} recorte={0} velocidad={1.2} alto={1060} desde={0} inclinacion={2} style={{ top: 455 }} />
      <Globo texto="¡Truco!" desde={pulso(1.5)} x={290} y={1340} giro={-6} />
      <Globo texto="¡Quiero retruco!" desde={pulso(4.3)} x={700} y={740} giro={5} tam={70} colita="derecha" />
      <Globo texto="¡Quiero vale cuatro!" desde={pulso(7)} x={560} y={1040} giro={-3} tam={64} />
    </Pano>
  )
}

/** Online: el Lobby y "Buscar rival", y la mesa contra Marta, que es otra persona. */
function Online() {
  return (
    <Pano>
      <Titulo renglones={['Jugá online', '*con gente de verdad*']} desde={1} paso={pulso(1)} tam={76} y={ARRIBA} />
      <CelularTramos
        inclinacion={-2}
        style={{ top: 455 }}
        tramos={[
          { clip: 'online.mp4', recorte: 1.5, velocidad: 1.4, pulsos: 5 },
          { clip: 'online.mp4', recorte: 14.6, velocidad: 1, pulsos: 6 },
        ]}
      />
      <GloboTramo texto="¡Buscar rival!" desde={pulso(1.5)} hasta={pulso(5)} x={540} y={1390} giro={-3} tam={64} />
      <GloboTramo texto="¡Quiero!" desde={pulso(8)} hasta={pulso(11)} x={760} y={760} giro={5} tam={72} colita="derecha" />
    </Pano>
  )
}

/** Don Queiroz: la ruta de lecciones y cargar el envido. */
function Aprender() {
  return (
    <Pano>
      <TitulosQueCambian antes={['¿No sabés jugar?']} despues={['Don Queiroz', '*te enseña*']} cambia={pulso(3)} tam={92} />
      <CelularTramos
        inclinacion={2}
        style={{ top: 455 }}
        tramos={[
          { clip: 'aprender-ruta.mp4', recorte: 1.2, velocidad: 1.4, pulsos: 4 },
          { clip: 'aprender-envido.mp4', recorte: 2.5, velocidad: 1.2, pulsos: 6 },
        ]}
      />
      <GloboTramo texto="¡Cargá el envido!" desde={pulso(5)} hasta={pulso(10)} x={540} y={1390} giro={-4} tam={62} />
    </Pano>
  )
}

/** El modo historia por barrios: Rocha, el mapa de Cabo Polonio, la previa y la mesa del Cabo. */
function Historia() {
  return (
    <Pano>
      <TitulosQueCambian antes={['Recorré', '*Uruguay*']} despues={['Rocha,', '*barrio por barrio*']} cambia={pulso(5)} tam={88} />
      <CelularTramos
        inclinacion={-2}
        style={{ top: 455 }}
        tramos={[
          // Los barrios de Rocha, en redondeles con las fotos que pasan.
          { clip: 'historia-barrios.mp4', recorte: 8.6, velocidad: 1.4, pulsos: 5 },
          // El mapa de Cabo Polonio: la flecha al nivel 1 y volar hasta él.
          { clip: 'historia-mapa-barrio.mp4', recorte: 4.4, velocidad: 1.6, pulsos: 4 },
          // La previa: Celeste la Farera habla.
          { clip: 'historia-previa.mp4', recorte: 3, velocidad: 1.4, pulsos: 4 },
          // La mesa del Cabo (el faro y los lobos): envido y ¡Quiero!
          { clip: 'historia-previa.mp4', recorte: 14.8, velocidad: 1.6, pulsos: 4 },
        ]}
      />
      <GloboTramo texto="32 lugares de verdad" desde={pulso(1.5)} hasta={pulso(5)} x={540} y={1400} giro={-3} tam={58} />
      <GloboTramo texto="Cabo Polonio" desde={pulso(5.5)} hasta={pulso(9)} x={360} y={1400} giro={-5} tam={66} />
      <GloboTramo texto="¡Cada barrio, su mesa!" desde={pulso(13.5)} hasta={pulso(17)} x={540} y={1400} giro={3} tam={58} />
    </Pano>
  )
}

/** Los paños de los barrios y los mazos, de a dos celulares. */
function PanosYMazos() {
  return (
    <Pano>
      <Titulo renglones={['Paños y mazos', '*de cada rincón*']} desde={0} paso={pulso(1) / 2} tam={88} y={ARRIBA} />
      <Celular clip="panos.mp4" recorte={5.5} velocidad={1.6} alto={900} desde={0} inclinacion={-7} style={{ top: 520, marginLeft: -490 }} />
      <Sequence from={3} layout="none">
        <Celular clip="mazos.mp4" recorte={3.5} velocidad={1.6} alto={900} desde={0} inclinacion={7} style={{ top: 560, marginLeft: -15 }} />
      </Sequence>
    </Pano>
  )
}

function Avatar() {
  return (
    <Pano>
      <Titulo renglones={['Armá', '*tu avatar*']} desde={1} paso={pulso(1)} tam={96} y={ARRIBA} />
      <Celular clip="avatar-peinados.mp4" recorte={2.3} velocidad={1.6} alto={1060} desde={0} inclinacion={2} style={{ top: 455 }} />
    </Pano>
  )
}

/** Amigos (aceptar y unirse a su sala) y el chat del grupo. */
function AmigosYGrupos() {
  return (
    <Pano>
      <TitulosQueCambian antes={['Sumá', '*amigos*']} despues={['Jugá con', '*tu barra*']} cambia={pulso(4)} tam={92} />
      <CelularTramos
        inclinacion={-2}
        style={{ top: 455 }}
        tramos={[
          { clip: 'amigos.mp4', recorte: 5, velocidad: 1.6, pulsos: 4 },
          { clip: 'grupo-chat.mp4', recorte: 4.2, velocidad: 1.6, pulsos: 6 },
        ]}
      />
      <GloboTramo texto="¿Un truquito?" desde={pulso(5)} hasta={pulso(10)} x={330} y={1400} giro={-4} tam={66} />
    </Pano>
  )
}

/** Entrar con Google: la tarjeta de la cuenta con su botón. */
function Google() {
  return (
    <Pano>
      <Titulo renglones={['Entrá con', '*tu cuenta de Google*']} desde={1} paso={pulso(1)} tam={84} y={ARRIBA} />
      <Celular clip="cuenta-google.mp4" recorte={1.9} alto={1060} desde={0} inclinacion={2} style={{ top: 455 }} />
      <Globo texto="¡Tu progreso, en cualquier celular!" desde={pulso(3)} x={540} y={1390} giro={-3} tam={48} />
    </Pano>
  )
}

function Cierre() {
  const arroba = useEntrada(pulso(5))
  const cuadro = useCurrentFrame()
  const brillo = 0.925 + 0.075 * Math.sin(cuadro / 6)
  return (
    <Pano>
      <Logo desde={0} style={{ position: 'absolute', left: 150, top: 230, width: 780 }} />
      <Titulo renglones={['*¡Jugalo gratis!*']} desde={pulso(2.5)} tam={104} y={890} />
      <Bajada desde={pulso(3.5)} y={1030} tam={50}>
        En Android y en la web
      </Bajada>
      <div style={{ position: 'absolute', top: 1140, left: 0, right: 0, display: 'flex', justifyContent: 'center', transform: `scale(${arroba})`, opacity: arroba }}>
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
      <Bajada desde={pulso(6)} y={1280} tam={44}>
        El link está en la bio
      </Bajada>
    </Pano>
  )
}

/** Las escenas, en pulsos de la música; el reel dura 110. */
const ESCENAS: { pulsos: number; Escena: () => ReactNode }[] = [
  { pulsos: 4, Escena: GanchoCompleto },
  { pulsos: 6, Escena: Presentacion },
  { pulsos: 9, Escena: Reparto },
  { pulsos: 10, Escena: Cantos },
  { pulsos: 11, Escena: Online },
  { pulsos: 10, Escena: Aprender },
  { pulsos: 17, Escena: Historia },
  { pulsos: 9, Escena: PanosYMazos },
  { pulsos: 7, Escena: Avatar },
  { pulsos: 10, Escena: AmigosYGrupos },
  { pulsos: 8, Escena: Google },
  { pulsos: 9, Escena: Cierre },
]

/** Dónde empieza cada escena, en pulsos. */
const INICIOS = ESCENAS.reduce<number[]>((acc, _e, i) => [...acc, i === 0 ? 0 : acc[i - 1]! + ESCENAS[i - 1]!.pulsos], [])
const inicio = (Escena: () => ReactNode) => INICIOS[ESCENAS.findIndex((e) => e.Escena === Escena)]!

/** Los ruidos de cartas de la app (Kenney, CC0), en los golpes. */
const EFECTOS: { en: number; sonido: string; volumen?: number }[] = [
  { en: 0, sonido: 'carta-1.ogg' },
  { en: pulso(1), sonido: 'vuelta.ogg' },
  { en: pulso(4) + 5, sonido: 'repartir.ogg' },
  { en: pulso(4) + 30, sonido: 'carta-2.ogg' },
  { en: pulso(inicio(Cantos) + 1.5), sonido: 'carta-1.ogg', volumen: 0.6 },
  { en: pulso(inicio(Cantos) + 4.3), sonido: 'carta-2.ogg', volumen: 0.6 },
  { en: pulso(inicio(Cantos) + 7), sonido: 'carta-1.ogg', volumen: 0.6 },
  { en: pulso(inicio(Aprender) + 5), sonido: 'punto.ogg' },
  { en: pulso(inicio(Historia) + 13.5), sonido: 'carta-2.ogg', volumen: 0.6 },
  { en: pulso(inicio(Cierre)) + 5, sonido: 'repartir.ogg' },
  { en: pulso(inicio(Cierre) + 3), sonido: 'carta-2.ogg' },
]

/** `conMusica` en false deja solo los ruidos de cartas, para ponerle un tema de Instagram encima. */
export function Completo({ conMusica = true }: { conMusica?: boolean }) {
  return (
    <AbsoluteFill style={{ background: COLOR.fondoOscuro }}>
      {ESCENAS.map(({ pulsos, Escena }, i) => {
        const de = pulso(INICIOS[i]!)
        return (
          <Sequence key={i} from={de} durationInFrames={pulso(INICIOS[i]! + pulsos) - de}>
            <Escena />
          </Sequence>
        )
      })}
      {INICIOS.slice(1).map((p) => (
        <Destello key={p} en={pulso(p)} dura={5} fuerza={0.35} />
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
