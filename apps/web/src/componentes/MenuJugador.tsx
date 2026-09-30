import { useEffect, useRef, useState } from 'react'
import type { LugarPublico } from '@truco/shared'
import { Avatar } from './Asiento'

export const MOTIVOS_REPORTE = [
  { id: 'insultos', texto: 'Insultos' },
  { id: 'trampa', texto: 'Trampa' },
  { id: 'spam', texto: 'Spam' },
  { id: 'otro', texto: 'Otro' },
] as const

/**
 * A quién silenciaste en esta sala. El servidor ya no te manda sus mensajes; esto es
 * para mostrarlo en la mesa y en el menú. Se recuerda en la pestaña mientras dure la sala.
 */
export function useSilenciados(sala: string | null) {
  const clave = `truco.silenciados.${sala ?? 'local'}`
  const [silenciados, setSilenciados] = useState<ReadonlySet<number>>(() => {
    try {
      return new Set(JSON.parse(sessionStorage.getItem(clave) ?? '[]') as number[])
    } catch {
      return new Set()
    }
  })
  const cambiar = (asiento: number, silenciar: boolean) => {
    const nuevo = new Set(silenciados)
    if (silenciar) nuevo.add(asiento)
    else nuevo.delete(asiento)
    setSilenciados(nuevo)
    try {
      sessionStorage.setItem(clave, JSON.stringify([...nuevo]))
    } catch {
      // Sin almacenamiento se olvida al recargar; el servidor lo sigue recordando.
    }
  }
  return { silenciados, cambiar }
}

type Paso = 'menu' | 'reportar' | 'gracias'

/** Menú chico sobre otro jugador (solo online y solo personas): silenciar y reportar. */
export function MenuJugador({
  lugar,
  silenciado,
  alSilenciar,
  alReportar,
  alCerrar,
}: {
  lugar: LugarPublico
  silenciado: boolean
  alSilenciar: (silenciar: boolean) => void
  alReportar: (motivo: string) => void
  alCerrar: () => void
}) {
  const [paso, setPaso] = useState<Paso>('menu')
  const cerrar = useRef(alCerrar)
  cerrar.current = alCerrar

  // El agradecimiento se muestra un momento y el menú se cierra solo.
  useEffect(() => {
    if (paso !== 'gracias') return
    const t = setTimeout(() => cerrar.current(), 1800)
    return () => clearTimeout(t)
  }, [paso])

  return (
    <div className="menu-jugador-fondo" onClick={alCerrar}>
      <div className="menu-jugador" role="dialog" aria-modal="true" aria-label={`Opciones para ${lugar.apodo}`} onClick={(e) => e.stopPropagation()}>
        <div className="menu-jugador-quien">
          <Avatar lugar={lugar} tam="chico" />
          <strong>{lugar.apodo}</strong>
          {silenciado && <span className="menu-jugador-estado">silenciado</span>}
        </div>
        {paso === 'menu' && (
          <div className="menu-jugador-opciones">
            <button
              type="button"
              onClick={() => {
                alSilenciar(!silenciado)
                alCerrar()
              }}
            >
              <span aria-hidden="true">{silenciado ? '🔊' : '🔇'}</span>
              {silenciado ? 'Dejar de silenciar' : 'Silenciar'}
            </button>
            <button type="button" className="peligro" onClick={() => setPaso('reportar')}>
              <span aria-hidden="true">🚩</span>
              Reportar
            </button>
            <button type="button" className="menu-jugador-cancelar" onClick={alCerrar}>
              Cancelar
            </button>
          </div>
        )}
        {paso === 'reportar' && (
          <div className="menu-jugador-opciones">
            <p className="menu-jugador-pregunta">¿Por qué lo reportás?</p>
            {MOTIVOS_REPORTE.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  alReportar(m.id)
                  setPaso('gracias')
                }}
              >
                {m.texto}
              </button>
            ))}
            <button type="button" className="menu-jugador-cancelar" onClick={() => setPaso('menu')}>
              Volver
            </button>
          </div>
        )}
        {paso === 'gracias' && (
          <p className="menu-jugador-gracias" role="status">
            Gracias, lo vamos a revisar.
          </p>
        )}
      </div>
    </div>
  )
}
