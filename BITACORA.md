# Bitácora del proyecto

Registro de cada etapa del proyecto: qué se hizo, qué se decidió y qué quedó pendiente. La especificación completa está en [App Truco Uruguayo — Especificación y prompts.md](App%20Truco%20Uruguayo%20—%20Especificación%20y%20prompts.md).

Cada etapa se revisa antes de arrancar: primero se presenta el plan, se aprueba y recién después se programa.

## Estado general

| Etapa | Contenido | Estado | Cierre | Commit |
| --- | --- | --- | --- | --- |
| Reglas | Confirmación de las reglas configurables | Hecha | 2026-09-30 | — |
| 1A | Motor de reglas | Hecha | 2026-09-30 | `55961aa` |
| 1B | Bots | Hecha | 2026-09-30 | `117d29d` |
| 1C | Servidor | Hecha | 2026-09-30 | `039be94` |
| 1D | Interfaz | En curso (D1, D2 y D3 hechos) | — | — |
| 1E | Señas, avatares y cantos | Pendiente | — | — |
| Fase 2 | Cuentas, economía y voz | Pendiente | — | — |
| Fase 3 | Modo sucio | Pendiente | — | — |

---

## Reglas configurables — 2026-09-30

Se repasaron las reglas que cambian entre mesas. Quedaron en la especificación y en `ConfigSala`.

| Regla | Decisión |
| --- | --- |
| Flor con piezas | Pieza más alta completa + último dígito de las otras piezas + cartas comunes |
| Flor sin piezas | 20 + la suma de las tres cartas |
| Contraflor | 6; al resto, lo que falta para ganar |
| Falta envido con los dos en malas | Lo que le falta al que va ganando (se descartó "gana el partido") |
| Cantar la flor | Obligatorio en la primera vuelta; si no se canta, se pierde |
| Envido envido | Permitido, y se puede seguir con real envido o falta envido |
| No querer el envido | Lo acumulado antes del último canto (1 si era el primero) |
| Quién empieza tras una parda | El que empezó la vuelta empatada |
| Mazo con envido pendiente | El rival cobra el envido no querido más el truco |
| Pica-pica | Solo en malas; cuando un equipo llega a 16, se vuelve a redondo |

Precisiones sobre la flor y el pica-pica:

- Si solo un equipo tiene flor, suma 3 por cada flor.
- Si los dos equipos tienen flor y nadie canta contraflor, se comparan al final y el equipo con la mayor suma 3 en total.
- Contraflor no querida ("con flor me achico"): el que la cantó se queda con los 3.
- Pica-pica: un solo reparto como en 3v3; tres duelos 1v1 en serie, empezando por el mano contra el de enfrente y siguiendo en sentido antihorario. Cada duelo es una mano completa con truco, envido y flor. Los que juegan después ven las cartas de los duelos anteriores.

---

## Etapa 1A: motor de reglas — 2026-09-30

**Commit:** `55961aa`

### Qué se hizo

- Monorepo con pnpm workspaces y TypeScript estricto. El paquete `packages/engine` es puro: no tiene interfaz ni red.
- `crearPartida` reparte con una semilla (PRNG mulberry32 y mezcla Fisher-Yates). Una partida se repite entera con la semilla y la lista de acciones.
- `apply(estado, accion)` es la única función de transición. Devuelve el estado nuevo y los eventos, o el motivo por el que la acción es inválida, y nunca modifica el estado recibido.
- `accionesValidas(estado, jugador)` dice qué puede hacer cada jugador, para los botones y los bots.
- `esperandoA(estado)` dice a quién espera el juego.
- `vistaPara(estado, jugador)` devuelve solo lo que ese jugador puede ver.
- Reglas implementadas:
  - piezas y el 12 que las reemplaza, y la jerarquía;
  - vueltas y pardas;
  - truco hasta vale cuatro, donde solo sube el que aceptó;
  - envido, real envido y falta envido encadenados, "primero está el envido" y declaración en orden desde el mano;
  - flor, contraflor y contraflor al resto;
  - irse al mazo;
  - partido a 30;
  - formatos 1v1, 2v2 y 3v3 con pica-pica.
- Modo sucio preparado desde ahora: el tanto real y el declarado van separados, y al final de cada mano hay una verificación. En modo normal se resuelve sola; en modo sucio cada equipo puede pedir ver.
- CLI para jugar una mano contra un rival que elige al azar: `pnpm cli [semilla]`.

### Tests (123)

