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
| 1D | Interfaz | Hecha (D1 a D4) | 2026-10-05 | `97fcd1d` |
| 1E | Señas, avatares y cantos (sin el audio de los cantos) | Hecha | 2026-10-05 | ver abajo |
| Fase 2 | Cuentas, economía y voz | Plan en revisión | — | — |
| Fase 3 | Modo sucio | Pendiente | — | — |

### Ideas pedidas para más adelante

- **Bots más fuertes y tipografías** (pedido 2026-10-12): estudiar los bots (predecibles y flojos), sumar "Muy difícil" y "Master" (el máximo posible sin ver cartas ajenas: contar cartas y calcular envidos), y tipografías como cosmético: al menos 10 de bibliotecas públicas, 2 gratis y 8 en la tienda. Hecho el mismo día: ver "Tipografías" y "Bots Muy difícil y Master" más abajo.
- **Cosméticos criollos** (pedido 2026-10-13): pipa, cosas de asado y más, bien criollo. Plan aprobado el mismo día (ver la entrada).
- **Modo historia** (idea del usuario, 2026-10-13): recorrer el país jugando en lugares reales (se pedirá permiso a cada lugar), desbloqueando cosas, niveles y dificultades más altas. Decidido: va **después de la fase 2** (el progreso se guarda en la cuenta); **mapa abierto** (elegís a dónde ir); individual y **cooperativo con amigos online o con un compañero bot**; mientras llegan los permisos, lugares inventados pero creíbles que después se reemplazan por los reales. El plan se arma después de la fase 2.

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

### Mano más chica en el celular — 2026-10-01

Pedido del usuario: en Android la mano ocupa mucho y la mesa queda chica. Mientras se ojea, las cartas tienen que verse grandes, y después achicarse un poco.

- **Mano:**
  - variable nueva `--carta-mano`, que en el celular es el 75 % de `--carta-grande`;
  - apilada para ojear, la mano sigue grande;
  - en abanico (ya ojeada, con el ojeo apagado o con menos de tres cartas) pasa a `--carta-mano`, con una transición suave de 0,35 s;
  - quedan de unos 57 × 85 px en 360 de ancho y 65 × 97 px en 412: siguen cómodas para tocar y arrastrar;
  - en escritorio `--carta-mano` es igual a `--carta-grande`, así que no cambia nada.
- **Zona de abajo en el celular:** la tira de señas rápidas baja de 38 a 34 px, y el espacio entre las filas de `mi-lugar`, de 8 a 6 px. Los botones de cantos siguen en 44 px.
- **Resultado:** con la mano abierta, la mesa gana entre 30 y 40 px en 360 × 780 y en 412 × 915.
- **Script de capturas:** espera a que termine el reparto antes de capturar la mano apilada, y saca una captura más con la mano ya abierta (`2-<formato>-abierta.png`).
- **Tests:** los 93 de la web y el typecheck, en verde.

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

### Tramo D4: app instalable, pulido, ayudas y pruebas — 2026-10-05

Plan aprobado el 2026-10-05. Lo hicieron tres agentes en paralelo, cada uno en su rama (PWA, pulido con ayudas, y pruebas); las tres se integraron a `main` sin conflictos.

- **App instalable y sin internet** (vite-plugin-pwa, `registerType: 'prompt'`):
  - manifiesto "Truco Uruguayo"; íconos generados desde `public/icono.svg` con `pnpm --filter @truco/web iconos` (`scripts/iconos.mjs`);
  - se guardan de entrada la app, el motor y los bots (unos 825 KiB): "Contra la compu" anda sin red;
  - la baraja clásica se guarda recién cuando se usa (caché `barajas`), y `/juego` queda fuera de toda caché;
  - fuentes propias con @fontsource (OFL) en lugar de Google Fonts;
  - sin conexión, lo online de Inicio queda desactivado con "Sin conexión" (`useEnLinea`);
  - aviso "Hay una versión nueva · Actualizar" solo fuera de la partida (inicio, crear, unirme o fin de partida); nunca recarga sola;
  - botón "Instalar la app" y, en iPhone, el cartelito de "Compartir → Agregar a inicio".
- **Pulido de la mesa** (los siete pendientes anotados seguían pasando; script nuevo `scripts/capturas-escenas.mjs` con semilla fija para repetir cada caso):
  - con flor, la ficha muestra solo "flor N" debajo del nombre y ya no se corta a 360 px;
  - las señas rápidas van a los costados de la mano: el paño gana unos 38 px en el celular;
  - globos de 3v3 sin encimarse; tus globos y las señas de los costados ya no pisan el mazo;
  - el avatar del gesto crece hacia arriba y no tapa el nombre;
  - el resultado de la mano crece sobre la mano y no achica el paño; en escritorio las cartas de la mesa pasan de 32 a unos 54 px en 2v2;
  - la carta que sale de la mesa se apaga antes y queda debajo de la nueva.
- **Ayudas:** tocar la estrella o la ficha del tanto muestra una explicación corta (`src/ayudas.ts`), armada con las reglas del motor y la configuración de la sala ("Pieza: el perico…", "Tu envido: 33 (7 y 6 de oros + 20)", la flor según la regla de piezas). Funcionan bien en 3v3 y en pica-pica.
- **Pruebas de punta a punta:** de 2 a 7 (`e2e/`, con ayudantes en `e2e/ayudantes.ts`): partida entera contra la compu, señas en 2v2 que el rival no recibe, revancha, recargar y volver, y ojeo y arrastre con el dedo. Más `pnpm --filter @truco/web e2e:pwa`, que corre contra la versión compilada: corta la red, recarga y juega.
- **Tests:** 304 en total (motor 130, bots 14, servidor 36, web 124), más 7 de punta a punta y 1 sin conexión. Las 7 de punta a punta pasaron en tres corridas seguidas después de integrar.

**Pendientes:**
- Probar en celulares reales: instalar en Android e iPhone, ícono maskable, ojeo y arrastre, tocar la estrella sin jugar la carta, las señas rápidas al costado de la mano (unos 60 px en 360).
- El JS principal pesa 689 kB; conviene partirlo.
- En la pausa entre manos, el resultado tapa las cartas que no se jugaron.
- En 3v3, si hablan cuatro a la vez, todavía se pueden encimar globos; en 2v2 con el mazo arriba a la izquierda, un globo largo puede tocarlo.
- Abrir `/s/:codigo` sin conexión no tiene un aviso propio.

---

## Avatares y voces — 2026-10-05

- **Criterio para el contenido gráfico y sonoro:** lo genérico sale de bibliotecas con licencia CC0 o MIT (anotadas en un `CREDITOS.md`); lo que se anima o es bien uruguayo se hace propio.
- **Avatar:** se comparó Notionists, Lorelei y Open Peeps (DiceBear, los tres CC0) con las 11 señas animadas por capas. Se eligió **Lorelei** por ahora: tiene la cara separada en cejas, ojos, nariz y boca, la mayor variedad de ojos y bocas, y color por capa. Open Peeps queda descartado porque su cara es una sola pieza. Más adelante puede reemplazarlo un diseñador, así que el avatar se arma detrás de un formato de capas propio.
- **Efectos de sonido:** Kenney Casino Audio (CC0) cuando se agreguen.
- **Voces de los cantos:** las graba el usuario, en una etapa más adelante. La 1E deja solo la estructura de packs de voces, con el globo de texto como hoy.


---

## Corrección de reglas del motor — 2026-10-05

El usuario repasó las reglas como estaban programadas y marcó las que no eran como se juega en su mesa. Plan aprobado el mismo día. Las reglas nuevas quedaron en la especificación.

- **Falta envido** (`faltaEnvidoEnMalas: 'completarMalas'`, la nueva por defecto):
  - si el que va ganando tiene menos de 15, vale lo que le falta para llegar a 15 (con 10, vale 5; con 14, vale 1);
  - con 15 o más, lo que le falta para 30 (con 15 vale 15). Con 15 todavía no se entró en buenas: las buenas siguen empezando en 16;
  - la cobra el que gana la falta. Las opciones viejas quedan como "Hasta 30" y "Gana el partido".
- **Flor:**
  - cuando alguien canta flor, todos los que tienen flor la cantan en ese momento, en orden desde el mano, sin esperar su turno; hasta que no la cantan, no se hace otra cosa (salvo irse al mazo);
  - flor contra flor sin contraflor: gana la más grande (empate, la del más cercano al mano) y su equipo cobra 3 por cada flor que tiene; el otro, nada;
  - si alguien del equipo tiene una flor sin cantar, el equipo no canta ni contesta el envido (tampoco "no quiero"): solo puede actuar el de la flor, cantándola;
  - el envido anulado por la flor no lo cobra nadie (ya era así).
  - Con la flor no obligatoria o en modo sucio, nada de esto se aplica.
- **Pica-pica alternado** (`picaPicaAlternado`, por defecto): en malas, una mano redonda y una de pica-pica, empezando por la redonda; en buenas, redondo hasta el final. "Todas las manos de malas" queda como opción.
- **"Envido va primero":** ya funcionaba; ahora se llama así en los botones, los globos y el registro. Solo lo puede decir alguien que todavía no jugó su carta.
- **Orden de la declaración (jugadores 1, 2, 3 y 4):** ya funcionaba como en la mesa del usuario; quedó un test con su ejemplo.
- **Crear sala:** la falta tiene tres opciones (Hasta 15, Hasta 30, Gana el partido) y, en 3v3 con pica-pica, "Manos de pica-pica: Alternadas o Todas".
- **Bots:**
  - la falta se calcula con la regla nueva;
  - con todas las flores ya cantadas, pueden subir con contraflor (antes solo al cantar la propia);
  - la regla de la flor del compañero dejaba al medio contra el fácil en 2v2 en 64,3 % (mínimo 65 %): con menos envidos, el medio pierde parte de su ventaja. Se ajustó el medio: canta envido con más del 50 % de chances (antes 60 %) y truco con más del 55 % (antes 60 %).
- **Tests:** 310 en total (motor 136, bots 14, servidor 36, web 124), más los 7 de punta a punta y el de sin conexión.

### Criterio de los bots (1000 partidas, semilla 2026)

