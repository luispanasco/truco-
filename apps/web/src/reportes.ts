import type { ContextoReporte, RepeticionPartida, ReporteEnviado, ReporteListado, TipoReporte } from '@truco/shared'
import type { ConexionOnline } from './conexion/online'
import { direccionApi, useCuenta } from './cuenta/cuenta'
import { useJuego } from './estado'
import { leerPerfil } from './perfil'

/** Cuántas líneas del registro de la mesa van en el reporte. */
const LINEAS_REGISTRO = 50

export const VERSION_APP = typeof __VERSION_APP__ === 'string' ? __VERSION_APP__ : 'desconocida'

/**
 * Lo que se adjunta solo: el navegador y, si estás en una partida, la partida. Contra la compu va
 * entera (para repetirla); online, la sala y tu asiento (la repetición la pone el servidor).
 */
export function contextoDelReporte(): ContextoReporte {
  const contexto: ContextoReporte = {
    version: VERSION_APP,
    navegador: navigator.userAgent,
    pantalla: `${window.innerWidth}x${window.innerHeight} @${window.devicePixelRatio}`,
    ruta: location.pathname,
  }
  const { conexion, sala, vista, registro } = useJuego.getState()
  if (!conexion) return contexto
  if (conexion.tipo === 'local') {
    const modo = conexion.examen ? 'examen' : conexion.historia ? 'historia' : 'compu'
    contexto.local = { modo, repeticion: conexion.repeticion?.() ?? null }
  } else {
    contexto.online = { sala: (conexion as ConexionOnline).roomId, codigo: sala?.codigo ?? null, asiento: sala?.yo ?? -1 }
  }
  contexto.vista = vista
  contexto.registro = registro.slice(-LINEAS_REGISTRO).map((l) => l.texto)
  return contexto
}

/** El reporte entero, listo para mandar. */
export function armarReporte(tipo: TipoReporte, descripcion: string): ReporteEnviado {
  const perfil = leerPerfil()
  const cuenta = useCuenta.getState().cuenta
  const { sala } = useJuego.getState()
  const enLaMesa = sala?.yo != null ? sala.lugares[sala.yo]?.apodo : undefined
  return {
    tipo,
    descripcion: descripcion.trim(),
    invitadoId: perfil.invitadoId,
    apodo: cuenta?.apodo || enLaMesa || perfil.apodo || 'Sin apodo',
    contexto: contextoDelReporte(),
  }
}

/** Lo manda (con tu cuenta, si entraste). Si falla, tira con el motivo. */
export async function mandarReporte(tipo: TipoReporte, descripcion: string): Promise<void> {
  const token = useCuenta.getState().token
  let r: Response
  try {
    r = await fetch(`${direccionApi()}/reportes`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(armarReporte(tipo, descripcion)),
    })
  } catch {
    throw new Error('No hay conexión con el servidor.')
  }
  if (r.ok) return
  const datos = (await r.json().catch(() => ({}))) as { motivo?: string }
  throw new Error(r.status === 413 ? 'El reporte es muy grande.' : (datos.motivo ?? 'No se pudo mandar.'))
}

/** Solo el admin: los pedidos de la pantalla de reportes. */
async function pedirAdmin<T>(ruta: string): Promise<T> {
  const token = useCuenta.getState().token
  if (!token) throw new Error('Entrá a tu cuenta')
  const r = await fetch(`${direccionApi()}${ruta}`, { headers: { authorization: `Bearer ${token}` } })
  const datos = (await r.json().catch(() => ({}))) as T & { motivo?: string }
  if (!r.ok) throw new Error(datos.motivo ?? 'No se pudo. Probá de nuevo.')
  return datos
}

export const listarReportes = async () => (await pedirAdmin<{ reportes: ReporteListado[] }>('/reportes')).reportes
export const repeticionDeReporte = (id: string) => pedirAdmin<RepeticionPartida>(`/reportes/${encodeURIComponent(id)}/repeticion`)
