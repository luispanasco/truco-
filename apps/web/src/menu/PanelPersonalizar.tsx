import { Avatar } from '../componentes/Avatar'
import { SelectorBaraja } from '../componentes/SelectorBaraja'
import { SelectorMesa } from '../componentes/SelectorMesa'
import { SelectorTipografia } from '../componentes/SelectorTipografia'
import type { Perfil } from '../perfil'

/**
 * Lo cosmético, todo junto: tu avatar (se edita en la hoja del perfil, como desde el banner),
 * el mazo (con el visor de sus cartas), el paño de la mesa y la letra. Lo pago se ve con candado
 * y precio, como en cada selector.
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
  return (
    <>
      <section className="tarjeta personalizar-avatar" aria-labelledby="personalizar-avatar">
        <h2 id="personalizar-avatar">Tu avatar</h2>
        <div className="personalizar-avatar-fila">
          <span className="personalizar-avatar-img">
            <Avatar codigo={perfil.avatar} apodo={perfil.apodo} />
          </span>
          <button type="button" className="boton" aria-haspopup="dialog" onClick={alEditarAvatar}>
            Cambiar avatar y apodo
          </button>
        </div>
      </section>

      <section className="tarjeta" aria-labelledby="personalizar-mazo">
        <h2 id="personalizar-mazo">El mazo</h2>
        <SelectorBaraja baraja={perfil.baraja} alElegir={(b) => cambiar({ baraja: b })} />
        <button type="button" className="boton boton-secundario" aria-haspopup="dialog" onClick={alVerCartas}>
          Ver las cartas
        </button>
      </section>

      <section className="tarjeta" aria-labelledby="personalizar-mesa">
        <h2 id="personalizar-mesa">El paño</h2>
        <SelectorMesa valor={perfil.mesa} alCambiar={(mesa) => cambiar({ mesa })} tiendaDesbloqueada={perfil.tiendaDesbloqueada} />
        <SelectorTipografia
          valor={perfil.tipografia}
          alCambiar={(tipografia) => cambiar({ tipografia })}
          tiendaDesbloqueada={perfil.tiendaDesbloqueada}
        />
      </section>
    </>
  )
}
