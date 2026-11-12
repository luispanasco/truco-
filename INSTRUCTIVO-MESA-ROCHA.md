# La mesa de Rocha: la de toda la costa

Cada barrio de Rocha tiene su mesa (ver `INSTRUCTIVO-PANOS-BARRIOS.md`) y se gana al completarlo. La mesa de **Rocha** es otra cosa: es el premio por completar todo el departamento, los seis barrios. Tiene que juntar a los seis y verse más especial que las demás, como la mesa de honor de la costa.

La mesa que hasta ahora era de Rocha (azul atlántico, con el faro y los lobos marinos) pasa a ser la de Cabo Polonio. Esta es nueva.

## Prompt para el agente

> Ahora la mesa de Rocha: la que se gana al completar los seis barrios de la costa. Tiene las mismas tres piezas y los mismos tamaños que las de los barrios (el paño, el bordado y el marco: ver el instructivo de los barrios), pero es **la mesa de honor**: junta un poco de cada barrio y tiene que verse más lujosa que todas las demás, sin dejar de ser una mesa para jugar. Las cartas (papel claro, números y palos de colores) se tienen que seguir leyendo perfecto encima.
>
> Los seis barrios y lo que identifica a cada uno:
> - **La Paloma:** el surf, una ola y el faro del Cabo Santa María (blanco, cúpula roja).
> - **La Pedrera:** los postes blancos y la baranda de la rambla, y una ballena.
> - **Cabo Polonio:** el faro de ladrillo y los lobos marinos.
> - **Aguas Dulces, Valizas y Castillos:** el ombú y los ranchos sobre polines.
> - **Punta del Diablo:** las barcas de pesca rojas y blancas.
> - **Santa Teresa y Chuy:** la Fortaleza, con su garita.
>
> **1. `pano.webp`: 1024 × 1024 px, en mosaico sin costuras.**
> - Fieltro con textura de tela, en **azul medianoche**: más oscuro y más violáceo que el azul de Cabo Polonio, para que no se confundan. Luminosidad entre 20 y 35 sobre 100.
> - Estampado tono sobre tono con **un motivo de cada barrio** (una tabla con su ola, un poste de la rambla, un lobo marino, una hoja de ombú, una barca y una garita), repartidos parejo, de 80 a 160 px, entre 8 y 12 por cuadro.
> - Como es la mesa de honor, algunos motivos pueden llevar un filete fino de **hilo dorado**, apenas, sin que compita con las cartas.
> - Que empalme perfecto en los cuatro bordes. Sin letras, sin números, sin caras y nada que se parezca a una carta o a los palos.
>
> **2. `bordado.png`: 1024 × 1024 px, fondo transparente.**
> - Un **medallón bordado**, como un escudo de la costa. Al centro, la costa de Rocha como en un mapa antiguo, de La Paloma a la frontera, con el mar a la derecha y los seis lugares marcados en orden, cada uno con su ícono chico (el faro de La Paloma, la rambla, el faro del Polonio con un lobo, el ombú, una barca, la Fortaleza). Alrededor, una guirnalda de olas, hojas de butiá y una soga marinera.
> - Más hilo dorado que en los bordados de los barrios: el borde del medallón y los detalles. De 4 a 6 colores en total. Nada de blanco puro ni de negro puro.
> - Ocupa entre el 75 y el 85 % del cuadro, centrado. Sin sombra alrededor, sin letras ni números (los lugares se reconocen por el ícono, no por el nombre).
>
> **3. `marco.png`: 1024 × 1024 px, fondo transparente, banda de 160 px.**
> - Las mismas medidas que los demás: esquinas redondeadas (radio exterior de 110 px), banda de **160 px** en los cuatro lados y el centro (704 × 704 px) totalmente transparente.
> - **Madera noble oscura** (wengué o nogal), con lustre fuerte y **marquetería**: incrustaciones de madera clara y filetes dorados. Del lado de adentro, un cordón dorado.
> - **Las cuatro esquinas son distintas**, una por barrio, talladas en relieve dentro del cuadrado de 160 × 160: arriba a la izquierda **un faro**, arriba a la derecha **una barca**, abajo a la izquierda **un ombú** y abajo a la derecha **la garita de la Fortaleza**.
> - **Los lados:** una ola y una soga trenzada que se alternan. El tramo del medio de cada lado (de 160 a 864 px) se tiene que poder repetir sin costura, y el lado de arriba igual al de abajo, el de la izquierda igual al de la derecha.
> - En el juego la banda se ve de unos 22 px de grueso: el tallado de formas grandes y claras, con buen relieve.
>
> **4. `colores.json`:** `{ "pano": "#…", "panoOscuro": "#…", "madera": "#…", "maderaClara": "#…" }`, como en las otras.
>
> Entregá un zip `Rocha-mesa.zip` con una carpeta `rocha/` y adentro los cuatro archivos, más una `muestra.jpg` de 1280 × 800: la mesa armada (el paño repetido, el bordado al centro al 55 % y el marco alrededor de unos 22 px de grueso), con tres cartas españolas de papel claro encima.

## Cuando llegue

- **En el catálogo:** `mesa:rocha` pasa a ser esta. La de antes queda con otro id, como la de Cabo Polonio. El que ya tenía la mesa de Rocha (porque completó la Rocha de antes) se queda con la nueva.
- **Premios:** cada barrio da su mesa al completarlo, y el último barrio da la baraja Costa y la mesa de Rocha.
