import { mismaCarta } from './cartas'
import { nuevoEnfrentamiento, participantesDuelo, repartir } from './partida'
import {
  equipoDe,
  equipoQueCanto,
  mejorDeclaracion,
  ordenDesde,
  otroEquipo,
  pendienteActual,
  puedeEncadenarEnvido,
  puntosEnvidoNoQuerido,
  puntosEnvidoQuerido,
  resolverVuelta,
  ganadorPorVueltas,
  siguienteDeclarante,
  supera,
  ultimo,
  valorFalta,
  valorResto,
  type Pendiente,
} from './reglas'
import type {
  Accion,
  CantoTruco,
  CartasMostradas,
  Enfrentamiento,
  Equipo,
  EstadoPartida,
  Evento,
  Jugador,
  ResultadoApply,
  ResultadoEnfrentamiento,
  TantoRevelado,
} from './tipos'

const MAX_ENVIDO = 37
const MAX_FLOR = 47

/** Aplica una acción. Nunca modifica el estado recibido. */
export function apply(estado: EstadoPartida, accion: Accion): ResultadoApply {
  const motivo = validar(estado, accion)
  if (motivo !== null) return { ok: false, motivo }
  const nuevo = structuredClone(estado)
  const eventos: Evento[] = []
  ejecutar(nuevo, accion, eventos)
  return { ok: true, estado: nuevo, eventos }
}

export function enfrentamientoActual(estado: EstadoPartida): Enfrentamiento {
  const e = estado.mano.enfrentamientos[estado.mano.actual]
  if (!e) throw new Error('No hay enfrentamiento en curso')
  return e
}

function jugadorDe(estado: EstadoPartida, id: string): Jugador | undefined {
  return estado.jugadores.find((j) => j.id === id)
}

const MENSAJE_PENDIENTE: Record<Pendiente, string> = {
  flor: 'Hay una contraflor sin responder',
  envido: 'Hay un envido sin responder',
  declaracion: 'Se están declarando los tantos',
  truco: 'Hay un truco sin responder',
}

