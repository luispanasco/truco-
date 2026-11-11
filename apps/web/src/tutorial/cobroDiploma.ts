import { useCuenta, direccionApi } from '../cuenta/cuenta'
import { esBeta, fijarInventario } from '../cuenta/inventario'
import { useTutorial } from './progreso'

/**
 * El premio del diploma (las monedas y los Naipes) va a la cuenta. El examen se puede ganar sin
 * cuenta: queda anotado en el dispositivo (en el progreso del tutorial) y, al entrar a una cuenta,
 * se cobra solo. Acá se recuerda qué cuentas ya lo cobraron desde este dispositivo, para no pedirlo
 * de nuevo (el servidor igual lo da una sola vez).
 */
const CLAVE = 'truco.diplomaCobrado'

function cobradas(): string[] {
  try {
    const x = JSON.parse(localStorage.getItem(CLAVE) ?? '[]') as unknown
    return Array.isArray(x) ? x.filter((i): i is string => typeof i === 'string') : []
  } catch {
    return []
  }
}

function anotarCobrada(cuentaId: string) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify([...new Set([...cobradas(), cuentaId])]))
  } catch {
    // Sin almacenamiento: a lo sumo se pide de nuevo (y el servidor no da nada).
  }
}

/** Cobra el premio en tu cuenta. Devuelve lo nuevo (ids: `monedas:300` y los Naipes), vacío si ya lo tenías. */
export async function cobrarDiploma(): Promise<string[]> {
  const { token, cuenta } = useCuenta.getState()
  if (!token || !cuenta) throw new Error('Entrá a tu cuenta')
  const r = await fetch(`${direccionApi()}/tutorial/recibirse`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
  })
  const datos = (await r.json()) as { nuevas: string[]; inventario: string[]; saldo: number; motivo?: string }
  if (!r.ok) throw new Error(datos.motivo ?? 'No se pudo cobrar. Probá de nuevo.')
  useCuenta.setState({ saldo: datos.saldo })
  fijarInventario(datos.inventario, esBeta())
  anotarCobrada(cuenta.id)
  return datos.nuevas
}

let cobrando = false

/** Si te recibiste y entraste a una cuenta que todavía no lo cobró desde acá, lo cobra (en silencio). */
function revisar() {
  const { estado, cuenta } = useCuenta.getState()
  if (cobrando || estado !== 'adentro' || !cuenta || useTutorial.getState().progreso.examen === undefined) return
  if (cobradas().includes(cuenta.id)) return
  cobrando = true
  cobrarDiploma()
    .catch(() => {
      // Se reintenta la próxima vez que cambie la cuenta (o desde la pantalla del diploma).
    })
    .finally(() => {
      cobrando = false
    })
}

/**
 * Arranca al abrir la app: al entrar a una cuenta, cobra el diploma guardado en el dispositivo. (Al
 * ganar el examen con la cuenta abierta, lo cobra la pantalla del diploma.)
 */
export function vigilarDiploma(): () => void {
  revisar()
  return useCuenta.subscribe(revisar)
}
