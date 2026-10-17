import { useCallback, useLayoutEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { asientoEnPanio, centro } from '../perspectiva'
import '../estilos-mesa-perspectiva.css'

/** Ancho (px del paño) de la marca de cada asiento: lo que mide en pantalla da la escala a esa distancia. */
const ANCHO_ANCLA = 100

/** Dónde quedó, en la pantalla, el lugar de cada asiento alrededor del paño inclinado. */
export interface AsientoProyectado {
  /** Desde la esquina de arriba a la izquierda del .tapete, en px. */
  x: number
  y: number
  /** Cuánto se achica a esa distancia (1 = el borde de cerca del paño). */
  escala: number
}

export interface MedidasPerspectiva {
  asientos: AsientoProyectado[]
  /** El paño sin inclinar, en px. */
  ancho: number
  alto: number
}

/**
 * El paño inclinado. Adentro va lo que se apoya en la mesa (el mazo y las cartas jugadas); los
 * asientos y lo que es interfaz quedan afuera, planos. Marca sus cuatro esquinas (para pasar un
 * punto de la pantalla al paño, ver perspectiva.ts) y el lugar de cada asiento (para pararlos ahí).
 */
export function PanioEnPerspectiva({ n, children }: { n: number; children: ReactNode }) {
  return (
    <div className="panio">
      <span className="esquina-panio" style={{ left: 0, top: 0 }} />
      <span className="esquina-panio" style={{ left: '100%', top: 0 }} />
      <span className="esquina-panio" style={{ left: '100%', top: '100%' }} />
      <span className="esquina-panio" style={{ left: 0, top: '100%' }} />
      {Array.from({ length: n }, (_, pos) => {
        const [fx, fy] = asientoEnPanio(n, pos)
        return <span key={pos} className="ancla-asiento" data-pos={pos} style={{ left: `${fx * 100}%`, top: `${fy * 100}%`, width: ANCHO_ANCLA }} />
      })}
      {/* El canto de madera de este lado: la mesa tiene espesor. */}
      <span className="panio-canto" />
      {children}
    </div>
  )
}

const iguales = (a: MedidasPerspectiva | null, b: MedidasPerspectiva) =>
  !!a &&
  a.ancho === b.ancho &&
  a.alto === b.alto &&
  a.asientos.length === b.asientos.length &&
  a.asientos.every((x, i) => Math.abs(x.x - b.asientos[i]!.x) < 0.5 && Math.abs(x.y - b.asientos[i]!.y) < 0.5 && Math.abs(x.escala - b.asientos[i]!.escala) < 0.005)

/**
 * Mide dónde cae cada asiento alrededor del paño inclinado (lo proyecta el navegador: no se
 * repite la cuenta de la perspectiva) y lo vuelve a medir si cambia el tamaño de la mesa.
 * Devuelve la ref para el .tapete y las medidas (null hasta medir, o si no está prendida).
 */
export function useMesaEnPerspectiva(activa: boolean, n: number) {
  const [tapete, setTapete] = useState<HTMLElement | null>(null)
  const [medidas, setMedidas] = useState<MedidasPerspectiva | null>(null)
  const ref = useCallback((el: HTMLElement | null) => setTapete(el), [])

  useLayoutEffect(() => {
    if (!activa || !tapete) return
    const medir = () => {
      const panio = tapete.querySelector<HTMLElement>(':scope > .panio')
      if (!panio) return
      const caja = tapete.getBoundingClientRect()
      const asientos = [...panio.querySelectorAll<HTMLElement>(':scope > .ancla-asiento')].map((el) => {
        const r = el.getBoundingClientRect()
        const [x, y] = centro(el)
        return { x: x - caja.left, y: y - caja.top, escala: r.width / ANCHO_ANCLA }
      })
      // Sin navegador de verdad (los tests) no hay medidas: quedan los lugares del CSS.
      if (!caja.width || asientos.some((a) => !a.escala)) return
      const nuevas = { asientos, ancho: panio.offsetWidth, alto: panio.offsetHeight }
      setMedidas((antes) => (iguales(antes, nuevas) ? antes : nuevas))
    }
    medir()
    if (typeof ResizeObserver === 'undefined') return
    const obs = new ResizeObserver(medir)
    obs.observe(tapete)
    return () => obs.disconnect()
  }, [activa, tapete, n])

  return { ref, medidas: activa ? medidas : null }
}

/** Las variables con las que el CSS para a un asiento en su lugar (sin medidas, quedan las del CSS). */
export function estiloAsiento(medidas: MedidasPerspectiva | null, pos: number): CSSProperties | undefined {
  const a = medidas?.asientos[pos]
  if (!a) return undefined
  return { '--ancla-x': `${a.x}px`, '--ancla-y': `${a.y}px`, '--escala': a.escala.toFixed(3) } as CSSProperties
}

/** Hacia dónde queda cada asiento visto desde el centro del paño, en px del paño (para los vuelos de las cartas). */
export function haciaAsiento(medidas: MedidasPerspectiva | null, n: number, pos: number): [number, number] | null {
  if (!medidas) return null
  const [fx, fy] = asientoEnPanio(n, pos)
  return [(fx - 0.5) * medidas.ancho, (fy - 0.5) * medidas.alto]
}
