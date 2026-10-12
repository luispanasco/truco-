# Revisión de reglas del motor

Repaso de las reglas del motor, bloque por bloque, empezado el 2026-10-12. Acá van solo los **cambios** pedidos: lo que no aparece quedó aprobado como está. Los cambios se programan juntos al terminar todos los bloques, con el plan aprobado antes.

## Bloques

| # | Bloque | Estado |
| --- | --- | --- |
| 1 | Baraja y reparto | Hecho |
| 2 | Piezas y jerarquía de cartas | Revisado, sin cambios |
| 3 | Vueltas, pardas y quién empieza (el pie lidera) | Revisado |
| 4 | Truco | Revisado, sin cambios |
| 5 | Envido y declaración | Revisado |
| 6 | Flor y contraflor | Revisado |
| 7 | Puntaje, malas, buenas y falta envido | Revisado |
| 8 | Irse al mazo | Revisado |
| 9 | 3v3 y pica-pica | Revisado |
| 10 | Turnos, tiempos y desconexiones | Revisado |

## Cambios pedidos

### Bloque 1: baraja y reparto

Aprobado sin cambios: 1.1 baraja de 40, 1.2 reparto y muestra, 1.3 sentido antihorario y rotación, 1.5 equipos alternados, 1.7 muestra boca arriba.

**1.4 Tirar reyes (opción de mesa).**
- Para elegir quién reparte la primera mano: empezando por el anfitrión y en sentido antihorario, se le da una carta a cada jugador hasta que sale el primer rey (12). Ese jugador reparte.
- Las cartas se sacan del fondo del mazo ("boca abajo") y se muestran boca arriba, a la vista de todos.
- También para armar los equipos al azar: se siguen tirando reyes hasta que salen los 2 primeros (2v2) o los 3 primeros (3v3), y esos forman un equipo.
- Hoy reparte siempre el último asiento (el asiento 0 es mano en la primera) y los equipos salen del orden de los asientos.

**1.6 Cortar el mazo (opción de mesa).** Corta el que está a la izquierda del que reparte, que en cada mano elige uno de tres cortes:
- **Corte convencional:** se corta el mazo.
- **Sacar la muestra:** se da vuelta la carta de arriba y esa es la muestra.
- **Se la doy al mano:** se corta una sola carta. Esa carta queda en el fondo del mazo y se la queda el mano.
- Hoy no hay corte: el servidor reparte directo.

### Bloque 2: piezas y jerarquía

Aprobado sin cambios.

### Bloque 3: vueltas, pardas y quién empieza

Aprobado sin cambios: 3.1 gana el que gana 2, 3.2 pardas, 3.3 orden antihorario dentro de la vuelta, 3.4 quién empieza cada vuelta.

**3.5 Pasar en la tercera (2v2 y 3v3).** En la tercera vuelta, el primero de su equipo en jugar puede pasar: tira su carta tapada y esa carta no puede ganar la vuelta. En 1v1 no se puede (sería como irse al mazo). Hoy no se puede: toda carta se juega boca arriba.

**3.6 El pie (2v2 y 3v3).**
- **Quién es:** en cada equipo, el último en jugar la primera vuelta. Es el que reparte y, en el otro equipo, el primero a la izquierda del mazo. Con la rotación, cada jugador es pie dos manos seguidas: primero a la izquierda del mazo y después repartiendo.
- **Sugerencias**, que el compañero no está obligado a seguir:
  - "Vení": no juegues nada bueno, vení a lo que juego yo;
  - "Vamos a X", donde X es un jugador.
- **Órdenes:** puede mandar a un compañero a tocar (cantar envido) o a gritar (cantar truco).
- Las sugerencias y las órdenes se dicen **en voz alta**: las oye el rival.
- **Opción de sala "Toques y gritos":** los decide el pie, o puede tocar y gritar cualquiera. Si los decide el pie, los demás tocan o gritan solo cuando él los manda, y las respuestas (quiero, no quiero, subir) las da solo el pie.
- **Con chat de voz, todo lo del pie queda anulado:** eso se dice por voz, como en persona.
- **Con bots** (pedido del 2026-10-06): si en el equipo hay una persona, ella lidera; si hay dos, lidera el pie que no es bot. Un bot compañero sigue tanto las órdenes como las sugerencias.
- Hoy no existe la figura del pie: cualquiera del equipo canta en su turno, contesta lo que le cantan (vale la primera respuesta) y nadie decide por los demás.

