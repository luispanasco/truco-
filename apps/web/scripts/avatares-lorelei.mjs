/**
 * Extrae las piezas del estilo Lorelei (DiceBear, de Lisa Wischofsky, CC0 1.0) a
 * src/avatares/lorelei/piezas.ts, como plantillas de SVG nuestras.
 *
 * Cada pieza queda con marcas para lo que va adentro y para los colores:
 * - `{{cabeza}}`, `{{ojos}}`, etc.: dónde se dibuja otra capa (el pelo trae la cabeza, y la
 *   cabeza trae la cara);
 * - `{{color:pelo}}`, `{{color:piel}}`, etc.: el color que elige cada jugador.
 *
 * Uso: pnpm --filter @truco/web avatares:lorelei
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const aqui = dirname(fileURLToPath(import.meta.url))
// El paquete no exporta sus componentes sueltos: se buscan al lado de su entrada principal.
const require = createRequire(import.meta.url)
const base = join(dirname(require.resolve('@dicebear/lorelei')), 'components')
const componentes = await import(`file:///${join(base, 'index.js').replace(/\\/g, '/')}`)

/** Nombre de Lorelei → nombre nuestro de la capa. */
const CAPAS = {
  hair: 'pelo',
  head: 'cabeza',
  eyes: 'ojos',
  eyebrows: 'cejas',
  nose: 'nariz',
  mouth: 'boca',
  beard: 'barba',
  glasses: 'lentes',
  earrings: 'aros',
  freckles: 'pecas',
}
const COLORES = {
  hair: 'pelo',
  skin: 'piel',
  eyes: 'tinta',
  eyebrows: 'tinta',
  mouth: 'tinta',
  nose: 'tinta',
  glasses: 'tinta',
  earrings: 'aros',
  freckles: 'tinta',
  hairAccessories: 'tinta',
}

// Las capas de adentro se reemplazan por una marca; los colores, por otra.
const marcas = new Proxy({}, { get: (_, nombre) => ({ value: () => (CAPAS[nombre] ? `{{${CAPAS[nombre]}}}` : '') }) })
const colores = Object.fromEntries(Object.entries(COLORES).map(([k, v]) => [k, `{{color:${v}}}`]))

const piezas = {}
for (const [nombre, capa] of Object.entries(CAPAS)) {
  const variantes = componentes[nombre]
  // Orden estable: variant01, variant02, ...
  piezas[capa] = Object.keys(variantes)
    .sort()
    .map((v) => variantes[v](marcas, colores))
}

const salida = join(aqui, '..', 'src', 'avatares', 'lorelei', 'piezas.ts')
mkdirSync(dirname(salida), { recursive: true })
writeFileSync(
  salida,
  `/**
 * Piezas del estilo Lorelei (DiceBear), de Lisa Wischofsky, CC0 1.0.
 * Generado por scripts/avatares-lorelei.mjs: no editar a mano.
 */
export const PIEZAS_LORELEI = ${JSON.stringify(piezas, null, 0)} as const satisfies Record<string, readonly string[]>
`,
)
console.log(Object.entries(piezas).map(([k, v]) => `${k}: ${v.length}`).join(', '))
