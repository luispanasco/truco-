# App Truco Uruguayo — Especificación y prompts

Sep 30, 2026 · @Nami

## Visión

Una app de truco uruguayo que juegue bien las reglas reales (muestra, piezas y flor incluidas) y que se sienta como una mesa de verdad: señas, cantos, chat y, más adelante, mentiras. Las apps actuales no convencen; esta compite en tres frentes:

- **Reglas exactas.** Un motor probado con tests para cada caso raro, no una aproximación.
- **Bots creíbles.** Que canten, mientan, desconfíen y tengan niveles, en vez de jugar perfecto y aburrido.
- **Lo social.** Señas entre compañeros, chat, voz, avatares y cosméticos que dan ganas de volver.

Este documento es la base para construirla: define reglas, arquitectura y fases, y termina con los prompts listos para usar en cada fase.

## Decisiones cerradas

La base está definida: PWA en TypeScript, bots y online desde el inicio, mesas de 1v1 a 3v3, siempre con flor.

| Tema | Decisión | Fase |
| --- | --- | --- |
| Plataforma | Web app instalable (PWA); tiendas más adelante con Capacitor | 1 |
| Modos | Contra bots y online contra personas, mezclables en la misma mesa | 1 |
| Mesas | 1v1, 2v2 y 3v3 (con pica-pica en 3v3) | 1 |
| Flor | Siempre con flor | 1 |
| Cartas | Baraja española de estética clásica, SVG propio o set con licencia libre | 1 |
| Acceso online | Invitados con salas por link o código | 1 |
| Cuentas | Login, ranking y amigos | 2 |
| Avatares | Básicos gratis en fase 1; cosméticos con monedas en fase 2 | 1–2 |
| Chat de texto | General en todas las salas; libre en salas privadas | 1 |
| Chat de voz | WebRTC, solo en salas privadas por defecto | 2 |
| Truco sucio | Mentir en envido y flor; el motor lo soporta desde fase 1, se activa en fase 3 | 3 |
| Idioma | Español rioplatense, cantos con voz | 1 |

## Reglas del truco uruguayo (motor)

El motor implementa estas reglas como default; las que varían entre mesas están en la sección siguiente como parámetros de sala.

### Baraja y reparto

- Baraja española de 40 cartas: 1 al 7, 10, 11 y 12 de espadas, bastos, oros y copas.
- Se reparten 3 cartas a cada jugador y se da vuelta una carta del mazo: la **muestra**. El juego gira en sentido antihorario; es mano el jugador a la derecha del que reparte, y el reparto rota cada mano.

### Piezas

Las piezas son cartas del palo de la muestra: 2, 4, 5, 11 (perico) y 10 (perica), en ese orden. Si la muestra es una de ellas, el 12 de ese palo ocupa su lugar con su misma jerarquía y valor de envido.

### Jerarquía para ganar vueltas

| Orden | Carta | Envido |
| --- | --- | --- |
| 1 | 2 de la muestra | 30 |
| 2 | 4 de la muestra | 29 |
| 3 | 5 de la muestra | 28 |
| 4 | 11 de la muestra (perico) | 27 |
| 5 | 10 de la muestra (perica) | 27 |
| 6 | 1 de espadas | 1 |
| 7 | 1 de bastos | 1 |
| 8 | 7 de espadas | 7 |
| 9 | 7 de oros | 7 |
| 10 | Los 3 | 3 |
| 11 | Los 2 que no son pieza | 2 |
| 12 | 1 de copas y 1 de oros | 1 |
| 13 | Los 12 | 0 |
| 14 | Los 11 que no son pieza | 0 |
| 15 | Los 10 que no son pieza | 0 |
| 16 | 7 de copas y 7 de bastos | 7 |
| 17 | Los 6 | 6 |
| 18 | Los 5 que no son pieza | 5 |
| 19 | Los 4 que no son pieza | 4 |

Dos cartas de igual orden empatan la vuelta (parda).

### Vueltas y pardas

