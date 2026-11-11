# Mesas del modo historia: paño con color, bordado y marco de madera tallada

Reemplaza al de `INSTRUCTIVO-PANOS.md`, que pedía motivos tono sobre tono y quedó con poca personalidad (el de Rocha). Ahora cada departamento tiene su mesa propia: el paño con color, un bordado en el centro y una madera distinta en el borde, con grosor y tallado.

## Cómo se arma la mesa en el juego

- **El paño (`pano.webp`):** se repite en mosaico sobre la mesa, cada repetición a 512 px de pantalla, con una viñeta oscura hacia los bordes.
- **El bordado (`bordado.png`):** va una sola vez, centrado, debajo de las cartas, a un 55 % del ancho de la mesa, con una opacidad de entre 60 y 85 % (se ajusta mirando cada mesa).
- **El marco (`marco.png`):** rodea la mesa como una baranda (`border-image` de 9 partes: las cuatro esquinas quedan fijas y los lados se repiten). En pantalla mide de 18 a 26 px de grueso.
- **Encima van:** las cartas (papel claro, palos de colores), los avatares en los bordes, globos de texto y el mazo en una esquina. Las cartas se tiran en el centro.

## Prompt para el agente

> Vamos a hacer las mesas de los 19 departamentos del Truco Uruguayo. Cada mesa tiene tres piezas: el paño, un bordado en el centro y el marco de madera. Hoy son un fieltro liso de un color con una madera marrón igual para todas, y quedan sin personalidad. Queremos que cada mesa se reconozca de un vistazo, como una mesa de juego hecha a mano para ese lugar, y que las cartas (de papel claro, con números y palos de colores) se sigan leyendo perfecto encima.
>
> Por cada departamento entregá cuatro archivos:
>
> **1. `pano.webp`: el paño, 1024 × 1024 px, que se repite en mosaico sin costuras.**
> - Fieltro o paño de billar con textura de tela que se note (grano, hilos), en el **color propio del departamento** (ver la tabla). Un color con carácter, no gris: saturación media y luminosidad media-oscura (entre 25 y 45 sobre 100), para que el papel de las cartas resalte.
> - Encima, un estampado o bordado de motivos del departamento **a dos o tres tonos del mismo color** (más claros y más oscuros que el fondo, hasta 15 puntos de luminosidad de diferencia), como un damasco o una tela estampada. Que se vea, pero sin competir con las cartas.
> - Entre 6 y 10 motivos por cuadro, de 80 a 160 px, repartidos parejo.
> - Que empalme perfecto en los cuatro bordes: un motivo que se corta en un borde sigue del otro lado.
> - Sin letras, sin números, sin caras y nada que se parezca a una carta o a los palos (monedas, copas, espadas, bastos).
>
> **2. `bordado.png`: el bordado del centro, 1024 × 1024 px, fondo transparente.**
> - Un solo motivo grande del departamento (ver la tabla), **bordado a mano con hilo de colores** sobre el paño: que se vean las puntadas, el relieve del hilo y algún hilo dorado o plateado. Puede llevar una guarda o una corona de hojas alrededor.
> - De 3 a 5 colores que combinen con el paño. Nada de blanco puro ni de negro puro.
> - Ocupa entre el 70 y el 85 % del cuadro, centrado. Sin sombra alrededor (va "cosido" al paño), sin letras ni números.
>
> **3. `marco.png`: el marco de madera tallada, 1024 × 1024 px, fondo transparente.**
> - Es el borde de la mesa visto desde arriba: un rectángulo con las esquinas redondeadas (radio exterior de 110 px). **Toda la banda de madera mide 160 px de ancho en los cuatro lados.** El centro (704 × 704 px) queda **totalmente transparente**: ahí va el paño.
> - Madera con veta, lustre y volumen: la banda tiene canto redondeado (se ve el grosor, con luz arriba a la izquierda y sombra abajo a la derecha). Del lado de adentro, donde toca el paño, un **ribete o cordón** del color del bordado.
> - **Tallado:** el motivo principal va en las **cuatro esquinas** (dentro del cuadrado de 160 × 160 de cada esquina), y los lados llevan un tallado chico que se repite (una guarda, hojas, una soga, ondas). En el juego la banda se ve de unos 20 px de grueso, así que el tallado tiene que ser de formas grandes y claras, con buen relieve; nada de detalle fino.
> - **Los lados se repiten:** el tramo del medio de cada lado (de 160 a 864 px) tiene que poder repetirse sin costura a lo largo, y el lado de arriba igual al de abajo, el de la izquierda igual al de la derecha.
> - Cada departamento con su madera y su color (ver la tabla).
>
> **4. `colores.json`:** los colores de la mesa en hexadecimal: `{ "pano": "#…", "panoOscuro": "#…", "madera": "#…", "maderaClara": "#…" }`. `pano` es el color promedio del paño, `panoOscuro` uno bastante más oscuro para la viñeta, y `madera` y `maderaClara`, la sombra y la luz del marco (se usan en botones y bordes chicos de la mesa).
>
> | Departamento | Color del paño | Motivos del paño | Bordado del centro | Madera del marco y tallado |
> |---|---|---|---|---|
> | Artigas | violeta amatista | geodas, plumas de carnaval | una geoda de amatista abierta con plumas | wengué casi negro; geodas talladas en las esquinas |
> | Canelones | bordó vino | racimos y hojas de parra | un racimo de uva con su hoja y un sarmiento | roble de barrica, con aros de hierro; hojas de parra |
> | Cerro Largo | verde arrozal | espigas de arroz, juncos | una espiga de arroz con una garza | lapacho; espigas y juncos |
> | Colonia | ocre terracota | adoquines, faroles | el faro de Colonia del Sacramento | nogal colonial oscuro; volutas de época |
> | Durazno | durazno tostado | duraznos con hojas, guitarras | un durazno con hojas y una guitarra | algarrobo; duraznos en las esquinas |
> | Flores | verde musgo | flores silvestres, piedras | las columnas de las Grutas del Palacio con flores | piedra y madera clara de fresno; columnas talladas |
> | Florida | azul lechero | tarros de leche, cerros | la Piedra Alta con el cielo | cedro; guarda de piedras |
> | Lavalleja | verde sierra | sierras, cascadas | sierras con la cascada del Salto del Penitente | quebracho con corteza; ondas de agua |
> | Maldonado | turquesa mar | olas, lobos marinos | los dedos de La Brava con el mar | madera de deriva clara, blanqueada por la sal; olas |
> | Montevideo | gris azulado nocturno | tambores, la rambla | el Palacio Salvo con la luna | caoba art déco con filetes dorados; líneas art déco |
> | Paysandú | ámbar cerveza | cebada, lúpulo | una espiga de cebada con flores de lúpulo | roble claro; espigas y lúpulo |
> | Río Negro | amarillo girasol apagado | girasoles, garzas | un girasol grande con una garza | eucalipto; pétalos tallados |
> | Rivera | verde palma | palmeras, cerros | el Cerro del Marco con palmeras | timbó rojizo; hojas de palma |
> | Rocha | azul atlántico | faros, olas, butiá | el faro de Cabo Polonio con olas y lobos marinos | madera de barco gastada, azul y blanca; sogas y nudos marineros |
> | Salto | naranja tostado | naranjas con hojas, vapor | una rama de naranjo con frutas | naranjo (madera rosada); azahares |
> | San José | gris piedra cálido | piedras, barrancas | las piedras de las Sierras de Mahoma | pino rústico; formas de piedra |
> | Soriano | dorado trigo | espigas de trigo, girasoles | un manojo de espigas de trigo atadas | roble dorado; espigas trenzadas |
> | Tacuarembó | marrón cuero | sombreros, mates, guitarras | una guitarra criolla con un sombrero y un mate | ñandubay oscuro con apliques de cuero; trenzado de tiento |
> | Treinta y Tres | verde quebrada | cuervos, el río Olimar | un bombo con la Quebrada de los Cuervos | ceibo rojizo; flores de ceibo |
>
> Entregá un zip con una carpeta por departamento, con el mismo nombre que ya tienen (`artigas/`, `cerro-largo/`, `rocha/`, `montevideo/`, …), y adentro los cuatro archivos. Sumá por departamento una `muestra.jpg` de 1280 × 800: la mesa armada (el paño repetido, el bordado al centro al 75 % y el marco alrededor de unos 24 px de grueso), con tres cartas españolas de papel claro encima, para revisarla de un vistazo. Arrancá por Rocha y mandala sola primero, para ajustar antes de hacer las otras 18.

## Cuando llegue el zip

- **Script:** `scripts/departamentos.py --panos <carpeta>` copia el paño y suma la capa del bordado y el marco (`border-image` con corte de 160) al CSS de cada mesa, con los colores de `colores.json`. Hay que extenderlo para el bordado, el marco y los colores (hoy solo hace el paño y el emblema).
- **Revisión en la mesa:** cada mesa con una partida de 3 contra 3. Las cartas, los números y los globos tienen que leerse igual que con el paño liso.
