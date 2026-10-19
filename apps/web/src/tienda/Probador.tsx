import { useCallback, useRef, useState } from 'react'
import { Link } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { NOMBRE_RAREZA, type ItemTienda } from '@truco/shared'
import { Hoja } from '../componentes/Hoja'
import { MensajeError } from '../componentes/Online'
import { usePerfil } from '../componentes/TarjetaPerfil'
import { comprarEnTienda, useCuenta } from '../cuenta/cuenta'
import { useInventario } from '../cuenta/inventario'
import { Festejo, MonedasVolando } from './Festejo'
import { estaPuesto, ponerItem, tipoDeItem } from './items'
import { Muestra, detalleDe } from './Muestra'

/** La moneda dibujada (la misma del banner), para los precios. */
export function Moneda() {
  return <span className="moneda" aria-hidden="true" />
}

/**
 * Cuánto se gana jugando, para el que no llega (como `ECONOMIA` en el servidor,
 * apps/server/src/cuentas/monedas.ts: si cambia allá, cambia acá).
 */
function ComoSeGanan() {
  return (
    <ul className="como-se-ganan">
      <li>
        <strong>+10</strong> por terminar una partida online
      </li>
      <li>
        <strong>+10</strong> más si la ganás
      </li>
      <li>
        <strong>+30</strong> la primera partida del día
      </li>
      <li className="como-se-ganan-nota">Con bots en la mesa se gana menos.</li>
    </ul>
  )
}

type Paso = 'mirar' | 'confirmar' | 'comprando' | 'comprado'

/**
 * El probador: la pieza puesta en tu avatar, grande, con "Sin / Con" para comparar con lo que
 * tenés ahora (la mesa y la letra igual). Desde acá se compra, con confirmación, o se usa.
 */
