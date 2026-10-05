import { useEffect, useRef, useState } from 'react'
import {
  CATALOGO_AVATAR,
  COLORES_PELO,
  PIELES,
  avatarAlAzar,
  codificarAvatar,
  esGratis,
  leerAvatar,
  type Avatar as TAvatar,
  type CapaAvatar,
} from '@truco/shared'
import { GESTO, SENIAS, type Senia } from '@truco/bots'
import { Avatar } from './Avatar'
import { DURACION_GESTO } from '../gestos'
import '../estilos-avatar.css'

/** Las piezas de la capa con su posición en el catálogo, las gratis primero. */
function ordenGratisPrimero(capa: CapaAvatar) {
  return CATALOGO_AVATAR[capa]
    .map((pieza, i) => [pieza, i] as const)
    .sort(([a], [b]) => Number(a.precio > 0) - Number(b.precio > 0))
}

/** Pestañas del editor: cada una junta las capas que se eligen juntas. */
export const PESTANIAS_AVATAR: readonly { id: string; titulo: string; capas: readonly CapaAvatar[] }[] = [
  { id: 'cara', titulo: 'Cara', capas: ['piel', 'cabeza'] },
  { id: 'pelo', titulo: 'Pelo', capas: ['pelo', 'colorPelo'] },
  { id: 'ojos', titulo: 'Ojos', capas: ['ojos'] },
  { id: 'cejas', titulo: 'Cejas', capas: ['cejas'] },
  { id: 'nariz', titulo: 'Nariz', capas: ['nariz'] },
  { id: 'boca', titulo: 'Boca', capas: ['boca'] },
  { id: 'barba', titulo: 'Barba y pecas', capas: ['barba', 'pecas'] },
  { id: 'lentes', titulo: 'Lentes y aros', capas: ['lentes', 'aros'] },
  { id: 'ropa', titulo: 'Ropa', capas: ['ropa'] },
  { id: 'sombrero', titulo: 'Sombrero', capas: ['sombrero'] },
  { id: 'accesorio', titulo: 'Accesorio', capas: ['accesorio'] },
]

const TITULO_CAPA: Record<CapaAvatar, string> = {
  piel: 'Piel',
  cabeza: 'Forma de la cara',
  pelo: 'Peinado',
  colorPelo: 'Color de pelo',
  cejas: 'Cejas',
  ojos: 'Ojos',
  nariz: 'Nariz',
  boca: 'Boca',
  barba: 'Barba',
  lentes: 'Lentes',
  aros: 'Aros',
  pecas: 'Pecas',
  ropa: 'Ropa',
  sombrero: 'Sombrero',
  accesorio: 'Accesorio',
}

/** Las capas que se eligen por color (muestras redondas en lugar de miniaturas). */
const COLORES: Partial<Record<CapaAvatar, readonly string[]>> = { piel: PIELES, colorPelo: COLORES_PELO }

/** Las piezas chicas de la cara se ven mejor con la miniatura acercada a la cara. */
const CERCA: readonly CapaAvatar[] = ['ojos', 'cejas', 'nariz', 'boca', 'pecas', 'lentes', 'aros', 'barba', 'cabeza']

/** El código con otra pieza en una capa, o null si la pieza es de la tienda (todavía no se puede usar). */
export function conPieza(codigo: string, capa: CapaAvatar, pieza: number): string | null {
  const a = leerAvatar(codigo)
  if (!a || !esGratis(capa, pieza)) return null
  return codificarAvatar({ ...a, [capa]: pieza })
}

/** Un avatar nuevo al azar, solo con piezas gratis. */
export const avatarNuevoAlAzar = () => codificarAvatar(avatarAlAzar(`${Date.now()}-${Math.random()}`, true))

function Candado() {
  return (
    <svg className="candado" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="2.5" y="7" width="11" height="8" rx="2" fill="currentColor" />
    </svg>
  )
}

/** El precio de una pieza de la tienda: candado y monedas. */
function Precio({ monedas }: { monedas: number }) {
  return (
    <span className="pieza-precio" aria-hidden="true">
      <Candado />
      {monedas}
    </span>
  )
}

