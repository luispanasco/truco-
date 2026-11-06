# Truco 3 vs 3: reglas y situaciones

Cómo juega el motor hoy el 3 vs 3, con las opciones por defecto, y una lista de situaciones numeradas con lo que tiene que pasar en cada una. Sirve para probar y reportar fallas por número ("falla la 23: …").

Las reglas generales (piezas, jerarquía, cuenta del envido y de la flor) están en la especificación. Acá va solo lo que importa para jugar de a seis.

---

## 1. La mesa

- **Asientos:** seis, del 0 al 5, en sentido antihorario. Los pares (0, 2, 4) son un equipo y los impares (1, 3, 5) el otro. Vos estás siempre en el 0.
- **Compañeros y rivales:** quedan alternados. A tu derecha y a tu izquierda tenés rivales, y tus compañeros quedan cruzados.
- **Reparto:** reparte uno y es mano el de su derecha. El reparto rota una posición por mano.
- **Antes de la primera mano** (opcionales):
  - **Tirar reyes:** el primer rey reparte. Si se eligen "equipos al azar", los tres primeros reyes van juntos.
  - **Corte:** corta el de la izquierda del que reparte, eligiendo el corte convencional, sacar la muestra o "se la doy al mano".

## 2. Mano redonda y mano de pica-pica

- **Redonda:** juegan los seis a la vez, en tres vueltas. La vuelta la gana el equipo de la carta más alta.
- **Pica-pica** (activado por defecto):
  - **Cuándo:** mientras los dos equipos están en malas (los dos con 15 o menos, en un partido a 30). Las manos se alternan: una redonda, una de pica-pica, otra redonda… Arranca la redonda.
  - **Cómo:** un solo reparto. Después se juegan tres duelos de 1 contra 1, cada uno contra el rival de enfrente: abre el mano contra su rival y siguen las otras parejas en sentido antihorario.
  - **Cada duelo** es una mano 1 vs 1 completa: su truco, su envido y su flor. No hay pie ni señas. Los puntos de los tres duelos se suman por equipo.
  - **Piezas por abajo:** una pieza jugada en un duelo la ven solo los dos del duelo. Los demás ven una carta boca abajo y no se descubre nunca.
  - **Al mazo en un duelo:** cierra solo ese duelo.
- **Cuando un equipo entra en buenas** (16 o más), todas las manos vuelven a ser redondas.

## 3. El pie (solo en la redonda)

- **Quién es:** en cada equipo, el último en jugar la primera vuelta. Con la opción por defecto ("el pie es una persona"), si el equipo tiene personas, es la última persona en jugar la primera. En un equipo de vos y dos bots, sos vos siempre.
- **Qué hace el pie:**
  - Contesta por todo el equipo el truco y el envido (quiero, no quiero, subir). Si le cantan al equipo y no sos el pie: "Contesta el pie".
  - Les manda a sus bots qué carta jugar ("dejala", "matala", "jugá algo"), "vení", "vamos a X" (un compañero), y que toquen o griten en su turno.
- **Un bot mandado por una persona:** no canta nada por su cuenta, salvo la flor, y no juega hasta que el pie le diga. Si el pie no dice nada en el tiempo del turno, decide solo.
- **Un compañero persona:** el pie solo le insinúa; decide él.
- **Lo que se oye:** las órdenes de qué carta tirar las ven solo el pie y el que la recibe. "Vení", "vamos a", "tocá" y "gritá" las oye toda la mesa.

## 4. Vueltas

- **Orden:** cada vuelta la empieza quien ganó la anterior. Después de una parda, la empieza el que empezó la vuelta empatada.
- **Gana la mano el equipo que gana dos vueltas:**
  - Si la primera es parda, define la segunda; si también es parda, la tercera; si son todas pardas, gana el equipo del mano.
  - Si la primera tiene ganador y la segunda es parda, gana el de la primera.
- **Parda:** cuando la carta más alta la empatan dos jugadores de equipos distintos. Si los dos son del mismo equipo, gana ese equipo.
- **Pasar:** solo en la tercera vuelta, y solo el primero de su equipo en jugar. Tira su carta tapada y esa carta no gana la vuelta.

