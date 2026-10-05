import { useState } from 'react'
import { MESAS, type IdMesa } from '@truco/shared'
import { Carta } from './Carta'
import { Precio } from './EditorAvatar'
import '../estilos-mesas.css'

/**
 * Elegir la mesa (paño y madera): una muestra chica de cada una, con su carta encima. Las de
 * la tienda se ven con candado y precio, pero todavía no se pueden elegir.
 */
export function SelectorMesa({ valor, alCambiar }: { valor: IdMesa; alCambiar: (mesa: IdMesa) => void }) {
  const [aviso, setAviso] = useState<string | null>(null)
  const elegida = MESAS.find((m) => m.id === valor) ?? MESAS[0]
  return (
    <div className="campo">
      <span>Mesa</span>
      <div className="mesas" role="radiogroup" aria-label="Mesa">
        {MESAS.map((m) => {
          const paga = m.precio > 0
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={valor === m.id}
              aria-disabled={paga || undefined}
              aria-label={paga ? `${m.nombre}: ${m.precio} monedas, pronto en la tienda` : m.nombre}
              title={paga ? `${m.precio} monedas · Pronto en la tienda` : m.detalle}
              className={`mesa-opcion${valor === m.id ? ' elegida' : ''}${paga ? ' paga' : ''}`}
              // Las pagas no se eligen, pero se pueden tocar: avisan cuánto cuestan.
              onClick={() => {
                if (paga) return setAviso(`La mesa ${m.nombre} cuesta ${m.precio} monedas. Pronto en la tienda.`)
                setAviso(null)
                alCambiar(m.id)
              }}
            >
              {/* La muestra lleva su propio data-mesa: las variables de color valen solo adentro. */}
              <span className="muestra-mesa" data-mesa={m.id} aria-hidden="true">
                <Carta carta={{ numero: 1, palo: 'espada' }} tam="chica" />
              </span>
              <span className="mesa-nombre">{m.nombre}</span>
              {paga && <Precio monedas={m.precio} />}
            </button>
          )
        })}
      </div>
      <small className="campo-detalle" role="status">
        {aviso ?? `${elegida.detalle}. Así se ve la mesa y el fondo de la app.`}
      </small>
    </div>
  )
}