| Enfrentamiento | 1v1 | 2v2 | 3v3 | Mínimo |
| --- | --- | --- | --- | --- |
| Difícil contra medio | 62,8 % | 62,9 % | 65,5 % | 60 % |
| Medio contra fácil | 70,5 % | 66,5 % | 65,4 % | 65 % |

Con otras semillas (1 y 2) el medio contra el fácil en 3v3 dio 62,5 % y 64,4 %, y el difícil contra el medio en 2v2, 60,8 %. El 3v3 no era parte del criterio, pero queda anotado.

---

## Etapa 1E: avatares por capas, señas sobre el avatar y sonido — 2026-10-05

Plan aprobado el 2026-10-05. Pedidos del usuario: sacar los emojis, sumar efectos de sonido, piezas uruguayas, y que la mayoría de los cosméticos queden detrás de la tienda con monedas de juego. La base la hice yo; después trabajaron tres agentes en paralelo (editor, señas, y dibujos con sonido). Al integrar hubo dos conflictos chicos (`Sala.tsx`, `Avatar.tsx`) y un import a `Cara.tsx`, que se borró en otra rama.

- **Formato del avatar** (`packages/shared/src/avatar.ts`):
  - 15 capas (piel, cabeza, pelo, color de pelo, cejas, ojos, nariz, boca, barba, lentes, aros, pecas, ropa, sombrero y accesorio), codificadas como `a1.…` en el campo `avatar`;
  - el formato no sabe de Lorelei: el dibujo lo pone un estilo de la web (`apps/web/src/avatares/`). Un diseñador puede hacer otro estilo sin tocar los avatares guardados. El catálogo solo crece al final de cada capa;
  - **catálogo con precio en monedas** (0 = gratis; provisorios hasta la fase 2). Gratis: las pieles (siempre), 12 peinados, 8 ojos, 8 bocas, 6 cejas, colores de pelo naturales, narices, caras, barbas, pecas y 3 remeras. Pagas: el resto, los colores de fantasía, aros, casi todos los lentes, camisetas, buzo, campera, sombreros y el mate;
  - el servidor acepta solo piezas gratis (las pagas vuelven a la gratis de la capa) y a los bots les arma avatares que pueden lucir piezas de la tienda.
- **Estilo Lorelei** (DiceBear, CC0): 133 piezas extraídas con `pnpm --filter @truco/web avatares:lorelei` a `src/avatares/lorelei/piezas.ts`, con `CREDITOS.md`. Se cargan en un archivo aparte (import dinámico) y quedan en la caché de la app.
- **Dibujos propios** (`propias.ts`, con el trazo de Lorelei): 10 ropas (4 remeras, camiseta celeste sin escudo, 3 a rayas, buzo con capucha, campera de jean), 4 sombreros (boina, gorro de lana, gorra, sombrero de paja; recortan el pelo de arriba) y el mate en la mano. La ropa va entre la cabeza y el pelo de adelante. Planillas con `scripts/planillas-avatar.ts`.
- **Editor** (`EditorAvatar.tsx`), al tocar el avatar del perfil: 11 pestañas con miniaturas, las gratis primero, colores en muestras, las pagas con candado y precio ("Pronto en la tienda"), "Al azar" (solo gratis) y "Ver una seña". Los emojis se fueron: los perfiles viejos reciben un avatar armado desde el apodo.
- **Señas sobre el avatar** (`avatares/gestos.ts` y `gestos.css`): las 11 señas y el disimulo animan las capas reales (ojos partidos en dos para el guiño, cejas, nariz, boca) con piezas propias encima (lengua, boca abierta, dientes, cachetes, corazón). En la mesa, el avatar crece y hace el gesto; la cara grande para hacer señas es tu avatar, con las zonas tocables medidas sobre sus capas. `Cara.tsx` se borró. Con movimiento reducido, poses quietas.
- **Sonido** (`src/sonido/`):
  - efectos de Kenney Casino Audio (CC0, 5 .ogg, 46 KB): repartir, tirar carta, fin de vuelta y un tic por fósforo; suenan recién después del primer toque y quedan para jugar sin conexión;
  - estructura de packs de voces para los 13 cantos (sin audio todavía) y `scripts/voces.mjs` para procesar las grabaciones (recorta silencios, normaliza a -16 LUFS, WebM/Opus). Necesita ffmpeg, que no está instalado;
  - ajustes en Inicio ("Sonido": efectos sí/no, volumen, voz de los cantos "Pronto") y botón de silenciar en la mesa.
- **Tests:** 368 en total (motor 136, bots 14, servidor 36, web 191 — antes 131 —), más 8 de punta a punta (nuevo: un avatar armado en el perfil se ve igual desde otro navegador) y el de sin conexión, que ahora verifica los efectos.

**Pendientes:**
- Escuchar los efectos (se eligieron por nombre y duración) y probar Ogg/Opus en iPhone; si falla, sumar .m4a.
- Grabar las voces (instalar ffmpeg) y pegar el pack en `PACKS_VOCES`. Decidir si el botón de silenciar también calla las voces.
- Las muecas con la pera (1 y 7 bravos) se notan menos: Lorelei tiene bocas chicas y la pera es parte de la cabeza.
- En la mesa, el avatar de arriba de todo tapa un momento su nombre y sus cartas durante el gesto.
- Algunas piezas de Lorelei traen ojos cerrados o lengua afuera, y la barba grande tapa la boca.
- Precios de la tienda: provisorios hasta la fase 2.

### Jugadores sentados en la mesa — 2026-10-05

Pedido del usuario: ver a los jugadores en la mesa. Lorelei solo tiene vista de frente (no hay espaldas), así que se armó una variante con los demás de medio cuerpo detrás del paño; vos seguís con el circulito abajo. La hizo un agente como maqueta; el usuario pidió integrarla, que se elija desde el menú y que el tamaño acompañe a la pantalla.

- **Inicio → Más opciones → "Jugadores en la mesa": Círculos o Sentados** (`perfil.mesaBustos`; por defecto, círculos). También `?bustos=1` / `?bustos=0` en la dirección.
- **Sentados** (`estilos-mesa-bustos.css`): el de enfrente asoma arriba del borde de madera y los de los costados en un hueco del borde, inclinados 6° hacia el centro; el paño no pierde ancho. En una seña el busto crece 1,5 veces y se inclina sobre la mesa.
- **Tamaño según la pantalla:** el de enfrente va de 56 px (celular chico) a 120 px; los de los costados, de 46 a 96 px (`clamp` con vw y vh).
- **Tests:** web 194, e2e 8.

- **Ajustes pedidos al verlo en PC:**
  - en 3v3, los de los costados de arriba (jugadores 3 y 5, contando desde vos en sentido antihorario) llevan el nombre arriba del busto: abajo chocaba con el busto del jugador de abajo;
  - la seña ya no hace zoom grande: el asiento se recuadra con el color de acento. En pantallas grandes el busto no crece; en el celular crece apenas (1,2) y se acerca un poco a la cara (1,15) para que el gesto se lea.

**Pendientes:** durante la seña, el busto de arriba tapa un momento su nombre; las pastillas de seña de los costados pisan las pilas del centro (como en círculos); no se probó con celulares de menos de 700 px de alto.

---

## Mesas de colores y cartas que se levantan — 2026-10-05

Pedidos del usuario: elegir la combinación de colores de la mesa (como cosmético, después con monedas) y, como opción de sala, que las cartas se levanten para que la mesa no quede tan cargada. Plan aprobado; lo hicieron dos agentes en paralelo. Al integrar, dos conflictos de "las dos cosas juntas" en `perfil.ts` e `Inicio.tsx`.

- **Mesas** (`packages/shared/src/mesas.ts`, `apps/web/src/estilos-mesas.css`): siete combinaciones de paño y madera que pintan la mesa y el fondo de la app (`data-mesa` en `<html>`; también el color de la barra del navegador). Gratis: Boliche (la de siempre) y Azul. En la tienda, con precios provisorios: Pizarra 300, Bordó 400, Celeste 400, Parrillero 500 (arpillera con gradientes) y Cantina 600 (mantel a cuadros). Se eligen en Inicio → Más opciones con muestras; las pagas con candado y precio. Es personal: no viaja al servidor. Se ajustaron colores por mesa para que se lean pastillas, dorsos y textos (detalle en el informe del agente).
- **Cartas jugadas** (opción de sala, `CartasJugadas` en `@truco/shared`): "Quedan en la mesa" (por defecto) o "Se levantan en cada vuelta". El servidor la valida y la manda en `InfoSala`; el anfitrión la cambia en la espera; contra la compu va en Más opciones. Al cerrarse una vuelta, las cartas quedan 1,2 s con la ganadora resaltada y se van hacia quien la ganó (al centro si fue parda); al terminar la mano queda la última vuelta con las cartas del tanto o la flor.
- **Tests:** 398 (motor 136, bots 14, servidor 39, web 209), 8 de punta a punta y el de sin conexión.

**Pendientes:**
- El `theme-color` del index y del manifest es el de Boliche hasta que carga la app.
- La arpillera puede hacer moiré en pantallas de densidad 1.
- Con jugadores sentados en 1280, el globito de chat del de abajo a la derecha queda tapado por su busto.

---

## Tienda de prueba y cosméticos del anfitrión — 2026-10-05

Pedidos del usuario: poder desbloquear la tienda desde el inicio para probar, y que la mesa y la baraja sean las del anfitrión de la sala, así todos ven lo mismo y se lucen los cosméticos buenos. Plan aprobado; lo hizo un agente.

