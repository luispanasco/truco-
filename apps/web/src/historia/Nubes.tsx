import { motion, useReducedMotion } from 'motion/react'

/**
 * Las nubes de cada lado (en % de su mitad de pantalla): grandes y encimadas, en filas corridas,
 * así juntas tapan todo.
 */
const NUBES = Array.from({ length: 22 }, (_, i) => {
  const fila = Math.floor(i / 2)
  return { x: (i % 2) * 38 - 18 + (fila % 2) * 12, y: fila * 9.5 - 10, w: 95 + ((i * 37) % 30) }
})

/**
 * Nubes que tapan la pantalla (`cerrar`: entran de los costados) o la destapan (`abrir`: se van
 * a los costados). Al terminar llama a `alTerminar`. Con menos movimiento, es un fundido.
 */
export function Nubes({ modo, alTerminar }: { modo: 'cerrar' | 'abrir'; alTerminar?: () => void }) {
  const sinMovimiento = useReducedMotion() ?? false
  const tapado = { x: '0%', opacity: 1 }
  // Las nubes se salen de su mitad (las más corridas llegan a 1,6 veces su ancho): para que no quede
  // ninguna asomando, cada mitad se va bien lejos.
  const afuera = (lado: 1 | -1) => (sinMovimiento ? { x: '0%', opacity: 0 } : { x: `${lado * 170}%`, opacity: 1 })
  const lado = (l: 1 | -1) => (
    <motion.div
      className={`nubes-lado ${l < 0 ? 'izquierda' : 'derecha'}`}
      initial={modo === 'cerrar' ? afuera(l) : tapado}
      animate={modo === 'cerrar' ? tapado : afuera(l)}
      transition={{ duration: sinMovimiento ? 0.3 : 0.9, ease: modo === 'cerrar' ? 'easeIn' : 'easeOut' }}
      onAnimationComplete={l < 0 ? alTerminar : undefined}
    >
      {NUBES.map((n, i) => (
        <span key={i} className="nube" style={{ left: `${n.x}%`, top: `${n.y}%`, width: `${n.w}%` }} />
      ))}
    </motion.div>
  )
  return (
    <div className="nubes" aria-hidden="true">
      {lado(-1)}
      {lado(1)}
    </div>
  )
}
