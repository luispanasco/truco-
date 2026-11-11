import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useCuenta } from '../cuenta/cuenta'
import { decidirRecorrido, marcarRecorridoVisto, useRecorrido } from './bandera'
import { Recorrido, type PasoRecorrido } from './Recorrido'

/** Toca una de las dos páginas de Jugar ("Partidas" o "Modo historia"), si no está elegida. */
function verEnJugar(nombre: 'Partidas' | 'Modo historia') {
  const pestania = [...document.querySelectorAll<HTMLButtonElement>('.jugar-vistas-selector [role="tab"]')].find((b) => b.textContent === nombre)
  if (pestania && pestania.getAttribute('aria-selected') !== 'true') pestania.click()
}

/** Jugar, desde arriba (el logo y el selector de modo a la vista). */
function arribaEnJugar() {
  document.getElementById('panel-jugar')?.scrollTo?.({ top: 0 })
}

/**
 * El recorrido de bienvenida del menú: la primera vez que se abre la app, Don Queiroz muestra
 * cada pantalla (el menú se mueve solo). También se abre desde Ajustes ("Ver el recorrido de nuevo").
 */
export function RecorridoMenu({
  paneles,
  irA,
  alCerrarHoja,
  alEntrar,
}: {
  /** Los ids de las pantallas del menú, en orden (como en la barra de abajo). */
  paneles: readonly string[]
  /** Desliza el menú a esa pantalla (lo mismo que la barra de abajo). */
  irA: (i: number) => void
  alCerrarHoja: () => void
  /** Abre la hoja para entrar a la cuenta. */
  alEntrar: () => void
}) {
  const navegar = useNavigate()
  const estadoCuenta = useCuenta((s) => s.estado)
  const [abierto, setAbierto] = useState(false)
  const decidido = useRef(false)

  // La primera vez: se espera a saber si tiene la cuenta abierta (si la tiene, no es nuevo).
  useEffect(() => {
    if (decidido.current || estadoCuenta === 'cargando' || estadoCuenta === 'entrando') return
    decidido.current = true
    if (decidirRecorrido(estadoCuenta === 'adentro')) {
      marcarRecorridoVisto()
      setAbierto(true)
    }
  }, [estadoCuenta])

  // "Ver el recorrido de nuevo": se cierran los ajustes y arranca.
  const pedido = useRecorrido((s) => s.pedido)
  const pedidoVisto = useRef(pedido)
  useEffect(() => {
    if (pedido === pedidoVisto.current) return
    pedidoVisto.current = pedido
    alCerrarHoja()
    setAbierto(true)
  }, [pedido, alCerrarHoja])

  const conCuenta = estadoCuenta === 'adentro'
  const hayCuentas = estadoCuenta !== 'apagadas'
  const ir = (id: string) => () => irA(paneles.indexOf(id))
  const cerrar = () => {
    setAbierto(false)
    irA(paneles.indexOf('jugar'))
    verEnJugar('Partidas')
    arribaEnJugar()
  }

  const pasos = useMemo<PasoRecorrido[]>(
    () => [
      {
        texto: '¡Bienvenido! Soy Don Queiroz y te muestro la casa. Arriba está tu apodo: tocalo para ponerlo (es como te ven en la mesa) y armar tu avatar.',
        donde: ['.banner-apodo', '.banner'],
        antes: () => {
          irA(paneles.indexOf('jugar'))
          verEnJugar('Partidas')
          arribaEnJugar()
        },
      },
      {
        texto: 'Acá elegís cómo jugar: contra la compu, que anda sin internet, o buscar partida online. Con las flechitas cambiás; tocando el formato y el nivel, los elegís.',
        donde: ['.jugar-centro .selector-modo'],
      },
      {
        texto: 'Y con ¡Jugar! arrancás la partida, así de fácil.',
        donde: ['.jugar-centro .boton-jugar-grande'],
      },
      {
        texto: 'Si no sabés jugar, no pasa nada: acá te enseño yo, desde cero y con ejemplos.',
        donde: ['.tarjeta-aprender'],
      },
      {
        texto: 'En el modo historia recorrés Uruguay departamento por departamento, jugándole a los truqueros de cada lugar.',
        donde: ['.portada-historia-contenido', '.jugar-vistas-selector'],
        antes: () => verEnJugar('Modo historia'),
      },
      {
        texto: 'Para jugar con amigos: creás una sala y les pasás el código, o te unís a la de otro con su código.',
        donde: ['.jugar-secundarios'],
        antes: () => verEnJugar('Partidas'),
      },
      {
        texto: 'En Avatar armás tu personaje y elegís el mazo, la mesa y la letra. Con "Ver las cartas" mirás el mazo entero.',
        donde: ['#panel-avatar .personalizar-avatar', '.banner-extra[aria-label="Personalizá"]'],
        antes: ir('avatar'),
      },
      {
        texto: 'Esta es la tienda. Con monedas comprás ropa, mesas y mazos; en "¿Cómo gano monedas?" te cuento cómo juntarlas. La vitrina cambia todos los días.',
        donde: ['#panel-tienda .tienda-como-ganar', '#panel-tienda .tienda-invitacion', '#panel-tienda'],
        antes: ir('tienda'),
      },
      {
        texto: 'En el Lobby está tu Elo, que sube y baja con las partidas online. Buscás rival y ves el ranking de los mejores.',
        donde: ['#panel-lobby .lobby-competi'],
        antes: ir('lobby'),
      },
      {
        texto: 'En Grupos armás tu grupo con tus amigos: con nombre, sigla y foto, su muro y su tabla.',
        donde: ['#panel-grupos .tarjeta', '.banner-extra[aria-label="Grupos"]'],
        antes: ir('grupos'),
      },
      {
        texto: (
          <>
            En el engranaje están los ajustes: el sonido, cómo se ve la mesa, las ayudas y las señas.
            {!conCuenta && hayCuentas && ' Entrá a tu cuenta y queda todo guardado.'} ¿Sabés jugar? Si no, arrancá por las lecciones.
          </>
        ),
        donde: ['.banner-ajustes:not(.banner-extra)'],
        antes: () => {
          ir('jugar')()
          arribaEnJugar()
        },
        extra: (
          <>
            {!conCuenta && hayCuentas && (
              <button
                type="button"
                className="boton boton-secundario"
                onClick={() => {
                  cerrar()
                  alEntrar()
                }}
              >
                Entrar a tu cuenta
              </button>
            )}
            <button
              type="button"
              className="boton boton-secundario"
              onClick={() => {
                setAbierto(false)
                navegar('/aprender')
              }}
            >
              Aprendé a jugar
            </button>
          </>
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [conCuenta, hayCuentas],
  )

  if (!abierto) return null
  return <Recorrido pasos={pasos} titulo="Recorrido con Don Queiroz" alTerminar={cerrar} alSaltar={cerrar} />
}