/** Motivo por el que la acción es inválida, o null si es válida. */
export function validar(estado: EstadoPartida, accion: Accion): string | null {
  if (estado.ganador !== null) return 'La partida terminó'
  const jugador = jugadorDe(estado, accion.jugador)
  if (!jugador) return 'Jugador desconocido'
  const { asiento: a, equipo: eq } = jugador
  const { config: cfg, mano } = estado

  if (accion.tipo === 'pedirVer' || accion.tipo === 'noPedirVer') {
    const v = mano.verificacion
    if (!v) return 'No hay verificación en curso'
    if (!v.pendientes.includes(eq)) return 'Tu equipo no tiene que decidir'
    return null
  }
  if (mano.verificacion) return 'Se está verificando la mano'

  const e = enfrentamientoActual(estado)
  if (!e.participantes.includes(a)) return 'No jugás en este duelo'

  const pend = pendienteActual(e)
  const tanto = mano.tantos[a]
  if (!tanto) return 'Asiento inválido'
  const primeraVuelta = e.vueltas[0]
  const enPrimera = e.vueltas.length === 1
  const yaJugoPrimera = primeraVuelta?.jugadas.some((j) => j.asiento === a) ?? false
  const cantoFlor = e.flor.cantadas.some((f) => f.asiento === a)
  /** En modo normal, quien tiene flor y todavía puede cantarla tiene que hacerlo antes de envidar o jugar. */
  const debeCantarFlor =
    !cfg.modoSucio &&
    tanto.florReal !== null &&
    !cantoFlor &&
    enPrimera &&
    !yaJugoPrimera &&
    e.flor.estado !== 'noQuerida'

  switch (accion.tipo) {
    case 'jugarCarta': {
      if (pend) return MENSAJE_PENDIENTE[pend]
      if (e.turno !== a) return 'No es tu turno'
      if (!mano.cartas[a]?.some((c) => mismaCarta(c, accion.carta))) return 'No tenés esa carta'
      if (debeCantarFlor && cfg.florObligatoria) return 'Tenés flor: tenés que cantarla antes de jugar'
      return null
    }

    case 'cantarTruco': {
      if (pend === 'truco') {
        const p = e.truco.pendiente!
        if (p.equipo === eq) return 'Esperá la respuesta del rival'
        if (p.nivel === 4) return 'No se puede subir más'
        return null
      }
      if (pend) return MENSAJE_PENDIENTE[pend]
      if (e.turno !== a) return 'No es tu turno'
      if (e.truco.valor === 4) return 'No se puede subir más'
      if (e.truco.puedeSubir !== null && e.truco.puedeSubir !== eq) {
        return 'Solo puede subir el equipo que aceptó el último canto'
      }
      return null
    }

    case 'cantarEnvido': {
      if (e.envido.estado === 'anulado' || e.flor.cantadas.length > 0) return 'Con flor no hay envido'
      if (!enPrimera) return 'El envido se canta en la primera vuelta'
      if (yaJugoPrimera) return 'Ya jugaste tu carta'
      if (debeCantarFlor) return 'Tenés flor: cantala'
      if (e.envido.estado === 'libre') {
        if (pend === null) {
          if (e.turno !== a) return 'No es tu turno'
          if (e.truco.valor !== 1) return 'Ya se aceptó el truco'
          return null
        }
        if (pend === 'truco') {
          // "Primero está el envido"
          const p = e.truco.pendiente!
          if (p.equipo === eq) return 'Esperá la respuesta del rival'
          if (p.nivel !== 2) return 'Ya no se puede cantar envido'
          return null
        }
        return MENSAJE_PENDIENTE[pend]
      }
      if (e.envido.estado === 'pendiente') {
        if (ultimo(e.envido.cantos).equipo === eq) return 'Esperá la respuesta del rival'
        if (!puedeEncadenarEnvido(e.envido.cantos, accion.canto, cfg)) return 'No se puede cantar eso ahora'
        return null
      }
      return 'El envido ya se cantó'
    }

    case 'cantarFlor': {
      const f = e.flor
      if (accion.canto === 'contraflorAlResto' && f.estado === 'pendiente') {
        const ult = ultimo(f.contra)
        if (ult.equipo === eq) return 'Esperá la respuesta del rival'
        if (ult.canto !== 'contraflor') return 'No se puede subir más'
        return null
      }
      if (f.estado === 'pendiente') return MENSAJE_PENDIENTE.flor
      if (f.estado === 'noQuerida') return 'La flor ya se resolvió'
      if (!enPrimera || yaJugoPrimera) return 'La flor se canta en la primera vuelta, antes de jugar'
      if (accion.canto === 'flor' && cantoFlor) return 'Ya cantaste flor'
      if (!cantoFlor) {
        const t = accion.tanto
        if (!cfg.modoSucio) {
          if (tanto.florReal === null) return 'No tenés flor'
          if (t !== undefined && t !== tanto.florReal) return `Tu flor es de ${tanto.florReal}`
        } else {
          if (t === undefined && tanto.florReal === null) return 'Indicá el tanto de la flor'
          if (t !== undefined && (!Number.isInteger(t) || t < 0 || t > MAX_FLOR)) return 'Tanto inválido'
        }
      }
      if (accion.canto === 'flor') return null
      if (f.contra.length > 0) return 'Ya se cantó contraflor'
      if (!f.cantadas.some((x) => x.equipo !== eq)) return 'El rival no cantó flor'
      return null
    }

    case 'responder': {
      if (pend === null || pend === 'declaracion') return 'No hay nada que responder'
      if (equipoQueCanto(e, pend) === eq) return 'Esperá la respuesta del rival'
      if (pend === 'envido' && debeCantarFlor) return 'Tenés flor: cantala'
      return null
    }

    case 'declararTanto': {
      if (e.envido.estado !== 'declarando') return 'No se está declarando el envido'
      if (siguienteDeclarante(e) !== a) return 'No te toca declarar'
      if (debeCantarFlor) return 'Tenés flor: cantala'
      const mejor = mejorDeclaracion(e)
      if (accion.tanto === 'sonBuenas') return mejor ? null : 'El primero tiene que decir su tanto'
      const t = accion.tanto
      if (!Number.isInteger(t) || t < 0 || t > MAX_ENVIDO) return 'Tanto inválido'
      if (!cfg.modoSucio && t !== tanto.envidoReal) return `Tu tanto es ${tanto.envidoReal}`
      if (mejor && !supera(e, { asiento: a, tanto: t }, mejor)) return 'Tenés que decir un tanto mayor o "son buenas"'
      return null
    }

    case 'irseAlMazo': {
      if (e.envido.estado === 'declarando') return 'Esperá que terminen de declarar el envido'
      return null
    }
  }
}

