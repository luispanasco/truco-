import { barajaDeDepartamento, mesaDeDepartamento, nivelDeHistoria, PESCAR_SENIAS_DISPONIBLE } from '@truco/shared'
import { ConexionLocal, type OpcionesLocal } from '../conexion/local'
import type { NivelJugado } from '../conexion/tipos'
import { useCuenta } from '../cuenta/cuenta'
import type { Perfil } from '../perfil'

/** La partida contra la compu con lo elegido en el perfil (formato, nivel, reglas y señas). */
export function conexionContraLaCompu(perfil: Perfil): ConexionLocal {
  return new ConexionLocal(conexionContraLaCompuOpciones(perfil))
}

function conexionContraLaCompuOpciones(perfil: Perfil): OpcionesLocal {
  return {
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
    // El admin juega contra los personajes del modo historia.
    personajes: useCuenta.getState().cuenta?.admin === true,
    senias: {
      habilitadas: perfil.seniasHabilitadas,
      pescar: PESCAR_SENIAS_DISPONIBLE && perfil.pescarSenias ? 'gesto' : 'nunca',
      momento: perfil.seniasAntesDeJugar ? 'antesDeJugar' : 'libre',
    },
    ...(perfil.rapido ? { demoraBots: [350, 700] as [number, number], pausas: { vuelta: 1500, mano: 1200 } } : {}),
  }
}

/**
 * Un nivel del modo historia: el formato, la dificultad y los puntos son los del nivel; los bots,
 * su elenco; la mesa y la baraja, las del lugar (las que se ganan al final). Lo demás (ayudas,
 * señas) es lo tuyo. Sin tirar reyes,
 * así cada personaje queda en su lugar.
 */
export function conexionHistoria(perfil: Perfil, jugado: NivelJugado): ConexionLocal {
  const nivel = nivelDeHistoria(jugado.departamento, jugado.nivel, jugado.barrio ?? '')
  if (!nivel) throw new Error('Ese nivel no existe')
  const base = conexionContraLaCompuOpciones(perfil)
  return new ConexionLocal({
    ...base,
    formato: nivel.formato,
    nivelBots: nivel.nivelBots,
    config: { ...base.config, picaPica: false, puntosPartida: nivel.puntos },
    tirarReyes: 'no',
    mesa: mesaDeDepartamento(jugado.departamento) ?? base.mesa,
    baraja: barajaDeDepartamento(jugado.departamento) ?? base.baraja,
    personajes: false,
    historia: jugado,
  })
}

/**
 * El examen del tutorial: mano a mano contra la compu en fácil, a 20 (10 malas y 10 buenas), con las ayudas prendidas y
 * sin pica-pica, corte ni reyes. La mesa y la baraja, las tuyas. Sin apodo, "Vos".
 */
export function conexionExamen(perfil: Perfil): ConexionLocal {
  const base = conexionContraLaCompuOpciones(perfil)
  return new ConexionLocal({
    ...base,
    apodo: base.apodo || 'Vos',
    formato: '1v1',
    nivelBots: 'facil',
    ayudas: true,
    config: { ...base.config, picaPica: false, puntosPartida: 20, puntosMalas: 10, corte: false },
    tirarReyes: 'no',
    personajes: false,
    examen: true,
  })
}
