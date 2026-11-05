/**
 * Personajes típicos de Uruguay, para el modo historia (los rivales de cada lugar). Mientras el
 * modo historia no existe, los ve el admin: en la galería de la pantalla Avatar y como bots en
 * sus partidas.
 *
 * Cada pieza se busca por su nombre en el catálogo: si un nombre cambia, el test lo avisa.
 */

import { AVATAR_BASE, azarDeTexto, CATALOGO_AVATAR, type Avatar, type CapaAvatar } from './avatar'

export interface Personaje {
  id: string
  /** Como se sienta a la mesa: corto, para que entre debajo del avatar. */
  nombre: string
  /** Lo que es ("el Gaucho"): va con el nombre en la galería. */
  titulo: string
  /** De dónde es: el lugar del modo historia. */
  lugar: string
  descripcion: string
  avatar: Avatar
}

/** Las piezas de cada capa por su nombre; las capas sin nombrar quedan como en `AVATAR_BASE`. */
type Piezas = Partial<Record<CapaAvatar, string>>

/** La posición de una pieza en su capa, por el nombre. */
export function piezaPorNombre(capa: CapaAvatar, nombre: string): number {
  const i = CATALOGO_AVATAR[capa].findIndex((p) => p.nombre === nombre)
  if (i < 0) throw new Error(`No hay "${nombre}" en ${capa}`)
  return i
}

function armar(piezas: Piezas, cara: Partial<Pick<Avatar, 'ojos' | 'cejas' | 'nariz' | 'boca'>> = {}): Avatar {
  const a: Avatar = { ...AVATAR_BASE, ...cara }
  for (const [capa, nombre] of Object.entries(piezas) as [CapaAvatar, string][]) a[capa] = piezaPorNombre(capa, nombre)
  return a
}