1. Cada mano tiene hasta 3 vueltas; gana el equipo que gana 2.
2. Si la primera es parda, define la segunda; si también es parda, define la tercera.
3. Si la primera tiene ganador y la segunda es parda, gana quien ganó la primera.
4. Si todas son pardas, gana el equipo del mano.
5. Empieza cada vuelta quien ganó la anterior.
6. Un jugador puede irse al mazo: su equipo pierde la mano y el rival cobra lo que valga el truco en ese momento (1 si no se cantó).

### Truco

- Sin cantos la mano vale 1. Truco 2, retruco 3, vale cuatro 4.
- Solo sube el equipo que aceptó el último canto. Respuestas: quiero, no quiero o subir.
- No querer entrega el valor del canto anterior (1, 2 o 3).

### Envido

- Se canta durante la primera vuelta, antes de que el que canta juegue su carta. Si se canta truco primero, el rival puede responder "primero está el envido".
- Dos cartas del mismo palo: 20 más la suma de sus valores. Sin par del mismo palo: el valor de la carta más alta.
- Con una pieza: valor de la pieza (tabla) más la carta más alta de las otras, de cualquier palo. Máximo posible: 37.
- Cantos: envido 2, real envido 3, falta envido; se encadenan y suman. No querer da 1 punto, o lo acumulado antes del último canto.
- Declaración: empieza el mano; cada uno dice un tanto mayor o "son buenas". Empate de tantos: gana el mano.

### Flor

- Hay flor con tres cartas del mismo palo. Las piezas funcionan como comodín: una pieza más dos cartas del mismo palo, dos piezas más cualquier carta, o tres piezas.
- Cuando alguien tiene flor, el envido queda anulado en esa mano.
- La flor vale 3 puntos; se sube con contraflor y contraflor al resto.
- Si varios jugadores del mismo equipo tienen flor, cada flor suma 3.
- Si los dos equipos tienen flor y nadie canta contraflor, al final de la mano se comparan las flores y suma 3 en total el equipo con la de mayor valor, sin importar cuántas flores tenga.
- Si se canta contraflor y el rival no la quiere, el equipo que la cantó se queda con los 3.

### Puntaje

- Partido a 30: malas (0 a 15) y buenas (16 a 30).
- Falta envido: los puntos que le faltan al equipo que va ganando para llegar a 30.

### 3v3 y pica-pica

Mientras los dos equipos están en malas, cada jugador enfrenta al rival de adelante en tres duelos individuales, y los puntos se suman por equipo. El reparto es uno solo, como en una mano normal de 3v3 (3 cartas a cada uno y una muestra). Los duelos se juegan en serie, no en paralelo: los que juegan después ven las cartas de los duelos anteriores, y esa es parte de la gracia. Abre el duelo del mano contra su rival de enfrente y siguen las otras parejas en sentido antihorario. Cada duelo es una mano 1v1 completa, con su propio truco, envido y flor. Cuando un equipo entra en buenas se vuelve a jugar redondo. Activado por defecto y desactivable al crear la sala.

## Reglas configurables

Estas son las reglas donde las mesas difieren. Cada una va al motor como parámetro de sala con el default confirmado, así cambiarla no obliga a reescribir código.

| Tema | Default confirmado | Alternativa |
| --- | --- | --- |
| Cuenta de la flor con piezas | Pieza más alta con su valor completo, más el último dígito de las otras piezas, más el valor de las cartas comunes | Otra convención de mesa |
| Cuenta de la flor sin piezas | 20 más la suma de las tres cartas | — |
| Valor de contraflor | Contraflor 6; contraflor al resto, lo que falta para ganar | Contraflor 4 o 5 |
| Falta envido con ambos en malas | Siempre lo que le falta al que va ganando | Gana el partido |
| Tramo del pica-pica en 3v3 | Solo en malas: mientras los dos equipos tienen entre 0 y 15; cuando uno llega a 16, se vuelve a redondo | Otro tramo |
| Obligación de cantar la flor | Obligatoria en la primera vuelta; si no se canta, se pierde | Opcional |
| Envido envido | Permitido (2 + 2), y se puede seguir con real envido o falta envido | No permitido |
| No querer el envido | Lo acumulado antes del último canto (1 si era el primero) | — |
| Quién empieza tras una parda | El que empezó la vuelta empatada | El mano |
| Irse al mazo con envido pendiente | El rival también cobra el envido no querido | Solo cobra el truco |

