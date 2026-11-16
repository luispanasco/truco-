import { Composition } from 'remotion'
import { Captura, Destacada } from './tienda'
import { Completo, DURACION_COMPLETO } from './completo'
import { DURACION_LANZAMIENTO, Lanzamiento } from './lanzamiento'
import { Reel } from './Reel'
import { DURACION, FPS } from './ritmo'

export function Raiz() {
  return (
    <>
      <Composition id="Reel" component={Reel} durationInFrames={DURACION} fps={FPS} width={1080} height={1920} defaultProps={{ conMusica: true }} />
      <Composition id="ReelSinMusica" component={Reel} durationInFrames={DURACION} fps={FPS} width={1080} height={1920} defaultProps={{ conMusica: false }} />
      <Composition id="Lanzamiento" component={Lanzamiento} durationInFrames={DURACION_LANZAMIENTO} fps={FPS} width={1080} height={1920} defaultProps={{ conMusica: true }} />
      <Composition id="LanzamientoSinMusica" component={Lanzamiento} durationInFrames={DURACION_LANZAMIENTO} fps={FPS} width={1080} height={1920} defaultProps={{ conMusica: false }} />
      <Composition id="Completo" component={Completo} durationInFrames={DURACION_COMPLETO} fps={FPS} width={1080} height={1920} defaultProps={{ conMusica: true }} />
      <Composition id="CompletoSinMusica" component={Completo} durationInFrames={DURACION_COMPLETO} fps={FPS} width={1080} height={1920} defaultProps={{ conMusica: false }} />
      <Composition id="Destacada" component={Destacada} durationInFrames={60} fps={FPS} width={1024} height={500} />
      <Composition id="Captura" component={Captura} durationInFrames={60} fps={FPS} width={1080} height={1920} defaultProps={{ indice: 0 }} />
    </>
  )
}
