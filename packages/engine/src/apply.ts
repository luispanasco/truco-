import { mismaCarta } from './cartas'
import { esPieza } from './jerarquia'
import { calcularFlor, sumaFlor } from './tanto'
import { cortarYRepartir, nuevoEnfrentamiento, participantesDuelo, repartir } from './partida'
import {
  equipoDe,
  equipoQueCanto,
  liderDe,
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
  siguienteEnMesa,
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
  EstadoMano,
  Evento,
  Jugador,
  QueManda,
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

/**
 * Si el asiento tiene que cantar la flor: la tiene, no la cantó, está en la primera vuelta y
 * todavía no jugó. En modo sucio nadie está obligado (puede callarla).
 */
export function debeCantarFlor(estado: EstadoPartida, e: Enfrentamiento, a: number): boolean {
  const tanto = estado.mano.tantos[a]
  if (estado.config.modoSucio || !tanto || tanto.florReal === null) return false
  if (e.flor.cantadas.some((f) => f.asiento === a) || e.flor.estado === 'noQuerida') return false
  if (e.retirados.includes(a)) return false
  if (e.vueltas.length !== 1) return false
  return !e.vueltas[0]!.jugadas.some((j) => j.asiento === a)
}

/**
 * Con la flor obligatoria, cuando alguien la canta, todos los que tienen flor la cantan en ese
 * momento, en orden desde el mano. Devuelve los que faltan; mientras haya, no se hace otra cosa.
 */
export function floresPorCantar(estado: EstadoPartida, e: Enfrentamiento): number[] {
  if (!estado.config.florObligatoria || e.flor.cantadas.length === 0) return []
  return e.participantes.filter((a) => debeCantarFlor(estado, e, a))
}

/**
 * Los del equipo que tienen una flor sin cantar. Mientras haya, el equipo no canta ni contesta
 * el envido: la flor lo anularía, así que el que la tiene la canta.
 */
export function florSinCantarDelEquipo(estado: EstadoPartida, e: Enfrentamiento, eq: Equipo): number[] {
  if (!estado.config.florObligatoria) return []
  return e.participantes.filter((a) => equipoDe(a) === eq && debeCantarFlor(estado, e, a))
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
  if (mano.cortando !== null) {
    if (accion.tipo !== 'cortar') return 'Están cortando el mazo'
    return mano.cortando === a ? null : 'Corta otro'
  }
  if (accion.tipo === 'cortar') return 'No hay nada que cortar'

  const e = enfrentamientoActual(estado)
  if (!e.participantes.includes(a)) return 'No jugás en este duelo'
  if (e.retirados.includes(a)) return 'Te fuiste al mazo'

  // "Canta la mesa": hasta que se tiren todas las cartas de las flores, no se hace otra cosa.
  const enMesa = siguienteEnMesa(e)
  if (accion.tipo === 'mostrarFlor') {
    if (enMesa === null) return 'No se está cantando la mesa'
    if (enMesa !== a) return 'Le toca tirar a otro'
    if (!mano.cartas[a]!.some((c) => mismaCarta(c, accion.carta))) return 'Esa carta no la tenés'
    if (e.flor.mesa!.mostradas[a]!.some((c) => mismaCarta(c, accion.carta))) return 'Esa ya la tiraste'
    return null
  }
  if (enMesa !== null) return 'Están cantando la mesa'

  // El pie: con "toques y gritos del pie", toca y grita él o el compañero que manda, y contesta él.
  const conPie = cfg.toquesYGritos === 'pie' && e.participantes.length > 2
  const lider = liderDe(estado, e, eq)
  const esLider = !conPie || lider === a
  const puede = (que: QueManda) => esLider || e.ordenes.some((o) => o.asiento === a && o.que === que)

  const pend = pendienteActual(e)
  const tanto = mano.tantos[a]
  if (!tanto) return 'Asiento inválido'
  const primeraVuelta = e.vueltas[0]
  const enPrimera = e.vueltas.length === 1
  const yaJugoPrimera = primeraVuelta?.jugadas.some((j) => j.asiento === a) ?? false
  const cantoFlor = e.flor.cantadas.some((f) => f.asiento === a)
  /** En modo normal, quien tiene flor y todavía puede cantarla tiene que hacerlo antes de envidar o jugar. */
  const debeCantar = debeCantarFlor(estado, e, a)
  /** Compañeros (o uno mismo) con flor sin cantar: el equipo no toca el envido. */
  const florDelEquipo = florSinCantarDelEquipo(estado, e, eq)
  const motivoFlorDelEquipo = florDelEquipo.includes(a) ? 'Tenés flor: cantala' : 'Tu compañero tiene flor: la tiene que cantar'

  // Alguien cantó flor: primero la cantan todos los que la tienen.
  const porCantar = floresPorCantar(estado, e)
  if (porCantar.length > 0 && accion.tipo !== 'irseAlMazo') {
    const esElQueSigue = porCantar[0] === a && accion.tipo === 'cantarFlor' && accion.canto === 'flor'
    if (!esElQueSigue) {
      if (porCantar[0] === a) return 'Tenés flor: cantala'
      return porCantar.includes(a) ? 'Esperá: están cantando la flor' : 'Están cantando la flor'
    }
  }

  switch (accion.tipo) {
    case 'jugarCarta': {
      if (pend) return MENSAJE_PENDIENTE[pend]
      if (e.turno !== a) return 'No es tu turno'
      if (!mano.cartas[a]?.some((c) => mismaCarta(c, accion.carta))) return 'No tenés esa carta'
      if (debeCantar && cfg.florObligatoria) return 'Tenés flor: tenés que cantarla antes de jugar'
      if (accion.tapada) {
        if (e.participantes.length <= 2) return 'En 1v1 no se puede pasar'
        if (e.vueltas.length !== 3) return 'Solo se puede pasar en la tercera'
        if (ultimo(e.vueltas).jugadas.some((j) => equipoDe(j.asiento) === eq)) {
          return 'Pasa solo el primero de tu equipo en jugar'
        }
      }
      return null
    }

    case 'cantarTruco': {
      if (pend === 'truco') {
        const p = e.truco.pendiente!
        if (p.equipo === eq) return 'Esperá la respuesta del rival'
        if (p.nivel === 4) return 'No se puede subir más'
        // La flor va primero: antes de contestar el truco, el que tiene flor la canta.
        if (florDelEquipo.length > 0) return motivoFlorDelEquipo
        if (!esLider) return 'Contesta el pie'
        return null
      }
      if (pend) return MENSAJE_PENDIENTE[pend]
      if (e.turno !== a) return 'No es tu turno'
      if (debeCantar && cfg.florObligatoria) return 'Tenés flor: cantala primero (o "flor y truco")'
      if (e.truco.valor === 4) return 'No se puede subir más'
      if (e.truco.puedeSubir !== null && e.truco.puedeSubir !== eq) {
        return 'Solo puede subir el equipo que aceptó el último canto'
      }
      if (!puede('gritar')) return 'Grita el pie'
      return null
    }

    case 'cantarEnvido': {
      if (e.envido.estado === 'anulado' || e.flor.cantadas.length > 0) return 'Con flor no hay envido'
      if (!enPrimera) return 'El envido se canta en la primera vuelta'
      if (yaJugoPrimera) return 'Ya jugaste tu carta'
      if (debeCantar) return 'Tenés flor: cantala'
      if (florDelEquipo.length > 0) return motivoFlorDelEquipo
      if (e.envido.estado === 'libre') {
        if (pend === null) {
          if (e.turno !== a) return 'No es tu turno'
          if (e.truco.valor !== 1) return 'Ya se aceptó el truco'
          if (!puede('tocar')) return 'Toca el pie'
          return null
        }
        if (pend === 'truco') {
          // "Envido va primero"
          const p = e.truco.pendiente!
          if (p.equipo === eq) return 'Esperá la respuesta del rival'
          if (p.nivel !== 2) return 'Ya no se puede cantar envido'
          if (!puede('tocar')) return 'Toca el pie'
          return null
        }
        return MENSAJE_PENDIENTE[pend]
      }
      if (e.envido.estado === 'pendiente') {
        if (ultimo(e.envido.cantos).equipo === eq) return 'Esperá la respuesta del rival'
        if (!puedeEncadenarEnvido(e.envido.cantos, accion.canto, cfg)) return 'No se puede cantar eso ahora'
        if (!esLider) return 'Contesta el pie'
        return null
      }
      return 'El envido ya se cantó'
    }

    case 'cantarFlor': {
      const f = e.flor
      if (accion.canto === 'contraflorAlResto' && f.estado === 'pendiente') {
        const ult = ultimo(f.contra)
        if (ult.equipo === eq) return 'Esperá la respuesta del rival'
        if (!cantoFlor) return 'Contesta el que tiene flor'
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
      if (accion.yTruco) {
        if (accion.canto !== 'flor' || cantoFlor) return '"Flor y truco" va con tu flor'
        if (pend) return MENSAJE_PENDIENTE[pend]
        if (e.turno !== a) return 'No es tu turno'
        if (e.truco.valor !== 1) return 'Ya se cantó el truco'
        if (!puede('gritar')) return 'Grita el pie'
      }
      if (accion.canto === 'flor') return null
      if (f.contra.length > 0) return 'Ya se cantó contraflor'
      if (!f.cantadas.some((x) => x.equipo !== eq)) return 'El rival no cantó flor'
      // Contesta el que tiene flor: si los del rival se fueron al mazo, no hay a quién cantarle.
      if (!f.cantadas.some((x) => x.equipo !== eq && !e.retirados.includes(x.asiento))) return 'Las flores del rival se fueron al mazo'
      return null
    }

    case 'responder': {
      if (pend === null || pend === 'declaracion') return 'No hay nada que responder'
      if (equipoQueCanto(e, pend) === eq) return 'Esperá la respuesta del rival'
      if ((pend === 'truco' || pend === 'envido') && !esLider) return 'Contesta el pie'
      if (pend === 'envido' && debeCantar) return 'Tenés flor: cantala'
      if (pend === 'envido' && florDelEquipo.length > 0) return motivoFlorDelEquipo
      // La flor va primero que el truco: el equipo no contesta hasta que la canta el que la tiene.
      if (pend === 'truco' && florDelEquipo.length > 0) return motivoFlorDelEquipo
      // A la contraflor contesta solo el que tiene flor; los demás esperan.
      if (pend === 'flor' && !cantoFlor) return 'Contesta el que tiene flor'
      if (accion.cantaLaMesa) {
        if (pend !== 'flor' || accion.respuesta !== 'quiero' || ultimo(e.flor.contra).canto !== 'contraflorAlResto') {
          return '"Canta la mesa" es al querer la contraflor al resto'
        }
      }
      return null
    }

    case 'declararTanto': {
      if (e.envido.estado !== 'declarando') return 'No se está declarando el envido'
      if (siguienteDeclarante(e) !== a) return 'No te toca declarar'
      if (debeCantar) return 'Tenés flor: cantala'
      const mejor = mejorDeclaracion(e)
      if (accion.tanto === 'sonBuenas') {
        if (!mejor) return 'El primero tiene que decir su tanto'
        // Si tenés más que lo que se viene diciendo, lo tenés que decir (en modo sucio se puede callar).
        if (!cfg.modoSucio && supera(e, { asiento: a, tanto: tanto.envidoReal }, mejor)) return 'Tenés más: lo tenés que decir'
        return null
      }
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

    case 'mandar': {
      if (!conPie) return 'En esta mesa no manda el pie'
      if (lider !== a) return 'Manda el pie'
      const comp = accion.a
      if (comp === a || !e.participantes.includes(comp) || equipoDe(comp) !== eq) return 'Mandá a un compañero'
      if (e.retirados.includes(comp)) return 'Ese compañero se fue al mazo'
      if (e.ordenes.some((o) => o.asiento === comp && o.que === accion.que)) return 'Ya se lo mandaste'
      if (accion.que === 'tocar' && (!enPrimera || e.envido.estado !== 'libre' || e.flor.cantadas.length > 0)) {
        return 'Ya no se puede tocar'
      }
      if (accion.que === 'gritar' && e.truco.valor === 4) return 'No se puede subir más'
      return null
    }

  }
}

const CANTO_TRUCO: Record<2 | 3 | 4, CantoTruco> = { 2: 'truco', 3: 'retruco', 4: 'valeCuatro' }

function ejecutar(estado: EstadoPartida, accion: Accion, eventos: Evento[]) {
  const jugador = jugadorDe(estado, accion.jugador)!
  const { asiento: a, equipo: eq } = jugador
  const { config: cfg, mano } = estado

  if (accion.tipo === 'cortar') {
    const r = cortarYRepartir(estado, accion.corte)
    estado.rng = r.rng
    estado.mano = r.mano
    eventos.push({ tipo: 'corte', asiento: a, corte: accion.corte })
    eventosDeReparto(estado.mano, eventos)
    return
  }

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
      const tapada = accion.tapada === true
      ultimo(e.vueltas).jugadas.push({ asiento: a, carta: accion.carta, ...(tapada ? { tapada } : {}) })
      // Tapada no la ve nadie más; en el pica-pica las piezas van por abajo: solo las ve el rival del duelo.
      const ocultaPara = tapada
        ? estado.jugadores.map((j) => j.asiento).filter((x) => x !== a)
        : mano.picaPica && esPieza(accion.carta, mano.muestra)
          ? estado.jugadores.map((j) => j.asiento).filter((x) => !e.participantes.includes(x))
          : []
      eventos.push({
        tipo: 'cartaJugada',
        asiento: a,
        carta: accion.carta,
        ...(tapada ? { tapada } : {}),
        ...(ocultaPara.length > 0 ? { ocultaPara } : {}),
      })
      avanzarVuelta(estado, e, eventos)
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
      usarOrden(e, a, 'gritar')
      eventos.push({ tipo: 'cantoTruco', asiento: a, canto: CANTO_TRUCO[nivel] })
      return
    }

    case 'cantarEnvido': {
      const primeroEstaElEnvido = e.envido.estado === 'libre' && e.truco.pendiente !== null
      e.envido.estado = 'pendiente'
      e.envido.cantos.push({ canto: accion.canto, asiento: a, equipo: eq })
      usarOrden(e, a, 'tocar')
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
      if (accion.yTruco) {
        // "Flor y truco": primero se resuelve la flor y después el rival contesta el truco.
        e.truco.pendiente = { nivel: 2, equipo: eq, asiento: a }
        usarOrden(e, a, 'gritar')
        eventos.push({ tipo: 'cantoFlor', asiento: a, canto: accion.canto, yTruco: true })
        eventos.push({ tipo: 'cantoTruco', asiento: a, canto: 'truco' })
        return
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
        ...(accion.cantaLaMesa ? { cantaLaMesa: true } : {}),
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
          e.envido.porDeclarar = e.participantes.filter((x) => !e.retirados.includes(x))
        } else {
          e.envido.estado = 'noQuerido'
          e.envido.ganador = ultimo(e.envido.cantos).equipo
        }
      } else {
        rechazarOQuererFlor(estado, e, quiere, accion.cantaLaMesa === true, eventos)
      }
      return
    }

    case 'mostrarFlor': {
      const mesa = e.flor.mesa!
      mesa.mostradas[a]!.push(accion.carta)
      eventos.push({ tipo: 'florMostrada', asiento: a, carta: accion.carta, suma: sumaFlor(mesa.mostradas[a]!, mano.muestra, cfg.florConPiezas) })
      if (siguienteEnMesa(e) === null) resolverContraflorAlResto(estado, e, eventos)
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
      // Mientras no se vaya el pie, los compañeros se van solos y el equipo sigue.
      const lider = liderDe(estado, e, eq)
      if (lider !== null && lider !== a) {
        e.retirados.push(a)
        mano.cartas[a] = []
        e.ordenes = e.ordenes.filter((o) => o.asiento !== a)
        eventos.push({ tipo: 'alMazo', asiento: a, equipo: eq, solo: true })
        // Si con la contraflor pendiente se fue el último de su equipo con flor, es "me achico".
        const f = e.flor
        if (f.estado === 'pendiente' && ultimo(f.contra).equipo !== eq) {
          const quedan = f.cantadas.some((x) => x.equipo === eq && !e.retirados.includes(x.asiento))
          if (!quedan) rechazarOQuererFlor(estado, e, false, false, eventos)
        }
        avanzarVuelta(estado, e, eventos)
        return
      }
      eventos.push({ tipo: 'alMazo', asiento: a, equipo: eq })
      const env = e.envido
      const f = e.flor
      // La flor que el rival no llegó a cantar porque te fuiste se cobra igual.
      if (cfg.florObligatoria) {
        for (const r of e.participantes) {
          if (equipoDe(r) === eq || !debeCantarFlor(estado, e, r)) continue
          const t = mano.tantos[r]!
          t.florDeclarada = t.florReal
          f.cantadas.push({ asiento: r, equipo: equipoDe(r), tantoDeclarado: t.florReal! })
          eventos.push({ tipo: 'cantoFlor', asiento: r, canto: 'flor' })
        }
        if (f.cantadas.length > 0 && env.estado !== 'anulado') {
          env.estado = 'anulado'
          env.porDeclarar = []
          env.ganador = null
        }
      }
      if (env.estado === 'pendiente') {
        const ult = ultimo(env.cantos)
        if (cfg.mazoCobraEnvidoPendiente && ult.equipo !== eq) {
          env.estado = 'noQuerido'
          env.ganador = ult.equipo
        } else {
          env.estado = 'anulado'
        }
      } else if (cfg.mazoCobraEnvidoPendiente && env.estado === 'libre' && sePodiaTocar(e)) {
        // Irse en la primera cuando todavía se podía tocar: el rival cobra el envido no querido.
        env.estado = 'noQuerido'
        env.ganador = otroEquipo(eq)
      }
      if (f.estado === 'pendiente') {
        if (ultimo(f.contra).equipo !== eq) {
          rechazarOQuererFlor(estado, e, false, false, eventos)
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

    case 'mandar': {
      e.ordenes.push({ asiento: accion.a, que: accion.que })
      eventos.push({ tipo: 'orden', asiento: a, a: accion.a, que: accion.que })
      return
    }
  }
}

/** El compañero que el pie mandó a tocar o a gritar ya lo hizo. */
function usarOrden(e: Enfrentamiento, a: number, que: QueManda) {
  e.ordenes = e.ordenes.filter((o) => o.asiento !== a || o.que !== que)
}

/**
 * Después de una carta (o de que alguien se fue solo al mazo): le toca al siguiente que falta
 * jugar en la vuelta o, si ya jugaron todos los que siguen en la mano, se cierra la vuelta.
 */
function avanzarVuelta(estado: EstadoPartida, e: Enfrentamiento, eventos: Evento[]) {
  const { mano, config: cfg } = estado
  const n = estado.jugadores.length
  const vuelta = ultimo(e.vueltas)
  const activos = (desde: number) => ordenDesde(e.participantes, desde, n).filter((x) => !e.retirados.includes(x))
  const faltan = activos(vuelta.empieza).filter((x) => !vuelta.jugadas.some((j) => j.asiento === x))
  if (faltan.length > 0) {
    e.turno = faltan[0]!
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
  // Si el que tiene que empezar se fue al mazo, empieza el siguiente que sigue en la mano.
  const empieza = activos(ganador ?? (cfg.empiezaTrasParda === 'mano' ? e.mano : vuelta.empieza))[0]!
  e.vueltas.push({ empieza, jugadas: [], resultado: null, ganador: null })
  e.turno = empieza
}

/** Eventos de una mano nueva: repartida, o esperando el corte. */
function eventosDeReparto(m: EstadoMano, eventos: Evento[]) {
  if (m.cortando !== null) {
    eventos.push({ tipo: 'esperandoCorte', numero: m.numero, reparte: m.reparte, mano: m.mano, asiento: m.cortando })
    return
  }
  const e0 = m.enfrentamientos[0]!
  eventos.push({
    tipo: 'manoRepartida',
    numero: m.numero,
    reparte: m.reparte,
    mano: m.mano,
    muestra: m.muestra,
    picaPica: m.picaPica,
  })
  eventos.push({ tipo: 'enfrentamientoIniciado', indice: 0, participantes: e0.participantes, mano: e0.mano })
}

/**
 * Si el envido todavía se podía tocar: primera vuelta, sin flor, sin truco querido y, con un
 * truco sin contestar, solo si era el truco (todavía cabe "envido va primero").
 */
function sePodiaTocar(e: Enfrentamiento): boolean {
  if (e.vueltas.length !== 1 || e.flor.cantadas.length > 0) return false
  if (e.truco.valor !== 1) return false
  return e.truco.pendiente === null || e.truco.pendiente.nivel === 2
}

function rechazarOQuererFlor(estado: EstadoPartida, e: Enfrentamiento, quiere: boolean, cantaLaMesa: boolean, eventos: Evento[]) {
  const f = e.flor
  if (!quiere) {
    // "Con flor me achico": el que la cantó cobra 3 por cada flor de su equipo.
    const equipo = ultimo(f.contra).equipo
    f.estado = 'noQuerida'
    f.noQuerida = { equipo, puntos: 3 * f.cantadas.filter((x) => x.equipo === equipo).length }
    return
  }
  f.estado = 'querida'
  if (ultimo(f.contra).canto === 'contraflor') {
    // La contraflor querida se compara en el momento, como el envido; los puntos van al final de la mano.
    f.ganador = ganadorFlor(e)
    eventos.push({ tipo: 'florResuelta', ganador: f.ganador, tantos: floresEnOrden(e), alResto: false })
    return
  }
  if (cantaLaMesa) {
    // "Canta la mesa": los que tienen flor tiran sus cartas de a una, en orden desde el mano. La
    // que ya jugaron en la primera ya está a la vista: cuenta como tirada.
    const orden = floresEnOrden(e)
      .map((x) => x.asiento)
      .filter((x) => !e.retirados.includes(x))
    const jugadas = (x: number) => e.vueltas[0]!.jugadas.filter((j) => j.asiento === x && j.carta && !j.tapada).map((j) => j.carta!)
    f.mesa = { orden, mostradas: Object.fromEntries(orden.map((x) => [x, jugadas(x)])) }
    if (siguienteEnMesa(e) === null) resolverContraflorAlResto(estado, e, eventos)
    return
  }
  resolverContraflorAlResto(estado, e, eventos)
}

/** Las flores cantadas, en orden desde el mano. */
function floresEnOrden(e: Enfrentamiento): { asiento: number; tanto: number }[] {
  return [...e.flor.cantadas]
    .sort((x, y) => e.participantes.indexOf(x.asiento) - e.participantes.indexOf(y.asiento))
    .map((x) => ({ asiento: x.asiento, tanto: x.tantoDeclarado }))
}

/**
 * La contraflor al resto querida es el partido: se comparan las flores y termina ahí. Si se cantó
 * la mesa, vale lo que se vio: una flor que no era flor (modo sucio) no cuenta.
 */
function resolverContraflorAlResto(estado: EstadoPartida, e: Enfrentamiento, eventos: Evento[]) {
  const mesa = e.flor.mesa
  if (mesa) {
    for (const f of e.flor.cantadas) {
      const cartas = mesa.mostradas[f.asiento]
      if (cartas) f.tantoDeclarado = calcularFlor(cartas, estado.mano.muestra, estado.config.florConPiezas) ?? -1
    }
  }
  const g = ganadorFlor(e)
  e.flor.ganador = g
  eventos.push({ tipo: 'florResuelta', ganador: g, tantos: floresEnOrden(e), alResto: true })
  terminarJuego(estado, 'contraflorAlResto', g, 0, eventos)
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

/**
 * Cuántas flores del equipo ganador le ganan a la mejor flor del rival (mayor, o igual y más
 * cerca del mano). Si el rival se fue al mazo, valen todas.
 */
function floresQueGanan(e: Enfrentamiento, g: Equipo): number {
  const propias = e.flor.cantadas.filter((x) => x.equipo === g)
  if (e.alMazo !== null) return propias.length
  const pos = (a: number) => e.participantes.indexOf(a)
  const rival = e.flor.cantadas
    .filter((x) => x.equipo !== g)
    .reduce((m, x) => (x.tantoDeclarado > m.tantoDeclarado || (x.tantoDeclarado === m.tantoDeclarado && pos(x.asiento) < pos(m.asiento)) ? x : m))
  return propias.filter(
    (x) => x.tantoDeclarado > rival.tantoDeclarado || (x.tantoDeclarado === rival.tantoDeclarado && pos(x.asiento) < pos(rival.asiento)),
  ).length
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
      const g = f.ganador ?? ganadorFlor(e)
      puntos[g] += ultimo(f.contra).canto === 'contraflor' ? estado.config.valorContraflor : valorResto(estado, g)
    } else if (equipos.size === 2) {
      const g = ganadorFlor(e)
      puntos[g] += 3 * floresQueGanan(e, g)
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
  eventos.push({
    tipo: 'enfrentamientoTerminado',
    indice: mano.actual,
    resultado: e.resultado,
    participantes: [...e.participantes],
    muestra: mano.muestra,
    picaPica: mano.picaPica,
  })

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
  eventosDeReparto(nueva.mano, eventos)
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
