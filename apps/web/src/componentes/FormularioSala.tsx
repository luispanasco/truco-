import type { ReactNode } from 'react'
import type { Nivel } from '@truco/bots'
import { CONFIG_DEFAULT, type ConfigSala, type Formato } from '@truco/engine'
import { SENIAS_DEFAULT, type ConfigSenias, type InfoSala, type MensajesCliente, type PescarSenias } from '@truco/shared'
import { normalizarTiempos, TIEMPOS_SALA_DEFAULT, type ConfigTiempos } from '@truco/shared'
import type { Perfil } from '../perfil'
import { Interruptor } from './Interruptor'
import '../estilos-senias.css'

export const FORMATOS: [Formato, string, string][] = [
  ['1v1', 'Mano a mano', '1 vs 1'],
  ['2v2', 'Parejas', '2 vs 2'],
  ['3v3', 'Tríos', '3 vs 3'],
]
export const NIVELES: [Nivel, string][] = [
  ['facil', 'Fácil'],
  ['medio', 'Medio'],
  ['dificil', 'Difícil'],
]

/** Las reglas de la mesa que se pueden cambiar al armar una sala. */
export type ReglasSala = Pick<
  ConfigSala,
  'picaPica' | 'picaPicaAlternado' | 'florObligatoria' | 'envidoEnvido' | 'valorContraflor' | 'faltaEnvidoEnMalas' | 'mazoCobraEnvidoPendiente' | 'florConPiezas'
>

export interface OpcionesSala {
  formato: Formato
  nivelBots: Nivel
  botsEnVacios: boolean
  ayudas: boolean
  reglas: ReglasSala
  /** Si los rivales pueden pescar señas y cuándo se hacen. */
  senias: ConfigSenias
  /** Segundos por jugada y para la primera jugada del mano. */
  tiempos: ConfigTiempos
}

function reglasDe(c: ConfigSala): ReglasSala {
  const { picaPica, picaPicaAlternado, florObligatoria, envidoEnvido, valorContraflor, faltaEnvidoEnMalas, mazoCobraEnvidoPendiente, florConPiezas } = c
  return { picaPica, picaPicaAlternado, florObligatoria, envidoEnvido, valorContraflor, faltaEnvidoEnMalas, mazoCobraEnvidoPendiente, florConPiezas }
}

/** Lo que se propone al crear una sala: lo último que eligió la persona y las reglas de siempre. */
export function opcionesIniciales(p: Perfil): OpcionesSala {
  return {
    formato: p.formato,
    nivelBots: p.nivelBots,
    botsEnVacios: true,
    ayudas: p.ayudas,
    reglas: { ...reglasDe(CONFIG_DEFAULT), picaPica: p.picaPica },
    // Con o sin señas, lo último que eligió; lo demás de las señas, como siempre.
    senias: { ...SENIAS_DEFAULT, habilitadas: p.seniasHabilitadas },
    tiempos: normalizarTiempos(p.tiempos),
  }
}

export function opcionesDeSala(s: InfoSala): OpcionesSala {
  return {
    formato: s.formato,
    nivelBots: s.nivelBots,
    botsEnVacios: s.botsEnVacios,
    ayudas: s.ayudas,
    reglas: reglasDe(s.config),
    senias: s.senias ?? SENIAS_DEFAULT,
    tiempos: s.tiempos ?? TIEMPOS_SALA_DEFAULT,
  }
}

/** Las opciones como las espera el servidor (al crear la sala y en `configurar`). */
export function opcionesParaServidor(o: OpcionesSala): MensajesCliente['configurar'] {
  return {
    config: { formato: o.formato, ...o.reglas },
    botsEnVacios: o.botsEnVacios,
    nivelBots: o.nivelBots,
    ayudas: o.ayudas,
    senias: o.senias,
    tiempos: o.tiempos,
  }
}

