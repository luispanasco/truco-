import { describe, expect, it } from 'vitest'
import { filtrarTexto, LimiteFrecuencia, prepararMensaje } from '../src/chat'
import { esCodigoValido, generarCodigo, generarCodigoUnico } from '../src/codigos'

describe('filtro de palabras', () => {
  it('tapa palabras prohibidas sin importar mayúsculas ni tildes', () => {
    expect(filtrarTexto('sos un pelotudo')).toBe('sos un ********')
    expect(filtrarTexto('SOS UN PELOTÚDO!')).toBe('SOS UN ********!')
    expect(filtrarTexto('flor de hijo de puta')).toBe('flor de **** ** ****')
  })

  it('no toca palabras que solo contienen una prohibida', () => {
    expect(filtrarTexto('computadora y disputa')).toBe('computadora y disputa')
    expect(filtrarTexto('me gusta la concha de mar')).toBe('me gusta la ****** de mar')
  })

  it('prepara el mensaje: recorta, junta espacios y descarta vacíos', () => {
    expect(prepararMensaje('   ')).toBeNull()
    expect(prepararMensaje(42)).toBeNull()
    expect(prepararMensaje('  hola   che  ')).toBe('hola che')
    expect(prepararMensaje('x'.repeat(500))).toHaveLength(200)
  })
})

describe('límite de frecuencia', () => {
  it('permite como máximo N eventos por ventana', () => {
    const l = new LimiteFrecuencia(3, 5000)
    expect([0, 100, 200, 300].map((t) => l.permitir(t))).toEqual([true, true, true, false])
    expect(l.permitir(5001)).toBe(true)
  })
})

describe('códigos de sala', () => {
  it('tienen 5 caracteres sin letras confusas', () => {
    for (let i = 0; i < 500; i++) {
      const c = generarCodigo()
      expect(esCodigoValido(c)).toBe(true)
      expect(c).not.toMatch(/[O0I1L]/)
    }
  })

  it('no repiten un código en uso', async () => {
    const usados = new Set<string>()
    for (let i = 0; i < 100; i++) usados.add(await generarCodigoUnico(async (c) => usados.has(c)))
    expect(usados.size).toBe(100)
  })
})
