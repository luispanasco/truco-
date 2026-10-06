import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { nombreCarta, piezaDe, type Carta as TCarta } from '@truco/engine'
import { seniaDeCarta, seniasDeMano, type Senia } from '@truco/bots'
import type { ConfigSenias } from '@truco/shared'
import { GESTO, SIGNIFICADO } from '../senias'
import type { ParteCara, ZonaCara, ZonasCara } from '../avatares/gestos'
import { Avatar } from './Avatar'
import { Hoja } from './Hoja'
import '../estilos-senias.css'

/** Abre la cara de señas. Solo aparece cuando hay compañeros en el duelo. */
export function BotonSenias({ alTocar, cerrado = null }: { alTocar: () => void; cerrado?: string | null }) {
  return (
    <button
      type="button"
      className="boton-senias"
      onClick={alTocar}
      aria-label="Hacer una seña"
      disabled={cerrado !== null}
      title={cerrado ?? undefined}
    >
      <span aria-hidden="true">😉</span>
      <span className="boton-senias-texto">Seña</span>
    </button>
  )
}

/** Rótulo corto de cada seña, para escribirlo sobre la cara. */
const ROTULO: Record<Senia, string> = {
  pieza2: 'pieza 2',
  pieza4: 'pieza 4',
  pieza5: 'pieza 5',
  perico: 'perico',
  perica: 'perica',
  unoBravo: '1 esp/bas',
  sieteBravo: '7 esp/oro',
  tres: 'un 3',
  dosComun: 'un 2',
  unoFalso: '1 cop/oro',
  flor: 'flor',
}

/** Las señas de la boca, en el menú corto que se abre al tocarla. */
const BOCA: { senia: Senia; icono: string; nombre: string }[] = [
  { senia: 'pieza4', icono: '💋', nombre: 'Beso' },
  { senia: 'tres', icono: '😬', nombre: 'Morder' },
  { senia: 'dosComun', icono: '😮', nombre: 'Abrir' },
  { senia: 'unoFalso', icono: '😛', nombre: 'Lengua' },
  { senia: 'flor', icono: '🐸', nombre: 'Inflar' },
]

/**
 * Partes de la cara que se tocan. Se ubican sobre las capas de tu avatar (medidas al
 * dibujarlo); la cara se ve como en un espejo: el ojo de la derecha de la pantalla es tu
 * ojo derecho.
 */
interface Zona {
  clase: string
  senia: Senia | 'boca'
  parte: ParteCara
  arriba: number
  /** Repetida (el otro cachete): no se anuncia dos veces al lector de pantalla. */
  repetida?: boolean
}
// En el orden de lectura. `arriba`: si dos se pisan, cuál queda encima (los ojos, sobre todo).
const ZONAS: Zona[] = [
  { clase: 'cejas', senia: 'pieza2', parte: 'cejas', arriba: 3 },
  { clase: 'ojo izq', senia: 'perica', parte: 'ojoIzq', arriba: 4 },
  { clase: 'ojo der', senia: 'perico', parte: 'ojoDer', arriba: 4 },
  { clase: 'nariz', senia: 'pieza5', parte: 'nariz', arriba: 3 },
  { clase: 'cachete izq', senia: 'flor', parte: 'cacheteIzq', arriba: 1 },
  { clase: 'cachete der', senia: 'flor', parte: 'cacheteDer', arriba: 1, repetida: true },
  { clase: 'boca', senia: 'boca', parte: 'boca', arriba: 2 },
  { clase: 'pera izq', senia: 'sieteBravo', parte: 'peraIzq', arriba: 1 },
  { clase: 'pera der', senia: 'unoBravo', parte: 'peraDer', arriba: 1 },
]
/** Dónde van las zonas hasta poder medir el avatar (o si no se puede: jsdom). En %. */
const en = (x: number, y: number, ancho: number, alto: number): ZonaCara => ({ x, y, ancho, alto })
const ZONAS_REPUESTO: ZonasCara = {
  cejas: en(18, 12, 64, 14),
  ojoIzq: en(18, 27, 31, 15),
  ojoDer: en(51, 27, 31, 15),
  nariz: en(50, 43, 16, 13),
  cacheteIzq: en(10, 48, 22, 16),
  cacheteDer: en(70, 48, 22, 16),
  boca: en(38, 58, 28, 12),
  peraIzq: en(30, 72, 22, 13),
  peraDer: en(52, 72, 22, 13),
}

const etiqueta = (s: Senia) => `${GESTO[s]} (${SIGNIFICADO[s]})`
/** Cuánto se ve el gesto en la cara grande antes de que se cierre la hoja. */
const ESPERA_CIERRE = 1100

/**
 * Las señas en una cara: tocás la parte (cejas, ojos, nariz, boca, cachetes, pera) y la
 * cara hace el gesto y se lo manda a tus compañeros. Con ayudas, se marcan las señas
 * de tus cartas; igual se puede hacer cualquier otra (para mentir).
 */
