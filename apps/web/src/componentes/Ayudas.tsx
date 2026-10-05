import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'

/** Una explicación abierta: el texto y de dónde salió (para apuntarle con la colita). */
export interface Explicacion {
  id: number
  texto: string
  /** Centro horizontal de lo que se tocó, en px de la ventana. */
  x: number
  /** Lo que se tocó: tocarlo de nuevo la cierra. */
  origen: HTMLElement
}

/** Lo que se ve: unos 5 s, y más si es larga (hasta 12 s). */
export function duracionExplicacion(texto: string): number {
  return Math.min(12_000, 5000 + texto.length * 35)
}

let contador = 0

/** Abre y cierra la explicación de las ayudas. Tocar lo mismo otra vez la cierra. */
export function useExplicacion() {
  const [explicacion, setExplicacion] = useState<Explicacion | null>(null)
  const explicar = useCallback((texto: string, origen: HTMLElement) => {
    const r = origen.getBoundingClientRect()
    setExplicacion((e) => (e?.origen === origen && e.texto === texto ? null : { id: ++contador, texto, x: r.left + r.width / 2, origen }))
  }, [])
  const cerrar = useCallback(() => setExplicacion(null), [])
  return { explicacion, explicar, cerrar }
}

/**
 * El globito con la explicación, arriba de tu lugar (sobre el borde de abajo del paño):
 * no tapa los botones de canto ni tu mano. Se cierra sola, al tocar fuera o con Escape.
 */
export function GloboExplicacion({ explicacion, alCerrar }: { explicacion: Explicacion; alCerrar: () => void }) {
  const caja = useRef<HTMLDivElement>(null)
  const [flecha, setFlecha] = useState<number | null>(null)

  useEffect(() => {
    const t = setTimeout(alCerrar, duracionExplicacion(explicacion.texto))
    const fuera = (e: PointerEvent) => {
      const donde = e.target as Node | null
      // Lo que se tocó para abrirla la cierra con su propio click (si no, se cerraría y volvería a abrir).
      if (donde && (caja.current?.contains(donde) || explicacion.origen.contains(donde))) return
      alCerrar()
    }
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') alCerrar()
    }
    document.addEventListener('pointerdown', fuera, true)
    document.addEventListener('keydown', tecla)
    return () => {
      clearTimeout(t)
      document.removeEventListener('pointerdown', fuera, true)
      document.removeEventListener('keydown', tecla)
    }
  }, [explicacion, alCerrar])

  // La colita apunta a lo que se tocó, sin salirse de la caja. Se mide sin transformaciones
  // (offset*): mientras entra, la caja está achicada por la animación.
  useLayoutEffect(() => {
    const el = caja.current
    const padre = el?.offsetParent?.getBoundingClientRect()
    if (!el || !padre || el.offsetWidth === 0) return setFlecha(null)
    setFlecha(Math.min(el.offsetWidth - 18, Math.max(18, explicacion.x - padre.left - el.offsetLeft)))
  }, [explicacion])

  return (
    <div
      ref={caja}
      key={explicacion.id}
      className="explicacion-ayuda"
      role="status"
      style={flecha === null ? undefined : ({ '--flecha': `${flecha}px` } as CSSProperties)}
      onClick={alCerrar}
    >
      {explicacion.texto}
    </div>
  )
}