export const PERSONAJES: readonly Personaje[] = [
  {
    id: 'gaucho',
    nombre: 'Ramón',
    titulo: 'el Gaucho',
    lugar: 'Tacuarembó',
    descripcion: 'Domador y payador. Juega callado y canta la flor con la pajita en la boca.',
    avatar: armar(
      {
        piel: 'Piel trigueña',
        cabeza: 'Cara cuadrada',
        pelo: 'Peinado para atrás',
        colorPelo: 'Negro',
        barba: 'Bigote gaucho',
        ropa: 'Poncho',
        sombrero: 'Sombrero de gaucho',
        bufanda: 'Pañuelo rojo',
        enBoca: 'Pajita de pasto',
        accesorio: 'Mate',
      },
      { cejas: 2, ojos: 3, boca: 1 },
    ),
  },
  {
    id: 'surfista',
    nombre: 'Nico',
    titulo: 'el Surfista',
    lugar: 'La Paloma',
    descripcion: 'Sale del agua directo a la mesa. Si hay buenas olas, se va al mazo.',
    avatar: armar(
      {
        piel: 'Piel morena',
        cabeza: 'Cara alargada',
        pelo: 'Rulos al viento',
        colorPelo: 'Rubio',
        lentes: 'Lentes de sol',
        ropa: 'Traje de neoprene',
        accesorio: 'Tabla de surf',
      },
      { boca: 4 },
    ),
  },
  {
    id: 'hippie',
    nombre: 'Luna',
    titulo: 'la Hippie',
    lugar: 'Cabo Polonio',
    descripcion: 'Vive sin luz eléctrica y juega a la luz del faro. Paz, amor y retruco.',
    avatar: armar(
      {
        piel: 'Piel clara',
        cabeza: 'Cara redonda',
        pelo: 'Lacio largo',
        colorPelo: 'Castaño claro',
        lentes: 'Lentes redondos',
        pecas: 'Pecas',
        sombrero: 'Vincha hippie',
        ropa: 'Remera teñida',
        bufanda: 'Collar de cuentas',
        accesorio: 'Guitarra criolla',
      },
      { ojos: 5, boca: 2 },
    ),
  },
  {
    id: 'murguista',
    nombre: 'Tito',
    titulo: 'el Murguista',
    lugar: 'Montevideo, en Carnaval',
    descripcion: 'Le canta la retirada al que pierde. Ensaya todo el año en el tablado del barrio.',
    avatar: armar(
      {
        piel: 'Piel muy clara',
        cabeza: 'Cara angulosa',
        pelo: 'Despeinado',
        colorPelo: 'Castaño oscuro',
        sombrero: 'Galera de murga',
        ropa: 'Levita de murga',
      },
      { cejas: 0, boca: 4 },
    ),
  },
  {
    id: 'candombero',
    nombre: 'Beto',
    titulo: 'el Candombero',
    lugar: 'Barrio Sur',
    descripcion: 'Toca el chico en las Llamadas. Golpea la mesa a ritmo de candombe cuando canta truco.',
    avatar: armar(
      {
        piel: 'Piel muy oscura',
        cabeza: 'Cara redonda',
        pelo: 'Motas',
        colorPelo: 'Negro',
        barba: 'Barba corta',
        ropa: 'Camisa floreada',
        accesorio: 'Tambor de candombe',
      },
      { boca: 4 },
    ),
  },
  {
    id: 'pescador',
    nombre: 'Julio',
    titulo: 'el Pescador',
    lugar: 'Punta del Diablo',
    descripcion: 'Sale al mar antes del alba. Tiene paciencia de pescador: espera la mano buena.',
    avatar: armar(
      {
        piel: 'Piel trigueña',
        cabeza: 'Cara cuadrada',
        pelo: 'Corte prolijo',
        colorPelo: 'Canoso',
        barba: 'Barba',
        sombrero: 'Gorro de pescador',
        ropa: 'Impermeable amarillo',
        accesorio: 'Caña de pescar',
        enBoca: 'Pipa',
      },
      { ojos: 2 },
    ),
  },
  {
    id: 'dona',
    nombre: 'Doña Rosa',
    titulo: 'la del almacén',
    lugar: 'El almacén del pueblo',
    descripcion: 'Anota las fiadas en la libreta y los tantos en la cabeza. Nunca se equivoca.',
    avatar: armar(
      {
        piel: 'Piel clara',
        cabeza: 'Cara redonda',
        pelo: 'Rodete alto',
        colorPelo: 'Gris',
        lentes: 'Lentes de lectura',
        aros: 'Aro colgante',
        ropa: 'Saco de lana tejido',
        accesorio: 'Mate y termo',
      },
      { cejas: 1, ojos: 5, boca: 2 },
    ),
  },
  {
    id: 'pituco',
    nombre: 'Santi',
    titulo: 'el Pituco',
    lugar: 'Carrasco',
    descripcion: 'Juega en la rambla con el buzo al hombro. Dice "obvio" a todo, hasta al vale cuatro.',
    avatar: armar(
      {
        piel: 'Piel muy clara',
        cabeza: 'Cara alargada',
        pelo: 'Raya al costado',
        colorPelo: 'Rubio',
        lentes: 'Lentes de sol',
        ropa: 'Camisa con buzo al hombro',
        accesorio: 'Celular',
      },
      { cejas: 0, boca: 0 },
    ),
  },
  {
    id: 'hincha',
    nombre: 'Cacho',
    titulo: 'el Hincha',
    lugar: 'El Centenario',
    descripcion: 'No se pierde un partido de la Celeste. Entre tiempo y tiempo, un truco y un choripán.',
    avatar: armar(
      {
        piel: 'Piel morena',
        cabeza: 'Cara cuadrada',
        pelo: 'Corte milico',
        colorPelo: 'Castaño',
        barba: 'Barba corta',
        sombrero: 'Gorra',
        ropa: 'Camiseta celeste',
        bufanda: 'Celeste y blanca',
        accesorio: 'Choripán',
      },
      { boca: 4 },
    ),
  },
  {
    id: 'veterano',
    nombre: 'Don Pocho',
    titulo: 'el veterano del boliche',
    lugar: 'El boliche de la esquina',
    descripcion: 'Juega en el mismo boliche desde el 62. Se sabe todas las señas, y algunas que inventó.',
    avatar: armar(
      {
        piel: 'Piel trigueña',
        cabeza: 'Cara angulosa',
        pelo: 'Pelado con estilo',
        colorPelo: 'Canoso',
        barba: 'Bigote',
        sombrero: 'Boina',
        ropa: 'Chaleco de campo',
        accesorio: 'Diario',
        enBoca: 'Escarbadientes',
      },
      { cejas: 3, ojos: 2 },
    ),
  },
]

/** `n` personajes distintos para sentar de bots: el mismo texto (la sala, la partida) da siempre los mismos. */
export function personajesParaBots(texto: string, n: number): Personaje[] {
  const azar = azarDeTexto(texto)
  const lista = [...PERSONAJES]
  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(azar() * (i + 1))
    ;[lista[i], lista[j]] = [lista[j]!, lista[i]!]
  }
  return lista.slice(0, n)
}