export function PanelSenias({
  avatar,
  apodo = '',
  alElegir,
  alCerrar,
  sugeridas = null,
  config,
  cerrado = null,
}: {
  /** Tu avatar (el código, como viaja en tu lugar de la mesa). */
  avatar: string
  apodo?: string
  alElegir: (s: Senia) => void
  alCerrar: () => void
  /** Señas de tus cartas (solo con ayudas); null para no marcar nada. */
  sugeridas?: readonly Senia[] | null
  config?: ConfigSenias
  /** Motivo por el que ya no se pueden hacer señas en esta mano, o null. */
  cerrado?: string | null
}) {
  const [boca, setBoca] = useState(false)
  const [hecha, setHecha] = useState<{ senia: Senia; id: number } | null>(null)
  const [zonas, setZonas] = useState<ZonasCara | null>(null)
  // Se guarda solo si cambió: medir de nuevo da lo mismo y no hace falta volver a dibujar.
  const alMedir = useCallback(
    (z: ZonasCara | null) => setZonas((antes) => (z && JSON.stringify(z) !== JSON.stringify(antes) ? z : antes)),
    [],
  )

  useEffect(() => {
    if (!hecha) return
    const t = setTimeout(alCerrar, ESPERA_CIERRE)
    return () => clearTimeout(t)
  }, [hecha, alCerrar])

  const hacer = (s: Senia) => {
    if (hecha || cerrado) return
    setBoca(false)
    setHecha({ senia: s, id: Date.now() })
    alElegir(s)
  }
  const sugerida = (z: Senia | 'boca') =>
    !!sugeridas && (z === 'boca' ? BOCA.some((b) => sugeridas.includes(b.senia)) : sugeridas.includes(z))
  const pesca =
    config && config.pescar !== 'nunca' && config.probabilidadPescar > 0
      ? ` Ojo: un rival la puede pescar (${Math.round(config.probabilidadPescar * 100)} %).`
      : ''

  return (
    <Hoja titulo="Señas" alCerrar={alCerrar} clase="hoja-senias">
      <p className="senias-nota">
        {cerrado ?? <>Tocá una parte de la cara: tus compañeros ven la seña.{pesca}</>}
      </p>
      <div className={`cara-senias${cerrado ? ' cerrada' : ''}${hecha ? ' haciendo' : ''}`}>
        <Avatar key={hecha?.id ?? 0} codigo={avatar} apodo={apodo} gesto={hecha?.senia} encuadre="cara" clase="cara-grande" alMedir={alMedir} />
        {ZONAS.map((z) => {
          const lugar = (zonas ?? ZONAS_REPUESTO)[z.parte]
          const estilo = { left: `${lugar.x}%`, top: `${lugar.y}%`, width: `${lugar.ancho}%`, height: `${lugar.alto}%`, zIndex: z.arriba } as CSSProperties
          const esBoca = z.senia === 'boca'
          return (
            <button
              key={z.clase}
              type="button"
              className={`zona-cara zona-${z.clase.replace(' ', ' zona-')}${sugerida(z.senia) ? ' sugerida' : ''}${esBoca && boca ? ' abierta' : ''}`}
              style={estilo}
              disabled={!!cerrado || !!hecha}
              aria-label={esBoca ? 'Boca: más señas' : etiqueta(z.senia as Senia)}
              aria-expanded={esBoca ? boca : undefined}
              aria-hidden={z.repetida || undefined}
              tabIndex={z.repetida ? -1 : undefined}
              onClick={() => (esBoca ? setBoca((b) => !b) : hacer(z.senia as Senia))}
            >
              <span className="zona-rotulo" aria-hidden="true">
                {sugerida(z.senia) && '★ '}
                {esBoca ? 'boca ▾' : ROTULO[z.senia as Senia]}
              </span>
            </button>
          )
        })}
      </div>
      <div className="senias-pie" aria-live="polite">
        {hecha ? (
          <p className="senias-hecha">
            {GESTO[hecha.senia]} → <b>{SIGNIFICADO[hecha.senia]}</b>
          </p>
        ) : boca ? (
          <div className="senias-boca" role="group" aria-label="Señas con la boca">
            {BOCA.map((b) => (
              <button
                key={b.senia}
                type="button"
                className={`senia-boca${sugeridas?.includes(b.senia) ? ' sugerida' : ''}`}
                aria-label={etiqueta(b.senia)}
                onClick={() => hacer(b.senia)}
              >
                <span className="senia-boca-icono" aria-hidden="true">
                  {b.icono}
                </span>
                <span className="senia-boca-nombre">{b.nombre}</span>
                <small>{ROTULO[b.senia]}</small>
              </button>
            ))}
          </div>
        ) : sugeridas ? (
          <p className="senias-ayuda">
            {sugeridas.length > 0 ? (
              <>
                <span className="senias-estrella">★</span> Con tus cartas: {[...new Set(sugeridas)].map((s) => SIGNIFICADO[s]).join(', ')}
              </>
            ) : (
              'Tus cartas no tienen seña. Podés hacer cualquiera igual.'
            )}
          </p>
        ) : (
          <p className="senias-ayuda">La boca tiene cinco señas: tocala y elegí.</p>
        )}
      </div>
    </Hoja>
  )
}

