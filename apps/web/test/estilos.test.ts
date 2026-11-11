import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Las hojas de estilo: cada llave que se abre se cierra. Una que falta (pasó al juntar ramas)
 * deja anidado todo lo que sigue y la compilación de producción falla al minificar, aunque en
 * desarrollo y en los tests ande.
 */
function hojas(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const ruta = join(dir, n)
    return statSync(ruta).isDirectory() ? hojas(ruta) : n.endsWith('.css') ? [ruta] : []
  })
}

describe('hojas de estilo', () => {
  it.each(hojas(join(__dirname, '../src')))('%s cierra todas sus llaves', (ruta) => {
    const css = readFileSync(ruta, 'utf-8').replace(/\/\*[\s\S]*?\*\//g, '')
    let hondo = 0
    for (const c of css) {
      if (c === '{') hondo++
      else if (c === '}') hondo--
      expect(hondo).toBeGreaterThanOrEqual(0)
    }
    expect(hondo).toBe(0)
  })
})