## 5. Truco

- **Valor:** sin cantar, la mano vale 1. Truco 2, retruco 3, vale cuatro 4.
- **Quién grita:** en tu turno. Si el pie decide los toques y gritos, solo el pie o el bot que él mandó. Solo sube el equipo que aceptó el último canto.
- **Quién contesta:** el pie del equipo al que le gritaron.
- **No querido:** el que gritó cobra el valor anterior (1, 2 o 3).
- **La flor va primero:**
  - Si tenés flor sin cantar, no podés gritar: primero la flor, o "flor y truco" en un solo canto.
  - Si un compañero tiene flor sin cantar, nadie del equipo grita hasta que la cante.
  - Si te gritan y alguien de tu equipo tiene flor sin cantar, la canta antes de que el pie conteste.

## 6. Envido

- **Cuándo:** en la primera vuelta, antes de jugar tu carta, en tu turno. Se canta antes de que se acepte el truco.
- **"Envido va primero":** si gritan truco y todavía no se aceptó, alguien que no jugó su carta puede tocar el envido. Se juega el envido y después se contesta el truco.
- **Cantos:** envido 2, real envido 3, falta envido. Se encadenan sin límite y en cualquier orden, alternando equipos; la falta corta la cadena.
- **Quién contesta:** el pie.
- **No querido:** 1 punto, o lo acumulado antes del último canto.
- **Declaración (querido):**
  - Empieza el mano. Cada uno dice un tanto mayor que el mejor que se viene diciendo, o "son buenas".
  - Una vez que un equipo va ganando, sus compañeros se saltean: declaran solo los del otro equipo.
  - En un empate de tantos gana el más cercano al mano.
- **Con flor no hay envido:**
  - Si alguien del equipo tiene flor sin cantar, el equipo no canta ni contesta el envido: primero se canta la flor.
  - Cuando alguien canta flor, el envido queda anulado y no lo cobra nadie.

## 7. Flor

- **Quién tiene flor:** tres cartas del mismo palo. Las piezas sirven de comodín.
- **Cuándo:** es obligatoria y se canta en la primera vuelta, antes de jugar. Si no se canta, no se puede jugar.
- **Cuando uno canta flor, la cantan todos los que la tienen**, en orden desde el mano, antes de seguir.
- **Valor:** 3 por cada flor. Varias flores del mismo equipo suman 3 cada una.
- **Flor contra flor sin contraflor:** gana la flor más grande, y su equipo cobra 3 por cada flor suya mayor que la mejor del rival. El otro equipo no cobra nada.
- **Contraflor y contraflor al resto:**
  - Solo las canta y las contesta alguien que tiene flor ("con flor quiero" / "con flor me achico"). Los demás esperan.
  - Si no la quieren, el que la cantó cobra 3 por cada flor de su equipo más 1.
  - La contraflor querida vale 6, y se compara en el momento.
  - La contraflor al resto querida es el partido: el que gana la comparación gana la partida ahí. Con "canta la mesa", en vez de decir el número se tiran las cartas de la flor.
- **Flor que no llegó a cantarse porque el rival se fue al mazo:** se cobra igual.

## 8. Irse al mazo

- **Un compañero que no es el pie:** se va solo. Deja sus cartas, no juega más la mano y el equipo sigue con los demás.
- **El pie:** cuando se va, el equipo pierde la mano y el rival cobra lo que vale el truco en ese momento. Un grito sin contestar cuenta como no querido.
- **Si te vas en la primera vuelta y todavía se podía tocar el envido**, el rival cobra además 1 de envido. Si el rival tiene flor, cobra la flor en vez del envido.
- **Durante la declaración del envido** no se puede ir nadie.

## 9. Puntaje y final

- **Partido:** a 30 por defecto (malas de 0 a 15, buenas de 16 a 30). También se puede jugar a 20 o a 40.
- **Falta envido:** si el que va ganando está en malas, lo que le falta para llegar a 15; si no, lo que le falta para ganar.
- **Se gana al llegar al total.** Si el tanto (envido o flor) ya alcanza para ganar y nadie puede cambiarlo, la partida termina en el momento, sin jugar el truco.

