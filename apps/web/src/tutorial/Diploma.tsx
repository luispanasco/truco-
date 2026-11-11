import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { AVATAR_BASE, buscarItem, codificarAvatar, leerAvatar, MONEDAS_DIPLOMA, PREMIO_DIPLOMA } from '@truco/shared'
import { Avatar } from '../componentes/Avatar'
import { useCuenta } from '../cuenta/cuenta'
import { Maestro } from '../pantallas/Aprender'
import { leerPerfil } from '../perfil'
import { cobrarDiploma } from './cobroDiploma'
import { useTutorial } from './progreso'
import '../estilos-historia.css'
import '../estilos-tutorial.css'

type Cobro = { estado: 'cobrando' } | { estado: 'listo' } | { estado: 'error'; motivo: string }

/** Tu avatar con los Naipes en la mano: así se ve el premio. */
function avatarConNaipes(codigo: string): string {
  const a = leerAvatar(codigo) ?? { ...AVATAR_BASE }
  return codificarAvatar({ ...a, accesorio: buscarItem(PREMIO_DIPLOMA)?.pieza ?? a.accesorio })
}

/**
 * Te recibiste: Don Queiroz te da el diploma y el premio (monedas y los Naipes). Con cuenta se cobra
 * ahí mismo; sin cuenta, queda guardado en el dispositivo y se cobra al entrar (cobroDiploma.ts).
 */
export function Diploma() {
  const navegar = useNavigate()
  const recibido = useTutorial((s) => s.progreso.examen !== undefined)
  const adentro = useCuenta((s) => s.estado === 'adentro')
  const [cobro, setCobro] = useState<Cobro>({ estado: 'cobrando' })
  const perfil = leerPerfil()

  useEffect(() => {
    if (!recibido || !adentro) return
    let vigente = true
    setCobro({ estado: 'cobrando' })
    cobrarDiploma().then(
      () => vigente && setCobro({ estado: 'listo' }),
      (e: unknown) => vigente && setCobro({ estado: 'error', motivo: e instanceof Error ? e.message : 'No se pudo cobrar' }),
    )
    return () => {
      vigente = false
    }
  }, [recibido, adentro])

  if (!recibido) {
    return (
      <main className="historia tutorial">
        <h1>Todavía no te recibiste</h1>
        <Maestro texto="Primero el examen, gurí. Ganá una partida y te doy el diploma." clave="sin" />
        <button type="button" className="boton" onClick={() => navegar('/aprender')}>
          Ir a las lecciones
        </button>
      </main>
    )
  }

  const naipes = buscarItem(PREMIO_DIPLOMA)?.nombre ?? 'Naipes'
  return (
    <main className="historia tutorial tutorial-graduacion">
      <button type="button" className="historia-volver" onClick={() => navegar('/aprender')}>
        <span aria-hidden="true">‹</span> Lecciones
      </button>
      <Maestro texto="¡Felicitaciones! Ya sabés jugar al truco. Ahora andá a la mesa y que no te agarren de punto." clave="diploma" />
      <section className="diploma" aria-label="Diploma">
        <small className="diploma-boliche">Boliche de Don Queiroz</small>
        <h1>Diploma</h1>
        <p>Se deja constancia de que</p>
        <strong className="diploma-nombre">{perfil.apodo.trim() || 'este gurí'}</strong>
        <p>aprendió a jugar al truco uruguayo, con muestra, piezas y flor.</p>
        <p className="diploma-titulo">Te recibiste de truquero</p>
        <div className="diploma-firma">
          <span>Queiroz</span>
          <small>Don Queiroz, el Maestro</small>
        </div>
        <span className="diploma-sello" aria-hidden="true">
          🎓
        </span>
      </section>
      <section className="diploma-premio" aria-label="Tu premio">
        <span className="diploma-premio-avatar" aria-hidden="true">
          <Avatar codigo={avatarConNaipes(perfil.avatar)} encuadre="busto" />
        </span>
        <div>
          <h2>Tu premio</h2>
          <ul>
            <li>🪙 {MONEDAS_DIPLOMA} monedas</li>
            <li>🃏 {naipes} para tu avatar (no se venden)</li>
          </ul>
          <p className="diploma-estado" role="status">
            {!adentro
              ? 'Entrá a tu cuenta (en el inicio) y se cobra solo: el diploma queda guardado en este dispositivo.'
              : cobro.estado === 'cobrando'
                ? 'Cobrando…'
                : cobro.estado === 'listo'
                  ? '¡Listo! Ya está en tu cuenta.'
                  : `⚠ ${cobro.motivo}`}
          </p>
        </div>
      </section>
      <footer className="tutorial-pie">
        <button type="button" className="boton boton-grande" onClick={() => navegar('/')}>
          Ir a jugar
        </button>
      </footer>
    </main>
  )
}
