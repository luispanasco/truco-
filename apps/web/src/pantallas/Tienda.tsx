import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  NOMBRE_RAREZA,
  buscarTipografia,
  codificarAvatar,
  leerAvatar,
  type IdMesa,
  type IdTipografia,
  type ItemTienda,
} from '@truco/shared'
import { Avatar } from '../componentes/Avatar'
import { Carta } from '../componentes/Carta'
import { CabeceraOnline, MensajeError } from '../componentes/Online'
import { usePerfil } from '../componentes/TarjetaPerfil'
import { comprarEnTienda, direccionApi, iniciarCuenta, useCuenta } from '../cuenta/cuenta'
import { useInventario } from '../cuenta/inventario'
import { cargarTipografia } from '../temaTipografia'
import type { Perfil } from '../perfil'
import '../estilos-mesas.css'

interface Vitrina {
  dia: string
  cambia: string
  items: ItemTienda[]
}

/**
 * La tienda: seis cosméticos por día, los mismos para todos, que cambian a la medianoche de
 * Uruguay. Lo comprado es tuyo para siempre y se puede usar desde acá mismo.
 */
export function Tienda() {
  const [vitrina, setVitrina] = useState<Vitrina | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [ahora, setAhora] = useState(() => Date.now())
  const { estado, saldo } = useCuenta()
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

  // El reloj del cambio de vitrina, de a un minuto.
  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="pantalla-inicio pantalla-online">
      <CabeceraOnline titulo="Tienda" />
      <section className="tarjeta tienda-cabecera">
        {estado === 'adentro' ? (
          <p className="cuenta-saldo">
            <span aria-hidden="true">🪙</span> <strong>{saldo ?? 0}</strong> monedas
          </p>
        ) : (
          <p className="nota-izq">
            Para comprar, <Link to="/">entrá a tu cuenta</Link> desde el inicio. Las monedas se ganan jugando.
          </p>
        )}
        {vitrina && <p className="nota-izq">La vitrina cambia en {faltan(Date.parse(vitrina.cambia) - ahora)}.</p>}
        {error && <MensajeError>{error}</MensajeError>}
      </section>
      {!vitrina && !error && <p className="nota">Cargando…</p>}
      {vitrina && (
        <ul className="vitrina">
          {vitrina.items.map((i) => (
            <ItemVitrina key={i.id} item={i} />
          ))}
        </ul>
      )}
    </div>
  )
}

function ItemVitrina({ item }: { item: ItemTienda }) {
  const [perfil, cambiar] = usePerfil()
  const tenes = useInventario()
  const { estado, saldo } = useCuenta()
  const [comprando, setComprando] = useState(false)
  const [motivo, setMotivo] = useState<string | null>(null)
  const tuyo = tenes.has(item.id)
  const puesto = estaPuesto(item, perfil)
  const alcanza = (saldo ?? 0) >= item.precio

  const comprar = async () => {
    setComprando(true)
    setMotivo(await comprarEnTienda(item.id))
    setComprando(false)
  }

  return (
    <li className={`vitrina-item rareza-${item.rareza}`}>
      <span className="vitrina-rareza">{NOMBRE_RAREZA[item.rareza]}</span>
      <div className="vitrina-muestra">
        <Muestra item={item} perfil={perfil} />
      </div>
      <strong className="vitrina-nombre">{item.nombre}</strong>
      {tuyo ? (
        <button type="button" className="boton boton-secundario" disabled={puesto} onClick={() => cambiar(ponerItem(item, perfil))}>
          {puesto ? 'Puesto' : 'Usar'}
        </button>
      ) : (
        <button
          type="button"
          className="boton"
          aria-label={`Comprar ${item.nombre} por ${item.precio} monedas`}
          disabled={estado !== 'adentro' || !alcanza || comprando}
          onClick={() => void comprar()}
        >
          🪙 {item.precio}
        </button>
      )}
      {motivo && <MensajeError>{motivo}</MensajeError>}
    </li>
  )
}

/** Cómo te quedaría: la pieza en tu avatar, la mesa con una carta, la letra escrita. */
function Muestra({ item, perfil }: { item: ItemTienda; perfil: Perfil }) {
  useEffect(() => {
    if (item.tipo === 'tipografia') void cargarTipografia(item.ref as IdTipografia)
  }, [item])
  if (item.tipo === 'avatar') {
    const a = leerAvatar(perfil.avatar)
    const codigo = a ? codificarAvatar({ ...a, [item.capa!]: item.pieza! }) : perfil.avatar
    return <Avatar codigo={codigo} apodo={perfil.apodo} />
  }
  if (item.tipo === 'mesa') {
    return (
      <span className="muestra-mesa" data-mesa={item.ref} aria-hidden="true">
        <Carta carta={{ numero: 1, palo: 'espada' }} tam="chica" />
      </span>
    )
  }
  const t = buscarTipografia(item.ref)
  return (
    <span className="vitrina-letra" style={{ fontFamily: t?.familia }} aria-hidden="true">
      ¡Truco!
    </span>
  )
}

function estaPuesto(item: ItemTienda, p: Perfil): boolean {
  if (item.tipo === 'mesa') return p.mesa === item.ref
  if (item.tipo === 'tipografia') return p.tipografia === item.ref
  return leerAvatar(p.avatar)?.[item.capa!] === item.pieza
}

function ponerItem(item: ItemTienda, p: Perfil): Partial<Perfil> {
  if (item.tipo === 'mesa') return { mesa: item.ref as IdMesa }
  if (item.tipo === 'tipografia') return { tipografia: item.ref as IdTipografia }
  const a = leerAvatar(p.avatar)
  return a ? { avatar: codificarAvatar({ ...a, [item.capa!]: item.pieza! }) } : {}
}

function faltan(ms: number): string {
  const min = Math.max(1, Math.ceil(ms / 60_000))
  const h = Math.floor(min / 60)
  return h > 0 ? `${h} h ${min % 60} min` : `${min} min`
}
