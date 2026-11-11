import { PESCAR_SENIAS_DISPONIBLE } from '@truco/shared'
import { AjustesSonido } from '../componentes/AjustesSonido'
import { SelectorCartasJugadas } from '../componentes/FormularioSala'
import { Interruptor } from '../componentes/Interruptor'
import { InstalarApp } from '../componentes/Pwa'
import { SelectorVistaMesa } from '../componentes/SelectorVistaMesa'
import { TarjetaCuenta } from '../componentes/TarjetaCuenta'
import { cosmeticosPermitidos, type Perfil } from '../perfil'
import { VerRecorrido } from '../recorrido/VerRecorrido'

/**
 * Lo que abre el engranaje del banner, solo lo del juego: el sonido, cómo se ve la partida
 * (vista, cartas jugadas, ojear), las ayudas, las señas y la tienda de prueba. Lo cosmético (avatar,
 * mazo, paño y letra) está en la pantalla Avatar. Las reglas de la partida contra
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
          <span aria-hidden="true">🃏</span> La partida
        </h2>
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
            {PESCAR_SENIAS_DISPONIBLE && (
              <Interruptor
                activo={perfil.pescarSenias}
                alCambiar={(v) => cambiar({ pescarSenias: v })}
                titulo="Pescar señas"
                detalle="A veces se ve que un rival le hace una seña a su compañero (y a vos también te pueden ver)"
              />
            )}
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
            <Interruptor
              activo={perfil.resumenSoloSenia}
              alCambiar={(v) => cambiar({ resumenSoloSenia: v })}
              titulo="Solo la seña del compañero"
              detalle="El resumen y el panel de tu compañero muestran el gesto que te hizo, sin traducirlo a cartas ni al envido: lo descifrás vos"
            />
          </>
        )}
      </section>

      {/* Solo para desarrollar: en la app publicada, lo pago lo usan los beta testers (su cuenta). */}
      {import.meta.env.DEV && (
        <section className="tarjeta" aria-labelledby="ajustes-pruebas">
          <h2 id="ajustes-pruebas">
            <span aria-hidden="true">🧪</span> Pruebas
          </h2>
          <Interruptor
            activo={perfil.tiendaDesbloqueada}
            alCambiar={cambiarTienda}
            titulo="Desbloquear la tienda (prueba)"
            detalle="Elegís cualquier pieza del avatar, mesa o tipografía sin monedas. Al apagarlo, vuelve lo gratis"
          />
        </section>
      )}

      {/* Al final, como en cualquier app: entrar o salir de la cuenta. */}
      <TarjetaCuenta sinEnlaces />
      <VerRecorrido />
      <InstalarApp />
      <p className="inicio-pie">
        Truco uruguayo · versión beta · <a href="/privacidad.html">Privacidad</a>
      </p>
    </div>
  )
}
