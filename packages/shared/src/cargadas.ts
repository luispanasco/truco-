/**
 * Modo historia: lo que dicen en la mesa durante la partida. Al terminar una mano, según cómo viene
 * el tanteo, el rival te cancherea (si te viene ganando), se queja (si lo venís matando), comenta
 * la mitad o el final parejo y reacciona a una mano grande. A veces habla otro: un compañero suyo
 * o uno tuyo.
 *
 * Para que no sea monótono: no habla en todas las manos (hay una pausa entre frase y frase y no
 * siempre que puede), y las frases salen de bolsas mezcladas, sin repetirse hasta agotarlas.
 *
 * Lo usan igual la partida contra la compu (la conexión local) y la sala del cooperativo (el
 * servidor). Tu equipo es el 0 (los asientos pares); el rival, el 1.
 */

export type SituacionMesa = 'leGana' | 'loMatan' | 'mitadGana' | 'mitadPierde' | 'parejo' | 'ganoGrande' | 'perdioGrande'

/** Lo que dice el rival (o su compañero), en cada situación. */
const DEL_RIVAL: Record<SituacionMesa, readonly string[]> = {
  leGana: [
    'Vamos bien, ¿eh? Yo de vos me empiezo a preocupar.',
    '¿Querés que te preste las cartas buenas?',
    'Tranquilo, que perder también es aprender.',
    'Esto viene como piña.',
    'Contá los porotos, contá.',
    'Uh, ¿qué pasó? Te quedaste callado.',
    'Así no, así no.',
    'Si seguís así, te cobro la entrada.',
    'Me estoy aburriendo de ganar.',
    'Repartí despacio, que no hay apuro: total, gano igual.',
  ],
  loMatan: [
    'Pará, pará… ¿vos jugás en un boliche?',
    '¿Quién te enseñó a jugar así?',
    'Bueno, bueno, no te agrandes.',
    'Esto es suerte de principiante.',
    'Me están entrando todas malas, no es justo.',
    'Ya me voy a recuperar, vas a ver.',
    '¿Estás viendo mis cartas? Confesá.',
    'Ta, ta… disfrutá ahora, que dura poco.',
    'Me estás haciendo quedar mal delante de todos.',
    'Respirá, que todavía falta.',
  ],
  mitadGana: [
    'Mitad de partida y vamos arriba. Como tiene que ser.',
    'Ya pasamos la mitad. ¿Y vos cuándo arrancás?',
    'Medio camino hecho. El otro medio también va a ser mío.',
    'A esta altura ya podés ir pidiendo la revancha.',
  ],
  mitadPierde: [
    'Ya pasamos la mitad… pero lo bueno viene ahora.',
    'Te dejé adelantarte para que no te aburras.',
    'La segunda mitad es la mía. Avisame si te querés rendir.',
    'Arrancaste bien, lo reconozco. Ahora mirá.',
  ],
  parejo: [
    'Esto se define en la última.',
    'Parejito, parejito… como me gusta.',
    'Que no te tiemble el pulso ahora.',
    'El que pestañea, pierde.',
    '¡Qué partido! Hasta el final.',
  ],
  ganoGrande: [
    '¡Tomá! ¿Viste esa?',
    '¡Esa es la que me gusta!',
    'Anotá, anotá, que esa vale.',
    'Así se canta, ¿viste?',
    '¡Adentro! Para que aprendas.',
    '¿Y? ¿Te quedaron ganas de cantar?',
  ],
  perdioGrande: [
    'Uh… esa dolió.',
    'Bueno, esa te la regalé.',
    '¡Qué suerte que tenés, eh!',
    'Me la hiciste bien, lo reconozco.',
    'Esa no la vi venir.',
    'Disfrutala, que no te va a pasar de nuevo.',
  ],
}

/** Lo que dice uno de tus compañeros: festeja cuando ustedes van bien y te da ánimo cuando no. */
const DEL_COMPANIERO = {
  festejo: ['¡Eso! ¡Vamo arriba!', '¡Así se juega, compañero!', 'Que sigan hablando, que nosotros anotamos.', '¡Dale, que estos no saben nada!', '¡Qué manera de jugar!'],
  aliento: ['Tranquilo, que la damos vuelta.', 'No les des bola, que hablan mucho.', 'Vamos, que esto no terminó.', 'Una buena mano y los alcanzamos.', 'Concentrado, que se puede.'],
} as const

