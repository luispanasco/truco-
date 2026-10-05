import { TODO_PERMITIDO, type InfoSala } from '@truco/shared'
import { mostrarBaraja } from './baraja'
import { leerPerfil } from './perfil'
import { aplicarMesa } from './temaMesa'

/**
 * En una sala online, la mesa y la baraja son las del anfitrión: todos ven lo mismo. El servidor
 * ya las validó, así que se aplican aunque sean de la tienda.
 */
export function aplicarTemaDeSala(sala: Pick<InfoSala, 'mesa' | 'baraja'>) {
  aplicarMesa(sala.mesa, TODO_PERMITIDO)
  mostrarBaraja(sala.baraja)
}

/** Al salir de la sala vuelve lo de cada uno (el perfil ya trae solo lo que puede usar). */
export function aplicarTemaPropio() {
  const perfil = leerPerfil()
  aplicarMesa(perfil.mesa, TODO_PERMITIDO)
  mostrarBaraja(perfil.baraja)
}
