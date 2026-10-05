import { describe, expect, it } from 'vitest'
import {
  AVATAR_BASE,
  CAPAS_AVATAR,
  CATALOGO_AVATAR,
  LARGO_AVATAR,
  avatarAlAzar,
  codificarAvatar,
  esGratis,
  leerAvatar,
  normalizarAvatar,
} from '@truco/shared'
import { LORELEI } from '../src/avatares/lorelei'
import { PIEZAS_LORELEI } from '../src/avatares/lorelei/piezas'

describe('formato del avatar', () => {
  it('se codifica y se lee igual, y entra en el largo que acepta el servidor', () => {
    for (const texto of ['Ana', 'Beto', 'Bot 1', '']) {
      const a = avatarAlAzar(texto, false)
      const codigo = codificarAvatar(a)
      expect(codigo.length).toBeLessThanOrEqual(LARGO_AVATAR)
      expect(leerAvatar(codigo)).toEqual(a)
    }
  })

  it('rechaza códigos rotos, piezas que no existen y emojis viejos', () => {
    expect(leerAvatar('🧉')).toBeNull()
    expect(leerAvatar(null)).toBeNull()
    expect(leerAvatar('a1.1.2')).toBeNull()
    const partes = CAPAS_AVATAR.map(() => '0')
    partes[2] = (CATALOGO_AVATAR.pelo.length).toString(36)
    expect(leerAvatar(`a1.${partes.join('.')}`)).toBeNull()
  })

  it('el mismo texto da siempre el mismo avatar, y con soloGratis no usa piezas de la tienda', () => {
    expect(avatarAlAzar('Mirta')).toEqual(avatarAlAzar('Mirta'))
    for (let i = 0; i < 200; i++) {
      const a = avatarAlAzar(`jugador ${i}`)
      for (const capa of CAPAS_AVATAR) expect(esGratis(capa, a[capa])).toBe(true)
    }
  })

  it('el servidor cambia las piezas pagas por las gratis de la capa', () => {
    const conMate = codificarAvatar({ ...AVATAR_BASE, accesorio: 1, pelo: 40 })
    expect(leerAvatar(normalizarAvatar(conMate))).toEqual({ ...AVATAR_BASE, accesorio: 0, pelo: 0 })
    expect(normalizarAvatar('cualquier cosa')).toBeNull()
  })

  it('las piezas pagas son la mayoría, y la piel es siempre gratis', () => {
    expect(CATALOGO_AVATAR.piel.every((p) => p.precio === 0)).toBe(true)
    const todas = CAPAS_AVATAR.flatMap((c) => CATALOGO_AVATAR[c])
    expect(todas.filter((p) => p.precio > 0).length).toBeGreaterThan(todas.length / 2)
  })
})

describe('estilo Lorelei', () => {
  it('el catálogo tiene una pieza de Lorelei para cada pieza de la cara', () => {
    expect(CATALOGO_AVATAR.pelo).toHaveLength(PIEZAS_LORELEI.pelo.length)
    expect(CATALOGO_AVATAR.cabeza).toHaveLength(PIEZAS_LORELEI.cabeza.length)
    expect(CATALOGO_AVATAR.ojos).toHaveLength(PIEZAS_LORELEI.ojos.length)
    expect(CATALOGO_AVATAR.cejas).toHaveLength(PIEZAS_LORELEI.cejas.length)
    expect(CATALOGO_AVATAR.nariz).toHaveLength(PIEZAS_LORELEI.nariz.length)
    expect(CATALOGO_AVATAR.boca).toHaveLength(PIEZAS_LORELEI.boca.length)
    expect(CATALOGO_AVATAR.barba).toHaveLength(PIEZAS_LORELEI.barba.length + 1)
    expect(CATALOGO_AVATAR.lentes).toHaveLength(PIEZAS_LORELEI.lentes.length + 1)
    expect(CATALOGO_AVATAR.aros).toHaveLength(PIEZAS_LORELEI.aros.length + 1)
    expect(CATALOGO_AVATAR.pecas).toHaveLength(PIEZAS_LORELEI.pecas.length + 1)
  })

  it('dibuja cada capa de la cara por separado, sin marcas sin reemplazar', () => {
    const svg = LORELEI.dibujar({ ...AVATAR_BASE, barba: 1, lentes: 1, sombrero: 1, accesorio: 1 })
    for (const capa of ['pelo', 'cabeza', 'ojos', 'cejas', 'nariz', 'boca', 'barba', 'lentes', 'ropa', 'sombrero', 'accesorio']) {
      expect(svg).toContain(`capa-${capa}`)
    }
    expect(svg).not.toContain('{{')
  })
})
