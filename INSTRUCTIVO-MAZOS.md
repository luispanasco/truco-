# Corrección de los mazos ilustrados

Qué hay que corregir en los 19 mazos ilustrados (Oriental, Costa Uruguaya, Colonial, Grabado Nocturno y los 15 de los departamentos), con las reglas sacadas de los tres mazos históricos que usa el juego: Fournier 1878, El Cid 1888 y Grimaud 1860.

Los ases (los 1) y las figuras (10, 11 y 12) están bien y no se tocan. Lo que hay que rehacer son las cartas **del 2 al 7** de cada palo: 24 por mazo.

## Qué está mal

1. **Los palos son muy chicos.** En el 2 de oros, la moneda mide un cuarto del ancho de la carta; en el Fournier, la mitad. Las espadas y los bastos del 2 al 7 son figuritas de un cuarto del alto de la carta; en los originales van de punta a punta. Por eso cuesta saber qué carta es.
2. **Todos los palos usan la misma disposición** (una columna en el 3, una grilla en el 6), y en la baraja española cada palo tiene la suya. Por ejemplo:
   - el 3 de bastos son tres bastos cruzados;
   - el 3 de espadas son tres espadas paradas, una al lado de la otra;
   - el 3 de oros y el de copas van en diagonal.
3. **El 7 no tiene la forma de siempre:** está armado con tres en la fila del medio. Lo correcto se describe más abajo.

## Lo que no se cambia

El ojeo del juego (deslizar la carta para ver solo el palo y después el número) mide estas posiciones en píxeles. Tienen que quedar idénticas:

- **Carta:** 400 × 600 px, WebP, con el mismo fondo y la misma textura de papel de cada mazo.
- **Marco:** las líneas verticales en x = 19–20 y x = 379–380, y las horizontales en y = 23–24 y y = 575–576.
- **La pinta** (los cortes en las líneas de arriba y de abajo del marco):
  - oros, sin corte;
  - copas, 1;
  - espadas, 2;
  - bastos, 3.
- **El número de arriba a la izquierda:** de y = 62 a y = 98, con la misma tipografía y el mismo color. Abajo a la derecha va el mismo número dado vuelta, en el lugar simétrico.
- **Los nombres de archivo:** `2-oro.webp` … `7-basto.webp`.

## Dónde van los palos

Los palos se dibujan en la **zona de los palos**: de x = 40 a x = 360 y de y = 110 a y = 490. Ningún palo se sale de esa zona ni toca el número de arriba ni el de abajo. Entre dos palos queda siempre un poco de papel, salvo en el 3 de bastos, donde se cruzan.

En todas las cartas, las coordenadas son el **centro** de cada palo, en píxeles sobre 400 × 600. El tamaño es el **diámetro** de la moneda, el **alto** de la copa o el **largo** de la espada o del basto, de punta a punta.

### Oros y copas

Las monedas y las copas van siempre derechas, nunca dadas vuelta, ni siquiera en la mitad de abajo. Dentro de una carta, todas son iguales.

| Carta | Dónde va cada uno (x, y) | Tamaño |
|---|---|---|
| 2 | (200, 205) y (200, 395): en columna | 160 |
| 3 | (130, 190), (270, 300) y (130, 410): en diagonal; arriba a la izquierda, al medio a la derecha y abajo a la izquierda | 140 |
| 4 | (120, 185), (280, 185), (120, 415) y (280, 415): las cuatro esquinas, con el medio libre | 130 |
| 5 | las cuatro esquinas, en (115, 175), (285, 175), (115, 425) y (285, 425), más uno al medio en (200, 300) | esquinas 115; el del medio 150 |
| 6 | dos columnas, en x = 130 y x = 270, de tres filas, en y = 175, 300 y 425 | 110 |
| 7 | dos arriba, en (125, 170) y (275, 170); uno al medio un poco más arriba, en (200, 240); dos en (125, 315) y (275, 315); y dos abajo, en (125, 430) y (275, 430) | 100 |

### Espadas

Las espadas son largas y derechas, como en el Fournier.

