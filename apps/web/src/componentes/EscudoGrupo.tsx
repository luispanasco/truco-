import { urlFotoGrupo } from '../cuenta/grupos'

/** La cara del grupo: su foto, o sin foto un escudo con la sigla. Decorativa: el nombre va al lado. */
export function EscudoGrupo({ id, sigla, foto, vista, tam = 'normal' }: { id?: string; sigla: string; foto: number | null; vista?: string | null; tam?: 'normal' | 'grande' }) {
  const src = vista ?? (id && foto !== null ? urlFotoGrupo(id, foto) : null)
  return (
    <span className={`escudo-grupo escudo-${tam}`} aria-hidden="true">
      {src ? <img src={src} alt="" draggable={false} /> : <span className="escudo-sigla">{sigla || '?'}</span>}
    </span>
  )
}