- Jerarquía completa para 40 muestras, incluidas las muestras que son pieza.
- Envido y flor con piezas. El envido máximo de 37 se probó con todas las manos posibles.
- Todos los casos de pardas; turnos y rotación del reparto.
- Truco, envido y flor: secuencias válidas e inválidas, puntos al no querer y mazo con cantos pendientes.
- Pica-pica: orden de los duelos, cartas visibles y vuelta a redondo.
- Propiedades con fast-check, en partidas al azar con configuraciones al azar:
  - siempre terminan en 30 sin trabarse;
  - el puntaje nunca baja;
  - se reproducen idénticas;
  - ninguna vista contiene cartas ajenas;
  - `apply` no modifica el estado recibido.

### Decisiones tomadas donde la especificación no decía nada

1. Si cada equipo gana una vuelta y la tercera es parda, gana el que ganó la primera.
2. El tanto se anota al final de la mano y antes que el truco. Si con el tanto un equipo llega a 30, el truco no se suma.
3. La falta envido querida vale solo la falta, sin sumar los envidos anteriores.
4. Si alguien canta flor, el envido de esa mano se anula aunque ya se haya declarado.
5. Contraflor al resto después de una contraflor, no querida: el que la cantó cobra 6.
6. A un canto le puede responder cualquier jugador del equipo rival.
7. Si se va al mazo el que cantó el envido, ese envido no lo cobra nadie. Si había que comparar flores, pierde la comparación el que se fue.
8. En pica-pica, si un equipo entra en buenas a mitad de la mano, se terminan igual los tres duelos.
9. "Primero está el envido" es cantar envido mientras hay un truco sin responder, no una acción aparte.
10. En modo sucio, la penalidad por mentir es que los puntos de tanto del mentiroso pasan al rival. La flor callada todavía no tiene penalidad: se define en la fase 3.

### Notas

- La opción "quién empieza tras una parda" no cambia nada en la práctica. La única parda que no termina la mano es la de la primera vuelta, y esa siempre la empieza el mano. Quedó como parámetro igual.
- pnpm se instaló con `npm i -g pnpm`, porque corepack pedía permisos de administrador.

---

## Señas — 2026-09-30

Se definió la lista de señas de las mesas del usuario (quedó en la sección "Señas" de la especificación). Hay una seña por carta, más la de la flor:

| Carta | Seña |
| --- | --- |
| 2 de la muestra | Levantar las cejas |
| 4 de la muestra | Beso |
| 5 de la muestra | Fruncir la nariz |
| Perico (11) | Guiño derecho |
| Perica (10) | Guiño izquierdo |
| 1 de espadas o 1 de bastos | Mueca con la pera hacia la derecha |
| 7 de espadas o 7 de oros | Mueca con la pera hacia la izquierda |
| Un 3 | Morderse el labio inferior |
| Un 2 que no es pieza | Abrir la boca |
| 1 de copas o 1 de oros | Sacar la lengua |
| Flor | Inflar la boca como un sapo |

El resto de las cartas no tiene seña. Los unos bravos comparten seña, y lo mismo los sietes bravos.

---

## Etapa 1B: bots — 2026-09-30

**Commit:** `117d29d`

### Qué se hizo

- Paquete `packages/bots` con `crearBot(nivel, semilla)`. Cada bot tiene dos funciones:
  - `decidir(vista, senias)` recibe solo la `vistaPara` de su jugador y las señas de su equipo, nunca el estado completo.
  - `hacerSenias(vista)` devuelve las señas del jugador al empezar la mano.
- Tres niveles:
  - **Fácil:** tira la más baja que gana la vuelta; canta envido con 30 o más y truco con dos bravas; casi nunca sube.
  - **Medio:** estima la fuerza de su propia mano imaginando manos ajenas al azar. Canta con umbrales fijos, va de farol una de cada siete veces y juega con reglas: guarda la brava si ganó la primera y le deja la vuelta al compañero que le señó que puede matar.
  - **Difícil:** imagina manos ajenas coherentes con todo lo que sabe (cartas vistas, tantos declarados, flor, señas del compañero) y las pesa según lo probable que es que el rival haya cantado lo que cantó. Con cada una simula el resto de la mano jugando perfecto (minimax) y decide por valor esperado.
- El difícil ya trae programado mentir en el tanto y pedir ver, pero apagado (`permitirMentiras: false`) hasta la fase 3.
- Simulador: `pnpm simular --a dificil --b medio --n 1000 --formato 2v2 --procesos 6`. Alterna equipos y reparto, y da lo mismo con cualquier cantidad de procesos.

### Criterio (1000 partidas cada uno, semilla 2026)

| Enfrentamiento | 1v1 | 2v2 | Mínimo |
| --- | --- | --- | --- |
| Difícil contra medio | 64,0% ± 3,0% | 67,7% ± 2,9% | 60% |
| Medio contra fácil | 69,2% ± 2,9% | 68,5% ± 2,9% | 65% |

