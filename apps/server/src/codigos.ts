import { randomInt } from 'node:crypto'
import { ALFABETO_CODIGO, LARGO_CODIGO } from '@truco/shared'

export function generarCodigo(): string {
  let codigo = ''
  for (let i = 0; i < LARGO_CODIGO; i++) codigo += ALFABETO_CODIGO[randomInt(ALFABETO_CODIGO.length)]
  return codigo
}

/** Genera un código que no esté en uso, según `enUso`. */
export async function generarCodigoUnico(enUso: (codigo: string) => Promise<boolean>): Promise<string> {
  for (let intento = 0; intento < 50; intento++) {
    const codigo = generarCodigo()
    if (!(await enUso(codigo))) return codigo
  }
  throw new Error('No se pudo generar un código de sala libre')
}

export function esCodigoValido(codigo: string): boolean {
  return codigo.length === LARGO_CODIGO && [...codigo].every((c) => ALFABETO_CODIGO.includes(c))
}
