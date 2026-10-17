import { useEffect, useState } from 'react'
import { TIPOGRAFIAS, idTipografia, type IdTipografia } from '@truco/shared'
import { useInventario } from '../cuenta/inventario'
import { cargarTipografia } from '../temaTipografia'
import { CandadoAbierto, Precio } from './EditorAvatar'
import '../estilos-tipografias.css'

/**
 * Elegir la tipografía de toda la app: cada una con una muestra escrita con ella misma. Las de la
 * tienda se ven con candado y precio, pero todavía no se pueden elegir (con la tienda de prueba
 * desbloqueada sí: llevan un candado abierto). Es solo tuya: no la ve nadie más.
 */
export function SelectorTipografia({
  valor,
  alCambiar,
  tiendaDesbloqueada = false,
}: {
  valor: IdTipografia
  alCambiar: (tipografia: IdTipografia) => void
  tiendaDesbloqueada?: boolean
}) {
  const [aviso, setAviso] = useState<string | null>(null)
  const tenes = useInventario()
  const elegida = TIPOGRAFIAS.find((t) => t.id === valor) ?? TIPOGRAFIAS[0]
  // Para las muestras hace falta el CSS de todas (es chico). Cada letra se baja recién cuando
  // su muestra se ve, o sea, al abrir Más opciones.
  useEffect(() => {
    for (const t of TIPOGRAFIAS) void cargarTipografia(t.id)
  }, [])
  return (
    <div className="campo">
      <span>Tipografía</span>
      <div className="tipografias" role="radiogroup" aria-label="Tipografía">
        {TIPOGRAFIAS.map((t) => {
          const deTienda = t.precio > 0
          const paga = deTienda && !tiendaDesbloqueada && !tenes.has(idTipografia(t.id))
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={valor === t.id}
              aria-disabled={paga || undefined}
              aria-label={paga ? `${t.nombre}: ${t.precio} monedas, en la tienda` : t.nombre}
              title={paga ? `${t.precio} monedas · Buscala en la tienda` : t.detalle}
              className={`tipografia-opcion${valor === t.id ? ' elegida' : ''}${paga ? ' paga' : ''}`}
              // Las pagas no se eligen, pero se pueden tocar: avisan cuánto cuestan.
              onClick={() => {
                if (paga) return setAviso(`La tipografía ${t.nombre} cuesta ${t.precio} monedas. Buscala en la tienda.`)
                setAviso(null)
                alCambiar(t.id)
              }}
            >
              {/* La muestra, con su letra y su escala: como se ven los textos de la app al elegirla. */}
              <span
                className="muestra-tipografia"
                data-tipografia={t.id}
                aria-hidden="true"
                // En px: no depende de la tipografía que está puesta (la escala va en el rem).
                style={{ fontFamily: t.familia, fontSize: `${Math.round(20 * t.escala)}px` }}
              >
                Truco
              </span>
              <span className="tipografia-nombre">{t.nombre}</span>
              {paga && <Precio monedas={t.precio} />}
              {deTienda && !paga && <CandadoAbierto />}
            </button>
          )
        })}
      </div>
      <small className="campo-detalle" role="status">
        {aviso ?? `${elegida.detalle}. Así se ven los textos de toda la app (solo para vos).`}
      </small>
    </div>
  )
}
