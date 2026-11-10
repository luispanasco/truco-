import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { codificarAvatar, PERSONAJES } from '@truco/shared'
import { Avatar } from '../componentes/Avatar'
import { leerPerfil } from '../perfil'

/**
 * Las piezas de las escenas del modo historia (la previa de un nivel, su final y la despedida del
 * departamento): las figuras en fila, al frente la que habla, y el globo de lo que dice.
 */

const personaje = (id: string) => PERSONAJES.find((p) => p.id === id)!

/** El nombre de quien habla: el personaje o, si sos vos (`null`), tu apodo. */
export const nombreDe = (id: string | null) => (id === null ? leerPerfil().apodo || 'Vos' : personaje(id).nombre)

/** Una figura de la escena: al frente e iluminada si está hablando; si no, atrás y en penumbra. */
export function Figura({ codigo, apodo, nombre, habla, quieto }: { codigo: string; apodo?: string; nombre: string; habla: boolean; quieto: boolean }) {
  return (
    <motion.div
      className={`previa-figura${habla ? ' habla' : ''}`}
      initial={false}
      animate={{
        scale: habla ? 1.12 : 0.8,
        y: habla ? 0 : 10,
        filter: habla ? 'brightness(1) saturate(1)' : 'brightness(0.45) saturate(0.6)',
      }}
      transition={quieto ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 26 }}
    >
      <span className="previa-figura-avatar" aria-hidden="true">
        <Avatar codigo={codigo} apodo={apodo} encuadre="busto" />
      </span>
      <span className="previa-figura-nombre">{nombre}</span>
    </motion.div>
  )
}

/** Un personaje en la escena, por su id. */
export function FiguraDe({ id, habla, quieto }: { id: string; habla: boolean; quieto: boolean }) {
  const p = personaje(id)
  return <Figura codigo={codificarAvatar(p.avatar)} nombre={p.nombre} habla={habla} quieto={quieto} />
}

/** Vos en la escena, con tu avatar y tu apodo. */
export function FiguraVos({ habla, quieto }: { habla: boolean; quieto: boolean }) {
  const perfil = leerPerfil()
  return <Figura codigo={perfil.avatar} apodo={perfil.apodo} nombre={nombreDe(null)} habla={habla} quieto={quieto} />
}

/** El del medio va al medio: [a, b, c] → [b, a, c]. */
export const alMedio = <T,>(lista: readonly T[]): T[] => (lista.length < 2 ? [...lista] : [lista[1]!, lista[0]!, ...lista.slice(2)])

/**
 * El globo de lo que se dice, con quién lo dice arriba. La colita apunta al que habla: arriba (un
 * personaje de la fila de arriba) o abajo (tu equipo). `clave` cambia con cada frase (para la
 * animación).
 */
export function Globo({
  clave,
  quien,
  desdeAbajo,
  extra,
  clase = '',
  quieto,
  children,
}: {
  clave: string
  quien: string
  desdeAbajo: boolean
  extra?: ReactNode
  clase?: string
  quieto: boolean
  children: ReactNode
}) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={clave}
        className={`historia-globo ${desdeAbajo ? 'desde-abajo' : 'desde-arriba'}${clase ? ` ${clase}` : ''}`}
        role="status"
        initial={quieto ? false : { opacity: 0, y: desdeAbajo ? 10 : -10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={quieto ? undefined : { opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        <span className="historia-globo-quien">
          {quien}
          {extra}
        </span>
        <p>{children}</p>
      </motion.div>
    </AnimatePresence>
  )
}
