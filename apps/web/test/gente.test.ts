import { describe, expect, it } from 'vitest'
import { textoGente } from '../src/gente'

describe('la gente online', () => {
  it('se dice corto, para debajo del botón de buscar', () => {
    expect(textoGente({ buscando: 0, jugando: 0 })).toBe('Nadie buscando ahora')
    expect(textoGente({ buscando: 1, jugando: 0 })).toBe('1 buscando partida')
    expect(textoGente({ buscando: 3, jugando: 12 })).toBe('3 buscando partida · 12 jugando')
  })
})
