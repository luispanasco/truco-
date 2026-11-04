import express, { type Request, type Response, type Router } from 'express'
import type { Base } from './base'
import type { Usuario, Verificador } from './auth'
import { entrar, guardarPerfil } from './cuentas'
import { saldo, ultimosMovimientos } from './monedas'
import { ranking } from './elo'
import { comprar, CompraRechazada, inventario, vitrina } from './tienda'
import { agregarAmigo, AmigosRechazo, borrarAmigo, invitarAmigo, listaDeAmigos, responderSolicitud } from './amigos'
import { Presencia } from './presencia'
import { MAX_BYTES_FOTO_GRUPO } from '@truco/shared'
import {
  borrarGrupo,
  cambiarRol,
  cancelarPedido,
  configurarGrupo,
  crearGrupo,
  convocarGrupo,
  detalleGrupo,
  entrarAGrupo,
  entrarConCodigo,
  expulsar,
  fotoDeGrupo,
  guardarFotoGrupo,
  GruposRechazo,
  listaDeGrupos,
  pasarLiderazgo,
  renovarCodigo,
  responderSolicitudGrupo,
  salirDeGrupo,
} from './grupos'

export interface Cuentas {
  base: Base
  verificar: Verificador
  /** Si se acepta el login de prueba (`prueba:<email>`): solo en desarrollo, sin Supabase. */
  loginDePrueba: boolean
  /** Quién está conectado y las invitaciones (la comparten la API y las salas; ver servidor.ts). */
  presencia?: Presencia
}

/**
 * La API de cuentas, bajo /api (la web la alcanza en /juego/api, como el juego). La sesión
 * viaja en el encabezado `Authorization: Bearer <token>`.
 */