| Carta | Disposición | Largo |
|---|---|---|
| 2 | Dos paradas, una al lado de la otra, en x = 140 y x = 260, de y = 120 a y = 480. La de la izquierda con la empuñadura arriba; la de la derecha, abajo. | 360 |
| 3 | Tres paradas, una al lado de la otra, en x = 105, 200 y 295, de y = 120 a y = 480. Las de los costados con la empuñadura abajo; la del medio, arriba. La cruz de cada una mide 90 de ancho como mucho, para no tocar la espada de al lado. | 360 |
| 4 | Cuatro en diagonal, como una X abierta. El pomo de la empuñadura va en cada esquina: (75, 115), (325, 115), (75, 485) y (325, 485). Las puntas apuntan al centro (200, 300) y se quedan a unos 25 px de él, sin tocarse. | 195 |
| 5 | Cuatro paradas en las esquinas, en x = 100 y x = 300: las de arriba de y = 115 a y = 285 y las de abajo de y = 315 a y = 485. Más una acostada al medio, de x = 110 a x = 290 en y = 300, con la empuñadura a la izquierda. | esquinas 170; la del medio 180 |
| 6 | Dos filas de tres paradas, en x = 105, 200 y 295: arriba de y = 120 a y = 290 y abajo de y = 310 a y = 480. | 170 |
| 7 | Como el 6 pero más cortas (arriba de y = 115 a y = 265 y abajo de y = 335 a y = 485), más una acostada al medio, de x = 100 a x = 300 en y = 300. | 150; la del medio 200 |

Del 4 al 7, la **empuñadura va siempre hacia afuera** (la fila de arriba con la empuñadura arriba y la de abajo, abajo) y la **punta hacia el medio**. En el 2 y el 3 se alternan, como dice la tabla.

### Bastos

Los bastos son largos, como un garrote: gruesos en la cabeza y finos en la punta, con algún nudo o rama.

| Carta | Disposición | Largo |
|---|---|---|
| 2 | Dos parados, uno al lado del otro, en x = 125 y x = 275, de y = 135 a y = 465, los dos con la cabeza arriba. | 330 |
| 3 | **Cruzados:** uno parado en el medio, de y = 120 a y = 480, y dos en diagonal (inclinados 35° a cada lado) que se cruzan con él en el centro (200, 300), como una X con un palo en el medio. Atados con una cinta o un lazo en el cruce. Las tres cabezas arriba. | parado 360; diagonales 340 |
| 4 | Cuatro en diagonal, como una X abierta, con la cabeza en cada esquina. Los centros van en (125, 190), (275, 190), (125, 410) y (275, 410). Las puntas finas miran al centro, sin tocarse. | 210 |
| 5 | Como el 4, más chicos (centros en (115, 180), (285, 180), (115, 420) y (285, 420)), más uno acostado al medio, de x = 100 a x = 300 en y = 300. | esquinas 180; el del medio 200 |
| 6 | Dos filas de tres parados, en x = 105, 200 y 295: arriba de y = 120 a y = 290, con la cabeza arriba, y abajo de y = 310 a y = 480, con la cabeza abajo. | 170 |
| 7 | Como el 6 pero más cortos (arriba de y = 115 a y = 265 y abajo de y = 335 a y = 485), más uno acostado al medio, de x = 100 a x = 300 en y = 300. | 150; el del medio 200 |

## Cómo conviene hacerlo

Hay dos formas. Recomiendo la A.

**A. El agente dibuja solo los palos sueltos y el juego arma las cartas.** Por cada mazo, el agente entrega los cuatro palos sueltos (una moneda, una copa, una espada y un basto) en PNG con fondo transparente, en el estilo de ese mazo. Un script del proyecto arma las 24 cartas con las coordenadas de este documento, sobre el fondo, el marco y los números que ya tiene cada mazo. Así las posiciones salen exactas en los 19 mazos y no hay que revisar 456 cartas una por una.

**B. El agente dibuja las 24 cartas completas.** Sirve, pero los generadores de imágenes suelen fallar en contar y en ubicar. Habría que revisar cada carta contra las tablas.

## Prompt para el agente (forma A, recomendada)