const CANTO_TRUCO: Record<2 | 3 | 4, CantoTruco> = { 2: 'truco', 3: 'retruco', 4: 'valeCuatro' }

function ejecutar(estado: EstadoPartida, accion: Accion, eventos: Evento[]) {
  const jugador = jugadorDe(estado, accion.jugador)!
  const { asiento: a, equipo: eq } = jugador
  const { config: cfg, mano } = estado

  if (accion.tipo === 'pedirVer' || accion.tipo === 'noPedirVer') {
    const v = mano.verificacion!
    v.pendientes = v.pendientes.filter((x) => x !== eq)
    const pide = accion.tipo === 'pedirVer'
    if (pide) v.piden.push(eq)
    eventos.push({ tipo: 'pedirVer', asiento: a, equipo: eq, pide })
    if (v.pendientes.length === 0) cerrarEnfrentamiento(estado, v.piden, eventos)
    return
  }

  const e = enfrentamientoActual(estado)
  const n = estado.jugadores.length

  switch (accion.tipo) {
    case 'jugarCarta': {
      const cartas = mano.cartas[a]!
      cartas.splice(
        cartas.findIndex((c) => mismaCarta(c, accion.carta)),
        1,
      )
      const vuelta = ultimo(e.vueltas)
      vuelta.jugadas.push({ asiento: a, carta: accion.carta })
      eventos.push({ tipo: 'cartaJugada', asiento: a, carta: accion.carta })

      const orden = ordenDesde(e.participantes, vuelta.empieza, n)
      if (vuelta.jugadas.length < orden.length) {
        e.turno = orden[vuelta.jugadas.length]!
        return
      }
      const { resultado, ganador } = resolverVuelta(vuelta.jugadas, mano.muestra)
      vuelta.resultado = resultado
      vuelta.ganador = ganador
      eventos.push({ tipo: 'vueltaTerminada', indice: e.vueltas.length - 1, resultado, ganador })

      const g = ganadorPorVueltas(
        e.vueltas.map((v) => v.resultado!),
        equipoDe(e.mano),
      )
      if (g !== null) {
        terminarJuego(estado, 'vueltas', g, e.truco.valor, eventos)
        return
      }
      const empieza =
        ganador ?? (cfg.empiezaTrasParda === 'mano' ? e.mano : vuelta.empieza)
      e.vueltas.push({ empieza, jugadas: [], resultado: null, ganador: null })
      e.turno = empieza
      return
    }

    case 'cantarTruco': {
      const tr = e.truco
      let nivel: 2 | 3 | 4
      if (tr.pendiente) {
        // Subir implica aceptar lo anterior.
        tr.valor = tr.pendiente.nivel
        tr.puedeSubir = eq
        nivel = (tr.pendiente.nivel + 1) as 3 | 4
      } else {
        nivel = (tr.valor + 1) as 2 | 3 | 4
      }
      tr.pendiente = { nivel, equipo: eq, asiento: a }
      eventos.push({ tipo: 'cantoTruco', asiento: a, canto: CANTO_TRUCO[nivel] })
      return
    }

    case 'cantarEnvido': {
      const primeroEstaElEnvido = e.envido.estado === 'libre' && e.truco.pendiente !== null
      e.envido.estado = 'pendiente'
      e.envido.cantos.push({ canto: accion.canto, asiento: a, equipo: eq })
      eventos.push({ tipo: 'cantoEnvido', asiento: a, canto: accion.canto, primeroEstaElEnvido })
      return
    }

    case 'cantarFlor': {
      const f = e.flor
      if (accion.canto === 'contraflorAlResto' && f.estado === 'pendiente') {
        f.contra.push({ canto: 'contraflorAlResto', asiento: a, equipo: eq })
        eventos.push({ tipo: 'cantoFlor', asiento: a, canto: accion.canto })
        return
      }
      if (!f.cantadas.some((x) => x.asiento === a)) {
        const t = mano.tantos[a]!
        const declarado = accion.tanto ?? t.florReal ?? 0
        t.florDeclarada = declarado
        f.cantadas.push({ asiento: a, equipo: eq, tantoDeclarado: declarado })
      }
      if (e.envido.estado !== 'anulado') {
        if (e.envido.estado !== 'libre') eventos.push({ tipo: 'envidoAnulado' })
        e.envido.estado = 'anulado'
        e.envido.porDeclarar = []
        e.envido.ganador = null
      }
      if (accion.canto !== 'flor') {
        f.contra.push({ canto: accion.canto, asiento: a, equipo: eq })
        f.estado = 'pendiente'
      }
      eventos.push({ tipo: 'cantoFlor', asiento: a, canto: accion.canto })
      return
    }

    case 'responder': {
      const pend = pendienteActual(e)!
      const quiere = accion.respuesta === 'quiero'
      eventos.push({
        tipo: 'respuesta',
        asiento: a,
        a: pend === 'truco' ? 'truco' : pend === 'envido' ? 'envido' : 'flor',
        respuesta: accion.respuesta,
      })
      if (pend === 'truco') {
        const p = e.truco.pendiente!
        e.truco.pendiente = null
        if (quiere) {
          e.truco.valor = p.nivel
          e.truco.puedeSubir = eq
        } else {
          terminarJuego(estado, 'noQuiero', p.equipo, e.truco.valor, eventos)
        }
      } else if (pend === 'envido') {
        if (quiere) {
          e.envido.estado = 'declarando'
          e.envido.porDeclarar = [...e.participantes]
        } else {
          e.envido.estado = 'noQuerido'
          e.envido.ganador = ultimo(e.envido.cantos).equipo
        }
      } else {
        rechazarOQuererFlor(estado, e, quiere)
      }
      return
    }

    case 'declararTanto': {
      const t = accion.tanto === 'sonBuenas' ? null : accion.tanto
      e.envido.declaraciones.push({ asiento: a, tanto: t })
      e.envido.porDeclarar = e.envido.porDeclarar.filter((x) => x !== a)
      if (t !== null) mano.tantos[a]!.envidoDeclarado = t
      eventos.push({ tipo: 'tantoDeclarado', asiento: a, tanto: t })
      if (siguienteDeclarante(e) === null) {
        const mejor = mejorDeclaracion(e)!
        e.envido.estado = 'resuelto'
        e.envido.porDeclarar = []
        e.envido.ganador = equipoDe(mejor.asiento)
        eventos.push({ tipo: 'envidoResuelto', ganador: e.envido.ganador })
      }
      return
    }

    case 'irseAlMazo': {
      eventos.push({ tipo: 'alMazo', asiento: a, equipo: eq })
      const env = e.envido
      if (env.estado === 'pendiente') {
        const ult = ultimo(env.cantos)
        if (cfg.mazoCobraEnvidoPendiente && ult.equipo !== eq) {
          env.estado = 'noQuerido'
          env.ganador = ult.equipo
        } else {
          env.estado = 'anulado'
        }
      }
      const f = e.flor
      if (f.estado === 'pendiente') {
        if (ultimo(f.contra).equipo !== eq) {
          rechazarOQuererFlor(estado, e, false)
        } else {
          // Se va el que cantó: queda lo aceptado antes de su canto.
          f.contra.pop()
          f.estado = f.contra.length > 0 ? 'querida' : 'libre'
        }
      }
      e.alMazo = eq
      e.truco.pendiente = null
      terminarJuego(estado, 'mazo', otroEquipo(eq), e.truco.valor, eventos)
      return
    }
  }
}