- **Tienda de prueba:** Inicio → Más opciones → "Desbloquear la tienda (prueba)" (`perfil.tiendaDesbloqueada`). Prendido, se elige todo lo pago en el editor de avatar y en las mesas (candado abierto); apagado, lo pago vuelve a lo gratis. El servidor lo acepta solo con la variable `TRUCO_TIENDA_DE_PRUEBA` prendida (lo está por defecto en la fase 1; `'0'` la apaga) y el aviso `tiendaDesbloqueada` del cliente. **En la fase 2 se apaga y solo vale lo comprado.**
- **Mesa y baraja de la sala:** en salas privadas son las del anfitrión (validadas por el servidor como el avatar) y viajan en `InfoSala` (`mesa`, `baraja`). Si se va el anfitrión, pasan a ser las del nuevo. Cola pública: Boliche y baraja propia. Mensaje nuevo `mesaYBaraja` para cambiarlas en la espera (después de empezar se rechaza). En la web se aplican mientras estás en la sala y al salir vuelve lo tuyo; contra la compu, lo tuyo.
- **Sala de espera:** línea "Mesa Bordó · Baraja clásica, de Ana" (el anfitrión ve "las tuyas") con un botón "Cambiar" para el anfitrión, que abre los selectores de mesa y baraja.
- **Barajas:** catálogo en `packages/shared/src/barajas.ts` con precio (las dos gratis por ahora), por el mismo camino que las mesas.
- **Tests:** 419 (motor 136, bots 14, servidor 49, web 220), 9 de punta a punta (nuevo: Ana con Bordó y baraja clásica, Beto con Azul ve lo de Ana y al salir vuelve a Azul) y el de sin conexión.

**Pendientes:**
- `ojeo.spec.ts` falla de vez en cuando con la máquina muy cargada (mide la separación del abanico).
- La mesa y la baraja quedan fijas desde que empieza la partida (también en la revancha).
- El circulito de la línea de la sala casi no se ve sobre Bordó.

---

## Señas del compañero y pedir que las repita — 2026-10-06

Pedido del usuario como último cambio visual de la fase 1: tocar el avatar de un compañero para ver las cartas que te marcó y pedirle que repita las señas. De las dos formas propuestas eligió **solo lo que te marcó**: si tu compañero no te hizo una seña, no la ves. Se descartó la opción de sala que mostraba todas sus cartas con seña.

- **Tocar el avatar de un compañero** (2v2 y 3v3, fuera del pica-pica y de la pausa entre manos) abre la hoja "Señas de X" (`PanelCompaniero.tsx`):
  - "Te marcó en esta mano": las señas traducidas a cartas, sin repetir, con su gesto. Si no te hizo ninguna, "No te hizo señas en esta mano";
  - el botón "Pedile que te repita". Se puede pedir una vez cada 10 s a cada compañero (`ESPERA_PEDIR_SENIAS_MS`). En las salas de "señas antes de jugar", si el compañero ya jugó su carta, en lugar del botón dice por qué no se puede.
- **Un bot** (o el bot que juega por quien se desconectó) repite enseguida lo que ya marcó. Si no tiene señas, aparece "X no tiene señas para hacerte".
- **A una persona** le aparece el aviso "Ana te pidió que le repitas las señas", que dura 8 s:
  - si ya hizo señas en la mano, el botón es "Repetir" y vuelve a mandar las mismas;
  - si no hizo ninguna, el botón es "Hacer señas" y abre la cara.
- **Mensajes nuevos:** `pedirSenias`, `repetirSenias` y `pidenSenias`. La seña ahora viaja con el número de mano (`mano`) y con `repetida` si es una repetición.
  - Una repetición no se anota dos veces para los bots.
  - El rival la puede pescar como cualquier seña: repetir tiene el mismo riesgo que en la mesa.
  - El pedido nunca le llega al otro equipo.
- **Tests:** 427 en total (motor 136, bots 14, servidor 52, web 225), 10 de punta a punta (nueva: Ana ve el guiño de Beto en su panel, le pide que lo repita y Beto repite) y el de sin conexión.

**Pendiente:** al recargar la página se pierden las señas recibidas en la mano (el panel queda vacío), pero se pueden recuperar pidiéndolas de nuevo.


---

## Barajas "El Cid" y Grimaud — 2026-10-06

Pedido del usuario: más barajas gratis. Se buscaron barajas españolas completas de licencia libre y se le armó una página con las candidatas lado a lado (las mismas 8 cartas, más la vista del ojeo). Eligió **"El Cid"** y **Grimaud**; "La Broma" (caricaturas políticas de 1874) no le gustó. Se descartaron también la castellana dibujada de Commons (208 × 319, CC BY-SA) y las fotos de la Fournier moderna (marca registrada).

- **"El Cid"** (Simeón Durá, Valencia, 1888) y **Grimaud** (Francia, 1860): dominio público, escaneos de la Biblioteca Nacional de Francia (Gallica) subidos a Commons. Gratis en el catálogo (`cid1888`, `grimaud1860`).
- **Licencia:** Gallica pide una licencia para el uso comercial de sus escaneos. Como son gratis, el riesgo es bajo (además, desde 2019 la ley europea no le da derechos a la foto de una obra de dominio público). **Antes de venderlas en la tienda, consultar a la biblioteca.** Detalle en el `CREDITOS.md` de cada carpeta.
- **`scripts/baraja-gallica.py cid1888|grimaud1860`:** baja las 41 imágenes de Commons (reusa la descarga de `baraja-fournier.py`), verifica la licencia, las lleva a 400 × 600 centradas en el marco impreso y mide dónde quedan la línea de los cortes y el número.
- **La web:** `imagenCarta(baraja, carta)` reemplaza a `imagenFournier`; toda baraja que no es la propia es de imágenes (carpeta en `public/barajas`). Zonas del ojeo medidas para cada una: en El Cid la línea de los cortes queda entre 0,053 y 0,063 de la altura y el número entre 0,066 y 0,118; en Grimaud, entre 0,013 y 0,030 y entre 0,033 y 0,098. El selector de baraja pasa a 2 × 2.
- **Escudos de los clubes:** no se pueden usar, ni gratis (son marcas registradas de cada club). Sí los colores y las franjas, sin escudo. Al usuario le gustó la idea para los avatares, junto con la selección.
- **Tests:** web 227 (nuevos: las dos barajas, sus 41 imágenes y sus zonas del ojeo), servidor 52.

---

## Camisetas de los cuadros y de la selección — 2026-10-06

Pedido del usuario: los colores de los cuadros uruguayos y de la selección para los avatares, sin escudos (son marcas registradas de cada club). Plan aprobado el mismo día. Los nombres son de colores, no de clubes: el nombre también es marca y no se quiere dar a entender que un club avala la app.

- **10 camisetas nuevas** (dibujos propios con el trazo de Lorelei, al final del catálogo de ropa; 200 monedas, la de época 250):
  - blanca tricolor (cuello azul con vivo rojo), violeta y blanca con franja negra diagonal;
  - a bastones: verde y rojo, celeste y blanco, negro y azul, verde y blanco, violeta y blanco;
  - de la selección: blanca con cuello celeste y "celeste de época" (cuello redondo blanco con cordón cruzado, como las de 1930).
- Las rayas que ya estaban se llaman ahora "Bastones blanco y negro", "Aurinegra a bastones" y "Bastones rojo y azul" (mismo dibujo y misma posición en el catálogo).
- Los bots pueden lucirlas (eligen también piezas de la tienda).
- La planilla (`scripts/planillas-avatar.ts`) ya no se pasa del último peinado con más de 16 ropas.
- **Tests:** 429 (motor 136, bots 14, servidor 52, web 227).

---

## Bufandas y más accesorios — 2026-10-06

Pedido del usuario: la bufanda con los colores de los cuadros y más accesorios además del mate (termo, celular, libro…).

- **Capa nueva "bufanda"** (la 16.ª, al final del formato del avatar), así se puede tener bufanda y mate a la vez. Un código guardado con las 15 capas de antes se sigue leyendo: las capas que faltan al final quedan en su pieza 0 ("Sin bufanda"). En el editor va en la pestaña Ropa.
- **7 bufandas** de lana a franjas, con la vuelta al cuello y una punta con flecos sobre el pecho (150 monedas): celeste y blanca, aurinegra, tricolor, violeta y blanca, blanca y negra, verde y blanca, roja y azul. Van encima de la ropa y debajo de la mano.
- **8 accesorios nuevos en la mano**, con la misma mano del mate: termo (250), mate y termo (400), celular, libro, diario y café (200 cada uno), pelota (250) y naipes (300; un dorso, un 1 de espada y un 7 de oro en abanico).
- **Tests:** web 229 (nuevos: todas las combinaciones de accesorio y bufanda arman un SVG válido; un código de 15 capas se lee sin bufanda), servidor 52; la prueba de punta a punta del avatar espera la capa nueva.



---

## Revisión de reglas del motor — 2026-10-12

Repaso regla por regla con el usuario (10 bloques), con el detalle, las decisiones y el avance en [REVISION-REGLAS.md](REVISION-REGLAS.md). Las reglas nuevas quedaron en la especificación.

- **Motor:** cadena de envido sin límite hasta la falta; flor contra flor por flores que ganan; contraflor no querida 3 por flor + 1; contraflor al resto = el partido; "con flor quiero / me achico"; "flor y truco"; partido a 20, 30 o 40; irse en la primera sin tocar da el envido; la flor sin cantar se cobra si el rival se va; pasar en la tercera; el pie (lidera, sugiere, manda a tocar y gritar; opción "toques y gritos"); irse al mazo solo hasta que se va el pie; piezas por abajo en el pica-pica; corte con tres tipos.
- **Bots:** juegan con todo lo nuevo; criterio cumplido (difícil contra medio 64–66 %, medio contra fácil 67–71 %).
- **Servidor:** tirar reyes, sugerencias del pie, el pie bot manda, eventos filtrados por asiento, te sacan a la tercera jugada vencida, pausas de 3 s entre vueltas y 5 s entre manos.
- **Web:** opciones nuevas, tirada de reyes, corte, pasar, panel del pie, cartas boca abajo.
- **Tests:** 471 (motor 162, bots 17, servidor 57, web 235), 10 de punta a punta y el de sin conexión.

**Pendientes:**
- "Vamos a X": se interpretó como dejarle la vuelta a un compañero o ganarle a la carta de un rival.
- La tirada de reyes no tiene animación de mazo: sale en un cuadro. (El corte ya la tiene: ver abajo.)
- Con chat de voz (fase 2) hay que apagar lo del pie.

---

## Botonera tapada y animación del corte — 2026-10-12

