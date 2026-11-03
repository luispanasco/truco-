import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { NOMBRE_INGRESO, NOMBRE_ROL, PUEDE, type DetalleGrupo, type MiembroGrupo, type RolGrupo } from '@truco/shared'
import { Avatar } from '../componentes/Avatar'
import { EscudoGrupo } from '../componentes/EscudoGrupo'
import { FormularioGrupo } from '../componentes/FormularioGrupo'
import { CabeceraOnline, MensajeError } from '../componentes/Online'
import { iniciarCuenta, useCuenta } from '../cuenta/cuenta'
import {
  borrarGrupo,
  cambiarRol,
  configurarGrupo,
  detalleGrupo,
  entrarAGrupo,
  expulsar,
  pasarLiderazgo,
  renovarCodigo,
  responderSolicitud,
  sacarFoto,
  salirDeGrupo,
  subirFoto,
} from '../cuenta/grupos'
import { textoMiembros } from '../menu/PanelGrupos'
import '../estilos-grupos.css'

type Resultado = { ok: true } | { ok: false; motivo: string }

/**
 * Un grupo: su foto, nombre y descripción, el código de invitación y las solicitudes (capitanes y
 * líder), los miembros con lo que tu rol te deja hacer con cada uno, la configuración (el líder)
 * y salir. Se actualiza solo mientras está abierta.
 */
