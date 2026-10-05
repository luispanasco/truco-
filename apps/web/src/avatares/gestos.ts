import type { Senia } from '@truco/bots'

/**
 * Gestos que sabe hacer la cara del avatar: las 11 señas y "disimulo", que es lo que se ve
 * cuando pescás a un rival haciendo una seña pero la sala no deja saber cuál.
 */
export type GestoAvatar = Senia | 'disimulo'

/**
 * Piezas nuestras que se agregan al SVG del avatar para las señas (clase `gesto-{nombre}`).
 * Los ojos se parten en dos mitades (`ojo-izq`, `ojo-der`) para poder guiñar uno solo, y
 * las cejas tienen una copia encima del pelo (`cejas`) para levantarlas sin que se tapen.
 */
export const PIEZAS_GESTO = [
  'ojo-izq',
  'ojo-der',
  'cejas',
  'guinio-izq',
  'guinio-der',
  'arrugas',
  'beso',
  'corazon',
  'dientes',
  'boca-abierta',
  'lengua',
  'cachete-izq',
  'cachete-der',
] as const

/** Una caja en unidades del SVG. */
interface Caja {
  x: number
  y: number
  w: number
  h: number
}

/** Una zona de la cara, en % de la caja del SVG (para ubicar botones encima). */
export interface ZonaCara {
  x: number
  y: number
  ancho: number
  alto: number
}

export type ParteCara = 'cejas' | 'ojoIzq' | 'ojoDer' | 'nariz' | 'boca' | 'peraIzq' | 'peraDer' | 'cacheteIzq' | 'cacheteDer'
export type ZonasCara = Record<ParteCara, ZonaCara>

const NS = 'http://www.w3.org/2000/svg'
let unico = 0

function el(tag: string, attrs: Record<string, string | number>, padre: Element): SVGElement {
  const e = document.createElementNS(NS, tag)
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(Math.round(Number(v) * 10) / 10 || v))
  padre.appendChild(e)
  return e
}

/** La caja de una capa en su propio sistema (null si no se puede medir: jsdom, o el SVG está oculto). */
function medir(nodo: Element | null): Caja | null {
  if (!nodo || !('getBBox' in nodo)) return null
  try {
    const b = (nodo as SVGGraphicsElement).getBBox()
    return b.width > 0 && b.height > 0 ? { x: b.x, y: b.y, w: b.width, h: b.height } : null
  } catch {
    return null
  }
}

/** Cajas de repuesto, como fracción de la cara que da el estilo (cuando no se puede medir). */
function deRepuesto(cara: Caja, fx: number, fy: number, fw: number, fh: number): Caja {
  return { x: cara.x + cara.w * fx, y: cara.y + cara.h * fy, w: cara.w * fw, h: cara.h * fh }
}

/**
 * Qué columnas de los ojos tienen tinta (41 columnas a lo ancho). Sirve para saber dónde
 * termina un ojo y empieza el otro, sea cual sea la pieza. null si no se puede mirar.
 */
function columnasConTinta(ojos: Element, o: Caja): boolean[] | null {
  const trazos = [...ojos.querySelectorAll('path, ellipse, circle, rect, polygon')] as SVGGeometryElement[]
  if (trazos.length === 0 || typeof trazos[0]!.isPointInFill !== 'function') return null
  const svg = (ojos as SVGGraphicsElement).ownerSVGElement
  if (!svg) return null
  try {
    const p = svg.createSVGPoint()
    return Array.from({ length: 41 }, (_, i) => {
      p.x = o.x + (o.w * i) / 40
      for (let j = 0; j <= 10; j++) {
        p.y = o.y + (o.h * j) / 10
        if (trazos.some((t) => t.isPointInFill(p) || t.isPointInStroke(p))) return true
      }
      return false
    })
  } catch {
    return null
  }
}

/** Dónde cortar los ojos (fracción del ancho) y hasta dónde llega cada ojo. */
function partirOjos(ojos: Element, o: Caja): { corte: number; izq: [number, number]; der: [number, number] } {
  const tinta = columnasConTinta(ojos, o)
  const porDefecto = { corte: 0.5, izq: [0.04, 0.46] as [number, number], der: [0.54, 0.96] as [number, number] }
  if (!tinta) return porDefecto
  // El entrecejo: la tira sin tinta más larga entre el 25 % y el 75 % del ancho.
  let mejor: [number, number] | null = null
  let desde = -1
  for (let i = 10; i <= 31; i++) {
    if (!tinta[i]) {
      if (desde < 0) desde = i
      if (!mejor || i - desde > mejor[1] - mejor[0]) mejor = [desde, i]
    } else desde = -1
  }
  if (!mejor) return porDefecto
  const corte = (mejor[0] + mejor[1]) / 2 / 40
  const primera = tinta.indexOf(true)
  const ultima = tinta.lastIndexOf(true)
  return { corte, izq: [Math.max(0, primera) / 40, (mejor[0] - 1) / 40], der: [(mejor[1] + 1) / 40, Math.max(0, ultima) / 40] }
}

