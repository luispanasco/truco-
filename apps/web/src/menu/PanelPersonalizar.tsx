import { useState } from 'react'
import { Avatar } from '../componentes/Avatar'
import { SelectorBaraja } from '../componentes/SelectorBaraja'
import { SelectorMesa } from '../componentes/SelectorMesa'
import { SelectorTipografia } from '../componentes/SelectorTipografia'
import { useCuenta } from '../cuenta/cuenta'
import type { Perfil } from '../perfil'
import { GaleriaPersonajes } from './GaleriaPersonajes'

type Seccion = 'mazo' | 'mesa' | 'letra' | 'personajes'

/**
 * Lo cosmético. Arriba, tu avatar en una fila (se edita en la hoja del perfil, como desde el
 * banner). Abajo, una pestaña por cosa: el mazo (con el visor de sus cartas), el paño de la mesa,
 * la letra y, para el admin, los personajes del modo historia. Se ve una por vez. Lo pago se ve
 * con candado y precio, como en cada selector.
 */
export function PanelPersonalizar({
  perfil,
  cambiar,
  alEditarAvatar,
  alVerCartas,
}: {
  perfil: Perfil
  cambiar: (p: Partial<Perfil>) => void
  alEditarAvatar: () => void
  alVerCartas: () => void
}) {
  const admin = useCuenta((s) => s.estado === 'adentro' && s.cuenta?.admin === true)
  const [seccion, setSeccion] = useState<Seccion>('mazo')
  const secciones: [Seccion, string][] = [
    ['mazo', 'Mazo'],
    ['mesa', 'Paño'],
    ['letra', 'Letra'],
    ...(admin ? ([['personajes', 'Personajes']] as [Seccion, string][]) : []),
  ]
  const ver = secciones.some(([s]) => s === seccion) ? seccion : 'mazo'
  return (
    <>
      <section className="tarjeta personalizar-avatar" aria-labelledby="personalizar-avatar">
        <span className="personalizar-avatar-img">
          <Avatar codigo={perfil.avatar} apodo={perfil.apodo} />
        </span>
        <div className="personalizar-avatar-texto">
          <h2 id="personalizar-avatar">Tu avatar</h2>
          <strong>{perfil.apodo || 'Sin apodo'}</strong>
        </div>
        <button type="button" className="boton" aria-haspopup="dialog" aria-label="Cambiar avatar y apodo" onClick={alEditarAvatar}>
          Editar
        </button>
      </section>

      <div className="personalizar-pestanias" role="tablist" aria-label="Qué personalizar">
        {secciones.map(([s, texto]) => (
          <button
            key={s}
            type="button"
            role="tab"
            id={`personalizar-pestania-${s}`}
            aria-selected={ver === s}
            aria-controls={`personalizar-${s}`}
            className={ver === s ? 'elegida' : ''}
            onClick={() => setSeccion(s)}
          >
            {texto}
          </button>
        ))}
      </div>

      {ver === 'mazo' && (
        <section className="tarjeta personalizar-seccion" id="personalizar-mazo" role="tabpanel" aria-labelledby="personalizar-pestania-mazo">
          <SelectorBaraja baraja={perfil.baraja} alElegir={(b) => cambiar({ baraja: b })}>
            <button type="button" className="boton boton-secundario baraja-ver-cartas" aria-haspopup="dialog" onClick={alVerCartas}>
              Ver las cartas
            </button>
          </SelectorBaraja>
        </section>
      )}

      {ver === 'mesa' && (
        <section className="tarjeta personalizar-seccion" id="personalizar-mesa" role="tabpanel" aria-labelledby="personalizar-pestania-mesa">
          <SelectorMesa valor={perfil.mesa} alCambiar={(mesa) => cambiar({ mesa })} tiendaDesbloqueada={perfil.tiendaDesbloqueada} />
        </section>
      )}

      {ver === 'letra' && (
        <section className="tarjeta personalizar-seccion" id="personalizar-letra" role="tabpanel" aria-labelledby="personalizar-pestania-letra">
          <SelectorTipografia
            valor={perfil.tipografia}
            alCambiar={(tipografia) => cambiar({ tipografia })}
            tiendaDesbloqueada={perfil.tiendaDesbloqueada}
          />
        </section>
      )}

      {ver === 'personajes' && (
        <div id="personalizar-personajes" role="tabpanel" aria-labelledby="personalizar-pestania-personajes">
          <GaleriaPersonajes perfil={perfil} cambiar={cambiar} />
        </div>
      )}
    </>
  )
}
