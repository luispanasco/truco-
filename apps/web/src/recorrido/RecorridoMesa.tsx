import { useEffect, useState } from 'react'
import { ConexionLocal } from '../conexion/local'
import { useJuego } from '../estado'
import { leerPerfil } from '../perfil'
import { marcarRecorridoMesaVisto, tocaRecorridoMesa } from './bandera'
import { Recorrido, type PasoRecorrido } from './Recorrido'

/**
 * La partida que espera al recorrido. Solo contra la compu (o el modo historia, el examen): ahí el
 * juego se frena. Online no se puede frenar a los demás, así que no sale (sale en la primera
 * partida contra la compu).
 */
let enEspera: ConexionLocal | null = null

// Al conectarse una partida local, antes de que arranque: que se frene al repartir la primera mano.
useJuego.subscribe((s, antes) => {
  if (s.conexion === antes.conexion) return
  enEspera = null
  if (s.conexion instanceof ConexionLocal && tocaRecorridoMesa()) {
    enEspera = s.conexion
    s.conexion.esperarAlRepartir()
  }
})

/** Cuánto tiempo seguido tiene que estar la mano a la vista (ya repartida y abierta) para arrancar. */
const QUIETA_MS = 900
const CADA_MS = 150

function pasosDeLaMesa(enEquipo: boolean): PasoRecorrido[] {
  const { ojear } = leerPerfil()
  return [
    {
      texto: ojear
        ? '¡Tu primera partida! Estas son tus cartas: para jugar una, la tocás. Al repartir vienen apiladas y las ojeás deslizando el dedo, de a poco, como recién.'
        : '¡Tu primera partida! Estas son tus cartas: para jugar una, la tocás.',
      donde: ['.mi-mano-zona', '.mi-lugar'],
    },
    {
      texto: 'Acá abajo, cuando te toca, salen los cantos: envido, truco, flor y las respuestas. Solo los que se pueden cantar en ese momento.',
      donde: ['.mi-lugar-pie'],
    },
    {
      texto: 'Cuando te toca, con "Mazo" te vas al mazo: dejás la mano y no arriesgás más puntos.',
      donde: ['.mi-estado .boton-mazo:not(.boton-abrir-pie)', '.mi-info'],
    },
    ...(enEquipo
      ? [
          {
            texto: 'En equipo, con "Seña" le hacés señas a tu compañero (o mantené apretada una carta) y con el pie le decís qué jugar. Tocando su avatar ves lo que te marcó.',
            donde: ['.mi-estado'],
          },
        ]
      : []),
    {
      texto: 'Este es el marcador: tocalo y ves el anotador, con los fósforos.',
      donde: ['.marcador-filas'],
    },
    {
      texto: 'Y acá está el chat. ¡Listo! Mientras te contaba, la mesa te esperó. Que no te agarren de punto.',
      donde: ['.marcador-botones .boton-chat', '.marcador-botones'],
    },
  ]
}

/**
 * El recorrido de la primera partida: cuando ya se repartió la primera mano (y la ojeaste), Don
 * Queiroz muestra la mesa. Mientras tanto el juego espera; al terminar o saltarlo, sigue.
 */
export function RecorridoMesa() {
  const conexion = useJuego((s) => s.conexion)
  const n = useJuego((s) => s.vista?.jugadores.length ?? 0)
  const repartida = useJuego((s) => !!s.vista && !s.reyes && s.vista.mano.cortando === null && s.vista.ganador === null)
  const [pasos, setPasos] = useState<PasoRecorrido[] | null>(null)
  const espera = !!conexion && conexion === enEspera && repartida

  // Arranca con la mano a la vista y quieta un rato (terminó el reparto y la abriste).
  useEffect(() => {
    if (!espera || pasos) return
    let quieta = 0
    const t = setInterval(() => {
      const enMano = document.querySelectorAll('.mi-mano .carta').length > 0
      quieta = enMano && !document.querySelector('.ojea-primero') ? quieta + CADA_MS : 0
      if (quieta < QUIETA_MS) return
      clearInterval(t)
      marcarRecorridoMesaVisto()
      setPasos(pasosDeLaMesa(n > 2))
    }, CADA_MS)
    return () => clearInterval(t)
  }, [espera, pasos, n])

  if (!pasos) return null
  const cerrar = () => {
    setPasos(null)
    if (enEspera) enEspera.seguir()
    enEspera = null
  }
  return <Recorrido pasos={pasos} titulo="La mesa, con Don Queiroz" alTerminar={cerrar} alSaltar={cerrar} />
}
