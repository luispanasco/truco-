import { useEffect, type CSSProperties } from 'react'
import { buscarMesa, buscarTipografia, codificarAvatar, leerAvatar, type IdTipografia, type ItemTienda } from '@truco/shared'
import { useEstiloAvatar } from '../avatares/estilo'
import { Avatar } from '../componentes/Avatar'
import { Carta } from '../componentes/Carta'
import type { Perfil } from '../perfil'
import { cargarTipografia } from '../temaTipografia'
import { enfoqueDe, foco } from './items'

/**
 * Cómo te quedaría: la pieza en tu avatar (encuadrada en esa parte), la mesa con unas cartas o
 * la letra escrita. Con `con={false}` se ve lo que tenés ahora (el "sin" del probador).
 */
export function Muestra({ item, perfil, con = true, grande = false }: { item: ItemTienda; perfil: Perfil; con?: boolean; grande?: boolean }) {
  useEffect(() => {
    if (item.tipo === 'tipografia') void cargarTipografia(item.ref as IdTipografia)
  }, [item])

  if (item.tipo === 'avatar') return <MuestraAvatar item={item} perfil={perfil} con={con} grande={grande} />

  if (item.tipo === 'mesa') {
    const mesa = con ? item.ref : perfil.mesa
    return (
      <span className={`muestra-mesa muestra-tienda-mesa${grande ? ' grande' : ''}`} data-mesa={mesa} aria-hidden="true">
        {grande ? (
          <span className="muestra-mesa-cartas">
            <Carta carta={{ numero: 1, palo: 'espada' }} tam="chica" />
            <Carta carta={{ numero: 7, palo: 'oro' }} tam="chica" />
            <Carta carta={{ numero: 3, palo: 'basto' }} tam="chica" />
          </span>
        ) : (
          <Carta carta={{ numero: 1, palo: 'espada' }} tam="chica" />
        )}
      </span>
    )
  }

  const t = buscarTipografia(con ? item.ref : perfil.tipografia)
  const estilo = { fontFamily: t?.familia, '--escala-letra': t?.escala ?? 1 } as CSSProperties
  return grande ? (
    <span className="muestra-letra grande" style={estilo} aria-hidden="true">
      <strong>¡Quiero retruco!</strong>
      <span>Envido, envido. Treinta y tres son mejores.</span>
      <small>1 2 3 4 5 6 7 · 10 11 12</small>
    </span>
  ) : (
    <span className="muestra-letra" style={estilo} aria-hidden="true">
      ¡Truco!
    </span>
  )
}

function MuestraAvatar({ item, perfil, con, grande }: { item: ItemTienda; perfil: Perfil; con: boolean; grande: boolean }) {
  const estilo = useEstiloAvatar()
  const a = leerAvatar(perfil.avatar)
  const codigo = a && con ? codificarAvatar({ ...a, [item.capa!]: item.pieza! }) : perfil.avatar
  let vars: CSSProperties | undefined
  if (estilo) {
    const [vx, vy, vw, vh] = estilo.viewBox.split(' ').map(Number) as [number, number, number, number]
    const f = foco(enfoqueDe(item.capa!), estilo.cara, grande)
    // Que no se vea afuera del dibujo (debajo del torso queda vacío): el foco no se acerca al borde.
    const x = acotar(f.x, vx + vw / 2 / f.zoom, vx + vw - vw / 2 / f.zoom)
    const y = acotar(f.y, vy + vh / 2 / f.zoom, vy + vh - vh / 2 / f.zoom)
    vars = {
      '--foco': `${x}px ${y}px`,
      '--foco-mover': `${vx + vw / 2 - x}px ${vy + vh / 2 - y}px`,
      '--foco-zoom': f.zoom,
    } as CSSProperties
  }
  return (
    <span className={`muestra-avatar enfoque-${enfoqueDe(item.capa!)}`} style={vars}>
      <Avatar codigo={codigo} apodo={perfil.apodo} />
    </span>
  )
}

function acotar(n: number, min: number, max: number): number {
  return min > max ? (min + max) / 2 : Math.min(max, Math.max(min, n))
}

/** El detalle de una mesa o una letra ("Paño rojo vino y madera casi negra"); de las piezas, nada. */
export function detalleDe(item: ItemTienda): string | null {
  if (item.tipo === 'mesa') return buscarMesa(item.ref)?.detalle ?? null
  if (item.tipo === 'tipografia') return buscarTipografia(item.ref)?.detalle ?? null
  return null
}