function rechazarOQuererFlor(estado: EstadoPartida, e: Enfrentamiento, quiere: boolean) {
  const f = e.flor
  if (quiere) {
    f.estado = 'querida'
    return
  }
  f.estado = 'noQuerida'
  f.noQuerida = {
    equipo: ultimo(f.contra).equipo,
    puntos: f.contra.length === 1 ? 3 : estado.config.valorContraflor,
  }
}

/** Termina el juego de cartas del enfrentamiento y pasa a la verificación. */
function terminarJuego(
  estado: EstadoPartida,
  motivo: ResultadoEnfrentamiento['motivo'],
  ganador: Equipo,
  puntosTruco: number,
  eventos: Evento[],
) {
  const e = enfrentamientoActual(estado)
  e.fin = { motivo, ganador, puntosTruco }
  e.turno = null
  e.truco.pendiente = null

  if (estado.config.modoSucio) {
    // Puede pedir ver el equipo cuyo rival declaró un tanto o cantó flor.
    const declararon = new Set<Equipo>()
    for (const d of e.envido.declaraciones) if (d.tanto !== null) declararon.add(equipoDe(d.asiento))
    for (const f of e.flor.cantadas) declararon.add(f.equipo)
    const pendientes = [...declararon].map(otroEquipo).sort()
    if (pendientes.length > 0) {
      estado.mano.verificacion = { pendientes, piden: [] }
      eventos.push({ tipo: 'verificacionPendiente', equipos: pendientes })
      return
    }
  }
  cerrarEnfrentamiento(estado, [], eventos)
}

