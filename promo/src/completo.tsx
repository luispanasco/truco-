import type { ReactNode } from 'react'
import { AbsoluteFill, Html5Audio, Sequence, staticFile, useCurrentFrame } from 'remotion'
import { CLIPS, Gancho } from './escenas'
import { ARRIBA, CelularTramos, GloboTramo, TitulosQueCambian } from './lanzamiento'
import { COLOR, Degrades, LETRA_TEXTO, LETRA_TITULO, Logo, Pano, Sol } from './marca'
import { Bajada, Celular, Destello, Globo, Pastilla, Titulo, useEntrada } from './piezas'
import { pulso } from './ritmo'

/**
 * El reel con todo (2026-11-13): el truco uruguayo bien marcado (muestra, piezas, flor, señas,
 * baraja española), la partida, el tutorial, el modo historia por barrios de Rocha, los paños de
 * cada barrio y los mazos, el avatar, la tienda, amigos y grupos, los modos y el cierre. Sobre
 * madera de boliche, no sobre paño verde. Misma música que el del lanzamiento (58 s).
 */
export const DURACION_COMPLETO = pulso(110) // ≈ 57,9 s

/** La bandera, con sus nueve franjas y el sol en el cantón, en un lienzo de 270 × 180. */
function Bandera({ ondea = 0 }: { ondea?: number }) {
  const franja = 180 / 9
  return (
    <svg viewBox="0 0 270 180" style={{ width: '100%', overflow: 'visible', filter: 'drop-shadow(0 18px 24px rgb(0 0 0 / 0.45))' }}>
      <Degrades />
      <g transform={`skewY(${Math.sin(ondea) * 2})`}>
        <rect width="270" height="180" fill="#fff" />
        {[1, 3, 5, 7].map((i) => (
          <rect key={i} y={i * franja} width="270" height={franja} fill="#0038a8" />
        ))}
        <rect width="100" height="100" fill="#fff" />
        <g transform="translate(50 50)">
          <Sol escala={0.19} giro={ondea * 8} />
        </g>
      </g>
    </svg>
  )
}

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

/** Lo que lo hace uruguayo, una pastilla por pulso. */
function DeAca() {
  const cuadro = useCurrentFrame()
  const cosas = ['Muestra', 'Piezas', 'Flor', 'Señas']
  return (
    <Pano>
      <Titulo renglones={['El truco', '*de acá*']} desde={1} paso={pulso(0.5)} tam={110} y={ARRIBA} />
      <div style={{ position: 'absolute', top: 560, left: 0, right: 0, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '48px 40px', padding: '0 90px' }}>
        {cosas.map((c, i) => (
          <Pastilla key={c} desde={pulso(1.5 + i * 0.75)} style={{ fontSize: 76, padding: '14px 42px', rotate: `${[-4, 3, 2, -3][i]}deg`, translate: `0 ${Math.sin((cuadro + i * 17) / 13) * 6}px` }}>
            {c}
          </Pastilla>
        ))}
      </div>
      <Bajada desde={pulso(4.5)} y={1040} tam={50}>
        Con baraja española de 40 cartas
      </Bajada>
      <Bajada desde={pulso(5.25)} y={1110} tam={44}>
        Como se juega de este lado del río
      </Bajada>
    </Pano>
  )
}

/** El reparto: la muestra y una pieza en la mano. */
function Reparto() {
  return (
    <Pano>
      <Titulo renglones={['La muestra', '*manda*']} desde={1} paso={pulso(1)} tam={96} y={ARRIBA} />
      <Celular {...CLIPS.reparto} alto={1060} desde={0} inclinacion={-2} style={{ top: 455 }} />
      <Globo texto="¡Tengo pieza!" desde={pulso(4)} x={560} y={1360} giro={-4} tam={66} />
    </Pano>
  )
}

function Cantos() {
  return (
    <Pano>
      <Titulo renglones={['Cantá como', '*en el boliche*']} desde={1} paso={pulso(1)} tam={92} y={ARRIBA} />
      <Celular {...CLIPS.cantos} alto={1060} desde={0} inclinacion={2} style={{ top: 455 }} />
      <Globo texto="¡Truco!" desde={pulso(1)} x={290} y={1340} giro={-6} />
      <Globo texto="¡Quiero retruco!" desde={pulso(3)} x={700} y={740} giro={5} tam={70} colita="derecha" />
      <Globo texto="¡Vale cuatro!" desde={pulso(5)} x={560} y={1040} giro={-3} tam={72} />
    </Pano>
  )
}

/** Don Queiroz enseña: la ruta, cargar el envido y el diploma. */
function Aprender() {
  return (
    <Pano>
      <TitulosQueCambian antes={['¿No sabés jugar?']} despues={['Don Queiroz', '*te enseña*']} cambia={pulso(2.5)} tam={92} />
      <CelularTramos
        inclinacion={-2}
        style={{ top: 455 }}
        tramos={[
          { clip: 'aprender-ruta.mp4', recorte: 1.2, velocidad: 2, pulsos: 3 },
          { clip: 'aprender-envido.mp4', recorte: 3.4, velocidad: 1.4, pulsos: 3 },
          { clip: 'aprender-diploma.mp4', recorte: 1.3, velocidad: 1.2, pulsos: 2 },
        ]}
      />
      <GloboTramo texto="¡Te recibís!" desde={pulso(6.3)} hasta={pulso(8)} x={540} y={1390} giro={3} tam={70} />
    </Pano>
  )
}

