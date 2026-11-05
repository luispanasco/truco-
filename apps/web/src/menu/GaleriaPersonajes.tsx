import { useState } from 'react'
import { codificarAvatar, PERSONAJES, type Personaje } from '@truco/shared'
import { Avatar } from '../componentes/Avatar'
import type { Perfil } from '../perfil'

/**
 * Los personajes del modo historia (solo para el admin, mientras se arma): cada uno con su lugar
 * y su descripción, y "Probarte", que te pone su avatar (con "Volver al tuyo").
 */
export function GaleriaPersonajes({ perfil, cambiar }: { perfil: Perfil; cambiar: (p: Partial<Perfil>) => void }) {
  const [probado, setProbado] = useState<{ personaje: Personaje; anterior: string } | null>(null)

  const probar = (p: Personaje) => {
    setProbado({ personaje: p, anterior: probado?.anterior ?? perfil.avatar })
    cambiar({ avatar: codificarAvatar(p.avatar) })
  }
  const deshacer = () => {
    if (!probado) return
    cambiar({ avatar: probado.anterior })
    setProbado(null)
  }

  return (
    <section className="tarjeta" aria-labelledby="personalizar-personajes">
      <h2 id="personalizar-personajes">Personajes del modo historia</h2>
      <p className="nota-izq">Solo los ve el admin. También son los bots de tus partidas.</p>
      <ul className="personajes">
        {PERSONAJES.map((p) => (
          <li key={p.id} className="personaje">
            <span className="personalizar-avatar-img">
              <Avatar codigo={codificarAvatar(p.avatar)} apodo={p.nombre} />
            </span>
            <span className="personaje-texto">
              <strong>
                {p.nombre} {p.titulo}
              </strong>
              <small>{p.lugar}</small>
              <span>{p.descripcion}</span>
            </span>
            <button type="button" className="boton boton-secundario" aria-label={`Probarte a ${p.nombre} ${p.titulo}`} onClick={() => probar(p)}>
              Probarte
            </button>
          </li>
        ))}
      </ul>
      {probado && (
        <p className="nota-izq personaje-probado" role="status">
          Tenés puesto a {probado.personaje.nombre} {probado.personaje.titulo}.{' '}
          <button type="button" className="boton-texto" onClick={deshacer}>
            Volver al tuyo
          </button>
        </p>
      )}
    </section>
  )
}
