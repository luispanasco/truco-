import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { NOMBRE_RAREZA, buscarItem, type ItemTienda } from '@truco/shared'
import { CabeceraOnline, MensajeError } from '../componentes/Online'
import { usePerfil } from '../componentes/TarjetaPerfil'
import { direccionApi, iniciarCuenta, useCuenta } from '../cuenta/cuenta'
import { useInventario } from '../cuenta/inventario'
import { estaPuesto, ponerItem } from '../tienda/items'
import { Muestra } from '../tienda/Muestra'
import { Moneda, Probador } from '../tienda/Probador'
import '../estilos-mesas.css'
import '../tienda/estilos-tienda.css'

interface Vitrina {
  dia: string
  cambia: string
  items: ItemTienda[]
}

/**
 * La tienda: seis cosméticos por día, los mismos para todos, que cambian a la medianoche de
 * Uruguay. Lo comprado es tuyo para siempre y se puede usar desde acá mismo. Como pantalla
 * suelta (/tienda) lleva tu saldo en la cabecera; en el menú, el saldo ya está en el banner.
 */
export function Tienda() {
  const { estado, saldo } = useCuenta()
  return (
    <div className="pantalla-inicio pantalla-online pantalla-tienda">
      <CabeceraOnline
        titulo="Tienda"
        extra={
          estado === 'adentro' ? (
            <span className="saldo-compacto" data-saldo aria-label={`${saldo ?? 0} monedas`}>
              <Moneda /> {saldo ?? '…'}
            </span>
          ) : undefined
        }
      />
      <VitrinaDelDia />
    </div>
  )
}

/** "10:05": horas y minutos que faltan. */
function faltan(ms: number): string {
  const min = Math.max(1, Math.ceil(ms / 60_000))
  return `${Math.floor(min / 60)}:${String(min % 60).padStart(2, '0')}`
}

/**
 * La vitrina del día: la destacada (el lugar épico o legendario) grande arriba, las otras cinco
 * más chicas abajo y, al final, lo que ya compraste. Tocando cualquiera se abre el probador.
 * Es la pantalla /tienda y el panel de la tienda en el menú. Sin cuenta, `alEntrar` abre el
 * login ahí mismo (si no viene, se manda al inicio).
 */
export function VitrinaDelDia({ alEntrar }: { alEntrar?: () => void }) {
  const [vitrina, setVitrina] = useState<Vitrina | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ahora, setAhora] = useState(() => Date.now())
  const [abierto, setAbierto] = useState<ItemTienda | null>(null)
  const estado = useCuenta((s) => s.estado)
  useEffect(() => void iniciarCuenta(), [])
  // Pasada la medianoche, se pide la vitrina nueva.
  const vencida = vitrina !== null && ahora >= Date.parse(vitrina.cambia)

  useEffect(() => {
    let vigente = true
    fetch(`${direccionApi()}/tienda`)
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status))
        const v = (await r.json()) as Vitrina
        if (vigente) setVitrina(v)
      })
      .catch(() => vigente && setError('No se pudo abrir la tienda. ¿Está prendido el servidor?'))
    return () => {
      vigente = false
    }
  }, [vencida])

  // El reloj del cambio de vitrina.
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 15_000)
    return () => clearInterval(t)
  }, [])

  const destacada = vitrina?.items.at(-1)
  const resto = vitrina?.items.slice(0, -1) ?? []
  // Las comunes van de a tres, chiquitas; las raras y épicas, de a dos.
  const medianas = resto.filter((i) => i.rareza !== 'comun')
  const chicas = resto.filter((i) => i.rareza === 'comun')
  const entrar = alEntrar
    ? () => {
        setAbierto(null)
        alEntrar()
      }
    : undefined

  return (
    <>
      {(estado === 'afuera' || estado === 'entrando') && (
        <section className="tarjeta tienda-invitacion">
          <p>
            <strong>Las monedas se ganan jugando.</strong> Entrá a tu cuenta para juntarlas y comprar: lo que comprás es tuyo para siempre.
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
        </section>
      )}
      {error && <MensajeError>{error}</MensajeError>}
      {!vitrina && !error && <p className="nota">Cargando…</p>}
      {vitrina && destacada && (
        <ItemVitrina item={destacada} tam="destacada" alAbrir={setAbierto} cambia={faltan(Date.parse(vitrina.cambia) - ahora)} />
      )}
      {medianas.length > 0 && (
        <ul className="vitrina vitrina-medianas" aria-label="Más de la vitrina">
          {medianas.map((i) => (
            <li key={i.id}>
              <ItemVitrina item={i} tam="mediana" alAbrir={setAbierto} />
            </li>
          ))}
        </ul>
      )}
      {chicas.length > 0 && (
        <ul className="vitrina vitrina-chicas" aria-label="Las comunes de hoy">
          {chicas.map((i) => (
            <li key={i.id}>
              <ItemVitrina item={i} tam="chica" alAbrir={setAbierto} />
            </li>
          ))}
        </ul>
      )}
      <Coleccion alAbrir={setAbierto} />
      {abierto && <Probador item={abierto} alCerrar={() => setAbierto(null)} alEntrar={entrar} />}
    </>
  )
}

