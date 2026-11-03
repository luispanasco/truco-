import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { LARGO_CODIGO_GRUPO, MAX_GRUPOS, NOMBRE_ROL, type ResumenGrupo } from '@truco/shared'
import { EscudoGrupo } from '../componentes/EscudoGrupo'
import { CONFIG_NUEVA, FormularioGrupo } from '../componentes/FormularioGrupo'
import { Hoja } from '../componentes/Hoja'
import { MensajeError } from '../componentes/Online'
import { useCuenta } from '../cuenta/cuenta'
import { IconoGrupos } from './Iconos'
import '../estilos-grupos.css'
import { cancelarPedido, cargarGrupos, crearGrupo, entrarAGrupo, entrarConCodigo, subirFoto, useGrupos } from '../cuenta/grupos'

/** "3 miembros", "1 miembro", "4 de 10". */
export function textoMiembros(g: Pick<ResumenGrupo, 'miembros' | 'cupo'>): string {
  if (g.cupo !== null) return `${g.miembros} de ${g.cupo}`
  return `${g.miembros} ${g.miembros === 1 ? 'miembro' : 'miembros'}`
}

/**
 * Los grupos (como los clanes): los tuyos, los que se pueden buscar para entrar, entrar con un
 * código y crear uno. Hace falta la cuenta. Cada grupo se abre en su pantalla (/grupos/:id).
 */
