import express, { type Request, type Response, type Router } from 'express'
import type { Base } from './base'
import type { Usuario, Verificador } from './auth'
import { entrar, guardarPerfil } from './cuentas'
import { saldo, ultimosMovimientos } from './monedas'
import { ranking } from './elo'

export interface Cuentas {
  base: Base
  verificar: Verificador
  /** Si se acepta el login de prueba (`prueba:<email>`): solo en desarrollo, sin Supabase. */
  loginDePrueba: boolean
}

/**
 * La API de cuentas, bajo /api (la web la alcanza en /juego/api, como el juego). La sesión
 * viaja en el encabezado `Authorization: Bearer <token>`.
 */
export function rutasCuentas(c: Cuentas | null): Router {
  const r = express.Router()
  r.use(express.json({ limit: '16kb' }))

  r.get('/estado', (_req, res) => {
    res.json({ cuentas: c !== null, loginDePrueba: c?.loginDePrueba ?? false })
  })

  const conSesion =
    (fn: (req: Request, res: Response, c: Cuentas, u: Usuario) => Promise<void>) => async (req: Request, res: Response) => {
      if (!c) return void res.status(503).json({ motivo: 'Las cuentas no están configuradas' })
      const token = /^Bearer (.+)$/.exec(req.get('authorization') ?? '')?.[1]
      const u = token ? await c.verificar(token) : null
      if (!u) return void res.status(401).json({ motivo: 'La sesión no es válida' })
      try {
        await fn(req, res, c, u)
      } catch (e) {
        console.error(e)
        res.status(500).json({ motivo: 'Falló la base de datos' })
      }
    }

  r.post(
    '/entrar',
    conSesion(async (req, res, c, u) => {
      const cuenta = await entrar(c.base, u, req.body ?? {})
      res.json({ ...cuenta, saldo: await saldo(c.base, u.id) })
    }),
  )

  r.get(
    '/monedas',
    conSesion(async (_req, res, c, u) => {
      res.json({ saldo: await saldo(c.base, u.id), movimientos: await ultimosMovimientos(c.base, u.id) })
    }),
  )

  // El ranking lo ve cualquiera; con sesión, también dónde estás vos.
  r.get('/ranking', async (req, res) => {
    if (!c) return void res.status(503).json({ motivo: 'Las cuentas no están configuradas' })
    const formato = req.query.formato
    if (formato !== '1v1' && formato !== '2v2' && formato !== '3v3') return void res.status(400).json({ motivo: 'Formato inválido' })
    const token = /^Bearer (.+)$/.exec(req.get('authorization') ?? '')?.[1]
    const u = token ? await c.verificar(token) : null
    try {
      res.json(await ranking(c.base, formato, u?.id ?? null))
    } catch (e) {
      console.error(e)
      res.status(500).json({ motivo: 'Falló la base de datos' })
    }
  })

  r.put(
    '/perfil',
    conSesion(async (req, res, c, u) => {
      const cuenta = await guardarPerfil(c.base, u.id, req.body ?? {})
      if (!cuenta) return void res.status(404).json({ motivo: 'No existe la cuenta' })
      res.json(cuenta)
    }),
  )

  return r
}