### Bloque 4: truco

Aprobado sin cambios.

### Bloque 5: envido y declaración

Aprobado sin cambios: 5.1 y 5.2 cálculo del tanto, 5.3 quién toca y cuándo, 5.5 no querer, 5.6 declaración (saltea al equipo que va ganando; empate, el más cercano al mano), 5.7 mostrar las cartas del tanto ("son buenas" no muestra), 5.8 el envido se anota al final de la mano, antes que el truco.

**5.4 Cadena de envido sin límite.** Envido y real envido se pueden encadenar en cualquier orden y las veces que se quiera (envido, envido, envido, real envido, envido…), siempre alternando equipos. Solo la falta envido corta la cadena: después de ella no se canta nada más. Los puntos siguen igual: querido, la suma de todos; no querido, lo acumulado antes del último (1 si era el primero).
- Hoy hay como máximo dos envidos y un real envido, y después del real envido no se puede volver a envido.
- La opción de sala "Envido envido" se queda: permitido = cadena libre; no permitido = un solo envido (después, real envido y falta envido como hasta ahora).

### Bloque 6: flor y contraflor

Aprobado sin cambios: 6.1 quién tiene flor, 6.2 cuenta de la flor, 6.4 cuando uno canta, la cantan todos, 6.5 la flor anula el envido.

**6.6 Flor contra flor sin contraflor.** El que gana suma 3 por cada flor suya **mayor que la mejor flor del rival**, no por todas sus flores. Ejemplo: A tiene 32 y 25, B tiene 28: A cobra 3 (solo el 32) y B nada. Hoy suma 3 por cada flor de su equipo.

**6.7 Contraflor al resto = el partido.** Querida, el que la gana gana el partido y no se sigue jugando. Hoy vale lo que le falta al que va ganando para llegar a 30 y la partida sigue si no llegó.

**6.7 Contraflor no querida.** El que la cantó cobra 3 por cada flor de su equipo más 1 por la contra no querida (una flor: 4; dos flores: 7). Vale para la contraflor y para la contraflor al resto. Hoy cobra 3, o 6 si contestaba una contraflor.

**6.7b "Con flor me achico" y "con flor quiero".** Son los nombres de las respuestas a la contraflor y a la contraflor al resto: "con flor me achico" es el no quiero y "con flor quiero" el quiero. Hoy se contesta "quiero" o "no quiero".

**6.8 "Flor y truco" en un solo canto.** Lo dice el que tiene flor, en la primera vuelta y en su turno, cuando está cargado o para asustar. Primero se resuelve la flor y después el rival contesta el truco. Hoy son dos cantos separados.

### Bloque 7: puntaje

Aprobado sin cambios: 7.2 gana el primero que llega, sin pasarse; 7.3 el tanto se anota antes que el truco; 7.4 falta envido (completar malas, después lo que falta para ganar).

**7.1 Largo del partido (opción de sala):** 10 y 10 (a 20), 15 y 15 (a 30, por defecto) o 20 y 20 (a 40). Malas es la primera mitad y buenas la segunda; la falta envido y el tramo del pica-pica se adaptan a la mitad. Hoy es siempre a 30.

### Bloque 8: irse al mazo

Aprobado sin cambios: 8.2 el rival cobra el truco que vale en ese momento (un grito sin contestar es no quiero), 8.3 envido del rival sin contestar se cobra como no querido, 8.6 en 1v1 no se pasa, se va al mazo.

**8.1 Irse solo (2v2 y 3v3).** Vale siempre (con o sin "lo decide el pie" y con chat de voz). Hasta que no se va el pie, el equipo sigue jugando: los compañeros se pueden ir al mazo solos (dejan sus cartas y no juegan más la mano) y el pie se queda. Cuando se va el pie, el equipo pierde la mano. Hoy, si se va cualquiera, pierde todo el equipo.

**8.4 Flor sin cantar.** Si alguien tenía flor y no la llegó a cantar porque el rival se fue antes, la cobra igual (3 por flor). Las flores ya cantadas se cobran como hasta ahora y, si los dos equipos cantaron, el que se fue pierde la comparación.

**8.5 Irse en la primera sin que se haya tocado.** Si te vas en la primera vuelta y todavía se podía tocar el envido, el rival cobra 2: el envido no querido (1) más el truco (1). Si el rival tiene flor, cobra la flor (3) más el truco en lugar del envido. Hoy cobra solo el truco.

