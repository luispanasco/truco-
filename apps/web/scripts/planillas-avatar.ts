/**
 * Planillas para revisar los dibujos propios del avatar (ropa, sombreros, accesorios, bufandas
 * y lo que va en la boca) con las cabezas, los peinados y las bocas de Lorelei, a tamaño grande
 * y a 44 px (el de la mesa).
 * No necesita la web levantada: arma el SVG con el estilo y lo saca con Playwright.
 * Uso: node ../server/node_modules/tsx/dist/cli.mjs scripts/planillas-avatar.ts [carpeta]
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { chromium } from '@playwright/test'
import { AVATAR_BASE, CATALOGO_AVATAR, PIELES, type Avatar } from '@truco/shared'
import { LORELEI } from '../src/avatares/lorelei'

const dir = resolve(process.argv[2] ?? 'capturas/avatar')
mkdirSync(dir, { recursive: true })

const svg = (a: Avatar, px: number) =>
  `<svg viewBox="${LORELEI.viewBox}" width="${px}" height="${px}" style="background:#2e6b4a;border-radius:50%">${LORELEI.dibujar(a)}</svg>`
const celda = (a: Avatar, px: number, rotulo = '') =>
  `<figure>${svg(a, px)}${rotulo ? `<figcaption>${rotulo}</figcaption>` : ''}</figure>`
const av = (cambios: Partial<Avatar>): Avatar => ({ ...AVATAR_BASE, ...cambios })

const ropas = CATALOGO_AVATAR.ropa.map((_, i) => i)
const sombreros = CATALOGO_AVATAR.sombrero.map((_, i) => i)
const peinados = CATALOGO_AVATAR.pelo.map((_, i) => i)
const accesorios = CATALOGO_AVATAR.accesorio.map((_, i) => i)
const bufandas = CATALOGO_AVATAR.bufanda.map((_, i) => i)
const enBoca = CATALOGO_AVATAR.enBoca.map((_, i) => i)
const bocas = CATALOGO_AVATAR.boca.map((_, i) => i)
/** Las piezas criollas (las últimas de cada capa) repartidas en avatares distintos. */
const criollo = (i: number) =>
  av({
    piel: i % 6,
    cabeza: i % 4,
    pelo: (i * 11) % 48,
    colorPelo: i % 8,
    boca: (i * 5) % 27,
    barba: i % 3,
    ropa: ropas.length - 1 - (i % 2),
    sombrero: i % 3 === 0 ? 0 : 5,
    accesorio: accesorios.length - 1 - (i % 6),
    bufanda: i % 4 === 0 ? 0 : bufandas.length - 1 - (i % 3),
    enBoca: i % 4,
  })