- **El bug:** la zona de abajo (mano, respuestas, cantos y la fila nueva del pie) no tenía tope de alto y el paño no bajaba de 280 px; cuando no entraba todo (sobre todo con la mano apilada para ojear y un truco por contestar), la pantalla cortaba lo de abajo: el retruco, el envido y el pie quedaban fuera de la vista. En una notebook de 800 px pasaba siempre; en un celular de 640 px también.
- **Pie:** ya no ocupa una fila. Se abre con un botón chico "Pie" al lado de "Mazo" (con un puntito si podés mandar a tocar o a gritar) y sale flotando sobre el borde del paño, en una fila que se desliza; se cierra al elegir.
- **Lugar:** el paño cede hasta 200 px antes de cortar la botonera; en escritorio bajito la mano es un poco más chica; la fila de "Te toca", Seña, Pasar, Pie y Mazo baja de renglón si no entra; los tres cortes comparten la fila.
- **Corte:** mientras se elige, el mazo brilla con el aviso "Corta X" ("Cortás vos"). Al cortar se ve en el mazo: el convencional levanta un pedazo y lo pasa abajo, sacar la muestra da vuelta la de arriba, y "se la doy al mano" manda una carta al fondo y después al mano. Después la muestra gira y se reparte (cerca de 1,5 s en total; sin animación con movimiento reducido).
- **Tests:** web 237 (dos nuevos: el botón del pie y el mazo en el corte) y los 10 de punta a punta.

---

## Tipografías — 2026-10-12

Pedido del usuario: tipografías como cosmético, por el mismo camino que las mesas. Se aplican a toda la app y son personales (no viajan al servidor; en las salas no cambian). Lo hizo un agente.

- **Catálogo** (`packages/shared/src/tipografias.ts`): diez letras de licencia libre (OFL, Google Fonts), autoalojadas con @fontsource para que anden sin conexión. Gratis: Nunito (la de siempre, con títulos en Alfa Slab One) y Alfa Slab One en toda la app. En la tienda, con precios provisorios: Bebas Neue 200, Special Elite 300, Playfair Display 300, Caveat 300, Lobster 400, Permanent Marker 400, Pacifico 500 y Press Start 2P 500. Cada una tiene una `escala` para que se lea como Nunito (Press Start 2P 0,58; Pacifico 0,82; Caveat 1,12) y no inventa negrita si no la trae. `normalizarTipografia` hace lo pago gratis, salvo con la tienda de prueba.
- **Web:** `perfil.tipografia` (entra en `cosmeticosPermitidos`). `temaTipografia.ts` pone `data-tipografia` en `<html>` y las variables `--fuente-texto`, `--fuente-titulo` y `--escala-texto` (agranda o achica todo lo medido en rem). Las pagas se cargan con import dinámico del CSS de @fontsource; el woff2 no va en la precarga de la PWA y se guarda al usarlo (caché `tipografias`, como las barajas). Los campos de texto (como el del chat), que tenían la letra del sistema, ahora usan la de la app.
- **Selector** en Inicio → Más opciones: "Truco" escrito con cada letra, tres por fila en 360 px, las pagas con candado y precio (abierto con la tienda de prueba).
- **Revisado en 360 px** (capturas del inicio, el selector y la mesa de parejas con las diez): no hay desborde. Los cantos largos con Caveat o Lobster se deslizan en su fila, como ya pasaba.
- **Tests:** web 246 (11 nuevos en `tipografias.test.tsx`).

**Pendiente:** con Press Start 2P, los renglones de las bajadas chicas (el autor de cada baraja) quedan muy juntos.

---

## Bots "Muy difícil" y "Master" — 2026-10-12

Pedido del usuario: los bots eran predecibles y flojos; dos niveles nuevos por encima del difícil, el Master "al límite de lo programable sin ver cartas ajenas", que cuente cartas y calcule envidos. Fácil, medio y difícil quedan como estaban. Puede tardar hasta 2 o 3 s en decidir (en la práctica, el peor caso medido es de 25 ms).

- **Lo que se encontró en el difícil:** umbrales fijos (truco desde 62 %, real envido desde 75 %), no tiene en cuenta qué contesta el rival ni el marcador, faroles con frecuencia fija.
- **`experto.ts`** (los dos niveles):
  - envido, flor y contraflor por valor esperado en **probabilidad de ganar la partida** (`equidad.ts`: tabla armada con cómo se reparten los puntos por mano entre bots, `cli/distribucion.ts`), con la respuesta probable del rival según el tanto que tendría en cada reparto imaginado;
  - truco por umbral (cantar apenas conviene pierde la opción de cantar después: el valor esperado salía peor), con ruido para que no se lea el umbral y faroles más frecuentes;
  - contestar el truco descontando que el que canta o sube suele tener con qué (pesa los repartos en que gana él);
  - azar entre opciones casi iguales.
- **Master:** más repartos (400 en 1v1), lee lo que el rival no cantó (tiró sin cantar truco), pesa más al que sube a retruco o vale cuatro, y aprende de cada rival: si quiere sus cantos, con qué tanto canta envido y si cuando sube la tiene (lo mira en el marcador al terminar la mano).
- **Herramientas** en `packages/bots/cli`: `desglose.ts` (de dónde salen los puntos), `mezcla.ts`/`mezcla.sh` (cambiar una decisión del difícil por la del experto), `experimento.ts`, `tiempo.ts`, `distribucion.ts`.
- **Resultados** (1200 partidas, semilla 21, 1v1): Master contra difícil 55,2 %, contra medio 62,3 % (el difícil contra el medio: 63,3 %); Muy difícil contra difícil 51,3 %, contra medio 60,5 %. En 2v2 y 3v3, contra el difícil, entre 51 y 53 %.
- **Lo que no funcionó** (medido y descartado): decidir el truco por valor esperado, simular con el rival jugando sin ver mis cartas, y la lectura fuerte de subidas que servía contra el difícil pero hacía achicar al Master contra el medio.
- **Web y servidor:** los cinco niveles en Inicio y al crear la sala (bajan de renglón en el celular). Tests: bots 19 (nuevos: los cinco niveles en las partidas al azar y la tabla de equidad).

**Pendientes:**
- La ventaja sobre el difícil es chica (el truco tiene mucha suerte y el difícil ya simula la mano). Para más: ajustar los parámetros con muchas más partidas (horas de máquina), o un modelo de apuestas del truco más fino.
- Medir contra personas: el Master aprende de cada rival y ahí debería sacar más diferencia que contra un bot fijo.

---

## Cosméticos criollos — 2026-10-13

Pedido del usuario: pipa, cosas de asado y más, bien criollo. Plan aprobado el mismo día, con precios provisorios. Por el mismo camino que las bufandas: todo al final de cada capa y una capa nueva al final del formato.

- **Capa nueva "en la boca"** (`enBoca`, la 17.ª, al final del formato del avatar), así se puede tener pipa y mate a la vez: "Nada en la boca" (gratis), pipa (300), pajita de pasto (100) y escarbadientes (100). Un código guardado con 16 capas (o con las 15 de antes) se sigue leyendo, con la capa nueva en su pieza 0. En el editor va en la pestaña Accesorio, debajo de los accesorios, con miniaturas enteras (acercadas a la cara cortaban la pipa).
  - Se dibuja dentro de la cabeza, justo después de la boca y en su propia capa (`capa-enBoca`), agarrada de la comisura de cada boca: `CAJAS_BOCA` en `propias.ts` tiene la caja de las 27 bocas de Lorelei medida con getBBox (las que se sumen después usan la de la primera). Va encima de la barba.
  - **Señas:** en las muecas de la pera (1 y 7 bravos) se va con la boca; en el beso, morderse el labio, la boca abierta, la lengua y los cachetes de la flor se guarda (`gestos.css`). Como no está adentro de la capa de la boca, no cambia la caja que miden las señas ni las zonas de la cara para tocar.
- **6 accesorios en la mano** (con la misma mano del mate): choripán (200), tira de asado en el tenedor (250), pinza de parrilla (200), vaso de grappamiel (200), facón de asador con vaina (300) y guitarra criolla (400; asoma el mástil con el clavijero y un poco de la caja). La tira, la pinza y el facón van inclinados hacia afuera para no tapar la cara.
- **3 pañuelos de gaucho** al cuello, en la capa de la bufanda (rojo, celeste y blanco, 150 cada uno): la vuelta, la punta del triángulo sobre el pecho y el nudo. La sección del editor se llama ahora "Bufanda o pañuelo".
- **Sombrero de gaucho** (300): fieltro oscuro, copa baja y chata, ala ancha y recta; recorta el pelo de arriba como los otros. Revisado con los 48 peinados.
- **Ropa:** poncho (350; rojo, a rayas, con guarda de rombos, cae más ancho que los hombros) y chaleco de campo (250; abierto sobre una camisa blanca de cuello).
- Los bots pueden lucirlas (contra la compu, en 3 contra 3, salen poncho, tira de asado, pipa, pajita y escarbadientes). El servidor sigue aceptando solo lo gratis, salvo con la tienda de prueba.
- **Planillas** (`scripts/planillas-avatar.ts`): hojas nuevas de accesorios, cuello (bufandas y pañuelos), una por cada cosa en la boca con las 27 bocas (con barba y sin barba, y con mate, sombrero de gaucho y poncho) y "criollos" (todo junto con pieles, peinados y bocas distintas). Se revisó también el editor y la mesa (círculos y sentados) en 360 px y en PC, y las 11 señas con pipa.
- **Tests:** web 252 (nuevos: lo que va en la boca arma un SVG válido con cada accesorio y cada bufanda; con cada boca y cada barba va justo después de la boca y fuera de su capa; un código de 16 capas se lee con la boca vacía; el catálogo criollo con sus precios y sin mover lo que estaba), servidor 57; la prueba de punta a punta del avatar espera la capa nueva.

- **Ajustes después de revisarlo** (lo que había quedado flojo):
  - **Lo que va en la boca, más grande y con contraste:** pipa, pajita y escarbadientes van a 1,5 veces, con el contorno negro de Lorelei más grueso y un halo claro debajo (`halo` en `propias.ts`) que los despega de la barba y del pelo. A 44 px y en los círculos de la mesa en 360 px ya se leen la pipa, la pajita y el escarbadientes. Siguen agarrados de la comisura, sin tapar la boca.
  - **La pipa** tiene la cazoleta de madera clara y el caño más corto (queda más cerca de la cara y no se sale del círculo); con barba grande y pelo negro se distingue por el halo.
  - **El choripán** es ahora un pan francés partido a lo largo (corteza con sus cortes y la miga a la vista) con el chorizo adentro, que asoma arriba con la atadura, con grasa, marcas de la parrilla y chimichurri (hojitas y gotas de aceite con ají). Va inclinado hacia afuera.
  - **La tira de asado** es más corta y está pinchada cerca de su punta; el tenedor se inclina más (26°), así la carne queda lejos de la mandíbula.