/** Ícono y nombre corto de cada gesto, para los botones de la tira rápida. */
export const CORTO: Record<Senia, { icono: string; nombre: string; espejo?: boolean }> = {
  pieza2: { icono: '🤨', nombre: 'Cejas' },
  pieza4: { icono: '💋', nombre: 'Beso' },
  pieza5: { icono: '😤', nombre: 'Nariz' },
  perico: { icono: '😉', nombre: 'Guiño der.' },
  perica: { icono: '😉', nombre: 'Guiño izq.', espejo: true },
  unoBravo: { icono: '😏', nombre: 'Pera der.' },
  sieteBravo: { icono: '😏', nombre: 'Pera izq.', espejo: true },
  tres: { icono: '😬', nombre: 'Labio' },
  dosComun: { icono: '😮', nombre: 'Boca' },
  unoFalso: { icono: '😛', nombre: 'Lengua' },
  flor: { icono: '🐸', nombre: 'Sapo' },
}

export interface SeniaRapida {
  senia: Senia
  /** La carta (o cartas) que la seña anuncia, en palabras cortas. */
  carta: string
}

/**
 * Las señas de tus cartas, en el orden de la mano, y al final la flor si la tenés.
 * Dos cartas con la misma seña (dos 3) van en un solo botón.
 */
export function seniasRapidas(cartas: readonly TCarta[], muestra: TCarta): SeniaRapida[] {
  const rapidas: SeniaRapida[] = []
  for (const c of cartas) {
    const senia = seniaDeCarta(c, muestra)
    if (!senia) continue
    const ya = rapidas.find((r) => r.senia === senia)
    if (ya) ya.carta = SIGNIFICADO[senia]
    else rapidas.push({ senia, carta: piezaDe(c, muestra) !== null ? SIGNIFICADO[senia] : nombreCarta(c) })
  }
  if (seniasDeMano(cartas, muestra).includes('flor')) rapidas.push({ senia: 'flor', carta: 'flor' })
  return rapidas
}

/**
 * Señas rápidas: un botón por cada seña de tus cartas, a los costados de la mano. Un toque la
 * hace (se puede repetir); la que ya hiciste queda marcada. Para mentir o hacer otra,
 * sigue la cara. Si ya pasó el momento, los botones quedan apagados y dicen por qué.
 */
export function TiraSenias({
  rapidas,
  hechas,
  cerrado = null,
  alHacer,
  alRechazar,
}: {
  rapidas: readonly SeniaRapida[]
  hechas: readonly Senia[]
  cerrado?: string | null
  alHacer: (s: Senia) => void
  /** Se tocó una seña cuando ya no se puede: muestra el motivo. */
  alRechazar: (motivo: string) => void
}) {
  if (rapidas.length === 0) {
    return (
      <div className="tira-senias vacia" role="note">
        Tus cartas no tienen seña
      </div>
    )
  }
  return (
    <div className={`tira-senias${cerrado ? ' cerrada' : ''}`} role="group" aria-label="Señas rápidas" title={cerrado ?? undefined}>
      {rapidas.map(({ senia, carta }) => {
        const g = CORTO[senia]
        const hecha = hechas.includes(senia)
        return (
          <button
            key={senia}
            type="button"
            className={`senia-rapida${hecha ? ' hecha' : ''}`}
            aria-disabled={cerrado ? true : undefined}
            aria-label={`Hacer la seña: ${GESTO[senia].toLowerCase()} (${carta})${hecha ? ', ya la hiciste' : ''}`}
            onClick={() => (cerrado ? alRechazar(cerrado) : alHacer(senia))}
          >
            <span className={`senia-rapida-icono${g.espejo ? ' espejo' : ''}`} aria-hidden="true">
              {g.icono}
            </span>
            <span className="senia-rapida-texto" aria-hidden="true">
              <b>
                {g.nombre}
                {hecha && <span className="senia-rapida-hecha"> ✓</span>}
              </b>
              <small>{carta}</small>
            </span>
            {/* En el celular, al costado de la mano, va solo el rótulo corto. */}
            <span className="senia-rapida-rotulo" aria-hidden="true">
              {ROTULO[senia]}
              {hecha && ' ✓'}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Aviso de la seña que hiciste, arriba del paño. Las que te hacen (y las que pescás) se
 * ven como gesto en el avatar, con un globito de texto al lado.
 */
export function AvisoSeniaHecha({ hecha }: { hecha: { senia: Senia; id: number } | null }) {
  const propia = useUltimo(hecha ?? undefined, 2500)
  if (!propia) return null
  return (
    <div className="aviso aviso-senia" key={propia.id} role="status">
      <span aria-hidden="true">😉</span> Le hiciste la seña: {GESTO[propia.senia].toLowerCase()}
    </div>
  )
}

/** El último aviso de una lista, visible un rato. */
function useUltimo<T extends { id: number }>(ultimo: T | undefined, ms: number): T | undefined {
  const [visible, setVisible] = useState<T | undefined>(undefined)
  useEffect(() => {
    if (!ultimo) return
    setVisible(ultimo)
    const t = setTimeout(() => setVisible(undefined), ms)
    return () => clearTimeout(t)
  }, [ultimo, ms])
  return visible
}