## Arquitectura técnica

Todo en TypeScript, en un monorepo donde el motor de reglas es un paquete puro que usan por igual el servidor, los bots y los tests.

| Paquete | Rol | Tecnología |
| --- | --- | --- |
| `packages/engine` | Reglas completas, sin UI ni red | TypeScript puro, Vitest, fast-check |
| `packages/bots` | Jugadores automáticos por nivel | TypeScript, usa solo la vista del jugador |
| `packages/shared` | Tipos de mensajes cliente-servidor | TypeScript |
| `apps/server` | Salas, validación de jugadas, chat | Node + Colyseus |
| `apps/web` | Interfaz instalable | React + Vite + vite-plugin-pwa |

### Principios del motor

- Estado inmutable y una sola función de transición: `apply(estado, acción)` devuelve el nuevo estado y los eventos. Una acción inválida se rechaza con un motivo.
- Mezcla con semilla: una partida se reproduce entera con la semilla más la lista de acciones. Sirve para tests, repeticiones y revisar reclamos.
- `vistaPara(estado, jugador)` devuelve solo lo que ese jugador puede ver. El servidor manda únicamente esa vista.
- Todas las reglas de la sección "Reglas configurables" entran como parámetros de configuración de la sala.
- El tanto declarado y el tanto real son campos separados desde el día uno (ver Modo sucio).

### Seguridad

- El servidor es la única autoridad: mezcla, reparte, valida y cuenta. El cliente solo envía intenciones.
- Nunca viajan al navegador cartas ajenas, señas del otro equipo ni el mazo.
- Los bots juegan con la misma vista filtrada que un humano, así no hacen trampa.
- Límite de acciones y mensajes por segundo por jugador.

### Persistencia y hosting

- Fase 1: salas en memoria y un registro de partidas en disco o base simple.
- Fase 2: PostgreSQL (por ejemplo Supabase) para cuentas, monedas, inventario y ranking.
- Web estática en Cloudflare Pages o Vercel; servidor de juego en un VPS o Fly.io, cerca de Uruguay para baja latencia.

## Modos de juego

Toda partida es una sala del servidor con 2, 4 o 6 lugares; cada lugar lo ocupa un humano o un bot, así que jugar solo contra bots y mezclar humanos con bots usan el mismo camino.

### Bots

| Nivel | Comportamiento |
| --- | --- |
| Fácil | Juega la carta que gana la vuelta si puede; canta solo con juego claro; casi nunca sube |
| Medio | Estima la fuerza de su mano, canta y sube con criterio, a veces va de farol |
| Difícil | Cuenta cartas jugadas, deduce del envido declarado, miente con frecuencia calibrada, hace y lee señas del compañero |

- Tienen un pequeño retraso aleatorio antes de jugar, para que no se sientan instantáneos.
- Usan los cantos con voz igual que un humano.
- El nivel difícil queda preparado para mentir en envido y flor cuando se active el modo sucio.

### Online con invitados

- El invitado elige un apodo y un avatar básico; recibe un ID guardado en el navegador, que en fase 2 se vincula a una cuenta.
- Se crea una sala privada y se comparte por link o por código corto de 5 caracteres.
- El creador configura la sala: formato, bots en lugares vacíos, pica-pica y ayudas para principiantes.
- Fase 1 también puede incluir una cola pública simple para 1v1 con desconocidos.

### Turnos y desconexiones

