import { SENIAS, type Senia } from '@truco/bots'
import { GESTO, SIGNIFICADO } from '../senias'
import { Hoja } from './Hoja'

/** Abre el panel de señas. Solo aparece cuando hay compañeros en el duelo. */
export function BotonSenias({ alTocar }: { alTocar: () => void }) {
  return (
    <button type="button" className="boton-senias" onClick={alTocar} aria-label="Hacer una seña">
      <span aria-hidden="true">😉</span>
      <span className="boton-senias-texto">Seña</span>
    </button>
  )
}

/** Las 11 señas: el gesto y qué carta anuncia. Tocar una se la hace a los compañeros. */
export function PanelSenias({ alElegir, alCerrar }: { alElegir: (s: Senia) => void; alCerrar: () => void }) {
  return (
    <Hoja titulo="Señas" alCerrar={alCerrar} clase="hoja-senias">
      <p className="senias-nota">Tus compañeros la ven; los rivales, no.</p>
      <ul className="senias-lista">
        {SENIAS.map((s) => (
          <li key={s}>
            <button type="button" className="senia-opcion" onClick={() => alElegir(s)}>
              <span className="senia-gesto">{GESTO[s]}</span>
              <span className="senia-flecha" aria-hidden="true">
                →
              </span>
              <span className="senia-significado">{SIGNIFICADO[s]}</span>
            </button>
          </li>
        ))}
      </ul>
    </Hoja>
  )
}
