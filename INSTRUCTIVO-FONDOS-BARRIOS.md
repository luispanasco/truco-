# Fondos de los barrios de Rocha (modo historia)

En el modo historia, Rocha se divide en barrios y cada barrio tiene sus niveles, cada uno en un lugar real. Hacen falta las ilustraciones de fondo de **31 niveles en 6 barrios**. En esta carpeta va todo lo necesario: una subcarpeta por nivel con la foto de la que se parte, un ejemplo del estilo y la lista de abajo con lo que tiene que verse en cada uno.

## Qué hay en la carpeta

- `estilo/ejemplo-horizontal.webp` y `estilo/ejemplo-vertical.webp`: uno de los fondos que ya están en el juego (el faro de La Paloma). **Es el estilo a seguir.**
- `<barrio>/nivel-<n>-<lugar>/`: una carpeta por nivel, con una sola foto:
  - `foto-commons.jpg`: foto de Wikimedia Commons con licencia libre;
  - `foto-referencia.jpg`: foto de Turismo Rocha, que tiene derechos.
- `niveles.json`: lo mismo que la lista de abajo, en datos.

## Cómo se usan los fondos en el juego

- Van detrás de la presentación del nivel, de la partida (oscurecidos, con la mesa y las cartas encima) y del mapa del barrio.
- Hay dos versiones de cada uno: la **horizontal** para computadoras y celulares de costado, y la **vertical** para el celular parado. La vertical se compone aparte, a partir de la misma escena (no es un recorte de la horizontal).
- En la partida el centro queda tapado por la mesa: lo que identifica el lugar (el faro, el barco, la estatua) conviene que quede en el tercio de arriba o hacia un costado, no justo en el medio.

## Estilo

- El mismo que el ejemplo: ilustración pintada, de luz cálida, con la arquitectura y el paisaje reconocibles, basados en el lugar real.
- Cada lugar tiene que reconocerse por quien lo conoce: la forma del faro, los colores de las barcas, la silueta de la fortaleza.
- La luz puede cambiar según lo que pide la escena (atardecer, noche, temporal). En cada barrio, el último nivel es el final: que sea el más épico.
- **Nada de:** letras o carteles legibles, marcas, logos, marcas de agua, caras de personas reconocibles. La gente, si aparece, chica y de lejos.

## Las fotos: cuánto se puede seguir cada una

- **`foto-commons.jpg`:** se puede seguir de cerca. Casi todas tienen licencia CC BY o CC BY-SA, así que la ilustración lleva el crédito del autor (va en los créditos, ya está en la lista). Con CC BY-SA, si la ilustración es una adaptación directa de la foto, sale con la misma licencia.
- **`foto-referencia.jpg`:** tiene derechos de autor. **Solo sirve para saber cómo es el lugar.** La ilustración tiene que recrearlo, no calcar la foto: cambiá el encuadre, el ángulo, la luz o la composición. La foto no se publica ni se incluye en la entrega.

## Qué entregar

Un zip **`Rocha-barrios-fondos.zip`** con la misma estructura de carpetas de barrio, y en cada una:

- `nivel-<n>-horizontal.webp`: **1920 × 1080 px**;
- `nivel-<n>-vertical.webp`: **1080 × 1920 px**;
- un `CREDITOS.md` por barrio, con una fila por nivel: el lugar, si partió de la foto de Commons (autor y licencia) o de la referencia (su URL), y una línea que diga que es una ilustración generada.

WebP con calidad entre 80 y 85, de 150 a 450 KB cada uno.

Ejemplo: `la-paloma/nivel-1-horizontal.webp`, `la-paloma/nivel-1-vertical.webp`, `la-paloma/CREDITOS.md`.

## Los niveles

### Punta del Diablo (`punta-del-diablo/`, 4 niveles)

