import { AbsoluteFill } from 'remotion'
import { COLOR, LETRA_TEXTO, Logo, Pano } from './marca'
import { Celular, Titulo } from './piezas'

/**
 * Las imágenes de la ficha de Google Play: la destacada (1024 × 500) y las capturas (1080 × 1920),
 * con la misma madera y los mismos títulos que el reel. Se sacan como fotos (`remotion still`) en el
 * cuadro 45, cuando ya entró todo.
 */
export const CUADRO_FOTO = 45

export function Destacada() {
  return (
    <Pano>
      <AbsoluteFill style={{ flexDirection: 'row', alignItems: 'center', padding: '0 40px', gap: 10 }}>
        <Logo desde={-120} girar={false} style={{ width: 470, flex: 'none' }} />
        <div style={{ fontFamily: LETRA_TEXTO, color: COLOR.papel, textShadow: '0 4px 14px rgb(0 0 0 / 0.5)' }}>
          <div style={{ fontWeight: 900, fontSize: 52, lineHeight: 1.1 }}>
            Con muestra,
            <br />
            <span style={{ color: COLOR.acento }}>piezas y flor</span>
          </div>
          <div style={{ fontWeight: 800, fontSize: 30, marginTop: 18, opacity: 0.92 }}>Online, contra la compu y en el modo historia</div>
        </div>
      </AbsoluteFill>
    </Pano>
  )
}

/** Cada captura: el título y el celular con el cuadro de un clip en ese segundo. */
export const CAPTURAS: { renglones: string[]; clip: string; segundo: number }[] = [
  { renglones: ['Truco uruguayo', '*con muestra, piezas y flor*'], clip: 'reparto.mp4', segundo: 4.2 },
  { renglones: ['Jugá online', '*con gente de verdad*'], clip: 'online.mp4', segundo: 16 },
  { renglones: ['Modo historia:', '*Rocha, barrio por barrio*'], clip: 'historia-barrios.mp4', segundo: 10.5 },
  { renglones: ['En cada lugar te espera', '*alguien de ahí*'], clip: 'historia-previa.mp4', segundo: 6 },
  { renglones: ['¿No sabés jugar?', '*Don Queiroz te enseña*'], clip: 'aprender-envido.mp4', segundo: 5 },
  { renglones: ['Paños y mazos', '*de cada rincón*'], clip: 'panos.mp4', segundo: 7 },
  { renglones: ['Armá', '*tu avatar*'], clip: 'avatar-peinados.mp4', segundo: 6 },
  { renglones: ['Armá el grupo', '*de la barra*'], clip: 'grupo-chat.mp4', segundo: 10 },
]

export function Captura({ indice }: { indice: number }) {
  const c = CAPTURAS[indice]!
  return (
    <Pano>
      <Titulo renglones={c.renglones} desde={-60} tam={70} y={100} style={{ left: 40, right: 40 }} />
      <Celular clip={c.clip} recorte={c.segundo - CUADRO_FOTO / 30} alto={1460} desde={-60} style={{ top: 410 }} />
    </Pano>
  )
}
