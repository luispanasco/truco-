# Corrección de los mazos ilustrados

Qué hay que corregir en los 19 mazos ilustrados (Oriental, Costa Uruguaya, Colonial, Grabado Nocturno y los 15 de los departamentos), con las reglas sacadas de los tres mazos históricos que usa el juego: Fournier 1878, El Cid 1888 y Grimaud 1860.

Hay que rehacer **los ases y las cartas del 2 al 7**: 28 por mazo. Las figuras (10, 11 y 12) están bien y no se tocan.

## Qué está mal

1. **Los palos son muy chicos y desaprovechan la carta.** En el 2 de oros, la moneda mide un cuarto del ancho de la carta; en el Fournier, la mitad. Las espadas y los bastos del 2 al 7 son figuritas de un cuarto del alto; en los originales van de punta a punta. Por eso cuesta saber qué carta es. Es lo más importante de corregir (ver "El espacio").
2. **Todos los palos usan la misma disposición** (una columna en el 3, una grilla en el 6), y en la baraja española cada palo tiene la suya. Por ejemplo:
   - el 3 de bastos son tres bastos cruzados;
   - el 3 de espadas son tres espadas paradas, una al lado de la otra;
   - el 3 de oros y el de copas van en diagonal.
3. **El 7 no tiene la forma de siempre:** está armado con tres en la fila del medio. Lo correcto se describe más abajo.
4. **Los ases son el palo agrandado.** En las barajas de siempre son dibujos únicos. El 1 de espadas y el 1 de bastos, las dos cartas más altas del truco, son los más fuertes (ver "Los ases").
5. **Faltan las variantes de los palos:**
   - el 2 y el 3 de espadas y de bastos usan una versión **larga** y más trabajada, y del 4 al 7, una **corta** y más simple;
   - en una misma carta, las espadas y los bastos **alternan dos colores**;
   - en el 5 de oros y en el 5 de copas, el del medio es **más grande**.

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
- **Los nombres de archivo:** `1-oro.webp` … `7-basto.webp`.

## El espacio

Los palos se dibujan en la **zona de los palos**: de x = 40 a x = 360 y de y = 110 a y = 490 (320 × 380 px). La zona está para **llenarla**, no para dejarla vacía:

- **Del 2 al 7,** los palos de cada carta, juntos, van por lo menos de y = 125 a y = 475: casi todo el alto de la zona.
- **Los tamaños de las tablas son el mínimo.** Un palo puede ser hasta un 5 % más grande si no toca al de al lado, pero nunca más chico.
- **Entre dos palos** queda apenas un poco de papel, de 10 a 20 px. Solo se tocan en el 3 de bastos, que va cruzado.
- **El as** ocupa la zona entera: lo más alto y lo más bajo del dibujo quedan a menos de 15 px de los bordes de la zona, y lo más ancho a menos de 25 px de los costados.
- **Nada se sale de la zona** ni toca los números.

Prueba rápida: con la carta al lado de la misma del Fournier, el palo tiene que verse **del mismo tamaño o más grande**.

## Los ases

Cada as es un dibujo único, en el estilo y los colores del mazo. No es el palo de las otras cartas agrandado. Ocupa la zona entera (ver "El espacio"). Puede tener un detalle del lugar (un paisaje chico, un animal, una flor), pero el palo manda: es lo primero que se ve y lo que más espacio ocupa. Sin letras: los generadores de imágenes escriben mal.

- **1 de espadas, la carta más alta del truco.** Tiene que ser el más impactante del mazo:
  - una espada grande y ornamentada, apenas inclinada (unos 12°), que va de punta a pomo por todo el alto de la zona;
  - la cruz trabajada, con volutas en las puntas y una piedra al medio, y el puño forrado;
  - una cinta en los colores del mazo, enroscada en la hoja, con las dos puntas al viento.
  - De referencia: el sable envuelto en cintas del Fournier o la espada con cabeza de dragón de El Cid.
- **1 de bastos, la segunda carta más alta.** Un garrote grande y nudoso:
  - apenas inclinado hacia el otro lado que la espada, con la cabeza gruesa arriba;
  - ramas cortadas, hojas y una cinta atada con las puntas colgando;
  - de punta a punta de la zona;
  - con fuerza, no un palito.