**Pendientes:**
- Con mate (o mate y termo) y pipa juntos, la cazoleta queda encima de la bombilla.
- En los círculos de la mesa (acercados a la cara) la tira de asado queda afuera del cuadro; se ve entera en el editor y sentados.

---

## Corte y tirada de reyes en la mesa — 2026-10-13

Pedido del usuario: la animación del corte no convencía; que se vea el mazo partirse, y que la tirada de reyes se haga sobre la mesa (y no en un cuadro), con los avatares cambiando de lugar si los equipos salen de los reyes. Lo hizo un agente.

- **El mazo** tiene cuerpo: diez dorsos apilados, cada uno un poco corrido. Mientras se elige el corte, la de arriba brilla con el aviso "Corta X", como antes.
- **El corte** (`Mazo.tsx`, por fases: corte, reparto, muestra; cerca de 2 s en total):
  - convencional: el mazo se parte en dos pilas; la de arriba se corre hacia el centro del paño, la de abajo pasa encima y vuelven juntas;
  - sacar la muestra: la de arriba se levanta, se da vuelta y queda de muestra (no hay giro después);
  - se la doy al mano: una sola se separa, pasa al fondo y queda asomando; en el reparto, esa sale primero, de abajo, hacia el mano.
  - **Reparto:** tres vueltas desde el mano, en sentido antihorario; cada carta vuela hasta el lugar de cada uno (se mide en la pantalla, así sirve en círculos, sentados, celular y PC). Las tuyas llegan al borde de abajo del paño y de ahí bajan a tu mano. Después se da vuelta la muestra.
- **Tirada de reyes** (`TiradaEnMesa` en `Reyes.tsx`, tiempos en `tiradaReyes.ts`): la mesa se arma con los lugares de antes; del mazo sale una carta boca arriba frente a cada uno, en orden (más rápido cuanto más larga: en 3 contra 3 con equipos puede pasar de 20 cartas); el rey se resalta y se deja ver un momento. Si los compañeros cambiaron, se levantan las cartas y los avatares se deslizan a sus lugares nuevos (se reconoce a cada uno por apodo y avatar). Al final, "Reparte Ana" (o "Repartís vos") y, con equipos, quiénes van juntos.
  - La parte de abajo tiene el mismo alto que con la mano en juego: el paño no salta al arrancar.
  - **La primera mano espera** en la cola de la pausa entre manos (la sala no: trae los lugares nuevos y online lleva a la mesa). Al terminar, lo que esperó se pasa de a poco (2,1 s después del corte, 0,9 s después de una carta), si no, el corte se pisaba con lo que los bots ya habían jugado. Si la mesa no avisa que terminó, sigue sola.
  - Con movimiento reducido no se anima nada: queda el cuadro de antes.
- **Revisado** cuadro a cuadro en 360×740 y 1280×800, en 1v1, 2v2 y 3v3, en círculos y sentados, contra la compu y online (dos personas, una en cada tamaño).
- **`ojeo.spec.ts`:** esperaba el turno con los 5 s de siempre; si la compu cantaba envido, entre cantos y tantos a veces no llegaba. Ahora espera hasta 30 s.
- **Tests:** web 257 (nuevos: el mazo partido en dos, el reparto con la del mano desde abajo, los tiempos de la tirada, reconocer a cada uno en su lugar nuevo, la mano que espera a los reyes y se pasa de a poco) y los 10 de punta a punta.

**Pendientes:**
- Online, el reloj del primer turno corre durante la tirada (el servidor no sabe que la mesa la está mostrando): si te toca cortar, tenés unos segundos menos.

**Arreglado después (2026-10-13):** online, el reloj del primer turno ya no corre mientras la mesa muestra la tirada de reyes: el plan de tiempos (`planReyes`) pasó a `@truco/shared` y el servidor espera lo que dura la tirada (con el cambio de lugares, si lo hubo) antes de arrancarlo.

---

## Fase 2: plan y decisiones — 2026-10-17

El usuario aprobó el plan de la fase 2 en cinco etapas: **2A** cuentas, **2B** monedas, **2C** tienda e inventario, **2D** ranking y amigos, **2E** voz. La voz la hace un agente en paralelo, en la rama `voz`. Otro agente hace la **mesa en perspectiva** (una tercera vista, 2.5D con CSS 3D; círculos y sentados quedan como están), en la rama `mesa-perspectiva`.

**Decisiones:**
- **Supabase** para la base (PostgreSQL, São Paulo) y para el login (Google y link por email). El usuario crea el proyecto y la credencial de Google con `INSTRUCTIVO-CUENTAS.md`.
- **Monedas:**
  - 10 por partida terminada, más 10 por ganarla, más 30 en la primera del día;
  - contra bots se cobra el 30 %; si abandonás, nada;
  - hay un tope diario.
- **La tienda es diaria:** cada día ofrece una selección al azar de productos. **Los cosméticos tienen rareza.**
- **Elo y ranking por formato:** el Elo solo cambia en partidas contra otra gente, nunca contra bots.
- **Hosting:** la web en Cloudflare Pages y el servidor en Fly.io (São Paulo), al final de la fase.

## Etapa 2A: cuentas — 2026-10-17

- **La base** (`apps/server/src/cuentas/base.ts`):
  - con `DATABASE_URL` es PostgreSQL (`pg`);
  - sin ella, en desarrollo, es PGlite: el mismo Postgres compilado a WebAssembly, guardado en `apps/server/datos/base`. Los tests la usan en memoria;
  - las migraciones van numeradas en `migraciones.ts` y se aplican solas al arrancar.
- **Las sesiones** (`auth.ts`):
  - el JWT de Supabase se verifica con las claves públicas del proyecto (JWKS), así que el servidor solo necesita `SUPABASE_URL`;
  - sin Supabase, en desarrollo hay un **login de prueba** (`prueba:<email>`, sin contraseña) para ir probando monedas y tienda. En producción no existe.
- **La API** (`/api`, desde la web en `/juego/api`):
  - `GET /estado`;
  - `POST /entrar`: la primera vez crea la cuenta con el apodo, el avatar y las preferencias del invitado, y vincula su ID. Las veces siguientes, lo de la cuenta pasa al navegador;
  - `PUT /perfil`, con todo validado.
- **En la sala:**
  - quien manda `token` entra con su cuenta (`onAuth`). Un token vencido no entra; sin token se juega como invitado, como siempre;
  - con cuenta, el lugar se recupera también desde otro dispositivo;
  - el registro de la partida guarda la `cuentaId`.
- **La web:**
  - "Tu cuenta" en el inicio, con "Entrar con Google" y el link por email (o el email del login de prueba) y "Salir";
  - lo que se cambia del perfil se sube a la cuenta a los 1,5 s;
  - el token viaja al entrar a las salas.

  Si el servidor no tiene cuentas, la tarjeta no aparece.
- **Tests:** server 63 (6 nuevos de cuentas), web 258 (1 nuevo).

**Pendiente:** probar con el Supabase real, cuando el usuario cargue los `.env`.

## Etapa 2B: monedas — 2026-10-17

- **Movimientos** (`movimientos`, migración 2):
  - cada movimiento es una fila que un trigger de la base impide cambiar o borrar;
  - el saldo es la suma de los movimientos;
  - un índice único asegura que una partida pague cada concepto una sola vez a cada cuenta.
- **El cobro** (`cuentas/monedas.ts`, montos en `ECONOMIA`):
  - 10 por terminar la partida y 10 más por ganarla;
  - contra bots se cobra el 30 % de eso (3 y 3). Cuenta como contra bots si algún rival fue bot, en algún momento de la partida;
  - 30 de bonus en la primera partida del día, entero aunque sea contra bots;
  - el tope es de 300 por día. El día va de medianoche a medianoche de Uruguay (UTC−3).
- **Quién cobra:** al terminar, quienes entraron con su cuenta y siguen en la sala. Quien abandonó no cobra.
- **Lo que recibe el jugador:** el mensaje `monedas`, con lo cobrado y el saldo.
- **La API:** `GET /api/monedas` devuelve el saldo y los últimos movimientos; `/entrar` ahora también trae el saldo.
- **Robustez:** si alguien entra a una sala con un token válido pero sin haber pasado por la API, la cuenta se crea en ese momento.
- **La web:**
  - el saldo aparece en "Tu cuenta";
  - en el cartel del final se ve lo que cobraste, renglón por renglón, y tu saldo. Si ya llegaste al tope, lo avisa.
- **Tests:** server 69 (6 de monedas, incluida una partida entera contra la compu), web 259.

## Etapa 2D (primera parte): Elo y ranking — 2026-10-17

- **Elo por formato** (`cuentas/elo.ts`, migración 3):
  - se arranca en 1200;
  - K es 40 en las primeras 20 partidas, para ubicar rápido, y 24 después;
  - en parejas y tríos, cada equipo vale el promedio de los suyos, y todos los del equipo suben o bajan lo mismo;
  - el historial queda por partida (`elo_partidas`), que se cuenta una sola vez.
- **Cuándo cuenta:** solo si en todos los lugares arrancaron personas con cuenta, sin bots ni invitados, y cada cuenta aparece una sola vez. Quien abandona igual pierde con su equipo, así irse no sirve para salvarse.
- **Lo que recibe el jugador:** el mensaje `elo`, con el formato y el puntaje de antes y de después. Se ve en el cartel del final, debajo de las monedas.
- **Ranking:**
  - `GET /api/ranking?formato=…` es público. Hay que jugar 5 partidas para aparecer. Con sesión, también te dice tu posición;
  - en la web hay una pantalla nueva, `/ranking`, con los tres formatos, a la que se llega con "Ver el ranking" desde "Tu cuenta".
- **Tests:** server 75 (6 de Elo, con dos partidas reales: entre dos cuentas, y contra un invitado sin Elo), web 260.