export function rutasCuentas(c: Cuentas | null): Router {
  const r = express.Router()
  // Publicada, la web está en otro dominio (Cloudflare Pages) que el servidor (Fly.io). La sesión
  // va en un encabezado, no en cookies, así que se puede aceptar cualquier origen.
  r.use((req, res, siguiente) => {
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Max-Age': '86400',
    })
    if (req.method === 'OPTIONS') return void res.sendStatus(204)
    siguiente()
  })
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
      res.json({ ...cuenta, saldo: await saldo(c.base, u.id), inventario: await inventario(c.base, u.id) })
    }),
  )

  r.get(
    '/monedas',
    conSesion(async (_req, res, c, u) => {
      res.json({ saldo: await saldo(c.base, u.id), movimientos: await ultimosMovimientos(c.base, u.id) })
    }),
  )

  // La vitrina de hoy la ve cualquiera; comprar pide la sesión.
  r.get('/tienda', (_req, res) => {
    res.json(vitrina())
  })

  r.post(
    '/tienda/comprar',
    conSesion(async (req, res, c, u) => {
      try {
        res.json(await comprar(c.base, u.id, (req.body as { item?: unknown } | undefined)?.item))
      } catch (e) {
        if (!(e instanceof CompraRechazada)) throw e
        res.status(409).json({ motivo: e.message })
      }
    }),
  )

  // Amigos. El latido avisa que la app sigue abierta y trae las invitaciones a una sala.
  const presencia = c?.presencia ?? new Presencia()
  const conRechazo =
    (fn: (req: Request, res: Response, c: Cuentas, u: Usuario) => Promise<void>) => (req: Request, res: Response, c: Cuentas, u: Usuario) =>
      fn(req, res, c, u).catch((e) => {
        if (!(e instanceof AmigosRechazo) && !(e instanceof GruposRechazo)) throw e
        res.status(e instanceof GruposRechazo ? e.estado : 409).json({ motivo: e.message })
      })
  const cuerpo = (req: Request) => (req.body ?? {}) as { codigo?: unknown; id?: unknown; aceptar?: unknown }

  r.post(
    '/amigos/latido',
    conSesion(async (_req, res, _c, u) => {
      presencia.latido(u.id)
      res.json({ invitaciones: presencia.tomarInvitaciones(u.id) })
    }),
  )
  r.get(
    '/amigos',
    conSesion(async (_req, res, c, u) => {
      presencia.latido(u.id)
      res.json(await listaDeAmigos(c.base, presencia, u.id))
    }),
  )
  r.post(
    '/amigos/agregar',
    conSesion(
      conRechazo(async (req, res, c, u) => {
        res.json(await agregarAmigo(c.base, u.id, cuerpo(req).codigo))
      }),
    ),
  )
  r.post(
    '/amigos/responder',
    conSesion(
      conRechazo(async (req, res, c, u) => {
        await responderSolicitud(c.base, u.id, cuerpo(req).id, cuerpo(req).aceptar === true)
        res.json({ ok: true })
      }),
    ),
  )
  r.post(
    '/amigos/borrar',
    conSesion(
      conRechazo(async (req, res, c, u) => {
        await borrarAmigo(c.base, u.id, cuerpo(req).id)
        res.json({ ok: true })
      }),
    ),
  )
  r.post(
    '/amigos/invitar',
    conSesion(
      conRechazo(async (req, res, c, u) => {
        await invitarAmigo(c.base, presencia, u.id, cuerpo(req).id)
        res.json({ ok: true })
      }),
    ),
  )

  // Grupos. Cada acción va con el id del grupo (y de la persona, si es sobre otro) en el cuerpo.
  const enGrupo = (req: Request) => (req.body ?? {}) as Record<string, unknown>
  const rutaGrupo = (ruta: string, fn: (b: Record<string, unknown>, c: Cuentas, u: Usuario) => Promise<unknown>) =>
    r.post(
      `/grupos/${ruta}`,
      conSesion(
        conRechazo(async (req, res, c, u) => {
          res.json((await fn(enGrupo(req), c, u)) ?? { ok: true })
        }),
      ),
    )
  r.get(
    '/grupos',
    conSesion(async (_req, res, c, u) => {
      res.json(await listaDeGrupos(c.base, u.id))
    }),
  )
  rutaGrupo('crear', (b, c, u) => crearGrupo(c.base, u.id, b))
  rutaGrupo('detalle', (b, c, u) => detalleGrupo(c.base, presencia, u.id, b.id))
  rutaGrupo('convocar', (b, c, u) => convocarGrupo(c.base, presencia, u.id, b.id))
  rutaGrupo('entrar', (b, c, u) => entrarAGrupo(c.base, u.id, b.id))
  rutaGrupo('codigo', (b, c, u) => entrarConCodigo(c.base, u.id, b.codigo))
  rutaGrupo('cancelar', (b, c, u) => cancelarPedido(c.base, u.id, b.id))
  rutaGrupo('salir', (b, c, u) => salirDeGrupo(c.base, u.id, b.id))
  rutaGrupo('responder', (b, c, u) => responderSolicitudGrupo(c.base, u.id, b.id, b.cuenta, b.aceptar === true))
  rutaGrupo('rol', (b, c, u) => cambiarRol(c.base, u.id, b.id, b.cuenta, b.rol))
  rutaGrupo('liderazgo', (b, c, u) => pasarLiderazgo(c.base, u.id, b.id, b.cuenta))
  rutaGrupo('expulsar', (b, c, u) => expulsar(c.base, u.id, b.id, b.cuenta))
  rutaGrupo('configurar', (b, c, u) => configurarGrupo(c.base, u.id, b.id, b))
  rutaGrupo('renovar-codigo', (b, c, u) => renovarCodigo(c.base, u.id, b.id))
  rutaGrupo('borrar', (b, c, u) => borrarGrupo(c.base, u.id, b.id))
  rutaGrupo('sacar-foto', (b, c, u) => guardarFotoGrupo(c.base, u.id, b.id, null))
  // La foto viaja tal cual (ya achicada por la app), no en JSON.
  r.put(
    '/grupos/:id/foto',
    express.raw({ type: () => true, limit: MAX_BYTES_FOTO_GRUPO + 1024 }),
    conSesion(
      conRechazo(async (req, res, c, u) => {
        const bytes = Buffer.isBuffer(req.body) ? new Uint8Array(req.body) : new Uint8Array()
        res.json(await guardarFotoGrupo(c.base, u.id, req.params.id, bytes))
      }),
    ),
  )
  // La ve cualquiera (va en un <img>): la versión en la dirección hace que la caché no se equivoque.
  r.get('/grupos/:id/foto', async (req, res) => {
    if (!c) return void res.sendStatus(503)
    try {
      const foto = await fotoDeGrupo(c.base, req.params.id)
      if (!foto) return void res.sendStatus(404)
      res.set({ 'content-type': foto.tipo, 'cache-control': 'public, max-age=31536000, immutable' }).send(foto.bytes)
    } catch (e) {
      console.error(e)
      res.sendStatus(500)
    }
  })

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