- **1 de oros:** una medalla grande, de unos 250 px de diámetro:
  - en el centro, el motivo del mazo (en la baraja propia del juego, el Sol de Mayo);
  - a los costados, ramas de laurel (o una planta del lugar);
  - abajo, una cinta sin letras.
- **1 de copas:** una copa de lujo, de unos 340 px de alto:
  - con tapa y remate arriba, y piedras o una guarda en el cáliz;
  - el tallo con un nudo y el pie ancho;
  - más grande y trabajada que las copas de las otras cartas.

## Dónde van los palos del 2 al 7

Las coordenadas son el **centro** de cada palo, en píxeles sobre 400 × 600. El tamaño es el **diámetro** de la moneda, el **alto** de la copa o el **largo** de la espada o del basto, de punta a punta. Los tamaños son el mínimo (ver "El espacio").

### Oros y copas

Las monedas y las copas van siempre derechas, nunca dadas vuelta, ni siquiera en la mitad de abajo. Dentro de una carta son todas iguales, salvo la del medio del 5, que es más grande.

| Carta | Dónde va cada uno (x, y) | Tamaño |
|---|---|---|
| 2 | (200, 205) y (200, 395): en columna | 160 |
| 3 | (130, 190), (270, 300) y (130, 410): en diagonal; arriba a la izquierda, al medio a la derecha y abajo a la izquierda | 140 |
| 4 | (120, 185), (280, 185), (120, 415) y (280, 415): las cuatro esquinas, con el medio libre | 130 |
| 5 | las cuatro esquinas, en (115, 175), (285, 175), (115, 425) y (285, 425), más uno al medio en (200, 300) | esquinas 115; el del medio 150 |
| 6 | dos columnas, en x = 130 y x = 270, de tres filas, en y = 175, 300 y 425 | 110 |
| 7 | dos arriba, en (125, 170) y (275, 170); uno al medio un poco más arriba, en (200, 240); dos en (125, 315) y (275, 315); y dos abajo, en (125, 430) y (275, 430) | 100 |

### Espadas

Las espadas son largas y derechas, como en el Fournier. En el 2 y el 3 va la **espada larga**: un sable con la empuñadura trabajada. Del 4 al 7, la **espada corta**, más simple. En cada carta se alternan los dos colores: la primera de un color, la siguiente del otro, y así.

| Carta | Disposición | Largo |
|---|---|---|
| 2 | Dos paradas, una al lado de la otra, en x = 140 y x = 260, de y = 120 a y = 480. La de la izquierda con la empuñadura arriba; la de la derecha, abajo. | 360 (larga) |
| 3 | Tres paradas, una al lado de la otra, en x = 105, 200 y 295, de y = 120 a y = 480. Las de los costados con la empuñadura abajo; la del medio, arriba. La cruz de cada una mide 90 de ancho como mucho, para no tocar la espada de al lado. | 360 (larga) |
| 4 | Cuatro en diagonal, como una X abierta. El pomo de la empuñadura va en cada esquina: (75, 115), (325, 115), (75, 485) y (325, 485). Las puntas apuntan al centro (200, 300) y se quedan a unos 25 px de él, sin tocarse. | 195 (corta) |
| 5 | Cuatro paradas en las esquinas, en x = 100 y x = 300: las de arriba de y = 115 a y = 285 y las de abajo de y = 315 a y = 485. Más una acostada al medio, de x = 110 a x = 290 en y = 300, con la empuñadura a la izquierda. | esquinas 170; la del medio 180 (corta) |
| 6 | Dos filas de tres paradas, en x = 105, 200 y 295: arriba de y = 120 a y = 290 y abajo de y = 310 a y = 480. | 170 (corta) |
| 7 | Como el 6 pero más cortas (arriba de y = 115 a y = 265 y abajo de y = 335 a y = 485), más una acostada al medio, de x = 100 a x = 300 en y = 300. | 150; la del medio 200 (corta) |

Del 4 al 7, la **empuñadura va siempre hacia afuera** (la fila de arriba con la empuñadura arriba y la de abajo, abajo) y la **punta hacia el medio**. En el 2 y el 3 se alternan, como dice la tabla.

### Bastos

Los bastos son garrotes: gruesos en la cabeza y finos en la punta. En el 2 y el 3 va el **basto largo**, con nudos y ramas. Del 4 al 7, el **basto corto**, más simple, en forma de gota alargada. En cada carta se alternan los dos colores.