/** Lo propio de cada rival principal: cuando va ganando y cuando va perdiendo. */
const DEL_PERSONAJE: Record<string, { gana: readonly string[]; pierde: readonly string[] }> = {
  pescador: { gana: ['El mar siempre gana, gurí.', 'Te tengo en la red y no te das cuenta.'], pierde: ['Hoy no pica nada…', 'Ya va a cambiar la marea.'] },
  gaucho: { gana: ['Despacito y por las piedras.', 'En el campo se aprende a esperar.'], pierde: ['Ni el mejor caballo gana todas.', 'Mmm. Cebame otro mate.'] },
  pituco: { gana: ['Obvio que voy ganando. Obvio.', 'Esto es tipo… demasiado fácil.'], pierde: ['No, pará, esto no es obvio.', 'Ta, igual no me importa. Bueno, un poco.'] },
  murguista: { gana: ['¡Y este cuplé se lo dedico al que va perdiendo!', 'Ya te estoy componiendo la retirada.'], pierde: ['Hasta la murga tiene noches flojas.', '¡Que siga el tablado, que esto se da vuelta!'] },
  candombero: { gana: ['¡Escuchá cómo suena el tambor!', 'Este ritmo no lo parás.'], pierde: ['Se me cruzó el repique…', 'Ya agarro el ritmo, ya agarro.'] },
  buscadora: { gana: ['Las piedras me lo dijeron.', 'Esta partida brilla más que una amatista.'], pierde: ['Hasta las piedras se equivocan.', 'Estoy buscando la veta, ya aparece.'] },
  bodeguero: { gana: ['¡Salud! Esto merece un brindis.', 'Como el buen Tannat: mejora con el tiempo.'], pierde: ['Esto está más agrio que vino picado.', 'Paciencia, que la cosecha viene después.'] },
  fronterizo: { gana: ['Tá tudo bem… para mí.', 'De este lado y del otro, gano igual.'], pierde: ['¡Bah! ¿Qué está pasando?', 'Me distraje cruzando el puente.'] },
  quesero: { gana: ['Bien estacionado, como mis quesos.', 'Despacito se llega lejos.'], pierde: ['Esto se me cortó como leche vieja.', 'Le falta maduración a mi juego.'] },
  guia: { gana: ['Dato: voy ganando.', 'Esto es geología pura: capa sobre capa de puntos.'], pierde: ['Me perdí en las grutas…', 'Dejame prender la linterna, que no veo nada.'] },
  tambera: { gana: ['Yo madrugo y vos te dormís.', 'Esto sale fácil, como el ordeñe de la mañana.'], pierde: ['Se me volcó el tarro…', 'Ni las vacas me hacen renegar tanto.'] },
  payador: { gana: ['Voy arriba en el tanteo, y lo digo con salero.', 'Cantá nomás, compañero, que yo te contesto primero.'], pierde: ['Se me trabó la décima…', 'Me falta una rima… y unos cuantos puntos.'] },
  cervecero: { gana: ['Esto pide otra ronda. ¡Invito yo!', 'Bien espumoso viene el partido.'], pierde: ['Se me fue la espuma…', 'Esto está más amargo que la cerveza negra.'] },
  sanjavier: { gana: ['No me río. Pero voy ganando.', 'Como el girasol: siempre para el lado del sol.'], pierde: ['…', 'No me río. Ahora, menos.'] },
  freeshop: { gana: ['Esto está en oferta: dos puntos por uno.', 'Pagás en reales o en pesos, como quieras.'], pierde: ['Ah, no, esto no tiene descuento.', '¡Me están regateando los puntos!'] },
  termas: { gana: ['Qué relajada estoy. ¿Y vos?', 'Como en el agua caliente: todo bien.'], pierde: ['Se me enfrió el agua…', 'Ay, me están sacando de la pileta.'] },
  maragato: { gana: ['Los maragatos no se achican, ¿viste?', 'Esto es de San José.'], pierde: ['Un maragato no se rinde.', 'Ya vas a ver el rebenque.'] },
  chacarero: { gana: ['La cosecha viene buena.', 'Se viene lluvia… de puntos para mí.'], pierde: ['Esto es una sequía.', 'Hay que esperar que cambie el tiempo.'] },
  olimar: { gana: ['¡Pum, pum! Al ritmo del bombo.', 'Esto suena lindo, como el Olimar.'], pierde: ['Se me desafinó la guitarra.', 'Ya agarro el compás, ya.'] },
  // Los de los barrios de Rocha.
  surfista: { gana: ['Viene la serie buena, loco.', 'Estoy arriba de la ola.'], pierde: ['Me revolcó la espuma…', 'Hay que esperar la próxima ola.'] },
  ballenera: { gana: ['Anotado en el cuaderno, m\'hijo.', 'Te veo venir desde lejos.'], pierde: ['Esa no la vi venir…', 'Dejame limpiar los binoculares.'] },
  farera: { gana: ['El faro me alumbra a mí.', 'Ciento treinta y dos escalones arriba tuyo.'], pierde: ['Se me apagó la linterna…', 'Ya le doy cuerda al faro, ya.'] },
  palafito: { gana: ['Despacito, como se arregla el techo de paja.', 'El mar es testigo, botija.'], pierde: ['Se me vuela la paja…', 'Viene temporal, pero aguanto.'] },
  cambista: { gana: ['En pesos o en reales, voy ganando.', 'Esto cotiza alto, meu amor.'], pierde: ['¡Bah! Se me cayó el cambio.', 'Esto no cierra ni en reales.'] },
}

/** Las que dicen que el rival va bien (para sumar las propias de "gana") y las que no. */
const VA_BIEN: readonly SituacionMesa[] = ['leGana', 'mitadGana', 'ganoGrande']
const VA_MAL: readonly SituacionMesa[] = ['loMatan', 'mitadPierde', 'perdioGrande']