const TEXTO_FALTA: Record<ReglasSala['faltaEnvidoEnMalas'], [string, string]> = {
  completarMalas: [
    'Hasta 15',
    'En malas vale lo que le falta al que va ganando para llegar a 15; con 15 o más, lo que le falta para ganar.',
  ],
  loQueFalta: ['Hasta 30', 'Vale siempre lo que le falta al que va ganando para llegar a la partida.'],
  ganaPartido: ['Gana el partido', 'Quien la gana se lleva la partida entera.'],
}
const TEXTO_FLOR: Record<ReglasSala['florConPiezas'], [string, string]> = {
  piezaMayorMasDigitos: [
    'Pieza + dígitos',
    'La pieza más alta vale completa; las otras piezas suman solo el último dígito de su valor, y las comunes, su número.',
  ],
  piezaMayorMasNumero: ['Pieza + número', 'La pieza más alta vale completa; las demás cartas suman su número, como si fueran comunes.'],
}

const TEXTO_PESCAR: Record<PescarSenias, [string, string]> = {
  nunca: ['Nunca', 'Las señas las ven solo los compañeros.'],
  gesto: ['El gesto', 'A veces un rival ve que hiciste una seña, pero no cuál.'],
  gestoYCarta: ['Gesto y carta', 'A veces un rival ve la seña entera: el gesto y qué carta anuncia.'],
}
const PROBABILIDADES = [0.1, 0.2, 0.35, 0.5]
const TEXTO_MOMENTO: Record<ConfigSenias['momento'], [string, string]> = {
  libre: ['Cuando quieras', 'Se pueden hacer señas en cualquier momento de la mano.'],
  antesDeJugar: ['Antes de jugar', 'Solo hasta que tirás tu primera carta de la mano.'],
}
const porcentaje = (p: number) => `${Math.round(p * 100)} %`

/** Segundos que se ofrecen para cada jugada y para la primera del mano. */
export const SEGUNDOS_TURNO = [20, 30, 45, 60]
export const SEGUNDOS_PRIMERA_JUGADA = [45, 60, 90, 120]
/** Las opciones de segundos; si la sala tiene otro valor (vino de otro lado), también aparece. */
function opcionesSegundos(lista: number[], actual: number): [number, string][] {
  const todos = lista.includes(actual) ? lista : [...lista, actual].sort((x, y) => x - y)
  return todos.map((n) => [n, `${n} s`])
}

function Segmentado<T extends string | number>({
  titulo,
  valor,
  opciones,
  alCambiar,
  detalle,
}: {
  titulo: string
  valor: T
  opciones: [T, ReactNode][]
  alCambiar: (v: T) => void
  detalle?: string
}) {
  return (
    <div className="campo">
      <span>{titulo}</span>
      <div className="segmentado" role="radiogroup" aria-label={titulo}>
        {opciones.map(([v, t]) => (
          <button
            key={String(v)}
            type="button"
            role="radio"
            aria-checked={valor === v}
            className={valor === v ? 'elegido' : ''}
            onClick={() => alCambiar(v)}
          >
            {t}
          </button>
        ))}
      </div>
      {detalle && <small className="campo-detalle">{detalle}</small>}
    </div>
  )
}

