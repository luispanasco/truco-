import { AbsoluteFill, Html5Audio, Sequence, staticFile } from 'remotion'
import { Cantos, Cierre, Cosmeticos, Gancho, Modos, Presentacion, Reparto, Salas, Senias } from './escenas'
import { Destello } from './piezas'
import { DURACION, pulso } from './ritmo'

/** Las escenas, cada una desde un pulso de la música (ver ritmo.ts); el reel dura 57 pulsos. */
const ESCENAS = [
  { desde: pulso(0), hasta: pulso(4), Escena: Gancho },
  { desde: pulso(4), hasta: pulso(10), Escena: Presentacion },
  { desde: pulso(10), hasta: pulso(16), Escena: Reparto },
  { desde: pulso(16), hasta: pulso(24), Escena: Cantos },
  { desde: pulso(24), hasta: pulso(30), Escena: Senias },
  { desde: pulso(30), hasta: pulso(35), Escena: Modos },
  { desde: pulso(35), hasta: pulso(42), Escena: Salas },
  { desde: pulso(42), hasta: pulso(46), Escena: Cosmeticos },
  { desde: pulso(46), hasta: DURACION, Escena: Cierre },
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
  { en: pulso(31), sonido: 'punto.ogg' },
  { en: pulso(32), sonido: 'punto.ogg' },
  { en: pulso(33), sonido: 'punto.ogg' },
  { en: pulso(46) + 5, sonido: 'repartir.ogg' },
  { en: pulso(49), sonido: 'carta-2.ogg' },
]

/** `conMusica` en false deja solo los ruidos de cartas, para ponerle un tema de Instagram encima. */
export function Reel({ conMusica = true }: { conMusica?: boolean }) {
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
      {conMusica && <Html5Audio src={staticFile('musica.mp3')} volume={0.9} />}
      {EFECTOS.map(({ en, sonido, volumen = 0.8 }, i) => (
        <Sequence key={i} from={en} durationInFrames={45}>
          <Html5Audio src={staticFile(`sfx/${sonido}`)} volume={volumen} />
        </Sequence>
      ))}
    </AbsoluteFill>
  )
}
