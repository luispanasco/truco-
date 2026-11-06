/**
 * Qué departamentos limitan con cuál: en el modo historia, completar uno abre sus vecinos.
 * Sale de los límites de Natural Earth (los que comparten borde).
 *
 * Generado por apps/web/scripts/mapa-uruguay.py: no editar a mano.
 */

import type { IdDepartamento } from './historia'

export const VECINOS: Record<IdDepartamento, readonly IdDepartamento[]> = {
  artigas: ['rivera', 'salto'],
  canelones: ['florida', 'lavalleja', 'maldonado', 'montevideo', 'san-jose'],
  'cerro-largo': ['durazno', 'rivera', 'tacuarembo', 'treinta-y-tres'],
  colonia: ['san-jose', 'soriano'],
  durazno: ['cerro-largo', 'flores', 'florida', 'rio-negro', 'tacuarembo', 'treinta-y-tres'],
  flores: ['durazno', 'florida', 'san-jose', 'soriano'],
  florida: ['canelones', 'durazno', 'flores', 'lavalleja', 'san-jose', 'treinta-y-tres'],
  lavalleja: ['canelones', 'florida', 'maldonado', 'rocha', 'treinta-y-tres'],
  maldonado: ['canelones', 'lavalleja', 'rocha'],
  montevideo: ['canelones', 'san-jose'],
  paysandu: ['rio-negro', 'salto', 'tacuarembo'],
  'rio-negro': ['durazno', 'paysandu', 'soriano', 'tacuarembo'],
  rivera: ['artigas', 'cerro-largo', 'salto', 'tacuarembo'],
  rocha: ['lavalleja', 'maldonado', 'treinta-y-tres'],
  salto: ['artigas', 'paysandu', 'rivera', 'tacuarembo'],
  'san-jose': ['canelones', 'colonia', 'flores', 'florida', 'montevideo'],
  soriano: ['colonia', 'flores', 'rio-negro'],
  tacuarembo: ['cerro-largo', 'durazno', 'paysandu', 'rio-negro', 'rivera', 'salto'],
  'treinta-y-tres': ['cerro-largo', 'durazno', 'florida', 'lavalleja', 'rocha'],
}