/** Ganador de la comparación de flores: mayor tanto declarado, empate para el más cercano al mano. */
function ganadorFlor(e: Enfrentamiento): Equipo {
  if (e.alMazo !== null) return otroEquipo(e.alMazo)
  let mejor = e.flor.cantadas[0]!
  for (const f of e.flor.cantadas.slice(1)) {
    if (
      f.tantoDeclarado > mejor.tantoDeclarado ||
      (f.tantoDeclarado === mejor.tantoDeclarado &&
        e.participantes.indexOf(f.asiento) < e.participantes.indexOf(mejor.asiento))
    ) {
      mejor = f
    }
  }
  return mejor.equipo
}

function calcularPuntosTanto(estado: EstadoPartida, e: Enfrentamiento): [number, number] {
  const puntos: [number, number] = [0, 0]
  const env = e.envido
  if (env.estado === 'noQuerido' && env.ganador !== null) {
    puntos[env.ganador] += puntosEnvidoNoQuerido(env.cantos)
  } else if (env.estado === 'resuelto' && env.ganador !== null) {
    puntos[env.ganador] += puntosEnvidoQuerido(env.cantos, valorFalta(estado, env.ganador))
  }

  const f = e.flor
  if (f.estado === 'noQuerida' && f.noQuerida) {
    puntos[f.noQuerida.equipo] += f.noQuerida.puntos
  } else if (f.cantadas.length > 0) {
    const equipos = new Set(f.cantadas.map((x) => x.equipo))
    if (f.estado === 'querida') {
      const valor = ultimo(f.contra).canto === 'contraflor' ? estado.config.valorContraflor : valorResto(estado)
      puntos[ganadorFlor(e)] += valor
    } else if (equipos.size === 2) {
      puntos[ganadorFlor(e)] += 3
    } else {
      for (const x of f.cantadas) puntos[x.equipo] += 3
    }
  }
  return puntos
}

function mintio(estado: EstadoPartida, e: Enfrentamiento, equipo: Equipo): boolean {
  const declaro = new Set(e.envido.declaraciones.filter((d) => d.tanto !== null).map((d) => d.asiento))
  return e.participantes.some((a) => {
    if (equipoDe(a) !== equipo) return false
    const t = estado.mano.tantos[a]!
    if (declaro.has(a) && t.envidoDeclarado !== t.envidoReal) return true
    const flor = e.flor.cantadas.find((f) => f.asiento === a)
    return flor !== undefined && flor.tantoDeclarado !== t.florReal
  })
}

