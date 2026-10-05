import { hayVoces, sonarEfecto } from '../sonido'
import { useAjustesSonido } from '../sonido/ajustes'
import { Interruptor } from './Interruptor'
import '../estilos-sonido.css'

/** Ajustes de sonido en el inicio: efectos con su volumen, y la voz de los cantos. */
export function AjustesSonido() {
  const { efectos, volumen, voz, cambiar } = useAjustesSonido()
  const conVoces = hayVoces()
  return (
    <details className="tarjeta ajustes-sonido">
      <summary>
        <span aria-hidden="true">{efectos ? '🔊' : '🔇'}</span> Sonido
      </summary>
      <Interruptor
        activo={efectos}
        alCambiar={(v) => cambiar({ efectos: v })}
        titulo="Efectos de sonido"
        detalle="Repartir, tirar las cartas y anotar los puntos"
      />
      {efectos && (
        <label className="volumen">
          <span>Volumen</span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={Math.round(volumen * 100)}
            onChange={(e) => cambiar({ volumen: Number(e.target.value) / 100 })}
            // Al soltar, un "tic" para escuchar cómo quedó.
            onPointerUp={() => sonarEfecto('punto')}
            onKeyUp={() => sonarEfecto('punto')}
          />
          <output>{Math.round(volumen * 100)} %</output>
        </label>
      )}
      <Interruptor
        activo={conVoces && voz}
        alCambiar={(v) => cambiar({ voz: v })}
        titulo="Voz de los cantos"
        detalle={conVoces ? 'Se escucha el truco, el envido y la flor, además del globo' : 'Pronto'}
        deshabilitado={!conVoces}
      />
    </details>
  )
}

/** Botón de la mesa para callar o volver a prender los efectos. */
export function BotonSonido({ clase = '' }: { clase?: string }) {
  const { efectos, cambiar } = useAjustesSonido()
  return (
    <button
      type="button"
      className={`boton-sonido ${clase}`}
      aria-pressed={!efectos}
      aria-label={efectos ? 'Silenciar los sonidos' : 'Prender los sonidos'}
      title={efectos ? 'Silenciar' : 'Prender el sonido'}
      onClick={() => cambiar({ efectos: !efectos })}
    >
      <span aria-hidden="true">{efectos ? '🔊' : '🔇'}</span>
    </button>
  )
}