**Nivel 1: Playa de los Pescadores**
- Escena: Las barcas de pesca rojas y blancas varadas en la arena, el mar calmo y la punta de rocas; luz de atardecer.
- Foto: `punta-del-diablo/nivel-1-playa-de-los-pescadores/foto-commons.jpg`, Commons, rodoluca, CC BY-SA 3.0 (https://commons.wikimedia.org/wiki/File:Barcas_en_la_playa_de_Punta_del_Diablo%2C_Rocha%2C_Uruguay_-_panoramio.jpg)

**Nivel 2: Playa del Rivero y Mirador Pez**
- Escena: Bahía chica con rocas grandes y olas suaves; se puede sumar el mirador de madera con forma de pez sobre la playa.
- Foto: `punta-del-diablo/nivel-2-playa-del-rivero/foto-commons.jpg`, Commons, Mariana Zorrilla, CC BY-SA 3.0 (https://commons.wikimedia.org/wiki/File:Playa_del_Rivero.jpg)

**Nivel 3: Playa de la Viuda y Faro de Punta Palmar**
- Escena: Olas fuertes entre rocas y, al fondo, el faro a rayas rojas y blancas con la casa al lado.
- Foto: `punta-del-diablo/nivel-3-playa-de-la-viuda/foto-commons.jpg`, Commons, Elcolorin123, CC BY-SA 3.0 (https://commons.wikimedia.org/wiki/File:Punta_del_Diablo_07.JPG)

**Nivel 4: Monumento a Artigas**
- Escena: La estatua de Artigas sobre las rocas de la punta, con el mar rompiendo y la luz de navegación arriba. Sin texto legible en la placa.
- Foto: `punta-del-diablo/nivel-4-monumento-a-artigas/foto-commons.jpg`, Commons, Agustina Morel, CC BY-SA 3.0 (https://commons.wikimedia.org/wiki/File:Artigas_Pta._del_Diablo.JPG)

### La Paloma (`la-paloma/`, 6 niveles)

**Nivel 1: Playa del Faro**
- Escena: El faro blanco con la cúpula roja visto desde la orilla, rocas y piletas naturales, y las ruinas de piedra del primer faro; atardecer naranja.
- Foto: `la-paloma/nivel-1-playa-del-faro/foto-referencia.jpg`, referencia de Turismo Rocha (https://s3.amazonaws.com/turismorocha/atractivos/110/cover/playa-del-faro-064806200-1513364293.jpg)

**Nivel 2: Playa Los Botes**
- Escena: El Cristo de Lucho de piedra, de espaldas mirando al mar, y botes de pesca rojos y blancos en la arena.
- Foto: `la-paloma/nivel-2-playa-los-botes/foto-referencia.jpg`, referencia de Turismo Rocha (https://s3.amazonaws.com/turismorocha/atractivos/102/med/cristo-de-lucho-027613500-1507237793.jpg)

**Nivel 3: Puerto de La Paloma**
- Escena: El muelle de madera del puerto con veleros y lanchas amarrados, en perspectiva hacia el fondo.
- Foto: `la-paloma/nivel-3-puerto/foto-referencia.jpg`, referencia de Turismo Rocha (https://s3.amazonaws.com/turismorocha/destinos/2/med/la-paloma-084122000-1670936441.jpeg)

**Nivel 4: Laguna de Rocha**
- Escena: Agua quieta con botes de pescadores en la orilla; se pueden sumar flamencos y cisnes de cuello negro a lo lejos.
- Foto: `la-paloma/nivel-4-laguna-de-rocha/foto-commons.jpg`, Commons, ILIVIGNOLI, CC BY-SA 4.0 (https://commons.wikimedia.org/wiki/File:LAGUNA_DE_ROCHA%2C_BOTES_PESCADORES.JPG)

**Nivel 5: Faro del Cabo Santa María**
- Escena: El faro completo con su edificio de base, sobre la punta. Ojo: ya hay una ilustración de este faro (nivel 2 actual, ver estilo); que esta sea distinta, por ejemplo de noche o desde otro ángulo.
- Foto: `la-paloma/nivel-5-faro-cabo-santa-maria/foto-commons.jpg`, Commons, Igna, CC BY-SA 4.0 (https://commons.wikimedia.org/wiki/File:Faro_de_Cabo_de_Santa_Mar%C3%ADa%2C_La_Paloma%2C_Rocha%2C_Uruguay.jpg)

**Nivel 6: Playa La Balconada**
- Escena: La curva de la playa al atardecer, con el faro de remate sobre la punta rocosa. Es el final: el sol bajando sobre el mar.
- Foto: `la-paloma/nivel-6-la-balconada/foto-referencia.jpg`, referencia de Turismo Rocha (https://s3.amazonaws.com/turismorocha/atractivos/20/med/playa-la-balconada-059923000-1453852085.jpg)

### Cabo Polonio (`cabo-polonio/`, 6 niveles)

**Nivel 1: Puerta del Polonio**
- Escena: Un camión todo terreno de caja alta, con turistas subiendo, listo para cruzar las dunas.
- Foto: `cabo-polonio/nivel-1-puerta-del-polonio/foto-referencia.jpg`, referencia de Turismo Rocha (https://s3.amazonaws.com/turismorocha/destinos/5/med/cabo-polonio-092604700-1470849252.JPG)

**Nivel 2: Playa La Calavera**
- Escena: La playa ancha con barcas de pesca sobre la arena, el faro y el pueblo de ranchos al fondo.
- Foto: `cabo-polonio/nivel-2-playa-la-calavera/foto-commons.jpg`, Commons, Luciacasanovascasso, CC BY-SA 3.0 (https://commons.wikimedia.org/wiki/File:Cabo_Polonio_-_Playa_de_la_Calavera.JPG)

**Nivel 3: Playa Sur**
- Escena: La bahía curva al atardecer, con el pueblo y las dunas atrás. La foto es chica: tomala solo como idea de luz.
- Foto: `cabo-polonio/nivel-3-playa-sur/foto-commons.jpg`, Commons, Rory Fernandez, CC BY-SA 3.0 (https://commons.wikimedia.org/wiki/File:Atardecer_al_Sur.jpg)

**Nivel 4: Dunas del Polonio**
- Escena: Dunas grandes y móviles con el mar y las islas en el horizonte, y alguna persona chiquita para dar la escala.
- Foto: `cabo-polonio/nivel-4-dunas/foto-commons.jpg`, Commons, Luciacasanovascasso, CC BY-SA 3.0 (https://commons.wikimedia.org/wiki/File:Dunas_de_Cabo_Polonio.JPG)

**Nivel 5: La lobería**
- Escena: Lobos marinos sobre las rocas rosadas al pie del faro, con el mar y las Islas de Torres detrás.
- Foto: `cabo-polonio/nivel-5-loberia/foto-referencia.jpg`, referencia de Turismo Rocha (https://s3.amazonaws.com/turismorocha/destinos/5/med/cabo-polonio-037623200-1470848917.JPG)

**Nivel 6: Faro de Cabo Polonio**
- Escena: La torre de ladrillo con la linterna y las construcciones blancas con arcos al pie. Es el final: de noche, con el haz de luz. Ojo: ya hay una ilustración de este faro (nivel 4 actual); que sea distinta.
- Foto: `cabo-polonio/nivel-6-faro/foto-referencia.jpg`, referencia de Turismo Rocha (https://s3.amazonaws.com/turismorocha/atractivos/13/med/faro-de-cabo-polonio-096842000-1453482725.jpg)

### La Pedrera (`la-pedrera/`, 4 niveles)

**Nivel 1: La rambla**
- Escena: La fila de postes blancos de la rambla con un banco y el mar abierto; en el horizonte, el lomo de una ballena.
- Foto: `la-pedrera/nivel-1-rambla/foto-referencia.jpg`, referencia de Turismo Rocha (https://s3.amazonaws.com/turismorocha/destinos/4/cover/la-pedrera-037143000-1453840012.jpg)

**Nivel 2: Playa El Desplayado**
- Escena: Bahía chica entre rocas con la playa abierta hacia el norte; de noche o al anochecer, con la luz del faro del Polonio a lo lejos.
- Foto: `la-pedrera/nivel-2-el-desplayado/foto-commons.jpg`, Commons, Elvis Boaventura, CC BY 3.0 (https://commons.wikimedia.org/wiki/File:La_Pedrera_-_panoramio_%281%29.jpg)

**Nivel 3: Playa del Barco y el Cathay VIII**
- Escena: La proa oxidada del pesquero encallado en la arena, olas grandes y las casas del pueblo atrás; atardecer.
- Foto: `la-pedrera/nivel-3-playa-del-barco/foto-referencia.jpg`, referencia de Turismo Rocha (https://s3.amazonaws.com/turismorocha/atractivos/83/med/playa-del-barco-093642800-1484183728.jpg)

**Nivel 4: Avenida principal (Carnaval)**
- Escena: La avenida con faroles y palmeras bajando al mar, en noche de carnaval: tambores, espuma, disfraces y gente.
- Foto: `la-pedrera/nivel-4-avenida-principal/foto-commons.jpg`, Commons, TitiNicola, CC BY-SA 4.0 (https://commons.wikimedia.org/wiki/File:Avenida_principal_-_La_Pedrera_-_Uruguay.jpg)

### Aguas Dulces, Valizas y Castillos (`aguas-dulces-valizas-castillos/`, 6 niveles)

**Nivel 1: La Terraza y la bajada central**
- Escena: La bajada principal al mar con bancos frente a la playa y los ranchos alrededor; atardecer. La foto trae una marca de agua: no la copies.
- Foto: `aguas-dulces-valizas-castillos/nivel-1-la-terraza/foto-commons.jpg`, Commons, Marcelo Campi, CC BY-SA 3.0 (https://commons.wikimedia.org/wiki/File:Aguas_Dulces_%28232903859%29.jpeg)

**Nivel 2: Los ranchos y palafitos**
- Escena: Ranchos de paja sobre pilotes a pocos metros del mar, con una cañada que baja a la playa; cielo de temporal.
- Foto: `aguas-dulces-valizas-castillos/nivel-2-ranchos-y-palafitos/foto-commons.jpg`, Commons, alvaro errandonea, CC BY 3.0 (https://commons.wikimedia.org/wiki/File:Rancho_y_arroyo_-_panoramio.jpg)

**Nivel 3: Los restos del vapor Arinos**
- Escena: Los restos negros del casco entre la espuma, frente a la playa; tormenta y niebla, con algo de misterio (la leyenda del oro).
- Foto: `aguas-dulces-valizas-castillos/nivel-3-restos-del-arinos/foto-referencia.jpg`, referencia de Turismo Rocha (https://s3.amazonaws.com/turismorocha/atractivos/78/cover/naufragio-arinos-037834000-1476042340.jpg)

**Nivel 4: Barra de Valizas y el arroyo**
- Escena: La curva del arroyo Valizas llegando al mar, con las dunas enormes al fondo y los ranchos del pueblo.
- Foto: `aguas-dulces-valizas-castillos/nivel-4-barra-de-valizas/foto-commons.jpg`, Commons, Tania Fernández Cenazzi, CC BY-SA 4.0 (https://commons.wikimedia.org/wiki/File:Arroyo_Valizas_y_dunas_del_Polonio.jpg)

**Nivel 5: Monte de Ombúes**
- Escena: Un ombú gigante con raíces y huecos a la orilla de la Laguna de Castillos; se puede sumar un bote en el agua.
- Foto: `aguas-dulces-valizas-castillos/nivel-5-monte-de-ombues/foto-commons.jpg`, Commons, Lisa Cyr, CC BY 2.0 (https://commons.wikimedia.org/wiki/File:Omb%C3%BA_Uruguay_2.jpg)

**Nivel 6: Cerro de la Buena Vista**
- Escena: La vista desde la cumbre de la duna: el arroyo serpenteando, el pueblo y el mar abajo. Es el final, al atardecer.
- Foto: `aguas-dulces-valizas-castillos/nivel-6-cerro-de-la-buena-vista/foto-referencia.jpg`, referencia de Turismo Rocha (https://s3.amazonaws.com/turismorocha/atractivos/14/cover/cerro-de-la-buena-vista-038067400-1453486450.jpg)

### Santa Teresa y Chuy (`santa-teresa-y-chuy/`, 5 niveles)

**Nivel 1: Avenida Brasil, Chuy**
- Escena: La avenida de la frontera con el cantero central y los free shops a los costados. Sin marcas ni carteles legibles.
- Foto: `santa-teresa-y-chuy/nivel-1-avenida-brasil/foto-commons.jpg`, Commons, Georgez, Dominio público (https://commons.wikimedia.org/wiki/File:Chu%C3%AD.JPG)

**Nivel 2: Barra del Chuy**
- Escena: El arroyo Chuy llegando al mar, con monte y barrancas; se puede sumar el muelle y la escultura de La Mano en la playa.
- Foto: `santa-teresa-y-chuy/nivel-2-barra-del-chuy/foto-commons.jpg`, Commons, Ibirapita1010bc, CC BY-SA 3.0 (https://commons.wikimedia.org/wiki/File:Arroyo_Chuy.JPG)

**Nivel 3: Parque Santa Teresa: Playa La Moza**
- Escena: El sendero con barandas de madera bajando entre la vegetación del parque hacia la playa, con luz de atardecer.
- Foto: `santa-teresa-y-chuy/nivel-3-playa-la-moza/foto-commons.jpg`, Commons, TitiNicola, CC BY-SA 4.0 (https://commons.wikimedia.org/wiki/File:Playa_La_Moza%2C_Santa_Teresa%2C_Rocha%2C_Uruguay.jpg)

**Nivel 4: Fuerte San Miguel**
- Escena: La muralla de piedra anaranjada con su garita de cúpula, palmeras y cielo con nubes.
- Foto: `santa-teresa-y-chuy/nivel-4-fuerte-san-miguel/foto-referencia.jpg`, referencia de Turismo Rocha (https://s3.amazonaws.com/turismorocha/atractivos/31/cover/fuerte-de-san-miguel-009944900-1494875307.jpg)

**Nivel 5: Fortaleza de Santa Teresa**
- Escena: Un baluarte con su garita contra el cielo. Es el gran final. Ojo: ya hay una ilustración de la fortaleza (nivel 5 actual); que sea distinta, por ejemplo al atardecer o con la rampa al portón.
- Foto: `santa-teresa-y-chuy/nivel-5-fortaleza-de-santa-teresa/foto-commons.jpg`, Commons, rodoluca, CC BY-SA 3.0 (https://commons.wikimedia.org/wiki/File:Fortaleza_de_Santa_Teresa%2C_PN_Santa_Teresa%2C_Rocha%2C_Uruguay_-_panoramio.jpg)

## Pendiente

- **Playa Grande** (Parque Santa Teresa) está en duda: si se suma a Santa Teresa y Chuy, va aparte.
- **Laguna Negra** (Santa Teresa y Chuy) no está en la lista porque va con la foto real de Commons, sin ilustrar.
