import { mesaGratis, normalizarMesa, type IdMesa } from '@truco/shared'
import './estilos-mesas.css'
import './estilos-departamentos.css'

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
  artigas: '#32253c',
  canelones: '#322a38',
  'cerro-largo': '#28382a',
  colonia: '#3c2f26',
  durazno: '#303432',
  flores: '#3d3225',
  florida: '#25373d',
  lavalleja: '#2f372b',
  maldonado: '#26333d',
  montevideo: '#2f272d',
  paysandu: '#303525',
  'rio-negro': '#30322d',
  rivera: '#22362f',
  rocha: '#151425',
  salto: '#3f2f20',
  'san-jose': '#30372f',
  soriano: '#323a28',
  tacuarembo: '#363026',
  'treinta-y-tres': '#253630',
  'la-paloma': '#0f3130',
  'la-pedrera': '#38241f',
  'cabo-polonio': '#052030',
  'aguas-dulces-valizas-castillos': '#282c16',
  'punta-del-diablo': '#3e1d1b',
  'santa-teresa-y-chuy': '#13241b',
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