### Tests (13, más los 123 del motor)

- Con fast-check, partidas enteras con bots de cualquier nivel, en cualquier formato y configuración: siempre eligen acciones válidas y terminan.
- La misma semilla reproduce la misma partida.
- Las señas de cada mano, incluidos los casos en que la muestra es pieza.
- El difícil no quiere un vale cuatro que no puede ganar, y las manos que imagina para el compañero respetan sus señas.
- El medio le deja la vuelta al compañero que le señó un uno bravo y, si el compañero no hizo ninguna seña, mata él.
- El fácil casi nunca sube el truco y nunca sube el envido.
- Sin mentiras habilitadas, en modo sucio declaran siempre el tanto real y nunca piden ver.

### Decisiones

1. La interfaz quedó `decidir(vista, senias)` en vez de `decidir(vista, config)` como decía el prompt: la configuración viene dentro de la vista y las señas no las guarda el motor.
2. Las señas no entran al motor porque no cambian el estado del juego. Las reparte el simulador, y en la 1C las va a repartir el servidor, siempre solo al propio equipo. En 1v1 y en los duelos de pica-pica no hay señas.
3. Todos los niveles hacen sus señas honestas; lo que cambia entre niveles es cómo las leen.
4. El medio usa las señas solo para dejarle la vuelta al compañero, no para calcular probabilidades. Con las señas en sus cálculos, en 2v2 quedaba casi tan bien informado como el difícil (58,8%, abajo del criterio).
5. En 3v3 el difícil simula con la política simple en vez de minimax, porque el árbol de 6 jugadores es muy grande. Los duelos de pica-pica son 1v1 y usan minimax.
6. Cuando responde un equipo, contesta el primero de ese equipo en el orden de la mesa.

### Notas

- Duración aproximada por partida: fácil y medio de 10 a 100 ms; difícil 40 ms en 1v1 y 0,9 s en 2v2 (en un solo proceso).
- Variantes probadas sin mejora medible: cantar truco con menos juego, más farol, más prudencia para querer, más muestras, deducir del envido con más exigencia en equipos, y leer como mano floja que el rival no cante truco.

---

## Etapa 1C: servidor — 2026-09-30

**Commit:** `039be94`

### Decisiones previas

- Un bot de nivel **medio** juega por quien se desconecta o se queda sin tiempo.
- La cola pública ofrece jugar contra un bot a los 30 segundos de espera.
- Tecnologías: TypeScript, Node 24, Colyseus 0.18 con WebSocket, `@colyseus/sdk` para el cliente, `packages/shared` para los mensajes, registro en archivos JSON, Vitest + `@colyseus/testing`.

### Qué se hizo

- `packages/shared`: los tipos de todos los mensajes entre cliente y servidor, en los dos sentidos.
- `apps/server` con Colyseus y dos tipos de sala:
  - `privada`: se entra con un código de 5 caracteres, sin O/0 ni I/1/L. El código es el ID de la sala.
  - `publica`: cola 1v1 que empieza sola con dos personas.
- El servidor es la única autoridad:
  - valida cada jugada con el motor;
  - pone el jugador según la conexión, no según lo que dice el mensaje;
  - le manda a cada uno solo su `vistaPara` y los eventos públicos.
- Turnos de 30 segundos: si vencen, juega un bot por el jugador. Los bots esperan entre 0,8 y 2 segundos antes de jugar.
- Desconexiones:
  - un bot juega por quien se fue;
  - Colyseus permite reconectarse a la misma sesión durante 20 segundos;
  - después, se vuelve con el mismo ID de invitado y se recupera el lugar;
  - sin humanos conectados, la sala se cierra a los 2 minutos.
- Señas: se reenvían solo a los compañeros, nunca en 1v1 ni en pica-pica. Los bots señan al empezar cada mano.
- Chat:
  - general en todas las salas; de equipo solo en las privadas de 2v2 y 3v3;
  - filtro de palabras (lista en `src/palabras.ts`);
  - límite de 3 mensajes cada 5 segundos, de hasta 200 caracteres;
  - silenciar y reportar.
- Límite de 10 acciones por segundo por jugador.
- Registro de cada partida en `datos/partidas/` (semilla, configuración y acciones) y de los reportes en `datos/reportes.jsonl`.
- `pnpm servidor` levanta el servidor en `ws://localhost:2567`.

### Tests (17)

