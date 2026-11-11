import type { Carta } from '@truco/engine'
import type { Paso } from './lecciones'
import { REGLA_FLOR } from './manosTanto'

/**
 * Las lecciones del envido y la flor. Don Queiroz no te muestra el tanto: te lo hace cargar.
 * Las cuentas de los ejemplos son las del motor (las prueban los tests).
 */

const c = (numero: Carta['numero'], palo: Carta['palo']): Carta => ({ numero, palo })

export function envido(): Paso[] {
  return [
    { tipo: 'dice', texto: 'Ahora el envido, que es el tanto. Se toca en la primera vuelta, antes de jugar la carta, y gana el que tiene más.', pizarra: { dibujo: '🗣️', leyenda: '¡Envido!' } },
    {
      tipo: 'dice',
      texto: 'Si tenés dos cartas del mismo palo, contás 20 más el número de las dos. Acá: 20 + 6 + 5 = 31.',
      pizarra: { cartas: [c(6, 'oro'), c(5, 'oro'), c(1, 'copa')], leyenda: '20 + 6 + 5 = 31' },
    },
    {
      tipo: 'dice',
      texto: 'Las negras, el 10, el 11 y el 12, no valen nada para el tanto: cuentan 0. El 7 y el 12 de espadas son 20 + 7 + 0 = 27.',
      pizarra: { cartas: [c(7, 'espada'), c(12, 'espada'), c(3, 'basto')], leyenda: '20 + 7 + 0 = 27' },
    },
    {
      tipo: 'dice',
      texto: 'Si no tenés dos del mismo palo, vale solo la carta más alta, sin el 20. Acá tenés 7.',
      pizarra: { cartas: [c(7, 'copa'), c(4, 'basto'), c(11, 'oro')], leyenda: 'Vale el 7' },
    },
    { tipo: 'cargar', consigna: 'Ahora vos: cargá el envido de esta mano.', que: 'envido', rondas: 5, conMuestra: false },
    {
      tipo: 'dice',
      texto: 'Con muestra cambia todo. Las piezas tienen su propio valor: el 2 vale 30, el 4 vale 29, el 5 vale 28, y el 11 y el 10 valen 27.',
      pizarra: { muestra: c(6, 'oro'), cartas: [c(2, 'oro'), c(4, 'oro'), c(5, 'oro'), c(11, 'oro'), c(10, 'oro')], leyenda: '30, 29, 28, 27 y 27' },
    },
    {
      tipo: 'dice',
      texto: 'Con una pieza no hace falta el palo: es la pieza más la carta más alta de las otras dos. Acá: 29 del 4 de oros + 7 = 36.',
      pizarra: { muestra: c(6, 'oro'), cartas: [c(4, 'oro'), c(7, 'copa'), c(3, 'espada')], leyenda: '29 + 7 = 36' },
    },
    {
      tipo: 'dice',
      texto: 'Y si la muestra es pieza, el 12 de ese palo vale lo que valía ella. Con la muestra el 2 de copas, el 12 de copas vale 30: con el 5 de bastos, 35.',
      pizarra: { muestra: c(2, 'copa'), cartas: [c(12, 'copa'), c(5, 'basto'), c(1, 'espada')], leyenda: '30 + 5 = 35' },
    },
    { tipo: 'dice', texto: 'Con dos piezas, o con una pieza y dos del mismo palo, ya tenés flor. Eso lo vemos en la próxima lección.', pizarra: { dibujo: '🌼', leyenda: 'Eso es flor' } },
    { tipo: 'cargar', consigna: 'Ahora con muestra. Fijate si hay pieza y cargá el envido.', que: 'envido', rondas: 6, conMuestra: true },
  ]
}

export function flor(): Paso[] {
  const digitos = REGLA_FLOR === 'piezaMayorMasDigitos'
  return [
    {
      tipo: 'dice',
      texto: 'La flor es tener las tres cartas del mismo palo. El que tiene flor la tiene que cantar, en la primera vuelta, y con flor no hay envido.',
      pizarra: { cartas: [c(7, 'copa'), c(5, 'copa'), c(1, 'copa')], leyenda: 'Tres de copas: ¡flor!' },
    },
    {
      tipo: 'dice',
      texto: 'Con muestra, las piezas son comodín: una pieza y dos cartas del mismo palo ya es flor.',
      pizarra: { muestra: c(6, 'oro'), cartas: [c(4, 'oro'), c(3, 'espada'), c(6, 'espada')], leyenda: 'Pieza + dos de espadas' },
    },
    {
      tipo: 'dice',
      texto: 'Y dos piezas hacen flor con cualquier carta. Pero ojo: una pieza con dos de palos distintos, no.',
      pizarra: { muestra: c(6, 'oro'), cartas: [c(2, 'oro'), c(11, 'oro'), c(7, 'basto')], leyenda: 'Dos piezas: flor' },
    },
    { tipo: 'tieneFlor', consigna: 'Mirá la muestra: ¿esta mano tiene flor?', rondas: 6 },
    {
      tipo: 'dice',
      texto: 'Si tenés flor, hay que saber cuánto suma. Sin piezas es como el envido, pero con las tres: 20 + 7 + 5 + 1 = 33. Las negras, 0.',
      pizarra: { cartas: [c(7, 'copa'), c(5, 'copa'), c(1, 'copa')], leyenda: '20 + 7 + 5 + 1 = 33' },
    },
    { tipo: 'cargar', consigna: 'Cargá la flor: ¿cuánto suma?', que: 'flor', rondas: 3, conMuestra: false },
    {
      tipo: 'dice',
      texto: 'Con una pieza, la pieza con su valor de envido y las otras dos por su número, sin el 20. Acá: 29 + 3 + 6 = 38.',
      pizarra: { muestra: c(6, 'oro'), cartas: [c(4, 'oro'), c(3, 'espada'), c(6, 'espada')], leyenda: '29 + 3 + 6 = 38' },
    },
    digitos
      ? {
          tipo: 'dice',
          texto: 'Con dos piezas, la más alta va entera, y de la otra solo el último número: el 4 vale 29, así que suma 9. Acá: 30 + 9 + 7 = 46.',
          pizarra: { muestra: c(6, 'oro'), cartas: [c(2, 'oro'), c(4, 'oro'), c(7, 'basto')], leyenda: '30 + 9 + 7 = 46' },
        }
      : {
          tipo: 'dice',
          texto: 'Con dos piezas, la más alta va entera y la otra por su número, como una carta común. Acá: 30 + 4 + 7 = 41.',
          pizarra: { muestra: c(6, 'oro'), cartas: [c(2, 'oro'), c(4, 'oro'), c(7, 'basto')], leyenda: '30 + 4 + 7 = 41' },
        },
    { tipo: 'cargar', consigna: 'La última: cargá la flor, con piezas.', que: 'flor', rondas: 5, conMuestra: true },
  ]
}