- Cada turno tiene un límite de 30 segundos; al vencer, juega un bot por ese jugador.
- Si alguien se desconecta, un bot lo reemplaza hasta que vuelve con el mismo ID.
- Si nadie humano queda en la sala, la sala se cierra después de 2 minutos.

### Ayudas para principiantes

Resaltar piezas y matas, mostrar el tanto de envido y avisar si hay flor. Se activan por sala; en salas públicas quedan apagadas.

## Social: señas, chat y voz

Las señas son parte del juego y van en fase 1; el chat de texto también, y la voz llega en fase 2.

### Señas

- Panel de señas tradicionales, cada una asociada a una carta: guiñar, levantar cejas, morder el labio, inflar cachetes, etc. La lista exacta y su significado se definen en la fase 1.
- Se muestran como animación en el avatar del que la hace, y solo las recibe su compañero. El servidor nunca se las manda al equipo rival.
- Los bots hacen señas según su mano y las leen para decidir.

### Chat de texto

| Tipo de sala | Chat general | Chat de equipo |
| --- | --- | --- |
| Privada (entre amigos) | Sí | Sí, libre |
| Pública (desconocidos) | Sí | No, para evitar pasarse las cartas |

- Frases rápidas de un toque ("¡Quiero!", "¡Me voy al mazo!", "Buena mano").
- Moderación mínima: filtro de palabras, límite de mensajes por segundo, silenciar a un jugador y reportar.

### Chat de voz (fase 2)

- WebRTC con conexión directa entre jugadores, más un servidor TURN (por ejemplo coturn) para redes restrictivas. Si crece, migrar a LiveKit.
- Habilitado por defecto solo en salas privadas; en públicas, desactivado.
- Controles: mute propio, mute a otro jugador y push-to-talk. Indicador visual de quién habla sobre el avatar.

### Cantos con voz

Cada canto (truco, retruco, envido, flor, quiero, no quiero, son buenas) tiene audio en voz rioplatense y un globo de texto. Los packs de voces alternativas son un cosmético de fase 2.

## Avatares, monedas y cosméticos

En fase 1 hay avatares básicos gratis; las monedas y la tienda llegan en fase 2 junto con las cuentas, para que nadie pierda lo que ganó al borrar el navegador.

### Avatar

SVG por capas: cara, tono de piel, pelo, ojos, boca, ropa, sombrero y accesorio. Cada capa es una pieza intercambiable, y las animaciones de señas se aplican sobre la cara.

### Cosméticos

| Categoría | Ejemplos |
| --- | --- |
| Avatar | Ropa, sombreros, accesorios, peinados |
| Dorso de cartas | Clásico, celeste, con colores futboleros (sin escudos, que tienen dueño), estacionales |
| Paño de mesa | Verde clásico, madera de boliche, parrillero |
| Voces de cantos | Paisano, montevideano, relator de fútbol |
| Señas | Estilos de animación alternativos |
| Marcos y emotes | Marco del avatar, reacciones rápidas |

### Economía

- Se ganan monedas por partida terminada, un extra por ganarla y un bonus diario por la primera partida.
- Contra bots se gana menos, para que no se pueda juntar monedas en automático. Abandonar una partida no da nada.
- Los montos exactos se ajustan en fase 2 con datos reales de uso.
- Queda abierto si más adelante se venden monedas con dinero real.

### Datos

- Saldo e inventario viven solo en el servidor; el cliente nunca decide cuántas monedas hay.
- Cada movimiento de monedas es un registro inmutable (ganancia, compra, ajuste) y el saldo se calcula a partir de ese historial.
- El catálogo de cosméticos es configuración del servidor, así se agregan ítems sin publicar una versión nueva de la app.

## Modo sucio

El modo sucio se activa en fase 3, pero el motor lo soporta desde la fase 1: activarlo es prender una opción de sala, no reescribir reglas.

### Qué se puede hacer

- Declarar un tanto de envido distinto al real.
- Cantar flor sin tenerla, o no cantarla teniéndola.
- Si el rival no pide ver los tantos al final de la mano, la mentira pasa.

