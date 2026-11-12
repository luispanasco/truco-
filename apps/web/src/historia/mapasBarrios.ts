/**
 * El mapa de cada barrio (scripts/mapas-barrios.py, con teselas de OpenStreetMap): su zoom, su
 * esquina de arriba a la izquierda en píxeles del mundo a ese zoom y su tamaño. La imagen está en
 * public/departamentos/<departamento>/<barrio>/mapa.webp.
 *
 * Generado por scripts/mapas-barrios.py: no editar a mano.
 */

export interface MapaBarrio {
  z: number
  x: number
  y: number
  ancho: number
  alto: number
}

export const MAPAS_BARRIOS: Record<string, MapaBarrio> = {
  'rocha/la-paloma': { z: 13, x: 732348, y: 1263688, ancho: 1005, alto: 754 },
  'rocha/la-pedrera': { z: 16, x: 5866011, y: 10108150, ancho: 658, alto: 878 },
  'rocha/cabo-polonio': { z: 14, x: 1469623, y: 2523907, ancho: 1210, alto: 908 },
  'rocha/aguas-dulces-valizas-castillos': { z: 13, x: 734547, y: 1261104, ancho: 1023, alto: 1052 },
  'rocha/punta-del-diablo': { z: 15, x: 2946380, y: 5038592, ancho: 601, alto: 801 },
  'rocha/santa-teresa-y-chuy': { z: 11, x: 183839, y: 314054, ancho: 804, alto: 1071 },
}