- Integración con clientes que se conectan de verdad:
  - partida 2v2 completa con dos humanos y dos bots;
  - la partida se reproduce idéntica desde el registro;
  - ninguna vista recibida trae cartas ajenas;
  - acción inválida o mal formada;
  - desconexión, bot de reemplazo y regreso con el mismo ID;
  - señas y chat de equipo aislados del rival;
  - filtro, límite y silenciar del chat;
  - reportes;
  - turno vencido;
  - cola pública (con dos personas y con la oferta de bot);
  - cierre de la sala sin humanos.
- Unitarios: filtro de palabras, límite de frecuencia y códigos de sala.

### Decisiones

1. No se usa el estado sincronizado de Colyseus. La información pública de la sala (lugares, apodos, conexión y configuración) va en el mensaje `sala`, y la partida en `vista` y `eventos`. Así ninguna carta puede filtrarse por la sincronización automática.
2. El modo sucio queda forzado en apagado hasta la fase 3, aunque el cliente lo pida.
3. Cuando empieza, la sala pública se marca privada para que no entren desconocidos. Solo vuelven los que ya tenían lugar.
4. Si el anfitrión se va antes de empezar, pasa a serlo el siguiente humano. Antes de empezar, irse libera el lugar.
5. Las señas de un humano les llegan también a sus compañeros bots. El bot supone que son todas las señas de esa mano, así que si el humano seña solo una parte, el bot puede equivocarse. Es aceptable por ahora.
6. Un bot que no tiene ninguna carta con seña "no hace nada", y sus compañeros bots lo tienen en cuenta.
7. Terminada la partida, la sala queda abierta hasta que se van todos. La revancha queda para la 1D, junto con la pantalla de fin de partida.
8. Los tests del servidor corren de a un archivo por vez: dos servidores de Colyseus en paralelo se traban entre sí.

### Notas

- La primera corrida de los tests tarda más de un minuto porque Vitest arma su caché de dependencias. Las siguientes tardan entre 7 y 20 segundos.
- El jugador simulado de los tests reintenta cuando el servidor le rechaza una jugada por el límite de acciones por segundo, como haría un cliente real.

---

## Herramientas para probar el servidor — 2026-09-30

Hasta que exista la interfaz (1D), el servidor no tenía forma de probarse a mano. Se agregaron:

- **Cliente de terminal** (`apps/terminal`, `pnpm jugar`). Tiene salas privadas con código, cola pública, chat, señas y reconexión con `--id`. Se probó de punta a punta: dos clientes y dos bots en una sala 2v2, con partida completa.
- **Playground de Colyseus** en `/playground`, solo en desarrollo.
- `TRUCO_BOT_MS` y `TRUCO_TURNO_MS`, para acortar los tiempos al probar.
- `README.md` con todos los comandos.
- `SIGNIFICADO` en `@truco/bots`: qué carta anuncia cada seña (para mostrarlas).

### Problema encontrado

pnpm había dejado **dos copias** de `@colyseus/core` 0.18.18 en `node_modules`, con distinta resolución de dependencias opcionales, después de sacar `@colyseus/schema`. El transporte WebSocket usaba una copia y las salas otra, así que ningún cliente real podía entrar: fallaba con "seat reservation expired". Los tests no lo detectaban porque se conectan por otro camino. Se resolvió reinstalando las dependencias desde cero.

Si vuelve a aparecer ese error: `rm -rf node_modules packages/*/node_modules apps/*/node_modules && pnpm install`.

**Corrección:** el script para levantar el servidor se llamaba `pnpm server`, pero ese nombre es un comando propio de pnpm (administra su almacén de paquetes). pnpm ejecutaba el suyo, que no hace nada visible, y nunca llegaba al nuestro. Se renombró a **`pnpm servidor`**.

---

## Etapa 1D: interfaz — plan aprobado 2026-09-30

- **Tecnologías:** React 19, Vite 8, TypeScript, Zustand, React Router, Motion (animaciones), vite-plugin-pwa, `@colyseus/sdk`. Tests con Vitest + Testing Library y Playwright.
- **Cartas:** SVG propio con figuras estilizadas. Más adelante se busca un set con licencia libre.
- **Mesa:** paño verde con madera, estilo boliche. Colores de paño, madera y dorso como variables de tema, para los cosméticos.
- **Cuatro tramos, con revisión al final de cada uno:**
  - **D1:** mesa jugable contra bots.
  - **D2:** cartas SVG, fósforos, animaciones y disposición.
  - **D3:** pantallas online y revancha.
  - **D4:** PWA, ayudas, pulido y Playwright.

### Tramo D1 — 2026-09-30

