import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { BorrarCuenta } from '../componentes/BorrarCuenta'
import { CabeceraOnline } from '../componentes/Online'
import { TarjetaCuenta } from '../componentes/TarjetaCuenta'
import { iniciarCuenta, useCuenta } from '../cuenta/cuenta'

/**
 * /borrar-cuenta: la página que se pone en Google Play para pedir que se borre la cuenta. Dice qué
 * se borra; si no entraste, primero entrás (con Google o con tu email) y después la borrás.
 */
export function BorrarCuentaPagina() {
  const navegar = useNavigate()
  const { estado, cuenta } = useCuenta()
  const [borrada, setBorrada] = useState(false)
  useEffect(() => void iniciarCuenta(), [])

  return (
    <div className="pantalla-inicio pantalla-online">
      <CabeceraOnline titulo="Borrar tu cuenta" alVolver={() => navegar('/')} />
      <section className="tarjeta">
        <h2>Qué se borra</h2>
        <p className="nota-izq">
          Al borrar tu cuenta de Truco Uruguayo se borran para siempre: tu email y tu apodo, tus monedas y lo que compraste, tu Elo y las
          partidas anotadas, tus amigos, tu progreso del modo historia, y tus mensajes en el chat de los grupos. Si sos líder de un grupo,
          el liderazgo pasa a otro miembro; si estabas solo, el grupo se borra.
        </p>
        <p className="nota-izq">
          Lo que hayas escrito en el muro de un grupo y los reportes de problemas que mandaste quedan, pero sin tu cuenta. Lo que la app
          guarda en este navegador (tu apodo y tu avatar de invitado) se borra limpiando los datos del sitio o desinstalando la app.
        </p>
      </section>
      {borrada ? (
        <section className="tarjeta" role="status">
          <h2>Listo</h2>
          <p className="nota-izq">Tu cuenta y sus datos se borraron.</p>
        </section>
      ) : estado === 'adentro' && cuenta ? (
        <section className="tarjeta">
          <h2>Tu cuenta</h2>
          <p className="cuenta-quien">
            Entraste como <strong>{cuenta.email ?? cuenta.apodo}</strong>.
          </p>
          <BorrarCuenta alBorrar={() => setBorrada(true)} />
        </section>
      ) : (
        <>
          <p className="nota">Para borrarla, primero entrá a la cuenta que querés borrar.</p>
          <TarjetaCuenta sinEnlaces />
        </>
      )}
    </div>
  )
}
