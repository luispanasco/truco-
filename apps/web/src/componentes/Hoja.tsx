import { useEffect, type ReactNode } from 'react'

/**
 * Hoja que sube desde abajo sobre la mesa (chat, señas). Se cierra tocando el fondo,
 * con la ✕ o con Escape.
 */
export function Hoja({
  titulo,
  alCerrar,
  children,
  clase = '',
  claseFondo = '',
  cabecera,
}: {
  titulo: string
  alCerrar: () => void
  children: ReactNode
  clase?: string
  /** Para el fondo: fuera de la mesa (en el inicio) la hoja va fija sobre la pantalla. */
  claseFondo?: string
  /** Lo que va en la cabecera además del título (por ejemplo, pestañas). */
  cabecera?: ReactNode
}) {
  useEffect(() => {
    const alTeclado = (e: KeyboardEvent) => {
      if (e.key === 'Escape') alCerrar()
    }
    window.addEventListener('keydown', alTeclado)
    return () => window.removeEventListener('keydown', alTeclado)
  }, [alCerrar])

  return (
    <div className={`hoja-fondo ${claseFondo}`} onClick={alCerrar}>
      <section className={`hoja ${clase}`} role="dialog" aria-modal="true" aria-label={titulo} onClick={(e) => e.stopPropagation()}>
        <header className="hoja-cabecera">
          <h2 className="hoja-titulo">{titulo}</h2>
          {cabecera}
          <button type="button" className="boton-salir hoja-cerrar" onClick={alCerrar} aria-label="Cerrar">
            ✕
          </button>
        </header>
        {children}
      </section>
    </div>
  )
}