### Bloque 9: 3v3 y pica-pica

Aprobado sin cambios: 9.1 solo en 3v3 y desactivable, 9.2 alternado en malas, 9.3 un solo reparto, 9.5 puntos por duelo sumados por equipo, 9.7 irse al mazo en un duelo solo cierra ese duelo.

**9.4 Las piezas van por abajo.** En el pica-pica, una pieza jugada en un duelo solo la ve el rival de ese duelo (y el que la jugó). Los otros cuatro (dos de cada equipo) no la ven, así no saben qué piezas se jugaron antes que ellos. Los demás ven una carta boca abajo y saben quién ganó la vuelta, pero no con qué. La pieza **no se descubre nunca** para ellos: ni al terminar la mano ni si se usó para el envido o la flor del duelo. Las demás cartas se ven como hasta ahora. Hoy todas las cartas de los duelos anteriores las ve todo el mundo.

**9.5b Contraflor al resto en un duelo.** Si sale y se quiere, el que la gana gana el partido entero ahí (consecuencia del 6.7).

**9.6 Sin pie ni señas en el pica-pica.** Cada duelo es como una partida independiente 1v1: no hay pie, ni sugerencias, ni órdenes, ni señas de los compañeros que miran.

### Bloque 10: turnos, tiempos y desconexiones

Aprobado sin cambios: 10.1 tiempos de 30 s por jugada y 60 s para la primera, 10.2 el reloj corre para todos los que pueden contestar, 10.3 desconexión con 20 s de gracia y bot medio hasta que vuelva, 10.4 abandonar sin penalidad (la fase 2 no da monedas), 10.6 sala vacía se cierra a los 2 minutos.

**10.1b Te sacan por tiempo.** Si se te vence el tiempo varias veces seguidas (3), te sacan de la mesa y queda el bot en tu lugar. Hoy el bot juega esa jugada y seguís vos, sin límite.

**10.5 Pausas.** 3 s después de cada vuelta y 5 s después de cada mano (cuando se terminan las tres vueltas). Hoy son 0,9 s y 2,7 s.

## Dudas cerradas (2026-10-12)

- 1.6: en "se la doy al mano" nadie ve la carta cortada, ni el que corta.
- 3.6: con chat de voz no hay botones del pie y puede tocar y gritar cualquiera.
- 6.3: con la flor obligatoria no se puede jugar sin cantarla (como hasta ahora).
- 10.1b: te sacan a las 3 jugadas vencidas seguidas (sin respuesta del número; se toma 3).
- Vocabulario: la app sigue diciendo "vuelta" y "mano".

## Plan para programar los cambios (aprobado 2026-10-12)

Va en cinco tramos. El motor primero, porque todo lo demás depende de él; después bots, servidor y web, que pueden ir en paralelo. Cada tramo cierra con sus tests en verde.

**Tramo 1: motor, puntos y cantos** (`packages/engine`)
- 5.4 cadena de envido libre; "Envido envido: no permitido" deja un solo envido.
- 6.6 flor contra flor: 3 por cada flor mayor que la mejor del rival.
- 6.7 contraflor no querida (3 por flor + 1) y contraflor al resto querida = partido (también en un duelo de pica-pica).
- 6.7b respuestas "con flor quiero" y "con flor me achico" (el motor marca que la respuesta es con flor, para los globos y las voces).
- 7.1 largo del partido 20, 30 o 40; malas, falta envido y tramo del pica-pica salen de la mitad.
- 8.4 la flor sin cantar se cobra si el rival se va; 8.5 irse en la primera sin tocar da 2 (o flor más truco).

**Tramo 2: motor, jugadas nuevas**
- 3.5 pasar en la tercera (carta tapada que no gana), solo 2v2 y 3v3.
- 6.8 "flor y truco" en un solo canto.
- 3.6 el pie: quién es en cada mano y la opción de sala "Toques y gritos" (pie o cualquiera). Con "pie", tocar y gritar solo el pie o el compañero que él mandó (acción nueva "mandar a tocar / a gritar"), y las respuestas solo el pie. Sin pie en el pica-pica.
- 8.1 irse al mazo solo: el compañero deja sus cartas y el equipo sigue hasta que se va el pie.
- 9.4 piezas por abajo: `vistaPara` las muestra boca abajo a los que no son del duelo, y nunca se descubren para ellos.
- 1.6 corte con tres tipos, elegido en cada mano por el de la izquierda del que reparte (acción nueva antes del reparto).