export function Grupo() {
  const { id = '' } = useParams()
  const navegar = useNavigate()
  const estado = useCuenta((s) => s.estado)
  const yo = useCuenta((s) => s.cuenta?.id ?? null)
  const [grupo, setGrupo] = useState<DetalleGrupo | null>(null)
  const [noExiste, setNoExiste] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [confirmar, setConfirmar] = useState<'salir' | 'borrar' | null>(null)
  useEffect(() => void iniciarCuenta(), [])

  const cargar = useCallback(async () => {
    try {
      setGrupo(await detalleGrupo(id))
    } catch (e) {
      if (e instanceof Error && e.message === 'Ese grupo no existe') setNoExiste(true)
      else setError('No se pudo traer el grupo.')
    }
  }, [id])

  useEffect(() => {
    if (estado !== 'adentro') return
    void cargar()
    const t = setInterval(() => void cargar(), 20_000)
    return () => clearInterval(t)
  }, [estado, cargar])

  /** Hace algo y recarga; si no se pudo, muestra el motivo. */
  const hacer = async (accion: Promise<Resultado>, exito?: string) => {
    const r = await accion
    setError(r.ok ? null : r.motivo)
    setAviso(r.ok ? (exito ?? null) : null)
    if (r.ok) await cargar()
    return r
  }

  const volver = () => navegar('/')

  if (estado !== 'adentro' || noExiste || !grupo) {
    const texto =
      estado === 'cargando' || estado === 'entrando'
        ? 'Cargando…'
        : estado !== 'adentro'
          ? 'Para ver el grupo, entrá a tu cuenta desde el inicio.'
          : noExiste
            ? 'Ese grupo no existe (o es cerrado y no estás adentro).'
            : (error ?? 'Cargando…')
    return (
      <div className="pantalla-inicio pantalla-online">
        <CabeceraOnline titulo="Grupo" alVolver={volver} />
        <section className="tarjeta">
          <p className="nota-izq">{texto}</p>
        </section>
      </div>
    )
  }

  const rol = grupo.rol
  return (
    <div className="pantalla-inicio pantalla-online pantalla-grupo">
      <CabeceraOnline titulo={grupo.nombre} alVolver={volver} />

      <section className="tarjeta grupo-cabecera">
        <EscudoGrupo id={grupo.id} sigla={grupo.sigla} foto={grupo.foto} tam="grande" />
        <div className="grupo-cabecera-texto">
          <h2>
            <span className="grupo-sigla">[{grupo.sigla}]</span> {grupo.nombre}
          </h2>
          {grupo.descripcion && <p>{grupo.descripcion}</p>}
          <small>
            {NOMBRE_INGRESO[grupo.ingreso]} · {textoMiembros(grupo)}
            {rol && ` · Sos ${NOMBRE_ROL[rol].toLowerCase()}`}
          </small>
        </div>
        {!rol && (
          <button
            type="button"
            className="boton"
            disabled={grupo.pedido}
            onClick={() => void hacer(entrarAGrupo(grupo.id), grupo.ingreso === 'solicitud' ? 'Listo: pediste entrar.' : undefined)}
          >
            {grupo.pedido ? 'Ya pediste entrar' : grupo.ingreso === 'solicitud' ? 'Pedir entrar' : 'Entrar'}
          </button>
        )}
      </section>

      {aviso && (
        <p className="nota-izq" role="status">
          {aviso}
        </p>
      )}
      {error && <MensajeError>{error}</MensajeError>}

      {grupo.codigo && (
        <section className="tarjeta" aria-labelledby="grupo-codigo">
          <h2 id="grupo-codigo">Código de invitación</h2>
          <p className="nota-izq">Con este código entra cualquiera, aunque el grupo sea cerrado. Pasáselo a quien quieras sumar.</p>
          <p className="codigo-amigo">
            <strong>{grupo.codigo}</strong>
            {typeof navigator !== 'undefined' && navigator.clipboard && (
              <button type="button" className="boton-texto" onClick={() => void navigator.clipboard.writeText(grupo.codigo!).then(() => setAviso('Código copiado.'))}>
                Copiar
              </button>
            )}
            <button type="button" className="boton-texto" onClick={() => void hacer(renovarCodigo(grupo.id), 'Código nuevo: el anterior ya no sirve.')}>
              Renovar
            </button>
          </p>
        </section>
      )}

      {grupo.solicitudes && grupo.solicitudes.length > 0 && (
        <section className="tarjeta" aria-labelledby="grupo-solicitudes">
          <h2 id="grupo-solicitudes">Quieren entrar</h2>
          <ul className="amigos">
            {grupo.solicitudes.map((p) => (
              <li key={p.id} className="amigo">
                <span className="amigo-avatar">
                  <Avatar codigo={p.avatar} apodo={p.apodo} />
                </span>
                <span className="amigo-nombre">{p.apodo}</span>
                <span className="amigo-acciones">
                  <button type="button" className="boton" onClick={() => void hacer(responderSolicitud(grupo.id, p.id, true))}>
                    Aceptar
                  </button>
                  <button type="button" className="boton boton-secundario" onClick={() => void hacer(responderSolicitud(grupo.id, p.id, false))}>
                    No
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="tarjeta" aria-labelledby="grupo-miembros">
        <h2 id="grupo-miembros">Miembros</h2>
        <ul className="amigos">
          {grupo.lista.map((m) => (
            <FilaMiembro key={m.id} miembro={m} yo={yo} rol={rol} grupo={grupo.id} hacer={hacer} />
          ))}
        </ul>
      </section>

      {PUEDE.configurar(rol) && (
        <details className="tarjeta grupo-configurar">
          <summary>
            <h2>Configuración</h2>
          </summary>
          <FormularioGrupo
            id={grupo.id}
            foto={grupo.foto}
            inicial={{ nombre: grupo.nombre, sigla: grupo.sigla, descripcion: grupo.descripcion, ingreso: grupo.ingreso, cupo: grupo.cupo }}
            textoBoton="Guardar cambios"
            alGuardar={async (config, foto) => {
              const r = await configurarGrupo(grupo.id, config)
              if (!r.ok) return r.motivo
              const f = foto?.tipo === 'nueva' ? await subirFoto(grupo.id, foto.blob) : foto?.tipo === 'sacar' ? await sacarFoto(grupo.id) : { ok: true as const }
              await cargar()
              if (!f.ok) return f.motivo
              setAviso('Cambios guardados.')
              return null
            }}
          />
        </details>
      )}

      {rol && (
        <section className="tarjeta grupo-salir">
          {confirmar === 'salir' ? (
            <>
              <p className="nota-izq">
                {rol === 'lider' && grupo.lista.length > 1
                  ? 'Si te vas, el liderazgo pasa al capitán más antiguo (o, si no hay, al miembro más antiguo).'
                  : rol === 'lider'
                    ? 'Sos el único: si te vas, el grupo se borra.'
                    : '¿Seguro que te vas del grupo?'}
              </p>
              <button type="button" className="boton boton-peligro" onClick={() => void hacer(salirDeGrupo(grupo.id)).then((r) => r.ok && volver())}>
                Sí, salir del grupo
              </button>
              <button type="button" className="boton-texto" onClick={() => setConfirmar(null)}>
                Cancelar
              </button>
            </>
          ) : confirmar === 'borrar' ? (
            <>
              <p className="nota-izq">Se borra el grupo para todos, con sus miembros y su foto. No se puede deshacer.</p>
              <button type="button" className="boton boton-peligro" onClick={() => void hacer(borrarGrupo(grupo.id)).then((r) => r.ok && volver())}>
                Sí, borrar el grupo
              </button>
              <button type="button" className="boton-texto" onClick={() => setConfirmar(null)}>
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button type="button" className="boton boton-secundario" onClick={() => setConfirmar('salir')}>
                Salir del grupo
              </button>
              {rol === 'lider' && (
                <button type="button" className="boton-texto boton-texto-peligro" onClick={() => setConfirmar('borrar')}>
                  Borrar el grupo
                </button>
              )}
            </>
          )}
        </section>
      )}
    </div>
  )
}

/** Un miembro, con su rol y, tocando "⋯", lo que tu rol te deja hacer con él. */
function FilaMiembro({
  miembro: m,
  yo,
  rol,
  grupo,
  hacer,
}: {
  miembro: MiembroGrupo
  yo: string | null
  rol: RolGrupo | null
  grupo: string
  hacer: (a: Promise<Resultado>, exito?: string) => Promise<Resultado>
}) {
  const [abierto, setAbierto] = useState(false)
  const [confirmar, setConfirmar] = useState<'lider' | 'expulsar' | null>(null)
  const soyYo = m.id === yo
  const puedeRoles = !soyYo && PUEDE.cambiarRoles(rol) && m.rol !== 'lider'
  const puedeExpulsar = !soyYo && PUEDE.expulsar(rol, m.rol)
  const conAcciones = puedeRoles || puedeExpulsar
  const listo = (a: Promise<Resultado>, exito?: string) =>
    void hacer(a, exito).then(() => {
      setAbierto(false)
      setConfirmar(null)
    })
  return (
    <li className={`amigo miembro-grupo rol-${m.rol}`}>
      <span className="amigo-avatar">
        <Avatar codigo={m.avatar} apodo={m.apodo} />
      </span>
      <span className="amigo-nombre">
        {m.apodo}
        {soyYo && ' (vos)'}
        <small className={`grupo-rol rol-${m.rol}`}>{NOMBRE_ROL[m.rol]}</small>
      </span>
      {conAcciones && (
        <span className="amigo-acciones">
          <button
            type="button"
            className="boton-texto"
            aria-expanded={abierto}
            aria-label={`Opciones de ${m.apodo}`}
            onClick={() => {
              setAbierto(!abierto)
              setConfirmar(null)
            }}
          >
            ⋯
          </button>
        </span>
      )}
      {abierto && (
        <span className="miembro-opciones" role="group" aria-label={`Opciones de ${m.apodo}`}>
          {confirmar === 'lider' ? (
            <>
              <span className="nota-izq">¿Le pasás el liderazgo a {m.apodo}? Vos quedás de capitán.</span>
              <button type="button" className="boton" onClick={() => listo(pasarLiderazgo(grupo, m.id), `${m.apodo} es el nuevo líder.`)}>
                Sí, pasárselo
              </button>
            </>
          ) : confirmar === 'expulsar' ? (
            <>
              <span className="nota-izq">¿Sacás a {m.apodo} del grupo?</span>
              <button type="button" className="boton boton-peligro" onClick={() => listo(expulsar(grupo, m.id))}>
                Sí, sacarlo
              </button>
            </>
          ) : (
            <>
              {puedeRoles && m.rol === 'miembro' && (
                <button type="button" className="boton boton-secundario" onClick={() => listo(cambiarRol(grupo, m.id, 'capitan'))}>
                  Hacer capitán
                </button>
              )}
              {puedeRoles && m.rol === 'capitan' && (
                <button type="button" className="boton boton-secundario" onClick={() => listo(cambiarRol(grupo, m.id, 'miembro'))}>
                  Sacar de capitán
                </button>
              )}
              {puedeRoles && (
                <button type="button" className="boton boton-secundario" onClick={() => setConfirmar('lider')}>
                  Pasarle el liderazgo
                </button>
              )}
              {puedeExpulsar && (
                <button type="button" className="boton boton-secundario" onClick={() => setConfirmar('expulsar')}>
                  Sacar del grupo
                </button>
              )}
            </>
          )}
        </span>
      )}
    </li>
  )
}