## 10. Señas

- **Quién las ve:** solo tus compañeros. El rival puede pescarlas: según la opción, solo ve que hiciste un gesto, o también qué gesto.
- **Qué marcan:** cada pieza, el 1 de espadas o de bastos, el 7 de espadas o de oros, un 3, un 2, el 1 de copas o de oros, la flor y el envido con su número exacto.
- **Cuándo:** se pueden hacer durante toda la mano, o solo hasta tirar tu primera carta (opción "Señas antes de jugar").
- **Los bots:** hacen sus señas y leen las tuyas.
- **En el pica-pica no hay señas.**

## 11. Ojeo y tiempos

- **Ojeo:** las cartas llegan apiladas y se descubren deslizando. Mientras ojeás no podés cantar ni jugar; "Ver todas" las abre de una. El ojeo no frena el reloj.
- **Tiempo:** 30 segundos por jugada (60 la primera). Online, si se vence 3 veces seguidas, te sacan y queda un bot en tu lugar.
- **Pausas:** 3 segundos entre vueltas y 5 entre manos.

---

## Situaciones para probar

Cada una dice qué hacer y qué tiene que pasar. Salvo que diga otra cosa: contra la compu, 3 vs 3, opciones por defecto. "Vos" es el asiento 0, tus compañeros el 2 y el 4, y los rivales el 1, el 3 y el 5.

### Mesa y manos

1. **Equipos.** Tus compañeros aparecen cruzados (no al lado tuyo): a tu derecha y a tu izquierda, rivales.
2. **Rotación.** Mano a mano, el que reparte y el que es mano van rotando en sentido antihorario.
3. **Pica-pica alternado.** Con los dos equipos en malas, la primera mano es redonda, la segunda pica-pica, la tercera redonda…
4. **Fin del pica-pica.** Cuando un equipo pasa los 15, no hay más pica-pica.
5. **Duelos en orden.** En el pica-pica, el primer duelo es el del mano contra su rival de enfrente; después siguen las otras dos parejas en sentido antihorario.
6. **Duelos independientes.** En un duelo, el truco, el envido y la flor son solo de esos dos. Los otros miran y no pueden tocar nada.
7. **Pieza por abajo.** En el pica-pica, una pieza jugada en un duelo en el que no estás se ve boca abajo, y sigue así al terminar la mano.
8. **Puntos del pica-pica.** Al terminar los tres duelos, los puntos se suman por equipo.

### Vueltas

9. **Gana el que gana dos.** Ganás la primera y la segunda: la mano termina ahí, sin tercera.
10. **Parda en la primera.** La primera parda la define la segunda.
11. **Todas pardas.** Gana el equipo del mano.
12. **Parda entre compañeros.** Dos cartas iguales y más altas, pero del mismo equipo: la vuelta la gana ese equipo, no es parda.
13. **Quién empieza.** La vuelta siguiente la empieza el que ganó la anterior; después de una parda, el que empezó la vuelta empatada.
14. **Pasar en la tercera.** En la tercera, si sos el primero de tu equipo en jugar, aparece "Pasar". Tu carta va tapada y no gana.
15. **Pasar: no corresponde.** En la primera o la segunda vuelta, o si un compañero ya jugó en la tercera, no aparece "Pasar".

### Pie

16. **Quién es el pie.** En un equipo tuyo con dos bots, el pie sos vos siempre (te aparecen los botones para mandar).
17. **Mandar a un bot.** Le decís "matala" a un compañero bot: juega su carta más alta cuando le toca.
18. **Bot sin órdenes.** Si no le decís nada, después del tiempo del turno decide solo.
19. **"Vení".** El bot juega su carta más baja.
20. **"Tocá" y "Gritá".** El bot mandado canta envido o truco en su turno, después de una pausa corta. Toda la mesa lo oye.
21. **Contesta el pie.** El rival te grita truco: contestás vos. Un compañero tuyo no puede contestar.
22. **Pie rival.** Le gritás a ellos: contesta el pie de ellos, no cualquiera.
23. **Sin pie en el pica-pica.** En los duelos no aparecen los botones del pie.