/** Formulario de la sala privada: se usa al crearla y cuando el anfitrión la cambia en la espera. */
export function FormularioSala({ valor, alCambiar }: { valor: OpcionesSala; alCambiar: (o: OpcionesSala) => void }) {
  const cambiar = (p: Partial<OpcionesSala>) => alCambiar({ ...valor, ...p })
  const regla = (p: Partial<ReglasSala>) => alCambiar({ ...valor, reglas: { ...valor.reglas, ...p } })
  const r = valor.reglas
  const se = valor.senias
  const senia = (p: Partial<ConfigSenias>) => alCambiar({ ...valor, senias: { ...se, ...p } })
  return (
    <div className="formulario-sala">
      <Segmentado
        titulo="Formato"
        valor={valor.formato}
        opciones={FORMATOS.map(([f, t, sub]) => [
          f,
          <>
            <strong>{t}</strong>
            <small>{sub}</small>
          </>,
        ])}
        alCambiar={(formato) => cambiar({ formato })}
      />
      <Interruptor
        activo={valor.botsEnVacios}
        alCambiar={(botsEnVacios) => cambiar({ botsEnVacios })}
        titulo="Completar con bots"
        detalle="Si al empezar falta gente, juegan bots en los lugares libres"
      />
      {valor.botsEnVacios && (
        <Segmentado
          titulo="Nivel de los bots"
          valor={valor.nivelBots}
          opciones={NIVELES}
          alCambiar={(nivelBots) => cambiar({ nivelBots })}
        />
      )}
      <Interruptor
        activo={valor.ayudas}
        alCambiar={(ayudas) => cambiar({ ayudas })}
        titulo="Ayudas"
        detalle="Marca piezas y matas, y muestra el envido y la flor de cada uno"
      />
      {valor.formato === '3v3' && (
        <Interruptor
          activo={r.picaPica}
          alCambiar={(picaPica) => regla({ picaPica })}
          titulo="Pica-pica"
          detalle="Mientras los dos equipos están en malas, se juega de a uno contra uno"
        />
      )}
      {valor.formato === '3v3' && r.picaPica && (
        <Segmentado
          titulo="Manos de pica-pica"
          valor={r.picaPicaAlternado ? 'alternadas' : 'todas'}
          opciones={[
            ['alternadas', 'Alternadas'],
            ['todas', 'Todas'],
          ]}
          alCambiar={(v) => regla({ picaPicaAlternado: v === 'alternadas' })}
          detalle={
            r.picaPicaAlternado
              ? 'Una mano redonda y una de pica-pica, empezando por la redonda, hasta que alguien entra en buenas.'
              : 'Todas las manos de malas se juegan de pica-pica.'
          }
        />
      )}

      <h3 className="reglas-subtitulo">Tiempos</h3>
      <Segmentado
        titulo="Tiempo por jugada"
        valor={valor.tiempos.turnoS}
        opciones={opcionesSegundos(SEGUNDOS_TURNO, valor.tiempos.turnoS)}
        alCambiar={(turnoS) => cambiar({ tiempos: { ...valor.tiempos, turnoS } })}
        detalle="También para contestar cantos. Si se acaba, juega un bot por vos."
      />
      <Segmentado
        titulo="Primera jugada del mano"
        valor={valor.tiempos.primeraJugadaS}
        opciones={opcionesSegundos(SEGUNDOS_PRIMERA_JUGADA, valor.tiempos.primeraJugadaS)}
        alCambiar={(primeraJugadaS) => cambiar({ tiempos: { ...valor.tiempos, primeraJugadaS } })}
        detalle="Al empezar cada mano, para ojear las cartas y hacer señas con calma."
      />

      <details className="mas-opciones reglas-mesa">
        <summary>Reglas de la mesa</summary>
        <div className="reglas-contenido">
          <Interruptor
            activo={r.florObligatoria}
            alCambiar={(florObligatoria) => regla({ florObligatoria })}
            titulo="Flor obligatoria"
            detalle="Quien tiene flor la tiene que cantar en la primera vuelta, antes de jugar; si no, la pierde"
          />
          <Interruptor
            activo={r.envidoEnvido}
            alCambiar={(envidoEnvido) => regla({ envidoEnvido })}
            titulo="Envido envido"
            detalle="Se puede contestar un envido con otro envido antes de subir a real o falta"
          />
          <Interruptor
            activo={r.mazoCobraEnvidoPendiente}
            alCambiar={(mazoCobraEnvidoPendiente) => regla({ mazoCobraEnvidoPendiente })}
            titulo="Mazo con envido pendiente"
            detalle="Si te vas al mazo sin contestar un envido, el rival lo cobra como no querido"
          />
          <Segmentado
            titulo="Valor de la contraflor"
            valor={r.valorContraflor}
            opciones={[4, 5, 6].map((n) => [n, `${n} puntos`] as [number, string])}
            alCambiar={(valorContraflor) => regla({ valorContraflor })}
            detalle="Lo que se lleva quien gana la contraflor querida."
          />
          <Segmentado
            titulo="Falta envido con los dos en malas"
            valor={r.faltaEnvidoEnMalas}
            opciones={(['completarMalas', 'loQueFalta', 'ganaPartido'] as const).map((v) => [v, TEXTO_FALTA[v][0]])}
            alCambiar={(faltaEnvidoEnMalas) => regla({ faltaEnvidoEnMalas })}
            detalle={TEXTO_FALTA[r.faltaEnvidoEnMalas][1]}
          />
          <Segmentado
            titulo="Cuenta de la flor con piezas"
            valor={r.florConPiezas}
            opciones={(['piezaMayorMasDigitos', 'piezaMayorMasNumero'] as const).map((v) => [v, TEXTO_FLOR[v][0]])}
            alCambiar={(florConPiezas) => regla({ florConPiezas })}
            detalle={TEXTO_FLOR[r.florConPiezas][1]}
          />
          <h3 className="reglas-subtitulo">Señas (en parejas y tríos)</h3>
          <Interruptor
            activo={se.habilitadas}
            alCambiar={(habilitadas) => senia({ habilitadas })}
            titulo="Se juega con señas"
            detalle="Apagado, nadie hace señas: ni las personas ni los bots"
          />
          {se.habilitadas && (
            <>
              <Segmentado
                titulo="Los rivales pescan señas"
                valor={se.pescar}
                opciones={(['nunca', 'gesto', 'gestoYCarta'] as const).map((v) => [v, TEXTO_PESCAR[v][0]])}
                alCambiar={(pescar) => senia({ pescar })}
                detalle={TEXTO_PESCAR[se.pescar][1]}
              />
              {se.pescar !== 'nunca' && (
                <Segmentado
                  titulo="Probabilidad de pescar"
                  valor={se.probabilidadPescar}
                  opciones={PROBABILIDADES.map((p) => [p, porcentaje(p)] as [number, string])}
                  alCambiar={(probabilidadPescar) => senia({ probabilidadPescar })}
                  detalle="Para cada rival y cada seña."
                />
              )}
              <Segmentado
                titulo="Momento de las señas"
                valor={se.momento}
                opciones={(['libre', 'antesDeJugar'] as const).map((v) => [v, TEXTO_MOMENTO[v][0]])}
                alCambiar={(momento) => senia({ momento })}
                detalle={TEXTO_MOMENTO[se.momento][1]}
              />
            </>
          )}
        </div>
      </details>
    </div>
  )
}