const planillas: Record<string, string> = {
  // Todas las ropas, grandes y a 44 px, con pieles y cabezas distintas.
  ropas:
    `<h2>Ropas</h2><div class="fila">${ropas.map((r) => celda(av({ ropa: r, piel: r % 6, cabeza: r % 4, pelo: (r * 3) % 48 }), 220, CATALOGO_AVATAR.ropa[r]!.nombre)).join('')}</div>` +
    `<h2>44 px</h2><div class="fila">${ropas.map((r) => celda(av({ ropa: r, piel: r % 6, cabeza: r % 4, pelo: (r * 3) % 48 }), 44)).join('')}</div>` +
    `<h2>Mate</h2><div class="fila">${PIELES.map((_, p) => celda(av({ ropa: p, piel: p, accesorio: 1, pelo: p * 5, cabeza: p % 4 }), 220)).join('')}${PIELES.map((_, p) => celda(av({ ropa: p, piel: p, accesorio: 1, pelo: p * 5 }), 44)).join('')}</div>`,
  // Cada sombrero con los 48 peinados.
  ...Object.fromEntries(
    sombreros.slice(1).map((s) => [
      `sombrero-${s}`,
      `<h2>${CATALOGO_AVATAR.sombrero[s]!.nombre}</h2><div class="fila">${peinados.map((p) => celda(av({ sombrero: s, pelo: p, cabeza: p % 4, colorPelo: p % 8, ropa: p % 10 }), 150, `${p + 1}`)).join('')}</div>` +
        `<div class="fila">${peinados.map((p) => celda(av({ sombrero: s, pelo: p, cabeza: p % 4, colorPelo: p % 8, ropa: p % 10 }), 44)).join('')}</div>`,
    ]),
  ),
  // Cada accesorio con pieles y ropas distintas.
  accesorios:
    `<h2>Accesorios</h2><div class="fila">${accesorios.map((x) => celda(av({ accesorio: x, piel: x % 6, ropa: (x * 3) % ropas.length, pelo: (x * 5) % 48, cabeza: x % 4 }), 200, CATALOGO_AVATAR.accesorio[x]!.nombre)).join('')}</div>` +
    `<div class="fila">${accesorios.map((x) => celda(av({ accesorio: x, piel: (x + 3) % 6, ropa: x % ropas.length, pelo: (x * 7) % 48 }), 44)).join('')}</div>`,
  // Bufandas y pañuelos sobre ropas distintas.
  cuello:
    `<h2>Bufandas y pañuelos</h2><div class="fila">${bufandas.map((b) => celda(av({ bufanda: b, piel: b % 6, ropa: (b * 5) % ropas.length, pelo: (b * 7) % 48 }), 200, CATALOGO_AVATAR.bufanda[b]!.nombre)).join('')}</div>` +
    `<div class="fila">${bufandas.map((b) => celda(av({ bufanda: b, piel: b % 6, ropa: (b * 5) % ropas.length, pelo: (b * 7) % 48, accesorio: b % accesorios.length }), 44)).join('')}</div>`,
  // Lo que va en la boca con las 27 bocas, con barba y con el mate en la mano.
  ...Object.fromEntries(
    enBoca.slice(1).map((e) => [
      `boca-${e}`,
      `<h2>${CATALOGO_AVATAR.enBoca[e]!.nombre}</h2><div class="fila">${bocas.map((b) => celda(av({ enBoca: e, boca: b, piel: b % 6, cabeza: b % 4, pelo: (b * 5) % 48, barba: b % 3 }), 150, `${b + 1}`)).join('')}</div>` +
        `<h2>Con mate, sombrero de gaucho y poncho</h2><div class="fila">${PIELES.map((_, p) => celda(av({ enBoca: e, boca: p * 4, piel: p, accesorio: 1 + (p % 3), sombrero: 5, ropa: ropas.length - 2, pelo: p * 7 }), 150)).join('')}</div>` +
        `<div class="fila">${bocas.map((b) => celda(av({ enBoca: e, boca: b, piel: b % 6, cabeza: b % 4, pelo: (b * 5) % 48, barba: b % 3 }), 44)).join('')}</div>`,
    ]),
  ),
  // Un gaucho completo con pieles, peinados y bocas distintas.
  criollos: `<div class="fila">${Array.from({ length: 12 }, (_, i) => celda(criollo(i), 200)).join('')}</div><div class="fila">${Array.from({ length: 12 }, (_, i) => celda(criollo(i), 44)).join('')}</div>`,
  // Una mezcla, como se vería una mesa.
  mezcla: `<div class="fila">${Array.from({ length: 24 }, (_, i) =>
    celda(av({ ropa: i % 10, sombrero: i % 5, accesorio: i % 3 === 0 ? 1 : 0, pelo: (i * 7) % 48, cabeza: i % 4, piel: i % 6, colorPelo: i % 11, ojos: i % 24, boca: i % 27 }), 160),
  ).join('')}</div><div class="fila">${Array.from({ length: 24 }, (_, i) =>
    celda(av({ ropa: i % 10, sombrero: i % 5, accesorio: i % 3 === 0 ? 1 : 0, pelo: (i * 7) % 48, cabeza: i % 4, piel: i % 6, colorPelo: i % 11, ojos: i % 24, boca: i % 27 }), 44),
  ).join('')}</div>`,
}

const navegador = await chromium.launch()
const pagina = await navegador.newPage({ viewport: { width: 1400, height: 800 } })
for (const [nombre, cuerpo] of Object.entries(planillas)) {
  const html = `<!doctype html><meta charset="utf-8"><style>body{font:14px sans-serif;background:#f3efe6;margin:12px}.fila{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}figure{margin:0;text-align:center}figcaption{font-size:12px}</style>${cuerpo}`
  const archivo = join(dir, `${nombre}.html`)
  writeFileSync(archivo, html)
  await pagina.goto(`file:///${archivo.replace(/\\/g, '/')}`)
  await pagina.screenshot({ path: join(dir, `${nombre}.png`), fullPage: true })
  console.log(join(dir, `${nombre}.png`))
}
await navegador.close()