### Truco

24. **Escalera.** Truco, retruco, vale cuatro: solo sube el equipo que aceptó el último.
25. **No querido.** No querer el retruco da 2 al que lo cantó; no querer el truco da 1.
26. **No se grita fuera de turno.** No se puede gritar en el turno de otro, salvo para subir un canto que te hicieron.
27. **Flor frena el truco.** Si un compañero tiene flor sin cantar, nadie del equipo puede gritar hasta que la cante.
28. **"Flor y truco".** Con flor, en tu turno de la primera, aparece "Flor y truco": primero se resuelve la flor y después el rival contesta el truco.

### Envido

29. **Tocar en tu turno.** En la primera vuelta, antes de jugar, en tu turno.
30. **Después de jugar.** Si ya jugaste tu carta en la primera, no podés tocar.
31. **"Envido va primero".** Te gritan truco en la primera, antes de que nadie lo acepte: podés tocar el envido. Se juega el envido y después contestás el truco.
32. **Cadena.** Envido, envido, real envido, falta: se puede encadenar, alternando equipos.
33. **No querido.** No querer un primer envido da 1; no querer después de envido-envido da 2 (lo acumulado antes del último).
34. **Declaración.** Empieza el mano; cada uno dice más o "son buenas"; los del equipo que va ganando se saltean.
35. **Empate de tantos.** Gana el más cercano al mano.
36. **Son buenas obligado.** Si tenés más que lo dicho, no te deja decir "son buenas": tenés que decir tu tanto.
37. **Con flor no hay envido.** Si un compañero tiene flor sin cantar, no te deja tocar ni contestar el envido.

### Flor

38. **Obligatoria.** Con flor, no podés jugar tu carta de la primera sin cantarla.
39. **La cantan todos.** Cuando alguien canta flor, los demás que tienen flor la cantan en orden desde el mano, antes de seguir el juego.
40. **Anula el envido.** Un envido ya cantado queda anulado y no lo cobra nadie.
41. **Flor contra flor.** Gana la más alta; su equipo cobra 3 por cada flor suya mayor que la mejor del rival.
42. **Contraflor.** La contesta solo uno que tenga flor ("con flor quiero" / "con flor me achico").
43. **Contraflor al resto querida.** El que gana la comparación gana la partida, sin seguir la mano.
44. **Flor sin cantar y mazo.** Si el rival se va al mazo antes de que cantes tu flor, la cobrás igual.

### Mazo

45. **Compañero al mazo.** Un compañero tuyo que no es el pie se va: deja de jugar, el equipo sigue y las vueltas se completan sin él.
46. **El pie al mazo.** Se va el pie: el equipo pierde la mano y el rival cobra el truco que vale.
47. **Mazo en la primera sin tocar.** El rival cobra 2: 1 del envido no querido y 1 del truco. Si el rival tenía flor, cobra la flor más el truco.
48. **Mazo durante la declaración.** No se puede: hay que esperar a que terminen de declarar.

### Puntaje

49. **Falta envido en malas.** Con el que va ganando en 8, la falta vale 7 (lo que le falta para 15).
50. **Falta envido en buenas.** Con el que va ganando en 20, la falta vale 10.
51. **Salir con el tanto.** Si con el envido o la flor un equipo llega a 30 y nadie puede contestar nada más, la partida termina ahí, sin jugar el truco.
52. **Llegar justo.** Gana el primero que llega a 30 (o al largo elegido).

### Señas

53. **Solo tus compañeros.** Una seña que hacés la reciben tus compañeros, no los rivales (salvo que la pesquen).
54. **Envido con número.** La seña de envido le llega al compañero con tu tanto exacto.
55. **Señas antes de jugar.** Con esa opción prendida, después de tirar tu primera carta no podés hacer señas.
56. **Sin señas en el pica-pica.**

### Ojeo

57. **Bloqueo.** Mientras ojeás no aparecen el tanto, los cantos ni el mazo; "Ver todas" los muestra.

---

**Para reportar:** el número, qué pasó y, si se puede, una captura. Si falla algo que no está en la lista, contalo igual y lo agrego.
