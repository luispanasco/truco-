import { AjustesSonido } from '../componentes/AjustesSonido'
import { SelectorCartasJugadas } from '../componentes/FormularioSala'
import { Interruptor } from '../componentes/Interruptor'
import { InstalarApp } from '../componentes/Pwa'
import { SelectorBaraja } from '../componentes/SelectorBaraja'
import { SelectorMesa } from '../componentes/SelectorMesa'
import { SelectorTipografia } from '../componentes/SelectorTipografia'
import { SelectorVistaMesa } from '../componentes/SelectorVistaMesa'
import { TarjetaCuenta } from '../componentes/TarjetaCuenta'
import { cosmeticosPermitidos, type Perfil } from '../perfil'

/**
 * Lo que abre el engranaje del banner: el sonido, cómo se ve la mesa (mesa, letra,
 * baraja, vista), las señas, las ayudas y la tienda de prueba. Las reglas de la partida contra
 * la compu quedan al lado del botón de jugar, en el lobby. Al final, tu cuenta.
 */
export function Ajustes({ perfil, cambiar }: { perfil: Perfil; cambiar: (p: Partial<Perfil>) => void }) {
  /** Prendida, todo lo pago se elige; apagada, lo pago que tuvieras vuelve a lo gratis. */
  const cambiarTienda = (tiendaDesbloqueada: boolean) =>
    cambiar({ tiendaDesbloqueada, ...cosmeticosPermitidos({ ...perfil, tiendaDesbloqueada }) })

  return (
    <div className="ajustes">
      <AjustesSonido />

      <section className="tarjeta" aria-labelledby="ajustes-mesa">
        <h2 id="ajustes-mesa">
          <span aria-hidden="true">🃏</span> La mesa y las cartas
        </h2>
        <SelectorMesa valor={perfil.mesa} alCambiar={(mesa) => cambiar({ mesa })} tiendaDesbloqueada={perfil.tiendaDesbloqueada} />
        <SelectorTipografia
          valor={perfil.tipografia}
          alCambiar={(tipografia) => cambiar({ tipografia })}
          tiendaDesbloqueada={perfil.tiendaDesbloqueada}
        />
        <SelectorBaraja baraja={perfil.baraja} alElegir={(b) => cambiar({ baraja: b })} />
        <SelectorVistaMesa valor={perfil.vistaMesa} alCambiar={(vistaMesa) => cambiar({ vistaMesa })} />
        <SelectorCartasJugadas valor={perfil.cartasJugadas} alCambiar={(cartasJugadas) => cambiar({ cartasJugadas })} />
        <Interruptor
          activo={perfil.ojear}
          alCambiar={(v) => cambiar({ ojear: v })}
          titulo="Ojear cartas"
          detalle="Al repartir, descubrís tus cartas de a poco, como en la mesa (también online)"
        />
        <Interruptor
          activo={perfil.ayudas}
          alCambiar={(v) => cambiar({ ayudas: v })}
          titulo="Ayudas"
          detalle="Marca piezas y matas, y muestra tu envido y tu flor"
        />
      </section>

      <section className="tarjeta" aria-labelledby="ajustes-senias">
        <h2 id="ajustes-senias">
          <span aria-hidden="true">😉</span> Señas
        </h2>
        <Interruptor
          activo={perfil.seniasHabilitadas}
          alCambiar={(v) => cambiar({ seniasHabilitadas: v })}
          titulo="Se juega con señas"
          detalle="En parejas y tríos, con tu compañero (y los bots también se hacen)"
        />
        {perfil.seniasHabilitadas && (
          <>
            <Interruptor
              activo={perfil.pescarSenias}
              alCambiar={(v) => cambiar({ pescarSenias: v })}
              titulo="Pescar señas"
              detalle="A veces se ve que un rival le hace una seña a su compañero (y a vos también te pueden ver)"
            />
            <Interruptor
              activo={perfil.seniasAntesDeJugar}
              alCambiar={(v) => cambiar({ seniasAntesDeJugar: v })}
              titulo="Señas antes de jugar"
              detalle="Las señas se hacen solo hasta tirar tu primera carta de la mano"
            />
            <Interruptor
              activo={perfil.resumenSenias}
              alCambiar={(v) => cambiar({ resumenSenias: v })}
              titulo="Resumen de señas sobre los compañeros"
              detalle="Un cartelito arriba de cada compañero con lo que te marcó en la mano (también online). Solo lo ves vos"
            />
          </>
        )}
      </section>

      <section className="tarjeta" aria-labelledby="ajustes-pruebas">
        <h2 id="ajustes-pruebas">
          <span aria-hidden="true">🧪</span> Pruebas
        </h2>
        <Interruptor
          activo={perfil.tiendaDesbloqueada}
          alCambiar={cambiarTienda}
          titulo="Desbloquear la tienda (prueba)"
          detalle="Mientras no hay tienda: elegís cualquier pieza del avatar, mesa o tipografía sin monedas. Al apagarlo, vuelve lo gratis"
        />
      </section>

      {/* Al final, como en cualquier app: entrar o salir de la cuenta. */}
      <TarjetaCuenta sinEnlaces />
      <InstalarApp />
      <p className="inicio-pie">Truco uruguayo · versión de prueba</p>
    </div>
  )
}
