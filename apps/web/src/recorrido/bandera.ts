import { create } from 'zustand'
import { leerPartidaGuardada } from '../conexion/online'

/**
 * Cuándo sale el recorrido de bienvenida (el del menú) y el de la primera partida (el de la
 * mesa). Se anota en el dispositivo; si no se puede leer o guardar (navegación privada), no sale:
 * mejor no mostrarlo que mostrarlo cada vez.
 */

export const CLAVE_RECORRIDO = 'truco.recorrido'
export const CLAVE_RECORRIDO_MESA = 'truco.recorridoMesa'

/** `visto`: ya salió (o se saltó). `viejo`: no es nuevo en la app, no le sale ninguno de los dos. */
type Marca = 'visto' | 'viejo'

function leer(clave: string): string | null | undefined {
  try {
    return localStorage.getItem(clave)
  } catch {
    return undefined
  }
}

function anotar(clave: string, marca: Marca) {
  try {
    localStorage.setItem(clave, marca)
  } catch {
    // Sin almacenamiento: no pasa nada.
  }
}

/** En los tests (vitest) no sale solo, salvo que el test lo pida. */
let automatico = import.meta.env.MODE !== 'test'
export const recorridoAutomatico = (si: boolean) => void (automatico = si)

/** Señales de que ya usó la app antes: puso su apodo, hizo lecciones o tiene una partida a medias. */
function yaUsoLaApp(): boolean {
  try {
    const perfil = JSON.parse(localStorage.getItem('truco.perfil') ?? 'null') as { apodo?: unknown } | null
    if (typeof perfil?.apodo === 'string' && perfil.apodo.trim()) return true
    const tutorial = JSON.parse(localStorage.getItem('truco.tutorial') ?? '{}') as Record<string, unknown>
    if (Object.keys(tutorial).length > 0) return true
  } catch {
    return true
  }
  return leerPartidaGuardada() !== null
}

/**
 * Si al abrir el menú tiene que salir el recorrido. Si se ve que no es nuevo, se anota (así
 * tampoco le sale el de la mesa). Se llama una vez, ya sabido si tiene la cuenta abierta.
 */
export function decidirRecorrido(conCuenta: boolean): boolean {
  if (!automatico) return false
  if (leer(CLAVE_RECORRIDO) !== null) return false
  if (conCuenta || yaUsoLaApp()) {
    anotar(CLAVE_RECORRIDO, 'viejo')
    anotar(CLAVE_RECORRIDO_MESA, 'viejo')
    return false
  }
  return true
}

export const marcarRecorridoVisto = () => anotar(CLAVE_RECORRIDO, 'visto')

/** El de la mesa: solo si pasó por el de bienvenida (es nuevo) y todavía no le salió. */
export function tocaRecorridoMesa(): boolean {
  if (!automatico) return false
  const menu = leer(CLAVE_RECORRIDO)
  return menu === 'visto' && leer(CLAVE_RECORRIDO_MESA) === null
}

export const marcarRecorridoMesaVisto = () => anotar(CLAVE_RECORRIDO_MESA, 'visto')

/** "Ver el recorrido de nuevo" (en Ajustes): el menú lo abre. */
export const useRecorrido = create<{ pedido: number; ver: () => void }>((set) => ({
  pedido: 0,
  ver: () => set((s) => ({ pedido: s.pedido + 1 })),
}))
