import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'motion/react'
import type { Rareza } from '@truco/shared'

/** Dónde está tu saldo en la pantalla (el del banner o el de la cabecera de la tienda). */
function destinoSaldo(): { x: number; y: number; el: Element | null } {
  const visibles = [...document.querySelectorAll('[data-saldo]')].filter((e) => e.getClientRects().length > 0)
  const el = visibles.at(-1) ?? null
  const r = el?.getBoundingClientRect()
  return r ? { x: r.left + r.width / 2, y: r.top + r.height / 2, el } : { x: window.innerWidth / 2, y: 0, el: null }
}

/** El saldo da un saltito cuando le llegan las monedas. */
function golpe(el: Element | null) {
  el?.animate?.([{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: 380, easing: 'ease-out' })
}

const MONEDAS = 6

/**
 * Al comprar: unas monedas salen del botón y vuelan en arco hasta tu saldo. Van por encima de
 * todo (también de la hoja). Con movimiento reducido no vuelan: solo salta el saldo.
 */
export function MonedasVolando({ desde, alTerminar }: { desde: DOMRect; alTerminar: () => void }) {
  const sinMovimiento = useReducedMotion() ?? false
  const [hasta] = useState(destinoSaldo)

  useEffect(() => {
    if (!sinMovimiento) return
    golpe(hasta.el)
    alTerminar()
  }, [sinMovimiento, hasta, alTerminar])

  if (sinMovimiento) return null
  const x0 = desde.left + desde.width / 2
  const y0 = desde.top + desde.height / 2
  const dx = hasta.x - x0
  const dy = hasta.y - y0
  return createPortal(
    <div className="monedas-volando" aria-hidden="true">
      {Array.from({ length: MONEDAS }, (_, i) => {
        const abre = (i - (MONEDAS - 1) / 2) * 22
        return (
          <motion.span
            key={i}
            className="moneda-volando"
            style={{ left: x0, top: y0 }}
            initial={{ x: 0, y: 0, scale: 0.5, opacity: 0 }}
            animate={{ x: [0, dx * 0.3 + abre, dx], y: [0, dy * 0.3 - 70, dy], scale: [0.5, 1.2, 0.65], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 0.8, delay: i * 0.07, ease: 'easeInOut', times: [0, 0.4, 1] }}
            onAnimationComplete={
              i === MONEDAS - 1
                ? () => {
                    golpe(hasta.el)
                    alTerminar()
                  }
                : undefined
            }
          />
        )
      })}
    </div>,
    document.body,
  )
}

/** Cuánto festejo según la rareza: más chispas, más lejos y, desde épica, un destello. */
const FESTEJO: Record<Rareza, { chispas: number; lejos: number; destello: boolean }> = {
  comun: { chispas: 8, lejos: 70, destello: false },
  rara: { chispas: 12, lejos: 90, destello: false },
  epica: { chispas: 18, lejos: 115, destello: true },
  legendaria: { chispas: 30, lejos: 150, destello: true },
}

/**
 * Las chispas que saltan de la muestra al comprar, del color de la rareza (y algunas del acento).
 * Va encima de la muestra, sin tapar los toques. Con movimiento reducido no hay chispas.
 */
export function Festejo({ rareza }: { rareza: Rareza }) {
  const sinMovimiento = useReducedMotion() ?? false
  const f = FESTEJO[rareza]
  const [chispas] = useState(() =>
    Array.from({ length: f.chispas }, (_, i) => {
      const angulo = (i / f.chispas) * Math.PI * 2 + Math.random() * 0.4
      const lejos = f.lejos * (0.6 + Math.random() * 0.5)
      return { x: Math.cos(angulo) * lejos, y: Math.sin(angulo) * lejos, tam: 6 + Math.random() * 7, acento: i % 3 === 0, giro: Math.random() * 360 }
    }),
  )
  if (sinMovimiento) return null
  return (
    <div className={`festejo festejo-${rareza}`} aria-hidden="true">
      {f.destello && (
        <motion.span
          className="festejo-destello"
          initial={{ scale: 0.2, opacity: 0.9 }}
          animate={{ scale: rareza === 'legendaria' ? 3.2 : 2.4, opacity: 0 }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
        />
      )}
      {chispas.map((c, i) => (
        <motion.span
          key={i}
          className={`festejo-chispa${c.acento ? ' acento' : ''}`}
          style={{ width: c.tam, height: c.tam }}
          initial={{ x: 0, y: 0, scale: 0, opacity: 1, rotate: 0 }}
          animate={{ x: c.x, y: [0, c.y, c.y + 30], scale: [0, 1.2, 0.4], opacity: [1, 1, 0], rotate: c.giro }}
          transition={{ duration: 1.1, ease: 'easeOut', delay: i * 0.012, times: [0, 0.55, 1] }}
        />
      ))}
    </div>
  )
}