### Cómo lo soporta el motor desde el día uno

- Cada jugador tiene dos campos separados: `tantoReal` (calculado por el motor) y `tantoDeclarado` (lo que dijo). Lo mismo para la flor.
- En modo normal el motor exige que ambos coincidan; la interfaz solo ofrece el valor real.
- Al final de cada mano existe una fase de verificación. En modo normal se resuelve sola; en modo sucio el equipo rival tiene 10 segundos para pedir ver los tantos.
- Hasta esa fase, el servidor no revela el tanto real a nadie.
- El registro de la partida guarda ambos valores, para repeticiones y reclamos.

### Si piden ver y hubo mentira

Default propuesto: los puntos en juego del envido o la flor pasan al equipo rival. Es un parámetro de sala, así se puede agregar una penalidad extra si las mesas lo juegan así.

### Bots en modo sucio

El bot difícil miente con una frecuencia calibrada y decide cuándo pedir ver, cruzando el tanto declarado con las cartas que ya se jugaron.

## Hoja de ruta

Tres fases en orden; cada una se cierra con un criterio antes de empezar la siguiente.

&#91;embedded content: hoja de ruta · 3 fases, 2 criterios de paso\]

Dentro de la fase 1, las etapas 1A a 1E van en orden y cada prompt trae su propio criterio: el motor no avanza sin todos sus tests en verde, y los bots no avanzan sin cumplir los porcentajes de victoria.

## Prompts por fase

Usá el prompt base al inicio de cada sesión, adjuntando este documento exportado a Markdown, y después el prompt de la etapa. No pases a la siguiente etapa hasta que la actual cumpla sus criterios.

### Prompt base

```text
Sos un desarrollador senior de juegos multijugador en TypeScript. Vamos a construir una app de truco uruguayo siguiendo la especificación adjunta (spec.md).

Reglas de trabajo:
- La especificación manda. Si algo no está definido o es ambiguo, preguntame antes de inventar.
- Trabajamos por etapas. No adelantes funcionalidades de etapas futuras, pero no tomes decisiones que las bloqueen.
- TypeScript estricto. Nombres del dominio en español (muestra, pieza, envido, vuelta, mano).
- Cada entrega incluye tests y un resumen de qué quedó hecho, qué falta y qué decisiones tomaste.
```

### Etapa 1A: motor de reglas

```text
Etapa 1A: motor de reglas. Armá el monorepo con pnpm workspaces y el paquete packages/engine según la sección "Arquitectura técnica".

Implementá:
- Modelo: Carta, Palo, Jugador, Equipo, EstadoPartida, Accion, Evento, ConfigSala.
- Función pura apply(estado, accion) que devuelve el nuevo estado y los eventos, o un error con motivo si la acción es inválida.
- Mezcla con semilla (PRNG determinístico) y vistaPara(estado, jugadorId).
- ConfigSala con todos los parámetros de "Reglas configurables", con sus defaults.
- Todas las reglas de la sección "Reglas del truco uruguayo": reparto y muestra, piezas y reemplazo por el 12, jerarquía, vueltas y pardas, irse al mazo, truco, envido, flor, puntaje a 30, formatos 1v1, 2v2 y 3v3 con pica-pica.
- Campos tantoReal y tantoDeclarado separados, y fase de verificación al final de cada mano (automática en modo normal), según la sección "Modo sucio".

Tests obligatorios:
- Jerarquía completa para las 4 muestras posibles, incluido el caso en que la muestra es una pieza.
- Envido y flor para todas las combinaciones con piezas; el envido máximo es 37.
- Todos los casos de pardas.
- Secuencias de cantos válidas e inválidas (quién puede subir, qué pasa al no querer).
- Propiedades con fast-check: una partida con la misma semilla y acciones se reproduce idéntica; ninguna vista contiene cartas ajenas no jugadas; el puntaje nunca baja.

No hagas interfaz ni servidor. Entregá un CLI mínimo para jugar una mano en la terminal.
```

