# Paños del modo historia

Hoy los 19 paños de los departamentos son un color liso con textura de fieltro. La idea es que cada uno tenga algo del departamento, sin que moleste para ver las cartas.

## Cómo se usa el paño en el juego

- **El paño (`pano.webp`, 1024 × 1024)** se repite en mosaico sobre toda la mesa, achicado a la mitad (cada repetición ocupa 512 px de pantalla). Encima va una viñeta oscura hacia los bordes. Así que tiene que empalmar sin costuras con sus copias de arriba, abajo y los costados.
- **Sobre el paño van:**
  - las cartas, de papel claro, con números y palos de colores;
  - los avatares de los jugadores, en los bordes;
  - globos de texto y fichas;
  - el mazo, en una esquina.
- **El centro de la mesa es donde se tiran las cartas.** Lo que haya ahí tiene que ser muy suave.
- **El emblema (nuevo, opcional):** un solo dibujo grande, centrado debajo de las cartas. El juego le baja la opacidad (entre un 8 y un 12 %), así que lo entregan en un solo color claro, sobre fondo transparente.

## Prompt para el agente

> Vamos a rehacer los paños de mesa de los 19 departamentos del Truco Uruguayo. Hoy son un color liso con textura de fieltro: queremos que cada uno tenga algo de su departamento, pero sin que moleste para ver las cartas.
>
> Por cada departamento entregá dos archivos:
>
> **1. `pano.webp`: el paño, 1024 × 1024 px, que se repite en mosaico sin costuras.**
> - El mismo color base y la misma textura de fieltro que el paño que ya tiene ese departamento (no cambies el color: el resto de la mesa está armado con él).
> - Encima, motivos del departamento **tono sobre tono**, como un estampado de tela o un damasco: del mismo color que el fondo, apenas más claros o más oscuros. La diferencia de luminosidad entre el fondo y los motivos no pasa de 8 puntos (en una escala de 0 a 100). Tiene que verse de cerca y casi desaparecer de lejos.
> - Entre 8 y 12 motivos por cuadro, chicos (de 60 a 120 px cada uno), repartidos parejo, sin amontonarse en ningún lado y sin dejar huecos grandes.
> - Formas simples y reconocibles, de líneas suaves: siluetas o grabado fino. Nada de detalle chiquito ni de bordes duros.
> - Sin letras, sin números, sin caras, sin blanco puro, sin colores saturados y nada que se parezca a una carta o a los palos (monedas, copas, espadas o bastos).
> - Que empalme perfecto en los cuatro bordes: un motivo que se corta en un borde sigue del otro lado.
>
> **2. `emblema.png`: el emblema del departamento, 1024 × 1024 px, con fondo transparente.**
> - Un solo dibujo grande y centrado, que ocupe entre el 70 y el 80 % del cuadro.
> - En **un solo color plano, blanco crema (#F4EBD8)**, como un sello o una silueta grabada: sin sombras, sin degradés y sin detalles finos (el juego lo pone muy transparente y chiquito, abajo de las cartas).
> - Sin letras ni números.
>
> Ideas de motivos y emblema para cada departamento (podés cambiarlos si encontrás algo más representativo, mientras se reconozca):
>
> | Departamento | Motivos del paño | Emblema |
> |---|---|---|
> | Artigas | geodas de amatista, Piedra Pintada, plumas y tambores de carnaval | una geoda de amatista abierta |
> | Canelones | racimos de uva y hojas de parra, copas de vino | un racimo de uva con su hoja |
> | Cerro Largo | espigas de arroz, el puente de arcos de Río Branco, juncos de la laguna Merín | una espiga de arroz |
> | Colonia | el faro de Colonia, faroles, adoquines, hormas de queso | el faro de Colonia del Sacramento |
> | Durazno | duraznos con hojas, guitarras, el río Yí | un durazno con su hoja |
> | Flores | columnas de piedra de las Grutas del Palacio, flores silvestres | las columnas de las Grutas del Palacio |
> | Florida | la Piedra Alta, tarros de leche, el Cerro Colorado | la Piedra Alta |
> | Lavalleja | sierras, la cascada del Salto del Penitente, el Cerro Arequita | sierras con una cascada |
> | Maldonado | los dedos de La Brava, el faro de José Ignacio, olas, lobos marinos | los dedos de La Brava |
> | Montevideo | el Palacio Salvo, tambores de candombe, la rambla, el Cerro | el Palacio Salvo |
> | Paysandú | espigas de cebada y lúpulo, el puente General Artigas, la Meseta de Artigas | una espiga de cebada con lúpulo |
> | Río Negro | girasoles, la chimenea del Anglo, garzas de los Esteros de Farrapos | un girasol |
> | Rivera | el Cerro del Marco, palmeras del Valle del Lunarejo, el hito de frontera | el Cerro del Marco |
> | Rocha | faros, olas, lobos marinos, palmeras de butiá, la Fortaleza de Santa Teresa | el faro de Cabo Polonio |
> | Salto | naranjas con hojas, vapor de las termas, la represa de Salto Grande | una naranja con hojas |
> | San José | las piedras de las Sierras de Mahoma, las barrancas de Kiyú | las piedras de Mahoma |
> | Soriano | espigas de trigo, girasoles, el río Negro | una espiga de trigo |
> | Tacuarembó | sombreros de ala, guitarras criollas, mates | una guitarra criolla |
> | Treinta y Tres | bombos, la Quebrada de los Cuervos, el río Olimar | un bombo |
>
> Entregá un zip con una carpeta por departamento, con el mismo nombre que ya tienen (`artigas/`, `cerro-largo/`, `rocha/`, …) y adentro `pano.webp` y `emblema.png`. Sumá una hoja de muestra por departamento (`muestra.jpg`) con el paño repetido 2 × 2 y el emblema encima al 10 %, para revisarlo de un vistazo.

## Cuando llegue el zip

- **Script:** el de los departamentos (`scripts/departamentos.py`) copia el paño nuevo y el emblema, y suma el emblema al CSS de cada mesa: centrado, a un 55 % del ancho de la mesa y con una opacidad del 10 %.
- **Revisión en la mesa:** antes de cargarlo, miro cada paño con una partida de 3 contra 3. Las cartas, los números y los globos tienen que leerse igual que con el paño liso.
