import { TODO_PERMITIDO, type InfoSala } from '@truco/shared'
import { mostrarBaraja } from './baraja'
import { leerPerfil } from './perfil'
import { aplicarMesa } from './temaMesa'
import './estilos-historia.css'
import './estilos-niveles.css'

/**
 * En una sala online, la mesa y la baraja son las del anfitrión: todos ven lo mismo. El servidor
 * ya las validó, así que se aplican aunque sean de la tienda. En el modo historia, la mesa y la
 * baraja son las del lugar (que todavía no ganaste) y de fondo va el lugar: el del nivel si tiene,
 * si no el del departamento.
 */
export function aplicarTemaDeSala(sala: Pick<InfoSala, 'mesa' | 'baraja'>, lugar?: { departamento: string; nivel: number }) {
  aplicarMesa(sala.mesa, TODO_PERMITIDO)
  mostrarBaraja(sala.baraja)
  // data-lugar y data-nivel en <html>: ver estilos-historia.css y estilos-niveles.css.
  const html = document.documentElement.dataset
  if (lugar) {
    html.lugar = lugar.departamento
    html.nivel = String(lugar.nivel)
  } else {
    delete html.lugar
    delete html.nivel
  }
}

/** Al salir de la sala vuelve lo de cada uno (el perfil ya trae solo lo que puede usar). */
export function aplicarTemaPropio() {
  const perfil = leerPerfil()
  aplicarMesa(perfil.mesa, TODO_PERMITIDO)
  mostrarBaraja(perfil.baraja)
  delete document.documentElement.dataset.lugar
  delete document.documentElement.dataset.nivel
}
