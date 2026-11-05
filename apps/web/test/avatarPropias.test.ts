import { describe, expect, it } from 'vitest'
import { AVATAR_BASE, CATALOGO_AVATAR, codificarAvatar, COLORES_PELO, normalizarAvatar, PERSONAJES, PIELES, personajesParaBots, TODO_PERMITIDO } from '@truco/shared'
import { LORELEI } from '../src/avatares/lorelei'
import { ACCESORIOS, BIGOTES, BUFANDAS, EN_BOCA, ROPAS, SOMBREROS } from '../src/avatares/lorelei/propias'
import { PIEZAS_LORELEI } from '../src/avatares/lorelei/piezas'

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
    expect(EN_BOCA).toHaveLength(CATALOGO_AVATAR.enBoca.length - 1)
    // Las barbas: las de Lorelei y, después, los bigotes.
    expect(PIEZAS_LORELEI.barba.length + BIGOTES.length).toBe(CATALOGO_AVATAR.barba.length - 1)
  })

  it('los bigotes van arriba de la boca, del color del pelo, con cada boca y con lo que va en la boca', () => {
    for (let barba = 3; barba < CATALOGO_AVATAR.barba.length; barba++) {
      for (let boca = 0; boca < CATALOGO_AVATAR.boca.length; boca++) {
        const doc = parsear(LORELEI.dibujar({ ...AVATAR_BASE, barba, boca, enBoca: 1, colorPelo: 3 }))
        const bigote = doc.querySelector('.capa-bigote')!
        expect(bigote.previousElementSibling?.classList.contains('capa-enBoca')).toBe(true)
        expect(bigote.querySelector('path')!.getAttribute('fill')).toBe(COLORES_PELO[3])
      }
    }
    expect(LORELEI.dibujar({ ...AVATAR_BASE, barba: 2 })).not.toContain('capa-bigote')
  })

  it('lo que va en la boca arma un SVG válido con cada accesorio y con cada bufanda o pañuelo', () => {
    // Accesorio con bufanda ya lo prueba el test de abajo.
    for (let enBoca = 0; enBoca <= EN_BOCA.length; enBoca++) {
      for (let accesorio = 0; accesorio <= ACCESORIOS.length; accesorio++) {
        parsear(LORELEI.dibujar({ ...AVATAR_BASE, accesorio, enBoca, ropa: accesorio % ROPAS.length }))
      }
      for (let bufanda = 0; bufanda <= BUFANDAS.length; bufanda++) {
        parsear(LORELEI.dibujar({ ...AVATAR_BASE, bufanda, enBoca, ropa: ROPAS.length - 1 - (bufanda % 2) }))
      }
    }
  })

  it('lo que va en la boca va con cada boca y cada barba, justo después de la boca y fuera de su capa', () => {
    for (let boca = 0; boca < CATALOGO_AVATAR.boca.length; boca++) {
      for (let barba = 0; barba < CATALOGO_AVATAR.barba.length; barba++) {
        for (let enBoca = 1; enBoca <= EN_BOCA.length; enBoca++) {
          const doc = parsear(LORELEI.dibujar({ ...AVATAR_BASE, boca, barba, enBoca, sombrero: SOMBREROS.length }))
          const pieza = doc.querySelector('.capa-enBoca')!
          // Las señas miden la caja de la boca: lo que va en la boca no la agranda.
          expect(pieza.previousElementSibling?.classList.contains('capa-boca')).toBe(true)
          expect(doc.querySelector('.capa-boca .capa-enBoca')).toBeNull()
        }
      }
    }
    expect(LORELEI.dibujar(AVATAR_BASE)).not.toContain('capa-enBoca')
    // Son todas las combinaciones (con los bigotes, más de 400 SVG): con la máquina cargada tarda.
  }, 30_000)

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
    const recortado = doc.querySelector('[clip-path*="sombrero"]')!
    expect(recortado.querySelector('.capa-pelo')).not.toBeNull()
    expect(doc.getElementById(recortado.getAttribute('clip-path')!.slice(5, -1))).not.toBeNull()
    // Sin sombrero no hay recorte del pelo.
    expect(LORELEI.dibujar({ ...AVATAR_BASE, pelo: 1 })).not.toContain('recorte-sombrero')
  })

  it('el cuello: la cabeza se recorta debajo de la pera y los costados del cuello van con la ropa', () => {
    for (let cabeza = 0; cabeza < 4; cabeza++) {
      const doc = parsear(LORELEI.dibujar({ ...AVATAR_BASE, cabeza }))
      const id = doc.querySelector('.capa-cabeza')!.getAttribute('clip-path')!.slice(5, -1)
      expect(id).toBe(`lorelei-recorte-cuello-${cabeza}`)
      expect(doc.getElementById(id)).not.toBeNull()
      expect(doc.querySelector('.capa-ropa > path')!.getAttribute('stroke')).toBe('#000')
    }
  })

  it('la mano del mate usa el color de piel', () => {
    for (const [i, piel] of PIELES.entries()) {
      expect(LORELEI.dibujar({ ...AVATAR_BASE, piel: i, accesorio: 1 })).toMatch(new RegExp(`capa-accesorio.*fill="${piel}"`))
    }
  })

  it('los personajes: cada uno arma un SVG válido, con un nombre corto, y su avatar viaja entero', () => {
    expect(new Set(PERSONAJES.map((p) => p.id)).size).toBe(PERSONAJES.length)
    for (const p of PERSONAJES) {
      parsear(LORELEI.dibujar(p.avatar))
      // En la mesa va el nombre solo: corto, para que entre debajo del avatar.
      expect(p.nombre.length).toBeLessThanOrEqual(10)
      // Con todo permitido (los bots y el admin), el código no pierde ninguna pieza.
      expect(normalizarAvatar(codificarAvatar(p.avatar), TODO_PERMITIDO)).toBe(codificarAvatar(p.avatar))
    }
  })

  it('los bots con personajes: distintos y siempre los mismos para la misma sala', () => {
    const cinco = personajesParaBots('sala-1', 5)
    expect(new Set(cinco.map((p) => p.id)).size).toBe(5)
    expect(personajesParaBots('sala-1', 5)).toEqual(cinco)
  })
})
