import { ConexionLocal } from '../conexion/local'
import type { Perfil } from '../perfil'

/** La partida contra la compu con lo elegido en el perfil (formato, nivel, reglas y señas). */
export function conexionContraLaCompu(perfil: Perfil): ConexionLocal {
  return new ConexionLocal({
    apodo: perfil.apodo.trim(),
    avatar: perfil.avatar,
    formato: perfil.formato,
    nivelBots: perfil.nivelBots,
    ayudas: perfil.ayudas,
    cartasJugadas: perfil.cartasJugadas,
    mesa: perfil.mesa,
    baraja: perfil.baraja,
    config: {
      picaPica: perfil.picaPica,
      puntosPartida: perfil.puntosPartida,
      pie: perfil.pieUltimo ? 'ultimo' : 'persona',
      corte: perfil.corte,
    },
    tirarReyes: perfil.tirarReyes,
    senias: {
      habilitadas: perfil.seniasHabilitadas,
      pescar: perfil.pescarSenias ? 'gesto' : 'nunca',
      momento: perfil.seniasAntesDeJugar ? 'antesDeJugar' : 'libre',
    },
    ...(perfil.rapido ? { demoraBots: [350, 700] as [number, number], pausas: { vuelta: 1500, mano: 1200 } } : {}),
  })
}