**Falta de la 2D:** la lista de amigos.

## Etapa 2C: tienda con rarezas y vitrina diaria — 2026-10-17

Decisiones del usuario: los precios por rareza propuestos, la vitrina es la misma para todos y la mesa en perspectiva va gratis.

- **Rarezas** (`shared/rarezas.ts`):
  - cuatro rarezas, cada una con su precio: común 60, rara 150, épica 350 y legendaria 800;
  - la rareza sale del precio de la fase 1: hasta 50 es común, hasta 150 rara, hasta 300 épica y lo demás legendaria;
  - los catálogos (avatar, mesas y tipografías) ya traen la rareza y el precio nuevo.
- **Tienda** (`shared/tienda.ts`):
  - ids estables (`avatar:<capa>:<pieza>`, `mesa:<id>` y `tipografia:<id>`) y `CATALOGO_TIENDA` con todo lo pago;
  - **la vitrina del día** es la misma para todos, sale al azar con el día como semilla, no repite y cambia a la medianoche de Uruguay. Tiene 6 lugares: 3 comunes, 2 raras o épicas y 1 épica o legendaria;
  - `permisosDe(inventario)` dice qué se puede usar: lo gratis y lo comprado.
- **El servidor:**
  - la tabla `inventario` (migración 4);
  - `comprar` descuenta las monedas con un movimiento `compra` y suma el cosmético al inventario, todo en una transacción. Solo vende lo de la vitrina de hoy, si alcanza el saldo y si todavía no lo tenés;
  - la API: `GET /api/tienda` (pública) y `POST /api/tienda/comprar`. `/entrar` también devuelve el inventario;
  - en la sala, el avatar y la mesa de quien entra con cuenta se validan contra lo que compró.
- **La tienda de prueba:** sin `TRUCO_TIENDA_DE_PRUEBA`, ahora va prendida en desarrollo y apagada en producción.
- **La web:**
  - la pantalla `/tienda`: cada cosmético muestra cómo te queda (la pieza en tu avatar, la mesa con una carta o la letra escrita), el borde del color de su rareza, el precio, "Usar" o "Puesto", y cuánto falta para que cambie la vitrina;
  - "Tienda" y "Ranking" se abren desde "Tu cuenta";
  - lo comprado se desbloquea en el editor del avatar y en los selectores de mesa y tipografía. El inventario se recuerda en el navegador, para que al recargar no se pierda lo puesto.
- **Tests:** server 83 (8 de la tienda), web 262. Se actualizaron los precios que esperaban los tests de la fase 1.

---

## Mesa en perspectiva — 2026-10-17

Pedido: una tercera vista de la mesa, "En perspectiva", como si estuvieras sentado frente a ella. Lo hizo un agente, en la rama `mesa-perspectiva` (sin merge a main).

- **La preferencia** pasó de `mesaBustos` (sí o no) a `vistaMesa`: `circulos`, `sentados` o `perspectiva`. Al leer el perfil se migra lo guardado (prendido eran los sentados; apagado o sin nada, los círculos) y se guarda sin el campo viejo: nadie pierde su elección. Se elige donde estaba (Más opciones → "Jugadores en la mesa") y también con `?vista=…` en la dirección; `?bustos=1` / `?bustos=0` siguen andando.
- **El paño** (`PanioEnPerspectiva` en `componentes/Perspectiva.tsx`, estilos en `estilos-mesa-perspectiva.css`) es un plano inclinado con CSS 3D (`perspective` en el `.tapete`, `rotateX` en el paño, punto de fuga arriba), con el borde de madera y el canto de cerca colgando (la mesa tiene espesor). Encima van el mazo y las cartas jugadas; en una pantalla alta el paño no se estira más de 1,6 veces su ancho. Sin librerías 3D.
- **Los demás** son recortes de medio cuerpo (los avatares por capas, con sus cosméticos), de frente a la cámara, cortados en el borde de la mesa: el de enfrente detrás del borde de lejos y los de los costados contra los bordes de los lados. Dónde cae cada uno lo proyecta el navegador: el paño marca el lugar de cada asiento (`perspectiva.ts`) y se mide en la pantalla, así también sale la escala (más chicos cuanto más lejos). En 3v3 entran los cinco a 360 px; con una mesa bajita (muchos botones abajo) los recortes se achican.
- **Lo que es interfaz** queda plano: tu mano (grande, derecha y en primer plano; en pantallas altas no se achica al abrirla), la botonera, el pie, chat, señas, relojes, globos y el registro. El aviso "Corta X", las vueltas y la etiqueta de lo mostrado se paran de frente sobre el paño.
- **Animaciones rehechas para la perspectiva:**
  - para pasar un punto de la pantalla al paño inclinado se usa una homografía con las cuatro esquinas del paño (`aLocal` en `perspectiva.ts`);
  - reparto: cada carta va por el aire (hacia la cámara) hasta el lugar de cada uno; las tuyas vienen hacia vos y llegan a tu mano;
  - jugar carta: sale de la mano de quien la tira (la tuya, desde tu mano), en el aire y casi parada, y cae acostada en su pila;
  - levantar la vuelta: se levanta y va por el aire hacia el que la ganó;
  - corte: lo que se separa se levanta del paño;
  - tirada de reyes: las cartas salen del mazo por el aire; los avatares que cambian de lugar caminan alrededor de la mesa (no la cruzan) y crecen o se achican según se acerquen o se alejen.
  - Con movimiento reducido, lo mismo que en las otras vistas (nada se anima y los reyes salen en el cuadro).
- **Círculos y sentados quedan igual:** el paño inclinado solo se arma en perspectiva y todos los estilos nuevos cuelgan de `.mesa-perspectiva`.
- **Revisado** con capturas a 360×740 y 412×915 (y una de 1280×800) en 1v1, 2v2 y 3v3, durante el reparto y con cartas en la mesa, con las mesas boliche, cantina, celeste y bordo, y con movimiento reducido.
- **Tests:** web 265 (nuevos: la migración de la preferencia, `?vista=`, la homografía y la vista en 1v1, 2v2 y 3v3) y los 10 de punta a punta.

**Pendientes:**
- Las pilas de cartas jugadas de los de los costados quedan cerca de su recorte: en 2v2 se corrieron un poco hacia adentro, pero con una seña (el recorte crece) pueden taparse un poco.
- El mazo de cerca se achicó (se veía enorme); en 3v3 bajito puede rozar el registro.
- En escritorio la mesa queda angosta respecto del lugar que sobra a los costados: se podría ensanchar el paño en pantallas anchas.
- Falta probarla online con dos personas (los relojes y el reloj de turno se ven en los recortes, pero no se revisó en vivo).

---

## Chat de voz (etapa 2E) — 2026-10-17

Primera parte de la fase 2 que no depende de las cuentas: hablar en la mesa. Lo hizo un agente, en la rama `voz` (aparte de las cuentas y de la vista nueva de la mesa, que van en paralelo).

- **WebRTC en malla** (como mucho 6 en la voz): cada par de personas que la activó se conecta directo; el audio nunca pasa por el servidor. Entre dos, la oferta la hace siempre el que entró después a la voz (número más alto), así nunca se cruzan dos ofertas. Si una conexión falla, el que la armó la vuelve a armar.
- **Servidor** (`apps/server/src/voz.ts`, enganchado con pocas líneas en `SalaTruco.ts`): lleva quién está en la voz y reenvía la señalización (oferta, respuesta y candidatos ICE) **solo al destinatario**, si los dos están en la sala y en la voz, la sala tiene voz y la señal es válida (tamaños topeados); con límite de 150 señales cada 10 s y de 6 cambios de voz cada 10 s por persona. Cada vez que cambia la sala manda a todos quién está en la voz (con los asientos de ahora) y los servidores ICE.
  - **Servidores ICE:** por defecto un STUN público; con `TRUCO_ICE_SERVERS` (JSON de RTCIceServer[]) se reemplazan. En `voz.ts` está explicado cómo sumar un TURN (coturn).
  - **Desconexión:** al cortarse la conexión con el servidor (o al irse, o si lo sacan) sale de la voz y los demás cierran su conexión; al volver, la web entra de nuevo sola (con número nuevo, así se arma todo de cero).
- **Opción de sala `voz`:** prendida por defecto en las privadas (interruptor "Chat de voz" en el formulario); en la cola pública no existe y se rechaza.
  - **Con voz, lo del pie se dice hablando:** la sala fuerza "toca y grita cualquiera" (el selector de toques y gritos se esconde), el servidor rechaza las sugerencias y en la mesa no aparece el botón "Pie".
- **En la mesa** (`componentes/ControlesVoz.tsx`, estado en `voz/estado.ts`, la malla en `voz/malla.ts`):
  - Un botón de micrófono en el marcador. El micrófono se pide **recién al activar la voz**. Si no lo dan (o no hay), se entra igual para escuchar, con un aviso claro de cómo habilitarlo.
  - El panel de la voz: cerrar y abrir el micrófono (mute propio), "Mantener apretado para hablar" (preferencia propia, `vozPulsar` en el perfil: aparece un botón Hablar a mano del pulgar), quién está en la voz y cómo va la conexión ("conectando…", "se escucha"), y salir de la voz.
  - **Silenciar la voz de otro** desde su menú (tocando su nombre): solo para vos.
  - **Quién habla:** un halo verde sobre el avatar que crece con el nivel del audio (AnalyserNode, medido cada 100 ms en escalones), también sobre el tuyo. A quien silenciaste se le ve un 🔇.
  - Al salir de la sala (o al entrar a otra) se cierran las conexiones y se suelta el micrófono. Contra la compu no hay voz.
- **Tests:** servidor 68 (nuevos: la señalización llega solo al destinatario y con el número de quien la manda; se rechaza con la voz apagada, en la cola pública, a quien no está en la voz y lo que no es una señal; apagarla saca a todos; quien se va sale de la voz; con voz se fuerza "cualquiera" y no hay sugerencias; los servidores ICE del entorno), web 269 (nuevos: la malla con un WebRTC de mentira: quién ofrece, candidatos que esperan, cerrar al irse, cortarse y volver, mute, mantener para hablar, silenciar a otro, sin micrófono solo escucha; los controles: el permiso recién al activar, el aviso, la preferencia guardada, el menú del jugador, el anillo y el pie escondido con voz). De punta a punta, `voz.spec.ts`: dos Chromium con micrófono de mentira activan la voz, se conectan, a cada uno le llega el audio del otro (el anillo se prende con el pitido), al cerrar el micrófono deja de llegar y al salir de la voz el otro se entera.
- Los tests del pie (servidor) ahora crean la sala sin voz.