/** Un cosmético de la vitrina: muestra, cinta de rareza, nombre y precio (o "Tuyo"). Tocándolo se prueba. */
function ItemVitrina({ item, tam, alAbrir, cambia }: { item: ItemTienda; tam: 'destacada' | 'mediana' | 'chica'; alAbrir: (i: ItemTienda) => void; cambia?: string }) {
  const [perfil] = usePerfil()
  const tenes = useInventario()
  const { estado, saldo } = useCuenta()
  const tuyo = tenes.has(item.id)
  const puesto = tuyo && estaPuesto(item, perfil)
  const noAlcanza = estado === 'adentro' && !tuyo && (saldo ?? 0) < item.precio
  const precio = tuyo ? (puesto ? 'Puesto' : 'Ya es tuyo') : `${item.precio} monedas`

  return (
    <button
      type="button"
      className={`vitrina-item vitrina-${tam} rareza-${item.rareza}${tuyo ? ' tuyo' : ''}`}
      aria-label={`${item.nombre}. ${NOMBRE_RAREZA[item.rareza]}. ${precio}. Probar`}
      onClick={() => alAbrir(item)}
    >
      <span className="cinta-rareza" aria-hidden="true">
        {NOMBRE_RAREZA[item.rareza]}
      </span>
      {cambia && (
        <span className="vitrina-cambia" aria-hidden="true">
          Cambia en {cambia}
        </span>
      )}
      <span className="vitrina-muestra">
        {/* La destacada muestra la mesa y la letra en grande; el avatar, con el encuadre de cerca. */}
        <Muestra item={item} perfil={perfil} grande={tam === 'destacada' && item.tipo !== 'avatar'} />
      </span>
      <span className="vitrina-pie">
        {tam === 'destacada' && <span className="vitrina-etiqueta">La destacada de hoy</span>}
        <span className="vitrina-nombre">{item.nombre}</span>
        <span className={`vitrina-precio${noAlcanza ? ' no-alcanza' : ''}${tuyo ? ' es-tuyo' : ''}`}>
          {tuyo ? (
            puesto ? '✓ Puesto' : 'Tuyo'
          ) : (
            <>
              <Moneda /> {item.precio}
            </>
          )}
        </span>
      </span>
    </button>
  )
}

/** Lo que ya compraste, de lo último a lo primero, para ponértelo sin buscarlo en los ajustes. */
function Coleccion({ alAbrir }: { alAbrir: (i: ItemTienda) => void }) {
  const [perfil, cambiar] = usePerfil()
  const tenes = useInventario()
  const adentro = useCuenta((s) => s.estado === 'adentro')
  if (!adentro) return null
  const items = [...tenes].map(buscarItem).filter((i): i is ItemTienda => i !== undefined).reverse()

  return (
    <section className="coleccion" aria-labelledby="titulo-coleccion">
      <h2 id="titulo-coleccion" className="coleccion-titulo">
        Tu colección {items.length > 0 && <small>{items.length}</small>}
      </h2>
      {items.length === 0 ? (
        <p className="nota-izq coleccion-vacia">Todavía no compraste nada. Lo que compres queda acá, para ponértelo cuando quieras.</p>
      ) : (
        <ul className="coleccion-lista">
          {items.map((i) => {
            const puesto = estaPuesto(i, perfil)
            return (
              <li key={i.id} className={`coleccion-item rareza-${i.rareza}`}>
                <button type="button" className="coleccion-muestra" aria-label={`Probar ${i.nombre}`} onClick={() => alAbrir(i)}>
                  <Muestra item={i} perfil={perfil} />
                </button>
                <span className="coleccion-nombre">{i.nombre}</span>
                <button
                  type="button"
                  className="boton boton-chico coleccion-usar"
                  disabled={puesto}
                  aria-label={puesto ? `${i.nombre}: puesto` : `Usar ${i.nombre}`}
                  onClick={() => cambiar(ponerItem(i, perfil))}
                >
                  {puesto ? '✓ Puesto' : 'Usar'}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