| Carta | Disposición | Largo |
|---|---|---|
| 2 | Dos parados, uno al lado del otro, en x = 125 y x = 275, de y = 125 a y = 475, los dos con la cabeza arriba. | 350 (largo) |
| 3 | **Cruzados:** uno parado en el medio, de y = 120 a y = 480, y dos en diagonal (inclinados 40° a cada lado) que se cruzan con él en el centro (200, 300), como una X con un palo en el medio. Atados con una cinta o un lazo en el cruce. Las tres cabezas arriba. | parado 360; diagonales 360 (largo) |
| 4 | Cuatro en diagonal, como una X abierta, con la cabeza en cada esquina. Los centros van en (125, 190), (275, 190), (125, 410) y (275, 410). Las puntas finas miran al centro, sin tocarse. | 210 (corto) |
| 5 | Como el 4, más chicos (centros en (115, 180), (285, 180), (115, 420) y (285, 420)), más uno acostado al medio, de x = 100 a x = 300 en y = 300. | esquinas 180; el del medio 200 (corto) |
| 6 | Dos filas de tres parados, en x = 105, 200 y 295: arriba de y = 120 a y = 290, con la cabeza arriba, y abajo de y = 310 a y = 480, con la cabeza abajo. | 170 (corto) |
| 7 | Como el 6 pero más cortos (arriba de y = 115 a y = 265 y abajo de y = 335 a y = 485), más uno acostado al medio, de x = 100 a x = 300 en y = 300. | 150; el del medio 200 (corto) |

## Cómo conviene hacerlo

Hay dos formas. Recomiendo la A.

**A. El agente dibuja solo los objetos sueltos y el juego arma las cartas.** Por cada mazo, el agente entrega en PNG con fondo transparente los cuatro ases y los palos sueltos, en sus variantes. Un script del proyecto arma las 28 cartas con las coordenadas de este documento, sobre el fondo, el marco y los números que ya tiene cada mazo. Así las posiciones y los tamaños salen exactos en los 19 mazos y no hay que revisar 532 cartas una por una.

**B. El agente dibuja las 28 cartas completas.** Sirve, pero los generadores de imágenes suelen fallar en contar, en ubicar y en el tamaño. Habría que revisar cada carta contra las tablas.

## Prompt para el agente (forma A, recomendada)