**Pendientes:**
- **Un TURN de verdad** (coturn) para redes que no dejan conectarse directo; con solo STUN, algunas redes de oficina y de datos móviles no van a conectar. Después, credenciales que vencen (`use-auth-secret`) armadas por el servidor.
- Probado en Chromium; falta probar en celulares de verdad (Safari en iPhone, sobre todo: permisos y audio que no arranca sin un toque).
- La voz es solo en la mesa: en la sala de espera todavía no se habla.
- En la mesa de bustos el halo es redondo aunque el busto no lo sea.
- Si la voz crece (más de 6, o salas grandes), pasar a un SFU como LiveKit, como dice la especificación.

---

## Seña de envido y resumen de señas sobre los compañeros — 2026-10-17

Dos pedidos del usuario, con el plan aprobado. Lo hizo un agente en la rama `resumen-companiero` (sin merge a main).

- **La seña de envido** (`envido`, al final de `SENIAS`: la lista solo crece al final). Le marca al compañero cuánto tenés de envido, con el número ("envido 27").
  - **El número lo pone el servidor**, no el cliente. El cliente manda `{ senia: 'envido' }` como cualquier otra seña (si agrega un número, no se mira). El servidor (y la conexión local) lo sacan del tanto real de quien seña, como lo cuenta el motor, con muestra y piezas (`envidoDeSenia` en `@truco/shared`). Viaja en el mensaje `senia` como `tanto`, solo a los compañeros.
  - **Representación del tipo** (lo menos invasivo): `Senia` sigue siendo una unión de strings, con `'envido'` de más. El número va aparte: `tanto?` en los mensajes `senia` y `seniaPescada`, y `envido?: Record<asiento, número>` en `SeniasRecibidas` (que pasó a ser una interfaz con el índice numérico de siempre). Las listas de señas no cambian, y los tests de antes siguen igual.
  - **Con flor no se ofrece.** En el truco uruguayo, con flor no hay envido (la flor lo tapa): se marca la flor. En la cara de señas no aparece el botón, y si igual llega, el servidor la rechaza con "Con flor no hay envido: marcale la flor".
  - **Reglas de siempre:** solo en equipos y fuera del pica-pica; "antes de jugar" la cierra igual; se puede pedir que la repitan (repetida trae el mismo número); y el rival la puede pescar. Con "gesto", ve que hubo una seña pero no cuál; con "gesto y carta", la ve con el número (y el bot rival lo usa).
  - **Gesto:** "Mirar para arriba, sacando la cuenta": los ojos van para arriba y de costado, las cejas suben un poco, torcidas, y la boca se aprieta hacia un lado (`gestos.css`). En la cara de señas va un botón aparte, debajo de la cara ("🤔 Marcar tu envido: 27"), porque no es una parte de la cara. No está en la tira de señas rápidas: esa tira es la de tus cartas y a 360 px no sobra lugar.
  - En el globo y en el panel del compañero se ve "envido 27" (`significadoDe`). El cliente de terminal también lo muestra.
- **Bots:**
  - marcan su envido al empezar la mano, después de las señas de sus cartas, desde 30 y sin flor (`ENVIDO_PARA_SENIAR`). Con 27 lo hacían en 6 de cada 10 manos: con muestra, las piezas dan envidos altos seguido y la seña perdía valor.
  - Los que leen señas (difícil, muy difícil y master) imaginan al compañero con ese envido exacto y sin flor (`muestreo.ts`), y lo usan para cantar y querer el envido en equipo (`probEnvido` y los escenarios del experto). El medio no lo usa: no mira señas para calcular, para no acercarse al difícil.
  - Difícil contra medio en 2v2, 400 partidas: 67,8 % ± 4,6 % (antes, 64–66 %).
- **El resumen sobre los compañeros:**
  - un cartelito arriba del avatar de cada compañero, con lo que te marcó en la mano: una pila de fichitas con ícono y texto corto ("🤔 Envido 27", "💋 Pieza 4", "🐸 Flor"), el envido primero y resaltado, después las cartas y la flor al final. El texto completo va en la etiqueta para lectores de pantalla.
  - Se arma con lo que te llegó (`resumenDe`); se actualiza con cada seña y en la mano nueva arranca vacío. Solo de tus compañeros (lo que pescás de los rivales no entra). En 1v1, en el pica-pica y sin señas no aparece.
  - **Es una preferencia de cada jugador** (`resumenSenias` en el perfil, apagada de entrada): en Más opciones, "Resumen de señas sobre los compañeros", y en la mesa, en la hoja que se abre al tocar el avatar de un compañero ("Señas de X"). Esa hoja es el lugar natural: no hay un menú general de la mesa, y el de los jugadores (`MenuJugador`) es sobre otra persona, solo online.
  - **Dónde va:** arriba del avatar; el de enfrente lo lleva a su izquierda (arriba está el borde). No corre el asiento ni se toca. Si el mazo con la muestra queda donde va (repartió ese compañero, o en 3v3 el de enfrente, para el de la izquierda), se pasa al otro lado: el de enfrente a la derecha y los de los costados debajo de sus cartas.
  - Revisado con capturas a 360×740 en círculos, sentados y en perspectiva, en 2v2 y 3v3, varias manos cada una (`capturas-resumen/`, sin commitear).
- **Tests:** 575 (motor 162, bots 24, servidor 97, web 292). Nuevos:
  - bots: qué señas hace cada mano (con flor, sin envido); el difícil imagina al compañero con el envido marcado; con un envido alto marcado espera ganar mucho más; en las partidas simuladas el número llega con la seña;
  - servidor: el número es el real aunque el cliente mande otro; con flor se rechaza; el rival lo pesca con número solo con "gesto y carta"; los compañeros bot lo anotan; repetir manda el mismo; los bots lo marcan solo a su equipo;
  - web: lo mismo en la conexión local; el botón de la cara manda solo la seña y no está con flor; globo y panel con el número; el resumen apagado de entrada, prendido (orden, sin rivales, se limpia en la mano nueva) y el interruptor del panel del compañero.
  - De punta a punta, `senias.spec.ts` y `local.spec.ts` siguen pasando.

**Pendientes:**
- En perspectiva, con cuatro señas el resumen del de enfrente baja hasta su nombre (lo roza un poco).
- Los globos de canto y de chat pueden tapar el resumen un momento (el globo va encima: dura poco).
- Al recargar la página se pierden las señas recibidas en la mano, y con ellas el resumen (como el panel del compañero): vuelven pidiéndole que repita.
- Un humano que seña solo el envido (sin las de sus cartas) hace que su compañero bot crea que no tiene cartas con seña, como pasaba con cualquier seña suelta.
- Falta probarlo online con personas de verdad y en celulares reales.


## Voz con TURN de Cloudflare — 2026-10-17

- Con solo STUN, la voz se quedaba en "conectando…" entre celulares que no podían conectarse directo (redes distintas, datos móviles, o una Wi-Fi que aísla a los dispositivos).
- El usuario creó la clave del TURN de Cloudflare (tope de 1000 GB por mes) y la cargó en `apps/server/.env` (`TRUCO_TURN_ID` y `TRUCO_TURN_TOKEN`).
- El servidor pide credenciales de 24 h y las renueva cada 12 h.
- **El usuario lo probó: el chat de voz anda.**

---

## Mesa en perspectiva más aireada — 2026-10-17

Pedido: "la mesa con perspectiva no quedó mal, pero quedó muy apretada", en 2 contra 2 y 3 contra 3. Lo hizo un agente, en la rama `perspectiva-aire` (sin merge a main). Todo bajo `.mesa-perspectiva` y la tabla del mazo en perspectiva: círculos y sentados no cambian, y 1 contra 1 queda igual (salvo el ancho en escritorio).

- **El paño más ancho:** con gente a los costados deja 8 % del ancho a cada lado en 2 contra 2 y 10 % en 3 contra 3 (antes 15 % y 17 %).
- **Los de los costados más chicos y más afuera:** el recorte, al 80 % (`--figura-lado`). Se corren hacia afuera según su propio alto (`--afuera`), así el nombre (más ancho) no los saca de la pantalla. En 3 contra 3:
  - los de cerca se corren menos y los de lejos más;
  - en el celular, sus nombres van un poco más chicos.
- **Las cartas jugadas:**
  - un poco más chicas;
  - las pilas más separadas: en 2 contra 2, las de los costados a 1,6 cartas del medio (antes 1,15); en 3 contra 3, a 1,7;
  - corridas un poco hacia vos (`--centro-y: 3cqh`).
  - Ya no se pisan entre ellas ni con los recortes, tampoco durante una seña (era el pendiente de 2 contra 2).
- **El mazo** (`POSICIONES_PERSPECTIVA` en `Mazo.tsx`): en 3 contra 3 va siempre a una esquina, del lado del mano. A los costados no entra entre las dos pilas de cada lado. Las esquinas de cerca quedan arriba del registro, que en 3 contra 3 se angostó al 52 % (era el pendiente de 3 contra 3). En 2 contra 2, más a las puntas.
- **En escritorio:**
  - la pantalla de la mesa en perspectiva llega a 900 px de ancho (las otras vistas siguen en 620);
  - en 3 contra 3 el paño deja 16 % a los lados. Con el paño bajito y ancho, los de los costados van con sus cartas hacia afuera: antes caían arriba del paño.
- **Revisado con capturas:** antes y después, en `capturas-aire/` (sin commitear). Fueron a 360×740, 390×844, 412×915 y 1280×800 (y una de 768×1024), en 2 contra 2 y 3 contra 3, durante el reparto, con una seña y con 4 a 14 cartas en la mesa. 1 contra 1, a 360 y 1280. Cada captura se midió además con un script que busca cajas pisadas y cosas fuera de la pantalla.
- **Tests:** web 285 (nuevos: el mazo de la perspectiva va a las esquinas en 2 y 3 contra 3, y las otras vistas no cambian).