/**
 * Prepara la cara del avatar para las señas: parte los ojos en dos mitades y agrega las
 * piezas nuestras (ojo cerrado, arrugas, beso y corazón, dientes, boca abierta, lengua y
 * cachetes inflados), ubicadas con las cajas de las capas. Todo queda quieto y oculto: lo
 * mueve el CSS según `data-gesto` (gestos.css). `cara` es la del estilo, por si no se
 * puede medir. Se puede llamar más de una vez: si ya está preparada, no hace nada.
 */
export function prepararCara(svg: SVGSVGElement, cara: { x: number; y: number; ancho: number; alto: number }): void {
  if (svg.querySelector('.gesto-piezas')) return
  const ojos = svg.querySelector('.capa-ojos')
  const boca = svg.querySelector('.capa-boca')
  const padre = boca?.parentNode ?? ojos?.parentNode ?? svg.querySelector('.avatar-todo') ?? svg
  const fc: Caja = { x: cara.x, y: cara.y, w: cara.ancho, h: cara.alto }
  // Las piezas van en el sistema de la cabeza (el padre de las capas de la cara).
  // Medida de las piezas: un poco más grandes que un centésimo de la cabeza, para que se lean chicas.
  const u = ((medir(svg.querySelector('.capa-cabeza')) ?? { w: fc.w * 1.15 }).w / 100) * 1.5
  const O = medir(ojos) ?? deRepuesto(fc, 0.15, 0.25, 0.68, 0.12)
  const B = medir(boca) ?? deRepuesto(fc, 0.38, 0.62, 0.32, 0.1)
  const N = medir(svg.querySelector('.capa-nariz')) ?? deRepuesto(fc, 0.55, 0.36, 0.13, 0.22)

  // Los ojos, en dos mitades recortadas: así se cierra uno solo.
  const corte = ojos ? partirOjos(ojos, O) : { corte: 0.5, izq: [0.04, 0.46] as [number, number], der: [0.54, 0.96] as [number, number] }
  const xc = O.x + O.w * corte.corte
  svg.dataset.corteOjos = corte.corte.toFixed(3)
  if (ojos) {
    const defs = el('defs', {}, svg)
    for (const lado of ['izq', 'der'] as const) {
      const id = `ojo-${++unico}`
      const recorte = el('clipPath', { id, clipPathUnits: 'userSpaceOnUse' }, defs)
      const x0 = lado === 'izq' ? O.x - O.w : xc
      const x1 = lado === 'izq' ? xc : O.x + O.w * 2
      el('rect', { x: x0, y: O.y - O.h * 2, width: x1 - x0, height: O.h * 5 }, recorte)
      const mitad = document.createElementNS(NS, 'g')
      mitad.setAttribute('class', `ojo-mitad gesto-ojo-${lado}`)
      mitad.setAttribute('clip-path', `url(#${id})`)
      for (const hijo of ojos.childNodes) mitad.appendChild(hijo.cloneNode(true))
      ojos.parentNode!.insertBefore(mitad, ojos.nextSibling)
    }
    ojos.setAttribute('visibility', 'hidden')
  }

  // Una copia de las cejas encima de todo (el pelo y el sombrero suelen taparlas al subir).
  const cejas = svg.querySelector('.capa-cejas') as SVGGraphicsElement | null
  const todo = (svg.querySelector('.avatar-todo') ?? svg) as SVGGraphicsElement
  if (cejas) {
    const copia = document.createElementNS(NS, 'g')
    copia.setAttribute('class', 'gesto-pieza gesto-cejas')
    for (const hijo of cejas.childNodes) copia.appendChild(hijo.cloneNode(true))
    let afuera = false
    try {
      const m = todo.getCTM()?.inverse().multiply(cejas.getCTM()!)
      if (m) {
        copia.setAttribute('transform', `matrix(${m.a} ${m.b} ${m.c} ${m.d} ${m.e} ${m.f})`)
        todo.appendChild(copia)
        afuera = true
      }
    } catch {
      // Sin getCTM (jsdom): va al lado de las cejas.
    }
    if (!afuera) cejas.parentNode?.insertBefore(copia, cejas.nextSibling)
  }

  const g = document.createElementNS(NS, 'g')
  g.setAttribute('class', 'gesto-piezas')
  if (boca?.parentNode === padre) padre.insertBefore(g, boca.nextSibling)
  else padre.appendChild(g)
  const pieza = (nombre: string) => el('g', { class: `gesto-pieza gesto-${nombre}` }, g)
  const ojoY = O.y + O.h * 0.55
  const bx = B.x + B.w / 2
  const by = B.y + B.h / 2

  // Guiños: el ojo cerrado, una curvita.
  for (const lado of ['izq', 'der'] as const) {
    const [a, b] = corte[lado]
    const x0 = O.x + O.w * a
    const x1 = O.x + O.w * b
    const caida = Math.min((x1 - x0) * 0.25, u * 5)
    el('path', { class: 'gesto-trazo', d: `M${x0} ${ojoY}Q${(x0 + x1) / 2} ${ojoY + caida * 2} ${x1} ${ojoY}`, 'stroke-width': u * 2.6 }, pieza(`guinio-${lado}`))
  }

  // Nariz fruncida: arruguitas a los costados.
  const arrugas = pieza('arrugas')
  for (const s of [-1, 1]) {
    const cx = N.x + N.w / 2 + s * (N.w / 2 + u * 3.5)
    for (const dy of [0.1, 0.32]) {
      const y = N.y + N.h * dy
      el('path', { class: 'gesto-trazo', d: `M${cx + s * u * 2.6} ${y}L${cx - s * u * 2.2} ${y + u * 2}`, 'stroke-width': u * 1.7 }, arrugas)
    }
  }

  // Beso: piquito y un corazón que sube.
  const rb = Math.min(Math.max(B.w * 0.25, u * 5), u * 7)
  const beso = pieza('beso')
  el('ellipse', { class: 'gesto-labios', cx: bx, cy: by, rx: rb, ry: rb * 1.15, 'stroke-width': u * 1.6 }, beso)
  el('ellipse', { class: 'gesto-oscuro', cx: bx, cy: by, rx: rb * 0.35, ry: rb * 0.45, 'stroke-width': u * 0.8 }, beso)
  const r = u * 6
  const hx = B.x + B.w + u * 4
  const hy = B.y - u * 4
  el(
    'path',
    {
      class: 'gesto-corazon-dibujo',
      d: `M${hx} ${hy + r * 0.9}C${hx - r * 1.3} ${hy + r * 0.05} ${hx - r * 0.95} ${hy - r * 1.05} ${hx} ${hy - r * 0.35}C${hx + r * 0.95} ${hy - r * 1.05} ${hx + r * 1.3} ${hy + r * 0.05} ${hx} ${hy + r * 0.9}Z`,
      'stroke-width': u * 1.2,
    },
    pieza('corazon'),
  )

  // Morderse el labio: dos dientes sobre el labio de abajo.
  const dientes = pieza('dientes')
  for (const dx of [-u * 4.6, u * 0.2]) {
    el('rect', { class: 'gesto-diente', x: bx + dx, y: by - u * 1.2, width: u * 4.4, height: u * 4.6, rx: u * 1, 'stroke-width': u * 1.1 }, dientes)
  }

  // Boca abierta, con la lengua al fondo.
  const ra = Math.min(Math.max(B.w * 0.35, u * 6.5), u * 9)
  const abierta = pieza('boca-abierta')
  el('ellipse', { class: 'gesto-oscuro', cx: bx, cy: by + u * 0.6, rx: ra, ry: ra * 1.25, 'stroke-width': u * 1.6 }, abierta)
  el('ellipse', { class: 'gesto-lengua-dibujo', cx: bx, cy: by + u * 0.6 + ra * 0.72, rx: ra * 0.62, ry: ra * 0.38, 'stroke-width': u * 1 }, abierta)

  // Lengua afuera: cuelga desde el medio de la boca.
  const lw = u * 5
  const ll = u * 13
  const lengua = pieza('lengua')
  el('path', { class: 'gesto-lengua-dibujo', d: `M${bx - lw} ${by}C${bx - lw} ${by + ll * 1.15} ${bx + lw} ${by + ll * 1.15} ${bx + lw} ${by}Z`, 'stroke-width': u * 1.4 }, lengua)
  el('path', { class: 'gesto-trazo', d: `M${bx} ${by + u * 0.8}L${bx} ${by + ll * 0.55}`, 'stroke-width': u * 1 }, lengua)

  // Cachetes inflados (flor): se salen del contorno de la cara, como un sapo.
  const yc = O.y + O.h + (by - O.y - O.h) * 0.55
  const rc = u * 11
  for (const [lado, cx] of [
    ['izq', O.x - u * 2],
    ['der', O.x + O.w + u * 2],
  ] as const) {
    const c = pieza(`cachete-${lado}`)
    el('circle', { class: 'gesto-cachete', cx, cy: yc, r: rc, 'stroke-width': u * 1.6 }, c)
    el('circle', { class: 'gesto-rubor', cx: cx + (lado === 'izq' ? -1 : 1) * u * 2, cy: yc + u * 2, r: rc * 0.45 }, c)
  }
}