- `apps/web`, que se levanta con `pnpm web` (`--host`, así se abre desde el celular en la misma red).
- **Conexión con dos versiones que hablan el mismo protocolo que el servidor.** La local (`ConexionLocal`) corre el motor y los bots en el navegador: demoras de bots, señas del compañero y revancha. La online llega en D3.
- **Estado con Zustand.** Además de los mensajes, arma lo que se ve:
  - la última vuelta queda en la mesa hasta que se tira la carta siguiente;
  - globos de texto para los cantos;
  - registro de las últimas jugadas;
  - avisos de señas y errores.
- **Pantallas:**
  - inicio: apodo, avatar entre 10, formato y nivel;
  - mesa para 1v1, 2v2 y 3v3, con asientos relativos a quien mira: la M marca al mano, se ve a quién le toca, y en pica-pica se atenúan los que no juegan el duelo;
  - la muestra y el valor del truco arriba;
  - tu mano abajo, que se juega tocando las cartas;
  - solo los botones de canto válidos;
  - resultado de las vueltas;
  - fin de partida con revancha.
- **Cartas provisorias:** número y símbolo del palo; las definitivas llegan en D2. Con ayudas activas se ven el envido, la flor y una estrella en piezas y matas.
- `packages/shared` ahora tiene también los textos de cantos y eventos (`describirAccion`, `describirEvento`), que usan la web y la terminal. Se agregó el mensaje `revancha`.
- **Tests (7):**
  - la conexión local juega partidas enteras en 1v1, 2v2 y 3v3 sin mostrar cartas ajenas;
  - las señas del compañero llegan;
  - una jugada inválida se rechaza con su motivo;
  - desde el inicio se entra a la mesa;
  - se juega tocando cartas.
- **Revisión visual con Playwright:** `apps/web/scripts/capturas.mjs` saca capturas en tamaño celular. Así se corrigió que el registro y los avisos tapaban jugadores y que las cartas del centro se superponían en 1v1.

### Ajustes al D1 pedidos al probarlo — 2026-09-30

- **Pausa entre manos.** Al terminar una mano, las cartas quedan 2,5 s a la vista con el resultado arriba, y después se levantan de la mesa. Lo que llega mientras tanto espera en cola. Durante la pausa no aparecen "Te toca" ni los botones, y la carta recién jugada no se repite en la mano.
- **Ritmo más tranquilo:**
  - los bots tardan entre 1 y 1,8 s;
  - hay 0,9 s extra al cerrar una vuelta, para ver quién la ganó;
  - hay 2,7 s extra al terminar una mano.

  Vale igual contra bots y en el servidor, con las opciones nuevas `pausaVueltaMs` y `pausaManoMs`; `TRUCO_BOT_MS=0` también las anula.
- **Muestra en la mesa, como se juega.** Va boca arriba, a la derecha del que reparte (hacia el mano) y con el mazo cruzado encima dejándola ver. Salió del marcador, que ahora muestra el número de mano.
- **Mano propia más chica**, y cartas del centro en cruz, separadas según el formato.
- En pica-pica, si el duelo en juego no es el tuyo, tu mano se atenúa y dice "Esperás tu duelo".
- El registro muestra una línea por evento.
- Test nuevo de la pausa entre manos: se ven las cartas y el resultado, la mano nueva espera, y después se levanta la mesa.

### Tramo D2 — 2026-09-30

Se hizo mientras el usuario no estaba, con autorización para seguir con el D2 y revisar toda la interfaz. Parte del trabajo se repartió entre tres agentes en paralelo, cada uno en su propia rama (worktree); después se integraron las tres ramas a `main`.

- **Cartas SVG propias.** Las 40 están dibujadas por código:
  - pintas del marco: oros sin cortes, copas con uno, espadas con dos y bastos con tres;
  - palos distribuidos del 1 al 7, con espadas y bastos invertidos en la mitad de abajo;
  - anchos más grandes;
  - figuras estilizadas: sota, caballo y rey;
  - dorso con colores de tema.

  La página `/baraja`, de desarrollo, muestra las 40 juntas.
- **Fósforos en el marcador:** de a 5 (cuatro en cuadrado y uno cruzado), con malas y buenas separadas.
- **Menú de inicio rediseñado:**
  - cabecera con cartas en abanico y título en Alfa Slab One; el texto va en Nunito, desde Google Fonts;
  - perfil con avatar editable;
  - "Contra la compu" con formato, dificultad y "Más opciones" (ayudas, pica-pica y juego rápido);
  - "Online" como próximamente.

  El perfil se guarda mientras se edita.
- **Confirmación antes de abandonar** la partida.
- **Animaciones con Motion** (agente):
  - la carta entra desde el lado de quien la tira;
  - la mesa se levanta con una animación de salida;
  - reparto escalonado de la mano;
  - pulso de la carta ganadora;
  - respeta el "movimiento reducido" del sistema.