/** Aplica verificación y puntos, y pasa al siguiente duelo, a la siguiente mano o al final. */
function cerrarEnfrentamiento(estado: EstadoPartida, piden: Equipo[], eventos: Evento[]) {
  const { mano } = estado
  const e = enfrentamientoActual(estado)
  const fin = e.fin!
  const puntosTanto = calcularPuntosTanto(estado, e)

  const mentirosos: Equipo[] = []
  for (const pide of piden) {
    const rival = otroEquipo(pide)
    if (mintio(estado, e, rival)) {
      mentirosos.push(rival)
      puntosTanto[pide] += puntosTanto[rival]
      puntosTanto[rival] = 0
    }
  }

  const declararon = new Set(e.envido.declaraciones.filter((d) => d.tanto !== null).map((d) => d.asiento))
  const revelados: TantoRevelado[] = e.participantes
    .filter((a) => declararon.has(a) || e.flor.cantadas.some((f) => f.asiento === a))
    .map((a) => ({ asiento: a, envido: mano.tantos[a]!.envidoReal, flor: mano.tantos[a]!.florReal }))

  e.resultado = { ...fin, puntosTanto, revelados, mentirosos, mostradas: cartasMostradas(estado, e) }
  mano.verificacion = null
  eventos.push({ tipo: 'enfrentamientoTerminado', indice: mano.actual, resultado: e.resultado })

  // El tanto se anota antes que el truco.
  sumarPuntos(estado, puntosTanto)
  if (estado.ganador === null) {
    const truco: [number, number] = [0, 0]
    truco[fin.ganador] = fin.puntosTruco
    sumarPuntos(estado, truco)
  }
  eventos.push({ tipo: 'puntos', puntos: [...estado.puntos] })

  if (estado.ganador !== null) {
    eventos.push({ tipo: 'partidaTerminada', ganador: estado.ganador, puntos: [...estado.puntos] })
    return
  }

  const n = estado.jugadores.length
  if (mano.picaPica && mano.actual < 2) {
    mano.actual += 1
    const participantes = participantesDuelo(mano.mano, mano.actual, n)
    mano.enfrentamientos.push(nuevoEnfrentamiento(participantes, participantes[0]!))
    eventos.push({ tipo: 'enfrentamientoIniciado', indice: mano.actual, participantes, mano: participantes[0]! })
    return
  }

  const reparte = (mano.reparte + 1) % n
  const nueva = repartir(estado, mano.numero + 1, reparte)
  estado.rng = nueva.rng
  estado.mano = nueva.mano
  const e0 = nueva.mano.enfrentamientos[0]!
  eventos.push({
    tipo: 'manoRepartida',
    numero: nueva.mano.numero,
    reparte,
    mano: nueva.mano.mano,
    muestra: nueva.mano.muestra,
    picaPica: nueva.mano.picaPica,
  })
  eventos.push({ tipo: 'enfrentamientoIniciado', indice: 0, participantes: e0.participantes, mano: e0.mano })
}

/**
 * Quién da vuelta sus cartas sin jugar al terminar: todos los que cantaron flor y el que ganó
 * el envido querido con su tanto (aunque el rival haya dicho "son buenas"). Con envido no
 * querido no se muestra nada. En pica-pica las cartas del duelo son las de su mano.
 */
function cartasMostradas(estado: EstadoPartida, e: Enfrentamiento): CartasMostradas[] {
  const asientos = new Set(e.flor.cantadas.map((f) => f.asiento))
  if (e.envido.estado === 'resuelto') {
    const mejor = mejorDeclaracion(e)
    if (mejor) asientos.add(mejor.asiento)
  }
  return e.participantes
    .filter((a) => asientos.has(a))
    .map((a) => ({ asiento: a, cartas: [...(estado.mano.cartas[a] ?? [])] }))
    .filter((m) => m.cartas.length > 0)
}

function sumarPuntos(estado: EstadoPartida, puntos: [number, number]) {
  const objetivo = estado.config.puntosPartida
  for (const eq of [0, 1] as const) {
    if (puntos[eq] <= 0) continue
    estado.puntos[eq] = Math.min(objetivo, estado.puntos[eq] + puntos[eq])
    if (estado.puntos[eq] >= objetivo && estado.ganador === null) estado.ganador = eq
  }
}
