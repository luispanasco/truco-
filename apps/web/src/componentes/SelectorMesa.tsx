import { useState } from 'react'
import { MESAS, idMesa, type IdMesa } from '@truco/shared'
import { useEsBeta, useInventario } from '../cuenta/inventario'
import { Carta } from './Carta'
import { CandadoAbierto, Precio } from './EditorAvatar'
import '../estilos-mesas.css'

/**
 * Elegir la mesa (paño y madera): una muestra chica de cada una, con su carta encima. Las de
 * la tienda se ven con candado y precio, pero todavía no se pueden elegir (con la tienda de
 * prueba desbloqueada sí: llevan un candado abierto).
 */
export function SelectorMesa({
  valor,
  alCambiar,
  tiendaDesbloqueada: dePrueba = false,
}: {
  valor: IdMesa
  alCambiar: (mesa: IdMesa) => void
  tiendaDesbloqueada?: boolean
}) {
  // Los beta testers también: pueden usar todo lo de la tienda.
  const beta = useEsBeta()
  const tiendaDesbloqueada = dePrueba || beta
  const [aviso, setAviso] = useState<string | null>(null)
  const tenes = useInventario()
  const elegida = MESAS.find((m) => m.id === valor) ?? MESAS[0]
  return (
    <div className="campo">
      <span>Mesa</span>
      <div className="mesas" role="radiogroup" aria-label="Mesa">
        {MESAS.map((m) => {
          const deTienda = m.precio > 0
          const paga = deTienda && !tiendaDesbloqueada && !tenes.has(idMesa(m.id))
          // Las del modo historia no se compran: se ganan en su departamento.
          const recompensa = 'recompensa' in m ? m.recompensa : undefined
          const falta = !!recompensa && !tiendaDesbloqueada && !tenes.has(idMesa(m.id))
          return (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={valor === m.id}
              aria-disabled={paga || falta || undefined}
              aria-label={paga ? `${m.nombre}: ${m.precio} monedas, en la tienda` : falta ? `${m.nombre}: se gana en ${recompensa}` : m.nombre}
              title={paga ? `${m.precio} monedas · Buscala en la tienda` : falta ? `Se gana en ${recompensa}, en el modo historia` : m.detalle}
              className={`mesa-opcion${valor === m.id ? ' elegida' : ''}${paga || falta ? ' paga' : ''}`}
              // Las pagas no se eligen, pero se pueden tocar: avisan cuánto cuestan (o dónde se ganan).
              onClick={() => {
                if (paga) return setAviso(`La mesa ${m.nombre} cuesta ${m.precio} monedas. Buscala en la tienda.`)
                if (falta) return setAviso(`La mesa ${m.nombre} se gana en ${recompensa}, en el modo historia.`)
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
              {falta && <span className="pieza-precio" aria-hidden="true">🔒</span>}
              {deTienda && !paga && <CandadoAbierto />}
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