function Opciones({
  capa,
  avatar,
  apodo,
  alElegir,
  alTocarPaga,
}: {
  capa: CapaAvatar
  avatar: TAvatar
  apodo: string
  alElegir: (pieza: number) => void
  alTocarPaga: (nombre: string, precio: number) => void
}) {
  const colores = COLORES[capa]
  return (
    <div
      className={`piezas ${colores ? 'piezas-colores' : 'piezas-miniaturas'}`}
      role="radiogroup"
      aria-label={TITULO_CAPA[capa]}
    >
      {/* Primero las gratis: en los peinados, la mayoría son de la tienda. */}
      {ordenGratisPrimero(capa).map(([pieza, i]) => {
        const elegida = avatar[capa] === i
        const paga = pieza.precio > 0
        const etiqueta = paga ? `${pieza.nombre}: ${pieza.precio} monedas, pronto en la tienda` : pieza.nombre
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={elegida}
            aria-disabled={paga || undefined}
            aria-label={etiqueta}
            title={paga ? `${pieza.precio} monedas · Pronto en la tienda` : pieza.nombre}
            className={`pieza${elegida ? ' elegida' : ''}${paga ? ' paga' : ''}`}
            // Las pagas no se eligen, pero se pueden tocar: avisan cuánto cuestan.
            onClick={() => (paga ? alTocarPaga(pieza.nombre, pieza.precio) : alElegir(i))}
          >
            {colores ? (
              <span className="pieza-color" style={{ background: colores[i] }} />
            ) : (
              <span className={`pieza-miniatura${CERCA.includes(capa) ? ' cerca' : ''}`}>
                <Avatar codigo={codificarAvatar({ ...avatar, [capa]: i })} apodo={apodo} />
              </span>
            )}
            {paga && <Precio monedas={pieza.precio} />}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Editor del avatar por capas: el avatar grande, una pestaña por parte y, en cada una, las
 * piezas con su miniatura. Las de la tienda se ven con candado y precio, pero todavía no se
 * pueden elegir. Cada cambio llama a `alCambiar` con el código nuevo (el perfil lo guarda).
 */
export function EditorAvatar({ codigo, apodo, alCambiar }: { codigo: string; apodo: string; alCambiar: (codigo: string) => void }) {
  const avatar = leerAvatar(codigo) ?? avatarAlAzar(apodo)
  const [pestania, setPestania] = useState(PESTANIAS_AVATAR[0]!.id)
  const [aviso, setAviso] = useState<string | null>(null)
  const [senia, setSenia] = useState<{ senia: Senia; id: number } | null>(null)
  const proximaSenia = useRef(0)

  // El gesto dura lo mismo que en la mesa; después la cara vuelve a quedar quieta.
  useEffect(() => {
    if (!senia) return
    const t = setTimeout(() => setSenia(null), DURACION_GESTO)
    return () => clearTimeout(t)
  }, [senia])

  const actual = PESTANIAS_AVATAR.find((p) => p.id === pestania) ?? PESTANIAS_AVATAR[0]!
  const hayPagas = actual.capas.some((c) => CATALOGO_AVATAR[c].some((p) => p.precio > 0))

  const elegir = (capa: CapaAvatar, pieza: number) => {
    const nuevo = conPieza(codificarAvatar(avatar), capa, pieza)
    setAviso(null)
    if (nuevo) alCambiar(nuevo)
  }
  const verSenia = () => {
    const s = SENIAS[proximaSenia.current++ % SENIAS.length]!
    setSenia({ senia: s, id: Date.now() })
  }

  return (
    <div className="editor-avatar">
      <div className="editor-avatar-vista">
        <div className="editor-avatar-grande">
          <Avatar key={senia?.id} codigo={codificarAvatar(avatar)} apodo={apodo} gesto={senia?.senia ?? null} />
        </div>
        <p className="editor-avatar-gesto" aria-live="polite">
          {senia ? GESTO[senia.senia] : ' '}
        </p>
        <div className="editor-avatar-botones">
          <button
            type="button"
            className="boton boton-secundario"
            onClick={() => {
              setAviso(null)
              alCambiar(avatarNuevoAlAzar())
            }}
          >
            Al azar
          </button>
          <button type="button" className="boton boton-secundario" onClick={verSenia}>
            Ver una seña
          </button>
        </div>
      </div>

      <div className="editor-avatar-partes">
        <div className="editor-pestanias" role="tablist" aria-label="Partes del avatar">
          {PESTANIAS_AVATAR.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              id={`pestania-avatar-${p.id}`}
              aria-selected={p.id === actual.id}
              aria-controls="panel-avatar"
              className={p.id === actual.id ? 'elegida' : ''}
              onClick={() => {
                setPestania(p.id)
                setAviso(null)
              }}
            >
              {p.titulo}
            </button>
          ))}
        </div>

        <div className="editor-panel" role="tabpanel" id="panel-avatar" aria-labelledby={`pestania-avatar-${actual.id}`}>
          {actual.capas.map((capa) => (
            <section key={capa} className="editor-capa">
              {actual.capas.length > 1 && <h3>{TITULO_CAPA[capa]}</h3>}
              <Opciones
                capa={capa}
                avatar={avatar}
                apodo={apodo}
                alElegir={(i) => elegir(capa, i)}
                alTocarPaga={(nombre, precio) => setAviso(`${nombre} cuesta ${precio} monedas. Pronto en la tienda.`)}
              />
            </section>
          ))}
          {hayPagas && <p className="editor-tienda">Las que tienen candado se compran con monedas. Pronto en la tienda.</p>}
        </div>
        <p className="editor-aviso" role="status">
          {aviso}
        </p>
      </div>
    </div>
  )
}