export function Probador({ item, alCerrar, alEntrar }: { item: ItemTienda; alCerrar: () => void; alEntrar?: () => void }) {
  const [perfil, cambiar] = usePerfil()
  const tenes = useInventario()
  const { estado, saldo } = useCuenta()
  const [con, setCon] = useState(true)
  const [paso, setPaso] = useState<Paso>('mirar')
  const [motivo, setMotivo] = useState<string | null>(null)
  const [vuelo, setVuelo] = useState<DOMRect | null>(null)
  const boton = useRef<HTMLButtonElement>(null)
  const terminoVuelo = useCallback(() => setVuelo(null), [])

  const tuyo = tenes.has(item.id)
  const puesto = estaPuesto(item, perfil)
  const plata = saldo ?? 0
  const faltan = item.precio - plata
  const detalle = detalleDe(item)

  const comprar = async () => {
    const desde = boton.current?.getBoundingClientRect() ?? null
    setPaso('comprando')
    setMotivo(null)
    const error = await comprarEnTienda(item.id)
    if (error) {
      setMotivo(error)
      setPaso('mirar')
      return
    }
    setCon(true)
    setPaso('comprado')
    if (desde) setVuelo(desde)
  }

  let acciones
  if (tuyo) {
    acciones = (
      <div className="probador-acciones">
        {paso === 'comprado' && (
          <motion.p className="probador-tuyo" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 16 }}>
            ¡Es tuyo!
          </motion.p>
        )}
        <button type="button" className="boton boton-tienda" disabled={puesto} onClick={() => cambiar(ponerItem(item, perfil))}>
          {puesto ? '✓ Puesto' : paso === 'comprado' ? 'Usar ahora' : 'Usar'}
        </button>
        {paso === 'comprado' && (
          <button type="button" className="boton boton-secundario" onClick={alCerrar}>
            Seguir mirando
          </button>
        )}
      </div>
    )
  } else if (estado !== 'adentro') {
    acciones = (
      <div className="probador-acciones probador-aviso">
        {estado === 'apagadas' ? (
          <p>Este servidor no tiene cuentas: por ahora no se puede comprar.</p>
        ) : (
          <>
            <p>
              Para comprar, entrá a tu cuenta. Las monedas se ganan jugando, y lo que comprás es tuyo para siempre.
            </p>
            {alEntrar ? (
              <button type="button" className="boton boton-tienda" onClick={alEntrar}>
                Entrar a tu cuenta
              </button>
            ) : (
              <Link className="boton boton-tienda" to="/">
                Entrar desde el inicio
              </Link>
            )}
          </>
        )}
      </div>
    )
  } else if (faltan > 0) {
    acciones = (
      <div className="probador-acciones probador-aviso">
        <p className="probador-faltan">
          Te faltan <Moneda /> <strong>{faltan}</strong>
        </p>
        <div className="barra-ahorro" role="progressbar" aria-label="Lo que juntaste" aria-valuemin={0} aria-valuemax={item.precio} aria-valuenow={plata}>
          <span style={{ width: `${Math.min(100, (plata / item.precio) * 100)}%` }} />
        </div>
        <p className="nota-izq">
          Tenés {plata} de {item.precio}. Así se juntan:
        </p>
        <ComoSeGanan />
      </div>
    )
  } else if (paso === 'confirmar' || paso === 'comprando') {
    acciones = (
      <div className="probador-acciones probador-confirmar" role="group" aria-label="Confirmar la compra">
        <p className="probador-pregunta">
          ¿Comprás <strong>{item.nombre}</strong> por <Moneda /> {item.precio}?
        </p>
        <p className="nota-izq">Te quedan {plata - item.precio}.</p>
        <div className="probador-botones">
          <button type="button" className="boton boton-secundario" disabled={paso === 'comprando'} onClick={() => setPaso('mirar')}>
            Mejor no
          </button>
          <button ref={boton} type="button" className="boton boton-tienda" disabled={paso === 'comprando'} onClick={() => void comprar()}>
            {paso === 'comprando' ? 'Comprando…' : 'Sí, comprar'}
          </button>
        </div>
      </div>
    )
  } else {
    acciones = (
      <div className="probador-acciones">
        <button
          type="button"
          className="boton boton-tienda boton-comprar"
          aria-label={`Comprar ${item.nombre} por ${item.precio} monedas`}
          onClick={() => {
            setCon(true)
            setPaso('confirmar')
          }}
        >
          Comprar <Moneda /> {item.precio}
        </button>
      </div>
    )
  }

  return (
    <Hoja titulo={item.nombre} alCerrar={alCerrar} clase={`hoja-menu hoja-probador rareza-${item.rareza}`} claseFondo="hoja-fija">
      <div className={`probador rareza-${item.rareza}`}>
        <div className="probador-escenario">
          <span className="cinta-rareza">{NOMBRE_RAREZA[item.rareza]}</span>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={con ? 'con' : 'sin'}
              className="probador-muestra"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.18 }}
            >
              <Muestra item={item} perfil={perfil} con={con} grande />
            </motion.div>
          </AnimatePresence>
          {paso === 'comprado' && <Festejo rareza={item.rareza} />}
        </div>
        <p className="probador-que">
          {tipoDeItem(item)} · <span className="probador-rareza">{NOMBRE_RAREZA[item.rareza]}</span>
          {detalle && <small>{detalle}</small>}
        </p>
        {!puesto && (
          <div className="segmentado probador-alternar" role="group" aria-label="Comparar">
            <button type="button" className={con ? '' : 'elegido'} aria-pressed={!con} onClick={() => setCon(false)}>
              Sin
            </button>
            <button type="button" className={con ? 'elegido' : ''} aria-pressed={con} onClick={() => setCon(true)}>
              Con
            </button>
          </div>
        )}
        {acciones}
        {motivo && <MensajeError>{motivo}</MensajeError>}
      </div>
      {vuelo && <MonedasVolando desde={vuelo} alTerminar={terminoVuelo} />}
    </Hoja>
  )
}