> Vamos a corregir los 19 mazos que hiciste para el Truco Uruguayo (Oriental, Costa Uruguaya, Colonial, Grabado Nocturno y los 15 de los departamentos). Las figuras (10, 11 y 12) quedan como están. Rehacemos los ases y los palos de las cartas del 2 al 7, y las cartas las armo yo con un programa. Vos dibujás **solo los objetos sueltos**.
>
> Por cada mazo, en el mismo estilo, paleta y nivel de detalle que ya tiene ese mazo, entregá estos 14 PNG con **fondo transparente**:
>
> **Los cuatro ases**, de 640 × 760 px. Cada uno llena el cuadro entero: lo más alto y lo más bajo a menos de 30 px del borde y lo más ancho a menos de 50 px de los costados.
>
> 1. `as-espada.png`: la espadilla, la mata más alta del truco: tiene que ser la más impactante del mazo. Una espada grande y ornamentada, apenas inclinada (unos 12°), con la punta arriba, que va de punta a pomo por todo el alto. La cruz trabajada, con volutas y una piedra al medio, y el puño forrado. Una cinta en los colores del mazo, enroscada en la hoja, con las dos puntas al viento. De referencia: el sable con cintas de la baraja Fournier de 1878 o la espada con cabeza de dragón de la baraja El Cid.
> 2. `as-basto.png`: un garrote grande y nudoso, apenas inclinado hacia el otro lado (unos -14°), con la cabeza gruesa arriba, ramas cortadas, hojas y una cinta atada con las puntas colgando. De punta a punta del cuadro. Con fuerza, no un palito.
> 3. `as-oro.png`: una medalla grande que ocupa casi todo el ancho, con el motivo del mazo en el centro, ramas de laurel (o una planta del lugar) a los costados y una cinta abajo.
> 4. `as-copa.png`: una copa de lujo que ocupa todo el alto, con tapa y remate, piedras o una guarda en el cáliz, el tallo con un nudo y el pie ancho.
>
> **Los palos de las cartas del 2 al 7.** Cada uno ocupa todo el alto de su cuadro:
>
> 5. `oro.png`: una moneda vista de frente, redonda, de 600 × 600 px, ocupando todo el cuadro. Más simple que el as.
> 6. `copa.png`: una copa derecha, de 480 × 600 px (ancho × alto). Más simple que el as.
> 7. `espada-larga-a.png` y 8. `espada-larga-b.png`: el sable del 2 y el 3, de 220 × 1200 px, con la **punta arriba**. Recto y largo, con la empuñadura trabajada; la cruz mide como mucho 200 px de ancho. Las dos iguales en forma, de **dos colores distintos** (por ejemplo, hoja azul y hoja roja, o empuñaduras de dos colores).
> 9. `espada-corta-a.png` y 10. `espada-corta-b.png`: la espada del 4 al 7, de 180 × 700 px, con la **punta arriba**. Más simple. De los mismos dos colores que las largas.
> 11. `basto-largo-a.png` y 12. `basto-largo-b.png`: el garrote del 2 y el 3, de 260 × 1200 px, con la **cabeza gruesa arriba**. Con nudos y alguna rama, sin que nada se salga del cuadro. De dos colores distintos (por ejemplo, verde y rojo, como en la Fournier).
> 13. `basto-corto-a.png` y 14. `basto-corto-b.png`: el basto del 4 al 7, de 220 × 700 px, con la **cabeza gruesa arriba**. Más simple, en forma de gota alargada. De los mismos dos colores.
>
> Requisitos para todos:
> - **Que llenen su cuadro.** Se ven chicos en la pantalla del celular: cuanto más grande el objeto dentro del cuadro, mejor. Nada de márgenes de aire.
> - Fondo transparente, sin sombra proyectada, sin marco, sin números y sin letras.
> - En los palos del 2 al 7, sin elementos que dependan de la orientación (caras, paisajes con horizonte), porque se van a girar y dar vuelta. Los ases no se giran: pueden tener un detalle del lugar, chico, mientras el palo sea lo principal.
> - Líneas firmes y contraste alto, para que se reconozcan de un vistazo.
> - Todo lo de un mazo tiene que verse del mismo juego: los mismos colores y el mismo trazo.
> - Entregá un zip con una carpeta por mazo, con el mismo nombre que ya tienen (`artigas/`, `costa-uruguaya/`, `oriental/`, …), y adentro los 14 PNG con estos nombres.

## Prompt para el agente (forma B, cartas completas)

> Vamos a rehacer los ases y las cartas del 2 al 7 de los 19 mazos que hiciste para el Truco Uruguayo. Las figuras (10, 11 y 12) quedan como están.
>
> Para cada carta, partí de la que ya existe y mantené **idénticos** el tamaño (400 × 600), el fondo, el marco (líneas en x = 19–20 y 379–380, y = 23–24 y 575–576), la pinta (oros sin corte, copas 1, espadas 2 y bastos 3, arriba y abajo) y los dos números (el de arriba de y = 62 a 98, en el mismo lugar y con la misma tipografía). Cambiá solo el dibujo.
>
> **Lo más importante es el espacio.** Los palos tienen que ser **grandes**, como en la baraja Fournier de 1878: la zona de los palos (x = 40–360, y = 110–490) se llena. Del 2 al 7, los palos de cada carta van juntos por lo menos de y = 125 a y = 475, y entre dos palos quedan de 10 a 20 px. El as ocupa la zona entera.
>
> [Pegá acá "Los ases" y las tres tablas de "Dónde van los palos del 2 al 7".]
>
> Reglas que no se pueden romper:
> - Oros y copas siempre derechos.
> - Espadas y bastos largos; en el 2 y el 3 la versión larga y trabajada, del 4 al 7 la corta. En cada carta se alternan dos colores.
> - Del 4 al 7, la empuñadura (o la cabeza del basto) hacia afuera y la punta hacia el medio.
> - El 3 de bastos, cruzado. El 3 de espadas, tres paradas en fila. El 3 de oros y el de copas, en diagonal.
> - Contá los palos de cada carta antes de entregarla: tiene que haber exactamente tantos como el número.
>
> Entregá los WebP con los mismos nombres (`1-oro.webp` … `7-basto.webp`) y un zip por mazo.