/**
 * Las partes que se tocan en la cara de señas, medidas sobre las capas reales del avatar
 * (en % de la caja del SVG). null si no se puede medir (jsdom o el SVG está oculto).
 */
export function medirZonas(svg: SVGSVGElement): ZonasCara | null {
  const R = svg.getBoundingClientRect()
  if (!R.width || !R.height) return null
  const caja = (sel: string) => {
    const n = svg.querySelector(sel)
    if (!n) return null
    const b = n.getBoundingClientRect()
    if (!b.width || !b.height) return null
    return { x: ((b.left - R.left) / R.width) * 100, y: ((b.top - R.top) / R.height) * 100, w: (b.width / R.width) * 100, h: (b.height / R.height) * 100 }
  }
  const O = caja('.capa-ojos')
  const C = caja('.capa-cejas')
  const N = caja('.capa-nariz')
  const B = caja('.capa-boca')
  if (!O || !C || !N || !B) return null
  const corte = Number(svg.dataset.corteOjos ?? 0.5)
  const xc = O.x + O.w * corte
  const ojosAbajo = O.y + O.h
  const bocaAbajo = B.y + B.h
  const bx = B.x + B.w / 2
  // Tamaño mínimo de cada zona (en %): que se pueda tocar con el dedo.
  const MIN = 13
  const zona = (x0: number, y0: number, x1: number, y1: number): ZonaCara => {
    let [ancho, alto] = [x1 - x0, y1 - y0]
    let [x, y] = [x0, y0]
    if (ancho < MIN) [x, ancho] = [x - (MIN - ancho) / 2, MIN]
    if (alto < MIN * 0.8) [y, alto] = [y - (MIN * 0.8 - alto) / 2, MIN * 0.8]
    return { x, y, ancho, alto }
  }
  const altoPera = Math.max(B.h * 1.3, O.h * 0.9, 11)
  const yCachete = ojosAbajo + (B.y + B.h / 2 - ojosAbajo) * 0.5
  const altoCachete = Math.max(B.y + B.h / 2 - ojosAbajo, 12)
  const anchoCachete = Math.max(O.w * 0.3, 14)
  return {
    cejas: zona(Math.min(C.x, O.x), C.y - 2, Math.max(C.x + C.w, O.x + O.w), Math.min(C.y + C.h, O.y + O.h * 0.25)),
    ojoIzq: zona(O.x - 1, Math.min(C.y + C.h, O.y + O.h * 0.25), xc - 1, ojosAbajo),
    ojoDer: zona(xc + 1, Math.min(C.y + C.h, O.y + O.h * 0.25), O.x + O.w + 1, ojosAbajo),
    nariz: zona(N.x - 2, Math.max(N.y, ojosAbajo - O.h * 0.2), N.x + N.w + 2, Math.min(N.y + N.h, B.y)),
    boca: zona(B.x - 2, B.y - 1, B.x + B.w + 2, bocaAbajo + 1),
    peraIzq: zona(bx - Math.max(B.w * 0.6, 12), bocaAbajo + 1, bx, bocaAbajo + 1 + altoPera),
    peraDer: zona(bx, bocaAbajo + 1, bx + Math.max(B.w * 0.6, 12), bocaAbajo + 1 + altoPera),
    cacheteIzq: zona(O.x - anchoCachete * 0.35, yCachete - altoCachete / 2, O.x + anchoCachete * 0.65, yCachete + altoCachete / 2),
    cacheteDer: zona(O.x + O.w - anchoCachete * 0.65, yCachete - altoCachete / 2, O.x + O.w + anchoCachete * 0.35, yCachete + altoCachete / 2),
  }
}