> Vamos a corregir las cartas del 2 al 7 de los 19 mazos que hiciste para el Truco Uruguayo (Oriental, Costa Uruguaya, Colonial, Grabado Nocturno y los 15 de los departamentos). Los ases y las figuras quedan como están.
>
> Por cada mazo, dibujá **solo los cuatro palos sueltos**, en el mismo estilo, paleta y nivel de detalle que el as de ese palo en ese mazo (es el mismo objeto, más simple, para repetirlo en la carta):
>
> 1. `oro.png`: una moneda vista de frente, redonda, de 600 × 600 px, ocupando todo el cuadro.
> 2. `copa.png`: una copa derecha, de 480 × 600 px (ancho × alto), ocupando todo el alto.
> 3. `espada.png`: una espada derecha con la **punta arriba** y la empuñadura abajo, de 220 × 1200 px. La hoja ocupa todo el alto y la cruz mide como mucho 200 px de ancho. Recta, larga y fina, como las de la baraja española Fournier.
> 4. `basto.png`: un basto (garrote) derecho, con la **cabeza gruesa arriba** y la punta fina abajo, de 260 × 1200 px, ocupando todo el alto. Puede tener nudos y alguna ramita, como en la baraja Fournier, sin que nada se salga del cuadro.
>
> Requisitos:
> - PNG con **fondo transparente**, sin sombra proyectada, sin marco, sin texto, sin números y sin escena alrededor: solo el objeto, centrado.
> - Sin elementos que dependan de la orientación (letras, caras de personajes, paisajes con horizonte), porque los palos se van a girar y dar vuelta.
> - Los cuatro de un mazo tienen que verse del mismo juego: mismos colores y mismo trazo que su as.
> - Líneas firmes y contraste alto: se ven chicos en la pantalla del celular y tienen que reconocerse de un vistazo.
> - Entregá un zip con una carpeta por mazo, con el mismo nombre que ya tienen (`artigas/`, `costa-uruguaya/`, `oriental/`, …), y adentro `oro.png`, `copa.png`, `espada.png` y `basto.png`.

## Prompt para el agente (forma B, cartas completas)

> Vamos a rehacer las cartas del 2 al 7 de los 19 mazos que hiciste para el Truco Uruguayo. Los ases y las figuras quedan como están.
>
> Para cada carta, partí de la que ya existe y mantené **idénticos** el tamaño (400 × 600), el fondo, el marco (líneas en x = 19–20 y 379–380, y = 23–24 y 575–576), la pinta (oros sin corte, copas 1, espadas 2 y bastos 3, arriba y abajo) y los dos números (el de arriba de y = 62 a 98, en el mismo lugar y con la misma tipografía). Cambiá solo los palos.
>
> Los palos tienen que ser **grandes**, como en la baraja Fournier de 1878, y seguir la disposición tradicional de la baraja española. Las coordenadas son el centro de cada palo, en píxeles. El tamaño es el diámetro de la moneda, el alto de la copa o el largo de la espada o del basto. Todo queda dentro de x = 40–360, y = 110–490.
>
> [Pegá acá las tres tablas de "Dónde van los palos": oros y copas, espadas y bastos.]
>
> Reglas que no se pueden romper:
> - Oros y copas siempre derechos.
> - Espadas y bastos largos y finos; del 4 al 7, la empuñadura (o la cabeza del basto) hacia afuera y la punta hacia el medio.
> - El 3 de bastos, cruzado. El 3 de espadas, tres paradas en fila. El 3 de oros y el de copas, en diagonal.
> - Contá los palos de cada carta antes de entregarla: tiene que haber exactamente tantos como el número.
>
> Entregá los WebP con los mismos nombres (`2-oro.webp` … `7-basto.webp`) y un zip por mazo.

## Para revisar lo que entregue el agente

- Que cada carta tenga tantos palos como su número.
- Que el 3 de bastos esté cruzado, el 3 de espadas sean tres paradas en fila y el 3 de oros y el de copas vayan en diagonal.
- Que, puesta al lado de la misma carta del Fournier, el palo tenga un tamaño parecido.
- Que el marco, la pinta y los números no se hayan movido. Esto lo puedo medir con un script en las 40 cartas de cada mazo.