- **Pulido visual de la mesa** (agente):
  - botonera agrupada: respuestas arriba (Quiero en verde, No quiero en rojo), cantos abajo en grupos ("Envido | Real | Falta"), dos filas como máximo, y "Mazo" aparte, junto a tu nombre;
  - anillo de turno que gira;
  - ficha "M" de mano;
  - nombres en pastillas con color de equipo;
  - globos con colita que no se cortan;
  - resultado de la mano en el hueco de la botonera;
  - modales de fin de partida y de salir con el mismo estilo;
  - responsive en 360 × 740 y en escritorio (tablero centrado de hasta 620 px).

  Todos los colores nuevos son variables de tema.
- **Revancha en el servidor** (agente, adelanto del D3):
  - arranca cuando la piden todos los humanos conectados;
  - rota quién reparte;
  - `InfoSala.revancha` informa quién ya la pidió;
  - el registro guarda `reparte` para poder reproducir las revanchas;
  - 4 tests de integración nuevos.
- **Script de capturas:** acepta el tamaño de pantalla (`node scripts/capturas.mjs <carpeta> <url> 1280x800`).
- **Tests:** 166 en total (motor 123, bots 13, web 9, servidor 21), todos en verde.

**Pendientes:**
- En escritorio las cartas siguen con tamaño de celular.
- En 360 px con 3v3, un globo puede rozar el mazo por un momento.
- Con flor, "Te toca" y "Mazo" a la vez en 360 px, la pastilla del envido se corta con puntos suspensivos.
- Mientras una carta sale de la mesa (0,3 s), puede verse apenas por debajo de la nueva.

### Tramo D3 — 2026-09-30

La base la hice yo: conexión online, estado de la conexión, `pnpm dev` y prueba de humo. Después trabajaron tres agentes en paralelo, cada uno en su propia rama: pantallas online, mesa online y ojeo. Se integraron a `main` con dos conflictos chicos de imports y rutas.

- **Conexión online** (`ConexionOnline`, con `@colyseus/sdk`):
  - crear sala, unirse por código y cola pública;
  - estados conectada, reconectando y caída;
  - guarda la partida en curso para "Volver a la partida";
  - la dirección del servidor es el mismo host de la página en el puerto 2567, o `VITE_SERVIDOR`.
- **Pantallas online:**
  - inicio con Crear sala, Unirme con código, Buscar partida y la tarjeta "Tenés una partida en curso";
  - `/crear`, con las reglas de la mesa y sus explicaciones;
  - `/unirme`;
  - `/s/:codigo`, que pide el apodo si falta;
  - `/sala`: código grande, Compartir y Copiar link, lugares por equipo, cambio de lugar, configuración del anfitrión y Empezar;
  - `/buscar`, con la oferta de jugar contra un bot.
- **Mesa online:**
  - chat en hoja inferior con pestañas General y Equipo, **frases rápidas** y contador de no leídos;
  - menú de jugador para silenciar y reportar;
  - panel de señas;
  - reloj de turno en el anillo, y "Te quedan N s";
  - desconectados atenuados con "juega un bot";
  - franja de reconexión y modal de conexión perdida con reintento;
  - revancha con progreso ("Revancha 1/2").
- **Ojeo de cartas** (pedido nuevo del usuario, anotado en la especificación):
  - `ManoOjeable` con pointer events: el arrastre es 1:1 en vertical, con los límites pedidos, y la mano se abre sola a los 600 ms;
  - "Ver todas", y tocar una carta en tu turno abre el abanico;
  - vibración y movimiento reducido;
  - la lógica pura está en `src/ojeo.ts`, con sus tests;
  - página de prueba `/ojeo`;
  - interruptor "Ojear cartas" en Más opciones;
  - las cartas SVG se ajustaron: número en las dos esquinas de arriba, entre el 8% y el 25% de la altura, y dibujo desde el 25%.
- **Error del servidor encontrado con los tests de punta a punta:** quien recargaba la página no podía volver a la sala ("La sala está llena"). Su conexión vieja seguía esperando reconexión y ocupaba el cupo, y Colyseus rechazaba la nueva antes de que la sala reconociera el ID de invitado. Ahora el tope de conexiones es el doble de los lugares, y quién se sienta lo controla la sala. Tiene un test de integración, y se comprobó que sin el arreglo falla.
- **Instalación:** reapareció la copia duplicada de `@colyseus/core` al instalar el SDK en la web. Se resolvió con una reinstalación limpia, y ahora la **prueba de humo** (`pnpm --filter @truco/server humo`) corre dentro de `pnpm test` y lo detecta.
- **Tests:**
  - 202 unitarios y de integración: motor 123, bots 13, servidor 22, web 44;
  - 2 de punta a punta con Playwright (`pnpm --filter @truco/web e2e`): dos navegadores crean la sala, entran con el código, juegan, se mandan un chat, y uno recarga y vuelve. Estables en 3 corridas.