/** El modo historia por barrios: Rocha, el mapa de La Paloma, la previa y la mesa del barrio. */
function Historia() {
  return (
    <Pano>
      <TitulosQueCambian antes={['Recorré', '*Uruguay*']} despues={['Rocha,', '*barrio por barrio*']} cambia={pulso(3)} tam={88} />
      <CelularTramos
        inclinacion={2}
        style={{ top: 455 }}
        tramos={[
          // El mapa de Uruguay y tocar Rocha.
          { clip: 'historia-barrios.mp4', recorte: 2.6, velocidad: 1.6, pulsos: 3 },
          // Los barrios de Rocha, en redondeles con las fotos que pasan.
          { clip: 'historia-barrios.mp4', recorte: 8.8, velocidad: 1.3, pulsos: 4 },
          // El mapa de Cabo Polonio: la flecha al nivel 1, volar hasta él y tocar el nivel 3.
          { clip: 'historia-mapa-barrio.mp4', recorte: 4.6, velocidad: 2.4, pulsos: 4 },
          // La previa: Celeste la Farera habla.
          { clip: 'historia-previa.mp4', recorte: 3.5, velocidad: 1.8, pulsos: 4 },
          // La mesa del Cabo (el faro y los lobos): envido, quiero, 31 y ¡Truco!
          { clip: 'historia-previa.mp4', recorte: 14.8, velocidad: 2.4, pulsos: 5 },
        ]}
      />
      <GloboTramo texto="32 lugares de verdad" desde={pulso(3.5)} hasta={pulso(7)} x={540} y={1400} giro={-3} tam={58} />
      <GloboTramo texto="Cabo Polonio" desde={pulso(7.5)} hasta={pulso(11)} x={360} y={1400} giro={-5} tam={66} />
      <GloboTramo texto="¡Cada barrio, su mesa!" desde={pulso(15.5)} hasta={pulso(20)} x={540} y={1400} giro={3} tam={58} />
    </Pano>
  )
}

/** Los paños de los barrios y los mazos, de a dos celulares. */
function PanosYMazos() {
  return (
    <Pano>
      <Titulo renglones={['Paños de cada barrio,', '*mazos de cada rincón*']} desde={0} paso={pulso(1) / 2} tam={74} y={ARRIBA} />
      <Celular clip="panos.mp4" recorte={5.5} velocidad={3} alto={900} desde={0} inclinacion={-7} style={{ top: 520, marginLeft: -490 }} />
      <Sequence from={3} layout="none">
        <Celular clip="mazos.mp4" recorte={3.5} velocidad={3} alto={900} desde={0} inclinacion={7} style={{ top: 560, marginLeft: -15 }} />
      </Sequence>
    </Pano>
  )
}

function Avatar() {
  return (
    <Pano>
      <Titulo renglones={['Armá tu avatar', '*a tu manera*']} desde={1} paso={pulso(1)} tam={92} y={ARRIBA} />
      <Celular clip="avatar-peinados.mp4" recorte={2.3} velocidad={3} alto={1060} desde={0} inclinacion={-2} style={{ top: 455 }} />
    </Pano>
  )
}

function Tienda() {
  return (
    <Pano>
      <Titulo renglones={['Juntá monedas', '*y lucite*']} desde={1} paso={pulso(1)} tam={92} y={ARRIBA} />
      <Celular clip="tienda.mp4" recorte={0.6} velocidad={1.9} alto={1060} desde={0} inclinacion={2} style={{ top: 455 }} />
    </Pano>
  )
}

/** Amigos, y el chat del grupo. */
function AmigosYGrupos() {
  return (
    <Pano>
      <TitulosQueCambian antes={['Sumá', '*amigos*']} despues={['Chateá con', '*tu barra*']} cambia={pulso(3)} tam={92} />
      <CelularTramos
        inclinacion={-2}
        style={{ top: 455 }}
        tramos={[
          // Aceptar a Lucía, unirse a la sala de Beto e invitar a Marta.
          { clip: 'amigos.mp4', recorte: 5, velocidad: 3, pulsos: 3 },
          // El chat de "Los del Boliche": "¿Un truquito a la noche?", "¡De una!" y el mate.
          { clip: 'grupo-chat.mp4', recorte: 3.8, velocidad: 3, pulsos: 6 },
        ]}
      />
    </Pano>
  )
}