/** Cuántas manos tienen que pasar, como mínimo, entre una frase y la siguiente. */
const PAUSA_MANOS = 2

/** Lo que se dice: quién (su asiento) y qué. */
export interface FraseDeMesa {
  asiento: number
  texto: string
}

/**
 * La charla de una partida. `elenco[asiento]` es el personaje de cada lugar (por su id); null en
 * los de las personas (el 0 y, en cooperativo, otros pares), que no hablan solos.
 */
export class CharlaDeMesa {
  private bolsas = new Map<string, string[]>()
  private antes: [number, number] = [0, 0]
  private manos = 0
  private ultima = -PAUSA_MANOS
  private dichas = new Set<'mitad' | 'parejo'>()

  constructor(
    private readonly elenco: readonly (string | null)[],
    private readonly puntosPartida: number,
    private readonly azar: () => number = Math.random,
  ) {}

  /** Terminó una mano con este tanteo: devuelve lo que alguien dice, o null (la mayoría de las veces). */
  alTerminarMano(puntos: readonly [number, number]): FraseDeMesa | null {
    const hechos = [puntos[0] - this.antes[0], puntos[1] - this.antes[1]] as const
    this.antes = [puntos[0], puntos[1]]
    this.manos++
    if (this.manos - this.ultima < PAUSA_MANOS) return null
    const situacion = this.situacion(puntos, hechos)
    if (!situacion) return null
    const frase = this.quienLoDice(situacion)
    if (!frase) return null
    this.ultima = this.manos
    if (situacion === 'mitadGana' || situacion === 'mitadPierde') this.dichas.add('mitad')
    if (situacion === 'parejo') this.dichas.add('parejo')
    return frase
  }

  /** Qué pasó, si vale comentarlo (con su chance de que se diga algo). */
  private situacion(puntos: readonly [number, number], hechos: readonly [number, number]): SituacionMesa | null {
    const [vos, rival] = puntos
    const objetivo = this.puntosPartida
    const ventaja = Math.max(3, Math.round(objetivo * 0.2))
    if (hechos[1] >= 3) return this.azar() < 0.8 ? 'ganoGrande' : null
    if (hechos[0] >= 3) return this.azar() < 0.8 ? 'perdioGrande' : null
    if (!this.dichas.has('mitad') && Math.max(vos, rival) >= objetivo / 2) return rival >= vos ? 'mitadGana' : 'mitadPierde'
    if (!this.dichas.has('parejo') && Math.min(vos, rival) >= objetivo * 0.7 && Math.abs(vos - rival) <= 2) return 'parejo'
    if (rival - vos >= ventaja) return this.azar() < 0.5 ? 'leGana' : null
    if (vos - rival >= ventaja) return this.azar() < 0.5 ? 'loMatan' : null
    return null
  }

  /** Casi siempre el rival principal (en el 1); a veces su compañero o uno de los tuyos. */
  private quienLoDice(situacion: SituacionMesa): FraseDeMesa | null {
    const bots = (desde: number) => this.elenco.map((p, a) => (p && a % 2 === desde % 2 && a >= desde ? a : -1)).filter((a) => a >= 0)
    const companieros = bots(2)
    const suyos = bots(3)
    const sorteo = this.azar()
    // Uno de los tuyos: festeja si ustedes van bien y te da ánimo si no.
    if (companieros.length > 0 && sorteo < 0.25) {
      const tipo = VA_MAL.includes(situacion) ? 'festejo' : 'aliento'
      return { asiento: this.elegir(companieros), texto: this.sacar(tipo, DEL_COMPANIERO[tipo]) }
    }
    if (suyos.length > 0 && sorteo < 0.45) return { asiento: this.elegir(suyos), texto: this.sacar(situacion, DEL_RIVAL[situacion]) }
    const jefe = this.elenco[1]
    if (!jefe) return null
    const propias = DEL_PERSONAJE[jefe]
    const extra = !propias ? [] : VA_BIEN.includes(situacion) ? propias.gana : VA_MAL.includes(situacion) ? propias.pierde : []
    return { asiento: 1, texto: this.sacar(`${situacion}:${jefe}`, [...DEL_RIVAL[situacion], ...extra]) }
  }

  private elegir(asientos: readonly number[]): number {
    return asientos[Math.floor(this.azar() * asientos.length)]!
  }

  /** Saca una frase de la bolsa (mezclada); cuando se vacía, se vuelve a llenar. */
  private sacar(clave: string, frases: readonly string[]): string {
    let bolsa = this.bolsas.get(clave)
    if (!bolsa || bolsa.length === 0) {
      bolsa = [...frases]
      for (let i = bolsa.length - 1; i > 0; i--) {
        const j = Math.floor(this.azar() * (i + 1))
        ;[bolsa[i], bolsa[j]] = [bolsa[j]!, bolsa[i]!]
      }
      this.bolsas.set(clave, bolsa)
    }
    return bolsa.pop()!
  }
}
