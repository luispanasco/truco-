import { useEffect, useRef, useState, type FormEvent } from 'react'
import { LIMITES_GRUPO, NOMBRE_CONVOCAN, NOMBRE_INGRESO, validarConfigGrupo, type ConfigGrupo, type ConvocanGrupo, type IngresoGrupo } from '@truco/shared'
import { achicarFoto } from '../cuenta/grupos'
import { EscudoGrupo } from './EscudoGrupo'
import { MensajeError } from './Online'

const DETALLE_INGRESO: Record<IngresoGrupo, string> = {
  abierto: 'Entra cualquiera desde la lista',
  solicitud: 'Piden entrar y los acepta un capitán o el líder',
  cerrado: 'No aparece en la lista: se entra solo con el código',
}

const DETALLE_CONVOCAN: Record<ConvocanGrupo, string> = {
  todos: 'Cualquiera del grupo arma una partida y llama a todos',
  capitanes: 'Solo el líder y los capitanes llaman a todo el grupo',
}

export const CONFIG_NUEVA: ConfigGrupo = { nombre: '', sigla: '', descripcion: '', ingreso: 'abierto', cupo: null, convocan: 'todos' }

/** Lo que cambió de la foto: una nueva (ya achicada), sacarla, o nada. */
export type CambioFoto = { tipo: 'nueva'; blob: Blob } | { tipo: 'sacar' } | null

/**
 * La configuración de un grupo (para crearlo y para que el líder la cambie): la foto, el nombre,
 * la sigla, la descripción, cómo se entra, el cupo y quién arma partidas. Valida igual que el servidor antes de mandar.
 */
export function FormularioGrupo({
  inicial,
  id,
  foto,
  textoBoton,
  alGuardar,
}: {
  inicial: ConfigGrupo
  /** Si el grupo ya existe: para mostrar su foto. */
  id?: string
  foto?: number | null
  textoBoton: string
  /** Devuelve el motivo si no se pudo. */
  alGuardar: (config: ConfigGrupo, foto: CambioFoto) => Promise<string | null>
}) {
  const [c, setC] = useState(inicial)
  const [cambioFoto, setCambioFoto] = useState<CambioFoto>(null)
  const [vista, setVista] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mandando, setMandando] = useState(false)
  const archivo = useRef<HTMLInputElement>(null)
  const L = LIMITES_GRUPO
  const cambiar = (p: Partial<ConfigGrupo>) => {
    setC((v) => ({ ...v, ...p }))
    setError(null)
  }

  // La vista previa de la foto nueva se suelta al cambiarla o al cerrar.
  useEffect(() => () => void (vista && URL.revokeObjectURL(vista)), [vista])

  const elegirFoto = async (f: File | undefined) => {
    if (!f) return
    try {
      const blob = await achicarFoto(f)
      setCambioFoto({ tipo: 'nueva', blob })
      setVista(URL.createObjectURL(blob))
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo leer la foto')
    }
  }

  const guardar = async (e: FormEvent) => {
    e.preventDefault()
    const config = validarConfigGrupo(c)
    if (typeof config === 'string') return setError(config)
    setMandando(true)
    const motivo = await alGuardar(config, cambioFoto)
    setMandando(false)
    if (motivo) setError(motivo)
  }

  const tieneFoto = cambioFoto?.tipo === 'nueva' || (cambioFoto === null && foto != null)
  return (
    <form className="formulario-grupo" onSubmit={(e) => void guardar(e)}>
      <div className="grupo-foto-elegir">
        <EscudoGrupo id={id} sigla={c.sigla.toUpperCase()} foto={cambioFoto?.tipo === 'sacar' ? null : (foto ?? null)} vista={vista} tam="grande" />
        <div className="grupo-foto-botones">
          <button type="button" className="boton boton-secundario" onClick={() => archivo.current?.click()}>
            {tieneFoto ? 'Cambiar foto' : 'Elegir foto'}
          </button>
          {tieneFoto && (
            <button
              type="button"
              className="boton-texto"
              onClick={() => {
                setCambioFoto(foto != null ? { tipo: 'sacar' } : null)
                setVista(null)
              }}
            >
              Sacar foto
            </button>
          )}
          <input
            ref={archivo}
            type="file"
            accept="image/*"
            hidden
            aria-label="Foto del grupo"
            onChange={(e) => {
              void elegirFoto(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>
      </div>
      <label className="perfil-apodo">
        <span>Nombre</span>
        <input value={c.nombre} maxLength={L.nombreMax} placeholder="Los del boliche" onChange={(e) => cambiar({ nombre: e.target.value })} />
      </label>
      <label className="perfil-apodo">
        <span>Sigla ({L.siglaMin} a {L.siglaMax} letras)</span>
        <input
          value={c.sigla}
          maxLength={L.siglaMax}
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          placeholder="BOL"
          onChange={(e) => cambiar({ sigla: e.target.value.toUpperCase().replace(/[^A-ZÑ0-9]/g, '') })}
        />
      </label>
      <label className="perfil-apodo">
        <span>Descripción</span>
        <textarea value={c.descripcion} maxLength={L.descripcionMax} rows={2} placeholder="Opcional" onChange={(e) => cambiar({ descripcion: e.target.value })} />
      </label>
      <div className="campo">
        <span id="grupo-ingreso">Cómo se entra</span>
        <div className="segmentado" role="radiogroup" aria-labelledby="grupo-ingreso">
          {(Object.keys(NOMBRE_INGRESO) as IngresoGrupo[]).map((i) => (
            <button key={i} type="button" role="radio" aria-checked={c.ingreso === i} className={c.ingreso === i ? 'elegido' : ''} onClick={() => cambiar({ ingreso: i })}>
              {NOMBRE_INGRESO[i]}
            </button>
          ))}
        </div>
        <small className="nota-izq">{DETALLE_INGRESO[c.ingreso]}</small>
      </div>
      <label className="perfil-apodo">
        <span>Cupo (vacío, sin cupo)</span>
        <input
          type="number"
          inputMode="numeric"
          min={L.cupoMin}
          max={L.cupoMax}
          value={c.cupo ?? ''}
          placeholder="Sin cupo"
          onChange={(e) => cambiar({ cupo: e.target.value === '' ? null : Number(e.target.value) })}
        />
      </label>
      <div className="campo">
        <span id="grupo-convocan">Quién arma partidas</span>
        <div className="segmentado" role="radiogroup" aria-labelledby="grupo-convocan">
          {(Object.keys(NOMBRE_CONVOCAN) as ConvocanGrupo[]).map((q) => (
            <button key={q} type="button" role="radio" aria-checked={c.convocan === q} className={c.convocan === q ? 'elegido' : ''} onClick={() => cambiar({ convocan: q })}>
              {NOMBRE_CONVOCAN[q]}
            </button>
          ))}
        </div>
        <small className="nota-izq">{DETALLE_CONVOCAN[c.convocan]}</small>
      </div>
      {error && <MensajeError>{error}</MensajeError>}
      <button type="submit" className="boton boton-grande boton-relieve" disabled={mandando}>
        {mandando ? 'Guardando…' : textoBoton}
      </button>
    </form>
  )
}