**Pendientes:**
- "Compartir" (`navigator.share`) falta probarlo en un celular de verdad.
- Recargar estando en `/sala` vuelve al inicio, y desde ahí se entra con "Volver a la partida"; no reconecta solo.
- "Descartar" la partida guardada solo la olvida en el navegador.
- Las reglas extra de `/crear` no se recuerdan para la próxima.
- El botón "Enviar" del chat desactivado queda de un color oliva apagado.
- El ojeo no se midió en un Android real.
- Con teclado o lector de pantalla, activar una carta desde la pila la juega directo, sin abrir el abanico.

### Pulido de la mesa: cartas, ojeo y señas — 2026-10-01

Pedido del usuario antes de seguir con lo online: corregir el ojeo, mostrar los tantos al terminar la mano y pulir las cartas y las señas, con todas las opciones propuestas. Lo trabajaron tres agentes en paralelo (mano, mesa y señas), y después se integraron sus ramas; hubo un solo conflicto, de una línea.

- **Ojeo por pasos:** zonas de 0–8 % para los cortes, 8–15 % vacío, 15–30 % para el número y el dibujo desde el 32 %, con un "tope" suave en el que se ven solo los cortes (unos 14 px de dedo). Las cartas SVG se reacomodaron a esas zonas.
- **Mostrar las cartas al terminar la mano** (regla nueva, en el motor): quien cantó flor o ganó un envido querido (también con "son buenas") muestra sus cartas sin jugar al cerrar el enfrentamiento (`resultado.mostradas`). En la mesa aparecen boca arriba con la etiqueta "Flor de X" o "Envido X". Las propiedades de "ninguna vista con cartas ajenas" excluyen solo esas cartas.
- **Las cartas quedan en la mesa:** cada jugador deja sus cartas escalonadas por vuelta frente a sí, con la ganadora resaltada y las vueltas viejas atenuadas (`CartasEnMesa`).
- **Mano:**
  - arrastrar hacia arriba para jugar, con un umbral de 60 px;
  - abanico curvo de −8°, 0° y +8°;
  - en escritorio, cartas más grandes, con las variables `--carta-chica`, `--carta-mesa` y `--carta-grande`.
- **Señas:**
  - cara SVG para tocar: cejas, ojos, nariz, boca con un menú de cinco señas, pera y cachetes;
  - el gesto animado aparece en el avatar del compañero;
  - el rival puede "pescar" la seña: opción de sala `pescar` ('nunca', 'gesto' o 'gestoYCarta') con su probabilidad, 20 % por defecto; el sorteo lo hacen el servidor y la conexión local, y el bot difícil usa lo que pesca;
  - ayuda que marca las señas de tus cartas;
  - momento 'libre' o 'antesDeJugar'.

  Las opciones están en Crear sala y en Más opciones.
- **Tests:** 242 en total (motor 130, bots 14, servidor 28, web 70), más la prueba de humo y 2 de punta a punta. Un agente vio fallar una vez el test de revancha mientras corrían otros tests en paralelo, probablemente por un choque de puertos; después pasó 28/28 en las corridas siguientes.

**Mazo clásico, opciones investigadas:**
- El mazo **Fournier de 1878** (diseño de Ignacio Díaz de Olano y Emilio Soubrier) está en Wikimedia Commons como **dominio público**. Está completo (40 cartas y el dorso), en PNG de 2434 × 3846, escaneado del Museo Fournier de Naipes de Álava.
- El diseño Fournier moderno se descarta por marca registrada.
- Pendiente de que el usuario elija: Fournier 1878, mixta, propia mejorada, o las dos como cosmético (la recomendada).

**Pendientes:**
- Durante el gesto, el avatar agrandado tapa el nombre en el celular.
- El globito de la seña puede rozar el mazo.
- En escritorio, durante la pausa, las cartas de la mesa quedan chicas en 2v2.
- El tope del ojeo y el arrastre conviene probarlos con el dedo en un celular real.

### Señas rápidas, tiempos, sin señas y baraja clásica — 2026-10-01

Pedidos del usuario:
- las señas tienen que ser más rápidas, porque con 30 s no alcanza;
- 1 minuto para la primera jugada del mano, con los tiempos configurables;
- la baraja con la opción 4 (las dos, como cosmético);
- la opción de jugar sin señas.

