import { useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'motion/react'
import { buscarDepartamento, escenaDelFinal, nivelDeHistoria, nombreRecompensa } from '@truco/shared'
import type { NivelJugado } from '../conexion/tipos'
import { alMedio, FiguraDe, FiguraVos, Globo, nombreDe } from './Escena'

/** Lo que ganaste en el nivel, mientras se anota y cuando ya está. */
export type Premio = { estado: 'anotando' } | { estado: 'listo'; nuevas: string[] } | { estado: 'error'; motivo: string }

/**
 * La escena al terminar un nivel del modo historia, en el lugar: el rival dice lo suyo (te
 * reconoce o te gasta) y tu compañero festeja o te da ánimo. Si ganaste, después aparecen los
 * premios de a uno. Al final, los botones (`botones`: seguir, revancha o volver). Se puede saltar
 * directo al final. Va encima de todo (también de la mesa).
 */
export function EscenaFinal({ jugado, ganamos, premio, botones }: { jugado: NivelJugado; ganamos: boolean; premio: Premio; botones: ReactNode }) {
  const sinMovimiento = useReducedMotion() ?? false
  const nivel = nivelDeHistoria(jugado.departamento, jugado.nivel, jugado.barrio ?? '')!
  const dialogo = escenaDelFinal(nivel, jugado.nivel, ganamos)
  const [paso, setPaso] = useState(0)
  const alFinal = paso >= dialogo.length - 1
  const turno = dialogo[Math.min(paso, dialogo.length - 1)]!
  const deTuEquipo = nivel.companieros.includes(turno.quien)
  const dep = buscarDepartamento(jugado.departamento)!
  const habla = (id: string) => turno.quien === id
  return createPortal(
    <div
      className="historia-previa escena-final"
      data-fondo={jugado.departamento}
      data-nivel={jugado.nivel}
      role="dialog"
      aria-modal="true"
      aria-label={ganamos ? `Ganaste en ${nivel.lugar}` : `Perdiste en ${nivel.lugar}`}
    >
      {!alFinal && (
        <button type="button" className="historia-saltar" onClick={() => setPaso(dialogo.length - 1)}>
          Saltar <span aria-hidden="true">›</span>
        </button>
      )}
      <header className="historia-previa-titulo">
        <small>
          {dep.nombre} · Nivel {jugado.nivel}
        </small>
        <h1>{ganamos ? '¡Ganaste!' : 'Perdiste'}</h1>
        <p>{nivel.lugar}</p>
      </header>
      <div className="previa-escena">
        <div className="previa-fila" aria-label="Rivales">
          {alMedio(nivel.rivales).map((id) => (
            <FiguraDe key={id} id={id} habla={habla(id)} quieto={sinMovimiento} />
          ))}
        </div>
        <Globo clave={String(paso)} quien={nombreDe(turno.quien)} desdeAbajo={deTuEquipo} quieto={sinMovimiento}>
          {turno.texto}
        </Globo>
        <div className="previa-fila previa-tuyos" aria-label="Tu equipo">
          {alMedio([null, ...nivel.companieros]).map((id) =>
            id === null ? <FiguraVos key="vos" habla={false} quieto={sinMovimiento} /> : <FiguraDe key={id} id={id} habla={habla(id)} quieto={sinMovimiento} />,
          )}
        </div>
      </div>
      <footer className="historia-previa-pie">
        {!alFinal ? (
          <button type="button" className="boton boton-grande" onClick={() => setPaso((p) => p + 1)}>
            Seguir
          </button>
        ) : (
          <>
            {ganamos && <Premios premio={premio} quieto={sinMovimiento} />}
            {botones}
          </>
        )}
      </footer>
    </div>,
    document.body,
  )
}

/** Lo que ganaste, de a uno, como si te lo entregaran. */
function Premios({ premio, quieto }: { premio: Premio; quieto: boolean }) {
  if (premio.estado === 'anotando') return <p className="escena-premios-nota">Anotando el nivel…</p>
  if (premio.estado === 'error') return <p className="escena-premios-nota">⚠ {premio.motivo}</p>
  if (premio.nuevas.length === 0) return <p className="escena-premios-nota">Este nivel ya lo tenías ganado.</p>
  return (
    <section className="escena-premios" aria-label="Lo que ganaste">
      <h2>Lo que ganaste</h2>
      <ul>
        {premio.nuevas.map((id, i) => (
          <motion.li
            key={id}
            initial={quieto ? false : { opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.25 + i * 0.45, type: 'spring', stiffness: 300, damping: 20 }}
          >
            <span aria-hidden="true">{id.startsWith('monedas:') ? '🪙' : '🎁'}</span> {nombreRecompensa(id)}
          </motion.li>
        ))}
      </ul>
    </section>
  )
}