## Para revisar lo que entregue el agente

- Que cada carta tenga tantos palos como su número.
- Que el 3 de bastos esté cruzado, el 3 de espadas sean tres paradas en fila y el 3 de oros y el de copas vayan en diagonal.
- Que, puesta al lado de la misma carta del Fournier, el palo se vea del mismo tamaño o más grande.
- Que el 1 de espadas sea la carta más impactante del mazo.
- Que el marco, la pinta y los números no se hayan movido. Esto lo puedo medir con un script en las 40 cartas de cada mazo.

## Dorsos nuevos (15 mazos)

Los dorsos de Rocha (`costa-uruguaya`), Montevideo (`grabado-nocturno`), Colonia (`colonial`) y Tacuarembó (`oriental`) están bien: un motivo central fuerte, simétrico, con ornamento alrededor. Los otros 15 son dos medallones con paisajes, uno arriba y otro abajo, y se ven recargados y chiquitos en la mesa. Se rehacen con una sola moneda grande al centro.

### Prompt para el agente

> Vamos a rehacer el dorso de 15 mazos del Truco Uruguayo. Hoy tienen dos medallones con paisajes (uno arriba y otro abajo) y en la mesa se ven recargados. Queremos el estilo de los dorsos que ya funcionan (te paso de referencia los de Rocha y Montevideo): un solo motivo central fuerte y ornamento alrededor.
>
> **Cada dorso:** `dorso.png`, 800 × 1200 px (se achica a 400 × 600), RGB sin transparencia, con las esquinas rectas (el juego las redondea).
> - **Al centro, una sola moneda grande**, de oro viejo grabado, que ocupe entre el 55 y el 65 % del ancho. En la moneda, en relieve, el símbolo del departamento (ver la tabla), con una corona de hojas o un filete alrededor. Sin letras ni números.
> - **Alrededor, el ornamento:** un campo con un estampado chico y parejo en el color del mazo (filigrana, arabescos o motivos del departamento, de 2 o 3 tonos), y un marco de un filete doble a unos 40 px del borde, con un adorno en cada esquina.
> - **Simétrico:** girado 180° tiene que verse igual (es el dorso de un naipe: no puede tener arriba ni abajo). Por eso nada de paisajes ni escenas: motivos que se puedan espejar.
> - Que se lea de lejos: en la mesa el dorso se ve de 30 a 90 px de ancho. Contraste claro entre la moneda y el fondo, formas grandes.
> - Colores: los del mazo de hoy (los mismos que sus cartas), con el dorado de la moneda.
>
> | Mazo (carpeta) | Departamento | Color del campo | Símbolo de la moneda |
> |---|---|---|---|
> | artigas | Artigas | violeta | una geoda de amatista |
> | canelones | Canelones | bordó | un racimo de uva |
> | cerro-largo | Cerro Largo | verde | una espiga de arroz |
> | durazno | Durazno | verde oscuro | un durazno con su hoja |
> | flores | Flores | marrón | las columnas de las Grutas del Palacio |
> | florida | Florida | azul petróleo | la Piedra Alta |
> | lavalleja | Lavalleja | verde azulado | sierras con una cascada |
> | maldonado | Maldonado | azul | los dedos de La Brava |
> | paysandu | Paysandú | ámbar | una espiga de cebada con lúpulo |
> | rio-negro | Río Negro | verde oliva | un girasol |
> | rivera | Rivera | verde palma | el Cerro del Marco |
> | salto | Salto | naranja tostado | una naranja con hojas |
> | san-jose | San José | gris azulado | las piedras de Mahoma |
> | soriano | Soriano | dorado oscuro | una espiga de trigo |
> | treinta-y-tres | Treinta y Tres | verde bosque | un bombo |
>
> Entregá un zip con una carpeta por mazo (los nombres de la tabla) y adentro `dorso.png`. Sumá una `muestra.jpg` con los 15 dorsos chicos (90 px de ancho) uno al lado del otro, para ver cómo se leen en la mesa. Arrancá por dos (Artigas y Salto) y mandalos solos primero, para ajustar antes de hacer el resto.

### Cuando llegue el zip

Cada `dorso.png` se pasa a WebP de 400 × 600 en `apps/web/public/barajas/<mazo>/dorso.webp`. Revisarlos en la mesa (el mazo y las manos de los rivales) y en el visor.