**Tramo 3: bots** (`packages/bots`)
- Jugar con todo lo anterior: cadenas de envido largas, flor nueva, pasar, flor y truco, irse solo, piezas tapadas, cortar.
- Seguir las órdenes y las sugerencias del pie humano; como pie, mandar y sugerir.
- Volver a medir el criterio (1000 partidas, semilla 2026).

**Tramo 4: servidor** (`apps/server`)
- 1.4 tirar reyes (opción de sala): quién reparte y, si se pide, equipos al azar.
- Mensajes nuevos: sugerencias del pie ("Vení", "Vamos a X") en voz alta, órdenes, corte.
- 10.1b te sacan a las 3 jugadas vencidas seguidas; 10.5 pausas de 3 s y 5 s.
- Con chat de voz (fase 2), lo del pie se apaga.

**Tramo 5: web** (`apps/web`)
- Crear sala: largo del partido, toques y gritos, tirar reyes, corte.
- Mesa: animación de tirar reyes y del corte, botón "Pasar", "Flor y truco", "Con flor quiero / me achico", panel del pie (Vení, Vamos a X, Tocá, Gritá), irse solo, cartas tapadas en el pica-pica.
- Textos de ayuda y reglas, globos y registro.
- Especificación y bitácora al día.

## Avance

**Tramo 1 hecho (2026-10-12).** Motor: cadena de envido libre (sin envido envido, uno solo), flor contra flor por flores que ganan, contraflor no querida 3 por flor + 1, contraflor al resto querida = partido, largo del partido 20/30/40 con malas y tramo a la mitad (`crearConfig`), flor sin cantar cobrada al irse el rival, irse en la primera sin tocar da el envido no querido. Tests del motor: 144 (antes 136); bots 14, servidor 52 y web 229 siguen en verde.
- Decisiones: el 8.5 va con la misma opción que el envido pendiente al irse (`mazoCobraEnvidoPendiente`); si el rival se va al mazo, el que queda cobra todas sus flores (el que se fue pierde la comparación); "con flor quiero / me achico" no cambia el motor (es la respuesta a la contraflor), se ve en la web en el tramo 5.
- Bots: tope provisorio para que no suban el envido sin fin (después de 4 cantos solo contestan o cantan la falta); se repasa en el tramo 3.

**Tramos 2 a 5 hechos (2026-10-12).**
- **Motor:** pasar en la tercera, "flor y truco", el pie (`liderDe`, opción `toquesYGritos`, acción `mandar`), irse al mazo solo (`retirados`), piezas por abajo y cartas tapadas (`vistaPara` y `eventosPara` las mandan en null), corte (`corte`, acción `cortar`, la mano espera con `cortando`). Los jugadores llevan `bot`. 162 tests, con las propiedades al azar que prueban también el pie, el corte y los largos.
- **Bots:** cortan, cantan "flor y truco" cargados, pasan en la tercera si su carta no gana y juega un compañero después, cumplen las órdenes del pie y siguen sus sugerencias ("vení": la más baja; "vamos a" un rival: la más baja que le gana), y como pie mandan a tocar o a gritar (`ordenar`). La contraflor al resto la cantan y la quieren solo muy seguros. Criterio con semilla 2026: difícil contra medio 64,5 / 64,3 / 66,4 %; medio contra fácil 70,9 / 66,9 / 67,2 % (1v1 / 2v2 / 3v3). 17 tests.
- **Servidor:** tirar reyes (`tirarReyes` en `@truco/shared`, reacomoda los lugares), sugerencias del pie (`sugerir` → `sugerencia`, en voz alta), el pie bot manda antes del turno del compañero, eventos filtrados por asiento, te saca a la tercera jugada vencida (`expulsado`), pausas de 3 s y 5 s, opciones validadas. 57 tests.
- **Web:** opciones nuevas al crear la sala y contra la compu (partido, tirar reyes, toques y gritos, corte), tirada de reyes, botones del corte, "Pasar", panel del pie, "Flor y truco", "con flor quiero / me achico", cartas boca abajo en la mesa, aviso al sacarte de la mesa. 235 tests, 10 de punta a punta y el de sin conexión.
- **Interpretación:** "vamos a X" con un compañero se toma como "vení" (dejarle la vuelta); con un rival, ganarle a su carta. Revisar con el usuario.
