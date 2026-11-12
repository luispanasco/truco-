# Mesas de los barrios de Rocha: paño, bordado y marco de cada barrio

En el modo historia, Rocha se divide en seis barrios. Cada barrio va a tener su propia mesa, con su paño, un bordado en el centro y un marco de madera, igual que las mesas de los departamentos (ver `INSTRUCTIVO-MESAS.md`).

La mesa que hoy es de Rocha (azul atlántico, con faros y olas, el faro con lobos marinos bordado y el marco de sogas marineras) pasa a ser la de **Cabo Polonio**. Hay que hacer las otras **cinco**. Ese mismo paquete va como ejemplo de estilo en `ejemplo-rocha-cabo-polonio/`.

## Cómo se arma la mesa en el juego

- **El paño (`pano.webp`):** se repite en mosaico sobre la mesa, cada repetición a 512 px de pantalla, con una viñeta oscura hacia los bordes.
- **El bordado (`bordado.png`):** va una sola vez, centrado, debajo de las cartas. Ocupa un 55 % del ancho de la mesa en horizontal y un 85 % en el celular parado.
- **El marco (`marco.png`):** rodea la mesa como una baranda, con un `border-image` de 9 partes: las cuatro esquinas quedan fijas y los lados se repiten. En pantalla mide unos 22 px de grueso.
- **Encima van** las cartas (papel claro, palos de colores), los avatares en los bordes, globos de texto y el mazo en una esquina. Las cartas se tiran en el centro.

## Prompt para el agente