### Etapa 1B: bots

```text
Etapa 1B: bots. Creá packages/bots con la interfaz Bot { decidir(vista, config): Accion }.

- Tres niveles según la sección "Modos de juego > Bots".
- Los bots reciben solo vistaPara del jugador; nunca el estado completo.
- Hacen y leen señas del compañero.
- El nivel difícil queda preparado para mentir y pedir ver tantos, desactivado hasta la etapa 3.

Agregá un simulador que corra N partidas bot contra bot y reporte porcentaje de victorias. Criterio: en 1000 partidas, el difícil le gana al medio más del 60% y el medio al fácil más del 65%.
```

### Etapa 1C: servidor

```text
Etapa 1C: servidor. Creá apps/server con Node y Colyseus.

- Sala TrucoRoom con ConfigSala; cada lugar lo ocupa un humano o un bot.
- Salas privadas con código de 5 caracteres y link; cola pública simple para 1v1.
- El servidor valida toda acción con el motor y manda a cada cliente solo su vistaPara.
- Turnos de 30 segundos; al vencer juega un bot. Reconexión por ID de invitado, con bot de reemplazo mientras tanto. Cierre de sala tras 2 minutos sin humanos.
- Retraso aleatorio antes de las jugadas de bots.
- Chat general y de equipo según la tabla de la sección "Social"; filtro de palabras, límite de mensajes, silenciar y reportar.
- Señas enviadas solo al compañero.

Tests de integración con clientes simulados: partida completa 2v2 con dos humanos y dos bots, desconexión y reconexión, e intento de acción inválida.
```

### Etapa 1D: interfaz

```text
Etapa 1D: interfaz. Creá apps/web con React, Vite y vite-plugin-pwa. Diseño mobile-first en vertical.

- Pantallas: inicio (apodo y avatar básico), crear o unirse a sala, configuración de sala, mesa y fin de partida.
- Mesa: mano propia abajo, compañeros y rivales ubicados según el formato, muestra siempre visible, anotador de puntos con fósforos (malas y buenas).
- Botones de canto contextuales: solo aparecen los que el motor permite en ese momento.
- Animaciones de reparto, jugada y ganador de vuelta.
- Las 40 cartas en SVG propio con estética clásica de baraja española; dorso intercambiable.
- Ayudas para principiantes según la sección "Modos de juego".
- Modo sin conexión contra bots, corriendo el motor en el navegador.
```

### Etapa 1E: señas, avatares y cantos

```text
Etapa 1E: señas, avatares y cantos.

- Avatar SVG por capas según la sección "Avatares", con un set básico gratis.
- Panel de señas con animaciones sobre la cara del avatar; proponeme la lista de señas y su significado antes de implementarla.
- Cantos con audio en voz rioplatense y globo de texto; dejá la estructura lista para packs de voces.
- Frases rápidas de chat de un toque.
```

### Fase 2: cuentas, economía y voz

```text
Fase 2: cuentas, economía y voz.

- PostgreSQL. Login con Google y con link por email. Vinculación del ID de invitado existente a la cuenta nueva.
- Monedas con registro inmutable de movimientos, según la sección "Economía"; menos monedas contra bots y nada al abandonar.
- Tienda con catálogo configurable desde el servidor, inventario y cosméticos aplicados en la mesa.
- Ranking con Elo por formato y lista de amigos.
- Chat de voz con WebRTC y servidor TURN, solo en salas privadas por defecto, con mute, push-to-talk e indicador de quién habla.
```

### Fase 3: modo sucio

```text
Fase 3: modo sucio.

- Activar la opción de sala según la sección "Modo sucio".
- Interfaz para declarar cualquier tanto y para cantar o callar la flor.
- Botón "pedir ver" con ventana de 10 segundos al final de la mano y penalidad según ConfigSala.
- Activar en el bot difícil las mentiras y la decisión de pedir ver.
- Tests: mentira descubierta, mentira que pasa, flor falsa y flor callada.
```
