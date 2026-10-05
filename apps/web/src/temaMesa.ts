import { mesaGratis, normalizarMesa, type IdMesa } from '@truco/shared'
import './estilos-mesas.css'

/**
 * El color de la barra del navegador y de la app instalada con cada mesa: el paño oscuro,
 * como el theme-color del index.html (que es el de boliche).
 */
export const BARRA_MESA: Record<IdMesa, string> = {
  boliche: '#1f5130',
  azul: '#173a5e',
  bordo: '#4a1520',
  pizarra: '#2b3640',
  celeste: '#2f5a70',
  parrillero: '#4f3d26',
  cantina: '#6e1a1e',
}

/**
 * Pinta la app con la mesa elegida: los colores son variables de estilos-mesas.css que cuelgan
 * del atributo `data-mesa` de <html>. Lo que no se puede usar vuelve a la de boliche (con la
 * mesa de una sala o con la tienda de prueba, `puedeUsar` deja las pagas).
 */
export function aplicarMesa(id: unknown, puedeUsar: (id: IdMesa) => boolean = mesaGratis) {
  const mesa = normalizarMesa(id, puedeUsar)
  document.documentElement.dataset.mesa = mesa
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', BARRA_MESA[mesa])
}