> Vamos a hacer las mesas de cinco barrios de Rocha para el modo historia del Truco Uruguayo. Cada mesa tiene tres piezas: el paño, un bordado en el centro y el marco de madera. Ya hay una hecha, la de Cabo Polonio (en `ejemplo-rocha-cabo-polonio/`): seguí ese mismo estilo y esa misma calidad. Cada mesa tiene que reconocerse de un vistazo, como una mesa de juego hecha a mano para ese lugar, distinta de las otras, y las cartas (de papel claro, con números y palos de colores) se tienen que seguir leyendo perfecto encima.
>
> Por cada barrio entregá cuatro archivos:
>
> **1. `pano.webp`: el paño, 1024 × 1024 px, que se repite en mosaico sin costuras.**
> - Fieltro o paño de billar con textura de tela que se note (grano, hilos), en el **color propio del barrio** (ver la tabla). Un color con carácter, no gris: saturación media y luminosidad media-oscura (entre 25 y 45 sobre 100), para que el papel de las cartas resalte. Tiene que diferenciarse bien del azul atlántico de Cabo Polonio.
> - Encima, un estampado de motivos del barrio **a dos o tres tonos del mismo color** (más claros y más oscuros que el fondo, hasta 15 puntos de luminosidad de diferencia), como un damasco o una tela estampada. Que se vea, pero sin competir con las cartas.
> - Entre 6 y 10 motivos por cuadro, de 80 a 160 px, repartidos parejo.
> - Que empalme perfecto en los cuatro bordes: un motivo que se corta en un borde sigue del otro lado.
> - Sin letras, sin números, sin caras y nada que se parezca a una carta o a los palos (monedas, copas, espadas, bastos).
>
> **2. `bordado.png`: el bordado del centro, 1024 × 1024 px, fondo transparente.**
> - La escena del barrio (ver la tabla), **bordada a mano con hilo de colores** sobre el paño: que se vean las puntadas, el relieve del hilo y algún hilo dorado o plateado, como en el de Cabo Polonio.
> - De 3 a 5 colores que combinen con el paño. Nada de blanco puro ni de negro puro.
> - Ocupa entre el 70 y el 85 % del cuadro, centrado. Sin sombra alrededor (va "cosido" al paño), sin letras ni números. Si hay personas, chicas y sin cara reconocible.
>
> **3. `marco.png`: el marco de madera tallada, 1024 × 1024 px, fondo transparente.**
> - Es el borde de la mesa visto desde arriba: un rectángulo con las esquinas redondeadas (radio exterior de 110 px). **Toda la banda de madera mide 160 px de ancho en los cuatro lados.** El centro (704 × 704 px) queda **totalmente transparente**: ahí va el paño.
> - Madera con veta, lustre y volumen: la banda tiene canto redondeado (se ve el grosor, con luz arriba a la izquierda y sombra abajo a la derecha). Del lado de adentro, donde toca el paño, un **ribete o cordón** del color del bordado.
> - **Tallado:** el motivo principal va en las **cuatro esquinas** (dentro del cuadrado de 160 × 160 de cada esquina), y los lados llevan un tallado chico que se repite. En el juego la banda se ve de unos 22 px de grueso, así que el tallado tiene que ser de formas grandes y claras, con buen relieve; nada de detalle fino.
> - **Los lados se repiten:** el tramo del medio de cada lado (de 160 a 864 px) tiene que poder repetirse sin costura a lo largo, y el lado de arriba igual al de abajo, el de la izquierda igual al de la derecha.
> - Cada barrio con su madera y su color (ver la tabla).
>
> **4. `colores.json`:** los colores de la mesa en hexadecimal: `{ "pano": "#…", "panoOscuro": "#…", "madera": "#…", "maderaClara": "#…" }`. `pano` es el color promedio del paño, `panoOscuro` uno bastante más oscuro para la viñeta, y `madera` y `maderaClara`, la sombra y la luz del marco (se usan en botones y bordes chicos de la mesa).
>
> | Barrio (carpeta) | Color del paño | Motivos del paño | Bordado del centro | Madera del marco y tallado |
> |---|---|---|---|---|
> | La Paloma (`la-paloma/`) | turquesa de ola | tablas de surf, olas que rompen, soles, el faro blanco | un surfista chico arriba de una ola grande, con el faro del Cabo Santa María (blanco, cúpula roja) en la punta y el sol bajando sobre el mar | madera clara de tabla vieja, con cera; olas talladas en las esquinas |
> | La Pedrera (`la-pedrera/`) | gris piedra cálido, tirando a terracota | los postes blancos de la rambla, tramos de baranda, rocas, la cola de una ballena | la rambla sobre el acantilado: la fila de postes blancos con la baranda de madera y un banco, mirando la playa y el mar, con una ballena saltando a lo lejos | madera pintada de blanco y gastada, como la baranda de la rambla; postes y barandas tallados |
> | Aguas Dulces, Valizas y Castillos (`aguas-dulces-valizas-castillos/`) | verde ombú, oliva | hojas de ombú, ranchos sobre polines (pilotes), racimos de butiá, botes | un ombú gigante con sus raíces, y al lado un rancho de paja sobre polines a la orilla del agua, con un bote | madera rústica de polín, con corteza y amarres de soga; raíces de ombú en las esquinas |
> | Punta del Diablo (`punta-del-diablo/`) | rojo coral de barca | barcas de pesca, redes, anclas, gaviotas | las barcas de pesca rojas y blancas en la arena, y atrás la estatua de Artigas sobre las rocas de la punta, con el mar | madera de barca pintada de rojo y blanco, descascarada; nudos y redes en las esquinas |
> | Santa Teresa y Chuy (`santa-teresa-y-chuy/`) | verde monte, oscuro | baluartes y garitas, rosas, palmeras, pinos | la Fortaleza de Santa Teresa (una muralla de piedra con su garita), con rosas del rosedal y palmeras del parque al frente, y un pedacito de la barra del arroyo Chuy con el mar al fondo | piedra y madera de pino con remaches de hierro, como un portón de fortaleza; almenas en las esquinas |
>
> Entregá un zip `Rocha-barrios-mesas.zip` con una carpeta por barrio (con el nombre de la tabla) y adentro los cuatro archivos. Sumá por barrio una `muestra.jpg` de 1280 × 800: la mesa armada (el paño repetido, el bordado al centro al 55 % y el marco alrededor de unos 22 px de grueso), con tres cartas españolas de papel claro encima, para revisarla de un vistazo. Arrancá por La Paloma y mandala sola primero, para ajustar antes de hacer las otras cuatro.

## Cuando llegue el zip

- Las mesas de los barrios entran al catálogo de mesas (`mesas.ts`) y al CSS de las mesas, igual que las de los departamentos. La de Cabo Polonio es la que hoy es de Rocha.
- Hay que decidir dónde se juega con cada mesa (en los niveles de su barrio) y si cada una es el premio de su barrio (ver `IDEAS.md`: un mazo por departamento y un paño por barrio).
