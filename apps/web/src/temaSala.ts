import { TODO_PERMITIDO, type InfoSala } from '@truco/shared'
import { mostrarBaraja } from './baraja'
import { leerPerfil } from './perfil'
import { aplicarMesa } from './temaMesa'
import './estilos-historia.css'

/**
 * En una sala online, la mesa y la baraja son las del anfitrión: todos ven lo mismo. El servidor
 * ya las validó, así que se aplican aunque sean de la tienda. En el modo historia, la mesa es la
 * del lugar (que todavía no ganaste) y de fondo va el lugar.
 */
export function aplicarTemaDeSala(sala: Pick<InfoSala, 'mesa' | 'baraja'>, lugar?: string) {
  aplicarMesa(sala.mesa, TODO_PERMITIDO)
  mostrarBaraja(sala.baraja)
  // En el modo historia, de fondo va el lugar (data-lugar en <html>, ver estilos-historia.css).
  if (lugar) document.documentElement.dataset.lugar = lugar
  else delete document.documentElement.dataset.lugar
}

/** Al salir de la sala vuelve lo de cada uno (el perfil ya trae solo lo que puede usar). */
export function aplicarTemaPropio() {
  const perfil = leerPerfil()
  aplicarMesa(perfil.mesa, TODO_PERMITIDO)
  mostrarBaraja(perfil.baraja)
  delete document.documentElement.dataset.lugar
}
