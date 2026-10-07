import { describe, expect, it } from 'vitest'
import { AVATAR_BASE, CATALOGO_AVATAR, PIELES } from '@truco/shared'
import { LORELEI } from '../src/avatares/lorelei'
import { ACCESORIOS, BUFANDAS, ROPAS, SOMBREROS } from '../src/avatares/lorelei/propias'

/** Lo parsea como SVG de verdad: un atributo repetido o una etiqueta mal cerrada fallan. */
function parsear(contenido: string): Document {
  const doc = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${LORELEI.viewBox}">${contenido}</svg>`, 'image/svg+xml')
  expect(doc.querySelector('parsererror')).toBeNull()
  return doc
}

describe('dibujos propios de Lorelei', () => {
  it('hay un dibujo por cada pieza del catálogo', () => {
    expect(ROPAS).toHaveLength(CATALOGO_AVATAR.ropa.length)
    expect(SOMBREROS).toHaveLength(CATALOGO_AVATAR.sombrero.length - 1)
    expect(ACCESORIOS).toHaveLength(CATALOGO_AVATAR.accesorio.length - 1)
    expect(BUFANDAS).toHaveLength(CATALOGO_AVATAR.bufanda.length - 1)
  })

  it('cada accesorio y cada bufanda arman un SVG válido, y la bufanda va debajo de la mano', () => {
    for (let accesorio = 0; accesorio <= ACCESORIOS.length; accesorio++) {
      for (let bufanda = 0; bufanda <= BUFANDAS.length; bufanda++) {
        parsear(LORELEI.dibujar({ ...AVATAR_BASE, accesorio, bufanda }))
      }
    }
    const doc = parsear(LORELEI.dibujar({ ...AVATAR_BASE, accesorio: 1, bufanda: 1 }))
    expect(doc.querySelector('.capa-bufanda')!.nextElementSibling?.classList.contains('capa-accesorio')).toBe(true)
    expect(LORELEI.dibujar(AVATAR_BASE)).not.toContain('capa-bufanda')
  })

  it('cada combinación arma un SVG válido', () => {
    for (let ropa = 0; ropa < ROPAS.length; ropa++) {
      for (let sombrero = 0; sombrero <= SOMBREROS.length; sombrero++) {
        parsear(LORELEI.dibujar({ ...AVATAR_BASE, ropa, sombrero, accesorio: ropa % 2 }))
      }
    }
  })

  it('la ropa va entre la cabeza y el pelo de adelante, y el sombrero recorta el pelo', () => {
    const doc = parsear(LORELEI.dibujar({ ...AVATAR_BASE, pelo: 1, sombrero: 2 }))
    const cabeza = doc.querySelector('.capa-cabeza')!
    expect(cabeza.nextElementSibling?.classList.contains('capa-ropa')).toBe(true)
    const recortado = doc.querySelector('[clip-path]')!
    expect(recortado.querySelector('.capa-pelo')).not.toBeNull()
    expect(doc.getElementById(recortado.getAttribute('clip-path')!.slice(5, -1))).not.toBeNull()
    // Sin sombrero no hay recorte.
    expect(LORELEI.dibujar({ ...AVATAR_BASE, pelo: 1 })).not.toContain('clip-path')
  })

  it('la mano del mate usa el color de piel', () => {
    for (const [i, piel] of PIELES.entries()) {
      expect(LORELEI.dibujar({ ...AVATAR_BASE, piel: i, accesorio: 1 })).toMatch(new RegExp(`capa-accesorio.*fill="${piel}"`))
    }
  })
})