**Pendientes:**
- Con 360 de ancho, en 3 contra 3 la esquina de lejos queda justa: durante el reparto el mazo roza las cartas del de enfrente.
- De punta a punta, `anfitrion.spec.ts` y `avatar.spec.ts` fallan, también en main. Esperan los precios de antes de la tienda (por ejemplo "Bordó: 400 monedas"); hay que actualizarlos.

## Supabase andando — 2026-10-18

- El usuario creó el proyecto de Supabase (São Paulo) y la credencial de Google, y cargó los `.env`.
- El servidor arranca con "Cuentas: PostgreSQL, Supabase." y crea solo las tablas. El login con Google anda.
- Dos tropiezos en el camino, que quedan anotados para la próxima:
  - Google tiró `redirect_uri_mismatch` porque la credencial no tenía la "Authorized redirect URI" `https://<ref>.supabase.co/auth/v1/callback`;
  - después Supabase mandaba a `localhost:3000` porque la Site URL era la que trae por defecto y el comodín estaba mal escrito. Tiene que ser `https://*.trycloudflare.com/**`.
- La credencial descargada de Google quedó en `secretos/`, que git ignora.

## Etapa 2D (segunda parte): amigos — 2026-10-18

- **Código de amigo** (migración 5): cada cuenta tiene uno de 6 letras y números, uno más que los códigos de sala para no confundirlos. Se crea la primera vez que se pide.
- **Amistades:** cada amistad es una fila que va de quien la pidió a quien la recibe, pendiente hasta que la aceptan. Si los dos se piden, quedan amigos de una. Se puede rechazar, cancelar una que mandaste o borrar un amigo.
- **Presencia** (`cuentas/presencia.ts`, en memoria):
  - con la cuenta abierta, la web late cada 25 s;
  - las salas anotan quién está sentado y en qué sala privada;
  - cada amigo figura como "conectado", "en una sala, esperando" (con el código, para "Unirme"), "jugando" o "desconectado".
- **Invitaciones:** desde la sala de espera de una sala privada, "Invitar amigos" muestra los amigos conectados. Al amigo le llega en el próximo latido, que se la entrega una sola vez y dura 5 minutos, y en cualquier pantalla le aparece "Beto te invita a su sala", con los botones Entrar y Ahora no. En plena partida, el aviso espera a que salga de la mesa.
- **La API:** `GET /api/amigos` y `POST /api/amigos/{latido,agregar,responder,borrar,invitar}`.
- **La web:** pantalla `/amigos`, con tu código para copiar, agregar por código, las solicitudes, la lista con un punto de color por estado y "Unirme". Se llega desde "Tu cuenta".
- **Tests:** server 103 (5 de amigos, con sala e invitación reales), web 297.

## Flor: quién contesta, sin el +1, comparación en el momento y "canta la mesa" — 2026-10-18

Pedido del usuario: en 2v2, una contraflor al resto querida "se buggeaba y no se jugaba". El motor solo no se trababa, pero la contraflor la podía contestar cualquiera del equipo: si la flor era del bot y la persona no tenía, el servidor esperaba a la persona. Reglas nuevas, definidas por el usuario:

- **A la contraflor (y a la contraflor al resto) contesta solo el que tiene flor;** los demás del equipo esperan. El que sube a contraflor al resto también tiene que tener flor.
- **No querida:** el que la cantó cobra 3 por cada flor de su equipo, sin el +1. Vale igual para la contraflor y para la contraflor al resto.
- **Contraflor querida:** se compara en el momento, como el envido. El evento `florResuelta` lleva las flores en orden desde el mano y cada uno muestra la suya en el globo. Vale 6 fijos, que se suman al terminar la mano, y la mano sigue.
- **Contraflor al resto querida:** se comparan las flores en el momento y **termina el partido ahí**, también en un duelo de pica-pica (motivo `contraflorAlResto`). El cartel del final espera 3,5 s, así se ven las flores.
- **"Canta la mesa":**
  - el que quiere la contraflor al resto puede responder "quiero, canta la mesa" (`responder` con `cantaLaMesa`);
  - los que tienen flor tiran sus cartas de a una (`mostrarFlor`, la que elijan), en orden desde el mano, ronda por ronda, hasta mostrar las tres. Mientras tanto no se puede hacer otra cosa;
  - cada carta muestra la suma hasta ahí (`sumaFlor`; con las tres es el tanto de la flor). La carta que ya jugaron en la primera cuenta como tirada;
  - al final gana la flor que se vio. En modo sucio, una "flor" que no era flor no cuenta;
  - en la web, un panel en el medio de la mesa muestra lo que tiró cada uno y la suma, y para tirar se toca la carta de la mano;
  - los bots la dicen la mitad de las veces que quieren la contraflor al resto, y tiran primero las cartas que menos suman.
- **Un caso que trababa la partida, encontrado con las partidas al azar:** el de la flor se iba al mazo solo y le cantaban contraflor. Ahora no se puede cantar contraflor si las flores del rival se fueron, y si el que tenía que contestar se va solo con la contraflor pendiente, cuenta como "me achico".
- **Tests:** engine 165 (nuevos: comparación en el momento, al resto termina el partido, canta la mesa paso a paso, contesta solo el de flor), bots 24, server 103, web 298 (nuevo: el panel de canta la mesa).
- **Pendiente:** `reglasNuevas` "pica-pica, piezas de otro duelo" sigue fallando de vez en cuando, como antes.

## Menú principal nuevo, estilo juego de celular — 2026-10-18

Pedido del usuario (rama `menu-nuevo`): un menú como el de Clash Royale, con el juego online al medio.

- **Banner fijo arriba** (`menu/Banner.tsx`):
  - tu avatar (tocándolo se abre "Tu perfil": apodo y editor de avatar), tu apodo con la bandera de Uruguay al lado y el engranaje ⚙;
  - con cuenta: tus monedas (llevan a la tienda) y tu **Elo del formato que jugás** (`perfil.formato`, el de "contra la compu"), pedido a `/api/ranking?formato=…` (`yo.puntos`). Sin partidas con Elo el servidor no te devuelve: se muestra 1200, el inicial, un poco apagado;
  - invitado: "Entrar a tu cuenta" abre una hoja con lo de `TarjetaCuenta` (Google, link por email o login de prueba), que se cierra sola al entrar. Si el servidor no tiene cuentas, dice "Jugás como invitado".
  - **No hay nivel**: queda para cuando el usuario lo defina.
- **La bandera** es el SVG oficial de Wikimedia Commons ("Flag_of_Uruguay.svg", dominio público), en `public/bandera-uruguay.svg`. Va como `<img>` (el archivo trae clases propias que se mezclarían con los estilos) y entra en la caché de la app instalada. Sus colores (azul `#0038a8`, blanco, sol `#fcd116` con borde `#7b3f00`) son los del banner, la barra de abajo y los botones grandes (`--uy-*` en `menu/estilos-menu.css`). Las tarjetas de adentro siguen con la mesa y la letra elegidas.
- **Tres pantallas que se deslizan** (`pantallas/Inicio.tsx`): scroll horizontal con *snap* (lo hace el navegador, se siente nativo) y una barra de abajo con íconos (pestañas con flechas de teclado y un fondo que se corre con motion). Las de los costados quedan `inert` mientras no se ven. Al volver de una sala o del ranking, el menú queda en la pantalla de la que saliste (hasta recargar). En pantallas de 1100 px o más las tres van una al lado de la otra y no hay barra.
  - **Tienda** (izquierda): la vitrina del día (`VitrinaDelDia`, sacada de `Tienda.tsx`; `/tienda` sigue igual).
  - **Jugar** (al medio, la que abre; `menu/PanelJugar.tsx`): la partida en curso para volver, destacada arriba; el logo; botones grandes con relieve para **Crear sala** (dorado), **Unirme con código** (celeste) y **Buscar partida** (blanco); sin apodo, se pide ahí mismo. Con cuenta, **tus amigos en la app** (`AmigosConectados`): al que espera en una sala, "Unirme"; al conectado, "Invitar", que lleva a crear la sala y, al estar en la espera, le manda la invitación sola. Sin cuenta, una tarjeta invita a entrar para jugar con amigos.
  - **Lobby** (derecha; `menu/PanelLobby.tsx`): contra la compu (formato, dificultad, "Reglas de la partida" plegadas y Jugar), y atajos al ranking y a los amigos.
- **El engranaje** (`menu/Ajustes.tsx`) abre una hoja con el sonido, la mesa y las cartas (mesa, letra, baraja, vista, cartas jugadas, ojear, ayudas), las señas, la tienda de prueba, instalar la app y, al final, tu cuenta (salir). Las reglas de la partida contra la compu (largo, tirar reyes, toques del pie, corte, pica-pica, juego rápido) quedaron al lado de su botón Jugar, en el lobby.
- **`usePerfil` ahora se entera de todos los cambios del perfil**, no solo de los que baja la cuenta. Antes cada pantalla tenía su copia y, con el banner, la tienda y los ajustes a la vez, un cambio en una podía pisar el de otra.
- Las rutas (/crear, /unirme, /s/:codigo, /sala, /buscar, /mesa, /tienda, /amigos, /ranking) y los avisos globales (invitaciones, versión nueva) quedan como estaban.
- **Tests:** web 307 (nuevo `menu.test.tsx`, 9: pestañas y flechas, deslizar, apodo, perfil, engranaje, banner invitado y con cuenta, Elo inicial, amigos con Unirme e Invitar); los tests que buscaban las opciones en el inicio ahora abren el engranaje. e2e: nuevo `menu.spec.ts` (deslizar con el dedo de verdad, barra, engranaje, login de prueba con monedas y Elo); `local`, `ojeo`, `anfitrion` y `avatar` llegan por el lobby, el engranaje y "Tu perfil".
- **Pendiente / a decidir:**
  - el nivel del jugador en el banner;
  - los íconos de la barra son emojis (🛒 🃏 🏠): se pueden cambiar por dibujos propios;
  - "Invitar" desde el menú crea una sala con lo último que elegiste; quizás convenga una sala rápida sin pasar por el formulario;
  - el nombre "Lobby" para la pantalla de la derecha.