Los hicieron tres agentes en paralelo y se integraron sus ramas, con conflictos chicos en `perfil.ts`, `FormularioSala.tsx` y `Crear.tsx`: había que sumar los campos de las dos ramas.

- **Señas rápidas:**
  - arriba de tu mano, una tira con las señas de tus cartas, de un toque ("🤨 Cejas · 2 de la muestra"); se marca la hecha y se puede repetir;
  - mantener apretada una carta 450 ms hace su seña, con vibración y un anillo de progreso, sin jugarla;
  - no aparece mientras la mano está apilada para ojear;
  - la cara completa sigue disponible.
- **Sin señas:** `ConfigSenias.habilitadas` (por defecto true). Apagado: el servidor y la conexión local rechazan con "En esta mesa no se hacen señas", los bots no hacen ni reciben señas, y la web oculta todo lo de señas. Está en Crear sala y en Más opciones. "No poder ver las señas" se interpretó como jugar sin señas; que el rival no las vea es "Pescar: Nunca".
- **Tiempos por sala:** `tiempos { turnoS, primeraJugadaS }`, por defecto 30/60 y con límites de 15–120 y 30–180.
  - La primera jugada de cada mano, y en pica-pica la de cada duelo, usa el tiempo largo. Cantar no renueva el minuto.
  - Se configura en Crear sala ("Tiempos") y aparece en el resumen.
  - `TRUCO_TURNO_MS` sigue pisando todo, para pruebas.
- **Baraja clásica Fournier 1878** (cosmético, opción 4):
  - 41 WebP de 400 × 600 (unos 1,5 MB) en `apps/web/public/barajas/fournier-1878/`, con `CREDITOS.md`;
  - script reproducible `scripts/baraja-fournier.py` (Python + Pillow, que verifica la licencia de cada archivo);
  - selector en el perfil (Propia / Clásica 1878) y en `/baraja`;
  - zonas de ojeo por baraja: en Fournier el número está pegado al marco, así que el tope en los cortes es mínimo, como con el naipe real;
  - la precarga baja las imágenes la primera vez que se usa.
- **Tests:** 273 en total (motor 130, bots 14, servidor 36, web 93), más la prueba de humo y los 2 de punta a punta.

**Pendientes:**
- Con la tira, la zona de abajo crece unos 40 px.
- A 360 px, con flor, la ficha del tanto se corta.
- La baraja clásica todavía no queda guardada para jugar sin internet; eso va en el D4, con la PWA.

### Globitos de chat en la mesa — 2026-10-01

Pedido del usuario: "El texto del chat debería verse saliendo de la persona".

- **Globito por mensaje** (`componentes/GlobosChat.tsx`): cada mensaje nuevo, del chat escrito o de las frases rápidas, aparece al lado del avatar de quien lo mandó, con la colita hacia esa persona.
  - Dura unos 4 s, y más si es largo (hasta 8 s). Se va con un fundido corto.
  - Si la misma persona manda otro, reemplaza al anterior.
  - Corta en 3 líneas con puntos suspensivos; el texto entero queda en el `title` y en el historial.
  - Los mensajes de silenciados no aparecen. Los que ya estaban al entrar a la mesa tampoco.
  - Los del canal del equipo llevan un borde del color del equipo.
  - Tiene `role="status"` y el apodo para lectores de pantalla.
- **Dónde sale:**
  - a los costados, arriba del avatar, alineado hacia adentro;
  - el de enfrente, al costado derecho del avatar, para no tapar las cartas jugadas del centro;
  - el tuyo, arriba de tu avatar, abajo a la izquierda.
- **Con un canto a la vez:** se apilan. El canto queda pegado a la persona y el chat va más afuera, sin colita. Tus cantos ahora también salen de tu avatar, y ya no del centro.
- En 3v3, los costados de arriba usan globos más angostos para no tapar el nombre del de enfrente. En pica-pica, quien está fuera del duelo se ve atenuado, pero su globo se lee entero. El asiento que habla pasa adelante de los demás.
- **Protocolo:** no cambió; todo sale del `chat` del store.
- **Script de capturas** `scripts/capturas-chat.mjs`: tres navegadores (Ana, Beto y Caro) en una sala online con bots, en 1v1, 2v2 y 3v3, con canto y chat a la vez. Necesita el servidor y la web levantados.
- **Tests:** web 101 (8 nuevos: el hook con timers falsos, el componente y la mesa), y los 2 de punta a punta en verde.

**Pendientes:**
- Si el de enfrente y el del costado de arriba escriben a la vez en 3v3, sus globos pueden encimarse.
- Tu globo tapa el mazo un momento cuando el mazo está abajo a la izquierda.