export function PanelGrupos({ alEntrar }: { alEntrar: () => void }) {
  const navegar = useNavigate()
  const estado = useCuenta((s) => s.estado)
  const lista = useGrupos((s) => s.lista)
  const [codigo, setCodigo] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)

  useEffect(() => {
    if (estado === 'adentro') void cargarGrupos().catch(() => setError('No se pudo traer la lista de grupos.'))
  }, [estado])

  if (estado !== 'adentro') {
    return (
      <section className="tarjeta grupos-pronto" aria-labelledby="grupos-sin-cuenta">
        <IconoGrupos clase="grupos-pronto-icono" />
        <h2 id="grupos-sin-cuenta">Armá tu grupo</h2>
        <p>Con nombre, sigla y foto, con tus amigos de la mesa. Para crear uno o entrar, entrá a tu cuenta.</p>
        {(estado === 'afuera' || estado === 'entrando') && (
          <button type="button" className="boton" onClick={alEntrar}>
            Entrar a tu cuenta
          </button>
        )}
      </section>
    )
  }

  const resultado = (r: { ok: true } | { ok: false; motivo: string }, exito?: string) => {
    setError(r.ok ? null : r.motivo)
    setAviso(r.ok ? (exito ?? null) : null)
  }
  const entrar = async (g: ResumenGrupo) => {
    const r = await entrarAGrupo(g.id)
    if (r.ok && r.datos.adentro) return navegar(`/grupos/${g.id}`)
    resultado(r, `Listo: le pediste entrar a ${g.nombre}.`)
  }
  const conCodigo = async (e: FormEvent) => {
    e.preventDefault()
    const r = await entrarConCodigo(codigo)
    if (r.ok) return navegar(`/grupos/${r.datos.id}`)
    resultado(r)
  }

  return (
    <>
      <section className="tarjeta" aria-labelledby="grupos-tuyos">
        <h2 id="grupos-tuyos">Tus grupos</h2>
        {!lista && <p className="nota">Cargando…</p>}
        {lista && lista.tuyos.length === 0 && <p className="nota-izq">Todavía no estás en ningún grupo.</p>}
        {lista && lista.tuyos.length > 0 && (
          <ul className="grupos">
            {lista.tuyos.map((g) => (
              <li key={g.id}>
                <button type="button" className="grupo-fila" onClick={() => navegar(`/grupos/${g.id}`)}>
                  <FilaGrupo grupo={g} detalle={`${NOMBRE_ROL[g.rol!]} · ${textoMiembros(g)}`} />
                  <span className="grupo-fila-ir" aria-hidden="true">
                    ›
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {lista && (
          <button
            type="button"
            className="boton boton-relieve"
            disabled={lista.quedan === 0}
            onClick={() => {
              setError(null)
              setCreando(true)
            }}
          >
            Crear grupo
          </button>
        )}
        {lista?.quedan === 0 && <p className="nota-izq">Ya hay {MAX_GRUPOS} grupos, el máximo de la beta.</p>}
      </section>

      <section className="tarjeta" aria-labelledby="grupos-codigo">
        <h2 id="grupos-codigo">Unirme con código</h2>
        <form className="amigos-agregar" onSubmit={(e) => void conCodigo(e)}>
          <label className="perfil-apodo">
            <span>El código que te pasaron</span>
            <input
              value={codigo}
              maxLength={LARGO_CODIGO_GRUPO}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              placeholder="ABC2345"
              onChange={(e) => {
                setCodigo(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))
                setError(null)
              }}
            />
          </label>
          <button type="submit" className="boton" disabled={codigo.length !== LARGO_CODIGO_GRUPO}>
            Entrar
          </button>
        </form>
      </section>

      {lista && lista.buscar.length > 0 && (
        <section className="tarjeta" aria-labelledby="grupos-buscar">
          <h2 id="grupos-buscar">Buscar grupos</h2>
          <ul className="grupos">
            {lista.buscar.map((g) => (
              <li key={g.id} className="grupo-fila">
                <FilaGrupo grupo={g} detalle={`${textoMiembros(g)}${g.ingreso === 'solicitud' ? ' · con solicitud' : ''}`} />
                {g.pedido ? (
                  <button type="button" className="boton boton-secundario" onClick={() => void cancelarPedido(g.id).then((r) => resultado(r))}>
                    Cancelar pedido
                  </button>
                ) : (
                  <button
                    type="button"
                    className="boton"
                    disabled={g.cupo !== null && g.miembros >= g.cupo}
                    aria-label={`${g.ingreso === 'solicitud' ? 'Pedir entrar a' : 'Entrar a'} ${g.nombre}`}
                    onClick={() => void entrar(g)}
                  >
                    {g.cupo !== null && g.miembros >= g.cupo ? 'Lleno' : g.ingreso === 'solicitud' ? 'Pedir entrar' : 'Entrar'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {aviso && (
        <p className="nota-izq" role="status">
          {aviso}
        </p>
      )}
      {error && <MensajeError>{error}</MensajeError>}

      {creando && (
        <Hoja titulo="Crear grupo" alCerrar={() => setCreando(false)} clase="hoja-menu hoja-ajustes" claseFondo="hoja-fija">
          <div className="hoja-menu-contenido">
            <FormularioGrupo
              inicial={CONFIG_NUEVA}
              textoBoton="Crear grupo"
              alGuardar={async (config, foto) => {
                const r = await crearGrupo(config)
                if (!r.ok) return r.motivo
                // La foto va aparte; si falla, el grupo ya está creado y se cambia desde su configuración.
                if (foto?.tipo === 'nueva') await subirFoto(r.datos.id, foto.blob)
                setCreando(false)
                navegar(`/grupos/${r.datos.id}`)
                return null
              }}
            />
          </div>
        </Hoja>
      )}
    </>
  )
}

/** Escudo, [SIGLA] nombre y un detalle abajo. */
export function FilaGrupo({ grupo, detalle }: { grupo: Pick<ResumenGrupo, 'id' | 'nombre' | 'sigla' | 'foto'>; detalle: string }) {
  return (
    <>
      <EscudoGrupo id={grupo.id} sigla={grupo.sigla} foto={grupo.foto} />
      <span className="grupo-fila-texto">
        <strong>
          <span className="grupo-sigla">[{grupo.sigla}]</span> {grupo.nombre}
        </strong>
        <small>{detalle}</small>
      </span>
    </>
  )
}