/** La configuración en pocas palabras, para la sala de espera. */
export function resumenSala(o: OpcionesSala): string[] {
  const r = o.reglas
  const formato = FORMATOS.find(([f]) => f === o.formato)!
  const nivel = NIVELES.find(([n]) => n === o.nivelBots)![1].toLowerCase()
  const partes = [
    `${formato[1]} (${formato[2]})`,
    o.botsEnVacios ? `Bots en los lugares libres (${nivel})` : 'Sin bots: tiene que estar la mesa completa',
    o.ayudas ? 'Con ayudas' : 'Sin ayudas',
  ]
  if (o.formato === '3v3') partes.push(r.picaPica ? (r.picaPicaAlternado ? 'Pica-pica alternado' : 'Pica-pica en todas las manos de malas') : 'Sin pica-pica')
  partes.push(`${o.tiempos.turnoS} s por jugada; la primera del mano, ${o.tiempos.primeraJugadaS} s`)
  partes.push(
    r.florObligatoria ? 'Flor obligatoria' : 'Flor no obligatoria',
    r.envidoEnvido ? 'Envido envido' : 'Sin envido envido',
    `Contraflor: ${r.valorContraflor} puntos`,
    `Falta en malas: ${TEXTO_FALTA[r.faltaEnvidoEnMalas][0].toLowerCase()}`,
    r.mazoCobraEnvidoPendiente ? 'Mazo con envido pendiente lo cobra el rival' : 'Mazo con envido pendiente no se cobra',
    `Flor con piezas: ${TEXTO_FLOR[r.florConPiezas][0].toLowerCase()}`,
  )
  if (o.formato !== '1v1') {
    const se = o.senias
    if (!se.habilitadas) {
      partes.push('Sin señas')
    } else {
      partes.push(
        se.pescar === 'nunca'
          ? 'Los rivales no pescan señas'
          : `Los rivales pescan ${se.pescar === 'gesto' ? 'el gesto' : 'gesto y carta'} (${porcentaje(se.probabilidadPescar)})`,
        se.momento === 'libre' ? 'Señas en cualquier momento' : 'Señas solo antes de jugar',
      )
    }
  }
  return partes
}