function Modos() {
  const cuadro = useCurrentFrame()
  return (
    <Pano>
      <Titulo renglones={['Online o', '*contra la compu*']} desde={1} paso={pulso(1)} tam={92} y={ARRIBA} />
      <Celular clip="modos.mp4" recorte={0.5} velocidad={1.8} alto={1000} desde={0} inclinacion={-4} style={{ top: 470, marginLeft: -400 }} />
      <div style={{ position: 'absolute', top: 640, left: 640, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 60 }}>
        {['1 vs 1', '2 vs 2', '3 vs 3'].map((m, i) => (
          <Pastilla key={m} desde={pulso(1.5 + i)} style={{ fontSize: 66, padding: '14px 36px', rotate: `${[-4, 3, -2][i]}deg`, translate: `${Math.sin((cuadro + i * 20) / 14) * 6}px 0` }}>
            {m}
          </Pastilla>
        ))}
      </div>
    </Pano>
  )
}

function Senias() {
  return (
    <Pano>
      <Titulo renglones={['Con las señas', '*de siempre*']} desde={1} paso={pulso(1)} tam={92} y={ARRIBA} />
      <Celular {...CLIPS.senias} alto={1060} desde={0} inclinacion={-2} zoom={{ escala: 2, origen: '50% 12%', desde: 10, hasta: 200 }} style={{ top: 455 }} />
      <Globo texto="¡El 4 de la muestra!" desde={pulso(1.5)} x={540} y={1330} giro={-4} tam={64} />
    </Pano>
  )
}

/** La bandera que entra flameando: hecho acá, para los de acá. */
function HechoAca() {
  const cuadro = useCurrentFrame()
  const e = useEntrada(0, { damping: 12, stiffness: 140 })
  return (
    <Pano>
      <div style={{ position: 'absolute', top: 420, left: 240, width: 600, transform: `scale(${e}) rotate(${(1 - e) * -14 - 3}deg)`, opacity: Math.min(1, e * 2) }}>
        <Bandera ondea={cuadro / 9} />
      </div>
      <Titulo renglones={['Hecho en Uruguay', '*para los de acá*']} desde={pulso(1)} paso={pulso(1)} tam={88} y={890} />
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

/** Las escenas, cada una desde un pulso de la música; el reel dura 110 pulsos. */
const ESCENAS: { desde: number; hasta: number; Escena: () => ReactNode }[] = [
  { desde: pulso(0), hasta: pulso(4), Escena: GanchoCompleto },
  { desde: pulso(4), hasta: pulso(9), Escena: Presentacion },
  { desde: pulso(9), hasta: pulso(15), Escena: DeAca },
  { desde: pulso(15), hasta: pulso(21), Escena: Reparto },
  { desde: pulso(21), hasta: pulso(27), Escena: Cantos },
  { desde: pulso(27), hasta: pulso(35), Escena: Aprender },
  { desde: pulso(35), hasta: pulso(55), Escena: Historia },
  { desde: pulso(55), hasta: pulso(63), Escena: PanosYMazos },
  { desde: pulso(63), hasta: pulso(69), Escena: Avatar },
  { desde: pulso(69), hasta: pulso(74), Escena: Tienda },
  { desde: pulso(74), hasta: pulso(83), Escena: AmigosYGrupos },
  { desde: pulso(83), hasta: pulso(89), Escena: Modos },
  { desde: pulso(89), hasta: pulso(94), Escena: Senias },
  { desde: pulso(94), hasta: pulso(99), Escena: HechoAca },
  { desde: pulso(99), hasta: DURACION_COMPLETO, Escena: Cierre },
]

/** Los ruidos de cartas de la app (Kenney, CC0), en los golpes. */
const EFECTOS: { en: number; sonido: string; volumen?: number }[] = [
  { en: 0, sonido: 'carta-1.ogg' },
  { en: pulso(1), sonido: 'vuelta.ogg' },
  { en: pulso(4) + 5, sonido: 'repartir.ogg' },
  { en: pulso(4) + 30, sonido: 'carta-2.ogg' },
  { en: pulso(9 + 1.5), sonido: 'punto.ogg', volumen: 0.6 },
  { en: pulso(9 + 2.25), sonido: 'punto.ogg', volumen: 0.6 },
  { en: pulso(9 + 3), sonido: 'punto.ogg', volumen: 0.6 },
  { en: pulso(9 + 3.75), sonido: 'punto.ogg', volumen: 0.6 },
  { en: pulso(22), sonido: 'carta-1.ogg', volumen: 0.6 },
  { en: pulso(24), sonido: 'carta-2.ogg', volumen: 0.6 },
  { en: pulso(27 + 6.3), sonido: 'punto.ogg' },
  { en: pulso(35 + 15.5), sonido: 'carta-2.ogg', volumen: 0.6 },
  { en: pulso(83 + 1.5), sonido: 'punto.ogg' },
  { en: pulso(83 + 2.5), sonido: 'punto.ogg' },
  { en: pulso(83 + 3.5), sonido: 'punto.ogg' },
  { en: pulso(99) + 5, sonido: 'repartir.ogg' },
  { en: pulso(102), sonido: 'carta-2.ogg' },
]

/** `conMusica` en false deja solo los ruidos de cartas, para ponerle un tema de Instagram encima. */
export function Completo({ conMusica = true }: { conMusica?: boolean }) {
  return (
    <AbsoluteFill style={{ background: COLOR.fondoOscuro }}>
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
