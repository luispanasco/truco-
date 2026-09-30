import { useState } from 'react'
import { useNavigate } from 'react-router'
import type { Nivel } from '@truco/bots'
import type { Formato } from '@truco/engine'
import { Carta } from '../componentes/Carta'
import { ConexionLocal } from '../conexion/local'
import { useJuego } from '../estado'
import { AVATARES, guardarPerfil, leerPerfil, type Perfil } from '../perfil'

const FORMATOS: [Formato, string, string][] = [
  ['1v1', 'Mano a mano', '1 vs 1'],
  ['2v2', 'Parejas', '2 vs 2'],
  ['3v3', 'Tríos', '3 vs 3'],
]
const NIVELES: [Nivel, string][] = [
  ['facil', 'Fácil'],
  ['medio', 'Medio'],
  ['dificil', 'Difícil'],
]

function Interruptor({
  activo,
  alCambiar,
  titulo,
  detalle,
}: {
  activo: boolean
  alCambiar: (v: boolean) => void
  titulo: string
  detalle: string
}) {
  return (
    <label className="interruptor">
      <span>
        <strong>{titulo}</strong>
        <small>{detalle}</small>
      </span>
      <input type="checkbox" role="switch" checked={activo} onChange={(e) => alCambiar(e.target.checked)} />
      <span className="interruptor-pista" aria-hidden="true" />
    </label>
  )
}

export function Inicio() {
  const navegar = useNavigate()
  const [perfil, setPerfil] = useState(leerPerfil)
  const [eligiendoAvatar, setEligiendoAvatar] = useState(false)
  // El perfil se guarda mientras se edita, así sobrevive a recargar la página.
  const cambiar = (p: Partial<Perfil>) =>
    setPerfil((x) => {
      const nuevo = { ...x, ...p }
      guardarPerfil(nuevo)
      return nuevo
    })
  const apodo = perfil.apodo.trim()

  const jugarContraBots = () => {
    useJuego.getState().conectar(
      new ConexionLocal({
        apodo,
        avatar: perfil.avatar,
        formato: perfil.formato,
        nivelBots: perfil.nivelBots,
        ayudas: perfil.ayudas,
        config: { picaPica: perfil.picaPica },
        ...(perfil.rapido ? { demoraBots: [350, 700] as [number, number], pausas: { vuelta: 500, mano: 2700 } } : {}),
      }),
    )
    navegar('/mesa')
  }

  return (
    <div className="pantalla-inicio">
      <header className="inicio-cabecera">
        <div className="abanico" aria-hidden="true">
          <Carta carta={{ numero: 7, palo: 'oro' }} />
          <Carta carta={{ numero: 1, palo: 'espada' }} />
          <Carta carta={{ numero: 1, palo: 'basto' }} />
        </div>
        <h1>Truco</h1>
        <p className="subtitulo">uruguayo · con muestra, piezas y flor</p>
      </header>

      <section className="tarjeta perfil">
        <button
          type="button"
          className="perfil-avatar"
          aria-label="Elegir avatar"
          aria-expanded={eligiendoAvatar}
          onClick={() => setEligiendoAvatar((v) => !v)}
        >
          {perfil.avatar}
          <span className="perfil-editar">✎</span>
        </button>
        <label className="perfil-apodo">
          <span>Tu apodo</span>
          <input
            value={perfil.apodo}
            maxLength={20}
            placeholder="¿Cómo te dicen?"
            onChange={(e) => cambiar({ apodo: e.target.value })}
          />
        </label>
        {eligiendoAvatar && (
          <div className="avatares" role="radiogroup" aria-label="Avatar">
            {AVATARES.map((a) => (
              <button
                key={a}
                type="button"
                role="radio"
                aria-checked={perfil.avatar === a}
                className={`avatar-opcion${perfil.avatar === a ? ' elegido' : ''}`}
                onClick={() => {
                  cambiar({ avatar: a })
                  setEligiendoAvatar(false)
                }}
              >
                {a}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="tarjeta">
        <h2>Contra la compu</h2>
        <div className="campo">
          <span>Formato</span>
          <div className="segmentado">
            {FORMATOS.map(([f, t, sub]) => (
              <button key={f} type="button" className={perfil.formato === f ? 'elegido' : ''} onClick={() => cambiar({ formato: f })}>
                <strong>{t}</strong>
                <small>{sub}</small>
              </button>
            ))}
          </div>
        </div>
        <div className="campo">
          <span>Dificultad</span>
          <div className="segmentado">
            {NIVELES.map(([nv, t]) => (
              <button key={nv} type="button" className={perfil.nivelBots === nv ? 'elegido' : ''} onClick={() => cambiar({ nivelBots: nv })}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <details className="mas-opciones">
          <summary>Más opciones</summary>
          <Interruptor
            activo={perfil.ayudas}
            alCambiar={(v) => cambiar({ ayudas: v })}
            titulo="Ayudas"
            detalle="Marca piezas y matas, y muestra tu envido y tu flor"
          />
          <Interruptor
            activo={perfil.picaPica}
            alCambiar={(v) => cambiar({ picaPica: v })}
            titulo="Pica-pica"
            detalle="En 3 vs 3, mientras los dos equipos están en malas"
          />
          <Interruptor
            activo={perfil.rapido}
            alCambiar={(v) => cambiar({ rapido: v })}
            titulo="Juego rápido"
            detalle="Los bots juegan sin pensar tanto"
          />
        </details>
        <button type="button" className="boton boton-grande" disabled={!apodo} onClick={jugarContraBots}>
          Jugar
        </button>
        {!apodo && <p className="nota">Poné tu apodo para jugar.</p>}
      </section>

      <section className="tarjeta tarjeta-online">
        <h2>
          Online <span className="insignia">Próximamente</span>
        </h2>
        <p className="nota-izq">Jugá con amigos con un código o un link, o con gente de todos lados.</p>
        <div className="botones-fila">
          <button type="button" className="boton boton-secundario" disabled>
            Crear sala
          </button>
          <button type="button" className="boton boton-secundario" disabled>
            Unirme con código
          </button>
        </div>
      </section>

      <footer className="inicio-pie">Truco uruguayo · versión de prueba</footer>
    </div>
  )
}
